const DB_NAME = 'BioIntelligenceHubDB';
const DB_VERSION = 4;

window. store = {
    db: null,

    init() {
        return new Promise((resolve, reject) => {
            try {
                const request = indexedDB.open(DB_NAME, DB_VERSION);

                request.onupgradeneeded = (event) => {
                    const db = event.target.result;
                    const stores = ['projects', 'plans', 'evidence', 'companion', 'settings', 'memos', 'chat', 'expeditions'];
                    stores.forEach(s => {
                        if (!db.objectStoreNames.contains(s)) {
                            if (s === 'plans' || s === 'evidence') {
                                const store = db.createObjectStore(s, { keyPath: 'id' });
                                store.createIndex('projectId', 'projectId', { unique: false });
                            } else if (s === 'chat') {
                                db.createObjectStore(s, { keyPath: 'id', autoIncrement: true });
                            } else {
                                db.createObjectStore(s, { keyPath: 'id' });
                            }
                        }
                    });
                };

                request.onsuccess = async (event) => {
                    this.db = event.target.result;
                    console.log('IndexedDB opened successfully, version:', this.db.version);
                    await this.seedInitialData();
                    resolve(this.db);
                };

                request.onerror = (event) => {
                    console.error('IndexedDB open error:', event.target.error);
                    reject(event.target.error);
                };
            } catch (err) {
                console.error('IndexedDB init exception:', err);
                reject(err);
            }
        });
    },

    async get(storeName, id) {
        if (!this.db) throw new Error('DB not initialized');
        return new Promise((resolve, reject) => {
            try {
                const transaction = this.db.transaction(storeName, 'readonly');
                const objectStore = transaction.objectStore(storeName);
                const request = objectStore.get(id);
                request.onsuccess = () => resolve(request.result || null);
                request.onerror = () => reject(request.error);
            } catch (e) {
                console.error(`store.get('${storeName}', '${id}') failed:`, e);
                resolve(null);
            }
        });
    },

    async getAll(storeName) {
        if (!this.db) throw new Error('DB not initialized');
        return new Promise((resolve, reject) => {
            try {
                const transaction = this.db.transaction(storeName, 'readonly');
                const objectStore = transaction.objectStore(storeName);
                const request = objectStore.getAll();
                request.onsuccess = () => resolve(request.result || []);
                request.onerror = () => reject(request.error);
            } catch (e) {
                console.error(`store.getAll('${storeName}') failed:`, e);
                resolve([]);
            }
        });
    },

    async set(storeName, data) {
        if (!this.db) throw new Error('DB not initialized');
        return new Promise((resolve, reject) => {
            try {
                const transaction = this.db.transaction(storeName, 'readwrite');
                const objectStore = transaction.objectStore(storeName);
                const request = objectStore.put(data);
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => {
                    console.error(`store.set('${storeName}') failed:`, request.error, 'data:', data);
                    reject(request.error);
                };
            } catch (e) {
                console.error(`store.set('${storeName}') exception:`, e);
                reject(e);
            }
        });
    },

    async delete(storeName, id) {
        if (!this.db) throw new Error('DB not initialized');
        return new Promise((resolve, reject) => {
            try {
                const transaction = this.db.transaction(storeName, 'readwrite');
                const objectStore = transaction.objectStore(storeName);
                const request = objectStore.delete(id);
                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            } catch (e) {
                console.error(`store.delete('${storeName}', '${id}') failed:`, e);
                resolve();
            }
        });
    },

    async getByProject(storeName, projectId) {
        if (!this.db) throw new Error('DB not initialized');
        return new Promise((resolve, reject) => {
            try {
                const transaction = this.db.transaction(storeName, 'readonly');
                const objectStore = transaction.objectStore(storeName);
                const index = objectStore.index('projectId');
                const request = index.getAll(projectId);
                request.onsuccess = () => resolve(request.result || []);
                request.onerror = () => reject(request.error);
            } catch (e) {
                console.error(`store.getByProject('${storeName}', '${projectId}') failed:`, e);
                resolve([]);
            }
        });
    },

    async seedInitialData() {
        // 1. Seed API Settings if missing
        const api = await this.get('settings', 'api');
        if (!api) {
            console.log('Seeding default API settings...');
            await this.set('settings', {
                id: 'api',
                baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
                apiKey: '',
                model: 'gemini-2.0-flash'
            });
        }

        // 2. Seed Research Tools if missing (Global Tools have projectId: 'global')
        const tools = await this.getAll('evidence');
        const globalTools = tools.filter(t => t.projectId === 'global');
        if (globalTools.length === 0) {
            console.log('Seeding default research tools...');
            const defaultTools = [
                { id: 't1', projectId: 'global', name: 'PubMed', category: 'search', url: 'https://pubmed.ncbi.nlm.nih.gov/', tags: ['Free'] },
                { id: 't2', projectId: 'global', name: 'Google Scholar', category: 'search', url: 'https://scholar.google.com/', tags: ['Free'] },
                { id: 't3', projectId: 'global', name: 'Elicit', category: 'analysis', url: 'https://elicit.org/', tags: ['Limit'] },
                { id: 't4', projectId: 'global', name: 'Consensus', category: 'analysis', url: 'https://consensus.app/', tags: ['Limit'] },
                { id: 't5', projectId: 'global', name: 'Connected Papers', category: 'analysis', url: 'https://www.connectedpapers.com/', tags: ['Paid'] },
                { id: 't6', projectId: 'global', name: 'Semantic Scholar', category: 'search', url: 'https://www.semanticscholar.org/', tags: ['Free'] }
            ];
            for (const t of defaultTools) {
                await this.set('evidence', t);
            }
        }
    }
};
