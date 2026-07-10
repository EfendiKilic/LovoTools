import { showToast, downloadBlob, sanitizeFilename } from '../utils.js';

/**
 * Görsel <-> PDF Dönüştürücü Modülü
 * Görsel -> PDF: pdf-lib ile her görsel bir sayfa olur.
 * PDF -> Görsel: pdf.js ile her sayfa canvas'a çizilip indirilir.
 */
export function initImagePdf() {
    const panel = document.getElementById('image-pdf-panel');
    if (!panel) return;

    if (window.pdfjsLib && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('vendor/pdfjs/pdf.worker.min.js', document.baseURI).href;
    }

    /* --- Tab Switching --- */
    const tabImg2Pdf = document.getElementById('ipdf-tab-img2pdf');
    const tabPdf2Img = document.getElementById('ipdf-tab-pdf2img');
    const sectionImg2Pdf = document.getElementById('ipdf-img2pdf-section');
    const sectionPdf2Img = document.getElementById('ipdf-pdf2img-section');

    function switchTab(mode) {
        tabImg2Pdf.classList.toggle('active', mode === 'img2pdf');
        tabPdf2Img.classList.toggle('active', mode === 'pdf2img');
        sectionImg2Pdf.classList.toggle('active', mode === 'img2pdf');
        sectionPdf2Img.classList.toggle('active', mode === 'pdf2img');
    }
    tabImg2Pdf.addEventListener('click', () => switchTab('img2pdf'));
    tabPdf2Img.addEventListener('click', () => switchTab('pdf2img'));

    /* ==================== Görsel -> PDF ==================== */
    const imageInput = document.getElementById('ipdf-image-input');
    const imageList = document.getElementById('ipdf-image-list');
    const img2pdfActions = document.getElementById('ipdf-img2pdf-actions');
    const pdfFilenameInput = document.getElementById('ipdf-pdf-filename');
    const btnCreatePdf = document.getElementById('ipdf-btn-create-pdf');

    let selectedImages = []; // { file, id }

    imageInput.addEventListener('change', (e) => {
        const files = Array.from(e.target.files).filter(f => f.type.startsWith('image/'));
        if (!files.length) {
            showToast("Lütfen geçerli görsel dosyaları seçin.", "error");
            return;
        }
        files.forEach(file => {
            selectedImages.push({ file, id: 'img_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7) });
        });
        renderImageList();
        imageInput.value = '';
    });

    function renderImageList() {
        imageList.innerHTML = '';
        selectedImages.forEach((item, idx) => {
            const card = document.createElement('div');
            card.className = 'ipdf-image-item';

            const badge = document.createElement('span');
            badge.className = 'ipdf-page-badge';
            badge.textContent = idx + 1;

            const img = document.createElement('img');
            if (!item.previewUrl) item.previewUrl = URL.createObjectURL(item.file);
            img.src = item.previewUrl;
            img.alt = item.file.name;

            const btnRemove = document.createElement('button');
            btnRemove.className = 'ipdf-remove-btn';
            btnRemove.innerHTML = '<i class="ph ph-x"></i>';
            btnRemove.addEventListener('click', () => {
                URL.revokeObjectURL(item.previewUrl);
                selectedImages = selectedImages.filter(i => i.id !== item.id);
                renderImageList();
            });

            const name = document.createElement('span');
            name.className = 'ipdf-image-name';
            name.textContent = item.file.name;
            name.title = item.file.name;

            card.appendChild(badge);
            card.appendChild(img);
            card.appendChild(btnRemove);
            card.appendChild(name);
            imageList.appendChild(card);
        });

        img2pdfActions.classList.toggle('hidden', selectedImages.length === 0);
    }

    async function imageToEmbeddable(file) {
        // JPEG ve PNG doğrudan gömülür; diğer formatlar (webp vb.) canvas ile PNG'ye çevrilir
        const bytes = new Uint8Array(await file.arrayBuffer());
        if (file.type === 'image/jpeg' || file.type === 'image/png') {
            return { bytes, type: file.type };
        }
        const bitmap = await createImageBitmap(file);
        const canvas = document.createElement('canvas');
        canvas.width = bitmap.width;
        canvas.height = bitmap.height;
        canvas.getContext('2d').drawImage(bitmap, 0, 0);
        const blob = await new Promise((res, rej) => canvas.toBlob(b => b ? res(b) : rej(new Error("Görsel dönüştürülemedi.")), 'image/png'));
        return { bytes: new Uint8Array(await blob.arrayBuffer()), type: 'image/png' };
    }

    btnCreatePdf.addEventListener('click', async () => {
        if (!selectedImages.length) return;

        btnCreatePdf.disabled = true;
        const originalHtml = btnCreatePdf.innerHTML;
        btnCreatePdf.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Oluşturuluyor...';

        try {
            const { PDFDocument } = window.PDFLib;
            const doc = await PDFDocument.create();

            for (const item of selectedImages) {
                const { bytes, type } = await imageToEmbeddable(item.file);
                const embedded = type === 'image/jpeg' ? await doc.embedJpg(bytes) : await doc.embedPng(bytes);
                const page = doc.addPage([embedded.width, embedded.height]);
                page.drawImage(embedded, { x: 0, y: 0, width: embedded.width, height: embedded.height });
            }

            const pdfBytes = await doc.save();
            const name = sanitizeFilename(pdfFilenameInput.value, 'gorsellerden_pdf');
            downloadBlob(new Blob([pdfBytes], { type: 'application/pdf' }), name + '.pdf');
            showToast(`${selectedImages.length} görsel PDF'e dönüştürüldü!`, "success");
        } catch (err) {
            console.error("Img2PDF Error:", err);
            showToast("PDF oluşturulurken bir hata oluştu.", "error");
        } finally {
            btnCreatePdf.disabled = false;
            btnCreatePdf.innerHTML = originalHtml;
        }
    });

    /* ==================== PDF -> Görsel ==================== */
    const pdfInput = document.getElementById('ipdf-pdf-input');
    const pdf2imgActions = document.getElementById('ipdf-pdf2img-actions');
    const pdfNameEl = document.getElementById('ipdf-pdf-name');
    const pdfPagesEl = document.getElementById('ipdf-pdf-pages');
    const imgFormatSelect = document.getElementById('ipdf-img-format');
    const imgScaleSelect = document.getElementById('ipdf-img-scale');
    const imgPrefixInput = document.getElementById('ipdf-img-prefix');
    const btnConvertPdf = document.getElementById('ipdf-btn-convert-pdf');
    const statusEl = document.getElementById('ipdf-pdf2img-status');

    let pdfDoc = null;

    pdfInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (!window.pdfjsLib) {
            showToast("PDF kütüphanesi yüklenemedi. Sayfayı yenileyin.", "error");
            return;
        }

        try {
            const buffer = await file.arrayBuffer();
            pdfDoc = await pdfjsLib.getDocument({ data: buffer }).promise;
            pdfNameEl.textContent = file.name;
            pdfPagesEl.textContent = pdfDoc.numPages + ' sayfa';
            imgPrefixInput.value = file.name.replace(/\.pdf$/i, '');
            pdf2imgActions.classList.remove('hidden');
            statusEl.textContent = '';
        } catch (err) {
            console.error("PDF2Img Load Error:", err);
            showToast(`Dosya yüklenemedi: ${file.name}`, "error");
        }
        pdfInput.value = '';
    });

    btnConvertPdf.addEventListener('click', async () => {
        if (!pdfDoc) return;

        btnConvertPdf.disabled = true;
        const format = imgFormatSelect.value;
        const mime = format === 'jpg' ? 'image/jpeg' : format === 'webp' ? 'image/webp' : 'image/png';
        const scale = parseFloat(imgScaleSelect.value);
        const prefix = sanitizeFilename(imgPrefixInput.value, 'sayfa');

        try {
            for (let i = 1; i <= pdfDoc.numPages; i++) {
                statusEl.textContent = `İşleniyor: sayfa ${i} / ${pdfDoc.numPages}`;
                const page = await pdfDoc.getPage(i);
                const viewport = page.getViewport({ scale });
                const canvas = document.createElement('canvas');
                canvas.width = Math.ceil(viewport.width);
                canvas.height = Math.ceil(viewport.height);
                const ctx = canvas.getContext('2d');

                // JPG şeffaflık desteklemez: beyaz zemin
                if (mime === 'image/jpeg') {
                    ctx.fillStyle = '#ffffff';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                }

                // intent: 'print' -> render, rAF beklemez; arka plan sekmesinde bile tamamlanır
                await page.render({ canvasContext: ctx, viewport, intent: 'print' }).promise;
                const blob = await new Promise((res, rej) => canvas.toBlob(b => b ? res(b) : rej(new Error("Sayfa dönüştürülemedi.")), mime, 0.92));
                downloadBlob(blob, `${prefix}_${i}.${format}`);

                // Tarayıcının art arda indirmeleri engellememesi için kısa bekleme
                await new Promise(r => setTimeout(r, 350));
            }
            statusEl.textContent = '';
            showToast(`${pdfDoc.numPages} sayfa görsel olarak indirildi!`, "success");
        } catch (err) {
            console.error("PDF2Img Error:", err);
            statusEl.textContent = '';
            showToast("Dönüştürme sırasında bir hata oluştu.", "error");
        } finally {
            btnConvertPdf.disabled = false;
        }
    });
}
