import { showToast } from '../utils.js';

/**
 * URL Link Kısaltma Modülü
 */
export function initUrlShortener() {
    const btnShorten = document.getElementById('btn-shorten');
    const urlInput = document.getElementById('url-input');
    const resultDiv = document.getElementById('shortener-result');
    const shortenedUrlInput = document.getElementById('shortened-url');
    const btnCopyUrl = document.getElementById('btn-copy-url');

    if (!btnShorten || !urlInput) return;

    /* --- API Integration & Shortening --- */
    btnShorten.addEventListener('click', async () => {
        const longUrl = urlInput.value.trim();
        if (!longUrl) {
            showToast("Lütfen bir bağlantı adresi (URL) girin.", "error");
            return;
        }

        try {
            new URL(longUrl);
        } catch (e) {
            showToast("Geçersiz bir bağlantı girdiniz (örn: https://ornek.com).", "error");
            return;
        }

        btnShorten.disabled = true;
        btnShorten.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Kısaltılıyor';
        resultDiv.classList.add('hidden');

        try {
            const response = await fetch(`https://is.gd/create.php?format=json&url=${encodeURIComponent(longUrl)}`);
            if (!response.ok) throw new Error("Ağ hatası");
            const data = await response.json();

            if (data.shorturl) {
                shortenedUrlInput.value = data.shorturl;
                resultDiv.classList.remove('hidden');
                showToast("Bağlantı başarıyla kısaltıldı!", "success");
            } else if (data.errormessage) {
                throw new Error(data.errormessage);
            } else {
                throw new Error("Geçersiz API yanıtı");
            }
        } catch (error) {
            console.error("Shortener Error:", error);
            showToast("Hata: " + (error.message === 'Ağ hatası' ? "Bağlantı kısaltılamadı, internet bağlantınızı kontrol edin." : "Kısaltma yapılamadı."), "error");
        } finally {
            btnShorten.disabled = false;
            btnShorten.innerHTML = 'Kısalt';
        }
    });
    

    urlInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            btnShorten.click();
        }
    });

    /* --- Clipboard & Copy Management --- */
    if (btnCopyUrl && shortenedUrlInput) {
        btnCopyUrl.addEventListener('click', () => {
            shortenedUrlInput.select();
            shortenedUrlInput.setSelectionRange(0, 99999); 
            
            navigator.clipboard.writeText(shortenedUrlInput.value).then(() => {
                const originalHtml = btnCopyUrl.innerHTML;
                btnCopyUrl.innerHTML = '<i class="ph ph-check"></i>';
                btnCopyUrl.classList.replace('btn-success', 'btn-primary');
                showToast("Bağlantı kopyalandı!", "success");
                
                setTimeout(() => {
                    btnCopyUrl.innerHTML = originalHtml;
                    btnCopyUrl.classList.replace('btn-primary', 'btn-success');
                }, 2000);
            }).catch(err => {
                showToast("Kopyalama başarısız oldu.", "error");
            });
        });
    }
}
