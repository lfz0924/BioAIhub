











window.BioHubApp = class BioHubApp {
    constructor() {
        this.currentTab = 'dashboard';
    }

    async init() {
        console.log('BioHub v2: Starting initialization...');

        // Initialize Theme from localStorage
        const savedTheme = localStorage.getItem('bio-hub-theme') || 'midnight';
        ui.setTheme(savedTheme);

        // STEP 1: Set up navigation and global events FIRST
        // This ensures clicks work even if data loading fails
        this.setupNavigation();
        this.setupGlobalEvents();
        console.log('BioHub v2: Navigation ready.');

        try {
            // STEP 2: Initialize IndexedDB
            console.log('BioHub v2: Initializing store...');
            await store.init();

            // STEP 3: Run migration (non-blocking on failure)
            console.log('BioHub v2: Running migration...');
            try { await migration.run(); } catch (e) {
                console.warn('Migration failed (non-fatal):', e);
            }

            // STEP 4: Initialize UI translations
            console.log('BioHub v2: Initializing UI...');
            ui.init();

            // STEP 5: Initialize each feature module independently
            const features = [
                { name: 'dashboard', module: dashboard },
                { name: 'projects', module: projects },
                { name: 'planner', module: planner },
                { name: 'evidence', module: evidence },
                { name: 'companion', module: companion },
                { name: 'memos', module: memos },
                { name: 'settings', module: settings }
            ];

            for (const feature of features) {
                try {
                    console.log(`BioHub v2: Initializing ${feature.name}...`);
                    await feature.module.init();
                    console.log(`BioHub v2: ${feature.name} initialized OK`);
                } catch (e) {
                    console.error(`BioHub v2: Failed to initialize ${feature.name}:`, e);
                }
            }

            // STEP 6: Render static content
            try { this.initTools(); } catch (e) { console.error('initTools failed:', e); }
            try { this.initGuide(); } catch (e) { console.error('initGuide failed:', e); }

            console.log('BioHub v2: ✅ Application fully initialized');
        } catch (err) {
            console.error('BioHub v2: ❌ CRITICAL initialization error:', err);
            // Even if store fails, navigation should still work for static tabs
        }
    }

    setupNavigation() {
        const navItems = document.querySelectorAll('.nav-item');
        console.log(`BioHub v2: Binding ${navItems.length} nav items`);

        navItems.forEach(item => {
            item.addEventListener('click', () => {
                const tab = item.getAttribute('data-tab');
                if (tab) {
                    console.log(`BioHub v2: Nav click -> ${tab}`);
                    this.switchTab(tab);
                }
            });
        });

        // Theme Switcher events
        document.querySelectorAll('.theme-dot').forEach(dot => {
            dot.addEventListener('click', () => {
                const theme = dot.getAttribute('data-theme');
                ui.setTheme(theme);
            });
        });

        // Also bind dashboard quick action buttons
        document.querySelectorAll('.btn-action').forEach(btn => {
            btn.addEventListener('click', () => {
                const action = btn.getAttribute('data-action');
                if (action === 'new-project') this.switchTab('projects');
                if (action === 'open-planner') this.switchTab('planner');
                if (action === 'add-evidence') this.switchTab('evidence');
            });
        });

        // Bind new project button on dashboard
        const btnNewDash = document.getElementById('btn-new-project-dash');
        if (btnNewDash) {
            btnNewDash.addEventListener('click', () => {
                if (window.app && window.app.showNewProjectModal) {
                    window.app.showNewProjectModal();
                } else {
                    this.switchTab('projects');
                }
            });
        }
    }

    switchTab(tabId) {
        console.log(`BioHub v2: Switching to ${tabId}`);

        // Companion opens as a modal, not a tab
        if (tabId === 'companion') {
            try { companion.showCompanionWorkspace(); } catch (e) {
                console.error('Companion modal error:', e);
            }
            return;
        }

        this.currentTab = tabId;
        ui.setTab(tabId);

        // Refresh data on tab switch (non-fatal)
        try {
            if (tabId === 'dashboard' && dashboard.refresh) dashboard.refresh();
            if (tabId === 'projects' && projects.refresh) projects.refresh();
            if (tabId === 'evidence' && evidence.refresh) evidence.refresh();
            if (tabId === 'memos' && memos.refreshList) memos.refreshList();
        } catch (e) {
            console.warn(`Tab refresh for '${tabId}' failed:`, e);
        }
    }

    initTools() {
        this.renderToolCategory('discovery');

        document.querySelectorAll('.tool-tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.tool-tab-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.renderToolCategory(btn.getAttribute('data-tool-tab'));
            });
        });
    }

    renderToolCategory(cat) {
        const tools = TOOL_CATALOG[cat] || [];
        ui.renderList('tools-container', tools, (t) => `
            <div class="card tool-card">
                <h3>${t.title} <span class="badge badge-${t.badge}">${t.badge}</span></h3>
                <p data-i18n="${t.i18n_desc}"></p>
                <a href="${t.url}" target="_blank" class="btn-primary" data-i18n="${t.btn_i18n}">Access</a>
            </div>
        `);
        ui.applyTranslations();
    }

    initGuide() {
        ui.renderList('guide-container', GUIDE_CONTENT, (g) => `
            <div class="accordion-item card">
                <h3 data-i18n="${g.i18n_title}"></h3>
                <div class="guide-steps">
                    ${g.steps.map(s => `
                        <div class="step">
                            ${s.title_i18n ? `<h5 data-i18n="${s.title_i18n}"></h5>` : ''}
                            <p data-i18n="${s.i18n_p}"></p>
                        </div>
                    `).join('')}
                </div>
            </div>
        `);
        ui.applyTranslations();
    }

    setupGlobalEvents() {
        // Modal close button
        const closeBtn = document.getElementById('btn-close-modal');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => ui.hideModal());
        }

        // Expose methods for inline onclick in dynamic HTML
        window.app = {
            openProject: (id) => {
                try { projects.openProject(id); } catch (e) { console.error(e); }
            },
            showNewProjectModal: () => {
                try { projects.showCreateModal(); } catch (e) { console.error(e); }
            },
            showAddEvidenceModal: (projectId) => {
                try { evidence.showAddModal(projectId); } catch (e) { console.error(e); }
            },
            newPlanForProject: (projectId) => {
                ui.setTab('planner');
                const sel = document.getElementById('planner-project-select');
                if (sel) sel.value = projectId;
            },
            newEvidenceForProject: (projectId) => {
                try { evidence.showAddModal(projectId); } catch (e) { console.error(e); }
            }
        };
    }
}

// Boot the app
const app = new BioHubApp();
app.init();
window.bioHub = app;
