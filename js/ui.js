

window. ui = {
    lang: 'zh',

    init(lang = 'zh') {
        this.lang = lang;
        this.applyTranslations();
        this.initCursor();
    },

    applyTranslations() {
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (TRANSLATIONS[this.lang][key]) {
                el.innerText = TRANSLATIONS[this.lang][key];
            }
        });

        document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
            const key = el.getAttribute('data-i18n-placeholder');
            if (TRANSLATIONS[this.lang][key]) {
                el.placeholder = TRANSLATIONS[this.lang][key];
            }
        });
    },

    setTab(tabId) {
        // Handle Sidebar active state
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.toggle('active', item.getAttribute('data-tab') === tabId);
        });

        // Handle Workspace visibility
        document.querySelectorAll('.workspace').forEach(ws => {
            ws.classList.toggle('active', ws.id === `${tabId}-workspace`);
        });
    },

    renderList(containerId, items, templateFn) {
        const container = document.getElementById(containerId);
        if (!container) return;
        container.innerHTML = items.map(templateFn).join('');
    },

    showModal(contentHtml) {
        const overlay = document.getElementById('modal-overlay');
        const content = document.getElementById('modal-content');
        content.innerHTML = contentHtml;
        overlay.classList.add('active');
        this.applyTranslations();
    },

    hideModal() {
        document.getElementById('modal-overlay').classList.remove('active');
    },

    formatDate(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleDateString(this.lang === 'zh' ? 'zh-CN' : 'en-US', {
            year: 'numeric', month: 'short', day: 'numeric'
        });
    },

    updateGlassMetrics(blurPx, opacity) {
        document.documentElement.style.setProperty('--glass-blur', `${blurPx}px`);
        document.documentElement.style.setProperty('--glass-opacity', opacity);
    },

    initCursor() {
        const cursor = document.createElement('div');
        cursor.className = 'custom-cursor';
        const follower = document.createElement('div');
        follower.className = 'cursor-follower';
        
        document.body.appendChild(cursor);
        document.body.appendChild(follower);

        let mouseX = window.innerWidth / 2;
        let mouseY = window.innerHeight / 2;
        let followerX = mouseX;
        let followerY = mouseY;

        document.addEventListener('mousemove', (e) => {
            mouseX = e.clientX;
            mouseY = e.clientY;
            cursor.style.left = mouseX + 'px';
            cursor.style.top = mouseY + 'px';
        });

        const loop = () => {
            // Inertia lerping
            followerX += (mouseX - followerX) * 0.15;
            followerY += (mouseY - followerY) * 0.15;
            follower.style.left = followerX + 'px';
            follower.style.top = followerY + 'px';
            requestAnimationFrame(loop);
        };
        loop();

        // Hover effects
        document.addEventListener('mouseover', (e) => {
            const target = e.target.closest('button, .card, .nav-item, input, textarea, select, .theme-dot, .btn-close, .pet-trigger');
            if (target) document.body.classList.add('cursor-hover');
        });
        
        document.addEventListener('mouseout', (e) => {
            const target = e.target.closest('button, .card, .nav-item, input, textarea, select, .theme-dot, .btn-close, .pet-trigger');
            if (target) document.body.classList.remove('cursor-hover');
        });

        // Dynamic Card Expansion
        document.addEventListener('click', (e) => {
            const card = e.target.closest('.card');
            if (card) {
                // Remove expansion from others
                document.querySelectorAll('.card.expanded').forEach(c => {
                    if (c !== card) c.classList.remove('expanded');
                });
                card.classList.toggle('expanded');
            } else {
                // Click outside closes all
                document.querySelectorAll('.card.expanded').forEach(c => c.classList.remove('expanded'));
            }
        });
    },



    setTheme(themeId) {
        document.body.setAttribute('data-theme', themeId);
        localStorage.setItem('bio-hub-theme', themeId);
        
        // Dynamic RGB mapping for glassmorphism
        const rgbMap = {
            'day': '248, 250, 252',
            'sunset': '45, 20, 20',
            'midnight': '10, 10, 20'
        };
        
        if (rgbMap[themeId]) {
            document.documentElement.style.setProperty('--bg-rgb', rgbMap[themeId]);
        }
        
        // Update theme selector UI if exists
        document.querySelectorAll('.theme-dot').forEach(dot => {
            dot.classList.toggle('active', dot.getAttribute('data-theme') === themeId);
        });
    },

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerText = message;
        document.body.appendChild(notification);
        
        setTimeout(() => notification.classList.add('active'), 100);
        setTimeout(() => {
            notification.classList.remove('active');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
};
