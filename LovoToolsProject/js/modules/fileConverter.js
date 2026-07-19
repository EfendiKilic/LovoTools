import { showToast, formatBytes, preventDefaults, downloadBlob, sanitizeFilename } from '../utils.js';
import { getFFmpeg, fetchFile } from '../ffmpegLoader.js';

/**
 * Dosya Dönüştürücü — çoklu dosya, format seçimi, tekil ve toplu (ZIP) indirme.
 * Görsel: Canvas + FFmpeg.wasm | Ses/Video: FFmpeg.wasm | Veri: SheetJS | Belge: mammoth/marked/turndown
 * Ağır kütüphaneler yalnızca ilgili dönüşüm ilk kez çalıştığında yüklenir.
 */

/* ---------- Format tanımları ---------- */

const CATEGORIES = {
    image: {
        icon: 'ph-image',
        exts: ['png', 'jpg', 'jpeg', 'webp', 'bmp', 'gif', 'svg', 'ico', 'tif', 'tiff', 'avif'],
        targets: ['png', 'jpg', 'webp', 'bmp', 'gif', 'ico', 'tiff', 'pdf']
    },
    audio: {
        icon: 'ph-music-notes',
        exts: ['mp3', 'wav', 'ogg', 'oga', 'm4a', 'aac', 'flac', 'wma', 'opus', 'aiff', 'aif', 'amr', 'mka', 'wv'],
        targets: ['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac']
    },
    video: {
        icon: 'ph-film-strip',
        exts: ['mp4', 'webm', 'mov', 'avi', 'mkv', 'wmv', 'flv', '3gp', 'mpg', 'mpeg', 'ts', 'mts', 'm2ts', 'm4v', 'ogv'],
        targets: ['mp4', 'webm', 'mov', 'mkv', 'avi', 'gif', 'mp3', 'wav']
    },
    data: {
        icon: 'ph-table',
        exts: ['csv', 'tsv', 'xlsx', 'xls', 'json'],
        targets: ['csv', 'tsv', 'json', 'xlsx']
    },
    doc: {
        icon: 'ph-file-text',
        exts: ['docx', 'md', 'markdown', 'html', 'htm'],
        targets: [] // kaynak uzantısına göre docTargets() ile belirlenir
    }
};

function docTargets(ext) {
    if (ext === 'docx') return ['html', 'txt'];
    if (ext === 'md' || ext === 'markdown') return ['html'];
    return ['md', 'txt']; // html / htm
}

const MIME = {
    png: 'image/png', jpg: 'image/jpeg', webp: 'image/webp', bmp: 'image/bmp',
    gif: 'image/gif', ico: 'image/x-icon', tiff: 'image/tiff', pdf: 'application/pdf',
    mp3: 'audio/mpeg', wav: 'audio/wav', ogg: 'audio/ogg', m4a: 'audio/mp4',
    flac: 'audio/flac', aac: 'audio/aac',
    mp4: 'video/mp4', webm: 'video/webm', mov: 'video/quicktime',
    mkv: 'video/x-matroska', avi: 'video/x-msvideo',
    csv: 'text/csv;charset=utf-8', tsv: 'text/tab-separated-values;charset=utf-8',
    json: 'application/json;charset=utf-8',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    html: 'text/html;charset=utf-8', txt: 'text/plain;charset=utf-8', md: 'text/markdown;charset=utf-8'
};

const AUDIO_CODECS = {
    mp3: 'libmp3lame', wav: 'pcm_s16le', ogg: 'libvorbis',
    m4a: 'aac', flac: 'flac', aac: 'aac'
};

function getExt(name) {
    const i = name.lastIndexOf('.');
    return i === -1 ? '' : name.slice(i + 1).toLowerCase();
}

function detectCategory(ext) {
    for (const [key, cfg] of Object.entries(CATEGORIES)) {
        if (cfg.exts.includes(ext)) return key;
    }
    return null;
}

/* ---------- Tembel kütüphane yükleyici ---------- */

const scriptCache = {};
function loadScript(src) {
    if (scriptCache[src]) return scriptCache[src];
    scriptCache[src] = new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = src;
        s.onload = resolve;
        s.onerror = () => { delete scriptCache[src]; reject(new Error('Kütüphane yüklenemedi: ' + src)); };
        document.head.appendChild(s);
    });
    return scriptCache[src];
}

/* ---------- Görsel yardımcıları ---------- */

function rasterize(file, opts = {}) {
    const url = URL.createObjectURL(file);
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            URL.revokeObjectURL(url);
            let w = img.naturalWidth || img.width || 1024;
            let h = img.naturalHeight || img.height || 1024;
            if (opts.maxSize && (w > opts.maxSize || h > opts.maxSize)) {
                const ratio = Math.min(opts.maxSize / w, opts.maxSize / h);
                w = Math.max(1, Math.round(w * ratio));
                h = Math.max(1, Math.round(h * ratio));
            }
            const canvas = document.createElement('canvas');
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d');
            if (opts.background) {
                ctx.fillStyle = opts.background;
                ctx.fillRect(0, 0, w, h);
            }
            ctx.drawImage(img, 0, 0, w, h);
            resolve(canvas);
        };
        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error('Görsel çözümlenemedi.'));
        };
        img.src = url;
    });
}

function canvasToBlob(canvas, mime, quality) {
    return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
            if (blob) resolve(blob);
            else reject(new Error('Tarayıcınız bu formatı desteklemiyor.'));
        }, mime, quality);
    });
}

/* ---------- FFmpeg yardımcıları ---------- */

let progressAttached = false;
let activeProgressBar = null;

async function getFF() {
    const ffmpeg = await getFFmpeg();
    if (!progressAttached) {
        ffmpeg.on('progress', ({ progress }) => {
            if (!activeProgressBar) return;
            const pct = Math.min(100, Math.max(0, Math.round(progress * 100)));
            activeProgressBar.style.width = pct + '%';
        });
        progressAttached = true;
    }
    return ffmpeg;
}

async function ffmpegRun(input, inExt, outExt, args) {
    const ffmpeg = await getFF();
    const stamp = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const inputName = `fc_in_${stamp}` + (inExt ? '.' + inExt : '');
    const outputName = `fc_out_${stamp}.${outExt}`;

    await ffmpeg.writeFile(inputName, await fetchFile(input));
    try {
        await ffmpeg.exec(['-i', inputName, ...args, outputName]);
        const data = await ffmpeg.readFile(outputName);
        if (!data || data.length === 0) throw new Error('Dönüştürme sonucu boş.');
        return new Blob([data.buffer], { type: MIME[outExt] || 'application/octet-stream' });
    } finally {
        try { await ffmpeg.deleteFile(inputName); } catch (_) {}
        try { await ffmpeg.deleteFile(outputName); } catch (_) {}
    }
}

function videoArgs(target) {
    switch (target) {
        case 'mp4':
        case 'mov':
            return ['-c:v', 'libx264', '-preset', 'veryfast', '-crf', '23', '-pix_fmt', 'yuv420p',
                    '-vf', 'pad=ceil(iw/2)*2:ceil(ih/2)*2', '-c:a', 'aac', '-movflags', 'faststart'];
        case 'mkv':
            return ['-c:v', 'libx264', '-preset', 'veryfast', '-crf', '23', '-pix_fmt', 'yuv420p',
                    '-vf', 'pad=ceil(iw/2)*2:ceil(ih/2)*2', '-c:a', 'aac'];
        case 'avi':
            return ['-c:v', 'mpeg4', '-q:v', '5', '-c:a', 'libmp3lame'];
        case 'webm':
            return ['-c:v', 'libvpx', '-b:v', '1M', '-c:a', 'libvorbis'];
        case 'gif':
            return ['-vf', 'fps=12,scale=480:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse', '-loop', '0'];
        case 'mp3':
        case 'wav':
            return ['-vn', '-c:a', AUDIO_CODECS[target]];
        default:
            return [];
    }
}

/* ---------- Dönüşüm motorları ---------- */

async function convertImage(file, ext, target) {
    if (target === 'pdf') {
        const { PDFDocument } = window.PDFLib;
        const doc = await PDFDocument.create();
        let img;
        if (ext === 'jpg' || ext === 'jpeg') {
            img = await doc.embedJpg(await file.arrayBuffer());
        } else if (ext === 'png') {
            img = await doc.embedPng(await file.arrayBuffer());
        } else {
            const canvas = await rasterize(file);
            const pngBlob = await canvasToBlob(canvas, 'image/png');
            img = await doc.embedPng(await pngBlob.arrayBuffer());
        }
        const page = doc.addPage([img.width, img.height]);
        page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
        return new Blob([await doc.save()], { type: MIME.pdf });
    }

    if (target === 'png' || target === 'jpg' || target === 'webp') {
        const background = target === 'jpg' ? '#ffffff' : null;
        const canvas = await rasterize(file, { background });
        return canvasToBlob(canvas, MIME[target], target === 'png' ? undefined : 0.92);
    }

    // bmp / gif / ico / tiff: önce PNG'ye normalize et (SVG/AVIF dahil), sonra FFmpeg
    const canvas = await rasterize(file, { maxSize: target === 'ico' ? 256 : null });
    const pngBlob = await canvasToBlob(canvas, 'image/png');
    return ffmpegRun(pngBlob, 'png', target, []);
}

async function convertAudio(file, ext, target) {
    return ffmpegRun(file, ext, target, ['-vn', '-c:a', AUDIO_CODECS[target]]);
}

async function convertVideo(file, ext, target) {
    return ffmpegRun(file, ext, target, videoArgs(target));
}

async function convertData(file, ext, target) {
    await loadScript('vendor/xlsx/xlsx.full.min.js');
    const XLSX = window.XLSX;

    let sheet;
    if (ext === 'xlsx' || ext === 'xls') {
        const wb = XLSX.read(await file.arrayBuffer(), { type: 'array' });
        sheet = wb.Sheets[wb.SheetNames[0]];
    } else if (ext === 'json') {
        let data = JSON.parse(await file.text());
        if (!Array.isArray(data)) {
            if (typeof data === 'object' && data !== null) data = [data];
            else throw new Error('JSON bir nesne dizisi olmalı: [{...}, {...}]');
        }
        sheet = (data.length && Array.isArray(data[0]))
            ? XLSX.utils.aoa_to_sheet(data)
            : XLSX.utils.json_to_sheet(data);
    } else {
        const wb = XLSX.read(await file.text(), { type: 'string', raw: true });
        sheet = wb.Sheets[wb.SheetNames[0]];
    }
    if (!sheet) throw new Error('Dosyadan veri okunamadı.');

    if (target === 'json') {
        const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
        return new Blob([JSON.stringify(rows, null, 2)], { type: MIME.json });
    }
    if (target === 'csv' || target === 'tsv') {
        const text = XLSX.utils.sheet_to_csv(sheet, target === 'tsv' ? { FS: '\t' } : undefined);
        // BOM: Excel'in Türkçe karakterleri doğru açması için
        return new Blob(['﻿' + text], { type: MIME[target] });
    }
    // xlsx
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, sheet, 'Veri');
    const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    return new Blob([out], { type: MIME.xlsx });
}

function wrapHtmlDocument(bodyHtml, title) {
    return '<!DOCTYPE html>\n<html>\n<head>\n<meta charset="UTF-8">\n<title>' +
        (title || 'LovoTools') + '</title>\n</head>\n<body>\n' + bodyHtml + '\n</body>\n</html>';
}

async function convertDoc(file, ext, target) {
    if (ext === 'docx') {
        await loadScript('vendor/mammoth/mammoth.browser.min.js');
        const arrayBuffer = await file.arrayBuffer();
        if (target === 'txt') {
            const result = await window.mammoth.extractRawText({ arrayBuffer });
            return new Blob([result.value], { type: MIME.txt });
        }
        const result = await window.mammoth.convertToHtml({ arrayBuffer });
        return new Blob([wrapHtmlDocument(result.value, file.name)], { type: MIME.html });
    }

    if (ext === 'md' || ext === 'markdown') {
        await loadScript('vendor/marked/marked.min.js');
        await loadScript('vendor/dompurify/purify.min.js');
        const html = window.DOMPurify.sanitize(window.marked.parse(await file.text()));
        return new Blob([wrapHtmlDocument(html, file.name)], { type: MIME.html });
    }

    // html / htm
    const text = await file.text();
    if (target === 'txt') {
        const parsed = new DOMParser().parseFromString(text, 'text/html');
        return new Blob([parsed.body ? parsed.body.textContent : ''], { type: MIME.txt });
    }
    await loadScript('vendor/turndown/turndown.js');
    const turndown = new window.TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced' });
    return new Blob([turndown.turndown(text)], { type: MIME.md });
}

const ENGINES = {
    image: convertImage,
    audio: convertAudio,
    video: convertVideo,
    data: convertData,
    doc: convertDoc
};

/* ---------- Modül ---------- */

export function initFileConverter() {
    const panel = document.getElementById('file-converter-panel');
    if (!panel) return;

    const uploadZone = document.getElementById('fconv-upload-zone');
    const workspace = document.getElementById('fconv-workspace');
    const input = document.getElementById('fconv-input');
    const listEl = document.getElementById('fconv-list');
    const btnAdd = document.getElementById('fconv-btn-add');
    const btnClear = document.getElementById('fconv-btn-clear');
    const btnConvertAll = document.getElementById('fconv-btn-convert-all');
    const btnZip = document.getElementById('fconv-btn-zip');
    const countEl = document.getElementById('fconv-count');

    let rows = [];
    let nextId = 1;
    let jobQueue = Promise.resolve();

    /* --- Sürükle bırak --- */
    [uploadZone, workspace].forEach(zone => {
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(ev => {
            zone.addEventListener(ev, preventDefaults, false);
        });
        zone.addEventListener('dragover', () => zone.classList.add('dragover'));
        zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
        zone.addEventListener('drop', (e) => {
            zone.classList.remove('dragover');
            if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
        });
    });

    input.addEventListener('change', (e) => {
        if (e.target.files.length) addFiles(e.target.files);
        input.value = '';
    });

    btnAdd.addEventListener('click', () => input.click());

    /* --- Dosya ekleme --- */
    function addFiles(fileList) {
        let added = 0, skipped = 0;
        for (const file of fileList) {
            const ext = getExt(file.name);
            const category = detectCategory(ext);
            if (!category) { skipped++; continue; }

            const targets = category === 'doc' ? docTargets(ext) : CATEGORIES[category].targets;
            const row = {
                id: nextId++,
                file,
                ext,
                category,
                targets,
                target: targets.find(t => t !== ext) || targets[0],
                status: 'ready',
                blob: null,
                el: null
            };
            rows.push(row);
            renderRow(row);
            added++;
        }

        if (skipped) showToast(`${skipped} dosya desteklenmeyen formatta olduğu için atlandı.`, 'warning');
        if (added) {
            uploadZone.classList.remove('active');
            workspace.classList.add('active');
        }
        updateToolbar();
    }

    /* --- Satır oluşturma --- */
    function renderRow(row) {
        const el = document.createElement('div');
        el.className = 'fconv-row';
        el.innerHTML = `
            <div class="fconv-row-icon"><i class="ph ${CATEGORIES[row.category].icon}"></i></div>
            <div class="fconv-row-info">
                <strong title="${row.file.name}">${row.file.name}</strong>
                <span class="fconv-row-meta">${formatBytes(row.file.size)}<span class="fconv-out-info"></span></span>
            </div>
            <input type="text" class="custom-input fconv-name-input" value="${row.file.name.replace(/\.[^/.]+$/, '').replace(/"/g, '&quot;')}">
            <div class="fconv-target-wrap">
                <i class="ph ph-arrow-right"></i>
                <select class="custom-select fconv-format-select">
                    ${row.targets.map(t => `<option value="${t}" ${t === row.target ? 'selected' : ''}>${t.toUpperCase()}</option>`).join('')}
                </select>
            </div>
            <div class="fconv-row-actions">
                <button class="btn btn-primary fconv-btn-convert" title="Dönüştür"><i class="ph ph-arrows-clockwise"></i></button>
                <button class="btn fconv-btn-download hidden" title="İndir"><i class="ph ph-download-simple"></i></button>
                <button class="btn fconv-btn-remove" title="Kaldır"><i class="ph ph-x"></i></button>
            </div>
            <div class="fconv-row-progress hidden"><div class="fconv-row-progress-fill"></div></div>`;

        el.querySelector('.fconv-format-select').addEventListener('change', (e) => {
            row.target = e.target.value;
            resetRowResult(row);
        });
        el.querySelector('.fconv-btn-convert').addEventListener('click', () => enqueueRow(row));
        el.querySelector('.fconv-btn-download').addEventListener('click', () => downloadRow(row));
        el.querySelector('.fconv-btn-remove').addEventListener('click', () => removeRow(row));

        row.el = el;
        listEl.appendChild(el);
    }

    function resetRowResult(row) {
        if (row.status === 'working') return;
        row.status = 'ready';
        row.blob = null;
        row.el.classList.remove('done', 'error');
        row.el.querySelector('.fconv-out-info').textContent = '';
        row.el.querySelector('.fconv-btn-download').classList.add('hidden');
        row.el.querySelector('.fconv-btn-convert').classList.remove('hidden');
        updateToolbar();
    }

    function removeRow(row) {
        if (row.status === 'working') return;
        rows = rows.filter(r => r !== row);
        row.el.remove();
        if (!rows.length) {
            workspace.classList.remove('active');
            uploadZone.classList.add('active');
        }
        updateToolbar();
    }

    function updateToolbar() {
        const doneCount = rows.filter(r => r.status === 'done').length;
        btnZip.disabled = doneCount === 0;
        btnConvertAll.disabled = rows.every(r => r.status === 'done' || r.status === 'working');
        if (countEl) countEl.textContent = rows.length ? `${rows.length} dosya · ${doneCount} hazır` : '';
    }

    /* --- Dönüştürme kuyruğu (FFmpeg tek örnek olduğu için sıralı) --- */
    function enqueueRow(row) {
        if (row.status === 'working' || row.status === 'done') return;
        setRowWorking(row);
        jobQueue = jobQueue.then(() => convertRow(row)).catch(() => {});
        updateToolbar();
    }

    function setRowWorking(row) {
        row.status = 'working';
        row.el.classList.remove('error', 'done');
        const progressBox = row.el.querySelector('.fconv-row-progress');
        progressBox.classList.remove('hidden');
        row.el.querySelector('.fconv-row-progress-fill').style.width = '0%';
        row.el.querySelector('.fconv-btn-convert').disabled = true;
    }

    async function convertRow(row) {
        const progressFill = row.el.querySelector('.fconv-row-progress-fill');
        const usesFFmpeg = row.category === 'audio' || row.category === 'video' ||
            (row.category === 'image' && ['bmp', 'gif', 'ico', 'tiff'].includes(row.target));
        if (usesFFmpeg) activeProgressBar = progressFill;

        try {
            row.blob = await ENGINES[row.category](row.file, row.ext, row.target);
            row.status = 'done';
            progressFill.style.width = '100%';
            row.el.classList.add('done');
            row.el.querySelector('.fconv-out-info').textContent = ` → ${row.target.toUpperCase()} · ${formatBytes(row.blob.size)}`;
            row.el.querySelector('.fconv-btn-convert').classList.add('hidden');
            row.el.querySelector('.fconv-btn-download').classList.remove('hidden');
        } catch (err) {
            console.error('FileConverter:', err);
            row.status = 'error';
            row.el.classList.add('error');
            showToast(`"${row.file.name}" dönüştürülemedi: ${err.message || 'bilinmeyen hata'}`, 'error');
        } finally {
            if (activeProgressBar === progressFill) activeProgressBar = null;
            row.el.querySelector('.fconv-row-progress').classList.add('hidden');
            row.el.querySelector('.fconv-btn-convert').disabled = false;
            updateToolbar();
        }
    }

    function outputName(row) {
        const base = sanitizeFilename(row.el.querySelector('.fconv-name-input').value, 'lovo_dosya');
        return `${base}.${row.target}`;
    }

    function downloadRow(row) {
        if (!row.blob) return;
        downloadBlob(row.blob, outputName(row));
    }

    /* --- Toplu işlemler --- */
    btnConvertAll.addEventListener('click', () => {
        const pending = rows.filter(r => r.status === 'ready' || r.status === 'error');
        if (!pending.length) return;
        pending.forEach(r => { r.status = 'ready'; enqueueRow(r); });
    });

    btnZip.addEventListener('click', async () => {
        const done = rows.filter(r => r.status === 'done' && r.blob);
        if (!done.length) return;

        btnZip.disabled = true;
        try {
            await loadScript('vendor/jszip/jszip.min.js');
            const zip = new window.JSZip();
            const usedNames = new Set();

            for (const row of done) {
                let name = outputName(row);
                let counter = 1;
                while (usedNames.has(name)) {
                    name = outputName(row).replace(/(\.[^.]+)$/, `_${counter}$1`);
                    counter++;
                }
                usedNames.add(name);
                zip.file(name, row.blob);
            }

            const blob = await zip.generateAsync({ type: 'blob' });
            downloadBlob(blob, 'lovotools_donusturulen.zip');
            showToast(`${done.length} dosya ZIP olarak indirildi!`, 'success');
        } catch (err) {
            console.error('FileConverter ZIP:', err);
            showToast('ZIP oluşturulamadı.', 'error');
        } finally {
            btnZip.disabled = false;
        }
    });

    btnClear.addEventListener('click', () => {
        if (rows.some(r => r.status === 'working')) {
            showToast('Devam eden dönüştürme bitmeden liste temizlenemez.', 'warning');
            return;
        }
        rows = [];
        listEl.innerHTML = '';
        workspace.classList.remove('active');
        uploadZone.classList.add('active');
        updateToolbar();
    });
}
