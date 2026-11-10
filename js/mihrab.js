/* ============================================================
   Mihrab — helper bersama keluarga template "Mihrab"
   (Lower Third Mihrab, Layar Penuh Mihrab, Dual Mihrab)

   Isi:
   - Mihrab.stage(el)      pengatur panggung: tampil, sembunyi, ganti ayat
   - Mihrab.wordsHtml(t)   memecah teks Arab menjadi kata ber-<span>
                           agar bisa muncul bertahap (kanan → kiri)
   - Mihrab.cleanTranslation(t)
   - Mihrab.applyFonts(ar, latin) / Mihrab.initFonts()

   Kelas yang dipasang pada elemen panggung (dipakai CSS untuk motion):
     is-on            tampil (tanpa kelas ini: tersembunyi)
     is-entering      koreografi masuk (sekali, saat baru tampil)
     is-swapping-out  isi lama keluar sebelum ganti ayat
     is-swapping-in   isi baru masuk setelah ganti ayat
   ============================================================ */
(function () {
    'use strict';

    // ── Panggung ──────────────────────────────────────────────
    function stage(el, options) {
        const opts = Object.assign({ outMs: 220, enterMs: 1700, swapInMs: 1200 }, options || {});
        const timers = {};
        let swapSeq = 0;
        let latestApply = null;

        function pulse(cls, ms) {
            el.classList.remove(cls);
            void el.offsetWidth; // mulai ulang animasi
            el.classList.add(cls);
            clearTimeout(timers[cls]);
            timers[cls] = setTimeout(() => el.classList.remove(cls), ms);
        }

        function isOn() { return el.classList.contains('is-on'); }

        // apply: fungsi yang menulis isi + mengukur teks. Dipanggil langsung,
        // atau di tengah transisi ganti ayat (selalu dengan data terbaru).
        function show(apply, changed) {
            latestApply = apply;
            if (!isOn()) {
                clearTimeout(timers.swap);
                el.classList.remove('is-swapping-out', 'is-swapping-in');
                apply();
                el.classList.add('is-on');
                pulse('is-entering', opts.enterMs);
                return 'enter';
            }
            const entering = el.classList.contains('is-entering');
            if (!changed || entering) {
                // Tidak ada ayat baru (mis. ukuran huruf), atau masih di tengah
                // koreografi masuk: tulis langsung tanpa transisi tambahan.
                if (!el.classList.contains('is-swapping-out')) apply();
                return 'update';
            }
            const seq = ++swapSeq;
            el.classList.remove('is-swapping-in');
            el.classList.add('is-swapping-out');
            clearTimeout(timers.swap);
            timers.swap = setTimeout(() => {
                if (seq !== swapSeq) return;
                latestApply();
                el.classList.remove('is-swapping-out');
                pulse('is-swapping-in', opts.swapInMs);
            }, opts.outMs);
            return 'swap';
        }

        function hide() {
            clearTimeout(timers.swap);
            clearTimeout(timers['is-entering']);
            el.classList.remove('is-on', 'is-entering', 'is-swapping-in', 'is-swapping-out');
        }

        return { show, hide, isOn, pulse };
    }

    // ── Teks ──────────────────────────────────────────────────
    // Setiap kata dibungkus span; jeda bertahap dibatasi agar ayat panjang
    // tetap selesai muncul dalam ±1 detik.
    function wordsHtml(text) {
        const words = String(text || '').trim().split(/\s+/).filter(Boolean);
        const step = words.length > 24 ? Math.max(14, Math.round(900 / words.length)) : 45;
        return words.map((w, i) => `<span class="mw" style="--d:${Math.min(i * step, 1000)}ms">${w}</span>`).join(' ');
    }

    function cleanTranslation(text) {
        return String(text || '').replace(/(?<!\(\d*)\s*\d+\)/g, '').trim();
    }

    // ── Font (sama dengan template lain) ───────────────────────
    const ARABIC_FONT_MAP = {
        'amiri': "'Amiri', 'Traditional Arabic', serif",
        'amiri-quran': "'Amiri Quran', 'Traditional Arabic', serif",
        'sakkal-majalla': "'Sakkal Majalla', 'Traditional Arabic', serif",
        'myriad-arabic': "'Myriad Arabic', 'Segoe UI', sans-serif",
        'noto-naskh': "'Noto Naskh Arabic', 'Traditional Arabic', serif",
        'scheherazade': "'Scheherazade New', 'Traditional Arabic', serif",
        'lateef': "'Lateef', 'Traditional Arabic', serif",
        'uthmanic': "'Noto Kufi Arabic', 'Traditional Arabic', serif",
    };
    const LATIN_FONT_MAP = {
        'system': "'Segoe UI', system-ui, sans-serif",
        'roboto': "'Roboto', sans-serif",
        'outfit': "'Outfit', sans-serif",
        'raleway': "'Raleway', sans-serif",
        'playfair': "'Playfair Display', serif",
        'cinzel': "'Cinzel', serif",
        'inter': "'Inter', sans-serif",
        'montserrat': "'Montserrat', 'Inter', sans-serif",
        'lora': "'Lora', Georgia, serif",
        'nunito': "'Nunito', sans-serif",
        'poppins': "'Poppins', sans-serif",
    };
    const GOOGLE_FONTS = {
        'amiri-quran': 'https://fonts.googleapis.com/css2?family=Amiri+Quran&display=swap',
        'noto-naskh': 'https://fonts.googleapis.com/css2?family=Noto+Naskh+Arabic:wght@400;700&display=swap',
        'scheherazade': 'https://fonts.googleapis.com/css2?family=Scheherazade+New:wght@400;700&display=swap',
        'lateef': 'https://fonts.googleapis.com/css2?family=Lateef:wght@400;700&display=swap',
        'uthmanic': 'https://fonts.googleapis.com/css2?family=Noto+Kufi+Arabic:wght@400;700&display=swap',
        'roboto': 'https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap',
        'outfit': 'https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;700&display=swap',
        'raleway': 'https://fonts.googleapis.com/css2?family=Raleway:wght@400;600;700&display=swap',
        'playfair': 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&display=swap',
        'cinzel': 'https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&display=swap',
        'montserrat': 'https://fonts.googleapis.com/css2?family=Montserrat:wght@400;700;800&display=swap',
        'lora': 'https://fonts.googleapis.com/css2?family=Lora:wght@400;600;700&display=swap',
        'nunito': 'https://fonts.googleapis.com/css2?family=Nunito:wght@400;700;800&display=swap',
        'poppins': 'https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap',
    };
    const loaded = new Set();
    let lastAr = '', lastLt = '';

    function injectFont(url) {
        if (!url || loaded.has(url)) return;
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = url;
        document.head.appendChild(link);
        loaded.add(url);
    }

    // Mengembalikan true bila ada font yang berubah (pemanggil perlu mengukur ulang).
    function applyFonts(arabicKey, latinKey) {
        let changed = false;
        if (arabicKey && arabicKey !== lastAr) {
            injectFont(GOOGLE_FONTS[arabicKey]);
            document.documentElement.style.setProperty('--arabic-font', ARABIC_FONT_MAP[arabicKey] || ARABIC_FONT_MAP.amiri);
            lastAr = arabicKey;
            changed = true;
        }
        if (latinKey && latinKey !== lastLt) {
            injectFont(GOOGLE_FONTS[latinKey]);
            document.documentElement.style.setProperty('--latin-font', LATIN_FONT_MAP[latinKey] || LATIN_FONT_MAP.inter);
            lastLt = latinKey;
            changed = true;
        }
        return changed;
    }

    function initFonts() {
        try {
            const ar = localStorage.getItem('quran_arabic_font');
            const lt = localStorage.getItem('quran_latin_font');
            if (ar || lt) applyFonts(ar || 'amiri', lt || 'inter');
        } catch (e) { /* penyimpanan tidak tersedia */ }
    }

    window.Mihrab = { stage, wordsHtml, cleanTranslation, applyFonts, initFonts };
})();
