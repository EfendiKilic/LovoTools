import { showToast, downloadBlob } from '../utils.js';

/**
 * Altyazı Dönüştürücü — SRT / VTT / ASS(SSA), saf metin işleme.
 * Ortak model: [{ start: saniye, end: saniye, text }]
 */

/* --- Zaman yardımcıları --- */
function srtTimeToSec(t) {
    const m = t.trim().match(/(\d+):(\d{1,2}):(\d{1,2})[,.](\d{1,3})/);
    if (!m) return null;
    return (+m[1]) * 3600 + (+m[2]) * 60 + (+m[3]) + (+m[4].padEnd(3, '0')) / 1000;
}

function assTimeToSec(t) {
    const m = t.trim().match(/(\d+):(\d{1,2}):(\d{1,2})\.(\d{1,2})/);
    if (!m) return null;
    return (+m[1]) * 3600 + (+m[2]) * 60 + (+m[3]) + (+m[4].padEnd(2, '0')) / 100;
}

function pad(n, len = 2) { return String(n).padStart(len, '0'); }

function secToSrtTime(sec) {
    const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = Math.floor(sec % 60);
    const ms = Math.round((sec % 1) * 1000);
    return `${pad(h)}:${pad(m)}:${pad(s)},${pad(ms, 3)}`;
}

function secToVttTime(sec) {
    return secToSrtTime(sec).replace(',', '.');
}

function secToAssTime(sec) {
    const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = Math.floor(sec % 60);
    const cs = Math.round((sec % 1) * 100);
    return `${h}:${pad(m)}:${pad(s)}.${pad(cs)}`;
}

/* --- Ayrıştırıcılar --- */
function parseSrt(text) {
    const cues = [];
    const blocks = text.replace(/\r/g, '').split(/\n\n+/);
    for (const block of blocks) {
        const lines = block.split('\n').filter(l => l.trim() !== '');
        if (!lines.length) continue;
        let i = 0;
        if (/^\d+$/.test(lines[0].trim())) i = 1; // sıra numarası
        if (i >= lines.length) continue;
        const tm = lines[i].match(/(.+?)\s*-->\s*(.+)/);
        if (!tm) continue;
        const start = srtTimeToSec(tm[1]);
        const end = srtTimeToSec(tm[2]);
        if (start === null || end === null) continue;
        const cueText = lines.slice(i + 1).join('\n').trim();
        if (cueText) cues.push({ start, end, text: cueText });
    }
    return cues;
}

function parseVtt(text) {
    const body = text.replace(/\r/g, '').replace(/^﻿?WEBVTT[^\n]*\n?/, '');
    const cues = [];
    const blocks = body.split(/\n\n+/);
    for (const block of blocks) {
        const lines = block.split('\n').filter(l => l.trim() !== '');
        if (!lines.length) continue;
        let i = 0;
        // NOTE/STYLE bloklarını atla
        if (/^(NOTE|STYLE|REGION)\b/.test(lines[0])) continue;
        if (!lines[i].includes('-->') && i + 1 < lines.length && lines[i + 1].includes('-->')) i = 1; // cue kimliği
        if (i >= lines.length) continue;
        const tm = lines[i].match(/(.+?)\s*-->\s*([^\s]+)/);
        if (!tm) continue;
        const start = srtTimeToSec(tm[1]);
        const end = srtTimeToSec(tm[2]);
        if (start === null || end === null) continue;
        // <b>, <i> gibi VTT etiketlerini temizle
        const cueText = lines.slice(i + 1).join('\n').replace(/<[^>]+>/g, '').trim();
        if (cueText) cues.push({ start, end, text: cueText });
    }
    return cues;
}

function parseAss(text) {
    const cues = [];
    const lines = text.replace(/\r/g, '').split('\n');
    let format = null;
    for (const line of lines) {
        if (/^Format:/i.test(line.trim()) ) {
            // [Events] bölümündeki Format satırı alan sırasını belirler
            format = line.replace(/^Format:/i, '').split(',').map(f => f.trim().toLowerCase());
            continue;
        }
        if (!/^Dialogue:/i.test(line.trim())) continue;
        const fields = format || ['layer', 'start', 'end', 'style', 'name', 'marginl', 'marginr', 'marginv', 'effect', 'text'];
        const raw = line.replace(/^Dialogue:\s*/i, '');
        const parts = raw.split(',');
        if (parts.length < fields.length) continue;
        const rec = {};
        fields.forEach((f, idx) => {
            rec[f] = f === 'text' ? parts.slice(idx).join(',') : parts[idx];
        });
        const start = assTimeToSec(rec.start || '');
        const end = assTimeToSec(rec.end || '');
        if (start === null || end === null) continue;
        const cueText = (rec.text || '')
            .replace(/\{[^}]*\}/g, '')   // {\pos(...)} gibi stil etiketleri
            .replace(/\\N/gi, '\n')       // satır sonları
            .replace(/\\h/gi, ' ')
            .trim();
        if (cueText) cues.push({ start, end, text: cueText });
    }
    return cues;
}

/* --- Üreticiler --- */
function toSrt(cues) {
    return cues.map((c, i) =>
        `${i + 1}\n${secToSrtTime(c.start)} --> ${secToSrtTime(c.end)}\n${c.text}`
    ).join('\n\n') + '\n';
}

function toVtt(cues) {
    return 'WEBVTT\n\n' + cues.map(c =>
        `${secToVttTime(c.start)} --> ${secToVttTime(c.end)}\n${c.text}`
    ).join('\n\n') + '\n';
}

function toAss(cues) {
    const header = `[Script Info]
Title: LovoTools Altyazı
ScriptType: v4.00+
WrapStyle: 0
PlayResX: 1920
PlayResY: 1080

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Arial,48,&H00FFFFFF,&H000000FF,&H00000000,&H80000000,0,0,0,0,100,100,0,0,1,2,1,2,60,60,40,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;
    const events = cues.map(c =>
        `Dialogue: 0,${secToAssTime(c.start)},${secToAssTime(c.end)},Default,,0,0,0,,${c.text.replace(/\n/g, '\\N')}`
    ).join('\n');
    return header + events + '\n';
}

function detectFormat(text) {
    const head = text.trim().slice(0, 400);
    if (/^﻿?WEBVTT/.test(text.trim())) return 'vtt';
    if (/\[Script Info\]|^Dialogue:/im.test(head)) return 'ass';
    if (/\d{1,2}:\d{2}:\d{2},\d{3}\s*-->/.test(head)) return 'srt';
    if (/\d{1,2}:\d{2}[:.]\d{2}\.\d{3}\s*-->/.test(head)) return 'vtt';
    return null;
}

export function initSubtitleConverter() {
    const panel = document.getElementById('subtitle-converter-panel');
    if (!panel) return;

    const input = document.getElementById('sub-input');
    const output = document.getElementById('sub-output');
    const sourceSelect = document.getElementById('sub-source');
    const targetSelect = document.getElementById('sub-target');
    const btnFile = document.getElementById('sub-btn-file');
    const fileInput = document.getElementById('sub-file-input');
    const btnRun = document.getElementById('sub-btn-run');
    const btnCopy = document.getElementById('sub-btn-copy');
    const btnDownload = document.getElementById('sub-btn-download');
    const statusEl = document.getElementById('sub-status');

    let baseName = 'altyazi';

    btnFile.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        baseName = file.name.replace(/\.[^/.]+$/, '');
        input.value = await file.text();
        const ext = file.name.split('.').pop().toLowerCase();
        if (['srt', 'vtt'].includes(ext)) sourceSelect.value = ext;
        else if (['ass', 'ssa'].includes(ext)) sourceSelect.value = 'ass';
        statusEl.textContent = `Dosya okundu: ${file.name}`;
        fileInput.value = '';
    });

    btnRun.addEventListener('click', () => {
        const raw = input.value;
        if (!raw.trim()) {
            showToast("Lütfen altyazı içeriği girin veya dosya yükleyin.", "error");
            return;
        }

        let source = sourceSelect.value;
        if (source === 'auto') {
            source = detectFormat(raw);
            if (!source) {
                showToast("Altyazı formatı algılanamadı. Kaynak formatı elle seçin.", "error");
                return;
            }
        }

        const parsers = { srt: parseSrt, vtt: parseVtt, ass: parseAss };
        const cues = parsers[source](raw);
        if (!cues.length) {
            showToast("Geçerli altyazı satırı bulunamadı. Kaynak formatı kontrol edin.", "error");
            return;
        }

        const target = targetSelect.value;
        const generators = { srt: toSrt, vtt: toVtt, ass: toAss };
        output.value = generators[target](cues);
        btnDownload.disabled = false;
        statusEl.textContent = `${cues.length} altyazı satırı dönüştürüldü (${source.toUpperCase()} → ${target.toUpperCase()}).`;
        showToast("Dönüştürme tamamlandı!", "success");
    });

    btnCopy.addEventListener('click', () => {
        if (!output.value) { showToast("Kopyalanacak sonuç yok.", "error"); return; }
        navigator.clipboard.writeText(output.value)
            .then(() => showToast("Kopyalandı!", "success"))
            .catch(() => showToast("Kopyalama başarısız oldu.", "error"));
    });

    btnDownload.addEventListener('click', () => {
        if (!output.value) return;
        const ext = targetSelect.value;
        downloadBlob(new Blob(['﻿' + output.value], { type: 'text/plain;charset=utf-8' }), `${baseName}.${ext}`);
    });
}
