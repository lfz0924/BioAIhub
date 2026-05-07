


window. evidence = {
    async init() {
        await this.refresh();
        this.setupEventListeners();
    },

    async refresh() {
        try {
            // Refresh Evidence (Notes)
            const items = await store.getAll('evidence');
            const notes = items.filter(e => e.projectId !== 'global');
            const tools = items.filter(e => e.projectId === 'global');

            const evContainer = document.getElementById('evidence-list');
            if (evContainer) {
                if (notes.length === 0) {
                    evContainer.innerHTML = '<div class="empty-state">No evidence recorded yet.</div>';
                } else {
                    ui.renderList('evidence-list', notes, (e) => `
                        <div class="card evidence-card ${e.stance || ''}">
                            <div class="evidence-type">${e.type || 'note'}</div>
                            <h3>${e.title || 'Untitled'}</h3>
                            <p>${e.summary || e.note || ''}</p>
                            <div class="evidence-footer">
                                <span class="stance-badge">${e.stance || 'uncertain'}</span>
                                ${e.url ? `<a href="${e.url}" target="_blank" class="btn-link">Source</a>` : ''}
                            </div>
                        </div>
                    `);
                }
            }

            // Refresh Tools Library
            this.renderTools(tools);
        } catch (e) {
            console.error('Evidence/Tools refresh failed:', e);
        }
    },

    renderTools(tools) {
        const container = document.getElementById('tools-container');
        if (!container) return;

        if (tools.length === 0) {
            container.innerHTML = '<div class="empty-state">Loading default tools...</div>';
            return;
        }

        // Simple filtering based on current active tool tab could be added here
        ui.renderList('tools-container', tools, (t) => `
            <div class="card tool-card" onclick="window.open('${t.url}', '_blank')">
                <div class="tool-icon">${this.getToolIcon(t.name)}</div>
                <div class="tool-info">
                    <h3>${t.name}</h3>
                    <div class="tool-tags">
                        ${(t.tags || []).map(tag => `<span class="tag">${tag}</span>`).join('')}
                    </div>
                </div>
            </div>
        `);
    },

    getToolIcon(name) {
        const icons = { 'PubMed': '📚', 'Google Scholar': '🎓', 'Elicit': '🔍', 'Consensus': '📊', 'Connected Papers': '🕸', 'Semantic Scholar': '📖' };
        return icons[name] || '🛠';
    },

    setupEventListeners() {
        const btn = document.getElementById('btn-add-evidence');
        if (btn) {
            btn.addEventListener('click', () => {
                this.showAddModal();
            });
        }
    },

    async showAddModal(projectId = '') {
        let projects = [];
        try { projects = await store.getAll('projects'); } catch (e) { /* ignore */ }

        ui.showModal(`
            <h2>录入证据 (Evidence)</h2>
            <div class="form-group">
                <label>所属项目</label>
                <select id="ev-proj-select" class="selector">
                    <option value="">-- No Project --</option>
                    ${projects.map(p => `<option value="${p.id}" ${p.id === projectId ? 'selected' : ''}>${p.name}</option>`).join('')}
                </select>

                <label>标题</label>
                <input type="text" id="ev-title" placeholder="论文标题或观察摘要">

                <label>立场 (Stance)</label>
                <div class="stance-picker">
                    <button class="stance-btn" data-stance="support">Support</button>
                    <button class="stance-btn" data-stance="conflict">Conflict</button>
                    <button class="stance-btn active" data-stance="uncertain">Uncertain</button>
                </div>

                <label>链接 / 来源</label>
                <input type="text" id="ev-url" placeholder="https://...">

                <label>笔记</label>
                <textarea id="ev-note"></textarea>

                <button class="btn-primary" id="btn-submit-evidence">保存证据</button>
            </div>
        `);

        let selectedStance = 'uncertain';
        document.querySelectorAll('.stance-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.stance-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                selectedStance = e.target.getAttribute('data-stance');
            });
        });

        const submitBtn = document.getElementById('btn-submit-evidence');
        if (submitBtn) {
            submitBtn.addEventListener('click', async () => {
                const ev = {
                    id: 'ev_' + Date.now(),
                    projectId: document.getElementById('ev-proj-select')?.value || '',
                    title: document.getElementById('ev-title')?.value || '',
                    stance: selectedStance,
                    url: document.getElementById('ev-url')?.value || '',
                    note: document.getElementById('ev-note')?.value || '',
                    type: 'paper',
                    createdAt: Date.now()
                };

                try {
                    await store.set('evidence', ev);
                    ui.hideModal();
                    await this.refresh();
                } catch (e) {
                    console.error('Failed to save evidence:', e);
                }
            });
        }
    }
};
