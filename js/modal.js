
function showHelpModal(defaultTab = 'helpTab-features') {
    const modal = document.getElementById("helpModal");
    if (modal) {
        modal._previouslyFocusedElement = document.activeElement;
        modal.classList.add("show");
        document.body.style.overflow = "hidden";
        if (defaultTab) {
            switchHelpTab(defaultTab);
        }
        requestAnimationFrame(() => {
            const closeButton = modal.querySelector('.btn-close-modal');
            if (closeButton) closeButton.focus();
        });
    }
}

function switchHelpTab(tabId) {
    // Normalisasi tabId jika dipanggil dengan 'features' atau 'helpTab-features'
    const cleanId = tabId.startsWith('helpTab-') ? tabId : `helpTab-${tabId}`;

    document.querySelectorAll('.help-tab-btn').forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
        b.tabIndex = -1;
    });
    document.querySelectorAll('.help-tab-pane').forEach(p => {
        p.classList.remove('active');
        p.hidden = true;
    });

    const targetBtn = document.querySelector(`.help-tab-btn[data-tab="${cleanId}"]`) || 
                      document.querySelector(`.help-tab-btn[data-tab="${tabId}"]`);
    const targetPane = document.getElementById(cleanId) || document.getElementById(tabId);

    if (targetBtn) {
        targetBtn.classList.add('active');
        targetBtn.setAttribute('aria-selected', 'true');
        targetBtn.tabIndex = 0;
    }
    if (targetPane) {
        targetPane.classList.add('active');
        targetPane.hidden = false;
        const body = targetPane.closest('.modal-body-help');
        if (body) body.scrollTop = 0;
    }
}

// ── Status lapisan (modal & overlay) ─────────────────────────
// Satu tempat untuk mengetahui apakah ada lapisan yang menutupi panel,
// supaya Esc dan kunci scroll tidak saling bertabrakan antar modul.
function isOmnibarOverlayOpen() {
    const el = document.getElementById('omnibarModal');
    return !!(el && el.classList.contains('active'));
}

function isAnyModalOpen() {
    // dialog[open] mencakup dialog pencarian hadits (elemen <dialog> native).
    return !!document.querySelector('#helpModal.show, #templateModal.show, dialog[open]') || isOmnibarOverlayOpen();
}

function restoreBodyScrollIfClear() {
    if (!isAnyModalOpen()) document.body.style.overflow = '';
}

function closeHelpModal(event) {
    if (event && event.target !== event.currentTarget && !event.target.classList.contains('btn-close-modal') && !event.target.closest('.btn-close-modal') && !event.target.classList.contains('btn-primary-help') && !event.target.closest('.btn-primary-help')) {
        return;
    }

    const modal = document.getElementById("helpModal");
    if (modal) {
        modal.classList.remove("show");
        // Jangan buka kunci scroll bila masih ada modal lain di atasnya
        // (dulu baris ini selalu mengosongkan overflow).
        restoreBodyScrollIfClear();
        const previousFocus = modal._previouslyFocusedElement;
        if (previousFocus && document.contains(previousFocus)) previousFocus.focus();
    }

    const dontShowEl = document.getElementById("dontShowAgain");
    if (dontShowEl && dontShowEl.checked) {
        localStorage.setItem("quranBroadcast_hideHelpModal", "true");
    }
    // Tandai versi ini sudah dilihat, supaya panduan tidak muncul lagi esok hari.
    try { localStorage.setItem(HELP_SEEN_VERSION_KEY, helpAppVersion()); } catch (e) { /* abaikan */ }
}

// ── Accordion Toggle ──────────────────────────────────────
function toggleSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (!section) return;
    section.classList.toggle('collapsed');
}

function expandSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) section.classList.remove('collapsed');
}

// ── Bantuan otomatis: sekali per versi ───────────────────────
// Dulu modal ini muncul setiap aplikasi dibuka, mencuri fokus, dan menghalangi
// operator yang buru-buru. Sekarang hanya pada versi yang belum pernah dilihat.
const HELP_SEEN_VERSION_KEY = 'quranBroadcast_helpSeenVersion';

function helpAppVersion() {
    return (window.electronAPI && window.electronAPI.appVersion) || 'dev';
}

function checkShowHelpOnLoad() {
    try {
        if (localStorage.getItem('quranBroadcast_hideHelpModal')) return; // pilihan lama tetap dihormati
        if (localStorage.getItem(HELP_SEEN_VERSION_KEY) === helpAppVersion()) return;
        setTimeout(() => showHelpModal(), 700);
    } catch (e) { /* penyimpanan tidak tersedia */ }
}

document.addEventListener("DOMContentLoaded", checkShowHelpOnLoad);

document.addEventListener("DOMContentLoaded", () => {
    const tabList = document.querySelector('.help-nav-tabs');
    if (!tabList) return;

    tabList.addEventListener('keydown', (event) => {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
        const tabs = Array.from(tabList.querySelectorAll('.help-tab-btn'));
        const currentIndex = tabs.indexOf(document.activeElement);
        if (currentIndex < 0) return;

        event.preventDefault();
        let nextIndex = currentIndex;
        if (event.key === 'ArrowRight') nextIndex = (currentIndex + 1) % tabs.length;
        if (event.key === 'ArrowLeft') nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
        if (event.key === 'Home') nextIndex = 0;
        if (event.key === 'End') nextIndex = tabs.length - 1;

        const nextTab = tabs[nextIndex];
        switchHelpTab(nextTab.dataset.tab);
        nextTab.focus();
    });
});

// ── TEMPLATE MODAL ──────────────────────────────────────
function syncActiveTemplateCard(templateName) {
    const activeTpl = templateName || localStorage.getItem('quran_template') || 'default.html';
    document.querySelectorAll('.template-card-pro, .template-card').forEach(el => {
        el.classList.remove('active');
        const badge = el.querySelector('.badge-active');
        if (badge) badge.style.display = 'none';
        const action = el.querySelector('.template-action-btn');
        if (action) action.innerHTML = 'Pilih &rarr;';
    });
    const activeCard = document.getElementById('tplCard-' + activeTpl);
    if (activeCard) {
        activeCard.classList.add('active');
        const badge = activeCard.querySelector('.badge-active');
        if (badge) badge.style.display = 'flex';
        const action = activeCard.querySelector('.template-action-btn');
        if (action) action.innerHTML = '✓ Aktif';
    }
}

function showTemplateModal() {
    const m = document.getElementById("templateModal");
    if (m) {
        syncActiveTemplateCard();
        m.classList.add("show");
        document.body.style.overflow = "hidden";
    }
}

function closeTemplateModal(event) {
    if (event && event.target !== event.currentTarget) return;
    const m = document.getElementById("templateModal");
    if (m) {
        m.classList.remove("show");
        restoreBodyScrollIfClear();
    }
}

// Esc menutup modal Template. Dulu modal ini sama sekali tidak bisa ditutup
// dengan keyboard — Esc justru menutup panel pencarian di belakangnya.
document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    const templateModal = document.getElementById('templateModal');
    if (templateModal && templateModal.classList.contains('show')) {
        event.preventDefault();
        closeTemplateModal();
    }
});

// silent = true dipakai saat memulihkan template tersimpan ketika aplikasi
// dibuka: tidak perlu toast ("Template diubah…") karena tidak ada yang diubah
// operator, dan modal tidak perlu ditutup.
function selectTemplate(templateName, silent = false) {
    syncActiveTemplateCard(templateName);

    // Kirim IPC ke server main.js
    if (window.electronAPI && window.electronAPI.updateTemplate) {
        window.electronAPI.updateTemplate(templateName);
    }

    try {
        localStorage.setItem('quran_template', templateName);
    } catch (e) { }

    if (typeof updateConfidenceMonitorTemplate === 'function') {
        updateConfidenceMonitorTemplate(templateName);
    }

    if (silent) return;
    showToast('Template diubah ke ' + templateName.replace('.html', ''));
    closeTemplateModal();
}

// Pulihkan template tersimpan tanpa toast dan tanpa menutup modal apa pun.
document.addEventListener('DOMContentLoaded', () => {
    try {
        const saved = localStorage.getItem('quran_template');
        if (saved) {
            // Tunggu sebentar sampai electron bridge ready
            setTimeout(() => {
                selectTemplate(saved, true);
            }, 500);
        }
    } catch (e) { }
});
