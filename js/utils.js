// ============================================
// Utility Functions
// Toast, translation selector, dan util teks
// ============================================

function copyText(t) {
    navigator.clipboard.writeText(t)
        .then(() => showToast("Disalin!"))
        .catch(() => showToast("Gagal", "error"));
}

let toastTimer = null;
let toastActive = false;
const toastQueue = [];

const TOAST_META = {
    success: {
        label: "Berhasil",
        icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 4 4L19 6"></path></svg>'
    },
    info: {
        label: "Informasi",
        icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="12" cy="12" r="9"></circle><path d="M12 11v5M12 8h.01"></path></svg>'
    },
    warning: {
        label: "Perhatian",
        icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.3 3.7 2.4 17.5A2 2 0 0 0 4.1 20h15.8a2 2 0 0 0 1.7-2.5L13.7 3.7a2 2 0 0 0-3.4 0Z"></path><path d="M12 9v4M12 17h.01"></path></svg>'
    },
    error: {
        label: "Terjadi Kendala",
        icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="12" cy="12" r="9"></circle><path d="m15 9-6 6M9 9l6 6"></path></svg>'
    }
};

function normalizeToastType(message, type) {
    if (["success", "info", "warning", "error"].includes(type)) return type;
    const value = String(message || "").trim();
    if (value.startsWith("❌")) return "error";
    if (value.startsWith("⚠")) return "warning";
    return "info";
}

function cleanToastMessage(message) {
    return String(message || "")
        .replace(/^(?:✅|❌|⚠️|⚠|📡|📺|🗑️|🗑|🟢|🔴|🌐|📖|⚡)\s*/u, "")
        .trim();
}

function hideToast() {
    const el = document.getElementById("toast");
    if (!el) return;
    clearTimeout(toastTimer);
    toastTimer = null;
    el.classList.remove("show");
    // Beri jeda singkat, lalu tampilkan pesan berikutnya yang sempat menunggu.
    setTimeout(() => {
        toastActive = false;
        drainToastQueue();
    }, 220);
}

function drainToastQueue() {
    if (toastActive) return;
    const next = toastQueue.shift();
    if (!next) return;
    toastActive = true;
    displayToast(next.message, next.type);
}

// Antrean pesan: dulu satu toast baru langsung menimpa yang sedang tampil,
// sehingga pesan penting (mis. gagal tayang) bisa hilang dalam sekejap.
function showToast(m, t = "success") {
    const message = String(m == null ? "" : m);
    const type = normalizeToastType(message, t);
    const last = toastQueue[toastQueue.length - 1];
    if (last && last.message === message) return; // pesan sama tidak diulang
    if (toastQueue.length >= 3) toastQueue.shift(); // batasi tumpukan
    toastQueue.push({ message, type });
    drainToastQueue();
}

function displayToast(m, t = "success") {
    const el = document.getElementById("toast");
    if (!el) {
        // Elemen tidak ada: jangan biarkan antrean macet.
        toastActive = false;
        drainToastQueue();
        return;
    }

    const type = normalizeToastType(m, t);
    const meta = TOAST_META[type];
    const message = cleanToastMessage(m) || meta.label;
    const duration = Math.min(4600, Math.max(2600, 1900 + message.length * 28));
    const iconEl = document.getElementById("toastIcon");
    const labelEl = document.getElementById("toastLabel");
    const messageEl = document.getElementById("toastMessage");

    clearTimeout(toastTimer);
    el.classList.remove("show", "toast-success", "toast-info", "toast-warning", "toast-error");
    el.classList.add(`toast-${type}`);
    if (typeof el.setAttribute === "function") {
        el.setAttribute("role", type === "error" || type === "warning" ? "alert" : "status");
        el.setAttribute("aria-live", type === "error" || type === "warning" ? "assertive" : "polite");
    }
    if (typeof el.style?.setProperty === "function") {
        el.style.setProperty("--toast-duration", `${duration}ms`);
    }

    if (iconEl) iconEl.innerHTML = meta.icon;
    if (labelEl) labelEl.textContent = meta.label;
    if (messageEl) messageEl.textContent = message;

    // Restart the entrance and progress animations when messages arrive rapidly.
    void el.offsetWidth;
    el.classList.add("show");
    toastTimer = setTimeout(hideToast, duration);
}

function escapeJs(str) {
    return str ? str.replace(/'/g, "\\'").replace(/"/g, '&quot;') : "";
}

// Bersihkan angka catatan kaki seperti "Tuhan1)", "bumi,”7)", "masa,341)", " 4)"
// tapi tetap pertahankan nomor urut ayat seperti "(1)", "(10)", "(255)"
function cleanTranslation(str) {
    if (!str) return '';
    return str.replace(/(?<!\(\d*)\s*\d+\)/g, '');
}

// Map versi ke file JSON
const TRANSLATION_FILES = {
    'default': null, // Gunakan terjemahan bawaan dari 1-114.json
    'kemenag_lama': 'custom_full_quran.json',
    'kemenag_2002': 'kemenag2002.json'
};

const TRANSLATION_LABELS = {
    'default': 'Kemenag 2019',
    'kemenag_lama': 'Kampung Sunnah',
    'kemenag_2002': 'Kemenag 2002'
};


function syncTranslationDropdowns(version) {
    const select = document.getElementById('translationSelect');
    if (select && select.value !== version) select.value = version;
    const stageSelect = document.querySelector('.stage-trans-select');
    if (stageSelect && stageSelect.value !== version) stageSelect.value = version;
}

async function changeTranslation(version) {
    currentTranslationVersion = version;
    syncTranslationDropdowns(version);

    if (version === 'default') {
        // Reset custom translations, pakai bawaan
        customTranslations = {};
        showToast(`Terjemahan: ${TRANSLATION_LABELS[version]}`);
        refreshCurrentView();
        return;
    }

    const applyTranslations = (json) => {
        customTranslations = {};
        json.forEach(item => {
            const key = `${item.s}:${item.a}`;
            customTranslations[key] = item.text;
        });
    };

    // 1) Data bawaan yang ikut tertanam di build (kalau ada)
    if (typeof QURAN_DATA !== 'undefined' && QURAN_DATA.translations && QURAN_DATA.translations[version]) {
        applyTranslations(QURAN_DATA.translations[version]);
        showToast(`${TRANSLATION_LABELS[version]} dimuat!`, "success");
        refreshCurrentView();
        return;
    }

    // 2) Berkas data terjemahan di folder data/ (custom_full_quran.json, kemenag2002.json).
    //    Aplikasi berjalan lewat server lokal (http://localhost:PORT), jadi fetch berfungsi.
    const fileName = TRANSLATION_FILES[version];
    if (!fileName) {
        revertTranslation();
        return;
    }

    try {
        const json = await loadTranslationFile(fileName);
        applyTranslations(json);
        showToast(`${TRANSLATION_LABELS[version]} dimuat!`, "success");
        refreshCurrentView();
    } catch (err) {
        console.error('Gagal memuat terjemahan', version, err);
        showToast(`Gagal memuat ${TRANSLATION_LABELS[version]}: berkas data tidak terbaca.`, "error");
        revertTranslation();
    }

    function revertTranslation() {
        // Kembalikan ke terjemahan bawaan agar layar tidak kosong
        currentTranslationVersion = 'default';
        customTranslations = {};
        syncTranslationDropdowns('default');
        refreshCurrentView();
    }
}

// Cache sederhana: berkas 1–2 MB cukup diambil sekali per sesi.
const TRANSLATION_CACHE = {};

async function loadTranslationFile(fileName) {
    if (TRANSLATION_CACHE[fileName]) return TRANSLATION_CACHE[fileName];

    const res = await fetch(`data/${fileName}`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    // Beberapa berkas disimpan dengan BOM — JSON.parse menolaknya.
    const raw = await res.text();
    const json = JSON.parse(raw.replace(/^\uFEFF/, ''));

    if (!Array.isArray(json) || json.length === 0) throw new Error('format data tidak dikenali');

    TRANSLATION_CACHE[fileName] = json;
    return json;
}


function refreshCurrentView() {
    if (typeof refreshSearchResults === 'function') refreshSearchResults();
    if (currentSurahId && currentAyahNo && currentSurahData.length > 0) {
        const count = Math.min(parseInt(document.getElementById("ayahCountInput").value) || 1, 10);
        const versesToRender = [];
        for (let i = 0; i < count; i++) {
            const targetAyah = currentAyahNo + i;
            const ayah = currentSurahData.find(a => a.ayah === targetAyah);
            if (ayah) versesToRender.push(ayah);
        }
        if (versesToRender.length > 0) {
            renderMultipleResults(versesToRender);
        }
    }
}


