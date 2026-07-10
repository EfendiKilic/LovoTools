/**
 * Paylaşılan FFmpeg.wasm yükleyicisi.
 * Çekirdek (~31MB) yalnızca bir kez indirilir; ses ve video modülleri aynı örneği kullanır.
 * Dosyalar vendor/ffmpeg altında self-host edilir; worker'lar cross-origin
 * kısıtlamaları nedeniyle CDN'den yüklenemez.
 */

let instance = null;
let loadPromise = null;

export async function getFFmpeg() {
    if (instance) return instance;
    if (loadPromise) return loadPromise;

    loadPromise = (async () => {
        if (!window.FFmpegWASM || !window.FFmpegWASM.FFmpeg) {
            throw new Error("FFmpeg kütüphanesi yüklenemedi. Sayfayı yenileyip tekrar deneyin.");
        }
        const { FFmpeg } = window.FFmpegWASM;
        const ffmpeg = new FFmpeg();

        const base = new URL('vendor/ffmpeg/', document.baseURI).href;
        await ffmpeg.load({
            coreURL: base + 'ffmpeg-core.js',
            wasmURL: base + 'ffmpeg-core.wasm'
        });

        instance = ffmpeg;
        return ffmpeg;
    })();

    try {
        return await loadPromise;
    } catch (err) {
        loadPromise = null; // bir sonraki denemede yeniden yüklenebilsin
        throw err;
    }
}

export function fetchFile(file) {
    return window.FFmpegUtil.fetchFile(file);
}
