// Client wrapper for Tencent IMA OpenAPI (Direct Connection)
window.ima_client = {
    API_BASE: 'https://ima.qq.com',
    PROXY_BASE: 'http://localhost:3000/ima',

    async getCredentials() {
        const config = await store.get('settings', 'ima');
        if (!config || !config.clientId || !config.apiKey) {
            throw new Error('未配置 IMA API 凭证。请前往设置页配置 Client ID 和 API Key。');
        }
        return config;
    },

    async _request(endpoint, body) {
        const config = await this.getCredentials();
        const baseUrl = config.mode === 'proxy' ? this.PROXY_BASE : this.API_BASE;
        
        try {
            const response = await fetch(`${baseUrl}/${endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'ima-openapi-clientid': config.clientId,
                    'ima-openapi-apikey': config.apiKey,
                    // Pass a dummy version to satisfy API context requirement
                    'ima-openapi-ctx': 'skill_version=1.0.0'
                },
                body: JSON.stringify(body)
            });

            const data = await response.json();
            
            if (data.code !== 0) {
                throw new Error(data.msg || `API 错误 (代码: ${data.code})`);
            }
            
            return data.data;
        } catch (e) {
            console.error(`[IMA Client] Error calling ${endpoint}:`, e);
            
            // Detect typical CORS / Network errors in the browser
            if (e.name === 'TypeError' && e.message === 'Failed to fetch') {
                let msg = '网络请求被浏览器拦截 (CORS 错误)。';
                if (config.mode === 'direct') {
                    msg += '请确保已在跨域插件设置中将 "ima-openapi-clientid, ima-openapi-apikey, ima-openapi-ctx" 加入 Access-Control-Allow-Headers 白名单，或切换至「本地代理」模式。';
                } else {
                    msg += '请确保您已双击运行了项目目录下的「启动IMA代理.command」。';
                }
                throw new Error(msg);
            }
            throw e; // Propagate to UI layer
        }
    },

    /**
     * Search knowledge base
     * @param {string} query Search terms
     * @param {string} kbId Optional Knowledge Base ID
     * @returns {Promise<Array>} List of results
     */
    async searchKnowledge(query, kbId = '') {
        // If kbId is empty, we search across all knowledge bases by calling search_knowledge_base
        if (!kbId) {
            const res = await this._request('openapi/wiki/v1/search_knowledge_base', {
                query,
                cursor: '',
                limit: 5
            });
            // Normalize result to look like document search
            return (res.info_list || []).map(kb => ({
                id: kb.knowledge_base_id,
                title: `[知识库] ${kb.name}`,
                snippet: kb.desc || 'No description'
            }));
        }

        const res = await this._request('openapi/wiki/v1/search_knowledge', {
            query,
            knowledge_base_id: kbId,
            cursor: ''
        });
        
        // Return standard document hits
        return (res.info_list || []).map(doc => ({
            id: doc.media_id,
            title: doc.name,
            snippet: doc.desc || doc.content || '...',
            type: doc.media_type
        }));
    },

    /**
     * Create a new note in IMA (Import Doc)
     * @param {string} title Note title
     * @param {string} content Markdown content
     * @returns {Promise<string>} Note ID
     */
    async createNote(title, content) {
        const res = await this._request('openapi/wiki/v1/import_doc', {
            title,
            content,
            content_format: 1 // 1 for Markdown
        });
        return res.note_id;
    }
};
