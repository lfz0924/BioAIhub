window.styleDistiller = {
    currentProfile: null,
    extractedText: '',

    async init() {
        this.setupEventListeners();
        await this.loadProfiles();
    },

    refresh() {
        this.loadProfiles();
    },

    setupEventListeners() {
        // Upload button
        const btnUpload = document.getElementById('btn-upload-paper');
        const btnBrowse = document.getElementById('btn-browse-pdf');
        const fileInput = document.getElementById('pdf-file-input');

        if (btnUpload) {
            btnUpload.addEventListener('click', () => fileInput?.click());
        }
        if (btnBrowse) {
            btnBrowse.addEventListener('click', () => fileInput?.click());
        }
        if (fileInput) {
            fileInput.addEventListener('change', (e) => {
                if (e.target.files[0]) this.handlePDFUpload(e.target.files[0]);
            });
        }

        // Tab switcher
        const btnAnalysis = document.getElementById('btn-tab-analysis');
        const btnGenerate = document.getElementById('btn-tab-generate');
        if (btnAnalysis) {
            btnAnalysis.addEventListener('click', () => this.switchPanel('analysis'));
        }
        if (btnGenerate) {
            btnGenerate.addEventListener('click', () => this.switchPanel('generate'));
        }

        // Generate button
        const btnGenerateText = document.getElementById('btn-generate-style-text');
        if (btnGenerateText) {
            btnGenerateText.addEventListener('click', () => this.generateText());
        }
    },

    switchPanel(panel) {
        const analysisPanel = document.getElementById('style-analysis-panel');
        const generatePanel = document.getElementById('style-generate-panel');
        const btnAnalysis = document.getElementById('btn-tab-analysis');
        const btnGenerate = document.getElementById('btn-tab-generate');

        if (panel === 'analysis') {
            analysisPanel.style.display = '';
            generatePanel.style.display = 'none';
            btnAnalysis.classList.add('active');
            btnGenerate.classList.remove('active');
        } else {
            analysisPanel.style.display = 'none';
            generatePanel.style.display = '';
            btnAnalysis.classList.remove('active');
            btnGenerate.classList.add('active');
        }
    },

    async handlePDFUpload(file) {
        const progressEl = document.getElementById('style-progress');
        const progressText = document.getElementById('style-progress-text');
        const uploadArea = document.getElementById('style-upload-area');
        const resultEl = document.getElementById('style-result');

        try {
            // Show progress
            if (progressEl) progressEl.style.display = '';
            if (uploadArea) uploadArea.style.display = 'none';
            if (progressText) progressText.textContent = '正在提取 PDF 文本...';

            const text = await this.extractTextFromPDF(file);
            if (!text || text.trim().length < 100) {
                throw new Error('PDF 文本提取失败或内容过少，请尝试其他文件。');
            }

            this.extractedText = text;

            // Show text preview
            if (progressText) progressText.textContent = '文本提取完成，正在分析写作风格...';

            // Analyze
            const profile = await this.analyzeStyle(text, file.name);

            // Render result
            if (progressEl) progressEl.style.display = 'none';
            this.currentProfile = profile;
            this.renderProfile(profile, resultEl);

        } catch (err) {
            if (progressEl) progressEl.style.display = 'none';
            if (uploadArea) uploadArea.style.display = '';
            if (resultEl) {
                resultEl.innerHTML = `<div class="card" style="border-color: #ff4444; padding: 20px;">
                    <p style="color: #ff4444;">Error: ${err.message}</p>
                    <button class="btn-action" onclick="document.getElementById('style-upload-area').style.display=''; document.getElementById('style-result').innerHTML='';">Retry</button>
                </div>`;
            }
            console.error('Style distillation error:', err);
        }
    },

    async extractTextFromPDF(file) {
        if (typeof pdfjsLib === 'undefined') {
            throw new Error('PDF.js not loaded');
        }
        pdfjsLib.GlobalWorkerOptions.workerSrc =
            'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let fullText = '';
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map(item => item.str).join(' ');
            fullText += pageText + '\n\n';
        }
        return fullText.trim();
    },

    async analyzeStyle(text, fileName) {
        const systemInstruction = `You are an expert linguistic analyst specializing in academic writing style.
Your task is to analyze the writing style of the provided academic paper text and produce a structured JSON profile across 5 dimensions.
Respond ONLY with valid JSON, no markdown fencing, no commentary. Use Chinese for all summary fields.`;

        // Truncate text if too long (keep first ~30000 chars)
        const truncatedText = text.length > 30000 ? text.substring(0, 30000) + '...' : text;

        const prompt = `Analyze the writing style of the following academic paper text. Extract style characteristics across these 5 dimensions:

1. sentenceFingerprint: avgSentenceLength (short/medium/long with estimate), questionRatio (low/medium/high), analogyDensity (low/medium/high), firstPersonUsage (none/rare/moderate/frequent), certaintyTone (hedged/balanced/assertive), transitionFrequency (low/medium/high), summary (2-3 sentence overall assessment in Chinese)

2. structuralParadigm: sectionOrder (typical sections found), paragraphStructure (short/medium/long paragraphs typical), argumentFlow (deductive/inductive/mixed), summary (2-3 sentence assessment in Chinese)

3. vocabularyDNA: domainJargon (list top 10 domain-specific terms used), preferredTransitions (list top 5 transition phrases used), register (formal/semi-formal/informal), passiveActiveRatio (mostly passive/balanced/mostly active), summary (2-3 sentence assessment in Chinese)

4. argumentationLogic: citationDensity (low/medium/high with estimate), evidencePresentation (data-first/claim-first/mixed), counterArgumentHandling (none/minimal/thorough), hedgingPatterns (list examples of hedging language used), summary (2-3 sentence assessment in Chinese)

5. rhetoricalFeatures: metaphorUsage (none/rare/moderate/frequent with examples), dataVisualizationReferences (none/minimal/moderate/frequent), tone (analytical/persuasive/narrative/mixed), summary (2-3 sentence assessment in Chinese)

Also provide:
- overallSummary: A 150-word summary in Chinese of this author's writing style that could serve as a style guide for imitating their voice.
- profileName: A short name for this style profile based on the paper title or topic.

Paper text:
---
${truncatedText}
---`;

        const rawResponse = await ai.call(prompt, systemInstruction, { maxOutputTokens: 4096 });

        // Parse JSON response
        let dimensions;
        try {
            dimensions = JSON.parse(rawResponse);
        } catch (e) {
            // Try to extract JSON from response
            const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                dimensions = JSON.parse(jsonMatch[0]);
            } else {
                throw new Error('AI 返回格式错误，请重试。');
            }
        }

        return {
            id: 'style_' + Date.now(),
            name: dimensions.profileName || fileName.replace('.pdf', ''),
            sourceFileName: fileName,
            createdAt: Date.now(),
            dimensions: {
                sentenceFingerprint: dimensions.sentenceFingerprint || {},
                structuralParadigm: dimensions.structuralParadigm || {},
                vocabularyDNA: dimensions.vocabularyDNA || {},
                argumentationLogic: dimensions.argumentationLogic || {},
                rhetoricalFeatures: dimensions.rhetoricalFeatures || {}
            },
            overallSummary: dimensions.overallSummary || '',
            rawAnalysis: rawResponse
        };
    },

    renderProfile(profile, container) {
        if (!container) return;

        const dims = profile.dimensions;
        const dimNames = [
            { key: 'sentenceFingerprint', label: '句式指纹', icon: '📝' },
            { key: 'structuralParadigm', label: '结构范式', icon: '🏗️' },
            { key: 'vocabularyDNA', label: '用词 DNA', icon: '🧬' },
            { key: 'argumentationLogic', label: '论证逻辑', icon: '🔍' },
            { key: 'rhetoricalFeatures', label: '修辞特征', icon: '✨' }
        ];

        container.innerHTML = `
            <div class="style-overall-summary">
                <h3>${profile.name}</h3>
                <p>${profile.overallSummary}</p>
                <small style="opacity: 0.6;">Source: ${profile.sourceFileName}</small>
            </div>

            ${dimNames.map(d => {
                const dimData = dims[d.key] || {};
                const metrics = Object.entries(dimData)
                    .filter(([k]) => k !== 'summary')
                    .map(([k, v]) => {
                        const displayVal = Array.isArray(v) ? v.join(', ') : v;
                        return `<div class="dim-metric"><label>${k}</label><span>${displayVal}</span></div>`;
                    }).join('');

                return `<div class="dimension-card">
                    <h4>${d.icon} ${d.label}</h4>
                    <div class="dim-metrics">${metrics}</div>
                    ${dimData.summary ? `<div class="dim-summary">${dimData.summary}</div>` : ''}
                </div>`;
            }).join('')}

            <div class="style-actions">
                <button class="btn-primary" onclick="window.styleDistiller.saveProfile(window.styleDistiller.currentProfile)">
                    💾 保存风格配置
                </button>
                <button class="btn-text" onclick="window.styleDistiller.exportProfile(window.styleDistiller.currentProfile)">
                    📄 导出 Markdown
                </button>
            </div>
        `;
    },

    async saveProfile(profile) {
        if (!profile) return;
        try {
            await store.set('writing_styles', profile);
            ui.showNotification('风格配置已保存！', 'success');
            await this.loadProfiles();
        } catch (e) {
            ui.showNotification('保存失败: ' + e.message, 'error');
        }
    },

    async loadProfiles() {
        const profiles = await store.getAll('writing_styles');
        const listEl = document.getElementById('style-profiles-list');
        const selectEl = document.getElementById('style-profile-select');

        if (listEl) {
            if (profiles.length === 0) {
                listEl.innerHTML = '<p style="color: var(--text-muted, #888); font-size: 0.85rem; text-align: center; padding: 20px 0;">No saved profiles yet.</p>';
            } else {
                listEl.innerHTML = profiles.sort((a, b) => b.createdAt - a.createdAt).map(p => `
                    <div class="cv-job-item" onclick="window.styleDistiller.selectProfile('${p.id}')">
                        <div style="font-weight: 600; font-size: 0.9rem;">${p.name}</div>
                        <div style="font-size: 0.75rem; opacity: 0.6; margin-top: 4px;">
                            ${new Date(p.createdAt).toLocaleDateString()}
                            <span style="float: right; cursor: pointer; color: #ff4444;"
                                onclick="event.stopPropagation(); window.styleDistiller.deleteProfile('${p.id}')">✕</span>
                        </div>
                    </div>
                `).join('');
            }
        }

        if (selectEl) {
            const currentVal = selectEl.value;
            selectEl.innerHTML = '<option value="">-- 选择风格配置 --</option>' +
                profiles.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
            if (currentVal) selectEl.value = currentVal;
        }
    },

    async selectProfile(id) {
        const profile = await store.get('writing_styles', id);
        if (!profile) return;
        this.currentProfile = profile;
        const resultEl = document.getElementById('style-result');
        this.renderProfile(profile, resultEl);
        this.switchPanel('analysis');
        const uploadArea = document.getElementById('style-upload-area');
        if (uploadArea) uploadArea.style.display = 'none';
    },

    async deleteProfile(id) {
        try {
            await store.delete('writing_styles', id);
            ui.showNotification('已删除', 'info');
            await this.loadProfiles();
            if (this.currentProfile?.id === id) {
                this.currentProfile = null;
                const resultEl = document.getElementById('style-result');
                const uploadArea = document.getElementById('style-upload-area');
                if (resultEl) resultEl.innerHTML = '';
                if (uploadArea) uploadArea.style.display = '';
            }
        } catch (e) {
            ui.showNotification('删除失败: ' + e.message, 'error');
        }
    },

    async generateText() {
        const profileId = document.getElementById('style-profile-select')?.value;
        const sectionType = document.getElementById('style-section-type')?.value || 'custom';
        const userPrompt = document.getElementById('style-gen-prompt')?.value;
        const outputEl = document.getElementById('style-gen-output');

        if (!profileId) {
            ui.showNotification('请先选择一个风格配置', 'error');
            return;
        }
        if (!userPrompt) {
            ui.showNotification('请输入写作要求', 'error');
            return;
        }

        const profile = await store.get('writing_styles', profileId);
        if (!profile) {
            ui.showNotification('风格配置未找到', 'error');
            return;
        }

        const sectionLabels = {
            abstract: 'Abstract (摘要)',
            introduction: 'Introduction (引言)',
            methods: 'Methods (方法)',
            results: 'Results (结果)',
            discussion: 'Discussion (讨论)',
            custom: 'Custom'
        };

        if (outputEl) outputEl.innerHTML = '<p style="opacity: 0.6;">✦ 正在按风格生成文本...</p>';

        try {
            const d = profile.dimensions;
            const systemInstruction = `You are an academic writing assistant. You must write in the exact style described below. Match the sentence structure, vocabulary choices, argumentation patterns, and rhetorical characteristics precisely. Write in the same language as the user's prompt unless told otherwise.

STYLE PROFILE:
- Sentence patterns: ${d.sentenceFingerprint?.summary || 'N/A'}. Avg length: ${d.sentenceFingerprint?.avgSentenceLength || 'N/A'}. First person: ${d.sentenceFingerprint?.firstPersonUsage || 'N/A'}. Certainty: ${d.sentenceFingerprint?.certaintyTone || 'N/A'}.
- Structure: ${d.structuralParadigm?.summary || 'N/A'}. Argument flow: ${d.structuralParadigm?.argumentFlow || 'N/A'}.
- Vocabulary: Register is ${d.vocabularyDNA?.register || 'N/A'}. Passive/active: ${d.vocabularyDNA?.passiveActiveRatio || 'N/A'}. Key terms: ${Array.isArray(d.vocabularyDNA?.domainJargon) ? d.vocabularyDNA.domainJargon.join(', ') : 'N/A'}. Preferred transitions: ${Array.isArray(d.vocabularyDNA?.preferredTransitions) ? d.vocabularyDNA.preferredTransitions.join(', ') : 'N/A'}.
- Argumentation: ${d.argumentationLogic?.summary || 'N/A'}. Citation style: ${d.argumentationLogic?.citationDensity || 'N/A'}. Evidence approach: ${d.argumentationLogic?.evidencePresentation || 'N/A'}.
- Rhetoric: ${d.rhetoricalFeatures?.summary || 'N/A'}. Tone: ${d.rhetoricalFeatures?.tone || 'N/A'}. Metaphor: ${d.rhetoricalFeatures?.metaphorUsage || 'N/A'}.`;

            const prompt = `Section type: ${sectionLabels[sectionType] || sectionType}\n\n${userPrompt}`;

            const result = await ai.call(prompt, systemInstruction, { maxOutputTokens: 4096 });

            if (outputEl) {
                outputEl.innerHTML = `
                    <div style="line-height: 1.8; white-space: pre-wrap;">${result}</div>
                    <div class="msg-actions">
                        <button class="btn-text" onclick="navigator.clipboard.writeText(this.closest('.gen-output').querySelector('div:first-child').textContent); ui.showNotification('Copied!', 'success');">📋 Copy</button>
                        <button class="btn-text" onclick="
                            const text = this.closest('.gen-output').querySelector('div:first-child').textContent;
                            const blob = new Blob([text], {type: 'text/plain'});
                            const a = document.createElement('a');
                            a.href = URL.createObjectURL(blob);
                            a.download = 'styled_text_${Date.now()}.txt';
                            a.click();
                        ">💾 Save as File</button>
                    </div>
                `;
            }
        } catch (err) {
            if (outputEl) outputEl.innerHTML = `<p style="color: #ff4444;">Error: ${err.message}</p>`;
        }
    },

    exportProfile(profile) {
        if (!profile) return;
        const d = profile.dimensions;
        const md = `# ${profile.name} — Writing Style Profile
Source: ${profile.sourceFileName}
Date: ${new Date(profile.createdAt).toLocaleString()}

## Overall Summary
${profile.overallSummary}

## 1. Sentence Fingerprint
${d.sentenceFingerprint?.summary || ''}
- Avg sentence length: ${d.sentenceFingerprint?.avgSentenceLength || 'N/A'}
- Question ratio: ${d.sentenceFingerprint?.questionRatio || 'N/A'}
- First person usage: ${d.sentenceFingerprint?.firstPersonUsage || 'N/A'}
- Certainty tone: ${d.sentenceFingerprint?.certaintyTone || 'N/A'}

## 2. Structural Paradigm
${d.structuralParadigm?.summary || ''}
- Argument flow: ${d.structuralParadigm?.argumentFlow || 'N/A'}
- Paragraph structure: ${d.structuralParadigm?.paragraphStructure || 'N/A'}

## 3. Vocabulary DNA
${d.vocabularyDNA?.summary || ''}
- Register: ${d.vocabularyDNA?.register || 'N/A'}
- Passive/active ratio: ${d.vocabularyDNA?.passiveActiveRatio || 'N/A'}
- Domain jargon: ${Array.isArray(d.vocabularyDNA?.domainJargon) ? d.vocabularyDNA.domainJargon.join(', ') : 'N/A'}
- Preferred transitions: ${Array.isArray(d.vocabularyDNA?.preferredTransitions) ? d.vocabularyDNA.preferredTransitions.join(', ') : 'N/A'}

## 4. Argumentation Logic
${d.argumentationLogic?.summary || ''}
- Citation density: ${d.argumentationLogic?.citationDensity || 'N/A'}
- Evidence presentation: ${d.argumentationLogic?.evidencePresentation || 'N/A'}
- Hedging patterns: ${Array.isArray(d.argumentationLogic?.hedgingPatterns) ? d.argumentationLogic.hedgingPatterns.join(', ') : 'N/A'}

## 5. Rhetorical Features
${d.rhetoricalFeatures?.summary || ''}
- Tone: ${d.rhetoricalFeatures?.tone || 'N/A'}
- Metaphor usage: ${d.rhetoricalFeatures?.metaphorUsage || 'N/A'}
`;

        const blob = new Blob([md], { type: 'text/markdown' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `style_profile_${profile.name.replace(/\s+/g, '_')}.md`;
        a.click();
        ui.showNotification('已导出 Markdown', 'success');
    }
};
