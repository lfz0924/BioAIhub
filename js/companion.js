




window. companion = {
    state: {
        type: 'pipette',
        level: 1,
        exp: 0,
        stats: { focus: 100, precision: 10, inspiration: 5, affinity: 0 }
    },
    chatHistory: [],
    isTyping: false,

    async init() {
        const saved = await store.get('companion', 'state');
        if (saved) {
            this.state = saved;
            if (this.state.stats.affinity === undefined) {
                this.state.stats.affinity = 0;
            }
        }
        this.chatHistory = (await store.getAll('chat')) || [];
        this.updateUI();
        this.setupEventListeners();
    },

    updateUI() {
        const triggerImg = document.getElementById('pet-trigger-img');
        if (triggerImg) {
            const petImgSet = IMGS[this.state.type] || IMGS.pipette;
            triggerImg.src = petImgSet.s1; 
        }
    },

    setupEventListeners() {
        const trigger = document.getElementById('pet-trigger');
        if (trigger) {
            trigger.addEventListener('click', () => {
                this.showCompanionWorkspace();
            });
        }
    },

    async addExp(amount) {
        this.state.exp += amount;
        const needed = this.state.level * 100;
        if (this.state.exp >= needed) {
            this.state.level++;
            this.state.exp -= needed;
            this.state.stats.focus += 10;
            this.state.stats.precision += 2;
            this.state.stats.inspiration += 1;
            ui.showNotification(`Companion leveled up to ${this.state.level}!`, 'success');
        }
        await store.set('companion', { id: 'state', ...this.state });
    },

    showCompanionWorkspace() {
        const petImgSet = IMGS[this.state.type] || IMGS.pipette;
        const expNeeded = this.state.level * 100;
        const expPercent = Math.min(100, (this.state.exp / expNeeded) * 100);

        ui.showModal(`
            <div class="companion-workspace-modal">
                <div class="companion-layout">
                    <div class="companion-sidebar-info">
                        <div class="pet-visual">
                            <img src="${petImgSet.s1}" class="floating">
                        </div>
                        <h3>${this.state.type.toUpperCase()}</h3>
                        <div class="level-badge">Level ${this.state.level}</div>
                        
                        <div class="exp-bar-mini">
                            <div class="fill" style="width: ${expPercent}%"></div>
                        </div>

                        <div class="mini-stats">
                            <span class="stat">LV.${this.state.level}</span>
                            <span class="stat">FOC:${this.state.stats.focus}</span>
                            <span class="stat">PRE:${this.state.stats.precision}</span>
                            <span class="stat" style="color:var(--accent-primary)">AFF:${this.state.stats.affinity}</span>
                        </div>

                        <div class="comp-nav">
                            <button class="btn-tab active" onclick="companion.renderPanel('chat')">Dialogue</button>
                            <button class="btn-tab" onclick="companion.renderPanel('skills')">Skills</button>
                            <button class="btn-tab" onclick="companion.renderPanel('expedition')">Expedition</button>
                        </div>
                    </div>

                    <div id="companion-panel-content" class="companion-main-panel">
                        <!-- Content injected here -->
                    </div>
                </div>
            </div>
        `);

        this.renderPanel('chat');
    },

    renderPanel(panel) {
        const container = document.getElementById('companion-panel-content');
        if (!container) return;

        // Update tabs
        document.querySelectorAll('.btn-tab').forEach(btn => {
            btn.classList.toggle('active', btn.innerText.toLowerCase() === panel);
        });

        if (panel === 'chat') {
            this.renderChat(container);
        } else if (panel === 'skills') {
            this.renderSkills(container);
        } else if (panel === 'expedition') {
            this.renderExpedition(container);
        }
    },

    renderSkills(container) {
        container.innerHTML = `
            <div class="skills-panel">
                <h3>Active Skills</h3>
                <p>Use your companion's unique abilities to accelerate research.</p>
                <div class="skill-grid">
                    <div class="card skill-card" onclick="companion.useSkill('scan')">
                        <div class="skill-icon">🔍</div>
                        <div class="skill-info">
                            <strong>Deep Scan</strong>
                            <span>Analyze current context and find best tools.</span>
                        </div>
                    </div>
                    <div class="card skill-card" onclick="companion.useSkill('brain')">
                        <div class="skill-icon">🧠</div>
                        <div class="skill-info">
                            <strong>Brain Scan (Local RAG)</strong>
                            <span>Summarize your linked local knowledge base.</span>
                        </div>
                    </div>
                    <div class="card skill-card" onclick="companion.useSkill('ima')">
                        <div class="skill-icon">☁️</div>
                        <div class="skill-info">
                            <strong>IMA Cloud Search</strong>
                            <span>Search Tencent IMA second brain for context.</span>
                        </div>
                    </div>
                    <div class="card skill-card" onclick="companion.useSkill('synth')">
                        <div class="skill-icon">🧬</div>
                        <div class="skill-info">
                            <strong>Knowledge Synth</strong>
                            <span>Synthesize protocols from your guide library.</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    useSkill(skillId) {
        if (skillId === 'scan') {
            ui.hideModal();
            ui.setTab('tools');
            ui.showNotification('Pipette performed a Deep Scan: Highlighting relevant tools.', 'success');
        } else if (skillId === 'brain') {
            this.handleBrainScan();
        } else if (skillId === 'ima') {
            this.handleImaSearch();
        } else if (skillId === 'synth') {
            ui.hideModal();
            ui.setTab('guide');
            ui.showNotification('Protocols synthesized and optimized for your project.', 'success');
        }
    },

    async handleBrainScan() {
        if (!window.linkedDirHandle) {
            ui.showNotification('Please link a folder in Memos first!', 'warning');
            return;
        }

        this.renderPanel('chat');
        this.addMessage('user', 'Please perform a Brain Scan on my local knowledge base.');
        
        const files = [];
        for await (const entry of window.linkedDirHandle.values()) {
            if (entry.kind === 'file') files.push(entry.name);
        }

        const prompt = `I have scanned your linked folder. Here are the files I found: ${files.join(', ')}. 
        Please provide a professional summary of what this knowledge base covers and how I can help you with it.`;
        
        try {
            this.isTyping = true;
            this.updateTypingState(true);
            const reply = await ai.call(prompt, "You are a senior lab assistant providing a directory audit.");
            this.addMessage('assistant', reply);
        } catch (e) {
            ui.showNotification('Brain scan failed: ' + e.message, 'error');
        } finally {
            this.isTyping = false;
            this.updateTypingState(false);
        }
    },

    async handleImaSearch() {
        this.renderPanel('chat');
        this.addMessage('user', 'Please search my Tencent IMA Cloud for recent insights.');
        
        try {
            this.isTyping = true;
            this.updateTypingState(true);

            // Fetch from IMA (empty query searches available notebooks/recent docs)
            const results = await window.ima_client.searchKnowledge('');
            
            if (results.length === 0) {
                this.addMessage('assistant', 'I could not find any accessible knowledge bases or notes in your IMA cloud. Make sure you have created some notes.');
                return;
            }

            const snippet = results.map(r => `- **${r.title}**: ${r.snippet}`).join('\n');
            const prompt = `I have queried your IMA Cloud Second Brain. Here are the top results:\n${snippet}\n\nPlease summarize these findings and ask how you can help me further.`;
            
            const reply = await ai.call(prompt, "You are a senior lab assistant integrating cloud knowledge.");
            this.addMessage('assistant', reply);
            
        } catch (e) {
            ui.showNotification('IMA Search failed: ' + e.message, 'error');
            this.addMessage('assistant', `⚠️ IMA Connection Error: ${e.message}`);
        } finally {
            this.isTyping = false;
            this.updateTypingState(false);
        }
    },

    renderChat(container) {
        container.innerHTML = `
            <div class="chat-container">
                <div id="chat-messages" class="chat-messages">
                    ${this.chatHistory.map(m => `
                        <div class="message ${m.role}">
                            <div class="msg-bubble">${m.content}</div>
                        </div>
                    `).join('')}
                </div>
                <div class="chat-input-area">
                    <input type="text" id="comp-chat-input" placeholder="Ask your research assistant...">
                    <button id="btn-send-comp-chat" class="btn-primary">Send</button>
                </div>
            </div>
        `;

        const input = document.getElementById('comp-chat-input');
        const btn = document.getElementById('btn-send-comp-chat');

        btn.onclick = () => this.handleSendMessage();
        input.onkeypress = (e) => { if (e.key === 'Enter') this.handleSendMessage(); };

        container.querySelector('#chat-messages').scrollTop = 99999;
    },

    async getAppSnapshot() {
        // Capture context based on current tab
        const currentTab = window.app?.currentTab || 'unknown';
        let context = `Current Workspace: ${currentTab}\n`;

        if (currentTab === 'memos') {
            const title = document.getElementById('memo-title')?.value;
            const content = document.getElementById('memo-content')?.value;
            context += `User is writing a memo titled "${title}". Content snippet: ${content?.substring(0, 200)}...\n`;
        } else if (currentTab === 'projects') {
            const list = await store.getAll('projects');
            context += `User has ${list.length} active projects.\n`;
        }

        return context;
    },

    async scanLocalKnowledge(query) {
        if (!window.linkedDirHandle) return "";
        
        let context = "\n[Reference from Local Knowledge Base]:\n";
        let foundAny = false;

        try {
            for await (const entry of window.linkedDirHandle.values()) {
                if (entry.kind === 'file' && (entry.name.endsWith('.md') || entry.name.endsWith('.txt'))) {
                    // Simple keyword match on filename
                    const keywords = query.toLowerCase().split(' ');
                    const matchesName = keywords.some(k => entry.name.toLowerCase().includes(k));
                    
                    if (matchesName) {
                        const file = await entry.getFile();
                        const text = await file.text();
                        context += `--- File: ${entry.name} ---\n${text.substring(0, 500)}\n`;
                        foundAny = true;
                    }
                }
            }
        } catch (e) {
            console.warn('Knowledge scan failed:', e);
        }

        return foundAny ? context : "";
    },

    async handleSendMessage() {
        if (this.isTyping) return;
        const input = document.getElementById('comp-chat-input');
        const content = input.value.trim();
        if (!content) return;

        input.value = '';
        this.addMessage('user', content);
 
        try {
            this.isTyping = true;
            this.updateTypingState(true);
            
            // 1. Get Trait from Settings
            const traitSettings = await store.get('settings', 'companion');
            const personality = traitSettings?.trait || 'professional';
            const customInstruction = traitSettings?.custom || '';

            // 2. Get App State Snapshot & Local Knowledge
            const snapshot = await this.getAppSnapshot();
            const localKnowledge = await this.scanLocalKnowledge(content);

            // 3. Construct Deep System Prompt
            const system = `You are Pipette, a high-fidelity biological research companion.
Persona: ${personality} trait. ${customInstruction}
App State Aware: ${snapshot}
${localKnowledge}
Stats: Level ${this.state.level}, Focus ${this.state.stats.focus}, Precision ${this.state.stats.precision}.

Guidelines:
- If the user is in "memos", offer to refine their notes or suggest related bio-tags.
- If the user is in "planner", offer to critique their research logic.
- Use your persona trait to shape your tone.
- Be concise but scientifically rigorous.`;

            const reply = await ai.call(content, system);
            this.addMessage('assistant', reply);
            await this.addExp(5); 
        } catch (err) {
            ui.showNotification(err.message, 'error');
        } finally {
            this.isTyping = false;
            this.updateTypingState(false);
        }
    },

    addMessage(role, content) {
        const msg = { role, content, timestamp: Date.now() };
        this.chatHistory.push(msg);
        store.set('chat', msg);
        
        const container = document.getElementById('chat-messages');
        if (container) {
            const div = document.createElement('div');
            div.className = `message ${role}`;
            
            let actionHtml = '';
            if (role === 'assistant') {
                actionHtml = `
                    <div class="msg-actions">
                        <button class="btn-mini" onclick="companion.adoptSuggestion('${btoa(unescape(encodeURIComponent(content)))}')">✨ 采纳并应用</button>
                    </div>
                `;
            }

            div.innerHTML = `
                <div class="msg-bubble">${content}</div>
                ${actionHtml}
            `;
            container.appendChild(div);
            container.scrollTop = 99999;
        }
    },

    async adoptSuggestion(encodedContent) {
        const content = decodeURIComponent(escape(atob(encodedContent)));
        const currentTab = window.app?.currentTab;

        if (currentTab === 'memos') {
            const editor = document.getElementById('memo-content');
            if (editor) {
                editor.value += `\n\n> AI Suggestion:\n${content}\n`;
                // Trigger auto-save
                if (window.memos) window.memos.autoSave();
                ui.showNotification('Suggestion applied to your memo!', 'success');
            }
        } else {
            // Default to clipboard
            navigator.clipboard.writeText(content);
            ui.showNotification('Content copied to clipboard (Workspace not active)', 'info');
        }

        // Increase Affinity
        this.state.stats.affinity += 5;
        await this.saveState();
        ui.showNotification(`Affinity increased! Current: ${this.state.stats.affinity}`, 'success');
    },

    updateTypingState(typing) {
        const container = document.getElementById('chat-messages');
        if (!container) return;
        if (typing) {
            const div = document.createElement('div');
            div.id = 'typing-indicator';
            div.className = 'message assistant typing';
            div.innerHTML = '<div class="msg-bubble">...</div>';
            container.appendChild(div);
        } else {
            const div = document.getElementById('typing-indicator');
            if (div) div.remove();
        }
    },

    renderExpedition(container) {
        container.innerHTML = `
            <div class="expedition-panel">
                <h3>Research Expeditions</h3>
                <p>Send your assistant to gather biological insights and experience.</p>
                <div class="expedition-options">
                    <div class="card exp-card">
                        <h4>Literature Mining</h4>
                        <p>Focus: Low | Time: 1 min</p>
                        <button class="btn-primary" onclick="companion.startExpedition('lit', 60, 20)">Start</button>
                    </div>
                    <div class="card exp-card">
                        <h4>Data Synthesis</h4>
                        <p>Focus: High | Time: 5 min</p>
                        <button class="btn-primary" onclick="companion.startExpedition('synth', 300, 100)">Start</button>
                    </div>
                </div>
                <div id="active-expedition" class="active-expedition-status"></div>
            </div>
        `;
    },

    async startExpedition(type, duration, reward) {
        ui.showNotification('Expedition started!', 'success');
        this.renderExpeditionStatus(duration, reward);
    },

    renderExpeditionStatus(seconds, reward) {
        const container = document.getElementById('active-expedition');
        if (!container) return;

        let remaining = seconds;
        const interval = setInterval(async () => {
            remaining--;
            if (remaining <= 0) {
                clearInterval(interval);
                container.innerHTML = `<div class="success-msg">Expedition Complete! +${reward} EXP</div>`;
                await this.addExp(reward);
            } else {
                container.innerHTML = `
                    <div class="progress-status">
                        <span>Researching... ${remaining}s left</span>
                        <div class="exp-bar-mini"><div class="fill" style="width: ${(1 - remaining/seconds)*100}%"></div></div>
                    </div>
                `;
            }
        }, 1000);
    }
};

window.companion = companion; // Expose for onclicks
