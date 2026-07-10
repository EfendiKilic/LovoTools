import { showToast, formatBytes, downloadBlob, sanitizeFilename } from '../utils.js';
import { getFFmpeg, fetchFile } from '../ffmpegLoader.js';

/**
 * GIF <-> Video Dönüştürücü Modülü
 * Video -> GIF: palette üretimiyle yüksek kaliteli GIF.
 * GIF -> Video: yuv420p MP4 (her oynatıcıda çalışır).
 */
export function initGifVideo() {
    const panel = document.getElementById('gif-video-panel');
    if (!panel) return;

    /* --- Tabs --- */
    const tabV2G = document.getElementById('gifv-tab-v2g');
    const tabG2V = document.getElementById('gifv-tab-g2v');
    const sectionV2G = document.getElementById('gifv-v2g-section');
    const sectionG2V = document.getElementById('gifv-g2v-section');

    function switchTab(mode) {
        tabV2G.classList.toggle('active', mode === 'v2g');
        tabG2V.classList.toggle('active', mode === 'g2v');
        sectionV2G.classList.toggle('active', mode === 'v2g');
        sectionG2V.classList.toggle('active', mode === 'g2v');
    }
    tabV2G.addEventListener('click', () => switchTab('v2g'));
    tabG2V.addEventListener('click', () => switchTab('g2v'));

    /* ==================== Video -> GIF ==================== */
    const videoInput = document.getElementById('gifv-video-input');
    const v2gWorkspace = document.getElementById('gifv-v2g-workspace');
    const v2gName = document.getElementById('gifv-v2g-name');
    const v2gSize = document.getElementById('gifv-v2g-size');
    const fpsSelect = document.getElementById('gifv-fps');
    const widthSelect = document.getElementById('gifv-width');
    const v2gFilename = document.getElementById('gifv-v2g-filename');
    const btnV2G = document.getElementById('gifv-btn-v2g');
    const v2gStatus = document.getElementById('gifv-v2g-status');
    const v2gResult = document.getElementById('gifv-v2g-result');
    const v2gPreview = document.getElementById('gifv-v2g-preview');
    const v2gResultSize = document.getElementById('gifv-v2g-result-size');
    const btnV2GDownload = document.getElementById('gifv-btn-v2g-download');

    let videoFile = null;
    let gifBlob = null;
    let gifUrl = null;

    videoInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (!file.type.startsWith('video/')) {
            showToast("Lütfen geçerli bir video dosyası seçin.", "error");
            return;
        }
        videoFile = file;
        v2gName.textContent = file.name;
        v2gSize.textContent = formatBytes(file.size);
        v2gFilename.value = file.name.replace(/\.[^/.]+$/, '');
        v2gWorkspace.classList.remove('hidden');
        v2gResult.classList.add('hidden');
        videoInput.value = '';
    });

    btnV2G.addEventListener('click', async () => {
        if (!videoFile) return;
        btnV2G.disabled = true;
        v2gResult.classList.add('hidden');
        v2gStatus.textContent = "Dönüştürme motoru hazırlanıyor (İlk seferde zaman alabilir)...";

        try {
            const ffmpeg = await getFFmpeg();
            const stamp = Date.now().toString(36);
            const inputName = 'gifv_in_' + stamp;
            const outputName = `gifv_out_${stamp}.gif`;

            v2gStatus.textContent = "Video okunuyor...";
            await ffmpeg.writeFile(inputName, await fetchFile(videoFile));

            const fps = fpsSelect.value;
            const width = parseInt(widthSelect.value, 10);
            const scalePart = width > 0 ? `,scale=${width}:-1:flags=lanczos` : '';
            const vf = `fps=${fps}${scalePart},split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse`;

            v2gStatus.textContent = "GIF oluşturuluyor (video uzunluğuna göre sürebilir)...";
            await ffmpeg.exec(['-i', inputName, '-vf', vf, '-loop', '0', outputName]);

            const data = await ffmpeg.readFile(outputName);
            try { await ffmpeg.deleteFile(inputName); } catch (_) {}
            try { await ffmpeg.deleteFile(outputName); } catch (_) {}

            if (!data || data.length === 0) throw new Error("GIF üretilemedi.");

            gifBlob = new Blob([data.buffer], { type: 'image/gif' });
            if (gifUrl) URL.revokeObjectURL(gifUrl);
            gifUrl = URL.createObjectURL(gifBlob);
            v2gPreview.src = gifUrl;
            v2gResultSize.textContent = formatBytes(gifBlob.size);
            v2gStatus.textContent = '';
            v2gResult.classList.remove('hidden');
            showToast("GIF başarıyla oluşturuldu!", "success");
        } catch (err) {
            console.error("V2G Error:", err);
            v2gStatus.textContent = '';
            showToast("GIF oluşturulamadı. Daha kısa bir video deneyin.", "error");
        } finally {
            btnV2G.disabled = false;
        }
    });

    btnV2GDownload.addEventListener('click', () => {
        if (!gifBlob) return;
        downloadBlob(gifBlob, sanitizeFilename(v2gFilename.value, 'animasyon') + '.gif');
    });

    /* ==================== GIF -> Video ==================== */
    const gifInput = document.getElementById('gifv-gif-input');
    const g2vWorkspace = document.getElementById('gifv-g2v-workspace');
    const g2vName = document.getElementById('gifv-g2v-name');
    const g2vSize = document.getElementById('gifv-g2v-size');
    const g2vFilename = document.getElementById('gifv-g2v-filename');
    const btnG2V = document.getElementById('gifv-btn-g2v');
    const g2vStatus = document.getElementById('gifv-g2v-status');
    const g2vResult = document.getElementById('gifv-g2v-result');
    const g2vPreview = document.getElementById('gifv-g2v-preview');
    const g2vResultSize = document.getElementById('gifv-g2v-result-size');
    const btnG2VDownload = document.getElementById('gifv-btn-g2v-download');

    let gifFile = null;
    let mp4Blob = null;
    let mp4Url = null;

    gifInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.type !== 'image/gif') {
            showToast("Lütfen bir GIF dosyası seçin.", "error");
            return;
        }
        gifFile = file;
        g2vName.textContent = file.name;
        g2vSize.textContent = formatBytes(file.size);
        g2vFilename.value = file.name.replace(/\.gif$/i, '');
        g2vWorkspace.classList.remove('hidden');
        g2vResult.classList.add('hidden');
        gifInput.value = '';
    });

    btnG2V.addEventListener('click', async () => {
        if (!gifFile) return;
        btnG2V.disabled = true;
        g2vResult.classList.add('hidden');
        g2vStatus.textContent = "Dönüştürme motoru hazırlanıyor (İlk seferde zaman alabilir)...";

        try {
            const ffmpeg = await getFFmpeg();
            const stamp = Date.now().toString(36);
            const inputName = 'g2v_in_' + stamp + '.gif';
            const outputName = `g2v_out_${stamp}.mp4`;

            g2vStatus.textContent = "GIF okunuyor...";
            await ffmpeg.writeFile(inputName, await fetchFile(gifFile));

            g2vStatus.textContent = "MP4 oluşturuluyor...";
            await ffmpeg.exec([
                '-i', inputName,
                '-movflags', 'faststart',
                '-pix_fmt', 'yuv420p',
                '-vf', 'pad=ceil(iw/2)*2:ceil(ih/2)*2',
                outputName
            ]);

            const data = await ffmpeg.readFile(outputName);
            try { await ffmpeg.deleteFile(inputName); } catch (_) {}
            try { await ffmpeg.deleteFile(outputName); } catch (_) {}

            if (!data || data.length === 0) throw new Error("MP4 üretilemedi.");

            mp4Blob = new Blob([data.buffer], { type: 'video/mp4' });
            if (mp4Url) URL.revokeObjectURL(mp4Url);
            mp4Url = URL.createObjectURL(mp4Blob);
            g2vPreview.src = mp4Url;
            g2vResultSize.textContent = formatBytes(mp4Blob.size);
            g2vStatus.textContent = '';
            g2vResult.classList.remove('hidden');
            showToast("MP4 başarıyla oluşturuldu!", "success");
        } catch (err) {
            console.error("G2V Error:", err);
            g2vStatus.textContent = '';
            showToast("Dönüştürme sırasında bir hata oluştu.", "error");
        } finally {
            btnG2V.disabled = false;
        }
    });

    btnG2VDownload.addEventListener('click', () => {
        if (!mp4Blob) return;
        downloadBlob(mp4Blob, sanitizeFilename(g2vFilename.value, 'video') + '.mp4');
    });
}
