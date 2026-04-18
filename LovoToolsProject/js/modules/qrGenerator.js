import { showToast } from '../utils.js';

export function initQrGenerator() {
    const btnGenerateQR = document.getElementById('btn-generate-qr');
    const qrUrlInput = document.getElementById('qr-url-input');
    const qrResultBox = document.getElementById('qr-result-box');
    const qrContainer = document.getElementById('qr-container');
    const qrFilenameInput = document.getElementById('qr-filename-input');
    const btnDownloadQR = document.getElementById('btn-download-qr');

    if (!btnGenerateQR || !qrUrlInput) return;

    /* --- QR Generation Logic --- */
    btnGenerateQR.addEventListener('click', () => {
        const url = qrUrlInput.value.trim();
        if (!url) {
            showToast("Lütfen QR koda dönüştürülecek bir bağlantı girin.", "error");
            return;
        }

        btnGenerateQR.disabled = true;
        btnGenerateQR.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Oluşturuluyor';
        qrResultBox.classList.add('hidden');

        try {
            if (typeof QRCode === 'undefined') {
                throw new Error("QR Kod kütüphanesi yüklenemedi.");
            }

            qrContainer.innerHTML = "";
            
            QRCode.toCanvas(url, {
                width: 250,
                margin: 2,
                color: {
                    dark: "#000000",
                    light: "#ffffff"
                },
                errorCorrectionLevel: 'H'
            }, (err, canvas) => {
                if (err) throw err;
                
                qrContainer.appendChild(canvas);
                btnGenerateQR.disabled = false;
                btnGenerateQR.innerHTML = '<i class="ph ph-qr-code"></i> Oluştur';
                qrResultBox.classList.remove('hidden');
                showToast("QR Kod başarıyla oluşturuldu!", "success");
                qrFilenameInput.focus();
            });

        } catch (err) {
            console.error("QR Error:", err);
            btnGenerateQR.disabled = false;
            btnGenerateQR.innerHTML = '<i class="ph ph-qr-code"></i> Oluştur';
            showToast(err.message || "QR Kod oluşturulurken bir hata oluştu.", "error");
        }
    });

    qrUrlInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            btnGenerateQR.click();
        }
    });

    /* --- Framed Export & Download --- */
    if (btnDownloadQR && qrContainer) {
        btnDownloadQR.addEventListener('click', () => {
            const filename = (qrFilenameInput.value.trim() || 'qr_kodu');
            
            const canvas = qrContainer.querySelector('canvas');
            if (!canvas) {
                showToast("İndirilecek QR kod bulunamadı.", "error");
                return;
            }
            
            const padding = 20;
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = canvas.width + (padding * 2);
            tempCanvas.height = canvas.height + (padding * 2);
            const ctx = tempCanvas.getContext('2d');
            
            ctx.fillStyle = '#ffffff';
            if (ctx.roundRect) {
                ctx.beginPath();
                ctx.roundRect(0, 0, tempCanvas.width, tempCanvas.height, 16);
                ctx.fill();
            } else {
                ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
            }
            
            ctx.drawImage(canvas, padding, padding);
            
            const dataUrl = tempCanvas.toDataURL("image/png");
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = dataUrl;
            a.download = filename + '.png';
            document.body.appendChild(a);
            a.click();
            
            setTimeout(() => {
                document.body.removeChild(a);
            }, 100);
            
            showToast("QR Kod çerçeveli biçimde indirildi!", "success");
        });
    }
}
