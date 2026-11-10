// ============================================
// Font - Arabic & Latin Font Selection
// ============================================

const ARABIC_FONTS = [
  { key: 'amiri',        label: 'Amiri (Default)',          family: "'Amiri', 'Traditional Arabic', serif",       googleUrl: 'https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&display=swap' },
  { key: 'amiri-quran',  label: 'Amiri Quran (Spesifik Al-Qur\'an)', family: "'Amiri Quran', 'Traditional Arabic', serif", googleUrl: 'https://fonts.googleapis.com/css2?family=Amiri+Quran&display=swap' },
  { key: 'sakkal-majalla',label: 'Sakkal Majalla (Lokal)',  family: "'Sakkal Majalla', 'Traditional Arabic', serif", googleUrl: null },
  { key: 'myriad-arabic',label: 'Myriad Arabic (Lokal)',    family: "'Myriad Arabic', 'Segoe UI', sans-serif",    googleUrl: null },
  { key: 'noto-naskh',  label: 'Noto Naskh Arabic',        family: "'Noto Naskh Arabic', 'Traditional Arabic', serif", googleUrl: 'https://fonts.googleapis.com/css2?family=Noto+Naskh+Arabic:wght@400;700&display=swap' },
  { key: 'scheherazade', label: 'Scheherazade New',         family: "'Scheherazade New', 'Traditional Arabic', serif",  googleUrl: 'https://fonts.googleapis.com/css2?family=Scheherazade+New:wght@400;700&display=swap' },
  { key: 'lateef',      label: 'Lateef',                   family: "'Lateef', 'Traditional Arabic', serif",       googleUrl: 'https://fonts.googleapis.com/css2?family=Lateef:wght@400;700&display=swap' },
  { key: 'uthmanic',    label: 'Noto Kufi Arabic (Kufi)',   family: "'Noto Kufi Arabic', 'Traditional Arabic', serif",  googleUrl: 'https://fonts.googleapis.com/css2?family=Noto+Kufi+Arabic:wght@400;700&display=swap' },
];

const LATIN_FONTS = [
  { key: 'system',       label: 'System UI (Default)',      family: "'Segoe UI', system-ui, sans-serif",           googleUrl: null },
  { key: 'roboto',       label: 'Roboto (Standar TV)',      family: "'Roboto', sans-serif",                         googleUrl: 'https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap' },
  { key: 'outfit',       label: 'Outfit (Modern Premium)',  family: "'Outfit', sans-serif",                         googleUrl: 'https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;700&display=swap' },
  { key: 'raleway',      label: 'Raleway (Elegan)',         family: "'Raleway', sans-serif",                        googleUrl: 'https://fonts.googleapis.com/css2?family=Raleway:wght@400;600;700&display=swap' },
  { key: 'playfair',     label: 'Playfair (Formal Serif)',  family: "'Playfair Display', serif",                    googleUrl: 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&display=swap' },
  { key: 'cinzel',       label: 'Cinzel (Klasik / Cinematic)',family: "'Cinzel', serif",                            googleUrl: 'https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&display=swap' },
  { key: 'inter',        label: 'Inter',                    family: "'Inter', sans-serif",                          googleUrl: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap' },
  { key: 'montserrat',   label: 'Montserrat',               family: "'Montserrat', sans-serif",                     googleUrl: 'https://fonts.googleapis.com/css2?family=Montserrat:wght@400;700;800&display=swap' },
  { key: 'lora',         label: 'Lora (Serif)',             family: "'Lora', Georgia, serif",                       googleUrl: 'https://fonts.googleapis.com/css2?family=Lora:wght@400;600;700&display=swap' },
  { key: 'nunito',       label: 'Nunito',                   family: "'Nunito', sans-serif",                         googleUrl: 'https://fonts.googleapis.com/css2?family=Nunito:wght@400;700;800&display=swap' },
  { key: 'poppins',      label: 'Poppins',                  family: "'Poppins', sans-serif",                        googleUrl: 'https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap' },
];

const FONT_STORAGE_ARABIC = 'quran_arabic_font';
const FONT_STORAGE_LATIN  = 'quran_latin_font';

// Track loaded fonts to avoid duplicate injection
const loadedFontUrls = new Set();

/**
 * Inject a Google Fonts <link> tag into <head> if not already loaded.
 */
function injectGoogleFont(url) {
  if (!url || loadedFontUrls.has(url)) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = url;
  document.head.appendChild(link);
  loadedFontUrls.add(url);
}

/**
 * Update preview elements in the sidebar.
 */
function updateFontPreviews(arabicFamily, latinFamily) {
  const previewAr = document.getElementById('fontPreviewArabic');
  const previewLt = document.getElementById('fontPreviewLatin');
  if (previewAr) previewAr.style.fontFamily = arabicFamily;
  if (previewLt) previewLt.style.fontFamily = latinFamily;
}

/**
 * Populate the <select> dropdowns with font options.
 */
function populateFontDropdowns() {
  const arabicSelect = document.getElementById('arabicFontSelect');
  const latinSelect  = document.getElementById('latinFontSelect');
  const savedArabic  = localStorage.getItem(FONT_STORAGE_ARABIC) || 'amiri';
  const savedLatin   = localStorage.getItem(FONT_STORAGE_LATIN)  || 'system';

  if (arabicSelect) {
    arabicSelect.innerHTML = ARABIC_FONTS.map(f =>
      `<option value="${f.key}" ${f.key === savedArabic ? 'selected' : ''}>${f.label}</option>`
    ).join('');
  }

  if (latinSelect) {
    latinSelect.innerHTML = LATIN_FONTS.map(f =>
      `<option value="${f.key}" ${f.key === savedLatin ? 'selected' : ''}>${f.label}</option>`
    ).join('');
  }
}

/**
 * Get font definition objects from saved keys.
 */
function getFontDef(list, key) {
  return list.find(f => f.key === key) || list[0];
}

/**
 * Main function called by the sidebar dropdowns (onchange).
 * @param {'arabic'|'latin'} type
 * @param {string} value - font key
 */
function handleFontChange(type, value) {
  const savedArabic = localStorage.getItem(FONT_STORAGE_ARABIC) || 'amiri';
  const savedLatin  = localStorage.getItem(FONT_STORAGE_LATIN)  || 'system';

  let arabicKey = savedArabic;
  let latinKey  = savedLatin;

  if (type === 'arabic') arabicKey = value;
  if (type === 'latin')  latinKey  = value;

  const arabicDef = getFontDef(ARABIC_FONTS, arabicKey);
  const latinDef  = getFontDef(LATIN_FONTS,  latinKey);

  // Save to localStorage
  localStorage.setItem(FONT_STORAGE_ARABIC, arabicKey);
  localStorage.setItem(FONT_STORAGE_LATIN,  latinKey);

  // Inject fonts into current window (operator panel) for preview
  injectGoogleFont(arabicDef.googleUrl);
  injectGoogleFont(latinDef.googleUrl);

  // Update sidebar previews
  updateFontPreviews(arabicDef.family, latinDef.family);

  // Sync to Electron presentation window via IPC
  if (window.electronAPI && window.electronAPI.updateFont) {
    window.electronAPI.updateFont({ arabicFont: arabicKey, latinFont: latinKey });
  }

  // Sync to browser popup presentation window via postMessage
  if (typeof presentationWindow !== 'undefined' && presentationWindow && !presentationWindow.closed) {
    try {
      presentationWindow.postMessage({
        type: 'FONT_UPDATE',
        arabicFont: arabicKey,
        latinFont: latinKey
      }, '*');
    } catch (e) { }
  }

  // localStorage is the main channel for HTTP polling (OBS) — already set above
}

/**
 * Initialize fonts on page load — read from localStorage and apply.
 */
function initFonts() {
  populateFontDropdowns();

  const arabicKey = localStorage.getItem(FONT_STORAGE_ARABIC) || 'amiri';
  const latinKey  = localStorage.getItem(FONT_STORAGE_LATIN)  || 'system';

  const arabicDef = getFontDef(ARABIC_FONTS, arabicKey);
  const latinDef  = getFontDef(LATIN_FONTS,  latinKey);

  injectGoogleFont(arabicDef.googleUrl);
  injectGoogleFont(latinDef.googleUrl);

  updateFontPreviews(arabicDef.family, latinDef.family);
  // Note: CSS vars for presentation are applied in each template, not the operator panel.
}

document.addEventListener('DOMContentLoaded', initFonts);
