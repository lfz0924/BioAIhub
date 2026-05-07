


window. projects = {
    async init() {
        await this.refresh();
        this.setupEventListeners();
    },

    async refresh() {
        try {
            const allProjects = await store.getAll('projects');
            if (allProjects.length === 0) {
                const container = document.getElementById('projects-grid');
                if (container) container.innerHTML = '<div class="empty-state">No projects yet. Click "Create New Project" to start.</div>';
                return;
            }
            ui.renderList('projects-grid', allProjects, (p) => `
                <div class="card project-card" onclick="window.app.openProject('${p.id}')">
                    <h3>${p.name || 'Untitled'}</h3>
                    <p>${(p.question || '').slice(0, 100)}...</p>
                    <div class="card-footer">
                        <span class="status-tag">${p.status || 'active'}</span>
                        <span class="date">${ui.formatDate(p.updatedAt)}</span>
                    </div>
                </div>
            `);
        } catch (e) {
            console.error('Projects refresh failed:', e);
        }
    },

    setupEventListeners() {
        const btn = document.getElementById('btn-create-project');
        if (btn) {
            btn.addEventListener('click', () => {
                this.showCreateModal();
            });
        }
    },

    showCreateModal() {
        ui.showModal(`
            <h2 data-i18n="action_new_project">创建新项目</h2>
            <div class="form-group">
                <label>项目名称</label>
                <input type="text" id="new-project-name" placeholder="例如：IL-17 肿瘤微环境研究">
                <label>研究问题</label>
                <textarea id="new-project-q" placeholder="描述您的核心研究问题"></textarea>
                <button class="btn-primary" id="btn-submit-project">创建项目</button>
            </div>
        `);

        const submitBtn = document.getElementById('btn-submit-project');
        if (submitBtn) {
            submitBtn.addEventListener('click', async () => {
                const name = document.getElementById('new-project-name')?.value;
                const question = document.getElementById('new-project-q')?.value;
                if (!name || !question) {
                    ui.showNotification('请填写项目名称和研究问题', 'error');
                    return;
                }

                const id = 'proj_' + Date.now();
                const project = {
                    id,
                    name,
                    question,
                    status: 'active',
                    background: '',
                    keywords: [],
                    notes: '',
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                    planIds: [],
                    evidenceIds: []
                };

                try {
                    await store.set('projects', project);
                    ui.hideModal();
                    await this.refresh();
                    this.openProject(id);
                } catch (e) {
                    console.error('Failed to create project:', e);
                    ui.showNotification('Failed to create project', 'error');
                }
            });
        }
    },

    async openProject(id) {
        try {
            const project = await store.get('projects', id);
            if (!project) return;

            let plans = [];
            let evidenceItems = [];
            try { plans = await store.getByProject('plans', id); } catch (e) { /* ignore */ }
            try { evidenceItems = await store.getByProject('evidence', id); } catch (e) { /* ignore */ }

            const workspace = document.getElementById('project-detail-workspace');
            if (!workspace) return;

            workspace.innerHTML = `
                <header class="header">
                    <div class="breadcrumb" style="cursor:pointer; color: var(--accent-primary);" onclick="ui.setTab('projects')">← Back to Projects</div>
                    <h1>${project.name}</h1>
                    <div class="project-meta">
                        <span>Status: ${project.status}</span> | 
                        <span>Created: ${ui.formatDate(project.createdAt)}</span>
                    </div>
                </header>

                <div class="project-layout">
                    <div class="project-main">
                        <section class="project-section card">
                            <h3>Research Context</h3>
                            <div class="context-item">
                                <label>Question</label>
                                <p>${project.question}</p>
                            </div>
                            <div class="context-item">
                                <label>Background</label>
                                <textarea id="proj-bg-input" class="auto-save">${project.background || ''}</textarea>
                            </div>
                        </section>

                        <section class="project-section">
                            <h3>AI Plans</h3>
                            <div id="proj-plans-list" class="item-list">
                                ${plans.length > 0 ? plans.map(pl => `
                                    <div class="item-row">
                                        <span>${(pl.question || '').slice(0, 60)}...</span>
                                        <span>${ui.formatDate(pl.createdAt)}</span>
                                    </div>
                                `).join('') : '<div class="empty-state">No plans yet</div>'}
                            </div>
                            <button class="btn-text" onclick="window.app.newPlanForProject('${project.id}')">+ New Plan</button>
                        </section>
                    </div>

                    <div class="project-sidebar">
                        <section class="project-section card">
                            <h3>Evidence Snapshot</h3>
                            <div class="evidence-stats">
                                <div>Support: ${evidenceItems.filter(e => e.stance === 'support').length}</div>
                                <div>Conflict: ${evidenceItems.filter(e => e.stance === 'conflict').length}</div>
                            </div>
                            <div id="proj-evidence-list" class="mini-list">
                                ${evidenceItems.slice(0, 5).map(e => `
                                    <div class="mini-item">
                                        <span class="stance-dot ${e.stance || ''}"></span>
                                        <span>${e.title || 'Untitled'}</span>
                                    </div>
                                `).join('')}
                            </div>
                            <button class="btn-text" onclick="window.app.newEvidenceForProject('${project.id}')">+ Add Evidence</button>
                        </section>
                    </div>
                </div>
            `;

            ui.setTab('project-detail');

            // Setup auto-save for background
            const bgInput = document.getElementById('proj-bg-input');
            if (bgInput) {
                bgInput.addEventListener('blur', async (e) => {
                    project.background = e.target.value;
                    project.updatedAt = Date.now();
                    try { await store.set('projects', project); } catch (err) { console.error(err); }
                });
            }
        } catch (e) {
            console.error('Failed to open project:', e);
        }
    }
};
