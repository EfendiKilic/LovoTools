import { showToast } from '../utils.js';

/**
 * Renk Araçları — görselden palet çıkarma + HEX/RGB/HSL dönüştürücü.
 * Saf canvas, sıfır bağımlılık.
 */

function rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
}

function hexToRgb(hex) {
    const m = hex.trim().match(/^#?([0-9a-f]{6}|[0-9a-f]{3})$/i);
    if (!m) return null;
    let h = m[1];
    if (h.length === 3) h = h.split('').map(c => c + c).join('');
    const n = parseInt(h, 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0;
    const l = (max + min) / 2;
    if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        else if (max === g) h = ((b - r) / d + 2) / 6;
        else h = ((r - g) / d + 4) / 6;
    }
    return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

/**
 * Basit ama etkili palet çıkarma: pikselleri 4 bit/kanal kovalarına toplayıp
 * en yoğun, birbirinden yeterince farklı ilk 8 rengi seçer.
 */
function extractPalette(imageData, count = 8) {
    const data = imageData.data;
    const buckets = new Map();

    for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] < 128) continue; // şeffaf pikselleri atla
        const r = data[i], g = data[i + 1], b = data[i + 2];
        const key = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);
        const bucket = buckets.get(key);
        if (bucket) {
            bucket.n++;
            bucket.r += r; bucket.g += g; bucket.b += b;
        } else {
            buckets.set(key, { n: 1, r, g, b });
        }
    }

    const sorted = [...buckets.values()]
        .sort((a, b) => b.n - a.n)
        .map(x => ({ r: Math.round(x.r / x.n), g: Math.round(x.g / x.n), b: Math.round(x.b / x.n), n: x.n }));

    // Birbirine çok yakın renkleri ele
    const picked = [];
    for (const c of sorted) {
        const tooClose = picked.some(p =>
            Math.abs(p.r - c.r) + Math.abs(p.g - c.g) + Math.abs(p.b - c.b) < 60
        );
        if (!tooClose) picked.push(c);
        if (picked.length >= count) break;
    }
    return picked;
}

export function initColorTools() {
    const panel = document.getElementById('color-tools-panel');
    if (!panel) return;

    /* --- Tabs --- */
    const tabPalette = document.getElementById('clr-tab-palette');
    const tabConvert = document.getElementById('clr-tab-convert');
    const sectionPalette = document.getElementById('clr-palette-section');
    const sectionConvert = document.getElementById('clr-convert-section');

    function switchTab(mode) {
        tabPalette.classList.toggle('active', mode === 'palette');
        tabConvert.classList.toggle('active', mode === 'convert');
        sectionPalette.classList.toggle('active', mode === 'palette');
        sectionConvert.classList.toggle('active', mode === 'convert');
    }
    tabPalette.addEventListener('click', () => switchTab('palette'));
    tabConvert.addEventListener('click', () => switchTab('convert'));

    /* ==================== Palet Çıkarıcı ==================== */
    const imageInput = document.getElementById('clr-image-input');
    const paletteResult = document.getElementById('clr-palette-result');
    const imagePreview = document.getElementById('clr-image-preview');
    const swatchesEl = document.getElementById('clr-swatches');

    let previewUrl = null;

    imageInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            showToast("Lütfen geçerli bir görsel dosyası seçin.", "error");
            return;
        }

        try {
            const bitmap = await createImageBitmap(file);
            // Hız için görüntüyü küçült
            const scale = Math.min(1, 240 / Math.max(bitmap.width, bitmap.height));
            const cv = document.createElement('canvas');
            cv.width = Math.max(1, Math.round(bitmap.width * scale));
            cv.height = Math.max(1, Math.round(bitmap.height * scale));
            const ctx = cv.getContext('2d');
            ctx.drawImage(bitmap, 0, 0, cv.width, cv.height);
            const palette = extractPalette(ctx.getImageData(0, 0, cv.width, cv.height));

            if (previewUrl) URL.revokeObjectURL(previewUrl);
            previewUrl = URL.createObjectURL(file);
            imagePreview.src = previewUrl;

            swatchesEl.innerHTML = '';
            palette.forEach(c => {
                const hex = rgbToHex(c.r, c.g, c.b);
                const sw = document.createElement('div');
                sw.className = 'clr-swatch';
                const colorBox = document.createElement('div');
                colorBox.className = 'clr-swatch-color';
                colorBox.style.background = hex;
                const label = document.createElement('span');
                label.className = 'clr-swatch-label';
                label.textContent = hex.toUpperCase();
                sw.appendChild(colorBox);
                sw.appendChild(label);
                sw.addEventListener('click', () => {
                    navigator.clipboard.writeText(hex.toUpperCase())
                        .then(() => showToast(`${hex.toUpperCase()} kopyalandı!`, "success"))
                        .catch(() => showToast("Kopyalama başarısız oldu.", "error"));
                });
                swatchesEl.appendChild(sw);
            });

            paletteResult.classList.remove('hidden');
            showToast(`${palette.length} renk çıkarıldı!`, "success");
        } catch (err) {
            console.error("Palette:", err);
            showToast("Görsel işlenemedi.", "error");
        }
        imageInput.value = '';
    });

    /* ==================== Renk Dönüştürücü ==================== */
    const picker = document.getElementById('clr-picker');
    const bigSwatch = document.getElementById('clr-big-swatch');
    const hexInput = document.getElementById('clr-hex');
    const rgbInput = document.getElementById('clr-rgb');
    const hslInput = document.getElementById('clr-hsl');

    function updateFromHex(hex) {
        const rgb = hexToRgb(hex);
        if (!rgb) return false;
        const norm = rgbToHex(rgb.r, rgb.g, rgb.b);
        const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
        hexInput.value = norm.toUpperCase();
        rgbInput.value = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
        hslInput.value = `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`;
        bigSwatch.style.background = norm;
        picker.value = norm;
        return true;
    }

    picker.addEventListener('input', () => updateFromHex(picker.value));
    hexInput.addEventListener('change', () => {
        if (!updateFromHex(hexInput.value)) {
            showToast("Geçersiz HEX kodu (örn: #4F46E5).", "error");
        }
    });

    panel.querySelectorAll('.clr-copy-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const target = document.getElementById(btn.dataset.copyTarget);
            if (!target || !target.value) return;
            navigator.clipboard.writeText(target.value)
                .then(() => showToast("Kopyalandı!", "success"))
                .catch(() => showToast("Kopyalama başarısız oldu.", "error"));
        });
    });

    updateFromHex('#4f46e5');
}
