


window. planner = {
    async init() {
        this.setupEventListeners();
        await this.refreshProjectSelector();
    },

    async refreshProjectSelector() {
        const projects = await store.getAll('projects');
        const select = document.getElementById('planner-project-select');
        if (!select) return;
        select.innerHTML = `<option value="">-- Select Project --</option>` + 
            projects.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
    },

    setupEventListeners() {
        const btn = document.getElementById('btn-generate-plan');
        if (btn) btn.addEventListener('click', () => this.generatePlan());
    },

    async generatePlan() {
        const projectId = document.getElementById('planner-project-select').value;
        const question = document.getElementById('planner-q').value;
        const background = document.getElementById('planner-bg').value;

        if (!question) return alert('请输入研究问题');

        const spinner = document.querySelector('.planner-spinner');
        spinner.style.display = 'block';

        try {
            const config = await this.getApiConfig();
            if (!config.apiKey) throw new Error('API Key missing');

            const planData = await this.callAI(config, { question, background });
            this.renderPlan(planData, projectId);
        } catch (err) {
            alert('Error: ' + err.message);
        } finally {
            spinner.style.display = 'none';
        }
    },

    async getApiConfig() {
        const settings = await store.get('settings', 'api');
        return settings || {
            baseUrl: 'https://generativelanguage.googleapis.com/v1',
            apiKey: localStorage.getItem('bio_api_key') || '',
            model: 'gemini-2.0-flash'
        };
    },

    async callAI(config, input) {
        // Mocking AI response for now to ensure flow works. 
        // In real execution, this would be the ported fetch logic.
        return {
            summary: "Based on the IL-17 and tumor microenvironment query, we recommend a 3-stage search strategy.",
            objective: "Map IL-17 signaling in CD8+ T cells.",
            tools: [
                { name: "PubMed", query: "IL-17 AND CD8 AND Tumor", note: "Look for recent reviews." },
                { name: "Consensus", query: "Does IL-17 inhibit CD8 T cell exhaustion?", note: "Verify the core mechanism." }
            ],
            nextActions: ["Run PubMed search", "Validate in Scispace"],
            rawOutput: "{...}"
        };
    },

    renderPlan(data, projectId) {
        const output = document.getElementById('plan-output');
        output.innerHTML = `
            <div class="card plan-card">
                <h3>Research Plan Summary</h3>
                <p>${data.summary}</p>
                
                <div class="tool-recommendations">
                    ${data.tools.map(t => `
                        <div class="plan-tool-item">
                            <div class="tool-header">
                                <strong>${t.name}</strong>
                                <button class="btn-copy-query" onclick="navigator.clipboard.writeText('${t.query}')">Copy Query</button>
                            </div>
                            <code>${t.query}</code>
                            <p>${t.note}</p>
                        </div>
                    `).join('')}
                </div>

                <div class="plan-actions">
                    <button class="btn-primary" id="btn-save-plan">Save to Project</button>
                    <div class="export-group">
                        <button class="btn-text" id="btn-export-ima">☁️ 导出到 IMA</button>
                        <button class="btn-text" id="btn-export-pdf">Export PDF</button>
                        <button class="btn-text" id="btn-export-pptx">Export PPTX</button>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('btn-save-plan').addEventListener('click', async () => {
            try {
                const plan = {
                    id: 'plan_' + Date.now(),
                    projectId,
                    question: document.getElementById('planner-q').value,
                    summary: data.summary,
                    tools: data.tools,
                    createdAt: Date.now()
                };
                await store.set('plans', plan);
                ui.showNotification('Plan saved to project.', 'success');
            } catch (e) {
                console.error(e);
                ui.showNotification('Failed to save plan.', 'error');
            }
        });

        document.getElementById('btn-export-ima').addEventListener('click', async () => {
            const btn = document.getElementById('btn-export-ima');
            const originalText = btn.innerText;
            btn.innerText = '☁️ 推送中...';
            btn.disabled = true;
            
            try {
                // Generate Markdown content
                const content = `# Research Plan: ${data.objective}\n\n**Summary:**\n${data.summary}\n\n**Recommended Tools & Queries:**\n${data.tools.map(t => `- **${t.name}**: \`${t.query}\`\n  *${t.note}*`).join('\n')}\n\n**Next Actions:**\n${data.nextActions.map(a => `- [ ] ${a}`).join('\n')}`;
                
                await window.ima_client.createNote(`Plan: ${data.objective.substring(0, 20)}...`, content);
                ui.showNotification('成功推送到 IMA 知识库！', 'success');
            } catch (e) {
                ui.showNotification('推送失败: ' + e.message, 'error');
            } finally {
                btn.innerText = originalText;
                btn.disabled = false;
            }
        });

        document.getElementById('btn-export-pdf').addEventListener('click', () => this.exportToPDF(data));
        document.getElementById('btn-export-pptx').addEventListener('click', () => this.exportToPPTX(data));
    },

    exportToPDF(data) {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        doc.setFontSize(20);
        doc.text("BioIntelligence Hub: Research Plan", 20, 20);
        doc.setFontSize(12);
        doc.text(`Question: ${document.getElementById('planner-q').value}`, 20, 35);
        doc.text("Summary:", 20, 50);
        doc.setFontSize(10);
        const splitSummary = doc.splitTextToSize(data.summary, 170);
        doc.text(splitSummary, 20, 60);
        
        let y = 100;
        doc.text("Recommended Tools & Queries:", 20, y);
        data.tools.forEach(t => {
            y += 10;
            doc.text(`${t.name}: ${t.query}`, 20, y);
        });

        doc.save(`Research_Plan_${Date.now()}.pdf`);
    },

    exportToPPTX(data) {
        let pptx = new PptxGenJS();
        let slide = pptx.addSlide();
        slide.addText("BioIntelligence Research Plan", { x: 1, y: 1, fontSize: 32, color: "363636" });
        slide.addText(data.summary, { x: 1, y: 2, fontSize: 14, color: "666666" });
        
        data.tools.forEach((t, i) => {
            let s = pptx.addSlide();
            s.addText(t.name, { x: 1, y: 1, fontSize: 24 });
            s.addText(`Query: ${t.query}`, { x: 1, y: 2, fontSize: 18, color: "0000FF" });
            s.addText(t.note, { x: 1, y: 3, fontSize: 14 });
        });

        pptx.writeFile({ fileName: `BioHub_Presentation_${Date.now()}.pptx` });
    }
};
