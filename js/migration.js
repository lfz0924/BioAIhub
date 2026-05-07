

window. migration = {
    async run() {
        const isDone = localStorage.getItem('bioHubV2_migration_done');
        if (isDone) return;

        console.log('Starting BioHub v2 Migration...');

        try {
            // 1. Migrate API Settings
            const apiUrl = localStorage.getItem('bio_api_url');
            const apiKey = localStorage.getItem('bio_api_key');
            const apiModel = localStorage.getItem('bio_api_model');
            const apiProxy = localStorage.getItem('bio_api_proxy');

            if (apiKey) {
                await store.set('settings', {
                    id: 'api',
                    baseUrl: apiUrl || 'https://generativelanguage.googleapis.com/v1',
                    apiKey: apiKey,
                    model: apiModel || 'gemini-2.0-flash',
                    proxy: apiProxy || ''
                });
            }

            // 2. Migrate Main App State (Pet, Theme, Lang)
            const mainDataRaw = localStorage.getItem('bioHubV5');
            if (mainDataRaw) {
                const mainData = JSON.parse(mainDataRaw);
                
                // Migrate Companion
                if (mainData.pet) {
                    await store.set('companion', {
                        id: 'state',
                        ...mainData.pet
                    });
                }

                // Migrate Global Settings
                await store.set('settings', { id: 'theme', value: mainData.theme || 'midnight' });
                await store.set('settings', { id: 'lang', value: mainData.lang || 'zh' });
            }

            // 3. Migrate Planner History
            const historyRaw = localStorage.getItem('bioHubPlanHistory');
            if (historyRaw) {
                const history = JSON.parse(historyRaw);
                if (Array.isArray(history) && history.length > 0) {
                    // Create a default project for imported plans
                    const defaultProject = {
                        id: 'proj_imported',
                        name: 'Imported Archives',
                        status: 'archived',
                        question: 'Historical research plans migrated from v1.',
                        background: '',
                        keywords: ['migration', 'v1'],
                        notes: 'Automatic migration from old BioIntelligenceHub.',
                        createdAt: Date.now(),
                        updatedAt: Date.now()
                    };
                    await store.set('projects', defaultProject);

                    // Migrate plans
                    for (const item of history) {
                        const plan = {
                            id: 'plan_' + (item.timestamp || Date.now() + Math.random()),
                            projectId: 'proj_imported',
                            question: item.question || 'Unknown Question',
                            summary: item.summary || '',
                            tools: item.tools || [],
                            createdAt: item.timestamp || Date.now(),
                            rawOutput: item.rawResponse || ''
                        };
                        await store.set('plans', plan);
                    }
                }
            }

            localStorage.setItem('bioHubV2_migration_done', 'true');
            console.log('Migration Completed Successfully');
        } catch (err) {
            console.error('Migration Failed:', err);
        }
    }
};
