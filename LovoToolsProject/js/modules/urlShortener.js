import { showToast } from '../utils.js';

/**
 * URL Link Kısaltma Modülü
 * Birincil sağlayıcı TinyURL (tarayıcıdan CORS ile erişilebilir),
 * yedek sağlayıcı is.gd. Kısaltılan linkler localStorage'da saklanır.
 */

const HISTORY_KEY = 'lovo_url_history';
const HISTORY_LIMIT = 10;

async function shortenWithTinyUrl(longUrl) {
    const response = await fetch(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(longUrl)}`);
    if (!response.ok) throw new Error("TinyURL yanıt vermedi");
    const text = (await response.text()).trim();
    if (!/^https?:\/\/tinyurl\.com\//.test(text)) throw new Error("TinyURL geçersiz yanıt döndürdü");
    return text;
}

async function shortenWithIsGd(longUrl) {
    const response = await fetch(`https://is.gd/create.php?format=json&url=${encodeURIComponent(longUrl)}`);
    if (!response.ok) throw new Error("is.gd yanıt vermedi");
    const data = await response.json();
    if (!data.shorturl) throw new Error(data.errormessage || "is.gd geçersiz yanıt döndürdü");
    return data.shorturl;
}

function loadHistory() {
    try {
        const raw = localStorage.getItem(HISTORY_KEY);
        const list = raw ? JSON.parse(raw) : [];
        return Array.isArray(list) ? list : [];
    } catch (_) {
        return [];
    }
}

function saveHistory(list) {
    try {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(list.slice(0, HISTORY_LIMIT)));
    } catch (_) { /* depolama dolu/kapalıysa geçmiş tutulmaz */ }
}

export function initUrlShortener() {
    const btnShorten = document.getElementById('btn-shorten');
    const urlInput = document.getElementById('url-input');
    const resultDiv = document.getElementById('shortener-result');
    const shortenedUrlInput = document.getElementById('shortened-url');
    const btnCopyUrl = document.getElementById('btn-copy-url');
    const historySection = document.getElementById('url-history-section');
    const historyList = document.getElementById('url-history-list');
    const btnClearHistory = document.getElementById('btn-clear-history');

    if (!btnShorten || !urlInput) return;

    function copyToClipboard(text, onDone) {
        navigator.clipboard.writeText(text).then(() => {
            showToast("Bağlantı kopyalandı!", "success");
            if (onDone) onDone();
        }).catch(() => {
            showToast("Kopyalama başarısız oldu.", "error");
        });
    }

    /* --- History Rendering (XSS'e karşı DOM API ile kurulur) --- */
    function renderHistory() {
        if (!historySection || !historyList) return;
        const items = loadHistory();

        historyList.innerHTML = '';
        if (items.length === 0) {
            historySection.classList.add('hidden');
            return;
        }
        historySection.classList.remove('hidden');

        items.forEach(item => {
            const row = document.createElement('div');
            row.className = 'url-history-item';

            const info = document.createElement('div');
            info.className = 'url-history-info';

            const shortLink = document.createElement('a');
            shortLink.className = 'url-history-short';
            shortLink.href = item.short;
            shortLink.target = '_blank';
            shortLink.rel = 'noopener noreferrer';
            shortLink.textContent = item.short;

            const original = document.createElement('span');
            original.className = 'url-history-original';
            original.textContent = item.long.length > 60 ? item.long.slice(0, 60) + '…' : item.long;
            original.title = item.long;

            info.appendChild(shortLink);
            info.appendChild(original);

            const btnCopy = document.createElement('button');
            btnCopy.className = 'btn btn-icon btn-outline url-history-copy';
            btnCopy.innerHTML = '<i class="ph ph-copy"></i>';
            btnCopy.addEventListener('click', () => copyToClipboard(item.short));

            row.appendChild(info);
            row.appendChild(btnCopy);
            historyList.appendChild(row);
        });
    }

    function addToHistory(longUrl, shortUrl) {
        const items = loadHistory().filter(i => i.long !== longUrl);
        items.unshift({ long: longUrl, short: shortUrl, date: Date.now() });
        saveHistory(items);
        renderHistory();
    }

    if (btnClearHistory) {
        btnClearHistory.addEventListener('click', () => {
            saveHistory([]);
            renderHistory();
            showToast("Geçmiş temizlendi.", "info");
        });
    }

    renderHistory();

    /* --- Shortening (sağlayıcı zinciri: TinyURL -> is.gd) --- */
    btnShorten.addEventListener('click', async () => {
        const longUrl = urlInput.value.trim();
        if (!longUrl) {
            showToast("Lütfen bir bağlantı adresi (URL) girin.", "error");
            return;
        }

        let parsed;
        try {
            parsed = new URL(longUrl);
        } catch (e) {
            showToast("Geçersiz bir bağlantı girdiniz (örn: https://ornek.com).", "error");
            return;
        }
        if (!/^https?:$/.test(parsed.protocol)) {
            showToast("Yalnızca http:// veya https:// bağlantıları kısaltılabilir.", "error");
            return;
        }

        const originalBtnHtml = btnShorten.innerHTML;
        btnShorten.disabled = true;
        btnShorten.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Kısaltılıyor';
        resultDiv.classList.add('hidden');

        try {
            let shortUrl;
            try {
                shortUrl = await shortenWithTinyUrl(longUrl);
            } catch (primaryErr) {
                console.warn("TinyURL başarısız, is.gd deneniyor:", primaryErr);
                shortUrl = await shortenWithIsGd(longUrl);
            }

            shortenedUrlInput.value = shortUrl;
            resultDiv.classList.remove('hidden');
            addToHistory(longUrl, shortUrl);
            showToast("Bağlantı başarıyla kısaltıldı!", "success");
        } catch (error) {
            console.error("Shortener Error:", error);
            showToast("Bağlantı kısaltılamadı. İnternet bağlantınızı kontrol edip tekrar deneyin.", "error");
        } finally {
            btnShorten.disabled = false;
            btnShorten.innerHTML = originalBtnHtml;
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
            copyToClipboard(shortenedUrlInput.value, () => {
                const originalHtml = btnCopyUrl.innerHTML;
                btnCopyUrl.innerHTML = '<i class="ph ph-check"></i>';
                setTimeout(() => { btnCopyUrl.innerHTML = originalHtml; }, 2000);
            });
        });
    }
}
