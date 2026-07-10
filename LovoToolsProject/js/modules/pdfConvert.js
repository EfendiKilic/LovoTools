import { showToast, formatBytes, preventDefaults, downloadBlob, sanitizeFilename } from '../utils.js';
import { t } from '../i18n.js';

/**
 * PDF Dönüştürme Modülü: Sıkıştırma, PDF<->Word, PDF<->PowerPoint.
 * Ağır kütüphaneler (jszip, mammoth, html2pdf, pptxgen, fontkit) yalnızca
 * ilgili araç ilk kez çalıştırıldığında vendor/ altından yüklenir.
 */

const loadedScripts = new Map();
function loadScript(src) {
    if (loadedScripts.has(src)) return loadedScripts.get(src);
    const p = new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = src;
        s.onload = resolve;
        s.onerror = () => { loadedScripts.delete(src); reject(new Error('Kütüphane yüklenemedi: ' + src)); };
        document.head.appendChild(s);
    });
    loadedScripts.set(src, p);
    return p;
}

const EMU_PER_PT = 12700;

export function initPdfConvert() {
    const workspace = document.getElementById('pdf-convert-workspace');
    if (!workspace) return;

    const pdfHome = document.getElementById('pdf-home');
    const pdfModeTitle = document.getElementById('pdf-mode-title');
    const uploadCard = document.getElementById('pdfc-upload-card');
    const uploadTitle = document.getElementById('pdfc-upload-title');
    const uploadNote = document.getElementById('pdfc-upload-note');
    const input = document.getElementById('pdfc-input');
    const optionsBox = document.getElementById('pdfc-options');
    const fileNameEl = document.getElementById('pdfc-file-name');
    const fileSizeEl = document.getElementById('pdfc-file-size');
    const qualityGroup = document.getElementById('pdfc-quality-group');
    const qualitySelect = document.getElementById('pdfc-quality');
    const filenameInput = document.getElementById('pdfc-filename');
    const hintEl = document.getElementById('pdfc-hint');
    const btnRun = document.getElementById('pdfc-btn-run');
    const btnRunLabel = document.getElementById('pdfc-btn-run-label');
    const statusEl = document.getElementById('pdfc-status');
    const resultBox = document.getElementById('pdfc-result');
    const resultText = document.getElementById('pdfc-result-text');
    const btnDownload = document.getElementById('pdfc-btn-download');

    let currentMode = null;
    let currentFile = null;
    let resultBlob = null;
    let resultExt = 'pdf';
    let isProcessing = false;

    const MODES = {
        compress: {
            accept: 'application/pdf', ext: '.pdf', outExt: 'pdf', suffix: '_sikistirilmis',
            titleKey: 'pdfc_compress_title', uploadKey: 'pdfc_compress_upload', hintKey: 'pdfc_compress_hint',
            runKey: 'pdfc_compress_run', quality: true, run: runCompress
        },
        pdf2word: {
            accept: 'application/pdf', ext: '.pdf', outExt: 'docx', suffix: '_word',
            titleKey: 'pdfc_pdf2word_title', uploadKey: 'pdfc_pdf2word_upload', hintKey: 'pdfc_pdf2word_hint',
            runKey: 'pdfc_pdf2word_run', quality: false, run: runPdf2Word
        },
        word2pdf: {
            accept: '.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document', ext: '.docx', outExt: 'pdf', suffix: '',
            titleKey: 'pdfc_word2pdf_title', uploadKey: 'pdfc_word2pdf_upload', hintKey: 'pdfc_word2pdf_hint',
            runKey: 'pdfc_word2pdf_run', quality: false, run: runWord2Pdf
        },
        pdf2ppt: {
            accept: 'application/pdf', ext: '.pdf', outExt: 'pptx', suffix: '_sunum',
            titleKey: 'pdfc_pdf2ppt_title', uploadKey: 'pdfc_pdf2ppt_upload', hintKey: 'pdfc_pdf2ppt_hint',
            runKey: 'pdfc_pdf2ppt_run', quality: false, run: runPdf2Ppt
        },
        ppt2pdf: {
            accept: '.pptx,application/vnd.openxmlformats-officedocument.presentationml.presentation', ext: '.pptx', outExt: 'pdf', suffix: '',
            titleKey: 'pdfc_ppt2pdf_title', uploadKey: 'pdfc_ppt2pdf_upload', hintKey: 'pdfc_ppt2pdf_hint',
            runKey: 'pdfc_ppt2pdf_run', quality: false, run: runPpt2Pdf
        }
    };

    window.openPdfConvert = (mode) => {
        const cfg = MODES[mode];
        if (!cfg) return;
        currentMode = mode;
        currentFile = null;
        resultBlob = null;

        pdfHome.classList.remove('active');
        pdfHome.style.display = 'none';
        document.getElementById('pdf-workspace').classList.add('hidden');
        workspace.classList.remove('hidden');

        pdfModeTitle.textContent = t(cfg.titleKey);
        uploadTitle.textContent = t(cfg.uploadKey);
        uploadNote.textContent = t('pdfc_local_note');
        hintEl.textContent = t(cfg.hintKey);
        btnRunLabel.textContent = t(cfg.runKey);
        input.accept = cfg.accept;

        uploadCard.classList.remove('hidden');
        optionsBox.classList.add('hidden');
        resultBox.classList.add('hidden');
        qualityGroup.classList.toggle('hidden', !cfg.quality);
        statusEl.textContent = '';
        input.value = '';
    };

    // pdfEditor'ün home'a dönüşünde bu alanı da kapat
    window.__pdfConvertClose = () => {
        workspace.classList.add('hidden');
        currentFile = null;
        resultBlob = null;
    };

    uploadCard.addEventListener('click', () => { if (!isProcessing) input.click(); });
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(ev => uploadCard.addEventListener(ev, preventDefaults, false));
    uploadCard.addEventListener('drop', (e) => {
        if (e.dataTransfer.files.length) handleSelect(e.dataTransfer.files[0]);
    });
    input.addEventListener('change', (e) => {
        if (e.target.files.length) handleSelect(e.target.files[0]);
    });

    function handleSelect(file) {
        const cfg = MODES[currentMode];
        if (!cfg) return;
        const nameOk = file.name.toLowerCase().endsWith(cfg.ext);
        const typeOk = cfg.accept.includes(file.type) && file.type !== '';
        if (!nameOk && !typeOk) {
            showToast(t('pdfc_wrong_type') + ' (' + cfg.ext + ')', "error");
            return;
        }
        currentFile = file;
        resultBlob = null;
        fileNameEl.textContent = file.name;
        fileSizeEl.textContent = formatBytes(file.size);
        filenameInput.value = file.name.replace(/\.[^/.]+$/, '') + cfg.suffix;
        uploadCard.classList.add('hidden');
        optionsBox.classList.remove('hidden');
        resultBox.classList.add('hidden');
        statusEl.textContent = '';
        input.value = '';
    }

    btnRun.addEventListener('click', async () => {
        const cfg = MODES[currentMode];
        if (!cfg || !currentFile || isProcessing) return;

        isProcessing = true;
        btnRun.disabled = true;
        resultBox.classList.add('hidden');
        statusEl.textContent = t('pdfc_preparing');

        try {
            const { blob, message } = await cfg.run(currentFile);
            resultBlob = blob;
            resultExt = cfg.outExt;
            resultText.textContent = message || t('pdfc_done');
            statusEl.textContent = '';
            resultBox.classList.remove('hidden');
            showToast(t('pdfc_done'), "success");
        } catch (err) {
            console.error("PdfConvert Error:", err);
            statusEl.textContent = '';
            showToast(err.userMessage || t('pdfc_failed'), "error");
        } finally {
            isProcessing = false;
            btnRun.disabled = false;
        }
    });

    btnDownload.addEventListener('click', () => {
        if (!resultBlob) return;
        const name = sanitizeFilename(filenameInput.value, 'lovo_donusum');
        downloadBlob(resultBlob, `${name}.${resultExt}`);
    });

    /* ==================== 1) PDF Sıkıştırma ==================== */
    async function runCompress(file) {
        const presets = {
            high:     { scale: 2.0, quality: 0.85 },
            balanced: { scale: 1.5, quality: 0.70 },
            small:    { scale: 1.1, quality: 0.50 }
        };
        const preset = presets[qualitySelect.value] || presets.balanced;

        const srcBytes = await file.arrayBuffer();
        const doc = await pdfjsLib.getDocument({ data: srcBytes.slice(0) }).promise;
        const { PDFDocument } = window.PDFLib;
        const outDoc = await PDFDocument.create();

        for (let i = 1; i <= doc.numPages; i++) {
            statusEl.textContent = t('pdfc_page_progress') + ` ${i} / ${doc.numPages}`;
            const page = await doc.getPage(i);
            const baseViewport = page.getViewport({ scale: 1 });
            const viewport = page.getViewport({ scale: preset.scale });

            const canvas = document.createElement('canvas');
            canvas.width = Math.ceil(viewport.width);
            canvas.height = Math.ceil(viewport.height);
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            await page.render({ canvasContext: ctx, viewport, intent: 'print' }).promise;

            const jpegBlob = await new Promise((res, rej) => canvas.toBlob(b => b ? res(b) : rej(new Error("Sayfa işlenemedi.")), 'image/jpeg', preset.quality));
            const jpeg = await outDoc.embedJpg(new Uint8Array(await jpegBlob.arrayBuffer()));
            const outPage = outDoc.addPage([baseViewport.width, baseViewport.height]);
            outPage.drawImage(jpeg, { x: 0, y: 0, width: baseViewport.width, height: baseViewport.height });
        }

        const outBytes = await outDoc.save();
        const blob = new Blob([outBytes], { type: 'application/pdf' });
        const saved = file.size - blob.size;
        const pct = Math.round((saved / file.size) * 100);
        const message = saved > 0
            ? `${formatBytes(file.size)} → ${formatBytes(blob.size)} (%${pct} ${t('pdfc_saved')})`
            : `${formatBytes(file.size)} → ${formatBytes(blob.size)} — ${t('pdfc_no_gain')}`;
        return { blob, message };
    }

    /* ==================== 2) PDF -> Word (.docx) ==================== */
    async function runPdf2Word(file) {
        await loadScript('vendor/jszip/jszip.min.js');

        const srcBytes = await file.arrayBuffer();
        const doc = await pdfjsLib.getDocument({ data: srcBytes }).promise;

        const pageParagraphs = [];
        let totalChars = 0;

        for (let i = 1; i <= doc.numPages; i++) {
            statusEl.textContent = t('pdfc_page_progress') + ` ${i} / ${doc.numPages}`;
            const page = await doc.getPage(i);
            const content = await page.getTextContent();

            // Satırlara grupla (y koordinatına göre), soldan sağa sırala
            const lines = [];
            for (const item of content.items) {
                if (!item.str || !item.str.trim()) continue;
                const y = item.transform[5];
                const x = item.transform[4];
                let line = lines.find(l => Math.abs(l.y - y) < 2.5);
                if (!line) { line = { y, items: [] }; lines.push(line); }
                line.items.push({ x, str: item.str, h: item.height || 12 });
            }
            lines.sort((a, b) => b.y - a.y);

            // Satır aralıklarına göre paragraflara birleştir
            const paragraphs = [];
            let currentPara = [];
            let prevY = null, prevH = 12;
            for (const line of lines) {
                line.items.sort((a, b) => a.x - b.x);
                const text = line.items.map(it => it.str).join(' ').replace(/\s+/g, ' ').trim();
                if (!text) continue;
                const h = line.items[0].h || 12;
                if (prevY !== null && (prevY - line.y) > Math.max(h, prevH) * 1.8) {
                    if (currentPara.length) paragraphs.push(currentPara.join(' '));
                    currentPara = [];
                }
                currentPara.push(text);
                prevY = line.y;
                prevH = h;
            }
            if (currentPara.length) paragraphs.push(currentPara.join(' '));

            totalChars += paragraphs.join('').length;
            pageParagraphs.push(paragraphs);
        }

        if (totalChars < 5) {
            const err = new Error("no text");
            err.userMessage = t('pdfc_no_text');
            throw err;
        }

        // Minimal ama geçerli OOXML .docx üret
        const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        let body = '';
        pageParagraphs.forEach((paragraphs, idx) => {
            paragraphs.forEach(p => {
                body += `<w:p><w:r><w:t xml:space="preserve">${esc(p)}</w:t></w:r></w:p>`;
            });
            if (idx < pageParagraphs.length - 1) {
                body += '<w:p><w:r><w:br w:type="page"/></w:r></w:p>';
            }
        });

        const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1417" w:right="1417" w:bottom="1417" w:left="1417"/></w:sectPr></w:body></w:document>`;

        const zip = new JSZip();
        zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`);
        zip.file('_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`);
        zip.file('word/document.xml', documentXml);

        const blob = await zip.generateAsync({
            type: 'blob',
            mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        });
        return { blob, message: `${doc.numPages} ${t('pdfc_pages_converted')}` };
    }

    /* ==================== 3) Word -> PDF ==================== */
    async function runWord2Pdf(file) {
        statusEl.textContent = t('pdfc_loading_libs');
        await loadScript('vendor/mammoth/mammoth.browser.min.js');
        await loadScript('vendor/html2pdf/html2pdf.bundle.min.js');

        statusEl.textContent = t('pdfc_reading_doc');
        const arrayBuffer = await file.arrayBuffer();
        const result = await window.mammoth.convertToHtml({ arrayBuffer });

        if (!result.value || result.value.trim().length < 5) {
            const err = new Error("empty doc");
            err.userMessage = t('pdfc_empty_doc');
            throw err;
        }

        // DİKKAT: html2pdf, verilen elementi inline stilleriyle klonlar. Elemente
        // position:absolute/fixed verilirse klon akış dışı kalır ve 0 yükseklikte
        // (bembeyaz) çıktı üretir. Bu yüzden içerik STATİK konumlu bir iç div'de
        // durur; ekran dışına taşıma işini dış sarmalayıcı üstlenir.
        const wrapper = document.createElement('div');
        wrapper.style.cssText = 'position:absolute;left:-10000px;top:0;';
        const container = document.createElement('div');
        container.style.cssText = 'width:770px;background:#ffffff;color:#000000;' +
            'font-family:Arial,Helvetica,sans-serif;font-size:12pt;line-height:1.5;';
        container.innerHTML = result.value;
        // Tema CSS'i metni açık renge boyamasın diye tüm alt öğelere koyu renk zorla
        container.querySelectorAll('*').forEach(el => {
            el.style.color = '#000000';
            if (el.tagName === 'IMG') el.style.maxWidth = '100%';
        });
        wrapper.appendChild(container);
        document.body.appendChild(wrapper);

        try {
            statusEl.textContent = t('pdfc_rendering_pdf');
            const blob = await window.html2pdf()
                .set({
                    margin: [12, 12, 12, 12],
                    image: { type: 'jpeg', quality: 0.95 },
                    html2canvas: { scale: 2, useCORS: true, logging: false, backgroundColor: '#ffffff' },
                    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
                    pagebreak: { mode: ['css', 'legacy'] }
                })
                .from(container)
                .outputPdf('blob');

            if (!blob || blob.size < 1200) {
                const err = new Error("blank render");
                err.userMessage = t('pdfc_failed');
                throw err;
            }
            return { blob, message: t('pdfc_done') };
        } finally {
            document.body.removeChild(wrapper);
        }
    }

    /* ==================== 4) PDF -> PowerPoint ==================== */
    async function runPdf2Ppt(file) {
        statusEl.textContent = t('pdfc_loading_libs');
        await loadScript('vendor/pptxgen/pptxgen.bundle.js');

        const srcBytes = await file.arrayBuffer();
        const doc = await pdfjsLib.getDocument({ data: srcBytes }).promise;

        const firstPage = await doc.getPage(1);
        const baseVp = firstPage.getViewport({ scale: 1 });
        const widthIn = baseVp.width / 72;
        const heightIn = baseVp.height / 72;

        const pptx = new window.PptxGenJS();
        pptx.defineLayout({ name: 'LOVO', width: widthIn, height: heightIn });
        pptx.layout = 'LOVO';

        for (let i = 1; i <= doc.numPages; i++) {
            statusEl.textContent = t('pdfc_page_progress') + ` ${i} / ${doc.numPages}`;
            const page = await doc.getPage(i);
            const viewport = page.getViewport({ scale: 2 });
            const canvas = document.createElement('canvas');
            canvas.width = Math.ceil(viewport.width);
            canvas.height = Math.ceil(viewport.height);
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            await page.render({ canvasContext: ctx, viewport, intent: 'print' }).promise;

            const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
            const slide = pptx.addSlide();
            slide.addImage({ data: dataUrl, x: 0, y: 0, w: widthIn, h: heightIn });
        }

        statusEl.textContent = t('pdfc_rendering_pptx');
        const blob = await pptx.write('blob');
        return { blob, message: `${doc.numPages} ${t('pdfc_slides_created')}` };
    }

    /* ==================== 5) PowerPoint -> PDF ==================== */
    async function runPpt2Pdf(file) {
        statusEl.textContent = t('pdfc_loading_libs');
        await loadScript('vendor/jszip/jszip.min.js');
        await loadScript('vendor/fontkit/fontkit.umd.min.js');

        const zip = await window.JSZip.loadAsync(await file.arrayBuffer());
        const parser = new DOMParser();

        const readXml = async (path) => {
            const f = zip.file(path);
            if (!f) return null;
            return parser.parseFromString(await f.async('text'), 'application/xml');
        };

        // Slayt boyutu ve slayt sırası
        const presXml = await readXml('ppt/presentation.xml');
        if (!presXml) {
            const err = new Error("not pptx");
            err.userMessage = t('pdfc_invalid_pptx');
            throw err;
        }
        const sldSz = presXml.getElementsByTagNameNS('*', 'sldSz')[0];
        const pageW = sldSz ? parseInt(sldSz.getAttribute('cx'), 10) / EMU_PER_PT : 960;
        const pageH = sldSz ? parseInt(sldSz.getAttribute('cy'), 10) / EMU_PER_PT : 540;

        const presRels = await readXml('ppt/_rels/presentation.xml.rels');
        const relMap = {};
        if (presRels) {
            for (const rel of presRels.getElementsByTagNameNS('*', 'Relationship')) {
                relMap[rel.getAttribute('Id')] = rel.getAttribute('Target');
            }
        }
        const slidePaths = [];
        for (const sldId of presXml.getElementsByTagNameNS('*', 'sldId')) {
            const rid = sldId.getAttribute('r:id') || sldId.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id');
            const target = relMap[rid];
            if (target && target.includes('slide')) {
                slidePaths.push('ppt/' + target.replace(/^\.\.\//, '').replace(/^\//, ''));
            }
        }
        if (!slidePaths.length) {
            const err = new Error("no slides");
            err.userMessage = t('pdfc_invalid_pptx');
            throw err;
        }

        // pdf-lib + Türkçe destekli font
        const { PDFDocument, rgb } = window.PDFLib;
        const outDoc = await PDFDocument.create();
        outDoc.registerFontkit(window.fontkit);
        const fontBytes = await fetch('vendor/fonts/DejaVuSans.ttf').then(r => r.arrayBuffer());
        const font = await outDoc.embedFont(fontBytes, { subset: true });

        const wrapText = (text, size, maxWidth) => {
            const words = text.split(/\s+/);
            const linesOut = [];
            let line = '';
            for (const word of words) {
                const attempt = line ? line + ' ' + word : word;
                if (font.widthOfTextAtSize(attempt, size) <= maxWidth || !line) {
                    line = attempt;
                } else {
                    linesOut.push(line);
                    line = word;
                }
            }
            if (line) linesOut.push(line);
            return linesOut;
        };

        for (let s = 0; s < slidePaths.length; s++) {
            statusEl.textContent = t('pdfc_slide_progress') + ` ${s + 1} / ${slidePaths.length}`;
            const slidePath = slidePaths[s];
            const slideXml = await readXml(slidePath);
            const page = outDoc.addPage([pageW, pageH]);
            if (!slideXml) continue;

            // Slaytın kendi rel dosyası (görseller için)
            const relPath = slidePath.replace('slides/', 'slides/_rels/') + '.rels';
            const slideRels = await readXml(relPath);
            const slideRelMap = {};
            if (slideRels) {
                for (const rel of slideRels.getElementsByTagNameNS('*', 'Relationship')) {
                    slideRelMap[rel.getAttribute('Id')] = rel.getAttribute('Target');
                }
            }

            const readXfrm = (el) => {
                const xfrm = el.getElementsByTagNameNS('*', 'xfrm')[0];
                if (!xfrm) return null;
                const off = xfrm.getElementsByTagNameNS('*', 'off')[0];
                const ext = xfrm.getElementsByTagNameNS('*', 'ext')[0];
                if (!off || !ext) return null;
                return {
                    x: parseInt(off.getAttribute('x'), 10) / EMU_PER_PT,
                    y: parseInt(off.getAttribute('y'), 10) / EMU_PER_PT,
                    w: parseInt(ext.getAttribute('cx'), 10) / EMU_PER_PT,
                    h: parseInt(ext.getAttribute('cy'), 10) / EMU_PER_PT
                };
            };

            // Görseller (metinlerin altında kalsın diye önce çizilir)
            for (const pic of slideXml.getElementsByTagNameNS('*', 'pic')) {
                try {
                    const blip = pic.getElementsByTagNameNS('*', 'blip')[0];
                    if (!blip) continue;
                    const rid = blip.getAttribute('r:embed') || blip.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'embed');
                    const target = slideRelMap[rid];
                    if (!target) continue;
                    const mediaPath = 'ppt/' + target.replace(/^\.\.\//, '');
                    const mediaFile = zip.file(mediaPath);
                    if (!mediaFile) continue;
                    const bytes = await mediaFile.async('uint8array');
                    const box = readXfrm(pic) || { x: 0, y: 0, w: pageW, h: pageH };

                    let embedded = null;
                    const lower = mediaPath.toLowerCase();
                    if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) {
                        embedded = await outDoc.embedJpg(bytes);
                    } else if (lower.endsWith('.png')) {
                        embedded = await outDoc.embedPng(bytes);
                    } else {
                        // gif/bmp/webp vb: canvas üzerinden PNG'ye çevirmeyi dene
                        try {
                            const bmp = await createImageBitmap(new Blob([bytes]));
                            const cv = document.createElement('canvas');
                            cv.width = bmp.width; cv.height = bmp.height;
                            cv.getContext('2d').drawImage(bmp, 0, 0);
                            const pngBlob = await new Promise(res => cv.toBlob(res, 'image/png'));
                            if (pngBlob) embedded = await outDoc.embedPng(new Uint8Array(await pngBlob.arrayBuffer()));
                        } catch (_) { /* emf/wmf gibi formatlar atlanır */ }
                    }
                    if (embedded) {
                        page.drawImage(embedded, { x: box.x, y: pageH - box.y - box.h, width: box.w, height: box.h });
                    }
                } catch (imgErr) {
                    console.warn("Slayt görseli atlandı:", imgErr);
                }
            }

            // Metin kutuları
            let fallbackY = 40; // xfrm'siz (layout'tan miras alan) kutular için üstten yerleşim
            for (const sp of slideXml.getElementsByTagNameNS('*', 'sp')) {
                const paras = sp.getElementsByTagNameNS('*', 'p');
                if (!paras.length) continue;

                let box = readXfrm(sp);
                const paraData = [];
                for (const p of paras) {
                    let text = '';
                    let size = 18;
                    const runs = p.getElementsByTagNameNS('*', 'r');
                    for (const r of runs) {
                        const tEl = r.getElementsByTagNameNS('*', 't')[0];
                        if (tEl && tEl.textContent) text += tEl.textContent;
                        const rPr = r.getElementsByTagNameNS('*', 'rPr')[0];
                        if (rPr && rPr.getAttribute('sz')) size = parseInt(rPr.getAttribute('sz'), 10) / 100;
                    }
                    if (text.trim()) paraData.push({ text: text.trim(), size });
                }
                if (!paraData.length) continue;

                if (!box) {
                    const estH = paraData.reduce((acc, p) => acc + p.size * 1.6, 0);
                    box = { x: 40, y: fallbackY, w: pageW - 80, h: estH };
                    fallbackY += estH + 12;
                }

                let cursorY = pageH - box.y - (paraData[0].size);
                for (const para of paraData) {
                    const size = Math.max(6, Math.min(para.size, 96));
                    for (const line of wrapText(para.text, size, Math.max(40, box.w))) {
                        if (cursorY < 10) break;
                        page.drawText(line, { x: box.x, y: cursorY, size, font, color: rgb(0.1, 0.1, 0.15) });
                        cursorY -= size * 1.35;
                    }
                    cursorY -= size * 0.2;
                }
            }
        }

        const outBytes = await outDoc.save();
        const blob = new Blob([outBytes], { type: 'application/pdf' });
        return { blob, message: `${slidePaths.length} ${t('pdfc_slides_converted')}` };
    }
}
