


window. dashboard = {
    async init() {
        await this.refresh();
    },

    async refresh() {
        try {
            const projects = await store.getAll('projects');
            const plans = await store.getAll('plans');

            // Sort by update time, handle missing timestamps
            const recentProjects = projects
                .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
                .slice(0, 5);
            const recentPlans = plans
                .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
                .slice(0, 5);

            ui.renderList('recent-projects-list', recentProjects, (p) => `
                <div class="item-row" onclick="window.app.openProject('${p.id}')">
                    <div>
                        <strong>${p.name || 'Untitled'}</strong>
                        <div class="item-meta">${p.status || ''}</div>
                    </div>
                    <div class="item-date">${ui.formatDate(p.updatedAt)}</div>
                </div>
            `);

            ui.renderList('recent-plans-list', recentPlans, (pl) => `
                <div class="item-row">
                    <div>
                        <strong>${(pl.question || 'Untitled').slice(0, 50)}...</strong>
                    </div>
                    <div class="item-date">${ui.formatDate(pl.createdAt)}</div>
                </div>
            `);

            if (recentProjects.length === 0) {
                const container = document.getElementById('recent-projects-list');
                if (container) container.innerHTML = '<div class="empty-state">No projects yet. Create one to get started!</div>';
            }
            if (recentPlans.length === 0) {
                const container = document.getElementById('recent-plans-list');
                if (container) container.innerHTML = '<div class="empty-state">No plans yet.</div>';
            }
        } catch (e) {
            console.error('Dashboard refresh failed:', e);
        }
    }
};
