import { showToast, formatBytes, preventDefaults, downloadBlob, sanitizeFilename } from '../utils.js';
import { t } from '../i18n.js';

/**
 * OCR Modülü — tesseract.js ile görüntüden/taranmış PDF'den metin çıkarma.
 * Motor, çekirdek wasm ve dil verileri (tur/eng) vendor/tesseract altında
 * self-host edilir; her şey tarayıcıda çalışır.
 */

let tesseractScriptPromise = null;
function loadTesseract() {
    if (tesseractScriptPromise) return tesseractScriptPromise;
    tesseractScriptPromise = new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = 'vendor/tesseract/tesseract.min.js';
        s.onload = resolve;
        s.onerror = () => { tesseractScriptPromise = null; reject(new Error("Tesseract yüklenemedi")); };
        document.head.appendChild(s);
    });
    return tesseractScriptPromise;
}

export function initOcrTool() {
    const panel = document.getElementById('ocr-panel');
    if (!panel) return;

    const uploadZone = document.getElementById('ocr-upload-zone');
    const workspace = document.getElementById('ocr-workspace');
    const input = document.getElementById('ocr-input');
    const fileIcon = document.getElementById('ocr-file-icon');
    const fileNameEl = document.getElementById('ocr-file-name');
    const fileSizeEl = document.getElementById('ocr-file-size');
    const btnReset = document.getElementById('ocr-btn-reset');
    const previewImg = document.getElementById('ocr-preview');
    const pdfBadge = document.getElementById('ocr-pdf-badge');
    const pdfPagesEl = document.getElementById('ocr-pdf-pages');
    const langSelect = document.getElementById('ocr-lang');
    const btnRun = document.getElementById('ocr-btn-run');
    const progressBox = document.getElementById('ocr-progress');
    const progressBar = document.getElementById('ocr-progress-bar');
    const statusEl = document.getElementById('ocr-status');
    const resultBox = document.getElementById('ocr-result');
    const output = document.getElementById('ocr-output');
    const wordCountEl = document.getElementById('ocr-word-count');
    const btnCopy = document.getElementById('ocr-btn-copy');
    const btnDownload = document.getElementById('ocr-btn-download');

    if (!uploadZone || !input) return;

    let currentFile = null;
    let isPdf = false;
    let pdfDoc = null;
    let previewUrl = null;
    let isProcessing = false;

    let worker = null;
    let workerLang = null;

    async function getWorker(lang) {
        await loadTesseract();
        if (worker && workerLang === lang) return worker;
        if (worker) {
            try { await worker.terminate(); } catch (_) {}
            worker = null;
        }

        statusEl.textContent = t('ocr_loading_engine');
        const base = new URL('vendor/tesseract/', document.baseURI).href;
        worker = await window.Tesseract.createWorker(lang, 1, {
            workerPath: base + 'worker.min.js',
            corePath: base + 'core',
            langPath: base + 'lang',
            logger: (m) => {
                if (m.status === 'recognizing text' && typeof m.progress === 'number') {
                    updateProgress(m.progress);
                }
            }
        });
        workerLang = lang;
        return worker;
    }

    let pageBase = 0;   // çok sayfalı PDF'de genel ilerleme için
    let pageCount = 1;

    function updateProgress(pageProgress) {
        const overall = Math.min(1, (pageBase + pageProgress) / pageCount);
        progressBar.style.width = Math.round(overall * 100) + '%';
    }

    /* --- Upload handling --- */
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(ev => {
        uploadZone.addEventListener(ev, preventDefaults, false);
    });
    uploadZone.addEventListener('dragover', () => uploadZone.classList.add('dragover'));
    uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('dragover'));
    uploadZone.addEventListener('drop', (e) => {
        uploadZone.classList.remove('dragover');
        if (e.dataTransfer.files.length) handleSelect(e.dataTransfer.files[0]);
    });
    input.addEventListener('change', (e) => {
        if (e.target.files.length) handleSelect(e.target.files[0]);
    });

    async function handleSelect(file) {
        const isImage = file.type.startsWith('image/');
        const looksPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
        if (!isImage && !looksPdf) {
            showToast(t('ocr_wrong_type'), "error");
            return;
        }

        currentFile = file;
        isPdf = looksPdf && !isImage;
        pdfDoc = null;
        fileNameEl.textContent = file.name;
        fileSizeEl.textContent = formatBytes(file.size);
        fileIcon.className = isPdf ? 'ph ph-file-pdf' : 'ph ph-image';

        if (previewUrl) { URL.revokeObjectURL(previewUrl); previewUrl = null; }

        if (isPdf) {
            if (!window.pdfjsLib) {
                showToast("PDF kütüphanesi yüklenemedi. Sayfayı yenileyin.", "error");
                return;
            }
            if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
                pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('vendor/pdfjs/pdf.worker.min.js', document.baseURI).href;
            }
            try {
                pdfDoc = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
            } catch (err) {
                console.error("OCR PDF load:", err);
                showToast(`Dosya yüklenemedi: ${file.name}`, "error");
                return;
            }
            previewImg.classList.add('hidden');
            pdfBadge.classList.remove('hidden');
            pdfPagesEl.textContent = pdfDoc.numPages + ' ' + t('ocr_pages_suffix');
        } else {
            previewUrl = URL.createObjectURL(file);
            previewImg.src = previewUrl;
            previewImg.classList.remove('hidden');
            pdfBadge.classList.add('hidden');
        }

        uploadZone.classList.remove('active');
        workspace.classList.add('active');
        resultBox.classList.add('hidden');
        progressBox.classList.add('hidden');
        input.value = '';
    }

    btnReset.addEventListener('click', () => {
        if (isProcessing) return;
        currentFile = null;
        pdfDoc = null;
        if (previewUrl) { URL.revokeObjectURL(previewUrl); previewUrl = null; }
        workspace.classList.remove('active');
        uploadZone.classList.add('active');
    });

    /* --- Recognition --- */
    async function renderPdfPageToCanvas(pageNum) {
        const page = await pdfDoc.getPage(pageNum);
        const viewport = page.getViewport({ scale: 2 });
        const canvas = document.createElement('canvas');
        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        await page.render({ canvasContext: ctx, viewport, intent: 'print' }).promise;
        return canvas;
    }

    btnRun.addEventListener('click', async () => {
        if (!currentFile || isProcessing) return;

        isProcessing = true;
        btnRun.disabled = true;
        resultBox.classList.add('hidden');
        progressBox.classList.remove('hidden');
        progressBar.style.width = '0%';
        statusEl.textContent = t('ocr_loading_engine');

        try {
            const w = await getWorker(langSelect.value);
            let fullText = '';

            if (isPdf && pdfDoc) {
                pageCount = pdfDoc.numPages;
                const pageTexts = [];
                for (let i = 1; i <= pdfDoc.numPages; i++) {
                    pageBase = i - 1;
                    statusEl.textContent = `${t('ocr_recognizing')} — ${t('ocr_page')} ${i} / ${pdfDoc.numPages}`;
                    const canvas = await renderPdfPageToCanvas(i);
                    const { data } = await w.recognize(canvas);
                    pageTexts.push(data.text.trim());
                }
                fullText = pageTexts.join('\n\n----- ' + t('ocr_page') + ' -----\n\n');
            } else {
                pageCount = 1;
                pageBase = 0;
                statusEl.textContent = t('ocr_recognizing');
                const { data } = await w.recognize(currentFile);
                fullText = data.text.trim();
            }

            progressBar.style.width = '100%';
            statusEl.textContent = '';
            progressBox.classList.add('hidden');

            if (!fullText.trim()) {
                showToast(t('ocr_no_text'), "warning");
            }

            output.value = fullText;
            const words = fullText.trim() ? fullText.trim().split(/\s+/).length : 0;
            wordCountEl.textContent = `${words} ${t('ocr_words')} · ${fullText.length} ${t('ocr_chars')}`;
            resultBox.classList.remove('hidden');
            showToast(t('ocr_done'), "success");
        } catch (err) {
            console.error("OCR Error:", err);
            progressBox.classList.add('hidden');
            showToast(t('ocr_failed'), "error");
        } finally {
            isProcessing = false;
            btnRun.disabled = false;
        }
    });

    /* --- Result actions --- */
    btnCopy.addEventListener('click', () => {
        if (!output.value) return;
        navigator.clipboard.writeText(output.value)
            .then(() => showToast(t('ocr_copied'), "success"))
            .catch(() => showToast("Kopyalama başarısız oldu.", "error"));
    });

    btnDownload.addEventListener('click', () => {
        if (!output.value) return;
        const base = currentFile ? currentFile.name.replace(/\.[^/.]+$/, '') : 'metin';
        const name = sanitizeFilename(base + '_metin', 'cikarilan_metin');
        // BOM: Windows Not Defteri'nin UTF-8 Türkçe karakterleri doğru açması için
        downloadBlob(new Blob(['﻿' + output.value], { type: 'text/plain;charset=utf-8' }), name + '.txt');
    });
}
