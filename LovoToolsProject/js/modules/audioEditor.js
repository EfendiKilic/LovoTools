import { showToast, formatTime, preventDefaults } from '../utils.js';
import { getFFmpeg, fetchFile } from '../ffmpegLoader.js';

/**
 * Ses Düzenleme Modülü
 */
export function initAudioEditor() {
    let uploadedFiles = [];
    let playbackCtx = null;

    const audioPanel = document.getElementById('audio-editor-panel');
    if (!audioPanel) return;

    const uploadZone = document.getElementById('audio-upload-zone');
    const editorZone = document.getElementById('audio-editor-zone');
    const fileInput = document.getElementById('audio-input');
    const editorsList = document.getElementById('editors-list');
    const btnAddMore = document.getElementById('btn-add-more');
    const btnBatchExport = document.getElementById('btn-batch-export');
    const editorTemplate = document.getElementById('editor-template');

    if (!fileInput || !uploadZone) return;


    /* --- Drag & Drop Handlers --- */
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        uploadZone.addEventListener(eventName, preventDefaults, false);
    });

    uploadZone.addEventListener('dragover', () => uploadZone.classList.add('dragover'));
    uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('dragover'));

    uploadZone.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        if (dt.files.length) handleFilesSelect(dt.files);
    });

    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length) handleFilesSelect(e.target.files);
    });

    if (btnAddMore) {
        btnAddMore.addEventListener('click', () => fileInput.click());
    }

    if (btnBatchExport) {
        btnBatchExport.addEventListener('click', handleBatchExport);
    }

    function handleFilesSelect(files) {
        let audioFiles = Array.from(files).filter(f => f.type.startsWith('audio/'));
        if (audioFiles.length === 0) {
            showToast("Lütfen geçerli ses dosyaları yükleyin.", "error");
            return;
        }
        
        audioFiles.forEach(file => {
            file.id = 'file_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            uploadedFiles.push(file);
            appendFileEditor(file);
        });


        uploadZone.classList.remove('active');
        editorZone.classList.add('active');
        fileInput.value = '';
    }

    /* --- UI & Editor Generation --- */
    function appendFileEditor(fileObj) {
        if (!editorTemplate) {
            console.error("Editor template not found!");
            return;
        }
        const clone = editorTemplate.content.cloneNode(true);
        const card = clone.querySelector('.editor-card');
        
        const ui = {
            card: card,
            fileNameDisplay: card.querySelector('.file-name-display'),
            btnCloseFile: card.querySelector('.btn-close-file'),
            waveformDiv: card.querySelector('.waveform'),
            timelineDiv: card.querySelector('.timeline'),
            loadingOverlay: card.querySelector('.loading-overlay'),
            loadingText: card.querySelector('.loading-text'),
            btnPlayPause: card.querySelector('.btn-play-pause'),
            playIcon: card.querySelector('.play-icon'),
            currentTimeDisplay: card.querySelector('.current-time'),
            totalTimeDisplay: card.querySelector('.total-time'),
            volumeSlider: card.querySelector('.volume-slider'),
            exportFilename: card.querySelector('.export-filename'),
            exportFormat: card.querySelector('.export-format'),
            btnCutExport: card.querySelector('.btn-cut-export'),
            trimStart: card.querySelector('.trim-start'),
            trimEnd: card.querySelector('.trim-end'),
            trimDuration: card.querySelector('.trim-duration')
        };

        ui.fileNameDisplay.textContent = fileObj.name;
        ui.exportFilename.value = fileObj.name.replace(/\.[^/.]+$/, "") + '_Lovo';

        ui.btnCloseFile.addEventListener('click', () => removeFile(fileObj.id));

        editorsList.appendChild(card);
        
        if (!playbackCtx) {
            playbackCtx = new (window.AudioContext || window.webkitAudioContext)();
        }

        const ws = WaveSurfer.create({
            container: ui.waveformDiv,
            waveColor: '#d1d5db',
            progressColor: '#4f46e5',
            cursorColor: '#4f46e5',
            barWidth: 2,
            barGap: 2,
            barRadius: 3,
            height: 140,
            backend: 'MediaElement',
            plugins: [
                WaveSurfer.timeline.create({
                    container: ui.timelineDiv,
                    height: 20,
                    style: { fontSize: '11px', color: '#94a3b8' }
                }),
                WaveSurfer.regions.create({})
            ]
        });
        
        fileObj.ws = ws;

        const wsRegions = ws.regions;
        fileObj.wsRegions = wsRegions;

        ws.enableDragSelection({
            color: 'rgba(99, 102, 241, 0.2)'
        });

        // Bölge <-> saniye kutuları iki yönlü senkron tutulur;
        // dışa aktarma her zaman bu değerleri kullanır.
        function syncTrimInputs(region) {
            if (!region) return;
            ui.trimStart.value = region.start.toFixed(1);
            ui.trimEnd.value = region.end.toFixed(1);
            ui.trimDuration.textContent = (region.end - region.start).toFixed(1) + ' sn';
        }

        function applyTrimInputs() {
            const region = fileObj.activeRegion;
            if (!region) return;
            const dur = ws.getDuration();
            let start = parseFloat(ui.trimStart.value);
            let end = parseFloat(ui.trimEnd.value);
            if (isNaN(start)) start = region.start;
            if (isNaN(end)) end = region.end;
            start = Math.max(0, Math.min(start, dur - 0.1));
            end = Math.max(start + 0.1, Math.min(end, dur));
            region.update({ start, end });
            fileObj.activeRegion = region;
            syncTrimInputs(region);
        }

        ui.trimStart.addEventListener('change', applyTrimInputs);
        ui.trimEnd.addEventListener('change', applyTrimInputs);

        ws.on('ready', () => {
            ui.totalTimeDisplay.textContent = formatTime(ws.getDuration());

            ui.loadingOverlay.style.display = 'none';

            // Varsayılan seçim tüm dosyadır: hiç dokunulmazsa dosyanın tamamı dışa aktarılır
            ws.addRegion({
                id: 'default-region',
                start: 0,
                end: ws.getDuration(),
                color: 'rgba(99, 102, 241, 0.25)',
                drag: true,
                resize: true
            });

            if (btnBatchExport) btnBatchExport.removeAttribute('disabled');
        });

        ws.on('audioprocess', () => {
            ui.currentTimeDisplay.textContent = formatTime(ws.getCurrentTime());
            if (fileObj.activeRegion && ws.isPlaying()) {
                if (ws.getCurrentTime() >= fileObj.activeRegion.end) {
                    ws.pause();
                    ws.setTime(fileObj.activeRegion.start);
                }
            }
        });

        ws.on('play', () => ui.playIcon && ui.playIcon.classList.replace('ph-play', 'ph-pause'));
        ws.on('pause', () => ui.playIcon && ui.playIcon.classList.replace('ph-pause', 'ph-play'));

        ws.on('region-created', (region) => {
            Object.values(ws.regions.list).forEach(r => {
                if (r !== region) r.remove();
            });
            fileObj.activeRegion = region;
            ui.btnCutExport.disabled = false;
            syncTrimInputs(region);
        });

        ws.on('region-updated', (region) => {
            fileObj.activeRegion = region;
            syncTrimInputs(region);
        });

        ws.on('region-update-end', (region) => {
            fileObj.activeRegion = region;
            syncTrimInputs(region);
        });

        ui.btnPlayPause.addEventListener('click', async () => {
            if (playbackCtx.state === 'suspended') {
                await playbackCtx.resume();
            }
            
            if (!ws.isPlaying() && fileObj.activeRegion) {
                const currentTime = ws.getCurrentTime();
                if (currentTime < fileObj.activeRegion.start || currentTime >= fileObj.activeRegion.end) {
                    ws.setTime(fileObj.activeRegion.start);
                }
            }
            ws.playPause();
        });

        ui.volumeSlider.addEventListener('input', (e) => {
            const val = parseFloat(e.target.value);
            ws.setVolume(Math.min(1, val));
            if (ws.backend && ws.backend.gainNode) {
                ws.backend.gainNode.gain.value = val;
            }
            const pctSpan = ui.card.querySelector('.volume-percentage');
            if (pctSpan) pctSpan.textContent = Math.round(val * 100) + '%';
        });

        ui.btnCutExport.addEventListener('click', () => handleSingleExport(fileObj, ui));

        loadAudioData(fileObj, ws, ui);
    }

    async function loadAudioData(fileObj, ws, ui) {
        ui.loadingOverlay.style.display = 'flex';
        try {
            if (!fileObj.objectUrl) fileObj.objectUrl = URL.createObjectURL(fileObj);
            ws.load(fileObj.objectUrl);
            if (!fileObj.audioBufferInfo) {
                const arrayBuffer = await fileObj.arrayBuffer();
                fileObj.audioBufferInfo = await playbackCtx.decodeAudioData(arrayBuffer);
            }
        } catch(e) {
            console.error(e);
            showToast(`Dosya okunamadı: ${fileObj.name}`, "error");
            ui.loadingOverlay.style.display = 'none';
        }
    }

    function removeFile(fileId) {
        const index = uploadedFiles.findIndex(f => f.id === fileId);
        if (index > -1) {
            const f = uploadedFiles[index];
            if (f.ws) f.ws.destroy();
            if (f.objectUrl) URL.revokeObjectURL(f.objectUrl);
            editorsList.children[index].remove();
            uploadedFiles.splice(index, 1);
            if (uploadedFiles.length === 0) {
                editorZone.classList.remove('active');
                uploadZone.classList.add('active');
            }
        }
    }

    /* --- Audio Processing & Export --- */
    async function handleSingleExport(fileObj, ui) {
        if (!fileObj.activeRegion || !fileObj.audioBufferInfo) return;

        const totalDur = fileObj.audioBufferInfo.duration;
        const start = Math.max(0, fileObj.activeRegion.start);
        const end = Math.min(totalDur, fileObj.activeRegion.end);
        if (end - start < 0.1) {
            showToast("Seçim çok kısa. Başlangıç ve bitiş değerlerini kontrol edin.", "error");
            return;
        }

        ui.loadingText.textContent = "İşleniyor... (İlk kullanımda ses motoru indirilir, biraz sürebilir)";
        ui.loadingOverlay.style.display = 'flex';

        try {
            const blob = await processAudioExport(
                fileObj,
                start,
                end,
                ui.exportFormat.value,
                parseFloat(ui.volumeSlider.value)
            );
            
            downloadBlob(blob, ui.exportFilename.value + '.' + ui.exportFormat.value);
            showToast('Ses başarıyla indirildi!', "success");
        } catch (e) {
            console.error(e);
            showToast("Hata oluştu: " + e.message, "error");
        } finally {
            ui.loadingOverlay.style.display = 'none';
        }
    }

    async function handleBatchExport() {
        if (uploadedFiles.length === 0) return;
        const overlay = document.createElement('div');
        overlay.className = 'loading-overlay active';
        overlay.style.position = 'fixed';
        overlay.style.zIndex = '9999';
        overlay.innerHTML = `<div class="spinner"></div><p id="global-loading-text">Toplu İşlem Başlıyor...</p>`;
        document.body.appendChild(overlay);
        const globalLoadingText = document.getElementById('global-loading-text');

        try {
            for (let i = 0; i < uploadedFiles.length; i++) {
                const fileObj = uploadedFiles[i];
                const card = editorsList.children[i];
                globalLoadingText.textContent = `İşleniyor (${i+1}/${uploadedFiles.length}): ${fileObj.name}`;
                
                const format = card.querySelector('.export-format').value;
                const filename = card.querySelector('.export-filename').value || 'yeni_ses';
                const blob = await processAudioExport(
                    fileObj,
                    fileObj.activeRegion ? fileObj.activeRegion.start : 0,
                    fileObj.activeRegion ? fileObj.activeRegion.end : fileObj.audioBufferInfo.duration,
                    format,
                    parseFloat(card.querySelector('.volume-slider').value)
                );
                downloadBlob(blob, filename + '.' + format);
            }
            showToast("Tüm dosyalar indirildi!", "success");
        } catch (e) {
            console.error(e);
            showToast("Hata oluştu", "error");
        } finally {
            document.body.removeChild(overlay);
        }
    }

    const FORMAT_CODECS = {
        mp3:  { codec: 'libmp3lame', mime: 'audio/mpeg' },
        wav:  { codec: 'pcm_s16le',  mime: 'audio/wav' },
        ogg:  { codec: 'libvorbis',  mime: 'audio/ogg' },
        flac: { codec: 'flac',       mime: 'audio/flac' },
        m4a:  { codec: 'aac',        mime: 'audio/mp4' }
    };

    async function processAudioExport(fileObj, start, end, format, volume) {
        const instance = await getFFmpeg();
        const fmt = FORMAT_CODECS[format] || FORMAT_CODECS.mp3;

        const stamp = Date.now() + '_' + Math.random().toString(36).slice(2, 7);
        const inputName = 'in_' + stamp;
        const outputName = `out_${stamp}.${format}`;

        await instance.writeFile(inputName, await fetchFile(fileObj));

        const args = ['-i', inputName, '-ss', start.toString(), '-to', end.toString()];
        if (Math.abs(volume - 1) > 0.001) {
            args.push('-filter:a', `volume=${volume}`);
        }
        args.push('-c:a', fmt.codec, '-vn', outputName);

        try {
            await instance.exec(args);
            const data = await instance.readFile(outputName);
            if (!data || data.length === 0) {
                throw new Error("Dönüştürme başarısız oldu, çıktı üretilemedi.");
            }
            return new Blob([data.buffer], { type: fmt.mime });
        } finally {
            // Sanal dosya sistemini temizle ki art arda işlemlerde bellek şişmesin
            try { await instance.deleteFile(inputName); } catch (_) {}
            try { await instance.deleteFile(outputName); } catch (_) {}
        }
    }

    function downloadBlob(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 100);
    }
}
