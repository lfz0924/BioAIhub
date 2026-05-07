

window. ai = {
    async call(prompt, systemInstruction = '') {
        const settings = await store.get('settings', 'api');
        if (!settings || !settings.apiKey) {
            throw new Error('API key not found. Please configure it in settings.');
        }

        const baseUrl = settings.baseUrl || 'https://generativelanguage.googleapis.com/v1';
        const model = settings.model === 'custom' ? settings.customModel : (settings.model || 'gemini-2.0-flash');
        
        // Construct URL for Gemini API (assuming Google's standard format)
        const url = `${baseUrl}/models/${model}:generateContent?key=${settings.apiKey}`;

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [
                    {
                        role: 'user',
                        parts: [{ text: systemInstruction ? `${systemInstruction}\n\n${prompt}` : prompt }]
                    }
                ],
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 2048
                }
            })
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error?.message || 'AI request failed');
        }

        const data = await response.json();
        return data.candidates[0].content.parts[0].text;
    }
};
