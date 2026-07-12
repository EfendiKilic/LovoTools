import { showToast, downloadBlob, sanitizeFilename } from '../utils.js';

/**
 * SVG -> PNG/JPG/WebP Dönüştürücü — saf canvas, sıfır bağımlılık.
 */
export function initSvgConverter() {
    const panel = document.getElementById('svg-converter-panel');
    if (!panel) return;

    const input = document.getElementById('svgc-input');
    const btnFile = document.getElementById('svgc-btn-file');
    const fileInput = document.getElementById('svgc-file-input');
    const preview = document.getElementById('svgc-preview');
    const formatSelect = document.getElementById('svgc-format');
    const widthInput = document.getElementById('svgc-width');
    const filenameInput = document.getElementById('svgc-filename');
    const btnRun = document.getElementById('svgc-btn-run');
    const infoEl = document.getElementById('svgc-info');

    let previewUrl = null;

    btnFile.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        input.value = await file.text();
        filenameInput.value = file.name.replace(/\.svg$/i, '');
        updatePreview();
        fileInput.value = '';
    });

    let debounce = null;
    input.addEventListener('input', () => {
        clearTimeout(debounce);
        debounce = setTimeout(updatePreview, 350);
    });

    function getSvgDimensions(svgEl) {
        let w = parseFloat(svgEl.getAttribute('width'));
        let h = parseFloat(svgEl.getAttribute('height'));
        const vb = svgEl.getAttribute('viewBox');
        if ((!w || !h) && vb) {
            const parts = vb.trim().split(/[\s,]+/).map(Number);
            if (parts.length === 4) { w = w || parts[2]; h = h || parts[3]; }
        }
        return { w: w || 512, h: h || 512 };
    }

    function parseSvg() {
        const raw = input.value.trim();
        if (!raw || !raw.includes('<svg')) return null;
        const doc = new DOMParser().parseFromString(raw, 'image/svg+xml');
        const svgEl = doc.querySelector('svg');
        if (!svgEl || doc.querySelector('parsererror')) return null;
        return svgEl;
    }

    function updatePreview() {
        const svgEl = parseSvg();
        if (previewUrl) { URL.revokeObjectURL(previewUrl); previewUrl = null; }
        if (!svgEl) {
            preview.innerHTML = '<i class="ph ph-image-square" style="font-size: 3rem; color: var(--text-muted);"></i>';
            infoEl.textContent = input.value.trim() ? 'Geçerli bir SVG bulunamadı.' : '';
            return;
        }
        const { w, h } = getSvgDimensions(svgEl);
        infoEl.textContent = `Kaynak boyut: ${Math.round(w)} × ${Math.round(h)} px`;

        previewUrl = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(svgEl)], { type: 'image/svg+xml' }));
        const img = document.createElement('img');
        img.src = previewUrl;
        img.alt = 'SVG önizleme';
        preview.innerHTML = '';
        preview.appendChild(img);
    }

    btnRun.addEventListener('click', async () => {
        const svgEl = parseSvg();
        if (!svgEl) {
            showToast("Geçerli bir SVG kodu girin veya dosya yükleyin.", "error");
            return;
        }

        btnRun.disabled = true;
        try {
            const { w, h } = getSvgDimensions(svgEl);
            const targetW = Math.max(16, Math.min(8192, parseInt(widthInput.value, 10) || 1024));
            const targetH = Math.round(targetW * (h / w));

            // Boyutsuz SVG'ler için genişlik/yükseklik zorla (yoksa Image 0x0 çizer)
            svgEl.setAttribute('width', w);
            svgEl.setAttribute('height', h);

            const svgUrl = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(svgEl)], { type: 'image/svg+xml' }));
            const img = new Image();
            await new Promise((res, rej) => {
                img.onload = res;
                img.onerror = () => rej(new Error("SVG görüntülenemedi (harici kaynak içeriyor olabilir)."));
                img.src = svgUrl;
            });

            const canvas = document.createElement('canvas');
            canvas.width = targetW;
            canvas.height = targetH;
            const ctx = canvas.getContext('2d');

            const format = formatSelect.value;
            const mime = format === 'jpg' ? 'image/jpeg' : format === 'webp' ? 'image/webp' : 'image/png';
            if (mime === 'image/jpeg') {
                ctx.fillStyle = '#ffffff'; // JPG şeffaflık desteklemez
                ctx.fillRect(0, 0, targetW, targetH);
            }
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, 0, 0, targetW, targetH);
            URL.revokeObjectURL(svgUrl);

            const blob = await new Promise((res, rej) => canvas.toBlob(b => b ? res(b) : rej(new Error("Görsel oluşturulamadı.")), mime, 0.92));
            const name = sanitizeFilename(filenameInput.value, 'svg_gorsel');
            downloadBlob(blob, `${name}.${format}`);
            infoEl.textContent = `${targetW} × ${targetH} px ${format.toUpperCase()} indirildi (${(blob.size / 1024).toFixed(1)} KB)`;
            showToast("Dönüştürme tamamlandı!", "success");
        } catch (err) {
            console.error("SVG Convert:", err);
            showToast(err.message || "Dönüştürme başarısız oldu.", "error");
        } finally {
            btnRun.disabled = false;
        }
    });
}
