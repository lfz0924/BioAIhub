window.memos = {
    currentMemoId: null,
    dirHandle: null,

    async init() {
        this.setupEventListeners();
        await this.refreshList();
    },

    async refreshList() {
        const list = await store.getAll('memos');
        const container = document.getElementById('memo-list');
        if (!container) return;

        if (list.length === 0) {
            container.innerHTML = '<div class="empty-state">No memos yet.</div>';
            return;
        }

        ui.renderList('memo-list', list.sort((a, b) => b.updatedAt - a.updatedAt), (m) => `
            <div class="mini-item ${this.currentMemoId === m.id ? 'active' : ''}" onclick="memos.loadMemo('${m.id}')">
                <div style="font-weight:600;">${m.title || 'Untitled'}</div>
                <div style="font-size:0.7rem; color:var(--text-muted);">${ui.formatDate(m.updatedAt)}</div>
            </div>
        `);
    },

    setupEventListeners() {
        const contentInput = document.getElementById('memo-content');
        const titleInput = document.getElementById('memo-title');

        if (contentInput) {
            contentInput.addEventListener('input', (e) => {
                this.updatePreview(e.target.value);
                this.autoSave();
            });
        }

        if (titleInput) {
            titleInput.addEventListener('input', () => this.autoSave());
        }

        document.getElementById('btn-new-memo')?.addEventListener('click', () => this.createNewMemo());
        document.getElementById('btn-delete-memo')?.addEventListener('click', () => this.deleteCurrentMemo());
        document.getElementById('btn-export-memo')?.addEventListener('click', () => this.exportCurrentMemo());
        
        // Folder Sync Listener
        document.getElementById('btn-sync-folder')?.addEventListener('click', () => this.linkFolder());
    },

    updatePreview(content) {
        const preview = document.getElementById('memo-preview');
        if (preview && window.marked) {
            preview.innerHTML = marked.parse(content || '');
        }
    },

    async createNewMemo() {
        const id = 'memo_' + Date.now();
        const newMemo = {
            id,
            title: 'New Research Note',
            content: '',
            createdAt: Date.now(),
            updatedAt: Date.now()
        };
        await store.set('memos', newMemo);
        await this.loadMemo(id);
        await this.refreshList();
    },

    async loadMemo(id) {
        const memo = await store.get('memos', id);
        if (!memo) return;

        this.currentMemoId = id;
        document.getElementById('memo-title').value = memo.title;
        document.getElementById('memo-content').value = memo.content;
        this.updatePreview(memo.content);
        
        // Highlight active list item
        this.refreshList();
    },

    async autoSave() {
        if (!this.currentMemoId) return;
        
        const title = document.getElementById('memo-title').value;
        const content = document.getElementById('memo-content').value;
        
        const memo = await store.get('memos', this.currentMemoId);
        if (memo) {
            memo.title = title;
            memo.content = content;
            memo.updatedAt = Date.now();
            await store.set('memos', memo);
            
            // Sync to Local File if linked
            if (this.dirHandle) {
                this.syncToFile(memo);
            }
        }
    },

    async deleteCurrentMemo() {
        if (!this.currentMemoId || !confirm('Delete this memo?')) return;
        await store.delete('memos', this.currentMemoId);
        this.currentMemoId = null;
        document.getElementById('memo-title').value = '';
        document.getElementById('memo-content').value = '';
        this.updatePreview('');
        await this.refreshList();
    },

    // --- File System Access Logic ---

    async linkFolder() {
        try {
            this.dirHandle = await window.showDirectoryPicker();
            window.linkedDirHandle = this.dirHandle; // Make it globally accessible for RAG
            document.getElementById('sync-status').innerText = 'Linked: ' + this.dirHandle.name;
            document.getElementById('sync-status').classList.add('success');
            ui.showNotification('Folder linked successfully. Changes will now sync to local disk.', 'success');
        } catch (e) {
            console.error('Folder link failed:', e);
            ui.showNotification('Folder linking canceled or failed.', 'error');
        }
    },

    async syncToFile(memo) {
        if (!this.dirHandle) return;
        try {
            // Use title as filename, sanitize it
            const filename = (memo.title || 'untitled').replace(/[/\\?%*:|"<>]/g, '-') + '.md';
            const fileHandle = await this.dirHandle.getFileHandle(filename, { create: true });
            const writable = await fileHandle.createWritable();
            await writable.write(memo.content);
            await writable.close();
            console.log(`Synced to local: ${filename}`);
        } catch (e) {
            console.warn('Sync to file failed:', e);
        }
    },

    async exportCurrentMemo() {
        const title = document.getElementById('memo-title').value || 'memo';
        const content = document.getElementById('memo-content').value;
        const blob = new Blob([content], { type: 'text/markdown' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `${title}.md`;
        a.click();
    }
};
