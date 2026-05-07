window.cellvoyager = {
    pollInterval: null,
    currentJobId: null,

    async init() {
        this.setupEventListeners();
        await this.loadJobHistory();
    },

    refresh() {
        this.loadJobHistory();
    },

    setupEventListeners() {
        const btnSubmit = document.getElementById('btn-submit-cv');
        if (btnSubmit) {
            btnSubmit.addEventListener('click', () => this.submitAnalysis());
        }

        const btnCheck = document.getElementById('btn-check-cv');
        if (btnCheck) {
            btnCheck.addEventListener('click', () => this.checkHealth());
        }
    },

    async getBackendUrl() {
        const settings = await store.get('settings', 'cellvoyager');
        return settings?.backendUrl || '';
    },

    async checkHealth() {
        const statusEl = document.getElementById('cv-health-status');
        const url = await this.getBackendUrl();
        if (!url) {
            if (statusEl) {
                statusEl.textContent = '未配置后端 URL';
                statusEl.style.color = '#ff4444';
            }
            return false;
        }
        try {
            const resp = await fetch(`${url}/api/health`, { signal: AbortSignal.timeout(5000) });
            const data = await resp.json();
            if (data.status === 'ok') {
                if (statusEl) {
                    statusEl.textContent = 'Connected ✓';
                    statusEl.style.color = '#4ade80';
                }
                return true;
            }
        } catch (e) {
            if (statusEl) {
                statusEl.textContent = 'Connection failed';
                statusEl.style.color = '#ff4444';
            }
        }
        return false;
    },

    async submitAnalysis() {
        const url = await this.getBackendUrl();
        if (!url) {
            ui.showNotification('请先在设置中配置 CellVoyager 后端 URL', 'error');
            return;
        }

        const h5adPath = document.getElementById('cv-h5ad-path')?.value;
        const paperSummary = document.getElementById('cv-paper-summary')?.value;
        const directions = document.getElementById('cv-directions')?.value;
        const numAnalyses = parseInt(document.getElementById('cv-num-analyses')?.value) || 3;
        const maxIterations = parseInt(document.getElementById('cv-max-iter')?.value) || 5;
        const model = document.getElementById('cv-model')?.value || 'gemini-2.0-flash';

        if (!h5adPath) {
            ui.showNotification('请填写 h5ad 数据集路径', 'error');
            return;
        }

        const btnSubmit = document.getElementById('btn-submit-cv');
        if (btnSubmit) {
            btnSubmit.textContent = '⏳ 提交中...';
            btnSubmit.disabled = true;
        }

        try {
            const resp = await fetch(`${url}/api/analyze`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    h5ad_path: h5adPath,
                    paper_summary: paperSummary || '',
                    directions: directions || '',
                    num_analyses: numAnalyses,
                    max_iterations: maxIterations,
                    execution_model: model
                })
            });

            const data = await resp.json();
            if (data.error) throw new Error(data.error);

            // Save job
            const job = {
                id: 'cvjob_' + Date.now(),
                backendUrl: url,
                h5adPath,
                paperSummary,
                directions,
                numAnalyses,
                maxIterations,
                executionModel: model,
                remoteJobId: data.job_id,
                status: 'submitted',
                progress: 0,
                result: null,
                createdAt: Date.now(),
                updatedAt: Date.now()
            };
            await store.set('cellvoyager_jobs', job);

            ui.showNotification('分析任务已提交！', 'success');
            this.currentJobId = job.id;
            this.startPolling(job.id);
            await this.loadJobHistory();
            this.renderJobStatus(job);

        } catch (err) {
            ui.showNotification('提交失败: ' + err.message, 'error');
        } finally {
            if (btnSubmit) {
                btnSubmit.textContent = '🚀 提交分析';
                btnSubmit.disabled = false;
            }
        }
    },

    startPolling(jobId) {
        this.stopPolling();
        this.currentJobId = jobId;
        this.pollInterval = setInterval(async () => {
            try {
                const job = await store.get('cellvoyager_jobs', jobId);
                if (!job || job.status === 'completed' || job.status === 'failed') {
                    this.stopPolling();
                    return;
                }
                const url = job.backendUrl;
                const resp = await fetch(`${url}/api/status/${job.remoteJobId}`);
                const data = await resp.json();

                job.status = data.status || job.status;
                job.progress = data.progress || job.progress;
                job.updatedAt = Date.now();

                if (data.status === 'completed') {
                    const resultResp = await fetch(`${url}/api/result/${job.remoteJobId}`);
                    const resultData = await resultResp.json();
                    job.result = resultData.result || resultData;
                    this.stopPolling();
                }

                await store.set('cellvoyager_jobs', job);
                this.renderJobStatus(job);

                if (job.status === 'completed' || job.status === 'failed') {
                    await this.loadJobHistory();
                }
            } catch (e) {
                console.warn('Polling error:', e);
            }
        }, 5000);
    },

    stopPolling() {
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
            this.pollInterval = null;
        }
    },

    renderJobStatus(job) {
        const statusArea = document.getElementById('cv-status-area');
        const resultArea = document.getElementById('cv-result-area');
        if (!statusArea) return;

        statusArea.style.display = '';
        if (resultArea) resultArea.style.display = 'none';

        const statusColors = {
            submitted: 'var(--accent-primary)',
            running: 'var(--accent-primary)',
            completed: '#4ade80',
            failed: '#ff4444'
        };

        statusArea.innerHTML = `
            <div class="cv-status-card ${job.status === 'running' ? 'running' : ''} ${job.status === 'completed' ? 'completed' : ''} ${job.status === 'failed' ? 'failed' : ''}">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                    <h3 style="margin:0;">Analysis Job</h3>
                    <span class="job-status ${job.status}" style="background: ${statusColors[job.status]}20; color: ${statusColors[job.status]}; padding: 4px 12px; border-radius: 6px; font-size: 0.8rem; font-weight: 600;">${job.status.toUpperCase()}</span>
                </div>
                <div style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 10px;">
                    <div>Dataset: ${job.h5adPath}</div>
                    <div>Model: ${job.executionModel}</div>
                    <div>Analyses: ${job.numAnalyses} × ${job.maxIterations} iterations</div>
                    <div>Created: ${new Date(job.createdAt).toLocaleString()}</div>
                </div>
                ${job.status === 'running' || job.status === 'submitted' ? `
                    <div class="progress-bar"><div class="progress-fill" style="width: ${job.progress || 10}%"></div></div>
                    <p style="font-size: 0.8rem; color: var(--text-muted);">Progress: ${job.progress || 0}%</p>
                ` : ''}
            </div>
            ${job.status === 'completed' && job.result ? this.renderResult(job.result) : ''}
            ${job.status === 'failed' ? '<p style="color: #ff4444;">Analysis failed. Check the CellVoyager backend logs for details.</p>' : ''}
        `;
    },

    renderResult(result) {
        if (!result) return '';
        let html = '<div class="cv-status-card completed">';

        if (result.summary) {
            html += `<h4>Summary</h4><p style="line-height: 1.6;">${result.summary}</p>`;
        }

        if (result.analyses && result.analyses.length > 0) {
            html += '<h4 style="margin-top: 20px;">Analyses</h4>';
            result.analyses.forEach((a, i) => {
                html += `
                    <div class="cv-result-section" style="margin-top: 15px;">
                        <strong>${a.title || `Analysis ${i + 1}`}</strong>
                        ${a.description ? `<p style="font-size: 0.85rem; color: var(--text-muted);">${a.description}</p>` : ''}
                        ${a.code ? `<div class="cv-code-block">${a.code}</div>` : ''}
                        ${a.output ? `<p style="font-size: 0.85rem; margin-top: 8px;">${a.output}</p>` : ''}
                    </div>
                `;
            });
        }

        if (result.output_files && result.output_files.length > 0) {
            html += '<h4 style="margin-top: 20px;">Output Files</h4>';
            html += '<div style="display: flex; flex-wrap: wrap; gap: 10px; margin-top: 10px;">';
            result.output_files.forEach(f => {
                html += `<a href="${f.url}" target="_blank" class="btn-text" style="font-size: 0.85rem;">📎 ${f.name}</a>`;
            });
            html += '</div>';
        }

        html += '</div>';
        return html;
    },

    async loadJobHistory() {
        const jobs = await store.getAll('cellvoyager_jobs');
        const listEl = document.getElementById('cv-job-history');
        if (!listEl) return;

        if (jobs.length === 0) {
            listEl.innerHTML = '<p style="color: var(--text-muted); font-size: 0.85rem; text-align: center; padding: 20px 0;">No jobs yet.</p>';
            return;
        }

        listEl.innerHTML = jobs.sort((a, b) => b.createdAt - a.createdAt).map(job => `
            <div class="cv-job-item" onclick="cellvoyager.viewJob('${job.id}')">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-size: 0.85rem; font-weight: 600;">${job.h5adPath?.split('/').pop() || 'Unknown'}</span>
                    <span class="job-status ${job.status}">${job.status}</span>
                </div>
                <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 4px;">
                    ${new Date(job.createdAt).toLocaleDateString()}
                    <span style="float: right; cursor: pointer; color: #ff4444;"
                        onclick="event.stopPropagation(); cellvoyager.deleteJob('${job.id}')">✕</span>
                </div>
            </div>
        `).join('');
    },

    async viewJob(jobId) {
        const job = await store.get('cellvoyager_jobs', jobId);
        if (!job) return;
        this.currentJobId = jobId;
        this.renderJobStatus(job);
        if (job.status === 'submitted' || job.status === 'running') {
            this.startPolling(jobId);
        }
    },

    async deleteJob(jobId) {
        try {
            await store.delete('cellvoyager_jobs', jobId);
            if (this.currentJobId === jobId) {
                this.currentJobId = null;
                this.stopPolling();
                const statusArea = document.getElementById('cv-status-area');
                if (statusArea) {
                    statusArea.innerHTML = `
                        <div class="cv-empty-state">
                            <span style="font-size:3rem;">🧬</span>
                            <p>Submit an analysis or select a previous job.</p>
                        </div>`;
                }
            }
            await this.loadJobHistory();
            ui.showNotification('Job deleted', 'info');
        } catch (e) {
            ui.showNotification('Delete failed: ' + e.message, 'error');
        }
    }
};
