import { showToast, formatBytes, preventDefaults } from '../utils.js';

/**
 * Video Sıkıştırma Modülü - FFmpeg.wasm Entegrasyonu ile
 */
export function initVideoCompressor() {
    const videoUploadZone = document.getElementById('video-upload-zone');
    const videoEditorZone = document.getElementById('video-editor-zone');
    const videoInput = document.getElementById('video-input');
    const videoPreview = document.getElementById('video-preview');
    const videoName = document.getElementById('video-name');
    const videoOriginalSize = document.getElementById('video-original-size');
    const btnCompressVideo = document.getElementById('btn-compress-video');
    const progressBar = document.getElementById('video-progress-bar');
    const progressPercent = document.getElementById('video-progress-percent');
    const progressText = document.getElementById('video-progress-text');
    const progressContainer = document.getElementById('video-progress-container');
    const resultContainer = document.getElementById('video-result-container');
    const btnDownloadVideo = document.getElementById('btn-download-video');
    const videoNewSizeSpan = document.getElementById('video-new-size');
    const qualitySelect = document.getElementById('video-quality');
    const scaleSelect = document.getElementById('video-scale');
    const exportFilenameInput = document.getElementById('video-export-filename');
    const exportFormatSelect = document.getElementById('video-export-format');

    let currentVideoFile = null;
    let finalVideoUrl = null;
    let ffmpeg = null;

    if (!videoInput || !videoUploadZone) return;


    /* --- Input Handlers --- */
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        videoUploadZone.addEventListener(eventName, preventDefaults, false);
    });

    videoUploadZone.addEventListener('dragover', () => videoUploadZone.classList.add('dragover'));
    videoUploadZone.addEventListener('dragleave', () => videoUploadZone.classList.remove('dragover'));

    videoUploadZone.addEventListener('drop', (e) => {
        videoUploadZone.classList.remove('dragover');
        const dt = e.dataTransfer;
        if (dt.files && dt.files.length) {
            handleVideoSelect(dt.files[0]);
        }
    });

    videoInput.addEventListener('change', (e) => {
        if (e.target.files.length) {
            handleVideoSelect(e.target.files[0]);
        }
    });

    function handleVideoSelect(file) {
        if (!file.type.startsWith('video/')) {
            showToast("Lütfen geçerli bir video dosyası seçin.", "error");
            return;
        }

        currentVideoFile = file;
        videoName.textContent = file.name;
        videoOriginalSize.textContent = formatBytes(file.size);

        const dotIndex = file.name.lastIndexOf('.');
        const baseName = dotIndex !== -1 ? file.name.substring(0, dotIndex) : file.name;
        if (exportFilenameInput) {
            exportFilenameInput.value = baseName + '_compressed';
        }

        const url = URL.createObjectURL(file);
        videoPreview.src = url;

        videoUploadZone.classList.remove('active');
        videoEditorZone.classList.remove('hidden');
        videoEditorZone.classList.add('active');

        if (progressContainer) progressContainer.classList.add('hidden');
        if (resultContainer) resultContainer.classList.add('hidden');
        btnCompressVideo.disabled = false;

        if (finalVideoUrl) {
            URL.revokeObjectURL(finalVideoUrl);
            finalVideoUrl = null;
        }
        videoInput.value = '';
    }

    /* --- FFmpeg Initialization --- */
    async function loadFFmpeg() {
        if (ffmpeg) return ffmpeg;

        const { FFmpeg } = window.FFmpeg;
        ffmpeg = new FFmpeg();


        ffmpeg.on('log', ({ message }) => {
            console.log(message);
        });

        ffmpeg.on('progress', ({ progress }) => {
            const pct = Math.round(progress * 100);
            progressBar.style.width = pct + '%';
            progressPercent.textContent = pct + '%';
        });

        progressText.textContent = "FFmpeg modülleri yükleniyor (İlk seferde zaman alabilir)...";

        await ffmpeg.load({
            coreURL: 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd/ffmpeg-core.js',
        });

        return ffmpeg;
    }

    /* --- Compression Core --- */
    btnCompressVideo.addEventListener('click', async () => {
        if (!currentVideoFile) return;

        btnCompressVideo.disabled = true;
        progressContainer.classList.remove('hidden');
        resultContainer.classList.add('hidden');
        progressBar.style.width = '0%';
        progressPercent.textContent = '0%';

        try {
            const instance = await loadFFmpeg();
            const { fetchFile } = window.FFmpegUtil;

            const inputName = 'input_' + currentVideoFile.name;
            const outputFormat = exportFormatSelect.value;
            const outputName = `output.${outputFormat}`;


            progressText.textContent = "Video analiz ediliyor...";
            await instance.writeFile(inputName, await fetchFile(currentVideoFile));


            const crf = qualitySelect.value;
            const scale = scaleSelect.value;
            const scaleCmd = scale === '1' ? '' : `,scale=iw*${scale}:ih*${scale}`;

            const args = [
                '-i', inputName,
                '-vcodec', 'libx264',
                '-crf', crf,
                '-preset', 'veryfast',
                '-vf', `pad=ceil(iw/2)*2:ceil(ih/2)*2${scaleCmd}`,
                '-acodec', 'aac',
                outputName
            ];

            progressText.textContent = "Sıkıştırma işlemi başladı (Arka planda işleniyor)...";
            await instance.exec(args);


            const data = await instance.readFile(outputName);
            const finalBlob = new Blob([data.buffer], { type: `video/${outputFormat}` });

            finalVideoUrl = URL.createObjectURL(finalBlob);
            videoNewSizeSpan.textContent = formatBytes(finalBlob.size);

            progressContainer.classList.add('hidden');
            resultContainer.classList.remove('hidden');
            showToast("Sıkıştırma tamamlandı!", "success");

        } catch (err) {
            console.error("FFmpeg Error:", err);
            progressText.textContent = "Hata oluştu!";
            showToast("Sıkıştırma sırasında bir hata oluştu. Lütfen SharedArrayBuffer desteğini kontrol edin veya daha küçük bir video deneyin.", "error");
        } finally {
            btnCompressVideo.disabled = false;
        }
    });

    btnDownloadVideo.addEventListener('click', () => {
        if (!finalVideoUrl) return;
        const a = document.createElement('a');
        a.href = finalVideoUrl;

        const fileName = exportFilenameInput.value.trim() || 'compressed_video';
        const ext = exportFormatSelect.value;

        a.download = `${fileName}.${ext}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    });
}
