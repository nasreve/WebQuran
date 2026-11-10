// ============================================
// Render - UI Rendering (Skeleton & Results)
// ============================================

// Skeleton Loading
function showSkeleton() {
  const container = document.getElementById("resultArea");
  container.innerHTML = `
    <!-- Skeleton Card 1: Arabic -->
    <div class="skeleton-card">
      <div class="skeleton-header">
        <div class="skeleton skeleton-label"></div>
        <div style="display:flex; gap:12px;">
          <div class="skeleton skeleton-btn"></div>
          <div class="skeleton skeleton-btn" style="width:70px;"></div>
        </div>
      </div>
      <div class="skeleton-body">
        <div class="skeleton skeleton-text-arabic"></div>
        <div class="skeleton skeleton-text-arabic-2"></div>
      </div>
    </div>

    <!-- Skeleton Card 2: Translation -->
    <div class="skeleton-card">
      <div class="skeleton-header">
        <div class="skeleton skeleton-label" style="width:120px;"></div>
        <div style="display:flex; gap:12px;">
          <div class="skeleton skeleton-btn"></div>
          <div class="skeleton skeleton-btn" style="width:70px;"></div>
        </div>
      </div>
      <div class="skeleton-body">
        <div class="skeleton skeleton-text-trans"></div>
        <div class="skeleton skeleton-text-trans-2"></div>
      </div>
    </div>

    <!-- Skeleton Card 3: Info -->
    <div class="skeleton-card">
      <div class="skeleton-header">
        <div class="skeleton skeleton-label" style="width:90px;"></div>
        <div style="display:flex; gap:12px;">
          <div class="skeleton skeleton-btn"></div>
          <div class="skeleton skeleton-btn" style="width:70px;"></div>
        </div>
      </div>
      <div class="skeleton-body">
        <div class="skeleton skeleton-text-info"></div>
      </div>
    </div>
  `;
}

// ── History Tracking ─────────────────────────────────────
const HISTORY_KEY = 'quranBroadcast_history';
const HISTORY_MAX = 30;

function loadHistory() {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY)) || []; } catch { return []; }
}

function saveHistory(history) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

function addHistory(entry) {
  const history = loadHistory();
  // Jangan duplikasi jika entry terakhir sama persis
  if (history.length > 0) {
    const last = history[0];
    if (last.surahId === entry.surahId && last.ayah === entry.ayah && last.count === entry.count) return;
  }
  history.unshift(entry);
  if (history.length > HISTORY_MAX) history.length = HISTORY_MAX;
  saveHistory(history);
  renderHistory();
}

function renderHistory() {
  const list = document.getElementById('historyList');
  const badge = document.getElementById('historyCountBadge');
  const actions = document.getElementById('historyActions');
  if (!list) return;

  const history = loadHistory();

  if (history.length === 0) {
    list.innerHTML = '<div class="history-empty">Belum ada riwayat</div>';
    if (badge) badge.style.display = 'none';
    if (actions) actions.style.display = 'none';
    return;
  }

  if (badge) { badge.textContent = history.length; badge.style.display = 'inline-block'; }
  if (actions) actions.style.display = 'block';

  list.innerHTML = history.map((h, i) => {
    const ayahLabel = h.count > 1 ? `Ayat ${h.ayah}–${h.ayah + h.count - 1}` : `Ayat ${h.ayah}`;
    const time = h.time || '';
    return `<div class="history-item" onclick="navigateFromHistory(${i})" title="${h.surahName} ${ayahLabel}">
      <div class="history-item-main">
        <span class="history-item-surah">${h.surahName}</span>
        <span class="history-item-ayah">${ayahLabel}</span>
      </div>
      <span class="history-item-time">${time}</span>
    </div>`;
  }).join('');
}

function navigateFromHistory(index) {
  const history = loadHistory();
  const h = history[index];
  if (!h) return;

  document.getElementById('surahInput').value = `${h.surahId}. ${h.surahName}`;
  document.getElementById('ayahInput').value = h.ayah;
  document.getElementById('ayahCountInput').value = h.count || 1;
  expandSection('sectionNav');
  searchAyah(true);
}

function clearHistory() {
  localStorage.removeItem(HISTORY_KEY);
  renderHistory();
  showToast('🗑️ Riwayat dihapus', '');
}

// Load history on page load
document.addEventListener('DOMContentLoaded', renderHistory);

// Render multiple verses
// options.pushToAir === false  -> hanya menggambar panggung operator, layar siaran
// tidak disentuh (dipakai tombol "Muat" saat layar sedang ON AIR).
function renderMultipleResults(verses, options = {}) {
  const pushToAir = options.pushToAir !== false;
  const container = document.getElementById("resultArea");

  // Combine all arabic with verse number markers
  const allArabic = verses.map(v =>
    v.arabic.trim() + "\u200F\u00A0﴿" + toArabicNum(v.ayah) + "﴾\u200F"
  ).join(" ");
  const allTranslations = verses.map(v => {
    const key = `${v.surah_id}:${v.ayah}`;
    const rawText = customTranslations[key] || v.translation;
    const text = typeof cleanTranslation === 'function' ? cleanTranslation(rawText) : rawText;
    return `(${v.ayah}) ${text}`;
  }).join(" ");

  const firstVerse = verses[0];
  const lastVerse = verses[verses.length - 1];
  const infoString = verses.length === 1
    ? `QS ${firstVerse.surah.latin} (${firstVerse.surah_id}) Ayat ${firstVerse.ayah}`
    : `QS ${firstVerse.surah.latin} (${firstVerse.surah_id}) Ayat ${firstVerse.ayah}-${lastVerse.ayah}`;

  // Update Dataset for copy/vMix
  container.dataset.arabic = allArabic;
  container.dataset.trans = allTranslations;
  container.dataset.info = infoString;

  // Simpan posisi terakhir: dipulihkan sebagai isian kolom saat aplikasi dibuka
  // lagi (tidak menayangkan apa pun sebelum operator menekan Tampilkan Ayat).
  try {
    localStorage.setItem('webquran.lastSurah', `${firstVerse.surah_id}. ${firstVerse.surah.latin}`);
    localStorage.setItem('webquran.lastAyah', String(firstVerse.ayah));
  } catch (e) { /* penyimpanan tidak tersedia */ }

  // Auto-push to presentation window if open
  // Sprint 5 · F5: tandai dulu apa yang ada di panggung (PVW), baru kirim ke udara (PGM)
  if (typeof markStagePreview === 'function') {
    markStagePreview(allArabic, allTranslations, infoString);
  }

  if (pushToAir && typeof pushToPresentation === 'function') {
    pushToPresentation(allArabic, allTranslations, infoString);
  }

  // ── Auto-hide translation on new verse ───────────────────
  // Dihapus agar state terjemahan tetap dipertahankan saat next/prev (permintaan user)
  // if (typeof isTranslationVisible !== 'undefined' && isTranslationVisible) {
  //   if (typeof toggleTransVisibility === 'function') {
  //     toggleTransVisibility();
  //   }
  // }

  // ── Update Breadcrumb ─────────────────────────────────────
  const breadcrumb = document.getElementById('surahBreadcrumb');
  if (breadcrumb) {
    breadcrumb.style.display = 'flex';
    const surahEl = document.getElementById('breadcrumbSurah');
    const ayahEl = document.getElementById('breadcrumbAyah');
    const progressEl = document.getElementById('breadcrumbProgress');
    if (surahEl) surahEl.textContent = `${firstVerse.surah.latin} (${firstVerse.surah_id})`;
    if (ayahEl) {
      ayahEl.textContent = verses.length === 1
        ? `Ayat ${firstVerse.ayah}`
        : `Ayat ${firstVerse.ayah}–${lastVerse.ayah}`;
    }
    if (progressEl && currentSurahData.length > 0) {
      const totalAyah = currentSurahData.length;
      progressEl.textContent = `${firstVerse.ayah} / ${totalAyah}`;
    }

    // Sync Central Dock buttons state
    if (typeof updateVisibilityUI === 'function') updateVisibilityUI();
    if (typeof updateTransVisibilityUI === 'function') updateTransVisibilityUI();

    const dockPrev = document.getElementById('dockBtnPrev');
    const dockNext = document.getElementById('dockBtnNext');
    if (dockPrev) {
      dockPrev.disabled = (firstVerse.surah_id === 1 && firstVerse.ayah === 1);
    }
    if (dockNext) {
      dockNext.disabled = (firstVerse.surah_id === 114 && firstVerse.ayah === 6);
    }

    // Configure bookmark and copy buttons in breadcrumb
    const btnBookmark = document.getElementById('btnBookmarkAyah');
    if (btnBookmark) {
      const bookmarked = typeof isBookmarked === 'function' && isBookmarked(firstVerse.surah_id, firstVerse.ayah);
      if (bookmarked) {
        btnBookmark.classList.add('bookmark-active');
        btnBookmark.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg> <span>Bookmarked</span>';
      } else {
        btnBookmark.classList.remove('bookmark-active');
        btnBookmark.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg> <span>Bookmark</span>';
      }
      btnBookmark.onclick = () => toggleBookmark(firstVerse.surah_id, firstVerse.surah.latin, firstVerse.ayah);
    }

    const btnCopyInfo = document.getElementById('btnCopyInfo');
    if (btnCopyInfo) {
      btnCopyInfo.onclick = () => copyText(infoString);
    }
  }

  // ── Record to History ──────────────────────────────────────
  const now = new Date();
  const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  addHistory({
    surahId: firstVerse.surah_id,
    surahName: firstVerse.surah.latin,
    ayah: firstVerse.ayah,
    count: verses.length,
    time: timeStr
  });

  // Generate HTML for each verse
  let arabicCards = '';
  let transCards = '';

  verses.forEach((data, index) => {
    const key = `${data.surah_id}:${data.ayah}`;
    let rawTranslation = customTranslations[key] || data.translation;
    let finalTranslation = typeof cleanTranslation === 'function' ? cleanTranslation(rawTranslation) : rawTranslation;
    let isCustom = customTranslations[key] ? true : false;

    arabicCards += `
      <div class="verse-item" style="margin-bottom: ${index < verses.length - 1 ? '20px' : '0'}; padding-bottom: ${index < verses.length - 1 ? '20px' : '0'}; border-bottom: ${index < verses.length - 1 ? '1px solid #334155' : 'none'};">
        <div style="font-size: 12px; color: var(--accent); margin-bottom: 10px; font-weight: 600;">Ayat ${data.ayah}</div>
        <div class="arabic-text">${data.arabic}</div>
      </div>
    `;

    transCards += `
      <div class="verse-item" style="margin-bottom: ${index < verses.length - 1 ? '20px' : '0'}; padding-bottom: ${index < verses.length - 1 ? '20px' : '0'}; border-bottom: ${index < verses.length - 1 ? '1px solid #334155' : 'none'};">
        <div style="font-size: 12px; color: ${isCustom ? '#f59e0b' : 'var(--accent)'}; margin-bottom: 10px; font-weight: 600;">
          Ayat ${data.ayah} ${isCustom ? `<span style="background:#f59e0b; color:black; padding:2px 6px; border-radius:4px; font-size:10px; margin-left:5px;">${(typeof TRANSLATION_LABELS !== 'undefined' && TRANSLATION_LABELS[currentTranslationVersion]) || 'Versi lain'}</span>` : ''}
        </div>
        <div class="trans-text">${finalTranslation}</div>
      </div>
    `;
  });

  container.innerHTML = `
    <div class="result-card">
      <div class="card-header">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span class="card-label">ARABIC</span>
          ${verses.length > 1 ? `<span class="badge-verses-count">${verses.length} AYAT</span>` : ''}
        </div>
        <div class="header-actions">
           <button class="btn-action btn-copy" onclick="handleStageCopy(this, '${escapeJs(allArabic)}')">
             <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
               <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
               <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
             </svg>
             <span>Copy</span>
           </button>
        </div>
      </div>
      <div class="card-body">
        ${arabicCards}
      </div>
    </div>

    <div class="result-card">
      <div class="card-header">
        <div class="stage-trans-wrap">
          <span class="card-label">TERJEMAHAN</span>
          <div class="stage-trans-selector" title="Ganti Versi Terjemahan (Kemenag 2019 / Kampung Sunnah / 2002)">
            <svg class="stage-trans-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
            </svg>
            <select class="stage-trans-select" onchange="changeTranslation(this.value)">
              <option value="default" ${currentTranslationVersion === 'default' ? 'selected' : ''}>Kemenag 2019</option>
              <option value="kemenag_lama" ${currentTranslationVersion === 'kemenag_lama' ? 'selected' : ''}>Kampung Sunnah</option>
              <option value="kemenag_2002" ${currentTranslationVersion === 'kemenag_2002' ? 'selected' : ''}>Kemenag 2002</option>
            </select>
            <svg class="stage-chevron" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </div>
          ${verses.length > 1 ? `<span class="badge-verses-count">${verses.length} AYAT</span>` : ''}
        </div>
        <div class="header-actions">
           <button class="btn-action btn-copy" onclick="handleStageCopy(this, '${escapeJs(allTranslations)}')">
             <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
               <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
               <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
             </svg>
             <span>Copy</span>
           </button>
        </div>
      </div>
      <div class="card-body">
        ${transCards}
      </div>
    </div>
  `;
}

// Global helper for stage copy buttons with tactile feedback
function handleStageCopy(btn, text) {
  if (!btn || !text) return;
  navigator.clipboard.writeText(text).then(() => {
    if (typeof showToast === 'function') showToast("Disalin!");
    if (!btn.dataset.origHtml) {
      btn.dataset.origHtml = btn.innerHTML;
    }
    btn.classList.add('btn-copied');
    btn.innerHTML = `
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg>
      <span>Tersalin!</span>
    `;
    clearTimeout(btn._copiedTimer);
    btn._copiedTimer = setTimeout(() => {
      btn.classList.remove('btn-copied');
      btn.innerHTML = btn.dataset.origHtml;
    }, 1800);
  }).catch(() => {
    if (typeof showToast === 'function') showToast("Gagal menyalin", "error");
  });
}
window.handleStageCopy = handleStageCopy;

