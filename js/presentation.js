// ============================================================
// Dual Screen Presentation Mode
// Mendukung dua mode:
//   1. Electron mode  — IPC + localStorage (zero-setup)
//   2. Browser mode   — window.open() popup + localStorage
// ============================================================

let presentationWindow = null; // hanya digunakan pada browser mode
let projectorState = { open: false, content: null };
let projectorRevision = 0;
let projectorCloseTimer = null;

function setProjectorState(state) {
    projectorRevision++;
    projectorState = { open: !!state.open, content: state.open ? state.content : null };
    updateDualScreenBtn(projectorState.open);
    window.dispatchEvent(new CustomEvent('projector-state', { detail: { ...projectorState } }));
}

function activateQuranPresentation() {
    try {
        fetch('/api/verse', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ isVisible: true })
        }).catch(() => {});
    } catch (e) { }
    window.dispatchEvent(new CustomEvent('presentation-content-activated', { detail: { content: 'quran' } }));
}

// ── Deteksi environment ──────────────────────────────────────
const isElectron = !!(window.electronAPI && window.electronAPI.isElectron);

// Setup listener status dari Electron (presentation window buka/tutup)
if (isElectron) {
    if (window.electronAPI.onPresentationState) {
        window.electronAPI.onPresentationState(setProjectorState);
        const revision = projectorRevision;
        window.electronAPI.getPresentationState().then(state => {
            if (revision === projectorRevision) setProjectorState(state);
        }).catch(() => {});
    } else {
        window.electronAPI.onPresentationStatus(open => setProjectorState({ open, content: 'quran' }));
    }
}

// ── Open ─────────────────────────────────────────────────────
function openPresentationWindow(content = 'quran') {
    if (!['quran', 'hadith'].includes(content)) return false;
    if (isElectron) {
        // Electron mode: buka via IPC ke main process
        window.electronAPI.openPresentation(content);
        setProjectorState({ open: true, content });
        if (content === 'quran') activateQuranPresentation();
        return true;
    }

    // ── Browser popup fallback ──────────────────────────────
    if (presentationWindow && !presentationWindow.closed) {
        if (projectorState.content !== content) {
            presentationWindow.location.href = content === 'hadith' ? 'hadith-presentation.html' : 'presentation.html';
        }
        presentationWindow.focus();
        setProjectorState({ open: true, content });
        if (content === 'quran') activateQuranPresentation();
        return true;
    }

    const width = window.screen.availWidth;
    const height = window.screen.availHeight;

    presentationWindow = window.open(
        content === 'hadith' ? 'hadith-presentation.html' : 'presentation.html',
        'WebquranProjector',
        `width=${width},height=${height},left=0,top=0,toolbar=no,menubar=no,scrollbars=no,resizable=yes`
    );

    if (!presentationWindow) {
        showToast('❌ Popup diblokir browser! Izinkan popup untuk situs ini.', 'error');
        return false;
    }

    setProjectorState({ open: true, content });
    if (content === 'quran') activateQuranPresentation();

    clearInterval(projectorCloseTimer);
    projectorCloseTimer = setInterval(() => {
        if (presentationWindow && presentationWindow.closed) {
            clearInterval(projectorCloseTimer);
            presentationWindow = null;
            setProjectorState({ open: false });
            showToast('📺 Layar presentasi ditutup.', '');
        }
    }, 1000);
    return true;
}

window.ProjectorScreen = {
    open: openPresentationWindow,
    getState: () => ({ ...projectorState }),
    selectIfOpen: content => {
        if (!isElectron && (!presentationWindow || presentationWindow.closed)) {
            if (projectorState.open) setProjectorState({ open: false });
            return;
        }
        if (projectorState.open && projectorState.content !== content) openPresentationWindow(content);
    },
};

// ── Close ─────────────────────────────────────────────────────
function closePresentationWindow() {
    if (isElectron) {
        window.electronAPI.closePresentation();
        setProjectorState({ open: false });
        return;
    }

    if (presentationWindow && !presentationWindow.closed) {
        presentationWindow.close();
        presentationWindow = null;
    }
    clearInterval(projectorCloseTimer);
    setProjectorState({ open: false });
}

// ── Toggle ────────────────────────────────────────────────────
function togglePresentationWindow() {
    if (isElectron) {
        window.electronAPI.getPresentationStatus().then((isOpen) => {
            if (isOpen) {
                closePresentationWindow();
            } else {
                openPresentationWindow();
            }
        });
        return;
    }

    if (presentationWindow && !presentationWindow.closed) {
        closePresentationWindow();
    } else {
        openPresentationWindow();
    }
}

// ── Update button UI ──────────────────────────────────────────
function updateDualScreenBtn(isOpen) {
    const btn = document.getElementById('dualScreenBtn');
    if (!btn) return;
    const svgIcon = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>`;
    if (isOpen) {
        btn.classList.add('active');
        const label = projectorState.content === 'hadith' ? 'Hadits' : 'Ayat';
        btn.innerHTML = `${svgIcon} <span>Proyektor: ${label}</span>`;
        btn.title = `Proyektor: ${label} — klik untuk menutup layar`;
    } else {
        btn.classList.remove('active');
        btn.innerHTML = `${svgIcon} <span>Dual Screen</span>`;
        btn.title = 'Proyektor tidak aktif — klik untuk membuka layar ayat';
    }
    btn.setAttribute('aria-pressed', String(isOpen));
}

// ── Push verse data ke semua channel ─────────────────────────
function pushToPresentation(arabic, translation, info) {
    const payload = { arabic, translation, info, ts: Date.now() };

    // ── Channel 1: Electron IPC (paling andal di Electron mode) ──
    if (isElectron) {
        window.electronAPI.sendVerseUpdate(payload);
    }

    // ── Channel 2: localStorage (bekerja di Electron & same-origin browser) ──
    try {
        localStorage.setItem('quran_display', JSON.stringify(payload));
    } catch (e) { }

    // ── Channel 3: postMessage / direct call (browser popup mode) ──
    if (!isElectron && projectorState.content === 'quran' && presentationWindow && !presentationWindow.closed) {
        try {
            presentationWindow.updatePresentation(arabic, translation, info);
        } catch (e) {
            presentationWindow.postMessage({
                type: 'QURAN_UPDATE',
                arabic,
                translation,
                info
            }, '*');
        }
    }

    // ── Channel 4: Fallback HTTP POST /api/verse (jika browser mode) ──
    if (!isElectron) {
        try {
            fetch('/api/verse', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            }).catch(() => {});
        } catch (e) { }
    }

    // ── Channel 5: Live Confidence Monitor (Program Feed Mirror) ──
    if (typeof syncConfidenceMonitor === 'function') {
        syncConfidenceMonitor({ 
            arabic, 
            translation, 
            info,
            isVisible: typeof isPresentationVisible !== 'undefined' ? isPresentationVisible : undefined,
            isTransVisible: typeof isTranslationVisible !== 'undefined' ? isTranslationVisible : undefined,
            ts: payload.ts
        });
    }

    // ── Sprint 5 · F5: setiap kiriman ke udara memperbarui penanda PGM ──
    programLive = { arabic, translation, info, label: refLabelFromInfo(info), ts: payload.ts };
    updatePvwPgmIndicators();
}

/* ============================================================
   Sprint 5 · F5 — PVW / PGM
   PVW = isi panggung operator (belum tentu mengudara)
   PGM = isi yang terakhir dikirim ke layar (OBS/vMix/proyektor)

   Mode:
   - 'direct' (bawaan): tombol utama langsung menayangkan (perilaku lama).
   - 'pvw'   : tombol utama hanya memuat ke panggung; TAKE yang menayangkan.
   ============================================================ */
const BROADCAST_MODE_KEY = 'webquran.broadcastMode';

let broadcastMode = 'direct';
let stagePreview = null;   // isi PVW
let programLive = null;    // isi PGM

function loadBroadcastMode() {
    try {
        const saved = localStorage.getItem(BROADCAST_MODE_KEY);
        if (saved === 'pvw' || saved === 'direct') broadcastMode = saved;
    } catch (e) { /* localStorage tidak tersedia */ }
}

function isPvwMode() {
    return broadcastMode === 'pvw';
}

// Satu gerbang untuk semua jalur: nilai eksplisit menang, selain itu ikut mode.
function resolvePushToAir(explicit) {
    if (explicit === true || explicit === false) return explicit;
    return !isPvwMode();
}

// "QS Al-Baqarah (2) Ayat 255" -> "2:255"
function refLabelFromInfo(info) {
    if (!info) return '—';
    const m = /\((\d+)\)\s*Ayat\s*([\d–-]+)/.exec(info);
    if (m) return `${m[1]}:${m[2].replace('–', '-')}`;
    return String(info).replace(/^QS\s*/i, '').slice(0, 18);
}

function markStagePreview(arabic, translation, info) {
    stagePreview = { arabic, translation, info, label: refLabelFromInfo(info) };
    updatePvwPgmIndicators();
}

function updatePvwPgmIndicators() {
    const pvwEl = document.getElementById('pvwValue');
    const pgmEl = document.getElementById('pgmValue');
    const chip = document.getElementById('pvwPgmChip');
    const takeBtn = document.getElementById('takeBtn');
    if (!pvwEl || !pgmEl) return;

    const pvwKey = stagePreview ? stagePreview.label + '|' + (stagePreview.info || '') : '';
    const pgmKey = programLive ? programLive.label + '|' + (programLive.info || '') : '';

    pvwEl.textContent = stagePreview ? stagePreview.label : '—';
    pgmEl.textContent = programLive ? programLive.label : '—';

    const dirty = !!stagePreview && pvwKey !== pgmKey;
    if (chip && chip.classList) { if (dirty) chip.classList.add('is-dirty'); else chip.classList.remove('is-dirty'); }
    if (takeBtn) {
        takeBtn.disabled = !dirty;
        takeBtn.title = dirty
            ? 'TAKE — tayangkan isi panggung ke layar (Shift+Enter)'
            : 'Tidak ada perubahan: PGM sudah sama dengan PVW';
    }
}

function setBroadcastMode(mode) {
    broadcastMode = mode === 'pvw' ? 'pvw' : 'direct';
    try { localStorage.setItem(BROADCAST_MODE_KEY, broadcastMode); } catch (e) { }

    document.querySelectorAll('[data-broadcast-mode]').forEach(btn => {
        const aktif = btn.dataset.broadcastMode === broadcastMode;
        if (aktif) btn.classList.add('active'); else btn.classList.remove('active');
        btn.setAttribute('aria-pressed', String(btn.dataset.broadcastMode === broadcastMode));
    });

    const label = document.getElementById('primaryActionLabel');
    if (label) label.textContent = isPvwMode() ? 'MUAT (PVW)' : 'TAMPILKAN AYAT';

    const hint = document.getElementById('broadcastModeHint');
    if (hint) {
        hint.textContent = isPvwMode()
            ? 'PVW: semua perubahan (tombol utama, Prev/Next, panah ↑/↓, hasil pencarian) hanya masuk panggung. Tekan TAKE (Shift+Enter) untuk mengudara.'
            : 'Langsung: menekan tombol utama langsung menayangkan ayat.';
        hint.title = hint.textContent;
    }
    updatePvwPgmIndicators();
}

// Tombol utama / Enter: ikut mode siaran.
/* ============================================================
   Sprint 6 · F5 lanjutan — jeda gulir otomatis (template dua kolom)
   ============================================================ */
let scrollPaused = false;

function updateScrollPauseUI() {
    const btn = document.getElementById('scrollPauseBtn');
    const icon = document.getElementById('scrollPauseIcon');
    if (!btn) return;
    if (scrollPaused) btn.classList.add('is-paused'); else btn.classList.remove('is-paused');
    btn.setAttribute('aria-pressed', String(scrollPaused));
    btn.title = scrollPaused ? 'Lanjutkan gulir otomatis (P)' : 'Jeda gulir otomatis (P)';
    if (icon) {
        icon.innerHTML = scrollPaused
            ? '<polygon points="6 4 20 12 6 20"></polygon>'
            : '<rect x="6" y="5" width="4" height="14" rx="1"></rect><rect x="14" y="5" width="4" height="14" rx="1"></rect>';
    }
}

function setScrollPaused(paused) {
    scrollPaused = !!paused;
    updateScrollPauseUI();
}

async function toggleScrollPause() {
    setScrollPaused(!scrollPaused);
    showToast(scrollPaused ? 'Gulir otomatis dijeda' : 'Gulir otomatis dilanjutkan');

    // Server menyimpan status lalu meneruskannya ke jendela presentasi (IPC)
    // maupun OBS/vMix yang membaca /api/verse.
    try {
        await fetch('/api/verse', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ scrollPaused })
        });
    } catch (e) { /* mode tanpa server: abaikan */ }

    // Overlay hadits punya state sendiri; tombol yang sama menghentikan
    // gulir kutipan panjang di hadits.
    try {
        await fetch('/api/hadith/control', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'scroll', paused: scrollPaused })
        });
    } catch (e) { /* belum ada hadits aktif: abaikan */ }
}

function primaryDisplayAction() {
    if (isPvwMode()) {
        // pushToAir=false: gambar panggung saja, layar tidak berubah.
        return searchAyah(false, true, false);
    }
    return searchAyah();
}

// TAKE: naikkan isi panggung (PVW) ke layar.
function takeToAir() {
    if (!stagePreview) {
        showToast('Belum ada tayangan di panggung. Pilih ayat dulu.', 'error');
        return;
    }
    pushToPresentation(stagePreview.arabic, stagePreview.translation, stagePreview.info);

    // Kalau layar sedang blank, TAKE berarti menayangkan.
    if (typeof isPresentationVisible !== 'undefined' && !isPresentationVisible && typeof toggleVisibility === 'function') {
        toggleVisibility();
    }
    showToast(`TAKE — ${stagePreview.label} mengudara`, 'success');
    updatePvwPgmIndicators();
}

// Inisialisasi mode siaran (aman untuk lingkungan uji yang tidak punya DOM penuh)
if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
    document.addEventListener('DOMContentLoaded', () => {
        loadBroadcastMode();
        setBroadcastMode(broadcastMode);
        updateScrollPauseUI();
    });
}



