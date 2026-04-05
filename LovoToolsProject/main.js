// Main Application Logic
let uploadedFiles = [];
let playbackCtx = null;

// DOM Elements
const uploadZone = document.getElementById('upload-zone');
const editorZone = document.getElementById('editor-zone');
const fileInput = document.getElementById('audio-input');
const editorsList = document.getElementById('editors-list');
const btnAddMore = document.getElementById('btn-add-more');
const btnBatchExport = document.getElementById('btn-batch-export');
const loadingOverlay = document.getElementById('toast-container'); // Sadece bildirimler için

const editorTemplate = document.getElementById('editor-template');

// Navigation Logic
function openPanel(panelId) {
    document.getElementById('dashboard-zone').classList.remove('active');
    
    document.querySelectorAll('.tool-panel').forEach(panel => {
        panel.classList.remove('active');
    });
    
    const selectedPanel = document.getElementById(panelId);
    if (selectedPanel) {
        selectedPanel.classList.add('active');
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function openDashboard() {
    document.querySelectorAll('.tool-panel').forEach(panel => {
        panel.classList.remove('active');
    });
    
    document.getElementById('dashboard-zone').classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Application Init
document.addEventListener('DOMContentLoaded', () => {
    initDragAndDrop();
    initUpload();
    
    if (btnAddMore) {
        btnAddMore.addEventListener('click', () => {
            fileInput.click();
        });
    }

    if (btnBatchExport) {
        btnBatchExport.addEventListener('click', handleBatchExport);
    }
});

function initDragAndDrop() {
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        uploadZone.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
        uploadZone.addEventListener(eventName, () => {
            uploadZone.classList.add('dragover');
        });
    });

    ['dragleave', 'drop'].forEach(eventName => {
        uploadZone.addEventListener(eventName, () => {
            uploadZone.classList.remove('dragover');
        });
    });

    uploadZone.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const files = dt.files;
        if (files.length) {
            handleFilesSelect(files);
        }
    });
}

function initUpload() {
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length) {
            handleFilesSelect(e.target.files);
        }
    });
}

const handleFilesSelect = (files) => {
    let audioFiles = Array.from(files).filter(f => f.type.startsWith('audio/'));
    
    if (audioFiles.length === 0) {
        showToast("Lütfen geçerli ses dosyaları yükleyin.", "error");
        return;
    }
    
    let addedCount = 0;
    audioFiles.forEach(file => {
        file.id = 'file_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        uploadedFiles.push(file);
        appendFileEditor(file);
        addedCount++;
    });

    if (addedCount > 0) {
        showToast(`${addedCount} dosya eklendi.`, "success");
        if (!editorZone.classList.contains('active')) {
            uploadZone.classList.remove('active');
            editorZone.classList.add('active');
        }
    }
    
    fileInput.value = '';
};

const appendFileEditor = (fileObj) => {
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
        volumeIcon: card.querySelector('.volume-icon'),
        volumePercentage: card.querySelector('.volume-percentage'),
        exportFilename: card.querySelector('.export-filename'),
        exportFormat: card.querySelector('.export-format'),
        btnCutExport: card.querySelector('.btn-cut-export')
    };

    ui.fileNameDisplay.textContent = fileObj.name;
    const nameWithoutExt = fileObj.name.replace(/\.[^/.]+$/, "");
    ui.exportFilename.value = nameWithoutExt + '_cut';

    // Bireysel kaldır butonu
    ui.btnCloseFile.addEventListener('click', () => {
        removeFile(fileObj.id);
    });

    editorsList.appendChild(card);
    
    if (!playbackCtx) {
        playbackCtx = new (window.AudioContext || window.webkitAudioContext)();
    }

    // Wavesurfer oluştur
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const waveGrad = ctx.createLinearGradient(0, 0, 0, 200);
    waveGrad.addColorStop(0, '#6366f1');
    waveGrad.addColorStop(1, '#a855f7');
    const progGrad = ctx.createLinearGradient(0, 0, 0, 200);
    progGrad.addColorStop(0, '#10b981');
    progGrad.addColorStop(1, '#3b82f6');

    const ws = WaveSurfer.create({
        container: ui.waveformDiv,
        waveColor: waveGrad,
        progressColor: progGrad,
        cursorColor: '#f8fafc',
        barWidth: 2,
        barGap: 1,
        barRadius: 2,
        height: 200,
        normalize: true,
        plugins: [
            WaveSurfer.Timeline.create({
                container: ui.timelineDiv,
                height: 20,
                timeInterval: 0.1,
                primaryLabelInterval: 10,
                style: {
                    fontSize: '12px',
                    color: '#94a3b8'
                }
            })
        ]
    });
    
    fileObj.ws = ws;

    ws.setVolume(parseFloat(ui.volumeSlider.value));

    // Regions plugin eklentisi
    const wsRegions = ws.registerPlugin(WaveSurfer.Regions.create());
    fileObj.wsRegions = wsRegions;

    // Events
    ws.on('ready', () => {
        ui.totalTimeDisplay.textContent = formatTime(ws.getDuration());
        
        const media = ws.getMediaElement();
        if (!media._gainConnected) {
            const source = playbackCtx.createMediaElementSource(media);
            const gainNode = playbackCtx.createGain();
            source.connect(gainNode);
            gainNode.connect(playbackCtx.destination);
            media._gainConnected = true;
            ws.playbackGainNode = gainNode;
        }
        if (ws.playbackGainNode) {
            ws.playbackGainNode.gain.value = parseFloat(ui.volumeSlider.value);
        }
        
        const dur = ws.getDuration();
        const start = dur > 10 ? 5 : 0;
        const end = dur > 10 ? Math.min(15, dur) : dur;
        
        wsRegions.addRegion({
            start: start,
            end: end,
            color: 'rgba(99, 102, 241, 0.25)',
            drag: true,
            resize: true
        });
        
        if (btnBatchExport && uploadedFiles.length > 0) {
            btnBatchExport.removeAttribute('disabled');
        }
        
        ui.loadingOverlay.style.display = 'none';
    });

    ws.on('audioprocess', () => {
        const currentTime = ws.getCurrentTime();
        ui.currentTimeDisplay.textContent = formatTime(currentTime);

        if (fileObj.activeRegion && ws.isPlaying()) {
            if (currentTime >= fileObj.activeRegion.end) {
                ws.pause();
                ws.setTime(fileObj.activeRegion.start);
            }
        }
    });

    ws.on('seek', () => {
        ui.currentTimeDisplay.textContent = formatTime(ws.getCurrentTime());
    });

    ws.on('play', () => {
        ui.playIcon.classList.remove('ph-play');
        ui.playIcon.classList.add('ph-pause');
    });

    ws.on('pause', () => {
        ui.playIcon.classList.add('ph-play');
        ui.playIcon.classList.remove('ph-pause');
    });

    wsRegions.on('region-created', (region) => {
        if (region.end - region.start < 0.05) {
            region.remove();
            return;
        }
        if (fileObj.activeRegion && fileObj.activeRegion !== region) {
            fileObj.activeRegion.remove();
        }
        fileObj.activeRegion = region;
        ui.btnCutExport.removeAttribute('disabled');
    });

    wsRegions.on('region-updated', (region) => {
        fileObj.activeRegion = region;
    });

    wsRegions.on('region-clicked', (region, e) => {
        e.stopPropagation();
        region.play();
    });
    
    wsRegions.enableDragSelection({
        color: 'rgba(99, 102, 241, 0.25)',
    });

    // Buton kontrolleri
    ui.btnPlayPause.addEventListener('click', () => {
        if (!ws.isPlaying() && fileObj.activeRegion) {
            const currentTime = ws.getCurrentTime();
            if (currentTime < fileObj.activeRegion.start || currentTime >= fileObj.activeRegion.end) {
                ws.setTime(fileObj.activeRegion.start);
            }
        }
        ws.playPause();
    });

    ui.volumeSlider.addEventListener('input', (e) => {
        const vol = parseFloat(e.target.value);
        if(ui.volumePercentage) {
            ui.volumePercentage.textContent = Math.round(vol * 100) + '%';
        }
        
        if(ws.playbackGainNode) {
            ws.playbackGainNode.gain.value = vol;
        } else if (vol <= 1) {
            ws.setVolume(vol);
        }
        
        if (vol === 0) {
            ui.volumeIcon.className = 'ph ph-speaker-none';
        } else if (vol <= 0.5) {
            ui.volumeIcon.className = 'ph ph-speaker-low';
        } else {
            ui.volumeIcon.className = 'ph ph-speaker-high';
        }
    });

    ui.btnCutExport.addEventListener('click', () => handleSingleExport(fileObj, ui));

    // Dosyayı Yükle
    loadAudioData(fileObj, ws, ui);
};

const loadAudioData = async (fileObj, ws, ui) => {
    ui.loadingOverlay.style.display = 'flex';
    ui.loadingText.textContent = "Ses yükleniyor...";

    try {
        if (!fileObj.objectUrl) {
            fileObj.objectUrl = URL.createObjectURL(fileObj);
        }
        ws.load(fileObj.objectUrl);
        
        if (!fileObj.audioBufferInfo) {
            const arrayBuffer = await fileObj.arrayBuffer();
            if (!playbackCtx) {
                playbackCtx = new (window.AudioContext || window.webkitAudioContext)();
            }
            fileObj.audioBufferInfo = await playbackCtx.decodeAudioData(arrayBuffer);
        }
    } catch(e) {
        console.error("Load File Error", e);
        showToast(`Dosya okunamadı: ${fileObj.name}`, "error");
        ui.loadingOverlay.style.display = 'none';
    }
};

const removeFile = (fileId) => {
    const index = uploadedFiles.findIndex(f => f.id === fileId);
    if (index > -1) {
        const f = uploadedFiles[index];
        if (f.ws) {
            f.ws.destroy();
        }
        if (f.objectUrl) {
            URL.revokeObjectURL(f.objectUrl);
        }
        editorsList.children[index].remove();
        uploadedFiles.splice(index, 1);
        
        if (uploadedFiles.length === 0) {
            editorZone.classList.remove('active');
            uploadZone.classList.add('active');
            if (btnBatchExport) btnBatchExport.setAttribute('disabled', 'true');
        }
    }
};

// Export logic using Web Audio API and Lamejs
const handleSingleExport = async (fileObj, ui) => {
    if (!fileObj.activeRegion || !fileObj.audioBufferInfo) {
        showToast("Lütfen kesmek istediğiniz alanı seçin.", "error");
        return;
    }

    const start = fileObj.activeRegion.start;
    const end = fileObj.activeRegion.end;
    const format = ui.exportFormat.value;
    const finalName = ui.exportFilename.value.trim() || 'yeni_ses_dosyasi';
    const vol = parseFloat(ui.volumeSlider.value);
    
    ui.loadingText.textContent = "İşleniyor...";
    ui.loadingOverlay.style.display = 'flex';

    await new Promise(r => setTimeout(r, 100));

    try {
        const decodedData = fileObj.audioBufferInfo;
        const offlineCtx = new OfflineAudioContext(
            decodedData.numberOfChannels,
            Math.ceil((end - start) * decodedData.sampleRate),
            decodedData.sampleRate
        );
        
        const source = offlineCtx.createBufferSource();
        source.buffer = decodedData;

        const gainNode = offlineCtx.createGain();
        gainNode.gain.value = vol;

        source.connect(gainNode);
        gainNode.connect(offlineCtx.destination);
        source.start(0, start, end - start);

        const renderedBuffer = await offlineCtx.startRendering();
        let finalBlob;

        if (format === 'mp3') {
            finalBlob = encodeMPEG(renderedBuffer);
        } else {
            finalBlob = encodeWAV(renderedBuffer);
        }
        
        const url = URL.createObjectURL(finalBlob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = finalName + '.' + format;
        document.body.appendChild(a);
        a.click();
        
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 100);
        
        showToast('Ses başarıyla indirildi!', "success");

    } catch (e) {
        console.error("Export error", e);
        showToast("Hata: " + e.message, "error");
    } finally {
        ui.loadingOverlay.style.display = 'none';
    }
};

const handleBatchExport = async () => {
    if (uploadedFiles.length === 0) {
        showToast("İndirilecek dosya yok.", "error");
        return;
    }

    // We use the global toast container / active region indicator
    const overlay = document.createElement('div');
    overlay.className = 'loading-overlay active';
    overlay.style.position = 'fixed';
    overlay.style.zIndex = '9999';
    overlay.innerHTML = `
      <div class="spinner"></div>
      <p id="global-loading-text">Toplu İşlem Başlıyor...</p>
    `;
    document.body.appendChild(overlay);
    const globalLoadingText = document.getElementById('global-loading-text');
    
    await new Promise(r => setTimeout(r, 100));
    
    try {
        if (!playbackCtx) {
            playbackCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        
        // Loop over the editor list children which corresponds to uploadedFiles
        for (let i = 0; i < uploadedFiles.length; i++) {
            const fileObj = uploadedFiles[i];
            const card = editorsList.children[i];
            
            globalLoadingText.textContent = `İşleniyor (${i+1}/${uploadedFiles.length}): ${fileObj.name}`;
            await new Promise(r => setTimeout(r, 50));
            
            let decodedData = fileObj.audioBufferInfo;
            if (!decodedData) {
                const arrayBuffer = await fileObj.arrayBuffer();
                decodedData = await playbackCtx.decodeAudioData(arrayBuffer);
                fileObj.audioBufferInfo = decodedData;
            }
            
            const start = fileObj.activeRegion ? fileObj.activeRegion.start : 0;
            const end = fileObj.activeRegion ? fileObj.activeRegion.end : decodedData.duration;
            
            const format = card.querySelector('.export-format').value || 'mp3';
            const filenameInput = card.querySelector('.export-filename').value;
            const finalName = (filenameInput ? filenameInput.trim() : 'yeni_ses') || 'yeni_ses';
            const vol = parseFloat(card.querySelector('.volume-slider').value) || 1;
            
            const offlineCtx = new OfflineAudioContext(
                decodedData.numberOfChannels,
                Math.ceil((end - start) * decodedData.sampleRate),
                decodedData.sampleRate
            );
            
            const source = offlineCtx.createBufferSource();
            source.buffer = decodedData;
            
            const gainNode = offlineCtx.createGain();
            gainNode.gain.value = vol;
            
            source.connect(gainNode);
            gainNode.connect(offlineCtx.destination);
            source.start(0, start, end - start);
            
            const renderedBuffer = await offlineCtx.startRendering();
            let finalBlob;
            
            if (format === 'mp3') {
                finalBlob = encodeMPEG(renderedBuffer);
            } else {
                finalBlob = encodeWAV(renderedBuffer);
            }
            
            const url = URL.createObjectURL(finalBlob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = finalName + '.' + format;
            document.body.appendChild(a);
            a.click();
            
            setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }, 100);
        }
        
        showToast("Tüm dosyalar başarıyla indirildi!", "success");
    } catch (e) {
        console.error("Batch Export error", e);
        showToast("Toplu indirme hatası: " + e.message, "error");
    } finally {
        document.body.removeChild(overlay);
    }
};

// Converters
const encodeWAV = (audioBuffer) => {
    const numOfChan = audioBuffer.numberOfChannels;
    const length = audioBuffer.length * numOfChan * 2 + 44;
    const buffer = new ArrayBuffer(length);
    const view = new DataView(buffer);
    const channels = [];
    let offset = 0;
    let pos = 0;

    const setUint16 = (data) => { view.setUint16(pos, data, true); pos += 2; };
    const setUint32 = (data) => { view.setUint32(pos, data, true); pos += 4; };

    setUint32(0x46464952); // "RIFF"
    setUint32(length - 8);
    setUint32(0x45564157); // "WAVE"
    
    setUint32(0x20746d66); // "fmt " chunk
    setUint32(16); // length
    setUint16(1); // PCM (uncompressed)
    setUint16(numOfChan);
    setUint32(audioBuffer.sampleRate);
    setUint32(audioBuffer.sampleRate * 2 * numOfChan); // avg. bytes/sec
    setUint16(numOfChan * 2); // block-align
    setUint16(16); // 16-bit

    setUint32(0x61746164); // "data" - chunk
    setUint32(length - pos - 4);
    
    for (let i = 0; i < audioBuffer.numberOfChannels; i++) {
        channels.push(audioBuffer.getChannelData(i));
    }
    
    while (offset < audioBuffer.length) {
        for (let i = 0; i < numOfChan; i++) {
            let sample = Math.max(-1, Math.min(1, channels[i][offset]));
            sample = sample < 0 ? sample * 32768 : sample * 32767;
            view.setInt16(pos, sample, true); 
            pos += 2;
        }
        offset++;
    }
    return new Blob([buffer], { type: "audio/wav" });
};

const encodeMPEG = (audioBuffer) => {
    // Requires lamejs to be loaded (loaded via CDN)
    if (!window.lamejs) throw new Error("MP3 Encoder (lamejs) yüklenmedi.");
    
    const sampleRate = audioBuffer.sampleRate;
    const numOfChan = audioBuffer.numberOfChannels;
    const mp3encoder = new lamejs.Mp3Encoder(numOfChan, sampleRate, 128); // 128kbps
    
    const mp3Data = [];
    const sampleBlockSize = 1152;
    const left = audioBuffer.getChannelData(0);
    const right = numOfChan > 1 ? audioBuffer.getChannelData(1) : left;

    // Convert Float32 [-1.0, 1.0] to Int16 [-32768, 32767] with strict clamping to prevent static wrap-around
    const leftInt16 = new Int16Array(left.length);
    const rightInt16 = new Int16Array(right.length);
    
    for (let i = 0; i < left.length; i++) {
        let l = Math.max(-1, Math.min(1, left[i]));
        let r = Math.max(-1, Math.min(1, right[i]));
        
        leftInt16[i] = l < 0 ? l * 32768 : l * 32767;
        rightInt16[i] = r < 0 ? r * 32768 : r * 32767;
    }

    for (let i = 0; i < leftInt16.length; i += sampleBlockSize) {
        const leftChunk = leftInt16.subarray(i, i + sampleBlockSize);
        const rightChunk = rightInt16.subarray(i, i + sampleBlockSize);
        
        let mp3buf;
        if (numOfChan === 1) {
            mp3buf = mp3encoder.encodeBuffer(leftChunk);
        } else {
            mp3buf = mp3encoder.encodeBuffer(leftChunk, rightChunk);
        }
        
        if (mp3buf.length > 0) mp3Data.push(mp3buf);
    }

    const mp3buf = mp3encoder.flush();
    if (mp3buf.length > 0) mp3Data.push(new Int8Array(mp3buf));

    return new Blob(mp3Data, { type: 'audio/mp3' });
};

// Utility functions
const formatTime = (seconds) => {
    if (isNaN(seconds)) return "00:00.0";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 10);
    return mins.toString().padStart(2, '0') + ':' + secs.toString().padStart(2, '0') + '.' + ms;
};

const getFileExtension = (filename) => {
    return filename.split('.').pop();
};

const showToast = (message, type = 'info') => {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = 'toast ' + type;
    
    const icon = type === 'success' ? 'ph-check-circle' : (type === 'error' ? 'ph-warning-circle' : 'ph-info');
    const color = type === 'success' ? 'success' : (type === 'error' ? 'danger' : 'primary');
    
    toast.innerHTML = '<i class="ph ' + icon + '" style="font-size: 1.5rem; color: var(--' + color + ')"></i>' +
        '<span>' + message + '</span>';
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'fadeOut 0.3s forwards';
        setTimeout(() => {
            if (container.contains(toast)) {
                container.removeChild(toast);
            }
        }, 300);
    }, 3000);
};

// URL Shortener API Logic
document.addEventListener('DOMContentLoaded', () => {
    const btnShorten = document.getElementById('btn-shorten');
    const urlInput = document.getElementById('url-input');
    const resultDiv = document.getElementById('shortener-result');
    const shortenedUrlInput = document.getElementById('shortened-url');
    const btnCopyUrl = document.getElementById('btn-copy-url');

    if (btnShorten && urlInput) {
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
        
        // Enter tuşu ile kısaltma desteği
        urlInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                btnShorten.click();
            }
        });
    }

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
});

// Video Compressor Logic
document.addEventListener('DOMContentLoaded', () => {
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
    let videoFFmpeg = null;
    let finalVideoUrl = null;

    if (!videoInput) return;
    
    // Drag drop logic
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        videoUploadZone.addEventListener(eventName, preventDefaults, false);
    });
    
    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    videoUploadZone.addEventListener('dragover', () => {
        videoUploadZone.classList.add('dragover');
    });
    
    videoUploadZone.addEventListener('dragleave', () => {
        videoUploadZone.classList.remove('dragover');
    });
    
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

    function formatBytes(bytes, decimals = 2) {
        if (!+bytes) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
    }

    function handleVideoSelect(file) {
        if (!file.type.startsWith('video/')) {
            showToast("Lütfen geçerli bir video dosyası seçin.", "error");
            return;
        }

        currentVideoFile = file;
        videoName.textContent = file.name;
        videoOriginalSize.textContent = formatBytes(file.size);
        
        // Populate default filename
        const dotIndex = file.name.lastIndexOf('.');
        const baseName = dotIndex !== -1 ? file.name.substring(0, dotIndex) : file.name;
        if (exportFilenameInput) {
            exportFilenameInput.value = baseName + '_kucultulmus';
        }
        
        const url = URL.createObjectURL(file);
        videoPreview.src = url;
        
        videoUploadZone.style.display = 'none';
        videoEditorZone.style.display = 'flex';
        
        // Reset state
        progressContainer.classList.add('hidden');
        resultContainer.classList.add('hidden');
        btnCompressVideo.disabled = false;
        if (finalVideoUrl) {
            URL.revokeObjectURL(finalVideoUrl);
            finalVideoUrl = null;
        }
        videoInput.value = '';
    }

    btnCompressVideo.addEventListener('click', async () => {
        if (!currentVideoFile) return;
        
        btnCompressVideo.disabled = true;
        progressContainer.classList.remove('hidden');
        resultContainer.classList.add('hidden');
        progressBar.style.width = '0%';
        progressPercent.textContent = '0%';
        progressText.textContent = "Tarayıcı motoru hazırlanıyor...";
        
        try {
            const scale = parseFloat(scaleSelect.value);
            // Quality maps to videoBitsPerSecond
            // 23 = high (~2.5 Mbps), 28 = medium (~1 Mbps), 32 = low (~500 kbps), 36 = very low (~250 kbps)
            let bitrate = 1000000;
            switch(qualitySelect.value) {
                case "23": bitrate = 2500000; break;
                case "28": bitrate = 1000000; break;
                case "32": bitrate = 500000; break;
                case "36": bitrate = 250000; break;
            }

            // Using Native HTML5 MediaRecorder (Works everywhere, no worker needed)
            const videoInstance = document.createElement('video');
            videoInstance.src = URL.createObjectURL(currentVideoFile);
            videoInstance.crossOrigin = 'anonymous';
            videoInstance.muted = true; // Must be muted for background autoplay
            
            await new Promise((resolve, reject) => {
                videoInstance.onloadedmetadata = () => resolve();
                videoInstance.onerror = () => reject("Video yüklenemedi");
            });

            const canvas = document.createElement('canvas');
            canvas.width = Math.floor(videoInstance.videoWidth * scale / 2) * 2;
            canvas.height = Math.floor(videoInstance.videoHeight * scale / 2) * 2;
            const ctx = canvas.getContext('2d', { alpha: false });

            // Set up audio extraction via Web Audio API
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            const audioCtx = new AudioContext();
            const sourceNode = audioCtx.createMediaElementSource(videoInstance);
            const destNode = audioCtx.createMediaStreamDestination();
            sourceNode.connect(destNode);

            // Create Canvas video stream
            const canvasStream = canvas.captureStream(30); // 30 FPS
            
            // Combine video and audio
            const combinedStream = new MediaStream([
                ...canvasStream.getVideoTracks(),
                ...destNode.stream.getAudioTracks()
            ]);

            let chosenFormat = exportFormatSelect ? exportFormatSelect.value : 'webm';
            let mimeType = `video/${chosenFormat}`;
            
            if (chosenFormat === 'webm') {
                mimeType = 'video/webm; codecs=vp9,opus';
                if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = 'video/webm';
            }

            if (!MediaRecorder.isTypeSupported(mimeType)) {
                showToast(`Seçilen format (${chosenFormat}) tarayıcıda desteklenmiyor, webm/mp4 yapılıyor...`, "info");
                mimeType = MediaRecorder.isTypeSupported('video/webm') ? 'video/webm' : 'video/mp4';
                chosenFormat = mimeType.split('/')[1];
            }

            const recorderOptions = {
                mimeType: mimeType,
                videoBitsPerSecond: bitrate
            };

            const recorder = new MediaRecorder(combinedStream, recorderOptions);
            const chunks = [];

            recorder.ondataavailable = e => {
                if (e.data && e.data.size > 0) chunks.push(e.data);
            };

            const recordingPromise = new Promise((resolve) => {
                recorder.onstop = () => {
                    const blob = new Blob(chunks, { type: mimeType });
                    resolve(blob);
                };
            });

            progressText.textContent = "Sıkıştırılıyor (Video cihazınızda gerçek zamanlı işleniyor)...";
            
            recorder.start();
            videoInstance.play();

            const drawLoop = () => {
                if (!videoInstance.paused && !videoInstance.ended) {
                    ctx.drawImage(videoInstance, 0, 0, canvas.width, canvas.height);
                    
                    const pct = Math.min(100, Math.round((videoInstance.currentTime / videoInstance.duration) * 100));
                    progressBar.style.width = pct + '%';
                    progressPercent.textContent = pct + '%';
                    
                    requestAnimationFrame(drawLoop);
                }
            };

            videoInstance.addEventListener('play', () => {
                drawLoop();
            });

            videoInstance.addEventListener('ended', () => {
                recorder.stop();
            });

            const finalBlob = await recordingPromise;
            
            finalVideoUrl = URL.createObjectURL(finalBlob);
            
            window.lastVideoExtension = '.' + chosenFormat;
            window.lastVideoFilename = exportFilenameInput ? exportFilenameInput.value.trim() : 'video_sikistirilmis';
            if (!window.lastVideoFilename) window.lastVideoFilename = 'video_sikistirilmis';
            
            videoNewSizeSpan.textContent = formatBytes(finalBlob.size);
            progressContainer.classList.add('hidden');
            resultContainer.classList.remove('hidden');
            
            showToast("Video başarıyla sıkıştırıldı!", "success");
            
            URL.revokeObjectURL(videoInstance.src);
            audioCtx.close();
            
        } catch (err) {
            console.error(err);
            progressText.textContent = "Sıkıştırma Hatası!";
            showToast("Tarayıcınızın medya özelliklerinde sorun oluştu.", "error");
        } finally {
            btnCompressVideo.disabled = false;
        }
    });

    btnDownloadVideo.addEventListener('click', () => {
        if (!finalVideoUrl) return;
        const a = document.createElement('a');
        a.href = finalVideoUrl;
        
        const fileName = window.lastVideoFilename || 'video_sikistirilmis';
        const ext = window.lastVideoExtension || '.mp4';
        
        a.download = fileName + ext;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        showToast("İndirme başladı!", "info");
    });
});

// QR Generator Logic
document.addEventListener('DOMContentLoaded', () => {
    const btnGenerateQR = document.getElementById('btn-generate-qr');
    const qrUrlInput = document.getElementById('qr-url-input');
    const qrResultBox = document.getElementById('qr-result-box');
    const qrContainer = document.getElementById('qr-container');
    const qrFilenameInput = document.getElementById('qr-filename-input');
    const btnDownloadQR = document.getElementById('btn-download-qr');

    if (btnGenerateQR && qrUrlInput) {
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
                    throw new Error("QR Kod kütüphanesi yüklenemedi. Sayfayı yenilemeyi deneyin.");
                }
                
                qrContainer.innerHTML = ""; // Temizle
                
                new QRCode(qrContainer, {
                    text: url,
                    width: 250,
                    height: 250,
                    colorDark : "#000000",
                    colorLight : "#ffffff",
                    correctLevel : QRCode.CorrectLevel.L
                });

                btnGenerateQR.disabled = false;
                btnGenerateQR.innerHTML = 'Oluştur';
                qrResultBox.classList.remove('hidden');
                showToast("QR Kod başarıyla oluşturuldu!", "success");
                qrFilenameInput.focus();
            } catch (err) {
                console.error("QR Error:", err);
                btnGenerateQR.disabled = false;
                btnGenerateQR.innerHTML = 'Oluştur';
                showToast(err.message || "QR Kod oluşturulurken bir hata oluştu.", "error");
            }
        });

        // Enter key to trigger generation
        qrUrlInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                btnGenerateQR.click();
            }
        });
    }

    if (btnDownloadQR && qrContainer) {
        btnDownloadQR.addEventListener('click', () => {
            const filename = (qrFilenameInput.value.trim() || 'qr_kodu');
            
            const canvas = qrContainer.querySelector('canvas');
            if (!canvas) {
                showToast("İndirilecek QR kod bulunamadı.", "error");
                return;
            }
            
            // Çerçeve (padding) ayarı
            const padding = 20;
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = canvas.width + (padding * 2);
            tempCanvas.height = canvas.height + (padding * 2);
            const ctx = tempCanvas.getContext('2d');
            
            // Beyaz arka planı çiz (ekrandaki gibi hafif yuvarlatılmış)
            ctx.fillStyle = '#ffffff';
            if (ctx.roundRect) {
                ctx.beginPath();
                ctx.roundRect(0, 0, tempCanvas.width, tempCanvas.height, 16);
                ctx.fill();
            } else {
                ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
            }
            
            // QR Kodu tam ortaya çiz
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
});
