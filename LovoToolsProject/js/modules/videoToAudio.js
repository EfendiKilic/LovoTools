import { showToast, formatBytes, preventDefaults, downloadBlob, sanitizeFilename } from '../utils.js';
import { getFFmpeg, fetchFile } from '../ffmpegLoader.js';

const FORMAT_CODECS = {
    mp3:  { codec: 'libmp3lame', mime: 'audio/mpeg' },
    wav:  { codec: 'pcm_s16le',  mime: 'audio/wav' },
    ogg:  { codec: 'libvorbis',  mime: 'audio/ogg' },
    m4a:  { codec: 'aac',        mime: 'audio/mp4' },
    flac: { codec: 'flac',       mime: 'audio/flac' }
};

/**
 * Videodan Ses Çıkarma Modülü
 */
export function initVideoToAudio() {
    const uploadZone = document.getElementById('v2a-upload-zone');
    const editorZone = document.getElementById('v2a-editor-zone');
    const input = document.getElementById('v2a-input');
    const fileNameEl = document.getElementById('v2a-file-name');
    const fileSizeEl = document.getElementById('v2a-file-size');
    const btnReset = document.getElementById('v2a-btn-reset');
    const formatSelect = document.getElementById('v2a-format');
    const filenameInput = document.getElementById('v2a-filename');
    const btnExtract = document.getElementById('v2a-btn-extract');
    const progressBox = document.getElementById('v2a-progress');
    const progressBar = document.getElementById('v2a-progress-bar');
    const progressText = document.getElementById('v2a-progress-text');
    const resultBox = document.getElementById('v2a-result');
    const resultSize = document.getElementById('v2a-result-size');
    const btnDownload = document.getElementById('v2a-btn-download');

    if (!uploadZone || !input) return;

    let currentFile = null;
    let resultBlob = null;
    let isProcessing = false;
    let progressAttached = false;

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(ev => {
        uploadZone.addEventListener(ev, preventDefaults, false);
    });
    uploadZone.addEventListener('dragover', () => uploadZone.classList.add('dragover'));
    uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('dragover'));
    uploadZone.addEventListener('drop', (e) => {
        uploadZone.classList.remove('dragover');
        if (e.dataTransfer.files.length) handleSelect(e.dataTransfer.files[0]);
    });

    input.addEventListener('change', (e) => {
        if (e.target.files.length) handleSelect(e.target.files[0]);
    });

    function handleSelect(file) {
        if (!file.type.startsWith('video/')) {
            showToast("Lütfen geçerli bir video dosyası seçin.", "error");
            return;
        }
        currentFile = file;
        resultBlob = null;
        fileNameEl.textContent = file.name;
        fileSizeEl.textContent = formatBytes(file.size);
        filenameInput.value = file.name.replace(/\.[^/.]+$/, '') + '_ses';

        uploadZone.classList.remove('active');
        editorZone.classList.add('active');
        progressBox.classList.add('hidden');
        resultBox.classList.add('hidden');
        btnExtract.disabled = false;
        input.value = '';
    }

    btnReset.addEventListener('click', () => {
        if (isProcessing) return;
        currentFile = null;
        resultBlob = null;
        editorZone.classList.remove('active');
        uploadZone.classList.add('active');
    });

    btnExtract.addEventListener('click', async () => {
        if (!currentFile || isProcessing) return;

        isProcessing = true;
        btnExtract.disabled = true;
        progressBox.classList.remove('hidden');
        resultBox.classList.add('hidden');
        progressBar.style.width = '0%';
        progressText.textContent = "Ses motoru hazırlanıyor (İlk seferde zaman alabilir)...";

        try {
            const ffmpeg = await getFFmpeg();

            if (!progressAttached) {
                ffmpeg.on('progress', ({ progress }) => {
                    if (!isProcessing) return; // başka modülün işlemi bizi güncellemesin
                    const pct = Math.min(100, Math.max(0, Math.round(progress * 100)));
                    progressBar.style.width = pct + '%';
                });
                progressAttached = true;
            }

            const format = formatSelect.value;
            const fmt = FORMAT_CODECS[format] || FORMAT_CODECS.mp3;
            const stamp = Date.now().toString(36);
            const inputName = 'v2a_in_' + stamp;
            const outputName = `v2a_out_${stamp}.${format}`;

            progressText.textContent = "Video okunuyor...";
            await ffmpeg.writeFile(inputName, await fetchFile(currentFile));

            progressText.textContent = "Ses çıkarılıyor...";
            await ffmpeg.exec(['-i', inputName, '-vn', '-c:a', fmt.codec, outputName]);

            const data = await ffmpeg.readFile(outputName);
            try { await ffmpeg.deleteFile(inputName); } catch (_) {}
            try { await ffmpeg.deleteFile(outputName); } catch (_) {}

            if (!data || data.length === 0) {
                throw new Error("Videoda ses akışı bulunamadı.");
            }

            resultBlob = new Blob([data.buffer], { type: fmt.mime });
            resultSize.textContent = formatBytes(resultBlob.size);
            progressBox.classList.add('hidden');
            resultBox.classList.remove('hidden');
            showToast("Ses başarıyla çıkarıldı!", "success");
        } catch (err) {
            console.error("V2A Error:", err);
            progressBox.classList.add('hidden');
            showToast("Ses çıkarılamadı. Videoda ses akışı olduğundan emin olun.", "error");
        } finally {
            isProcessing = false;
            btnExtract.disabled = false;
        }
    });

    btnDownload.addEventListener('click', () => {
        if (!resultBlob) return;
        const name = sanitizeFilename(filenameInput.value, 'cikartilan_ses');
        downloadBlob(resultBlob, `${name}.${formatSelect.value}`);
    });
}
