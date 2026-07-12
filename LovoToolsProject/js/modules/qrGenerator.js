import { showToast } from '../utils.js';

/**
 * QR Kod Oluşturucu + Okuyucu Modülü
 * Oluşturma: önizleme canvas ile; indirme seçilen format (PNG/JPG/WebP/SVG)
 * ve boyutta yeniden üretilir. Okuma: jsQR (vendor, lazy-load) ile görselden çözülür.
 */

let jsQrPromise = null;
function loadJsQr() {
    if (window.jsQR) return Promise.resolve();
    if (jsQrPromise) return jsQrPromise;
    jsQrPromise = new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = 'vendor/jsqr/jsQR.js';
        s.onload = resolve;
        s.onerror = () => { jsQrPromise = null; reject(new Error("jsQR yüklenemedi")); };
        document.head.appendChild(s);
    });
    return jsQrPromise;
}

export function initQrGenerator() {
    const btnGenerateQR = document.getElementById('btn-generate-qr');
    const qrUrlInput = document.getElementById('qr-url-input');
    const qrResultBox = document.getElementById('qr-result-box');
    const qrContainer = document.getElementById('qr-container');
    const qrFilenameInput = document.getElementById('qr-filename-input');
    const btnDownloadQR = document.getElementById('btn-download-qr');
    const colorDarkInput = document.getElementById('qr-color-dark');
    const colorLightInput = document.getElementById('qr-color-light');
    const formatSelect = document.getElementById('qr-format-select');
    const sizeSelect = document.getElementById('qr-size-select');

    if (!btnGenerateQR || !qrUrlInput) return;

    let currentContent = null;

    /* --- Sekmeler: Oluşturucu / Okuyucu --- */
    const tabGenerate = document.getElementById('qr-tab-generate');
    const tabRead = document.getElementById('qr-tab-read');
    const sectionGenerate = document.getElementById('qr-generate-section');
    const sectionRead = document.getElementById('qr-read-section');

    if (tabGenerate && tabRead) {
        const switchTab = (mode) => {
            tabGenerate.classList.toggle('active', mode === 'generate');
            tabRead.classList.toggle('active', mode === 'read');
            sectionGenerate.classList.toggle('active', mode === 'generate');
            sectionRead.classList.toggle('active', mode === 'read');
        };
        tabGenerate.addEventListener('click', () => switchTab('generate'));
        tabRead.addEventListener('click', () => switchTab('read'));
    }

    /* --- QR Okuyucu --- */
    const readInput = document.getElementById('qr-read-input');
    const readResult = document.getElementById('qr-read-result');
    const readOutput = document.getElementById('qr-read-output');
    const readCopy = document.getElementById('qr-read-copy');
    const readOpen = document.getElementById('qr-read-open');

    if (readInput) {
        readInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            if (!file.type.startsWith('image/')) {
                showToast("Lütfen geçerli bir görsel dosyası seçin.", "error");
                return;
            }

            try {
                await loadJsQr();
                const bitmap = await createImageBitmap(file);
                // Çok büyük görselleri makul boyuta indir (jsQR performansı için)
                const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
                const cv = document.createElement('canvas');
                cv.width = Math.max(1, Math.round(bitmap.width * scale));
                cv.height = Math.max(1, Math.round(bitmap.height * scale));
                const ctx = cv.getContext('2d');
                ctx.drawImage(bitmap, 0, 0, cv.width, cv.height);
                const imageData = ctx.getImageData(0, 0, cv.width, cv.height);

                const code = window.jsQR(imageData.data, cv.width, cv.height);
                if (!code || !code.data) {
                    readResult.classList.add('hidden');
                    showToast("Görselde okunabilir bir QR kod bulunamadı.", "warning");
                    return;
                }

                readOutput.value = code.data;
                const isUrl = /^https?:\/\//i.test(code.data.trim());
                readOpen.classList.toggle('hidden', !isUrl);
                if (isUrl) readOpen.href = code.data.trim();
                readResult.classList.remove('hidden');
                showToast("QR kod başarıyla çözüldü!", "success");
            } catch (err) {
                console.error("QR Read:", err);
                showToast("QR kod okunamadı.", "error");
            }
            readInput.value = '';
        });

        readCopy.addEventListener('click', () => {
            if (!readOutput.value) return;
            navigator.clipboard.writeText(readOutput.value)
                .then(() => showToast("İçerik kopyalandı!", "success"))
                .catch(() => showToast("Kopyalama başarısız oldu.", "error"));
        });
    }

    function getColors() {
        return {
            dark: (colorDarkInput && colorDarkInput.value) || '#000000',
            light: (colorLightInput && colorLightInput.value) || '#ffffff'
        };
    }

    async function renderPreview(content) {
        const canvas = await QRCode.toCanvas(content, {
            width: 250,
            margin: 2,
            color: getColors(),
            errorCorrectionLevel: 'H'
        });
        canvas.style.borderRadius = '8px';
        qrContainer.innerHTML = "";
        qrContainer.appendChild(canvas);
    }

    /* --- QR Generation --- */
    btnGenerateQR.addEventListener('click', async () => {
        const content = qrUrlInput.value.trim();
        if (!content) {
            showToast("Lütfen QR koda dönüştürülecek bir içerik girin.", "error");
            return;
        }
        if (content.length > 2000) {
            showToast("İçerik çok uzun. QR kod en fazla ~2000 karakter alabilir.", "error");
            return;
        }
        if (typeof QRCode === 'undefined') {
            showToast("QR Kod kütüphanesi yüklenemedi. Sayfayı yenileyin.", "error");
            return;
        }

        btnGenerateQR.disabled = true;
        const originalHtml = btnGenerateQR.innerHTML;
        btnGenerateQR.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Oluşturuluyor';

        try {
            await renderPreview(content);
            currentContent = content;
            qrResultBox.classList.remove('hidden');
            showToast("QR Kod başarıyla oluşturuldu!", "success");
            if (qrFilenameInput) qrFilenameInput.focus();
        } catch (err) {
            console.error("QR Error:", err);
            showToast("QR Kod oluşturulurken bir hata oluştu.", "error");
        } finally {
            btnGenerateQR.disabled = false;
            btnGenerateQR.innerHTML = originalHtml;
        }
    });

    // Renk değişince mevcut önizlemeyi canlı güncelle
    [colorDarkInput, colorLightInput].forEach(input => {
        if (!input) return;
        input.addEventListener('change', () => {
            if (currentContent) {
                renderPreview(currentContent).catch(() => {});
            }
        });
    });

    qrUrlInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            btnGenerateQR.click();
        }
    });

    /* --- Export & Download --- */
    async function buildRasterBlob(format, size) {
        const colors = getColors();
        const qrCanvas = await QRCode.toCanvas(currentContent, {
            width: size,
            margin: 2,
            color: colors,
            errorCorrectionLevel: 'H'
        });

        // Çerçeveli dışa aktarım: arka plan rengiyle dolgulu pay bırakılır
        const padding = Math.round(size * 0.06);
        const out = document.createElement('canvas');
        out.width = qrCanvas.width + padding * 2;
        out.height = qrCanvas.height + padding * 2;
        const ctx = out.getContext('2d');

        ctx.fillStyle = colors.light;
        if (format !== 'jpg' && ctx.roundRect) {
            // JPEG şeffaflık desteklemez; yuvarlak köşe sadece PNG/WebP'de
            ctx.beginPath();
            ctx.roundRect(0, 0, out.width, out.height, Math.round(padding * 0.8));
            ctx.fill();
        } else {
            ctx.fillRect(0, 0, out.width, out.height);
        }
        ctx.drawImage(qrCanvas, padding, padding);

        const mime = format === 'jpg' ? 'image/jpeg' : format === 'webp' ? 'image/webp' : 'image/png';
        return new Promise((resolve, reject) => {
            out.toBlob(blob => blob ? resolve(blob) : reject(new Error("Görüntü oluşturulamadı.")), mime, 0.92);
        });
    }

    async function buildSvgBlob(size) {
        const svgString = await QRCode.toString(currentContent, {
            type: 'svg',
            width: size,
            margin: 2,
            color: getColors(),
            errorCorrectionLevel: 'H'
        });
        return new Blob([svgString], { type: 'image/svg+xml' });
    }

    if (btnDownloadQR) {
        btnDownloadQR.addEventListener('click', async () => {
            if (!currentContent) {
                showToast("İndirilecek QR kod bulunamadı. Önce oluşturun.", "error");
                return;
            }

            const filename = (qrFilenameInput && qrFilenameInput.value.trim()) || 'qr_kodu';
            const format = (formatSelect && formatSelect.value) || 'png';
            const size = parseInt((sizeSelect && sizeSelect.value) || '512', 10);

            btnDownloadQR.disabled = true;
            try {
                const blob = format === 'svg'
                    ? await buildSvgBlob(size)
                    : await buildRasterBlob(format, size);

                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = url;
                a.download = `${filename}.${format}`;
                document.body.appendChild(a);
                a.click();
                setTimeout(() => {
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                }, 100);

                showToast(`QR Kod ${format.toUpperCase()} olarak indirildi!`, "success");
            } catch (err) {
                console.error("QR Download Error:", err);
                showToast("QR Kod indirilirken bir hata oluştu.", "error");
            } finally {
                btnDownloadQR.disabled = false;
            }
        });
    }
}
