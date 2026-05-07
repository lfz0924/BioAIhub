


window. settings = {
    async init() {
        try {
            const apiSettings = await store.get('settings', 'api');
            const baseUrlEl = document.getElementById('settings-base-url');
            const apiKeyEl = document.getElementById('settings-api-key');
            const modelEl = document.getElementById('settings-model');
            const customModelEl = document.getElementById('settings-custom-model');
            const customContainer = document.getElementById('custom-model-container');

            if (apiSettings) {
                if (baseUrlEl) baseUrlEl.value = apiSettings.baseUrl || 'https://generativelanguage.googleapis.com/v1beta/openai';
                if (apiKeyEl) apiKeyEl.value = apiSettings.apiKey || '';
                if (modelEl) modelEl.value = apiSettings.model || 'gemini-2.0-flash';
                if (apiSettings.model === 'custom' && customContainer && customModelEl) {
                    customContainer.style.display = 'block';
                    customModelEl.value = apiSettings.customModel || '';
                }
            } else {
                // Fallback to hardcoded defaults
                if (baseUrlEl) baseUrlEl.value = 'https://generativelanguage.googleapis.com/v1beta/openai';
                if (modelEl) modelEl.value = 'gemini-2.0-flash';
            }

            // Load IMA Settings
            const imaSettings = await store.get('settings', 'ima');
            const imaClientIdEl = document.getElementById('settings-ima-client-id');
            const imaApiKeyEl = document.getElementById('settings-ima-api-key');
            const imaModeEl = document.getElementById('settings-ima-mode');
            if (imaSettings) {
                if (imaClientIdEl) imaClientIdEl.value = imaSettings.clientId || '';
                if (imaApiKeyEl) imaApiKeyEl.value = imaSettings.apiKey || '';
                if (imaModeEl) {
                    imaModeEl.value = imaSettings.mode || 'direct';
                    document.getElementById('ima-proxy-hint').style.display = imaModeEl.value === 'proxy' ? 'block' : 'none';
                }
            }

            // Toggle hint visibility
            if (imaModeEl) {
                imaModeEl.addEventListener('change', (e) => {
                    document.getElementById('ima-proxy-hint').style.display = e.target.value === 'proxy' ? 'block' : 'none';
                });
            }

            const visualSettings = await store.get('settings', 'visuals');
            if (visualSettings) {
                const blurEl = document.getElementById('settings-glass-blur');
                const opacityEl = document.getElementById('settings-glass-opacity');
                const valBlur = document.getElementById('val-blur');
                const valOpacity = document.getElementById('val-opacity');

                if (blurEl && valBlur) {
                    blurEl.value = visualSettings.blur || 12;
                    valBlur.innerText = blurEl.value;
                }
                if (opacityEl && valOpacity) {
                    opacityEl.value = (visualSettings.opacity || 0.15) * 100;
                    valOpacity.innerText = (opacityEl.value / 100).toFixed(2);
                }
                
                if (window.ui && window.ui.updateGlassMetrics) {
                    window.ui.updateGlassMetrics(visualSettings.blur || 12, visualSettings.opacity || 0.15);
                }
            }

            // Load CellVoyager Settings
            const cvSettings = await store.get('settings', 'cellvoyager');
            const cvUrlEl = document.getElementById('settings-cv-url');
            if (cvSettings && cvUrlEl) {
                cvUrlEl.value = cvSettings.backendUrl || '';
            }

            // CellVoyager connection test
            const btnTestCV = document.getElementById('btn-test-cv-connection');
            if (btnTestCV) {
                btnTestCV.addEventListener('click', async () => {
                    const url = document.getElementById('settings-cv-url')?.value?.trim();
                    const statusEl = document.getElementById('cv-connection-status');
                    if (!url) {
                        if (statusEl) { statusEl.textContent = 'Please enter URL'; statusEl.style.color = '#ff4444'; }
                        return;
                    }
                    if (statusEl) { statusEl.textContent = 'Testing...'; statusEl.style.color = 'var(--text-muted)'; }
                    try {
                        const resp = await fetch(`${url}/api/health`, { signal: AbortSignal.timeout(5000) });
                        const data = await resp.json();
                        if (data.status === 'ok') {
                            if (statusEl) { statusEl.textContent = 'Connected ✓'; statusEl.style.color = '#4ade80'; }
                        } else {
                            if (statusEl) { statusEl.textContent = 'Unexpected response'; statusEl.style.color = '#ff4444'; }
                        }
                    } catch (e) {
                        if (statusEl) { statusEl.textContent = 'Connection failed'; statusEl.style.color = '#ff4444'; }
                    }
                });
            }

            const traitSettings = await store.get('settings', 'companion');
            if (traitSettings) {
                const traitEl = document.getElementById('settings-companion-trait');
                const customEl = document.getElementById('settings-companion-custom');
                if (traitEl) traitEl.value = traitSettings.trait || 'professional';
                if (customEl) customEl.value = traitSettings.custom || '';
            }
        } catch (e) {
            console.warn('Settings: Could not load saved settings:', e);
        }

        this.setupEventListeners();
    },

    setupEventListeners() {
        const modelSelect = document.getElementById('settings-model');
        if (modelSelect) {
            modelSelect.addEventListener('change', (e) => {
                const container = document.getElementById('custom-model-container');
                if (container) container.style.display = e.target.value === 'custom' ? 'block' : 'none';
            });
        }

        const blurSlider = document.getElementById('settings-glass-blur');
        const opacitySlider = document.getElementById('settings-glass-opacity');
        const valBlur = document.getElementById('val-blur');
        const valOpacity = document.getElementById('val-opacity');

        if (blurSlider && opacitySlider) {
            const updateVisuals = () => {
                const blur = blurSlider.value;
                const opacity = (opacitySlider.value / 100).toFixed(2);
                if (valBlur) valBlur.innerText = blur;
                if (valOpacity) valOpacity.innerText = opacity;
                if (window.ui && window.ui.updateGlassMetrics) {
                    window.ui.updateGlassMetrics(blur, opacity);
                }
            };
            blurSlider.addEventListener('input', updateVisuals);
            opacitySlider.addEventListener('input', updateVisuals);
        }

        const saveBtn = document.getElementById('btn-save-settings');
        if (saveBtn) {
            saveBtn.addEventListener('click', async () => {
                try {
                    const baseUrl = document.getElementById('settings-base-url')?.value || '';
                    const apiKey = document.getElementById('settings-api-key')?.value || '';
                    const model = document.getElementById('settings-model')?.value || 'gemini-2.0-flash';
                    const customModel = document.getElementById('settings-custom-model')?.value || '';

                    await store.set('settings', {
                        id: 'api',
                        baseUrl,
                        apiKey,
                        model,
                        customModel
                    });

                    // Save IMA config
                    const imaClientId = document.getElementById('settings-ima-client-id')?.value || '';
                    const imaApiKey = document.getElementById('settings-ima-api-key')?.value || '';
                    const imaMode = document.getElementById('settings-ima-mode')?.value || 'direct';
                    await store.set('settings', {
                        id: 'ima',
                        clientId: imaClientId,
                        apiKey: imaApiKey,
                        mode: imaMode
                    });

                    const blurSlider = document.getElementById('settings-glass-blur');
                    const opacitySlider = document.getElementById('settings-glass-opacity');
                    if (blurSlider && opacitySlider) {
                        await store.set('settings', {
                            id: 'visuals',
                            blur: parseInt(blurSlider.value, 10),
                            opacity: parseFloat((opacitySlider.value / 100).toFixed(2))
                        });
                    }

                    const traitEl = document.getElementById('settings-companion-trait');
                    const customEl = document.getElementById('settings-companion-custom');
                    if (traitEl && customEl) {
                        await store.set('settings', {
                            id: 'companion',
                            trait: traitEl.value,
                            custom: customEl.value
                        });
                    }

                    // Save CellVoyager config
                    const cvUrl = document.getElementById('settings-cv-url')?.value?.trim() || '';
                    await store.set('settings', {
                        id: 'cellvoyager',
                        backendUrl: cvUrl
                    });

                    ui.showNotification('Settings saved successfully', 'success');
                } catch (e) {
                    console.error('Failed to save settings:', e);
                    ui.showNotification('Failed to save settings', 'error');
                }
            });
        }
    }
};
