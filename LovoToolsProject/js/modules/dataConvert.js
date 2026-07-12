import { showToast, downloadBlob } from '../utils.js';

/**
 * Veri Dönüştürücü — JSON / CSV / Excel (.xlsx)
 * SheetJS (vendor/xlsx) yalnızca ilk dönüşümde yüklenir.
 */

let xlsxPromise = null;
function loadXlsx() {
    if (window.XLSX) return Promise.resolve();
    if (xlsxPromise) return xlsxPromise;
    xlsxPromise = new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = 'vendor/xlsx/xlsx.full.min.js';
        s.onload = resolve;
        s.onerror = () => { xlsxPromise = null; reject(new Error("XLSX yüklenemedi")); };
        document.head.appendChild(s);
    });
    return xlsxPromise;
}

export function initDataConvert() {
    const panel = document.getElementById('data-convert-panel');
    if (!panel) return;

    const sourceSelect = document.getElementById('dconv-source');
    const targetSelect = document.getElementById('dconv-target');
    const inputArea = document.getElementById('dconv-input');
    const outputArea = document.getElementById('dconv-output');
    const btnFile = document.getElementById('dconv-btn-file');
    const fileInput = document.getElementById('dconv-file-input');
    const btnRun = document.getElementById('dconv-btn-run');
    const btnCopy = document.getElementById('dconv-btn-copy');
    const btnDownload = document.getElementById('dconv-btn-download');
    const statusEl = document.getElementById('dconv-status');

    let xlsxOutputBlob = null;   // hedef xlsx ise indirilecek ikili çıktı
    let uploadedXlsxSheet = null; // yüklenen xlsx dosyasının sheet'i
    let baseName = 'veri';

    btnFile.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        baseName = file.name.replace(/\.[^/.]+$/, '');
        const lower = file.name.toLowerCase();

        try {
            if (lower.endsWith('.xlsx') || lower.endsWith('.xls')) {
                await loadXlsx();
                const wb = window.XLSX.read(await file.arrayBuffer(), { type: 'array' });
                uploadedXlsxSheet = wb.Sheets[wb.SheetNames[0]];
                // Excel girdisi metin alanında JSON önizlemesi olarak gösterilir
                const rows = window.XLSX.utils.sheet_to_json(uploadedXlsxSheet, { defval: '' });
                inputArea.value = JSON.stringify(rows, null, 2);
                sourceSelect.value = 'json';
                statusEl.textContent = `Excel dosyası okundu: ${file.name} (${rows.length} satır)`;
            } else {
                uploadedXlsxSheet = null;
                inputArea.value = await file.text();
                sourceSelect.value = lower.endsWith('.csv') ? 'csv' : 'json';
                statusEl.textContent = `Dosya okundu: ${file.name}`;
            }
        } catch (err) {
            console.error("DataConvert file:", err);
            showToast(`Dosya okunamadı: ${file.name}`, "error");
        }
        fileInput.value = '';
    });

    function parseInputToSheet() {
        const XLSX = window.XLSX;
        const raw = inputArea.value.trim();
        if (!raw) throw new Error("Girdi boş. Metin yapıştırın veya dosya yükleyin.");

        if (sourceSelect.value === 'json') {
            let data;
            try {
                data = JSON.parse(raw);
            } catch (e) {
                throw new Error("Geçersiz JSON: " + e.message);
            }
            if (!Array.isArray(data)) {
                // tek nesneyi diziye sar
                if (typeof data === 'object' && data !== null) data = [data];
                else throw new Error("JSON bir nesne dizisi olmalı: [{...}, {...}]");
            }
            if (data.length && Array.isArray(data[0])) {
                return XLSX.utils.aoa_to_sheet(data);
            }
            return XLSX.utils.json_to_sheet(data);
        }

        // CSV
        const wb = XLSX.read(raw, { type: 'string', raw: true });
        return wb.Sheets[wb.SheetNames[0]];
    }

    btnRun.addEventListener('click', async () => {
        btnRun.disabled = true;
        xlsxOutputBlob = null;
        statusEl.textContent = 'Dönüştürülüyor...';

        try {
            await loadXlsx();
            const XLSX = window.XLSX;
            const sheet = parseInputToSheet();
            const target = targetSelect.value;

            if (target === 'json') {
                const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
                outputArea.value = JSON.stringify(rows, null, 2);
                statusEl.textContent = `${rows.length} satır dönüştürüldü.`;
            } else if (target === 'csv') {
                outputArea.value = XLSX.utils.sheet_to_csv(sheet);
                statusEl.textContent = 'CSV çıktısı hazır.';
            } else {
                const wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, sheet, 'Veri');
                const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
                xlsxOutputBlob = new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
                outputArea.value = `[Excel dosyası hazır — ${(xlsxOutputBlob.size / 1024).toFixed(1)} KB]\n\nİndir butonuyla ${baseName}.xlsx olarak kaydedin.`;
                statusEl.textContent = 'Excel çıktısı hazır.';
            }

            btnDownload.disabled = false;
            showToast("Dönüştürme tamamlandı!", "success");
        } catch (err) {
            console.error("DataConvert:", err);
            outputArea.value = '';
            btnDownload.disabled = true;
            statusEl.textContent = '';
            showToast(err.message || "Dönüştürme başarısız.", "error");
        } finally {
            btnRun.disabled = false;
        }
    });

    btnCopy.addEventListener('click', () => {
        if (!outputArea.value || xlsxOutputBlob) {
            showToast(xlsxOutputBlob ? "Excel çıktısı metin olarak kopyalanamaz, indirin." : "Kopyalanacak sonuç yok.", "error");
            return;
        }
        navigator.clipboard.writeText(outputArea.value)
            .then(() => showToast("Kopyalandı!", "success"))
            .catch(() => showToast("Kopyalama başarısız oldu.", "error"));
    });

    btnDownload.addEventListener('click', () => {
        const target = targetSelect.value;
        if (target === 'xlsx') {
            if (xlsxOutputBlob) downloadBlob(xlsxOutputBlob, baseName + '.xlsx');
            return;
        }
        if (!outputArea.value) return;
        const mime = target === 'json' ? 'application/json' : 'text/csv';
        // BOM: Excel'in CSV'deki Türkçe karakterleri doğru açması için
        const prefix = target === 'csv' ? '﻿' : '';
        downloadBlob(new Blob([prefix + outputArea.value], { type: mime + ';charset=utf-8' }), `${baseName}.${target}`);
    });
}
