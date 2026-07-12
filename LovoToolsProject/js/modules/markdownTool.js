import { showToast, downloadBlob } from '../utils.js';

/**
 * Markdown <-> HTML Dönüştürücü
 * marked (MD->HTML) + DOMPurify (güvenli önizleme) + turndown (HTML->MD)
 */

const scriptCache = new Map();
function loadScript(src) {
    if (scriptCache.has(src)) return scriptCache.get(src);
    const p = new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = src;
        s.onload = resolve;
        s.onerror = () => { scriptCache.delete(src); reject(new Error('Yüklenemedi: ' + src)); };
        document.head.appendChild(s);
    });
    scriptCache.set(src, p);
    return p;
}

export function initMarkdownTool() {
    const panel = document.getElementById('markdown-panel');
    if (!panel) return;

    /* --- Tabs --- */
    const tabMd2Html = document.getElementById('md-tab-md2html');
    const tabHtml2Md = document.getElementById('md-tab-html2md');
    const sectionMd2Html = document.getElementById('md-md2html-section');
    const sectionHtml2Md = document.getElementById('md-html2md-section');

    function switchTab(mode) {
        tabMd2Html.classList.toggle('active', mode === 'md2html');
        tabHtml2Md.classList.toggle('active', mode === 'html2md');
        sectionMd2Html.classList.toggle('active', mode === 'md2html');
        sectionHtml2Md.classList.toggle('active', mode === 'html2md');
    }
    tabMd2Html.addEventListener('click', () => switchTab('md2html'));
    tabHtml2Md.addEventListener('click', () => switchTab('html2md'));

    /* ==================== Markdown -> HTML ==================== */
    const mdInput = document.getElementById('md-input');
    const preview = document.getElementById('md-preview');

    let renderScheduled = false;
    async function renderPreview() {
        if (renderScheduled) return;
        renderScheduled = true;
        try {
            await loadScript('vendor/marked/marked.min.js');
            await loadScript('vendor/dompurify/purify.min.js');
            const html = window.marked.parse(mdInput.value, { gfm: true, breaks: true });
            preview.innerHTML = window.DOMPurify.sanitize(html);
        } catch (err) {
            console.error("MD render:", err);
        } finally {
            renderScheduled = false;
        }
    }

    let debounce = null;
    mdInput.addEventListener('input', () => {
        clearTimeout(debounce);
        debounce = setTimeout(renderPreview, 200);
    });

    // Panel ilk açıldığında örnek içeriği render et
    renderPreview();

    function getCleanHtml() {
        return window.DOMPurify ? window.DOMPurify.sanitize(window.marked.parse(mdInput.value, { gfm: true, breaks: true })) : '';
    }

    document.getElementById('md-btn-copy-html').addEventListener('click', async () => {
        await renderPreview();
        const html = getCleanHtml();
        if (!html.trim()) { showToast("Kopyalanacak içerik yok.", "error"); return; }
        navigator.clipboard.writeText(html)
            .then(() => showToast("HTML kopyalandı!", "success"))
            .catch(() => showToast("Kopyalama başarısız oldu.", "error"));
    });

    document.getElementById('md-btn-download-html').addEventListener('click', async () => {
        await renderPreview();
        const html = getCleanHtml();
        if (!html.trim()) { showToast("İndirilecek içerik yok.", "error"); return; }
        const full = `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>LovoTools Markdown</title>
<style>
body { max-width: 800px; margin: 2rem auto; padding: 0 1.5rem; font-family: -apple-system, 'Segoe UI', Arial, sans-serif; line-height: 1.7; color: #1e293b; }
code { background: #f1f5f9; padding: 0.15em 0.4em; border-radius: 4px; font-size: 0.9em; }
pre { background: #f1f5f9; padding: 1rem; border-radius: 8px; overflow-x: auto; }
pre code { background: none; padding: 0; }
blockquote { border-left: 4px solid #6366f1; margin: 1rem 0; padding: 0.5rem 1rem; color: #64748b; background: #f8fafc; }
table { border-collapse: collapse; }
th, td { border: 1px solid #e2e8f0; padding: 0.5rem 0.75rem; }
img { max-width: 100%; }
a { color: #4f46e5; }
</style>
</head>
<body>
${html}
</body>
</html>`;
        downloadBlob(new Blob([full], { type: 'text/html;charset=utf-8' }), 'markdown_cikti.html');
    });

    document.getElementById('md-btn-download-md').addEventListener('click', () => {
        if (!mdInput.value.trim()) { showToast("İndirilecek içerik yok.", "error"); return; }
        downloadBlob(new Blob([mdInput.value], { type: 'text/markdown;charset=utf-8' }), 'belge.md');
    });

    /* ==================== HTML -> Markdown ==================== */
    const htmlInput = document.getElementById('md-html-input');
    const mdOutput = document.getElementById('md-output');

    document.getElementById('md-btn-html2md').addEventListener('click', async () => {
        if (!htmlInput.value.trim()) {
            showToast("Lütfen dönüştürülecek HTML girin.", "error");
            return;
        }
        try {
            await loadScript('vendor/turndown/turndown.js');
            const td = new window.TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced' });
            mdOutput.value = td.turndown(htmlInput.value);
            showToast("Dönüştürme tamamlandı!", "success");
        } catch (err) {
            console.error("HTML2MD:", err);
            showToast("Dönüştürme başarısız oldu.", "error");
        }
    });

    document.getElementById('md-btn-copy-md').addEventListener('click', () => {
        if (!mdOutput.value) { showToast("Kopyalanacak sonuç yok.", "error"); return; }
        navigator.clipboard.writeText(mdOutput.value)
            .then(() => showToast("Kopyalandı!", "success"))
            .catch(() => showToast("Kopyalama başarısız oldu.", "error"));
    });

    document.getElementById('md-btn-download-md2').addEventListener('click', () => {
        if (!mdOutput.value) { showToast("İndirilecek içerik yok.", "error"); return; }
        downloadBlob(new Blob([mdOutput.value], { type: 'text/markdown;charset=utf-8' }), 'donusturulen.md');
    });
}
