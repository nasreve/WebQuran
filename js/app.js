
// --- GLOBAL STATE ---
let currentSurahId = null;
let currentSurahData = [];
let currentAyahNo = 0;
let searchIndex = [];
let translationIndex = [];
let customTranslations = {};
let currentTranslationVersion = 'default';
let isDarkMode = true;

// --- KEYBOARD SHORTCUTS ---

// Tombol yang baru diklik dengan mouse tetap memegang fokus, sehingga menekan
// Spasi akan "menekan" tombol itu (mis. membuka modal Template) alih-alih
// memotong layar. Spasi dan T ditangani lebih dulu (fase capture) agar selalu
// menjadi kontrol siaran, lalu propagasinya dihentikan supaya handler di bawah
// tidak menjalankannya dua kali.
function isEditableElement(el) {
    if (!el) return false;
    const tag = el.tagName;
    if (tag === 'TEXTAREA' || tag === 'SELECT') return true;
    if (tag === 'INPUT') {
        const type = String(el.type || 'text').toLowerCase();
        return !['range', 'checkbox', 'radio', 'button', 'submit', 'reset'].includes(type);
    }
    return el.isContentEditable === true;
}

function isModalDialogOpen() {
    return !!document.querySelector('#helpModal.show, #templateModal.show, #omnibarModal.active, dialog[open]');
}

document.addEventListener('keydown', event => {
    if (event.ctrlKey || event.altKey || event.metaKey) return;
    const isSpace = event.key === ' ' || event.key === 'Spacebar';
    const isTranslation = event.key === 't' || event.key === 'T';
    if (!isSpace && !isTranslation) return;

    // Jangan rebut keyboard saat operator sedang mengetik atau memilih.
    if (isEditableElement(event.target) || isEditableElement(document.activeElement)) return;
    // Di dalam modal, biarkan tombol bekerja seperti biasa.
    if (isModalDialogOpen()) return;

    event.preventDefault();
    event.stopPropagation();

    if (event.repeat) return; // tahan tombol tidak boleh menyalakan/mematikan berulang
    if (isSpace) {
        if (typeof toggleVisibility === 'function') toggleVisibility();
    } else if (typeof toggleTransVisibility === 'function') {
        toggleTransVisibility();
    }
}, true);

// Setelah klik dengan mouse, lepaskan fokus dari tombol agar panah ←/→ dan
// pintasan lain langsung bekerja lagi tanpa perlu klik area kosong dulu.
// Dialog dikecualikan: daftar hasil hadits memakai panah untuk berpindah baris.
document.addEventListener('pointerup', event => {
    const button = event.target instanceof Element ? event.target.closest('button') : null;
    if (!button) return;
    if (button.closest('#helpModal, #templateModal, #omnibarModal, dialog')) return;
    if (document.activeElement === button) button.blur();
});

document.addEventListener('keydown', e => {
    // Sprint 5 · F5: Shift+Enter = TAKE (naikkan PVW ke layar)
    if (e.key === 'Enter' && e.shiftKey) {
        e.preventDefault();
        if (typeof takeToAir === 'function') takeToAir();
        return;
    }

    if (e.key === 'F1') { e.preventDefault(); showHelpModal(); }
    if (e.key === 'F2') { e.preventDefault(); expandSection('sectionNav'); switchTab('nav'); }
    if (e.key === 'F3') { e.preventDefault(); expandSection('sectionLatin'); switchTab('search'); }
    if (e.key === 'F4') { e.preventDefault(); expandSection('sectionTrans'); switchTab('trans-search'); }
    if (e.key === 'F5') { e.preventDefault(); toggleSection('sectionHistory'); }
    if (e.key === 'F6') { e.preventDefault(); toggleSection('sectionBookmark'); }
    if (e.key === 'F9') { e.preventDefault(); if (typeof toggleConfidenceMonitor === 'function') toggleConfidenceMonitor(); }
    if (e.key === 'F11') { e.preventDefault(); if (typeof toggleFullscreen === 'function') toggleFullscreen(); }
    if (e.key === 'Escape') { closeHelpModal(); }

    // Font size: Ctrl + ↑/↓ dan Ctrl + 1 untuk reset
    if (e.ctrlKey && e.key === 'ArrowUp') {
        e.preventDefault();
        stepFontSize(5);
        return;
    }
    if (e.ctrlKey && e.key === 'ArrowDown') {
        e.preventDefault();
        stepFontSize(-5);
        return;
    }
    if (e.ctrlKey && e.key === '1') {
        e.preventDefault();
        resetFontSize();
        return;
    }

    // Next/Prev ayah — hanya jika tidak sedang mengetik di input teks atau menggeser slider
    const activeEl = document.activeElement;
    const tag = activeEl ? activeEl.tagName : '';
    const isTextInput = tag === 'INPUT' && activeEl.type !== 'range' && activeEl.type !== 'checkbox';

    if (tag === 'TEXTAREA' || tag === 'SELECT' || isTextInput || tag === 'BUTTON') {
        // Biarkan elemen ini menggunakan arrow key bawaannya (misal scroll teks, milih dropdown, atau pindah fokus button)
        return;
    }

    // Toggle Panel Visibility
    if (e.key === ' ') {
        e.preventDefault();
        if (typeof toggleVisibility === 'function') toggleVisibility();
    }
    
    // Toggle jeda gulir otomatis (template dua kolom)
    if (e.key === 'p' || e.key === 'P') {
        e.preventDefault();
        if (typeof toggleScrollPause === 'function') toggleScrollPause();
        return;
    }

    // Toggle Translation Visibility
    if (e.key === 't' || e.key === 'T') {
        e.preventDefault();
        if (typeof toggleTransVisibility === 'function') toggleTransVisibility();
    }

    if (e.key === 'ArrowRight') {
        e.preventDefault();
        navAyah(1);
    }
    if (e.key === 'ArrowLeft') {
        e.preventDefault();
        navAyah(-1);
    }
    if (e.key === 'ArrowUp') {
        e.preventDefault();
        const countEl = document.getElementById('ayahCountInput');
        if (countEl) {
            let val = Math.min(10, (parseInt(countEl.value) || 1) + 1);
            countEl.value = val;
            (typeof primaryDisplayAction === 'function') ? primaryDisplayAction() : searchAyah();
        }
    }
    if (e.key === 'ArrowDown') {
        e.preventDefault();
        const countEl = document.getElementById('ayahCountInput');
        if (countEl) {
            let val = Math.max(1, (parseInt(countEl.value) || 1) - 1);
            countEl.value = val;
            (typeof primaryDisplayAction === 'function') ? primaryDisplayAction() : searchAyah();
        }
    }
});
// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    autoLoadData();
});
