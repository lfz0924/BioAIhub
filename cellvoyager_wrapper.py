"""
CellVoyager REST API Wrapper for BioAIhub
==========================================

A lightweight Flask server that wraps CellVoyager's run_cellvoyager.py
to expose a REST API for BioAIhub integration.

Usage:
    pip install flask flask-cors
    python cellvoyager_wrapper.py --port 5000 --cellvoyager-path /path/to/CellVoyager

API Endpoints:
    GET  /api/health              - Health check
    POST /api/analyze             - Submit an analysis job
    GET  /api/status/<job_id>     - Poll job status
    GET  /api/result/<job_id>     - Get completed results
    GET  /api/files/<job_id>/<fn> - Download result files
"""

import argparse
import json
import os
import subprocess
import threading
import uuid
from pathlib import Path

from flask import Flask, jsonify, request, send_file
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# In-memory job store (for production, use SQLite or Redis)
jobs = {}

# CellVoyager root path (set via CLI argument)
CELLVOYAGER_PATH = None


@app.route('/api/health')
def health():
    return jsonify({"status": "ok", "version": "1.0.0"})


@app.route('/api/analyze', methods=['POST'])
def analyze():
    data = request.json
    if not data:
        return jsonify({"error": "No JSON body provided"}), 400

    h5ad_path = data.get('h5ad_path')
    if not h5ad_path:
        return jsonify({"error": "h5ad_path is required"}), 400

    job_id = f"job_{uuid.uuid4().hex[:8]}"
    jobs[job_id] = {
        "status": "queued",
        "progress": 0,
        "current_step": "Queued...",
        "params": data,
        "result": None
    }

    thread = threading.Thread(target=run_analysis, args=(job_id, data), daemon=True)
    thread.start()

    return jsonify({"job_id": job_id, "status": "queued", "message": "Analysis job submitted"})


@app.route('/api/status/<job_id>')
def status(job_id):
    job = jobs.get(job_id)
    if not job:
        return jsonify({"error": "Job not found"}), 404
    return jsonify({
        "job_id": job_id,
        "status": job["status"],
        "progress": job.get("progress", 0),
        "current_step": job.get("current_step", ""),
        "message": job.get("current_step", "")
    })


@app.route('/api/result/<job_id>')
def result(job_id):
    job = jobs.get(job_id)
    if not job:
        return jsonify({"error": "Job not found"}), 404
    if job["status"] != "completed":
        return jsonify({"error": "Job not yet completed", "status": job["status"]}), 202
    return jsonify({
        "job_id": job_id,
        "status": "completed",
        "result": job.get("result", {})
    })


@app.route('/api/files/<job_id>/<filename>')
def serve_file(job_id, filename):
    output_dir = Path(CELLVOYAGER_PATH) / "outputs" / job_id
    file_path = output_dir / filename
    if not file_path.exists():
        return jsonify({"error": "File not found"}), 404
    return send_file(str(file_path))


def run_analysis(job_id, params):
    """Run CellVoyager analysis in a background thread."""
    try:
        jobs[job_id]["status"] = "running"
        jobs[job_id]["progress"] = 5
        jobs[job_id]["current_step"] = "Preparing analysis..."

        # Build command
        cmd = [
            "python", str(Path(CELLVOYAGER_PATH) / "run_cellvoyager.py"),
            "--h5ad-path", params["h5ad_path"],
            "--analysis-name", job_id,
        ]

        if params.get("paper_summary"):
            # Write paper summary to a temp file
            summary_path = Path(CELLVOYAGER_PATH) / "outputs" / job_id / "paper_summary.txt"
            summary_path.parent.mkdir(parents=True, exist_ok=True)
            summary_path.write_text(params["paper_summary"])
            cmd.extend(["--paper-path", str(summary_path)])

        if params.get("num_analyses"):
            cmd.extend(["--num-analyses", str(params["num_analyses"])])

        if params.get("max_iterations"):
            cmd.extend(["--max-iterations", str(params["max_iterations"])])

        if params.get("execution_model"):
            cmd.extend(["--model-name", params["execution_model"]])

        jobs[job_id]["progress"] = 10
        jobs[job_id]["current_step"] = "Running CellVoyager..."

        # Run the analysis
        process = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            cwd=CELLVOYAGER_PATH
        )

        output_lines = []
        for line in process.stdout:
            line = line.strip()
            output_lines.append(line)
            # Try to parse progress from output
            if "step" in line.lower() or "iteration" in line.lower():
                jobs[job_id]["current_step"] = line[:200]

        process.wait()

        if process.returncode == 0:
            jobs[job_id]["status"] = "completed"
            jobs[job_id]["progress"] = 100

            # Try to read result from output files
            output_dir = Path(CELLVOYAGER_PATH) / "outputs" / job_id
            analyses = []
            output_files = []

            if output_dir.exists():
                for f in output_dir.rglob("*"):
                    if f.is_file():
                        rel = f.relative_to(output_dir)
                        output_files.append({
                            "name": str(rel),
                            "url": f"/api/files/{job_id}/{rel}"
                        })

            jobs[job_id]["result"] = {
                "summary": f"Analysis {job_id} completed successfully. {len(output_lines)} lines of output.",
                "analyses": analyses,
                "output_files": output_files,
                "raw_output": "\n".join(output_lines[-50:])  # Last 50 lines
            }
        else:
            jobs[job_id]["status"] = "failed"
            jobs[job_id]["current_step"] = f"Process exited with code {process.returncode}"
            jobs[job_id]["result"] = {
                "error": f"CellVoyager exited with code {process.returncode}",
                "raw_output": "\n".join(output_lines[-30:])
            }

    except Exception as e:
        jobs[job_id]["status"] = "failed"
        jobs[job_id]["current_step"] = str(e)
        jobs[job_id]["result"] = {"error": str(e)}


def main():
    parser = argparse.ArgumentParser(description="CellVoyager REST API Wrapper for BioAIhub")
    parser.add_argument("--port", type=int, default=5000, help="Server port (default: 5000)")
    parser.add_argument("--host", default="0.0.0.0", help="Server host (default: 0.0.0.0)")
    parser.add_argument("--cellvoyager-path", required=True, help="Path to CellVoyager installation")
    args = parser.parse_args()

    global CELLVOYAGER_PATH
    CELLVOYAGER_PATH = os.path.abspath(args.cellvoyager_path)

    if not os.path.exists(os.path.join(CELLVOYAGER_PATH, "run_cellvoyager.py")):
        print(f"Error: run_cellvoyager.py not found at {CELLVOYAGER_PATH}")
        print("Please provide the correct path to CellVoyager installation.")
        return

    # Ensure output directory exists
    os.makedirs(os.path.join(CELLVOYAGER_PATH, "outputs"), exist_ok=True)

    print(f"🧬 CellVoyager API Wrapper")
    print(f"   CellVoyager path: {CELLVOYAGER_PATH}")
    print(f"   Server: http://{args.host}:{args.port}")
    print(f"   Health check: http://localhost:{args.port}/api/health")

    app.run(host=args.host, port=args.port, debug=False)


if __name__ == "__main__":
    main()
