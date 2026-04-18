import { initAudioEditor } from './modules/audioEditor.js';
import { initVideoCompressor } from './modules/videoCompressor.js';
import { initUrlShortener } from './modules/urlShortener.js';
import { initQrGenerator } from './modules/qrGenerator.js';
import { initPdfEditor } from './modules/pdfEditor.js';
import { initImageEditor } from './modules/imageEditor.js';
import { initCodeTools } from './modules/codeTools.js';
import { applyTranslations, toggleLang, currentLang } from './i18n.js';

/**
 * Main Application Orchestrator
 */
class App {
    constructor() {
        this.mainContent = document.getElementById('main-content');
        this.dashboardZone = document.getElementById('dashboard-zone');
        this.navbar = document.querySelector('.navbar');
        this.heroHeader = document.getElementById('hero-header');

        this.loadedPanels = new Set();
        this.isProcessing = false;

        this.panelMap = {
            'audio-editor-panel': { file: 'audio-editor.html', css: 'audio-editor.css', init: initAudioEditor, dependencies: ['editor-template.html'] },
            'url-shortener-panel': { file: 'url-shortener.html', css: 'url-shortener.css', init: initUrlShortener },
            'qr-generator-panel': { file: 'qr-generator.html', css: 'qr-generator.css', init: initQrGenerator },
            'pdf-editor-panel': { file: 'pdf-editor.html', css: 'pdf-editor.css', init: initPdfEditor },
            'video-compressor-panel': { file: 'video-compressor.html', css: 'video-compressor.css', init: initVideoCompressor },
            'image-editor-panel': { file: 'image-editor.html', css: 'image-editor.css', init: initImageEditor },
            'code-center-panel': { file: 'code-tools.html', css: 'code-tools.css', init: initCodeTools },
            'resources-panel': { file: 'resources.html', css: 'resources.css', init: null },
            'updates-panel': { file: 'updates.html', css: 'updates.css', init: null }
        };

        this.initNavigation();
        this.handleRouting();
        window.addEventListener('hashchange', () => this.handleRouting());
    }

    /**
     * Navigation & Routing handles
     */
    initNavigation() {
        window.app = this;
        window.openPanel = (panelId) => this.openPanel(panelId);
        window.openDashboard = () => this.openDashboard();
        window.toggleLang = toggleLang;


        document.querySelectorAll('.nav-links a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', (e) => {
                e.preventDefault();
                const targetId = anchor.getAttribute('href').slice(1);
                window.location.hash = targetId;
            });
        });
    }

    handleRouting() {
        const hash = window.location.hash.slice(1);

        if (this.panelMap[hash]) {
            this.openPanel(hash, false);
        } else if (['media', 'files', 'dev'].includes(hash)) {
            if (!this.dashboardZone.classList.contains('active')) {
                this.openDashboard(false, false);
                setTimeout(() => this.scrollToSection(hash), 10);
            } else {
                this.scrollToSection(hash);
            }
        } else {
            this.openDashboard(false);
        }
    }

    scrollToSection(id) {
        const element = document.getElementById(id);
        if (element) {
            element.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });


            element.style.borderColor = 'var(--primary)';
            element.style.boxShadow = 'var(--shadow-xl), 0 0 0 4px rgba(79, 70, 229, 0.1)';
            setTimeout(() => {
                element.style.borderColor = 'var(--border-light)';
                element.style.boxShadow = 'var(--shadow-sm)';
            }, 1500);
        }
    }

    async openPanel(panelId, updateHash = true) {
        if (this.isProcessing) return;

        if (updateHash) {
            window.location.hash = panelId;
            return; // hashchange will trigger handleRouting -> openPanel(..., false)
        }


        if (!this.loadedPanels.has(panelId)) {
            this.isProcessing = true;
            await this.ensurePanelLoaded(panelId);
            this.isProcessing = false;
        }


        this.dashboardZone.classList.remove('active');
        if (this.heroHeader) this.heroHeader.style.display = 'none';

        document.querySelectorAll('.tool-panel').forEach(p => p.classList.remove('active'));

        const panel = document.getElementById(panelId);
        if (panel) {
            panel.classList.add('active');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }

    /**
     * Lazy Load Panel Management
     */
    async ensurePanelLoaded(panelId) {
        if (this.loadedPanels.has(panelId)) return;

        const config = this.panelMap[panelId];
        if (!config) return;

        try {
            if (config.css) this.loadCSS(config.css);

            if (config.dependencies) {
                for (const dep of config.dependencies) {
                    await this.fetchAndAppend(dep);
                }
            }


            await this.fetchAndAppend(config.file);

            if (typeof config.init === 'function') {
                config.init();
            }

            applyTranslations();
            this.loadedPanels.add(panelId);
        } catch (error) {
            console.error(`Panel yükleme hatası (${panelId}):`, error);
        }
    }

    loadCSS(filename) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = `css/modules/${filename}`;
        document.head.appendChild(link);
    }

    async fetchAndAppend(filename) {
        const response = await fetch(`parts/${filename}`);
        if (!response.ok) throw new Error(`Dosya bulunamadı: ${filename}`);
        const html = await response.text();

        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;

        while (tempDiv.firstChild) {
            this.mainContent.appendChild(tempDiv.firstChild);
        }
    }

    openDashboard(updateHash = true, forceScroll = true) {
        if (updateHash) {
            window.location.hash = '';
            return;
        }

        document.querySelectorAll('.tool-panel').forEach(panel => {
            panel.classList.remove('active');
        });

        if (this.navbar) this.navbar.style.display = 'flex';
        if (this.heroHeader) this.heroHeader.style.display = 'block';

        this.dashboardZone.classList.add('active');

        if (forceScroll) {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }
}

/**
 * UI Component Initializers
 */
function initNavDropdown() {
    const wrap = document.querySelector('.nav-dropdown-wrap');
    const dropdown = document.querySelector('.nav-dropdown');
    const navContent = document.querySelector('.nav-content');
    if (!wrap || !dropdown || !navContent) return;

    let timer = null;

    function updateLeft() {
        const wrapRect = wrap.getBoundingClientRect();
        const navRect = navContent.getBoundingClientRect();
        dropdown.style.left = (wrapRect.left - navRect.left - 1.75 * 16 - 1 * 16) + 'px';
    }

    function show() {
        clearTimeout(timer);
        updateLeft();
        wrap.classList.add('open');
    }

    function hide() {
        timer = setTimeout(() => wrap.classList.remove('open'), 150);
    }

    wrap.addEventListener('mouseenter', show);
    wrap.addEventListener('mouseleave', hide);
    dropdown.addEventListener('mouseenter', () => clearTimeout(timer));
    dropdown.addEventListener('mouseleave', hide);
    window.addEventListener('resize', updateLeft, { passive: true });
}

function initTypewriter() {
    const el = document.getElementById('typewriter-text');
    if (!el) return;

    const phrases = ['Save Time.', 'Scale.', 'Impress.', 'Simplify.', 'Create.'];
    let phraseIndex = 0;
    let charIndex = 0;
    let deleting = false;
    const typeSpeed = 80;
    const deleteSpeed = 50;
    const pauseAfterType = 2000;
    const pauseAfterDelete = 400;

    function tick() {
        const current = phrases[phraseIndex];

        if (!deleting) {
            charIndex++;
            el.textContent = current.slice(0, charIndex);
            if (charIndex === current.length) {
                deleting = true;
                setTimeout(tick, pauseAfterType);
                return;
            }
        } else {
            charIndex--;
            el.textContent = current.slice(0, charIndex);
            if (charIndex === 0) {
                deleting = false;
                phraseIndex = (phraseIndex + 1) % phrases.length;
                setTimeout(tick, pauseAfterDelete);
                return;
            }
        }

        setTimeout(tick, deleting ? deleteSpeed : typeSpeed);
    }

    tick();
}

/**
 * Theme & Localization
 */
function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    const icon = document.getElementById('theme-icon');
    if (icon) {
        icon.className = theme === 'dark' ? 'ph-fill ph-sun' : 'ph-fill ph-moon';
    }
}

function initTheme() {
    const saved = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    applyTheme(saved || (prefersDark ? 'dark' : 'light'));
}

function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    applyTheme(current === 'dark' ? 'light' : 'dark');
}

/**
 * Initialization lifecycle
 */
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    window.toggleTheme = toggleTheme;
    new App();
    initTypewriter();
    initNavDropdown();
    applyTranslations();
    document.documentElement.lang = currentLang;
});
