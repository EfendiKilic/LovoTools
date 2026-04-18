import { showToast, preventDefaults } from '../utils.js';

/**
 * Pro PDF İşlemleri Modülü - File & Page Logic Ayrılmış
 */
export function initPdfEditor() {
    let selectedFiles = []; // { file, name, pagesCount, buffer }
    let currentMode = 'merge';
    let selectedPageIndices = new Set();
    let sortable = null;

    const pdfPanel = document.getElementById('pdf-editor-panel');
    if (!pdfPanel) return;

    const pdfHome = pdfPanel.querySelector('#pdf-home');
    const pdfWorkspace = pdfPanel.querySelector('#pdf-workspace');
    const pdfModeTitle = pdfPanel.querySelector('#pdf-mode-title');
    const pdfInput = document.getElementById('pdf-input');
    const pdfPagesGrid = document.getElementById('pdf-pages-grid');
    const loadingIndicator = document.getElementById('pdf-loading-indicator');
    

    const infoName = document.getElementById('pdf-info-name');
    const infoPages = document.getElementById('pdf-info-pages');
    const splitOptions = document.getElementById('split-options');
    const mergeOptions = document.getElementById('merge-options');
    const organizeOptions = document.getElementById('organize-options');
    const rangeInput = document.getElementById('pdf-range-input');
    const btnProcessPdf = document.getElementById('btn-process-pdf');


    if (window.Sortable) {
        sortable = new Sortable(pdfPagesGrid, {
            animation: 150,
            ghostClass: 'pdf-page-ghost',
            onEnd: () => {
                if (currentMode === 'split') updateRangeInputFromSelection();
            }
        });
    }


    /* --- Workspace & Tool Switching --- */
    window.switchPdfTool = (mode) => {
        if (mode === 'encrypt' || mode === 'decrypt') {
            showToast("Bu özellik geliştirme aşamasındadır.", "info");
            return;
        }

        if (mode === 'home') {
            pdfHome.classList.add('active');
            pdfWorkspace.classList.add('hidden');
            resetPdfTool();
        } else {
            currentMode = mode;
            pdfHome.classList.remove('active');
            pdfWorkspace.classList.remove('hidden');
            
            const titles = {
                'merge': 'PDF Birleştir (Dosya Bazlı)',
                'organize': 'Sayfa Düzenle (Sayfa Bazlı)',
                'split': 'Sayfaları Ayır'
            };
            pdfModeTitle.textContent = titles[mode];
            

            splitOptions.classList.add('hidden');
            mergeOptions.classList.add('hidden');
            organizeOptions.classList.add('hidden');

            if (mode === 'split') splitOptions.classList.remove('hidden');
            else if (mode === 'merge') mergeOptions.classList.remove('hidden');
            else if (mode === 'organize') organizeOptions.classList.remove('hidden');


            pdfInput.multiple = (mode === 'merge');
            pdfInput.click();
        }
    };

    function resetPdfTool() {
        selectedFiles = [];
        selectedPageIndices.clear();
        pdfPagesGrid.innerHTML = '';
        pdfInput.value = '';
    }

    pdfInput.addEventListener('change', (e) => {
        if (e.target.files.length) {
            handlePdfSelect(e.target.files);
        }
    });

    /* --- File Parsing & Thumbnail Rendering --- */
    async function handlePdfSelect(files) {
        if (currentMode !== 'merge') {
            selectedFiles = [];
            pdfPagesGrid.innerHTML = '';
        }

        loadingIndicator.classList.remove('hidden');
        
        for (const file of files) {
            try {
                const arrayBuffer = await file.arrayBuffer();
                const doc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
                
                const fileEntry = {
                    file: file,
                    name: file.name,
                    pagesCount: doc.numPages,
                    buffer: arrayBuffer
                };
                
                selectedFiles.push(fileEntry);

                if (currentMode === 'merge') {
                    // Sadece 1. sayfayı önizleme olarak ekle (Dosya kadi olarak)
                    await renderThumbnail(doc, 1, selectedFiles.length - 1, true);
                } else {
                    // Tüm sayfaları ekle
                    for (let i = 1; i <= doc.numPages; i++) {
                        await renderThumbnail(doc, i, selectedFiles.length - 1, false);
                    }
                }
            } catch (err) {
                console.error(err);
                showToast(`Dosya yüklenemedi: ${file.name}`, "error");
            }
        }

        updateSidebarInfo();
        loadingIndicator.classList.add('hidden');
    }

    async function renderThumbnail(doc, pageNum, fileIndex, isFileMode) {
        const page = await doc.getPage(pageNum);
        const viewport = page.getViewport({ scale: 0.3 });

        const card = document.createElement('div');
        card.className = 'pdf-page-card';
        card.dataset.fileIndex = fileIndex;
        card.dataset.pageIndex = pageNum - 1;
        
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        
        const context = canvas.getContext('2d');
        await page.render({ canvasContext: context, viewport: viewport }).promise;
        
        if (isFileMode) {
            card.innerHTML = `<span class="page-num">Dosya ${fileIndex + 1} (${selectedFiles[fileIndex].pagesCount} S.)</span>`;
            card.innerHTML += `<div class="file-badge">${selectedFiles[fileIndex].name}</div>`;
        } else {
            card.innerHTML = `<span class="page-num">${pageNum}</span>`;
        }
        
        card.appendChild(canvas);
        card.addEventListener('click', () => {
            if (currentMode === 'split') togglePageSelection(card, pageNum - 1);
        });
        
        pdfPagesGrid.appendChild(card);
    }

    /* --- Page Selection & Range Logic --- */
    function togglePageSelection(card, index) {
        if (selectedPageIndices.has(index)) {
            selectedPageIndices.delete(index);
            card.classList.remove('selected');
        } else {
            selectedPageIndices.add(index);
            card.classList.add('selected');
        }
        updateRangeInputFromSelection();
    }

    function updateRangeInputFromSelection() {
        const sorted = Array.from(selectedPageIndices).sort((a,b) => a-b);
        rangeInput.value = sorted.map(i => i + 1).join(', ');
    }

    function updateSidebarInfo() {
        if (selectedFiles.length === 0) {
            infoName.textContent = "-";
            infoPages.textContent = "0";
            btnProcessPdf.disabled = true;
            return;
        }

        if (currentMode === 'merge') {
            infoName.textContent = `${selectedFiles.length} Dosya`;
            infoPages.textContent = selectedFiles.reduce((acc, f) => acc + f.pagesCount, 0);
            
            if (selectedFiles.length < 2) {
                btnProcessPdf.disabled = true;
                btnProcessPdf.innerHTML = '<i class="ph ph-warning"></i> En az 2 dosya gerekli';
            } else {
                btnProcessPdf.disabled = false;
                btnProcessPdf.innerHTML = '<i class="ph ph-check"></i> Birleştirmeyi Başlat';
            }
        } else {
            infoName.textContent = selectedFiles[0].name;
            infoPages.textContent = selectedFiles[0].pagesCount;
            btnProcessPdf.disabled = false;
            btnProcessPdf.innerHTML = '<i class="ph ph-check"></i> İşlemi Başlat';
        }
    }

    btnProcessPdf.addEventListener('click', async () => {
        if (selectedFiles.length === 0) return;
        btnProcessPdf.disabled = true;
        const originalText = btnProcessPdf.innerHTML;
        btnProcessPdf.innerHTML = '<i class="ph ph-spinner ph-spin"></i> İşleniyor...';

        try {
            if (currentMode === 'merge') await handleMerge();
            else if (currentMode === 'organize') await handleOrganize();
            else if (currentMode === 'split') await handleSplit();
        } catch (error) {
            console.error(error);
            showToast("Hata: " + error.message, "error");
        } finally {
            btnProcessPdf.disabled = false;
            btnProcessPdf.innerHTML = originalText;
        }
    });

    /* --- Core PDF Processing Kernels --- */
    async function handleMerge() {
        const { PDFDocument } = window.PDFLib;
        const mergedPdf = await PDFDocument.create();
        const cards = pdfPagesGrid.querySelectorAll('.pdf-page-card');
        
        for (const card of cards) {
            const fileIdx = parseInt(card.dataset.fileIndex);
            const fileObj = selectedFiles[fileIdx];
            const pdf = await PDFDocument.load(fileObj.buffer);
            const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
            copiedPages.forEach((page) => mergedPdf.addPage(page));
        }

        const pdfBytes = await mergedPdf.save();
        downloadPdf(pdfBytes, "birlesmis_dosyalar.pdf");
        showToast("Dosyalar başarıyla birleştirildi!", "success");
    }

    async function handleOrganize() {
        const { PDFDocument } = window.PDFLib;
        const fileObj = selectedFiles[0];
        const sourcePdf = await PDFDocument.load(fileObj.buffer);
        const organizedPdf = await PDFDocument.create();
        
        const cards = pdfPagesGrid.querySelectorAll('.pdf-page-card');
        const indices = Array.from(cards).map(c => parseInt(c.dataset.pageIndex));
        
        const copiedPages = await organizedPdf.copyPages(sourcePdf, indices);
        copiedPages.forEach((page) => organizedPdf.addPage(page));

        const pdfBytes = await organizedPdf.save();
        downloadPdf(pdfBytes, `${fileObj.name.replace(".pdf", "")}_duzenlenmis.pdf`);
        showToast("Sayfa sırası güncellendi!", "success");
    }

    async function handleSplit() {
        const fileObj = selectedFiles[0];
        const range = rangeInput.value.trim();
        if (!range) throw new Error("Lütfen sayfa seçin.");

        const { PDFDocument } = window.PDFLib;
        const sourcePdf = await PDFDocument.load(fileObj.buffer);
        const splitPdf = await PDFDocument.create();

        const pagesToExtract = parsePageRange(range, fileObj.pagesCount);
        const copiedPages = await splitPdf.copyPages(sourcePdf, pagesToExtract);
        copiedPages.forEach((page) => splitPdf.addPage(page));

        const pdfBytes = await splitPdf.save();
        downloadPdf(pdfBytes, `${fileObj.name.replace(".pdf", "")}_kesit.pdf`);
        showToast("Seçilen sayfalar ayrıldı!", "success");
    }

    function parsePageRange(rangeStr, maxPages) {
        const pages = new Set();
        const parts = rangeStr.split(/[\s,]+/);
        parts.forEach(part => {
            if (part.includes('-')) {
                const [start, end] = part.split('-').map(n => parseInt(n.trim()));
                if (!isNaN(start) && !isNaN(end)) {
                    for (let i = Math.min(start, end); i <= Math.max(start, end); i++) {
                        if (i > 0 && i <= maxPages) pages.add(i - 1);
                    }
                }
            } else {
                const num = parseInt(part.trim());
                if (!isNaN(num) && num > 0 && num <= maxPages) pages.add(num - 1);
            }
        });
        return Array.from(pages).sort((a,b) => a-b);
    }

    function downloadPdf(bytes, filename) {
        const blob = new Blob([bytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        URL.revokeObjectURL(url);
    }
}
