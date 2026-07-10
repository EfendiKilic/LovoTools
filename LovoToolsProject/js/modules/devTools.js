import { showToast } from '../utils.js';

/**
 * Geliştirici Mini Araçları Modülü
 * Base64, URL Encode, UUID, Hash (Web Crypto), Şifre Üretici — hepsi lokal, sıfır bağımlılık.
 */
export function initDevTools() {
    const panel = document.getElementById('dev-tools-panel');
    if (!panel) return;

    /* --- Tabs --- */
    const tabs = panel.querySelectorAll('.devt-tab');
    const sections = panel.querySelectorAll('.devt-section');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.toggle('active', t === tab));
            sections.forEach(s => s.classList.toggle('active', s.dataset.section === tab.dataset.tab));
        });
    });

    /* --- Copy buttons --- */
    panel.querySelectorAll('.devt-copy-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const target = document.getElementById(btn.dataset.copyTarget);
            if (!target || !target.value) {
                showToast("Kopyalanacak bir sonuç yok.", "error");
                return;
            }
            navigator.clipboard.writeText(target.value)
                .then(() => showToast("Kopyalandı!", "success"))
                .catch(() => showToast("Kopyalama başarısız oldu.", "error"));
        });
    });

    /* --- Base64 (UTF-8 güvenli) --- */
    const b64Input = document.getElementById('devt-b64-input');
    const b64Output = document.getElementById('devt-b64-output');

    document.getElementById('devt-b64-encode').addEventListener('click', () => {
        try {
            const bytes = new TextEncoder().encode(b64Input.value);
            let bin = '';
            bytes.forEach(b => bin += String.fromCharCode(b));
            b64Output.value = btoa(bin);
        } catch (e) {
            showToast("Encode edilemedi.", "error");
        }
    });

    document.getElementById('devt-b64-decode').addEventListener('click', () => {
        try {
            const bin = atob(b64Input.value.trim());
            const bytes = Uint8Array.from(bin, c => c.charCodeAt(0));
            b64Output.value = new TextDecoder().decode(bytes);
        } catch (e) {
            showToast("Geçersiz Base64 girdisi.", "error");
        }
    });

    /* --- URL Encode --- */
    const urlInput = document.getElementById('devt-url-input');
    const urlOutput = document.getElementById('devt-url-output');

    document.getElementById('devt-url-encode').addEventListener('click', () => {
        urlOutput.value = encodeURIComponent(urlInput.value);
    });

    document.getElementById('devt-url-decode').addEventListener('click', () => {
        try {
            urlOutput.value = decodeURIComponent(urlInput.value.trim());
        } catch (e) {
            showToast("Geçersiz URL kodlaması.", "error");
        }
    });

    /* --- UUID v4 --- */
    document.getElementById('devt-uuid-generate').addEventListener('click', () => {
        const count = parseInt(document.getElementById('devt-uuid-count').value, 10);
        const uuids = [];
        for (let i = 0; i < count; i++) {
            uuids.push(crypto.randomUUID ? crypto.randomUUID() : fallbackUuid());
        }
        document.getElementById('devt-uuid-output').value = uuids.join('\n');
    });

    function fallbackUuid() {
        const bytes = crypto.getRandomValues(new Uint8Array(16));
        bytes[6] = (bytes[6] & 0x0f) | 0x40;
        bytes[8] = (bytes[8] & 0x3f) | 0x80;
        const hex = [...bytes].map(b => b.toString(16).padStart(2, '0')).join('');
        return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
    }

    /* --- Hash (Web Crypto) --- */
    document.getElementById('devt-hash-generate').addEventListener('click', async () => {
        const text = document.getElementById('devt-hash-input').value;
        const algo = document.getElementById('devt-hash-algo').value;
        try {
            const data = new TextEncoder().encode(text);
            const digest = await crypto.subtle.digest(algo, data);
            document.getElementById('devt-hash-output').value =
                [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('');
        } catch (e) {
            showToast("Hash hesaplanamadı.", "error");
        }
    });

    /* --- Şifre Üretici --- */
    const pwLength = document.getElementById('devt-pw-length');
    const pwLengthValue = document.getElementById('devt-pw-length-value');
    pwLength.addEventListener('input', () => { pwLengthValue.textContent = pwLength.value; });

    document.getElementById('devt-pw-generate').addEventListener('click', () => {
        const sets = [];
        if (document.getElementById('devt-pw-upper').checked) sets.push('ABCDEFGHJKLMNPQRSTUVWXYZ');
        if (document.getElementById('devt-pw-lower').checked) sets.push('abcdefghijkmnpqrstuvwxyz');
        if (document.getElementById('devt-pw-digits').checked) sets.push('23456789');
        if (document.getElementById('devt-pw-symbols').checked) sets.push('!@#$%^&*()-_=+[]{}<>?');

        if (!sets.length) {
            showToast("En az bir karakter türü seçmelisiniz.", "error");
            return;
        }

        const length = parseInt(pwLength.value, 10);
        const all = sets.join('');
        const rand = crypto.getRandomValues(new Uint32Array(length));
        const chars = [];

        // Her seçili kümeden en az bir karakter garanti edilir
        sets.forEach((set, i) => {
            chars.push(set[rand[i] % set.length]);
        });
        for (let i = sets.length; i < length; i++) {
            chars.push(all[rand[i] % all.length]);
        }

        // Fisher-Yates karıştırma
        const shuffleRand = crypto.getRandomValues(new Uint32Array(chars.length));
        for (let i = chars.length - 1; i > 0; i--) {
            const j = shuffleRand[i] % (i + 1);
            [chars[i], chars[j]] = [chars[j], chars[i]];
        }

        document.getElementById('devt-pw-output').value = chars.join('');
    });
}
