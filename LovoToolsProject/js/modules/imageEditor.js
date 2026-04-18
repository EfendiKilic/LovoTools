import { showToast, formatBytes, preventDefaults } from '../utils.js';

/**
 * Görsel Düzenleyici Modülü - Butonlu Seçim Yapısı
 */
export function initImageEditor() {
    const uploadZone = document.getElementById('image-upload-zone');
    const workspace = document.getElementById('image-workspace');
    const input = document.getElementById('image-input');
    const preview = document.getElementById('image-preview');
    
    const infoName = document.getElementById('image-info-name');
    const originalSize = document.getElementById('image-original-size');
    const imageDimensions = document.getElementById('image-dimensions');
    
    const formatSelect = document.getElementById('image-export-format');
    const newDimensionsPreview = document.getElementById('new-dimensions-preview');
    
    const btnProcess = document.getElementById('btn-process-image');
    const resultContainer = document.getElementById('image-result-container');
    const newSizeSpan = document.getElementById('image-new-size');
    const saveRatioText = document.getElementById('image-save-ratio');
    const btnDownload = document.getElementById('btn-download-image');

    if (!uploadZone || !input) return;

    let currentFile = null;
    let processedBlob = null;
    let processedUrl = null;
    let originalWidth = 0;
    let originalHeight = 0;
    
    let selectedQuality = 80;
    let selectedScale = 100;

    /* --- Event Listeners & UI Setup --- */
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        uploadZone.addEventListener(eventName, preventDefaults, false);
    });

    uploadZone.addEventListener('dragover', () => uploadZone.classList.add('dragover'));
    uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('dragover'));

    uploadZone.addEventListener('drop', (e) => {
        uploadZone.classList.remove('dragover');
        const files = e.dataTransfer.files;
        if (files.length) handleImageSelect(files[0]);
    });

    input.addEventListener('change', (e) => {
        if (e.target.files.length) handleImageSelect(e.target.files[0]);
    });

    setupToggleGroup('quality-toggles', (val) => {
        selectedQuality = parseInt(val);
    });

    setupToggleGroup('scale-toggles', (val) => {
        selectedScale = parseInt(val);
        updateEstimatedDimensions();
    });

    function setupToggleGroup(groupId, callback) {
        const group = document.getElementById(groupId);
        if (!group) return;

        const btns = group.querySelectorAll('.toggle-btn');
        btns.forEach(btn => {
            btn.addEventListener('click', () => {
                btns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                callback(btn.dataset.value);
            });
        });
    }

    /* --- Image File Input Handling --- */
    function handleImageSelect(file) {
        if (!file.type.startsWith('image/')) {
            showToast("Lütfen geçerli bir görsel dosyası seçin.", "error");
            return;
        }

        currentFile = file;
        infoName.textContent = file.name;
        originalSize.textContent = formatBytes(file.size);

        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                originalWidth = img.naturalWidth;
                originalHeight = img.naturalHeight;
                imageDimensions.textContent = `${originalWidth} x ${originalHeight} px`;
                
                preview.src = e.target.result;
                updateEstimatedDimensions();

                uploadZone.classList.remove('active');
                uploadZone.style.display = 'none';
                workspace.classList.remove('hidden');
                workspace.style.display = 'flex';
                resultContainer.classList.add('hidden');
                resultContainer.style.display = 'none';
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    function updateEstimatedDimensions() {
        if (!originalWidth || !originalHeight) return;
        const ratio = selectedScale / 100;
        const newW = Math.round(originalWidth * ratio);
        const newH = Math.round(originalHeight * ratio);
        newDimensionsPreview.textContent = `Tahmini: ${newW} x ${newH} px`;
    }

    /* --- Compression & Export Kernel --- */
    btnProcess.addEventListener('click', async () => {
        if (!currentFile) return;

        btnProcess.disabled = true;
        const originalText = btnProcess.innerHTML;
        btnProcess.innerHTML = '<i class="ph ph-spinner ph-spin"></i> İşleniyor...';

        try {
            const scaleRatio = selectedScale / 100;
            const targetWidth = Math.round(originalWidth * scaleRatio);

            const options = {
                maxSizeMB: 10,
                maxWidthOrHeight: targetWidth,
                useWebWorker: true,
                initialQuality: selectedQuality / 100,
                fileType: formatSelect.value
            };

            if (typeof imageCompression === 'undefined') {
                throw new Error("Sıkıştırma kütüphanesi yüklenemedi.");
            }

            processedBlob = await imageCompression(currentFile, options);
            
            if (processedUrl) URL.revokeObjectURL(processedUrl);
            processedUrl = URL.createObjectURL(processedBlob);
            
            newSizeSpan.textContent = formatBytes(processedBlob.size);
            
            const savedBytes = currentFile.size - processedBlob.size;
            if (savedBytes > 0) {
                const ratio = Math.round((savedBytes / currentFile.size) * 100);
                saveRatioText.textContent = `%${ratio} tasarruf sağlandı!`;
            } else {
                saveRatioText.textContent = "Optimize edildi.";
            }

            resultContainer.classList.remove('hidden');
            resultContainer.style.display = 'block';
            showToast("Görsel başarıyla optimize edildi!", "success");

        } catch (error) {
            console.error(error);
            showToast("Hata: " + error.message, "error");
        } finally {
            btnProcess.disabled = false;
            btnProcess.innerHTML = originalText;
        }
    });

    btnDownload.addEventListener('click', () => {
        if (!processedBlob || !processedUrl) return;
        const extension = formatSelect.value.split('/')[1].replace('jpeg', 'jpg');
        const fileName = currentFile.name.split('.')[0] + '_lovo.' + extension;

        const link = document.createElement('a');
        link.href = processedUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });
}
