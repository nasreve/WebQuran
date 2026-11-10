/* ============================================================
   Kontrak runtime template (A8)
   ------------------------------------------------------------
   Kelima template layar menyimpan salinan logika yang sama:
   deteksi mode OBS, pendengar postMessage, polling cadangan, dan
   pelaporan "teks terpotong". Berkas ini menyatukannya supaya
   perbaikan hanya ditulis sekali.

   Pemakaian di template:

     TemplateRuntime.init({
       onContent(data) { ... },        // wajib: arabic, translation, info, fontSize, theme, isVisible
       onTransVisible(v) { ... },      // opsional
       onFonts(arabic, latin) { ... }, // opsional
       onFontSize(size) { ... },       // opsional
     });

   TemplateRuntime.isObs / .side / .isEmbedded / .hasIpc
   TemplateRuntime.reportFit(clipped)
   ============================================================ */
(function () {
    'use strict';

    const params = new URLSearchParams(window.location.search);
    const isObs = params.has('obs');
    const side = params.get('side');
    const isEmbedded = window.self !== window.top;
    const hasIpc = !!(window.electronAPI && window.electronAPI.isElectron);

    if (isObs) document.body.classList.add('obs-mode');
    // ?side=left membalik tata letak template yang mendukungnya (mis. PiP).
    if (side === 'left') document.body.dataset.side = 'left';

    let handlers = {};
    let lastKey = null;
    let pollTimer = null;

    // Kunci pembanding tidak boleh hanya isi ayat: operator sering mengubah
    // ukuran teks atau tema TANPA mengganti ayat, dan template tetap harus
    // dirender ulang saat itu. Karena itu setelan ikut masuk kunci.
    function settingsSuffix(data) {
        return [
            data.fontSize || '',
            data.theme || '',
            data.isVisible === false ? '0' : '1',
            data.isTransVisible === false ? '0' : (data.isTransVisible === true ? '1' : ''),
            data.scrollPaused === true ? 'p' : '',
        ].join('|');
    }

    function keyOf(data) {
        if (!data) return null;
        const suffix = settingsSuffix(data);
        if (data.ts) return 'ts:' + data.ts + '|' + suffix;
        return 't:' + (data.arabic || '') + '|' + (data.translation || '') + '|' + (data.info || '') + '|' + suffix;
    }

    function applyContent(data) {
        // Sengaja TIDAK menyaring "arabic kosong": template perlu menerima
        // pembaruan kosong agar panelnya bisa disembunyikan saat layar dipotong.
        if (!data) return;
        const key = keyOf(data);
        if (key && key === lastKey) return;   // konten yang sama tidak dirender ulang
        lastKey = key;
        // Jeda harus diterapkan SEBELUM render: kalau sesudah, render ulang
        // sudah mengembalikan posisi gulir ke atas.
        dispatchScrollPause(data);
        if (typeof handlers.onContent === 'function') handlers.onContent(data);
        if (data.isTransVisible !== undefined && typeof handlers.onTransVisible === 'function') {
            handlers.onTransVisible(!!data.isTransVisible);
        }
        if ((data.arabicFont || data.latinFont) && typeof handlers.onFonts === 'function') {
            handlers.onFonts(data.arabicFont, data.latinFont);
        }
        if (data.fontSize && typeof handlers.onFontSize === 'function') {
            handlers.onFontSize(parseInt(data.fontSize, 10));
        }
    }

    // Jeda gulir dikirim terpisah agar bisa berubah tanpa mengganti ayat.
    function dispatchScrollPause(data) {
        if (!data || data.scrollPaused === undefined) return;
        if (typeof handlers.onScrollPause === 'function') handlers.onScrollPause(!!data.scrollPaused);
    }

    function onMessage(event) {
        const data = event.data;
        if (!data || !data.type) return;
        switch (data.type) {
            case 'QURAN_UPDATE':
                applyContent(data);
                break;
            case 'TRANS_VISIBILITY_UPDATE':
                if (typeof handlers.onTransVisible === 'function') handlers.onTransVisible(!!data.isTransVisible);
                break;
            case 'FONT_SIZE_UPDATE':
                if (typeof handlers.onFontSize === 'function') handlers.onFontSize(parseInt(data.fontSize, 10));
                break;
            case 'SCROLL_PAUSE':
                if (typeof handlers.onScrollPause === 'function') handlers.onScrollPause(!!data.paused);
                break;
            case 'FONT_UPDATE':
                if (typeof handlers.onFonts === 'function') handlers.onFonts(data.arabicFont, data.latinFont);
                break;
            default:
                break;
        }
    }

    // Polling cadangan: untuk OBS/vMix yang membuka halaman langsung (tanpa
    // induk yang mengirim pesan). Di jendela Electron, IPC sudah mendorong data.
    async function poll() {
        if (isEmbedded) return;
        try {
            const res = await fetch('/api/verse', { cache: 'no-store' });
            if (!res.ok) return;
            const data = await res.json();
            applyContent(data);
            dispatchScrollPause(data);
            if (!data.fontSize && typeof handlers.onFontSize === 'function' && data.fontSize !== undefined) {
                handlers.onFontSize(parseInt(data.fontSize, 10));
            }
        } catch (err) {
            /* biarkan frame terakhir tetap tampil */
        }
    }

    function init(options) {
        handlers = options || {};
        window.addEventListener('message', onMessage);
        if (!isEmbedded) {
            poll();
            const interval = hasIpc ? 3000 : 500;
            pollTimer = setInterval(poll, interval);
        }
    }

    // Lapor ke induk (presentation.html → panel) bila teks meluber.
    function reportFit(clipped) {
        try {
            document.body.dataset.clipped = clipped ? 'true' : 'false';
            if (window.parent && window.parent !== window) {
                window.parent.postMessage({ type: 'QURAN_FIT', clipped: !!clipped }, '*');
            }
        } catch (err) { /* pengukuran tidak wajib */ }
    }

    window.TemplateRuntime = {
        init,
        reportFit,
        isObs,
        side,
        isEmbedded,
        hasIpc,
        get polling() { return !!pollTimer; },
    };
})();
