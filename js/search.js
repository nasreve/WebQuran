/**
 * Webquran v5 — Search Drawer & Split View System
 * Mendukung pencarian cepat Kata Kunci Terjemahan (F4) & Transliterasi Latin (F3)
 * Menampilkan hasil di Search Drawer / Split View tanpa menghapus panggung ayat aktif (#resultArea).
 */

// ── GLOBAL SEARCH STATE ──────────────────────────────────────
let searchDrawerTab = 'translation'; // 'translation' | 'latin'
let searchDrawerOpen = false;
let searchDrawerMode = 'split'; // 'split' | 'drawer'
let searchDebounceTimer = null;
let lastLoadedSearchAyahKey = null;

// Pulihkan preferensi mode tampilan dari localStorage
try {
  const savedMode = localStorage.getItem('webquran_search_mode');
  if (savedMode === 'split' || savedMode === 'drawer') {
    searchDrawerMode = savedMode;
  }
} catch (e) { }

// Shared index state; translation objects are replaced when a version is selected.
let searchDataReady = false;
let indexedTranslationSource = null;
let searchResultPage = null;
const SEARCH_PAGE_SIZE = 60;

function ensureTranslationSearchIndex() {
  if (indexedTranslationSource === customTranslations) return;
  for (const item of translationIndex) {
    const raw = customTranslations[item.surah_id + ':' + item.ayah] || item.defaultTranslation;
    item.translation = cleanTranslation(raw);
    item.translationSearch = QuranSearch.prepare(item.translation, 'translation');
  }
  indexedTranslationSource = customTranslations;
}

function refreshSearchResults() {
  ensureTranslationSearchIndex();
  if (searchDrawerOpen) {
    const input = document.getElementById('sdSearchInput');
    performSearch(input ? input.value : '', searchDrawerTab);
  }
  if (typeof isOmnibarOpen !== 'undefined' && isOmnibarOpen) {
    const input = document.getElementById('omnibarInput');
    if (input) renderOmnibarResults(parseOmnibarQuery(input.value));
  }
}

// ── DRAWER OPEN / CLOSE / TOGGLE ─────────────────────────────
function openSearchDrawer(type = 'translation', query = '') {
  const panel = document.getElementById('searchDrawerPanel');
  const dockBtn = document.getElementById('dockBtnToggleSearch');
  if (!panel) return;

  searchDrawerOpen = true;
  panel.classList.remove('sd-hidden');
  applySearchDrawerModeClass();

  if (dockBtn) dockBtn.classList.add('active');

  if (query !== '') {
    const input = document.getElementById('sdSearchInput');
    if (input) input.value = query;
  }
  switchSearchDrawerTab(type);

  const searchInput = document.getElementById('sdSearchInput');
  if (searchInput) {
    if (query !== '') {
      searchInput.value = query;
      document.getElementById('sdClearBtn').style.display = 'block';

    }
    setTimeout(() => searchInput.focus(), 50);
  }
}

function closeSearchDrawer() {
  const panel = document.getElementById('searchDrawerPanel');
  const dockBtn = document.getElementById('dockBtnToggleSearch');
  if (!panel) return;

  searchDrawerOpen = false;
  panel.classList.add('sd-hidden');
  if (dockBtn) dockBtn.classList.remove('active');
}

function toggleSearchDrawer() {
  if (searchDrawerOpen) {
    closeSearchDrawer();
  } else {
    openSearchDrawer(searchDrawerTab);
  }
}

function applySearchDrawerModeClass() {
  const panel = document.getElementById('searchDrawerPanel');
  const modeText = document.getElementById('sdModeText');
  const modeBtn = document.getElementById('sdBtnToggleMode');
  if (!panel) return;

  panel.classList.remove('sd-mode-split', 'sd-mode-drawer');
  if (searchDrawerMode === 'split') {
    panel.classList.add('sd-mode-split');
    if (modeText) modeText.innerText = 'Split';
    if (modeBtn) modeBtn.title = 'Mode Split aktif (Klik untuk ganti ke Drawer Melayang)';
  } else {
    panel.classList.add('sd-mode-drawer');
    if (modeText) modeText.innerText = 'Drawer';
    if (modeBtn) modeBtn.title = 'Mode Drawer Melayang aktif (Klik untuk ganti ke Split Kolom)';
  }
}

function toggleSearchSplitMode() {
  searchDrawerMode = searchDrawerMode === 'split' ? 'drawer' : 'split';
  try {
    localStorage.setItem('webquran_search_mode', searchDrawerMode);
  } catch (e) { }
  applySearchDrawerModeClass();
  showToast(`Mode Tampilan Pencarian: ${searchDrawerMode === 'split' ? 'Split Kolom' : 'Drawer Melayang'}`, 'info');
}

function switchSearchDrawerTab(type) {
  clearTimeout(searchDebounceTimer);
  searchDrawerTab = type;
  const tabTrans = document.getElementById('sdTabTrans');
  const tabLatin = document.getElementById('sdTabLatin');
  const input = document.getElementById('sdSearchInput');

  if (type === 'latin') {
    if (tabTrans) tabTrans.classList.remove('active');
    if (tabLatin) tabLatin.classList.add('active');
    if (input) input.placeholder = 'Ketik transliterasi latin (cth: yasalunaka, ya ayyuhalladzina)...';
  } else {
    if (tabTrans) tabTrans.classList.add('active');
    if (tabLatin) tabLatin.classList.remove('active');
    if (input) input.placeholder = 'Ketik kata terjemahan (cth: puasa, takwa, surga, rezeki)...';
  }

  // Jalankan ulang, termasuk reset hasil jika input belum cukup panjang.
  if (input) {
    if (type === 'latin') {
      performLatinSearch(input.value.trim());
    } else {
      performTranslationSearch(input.value.trim());
    }
  }
}

function clearSearchDrawerInput() {
  clearTimeout(searchDebounceTimer);
  const input = document.getElementById('sdSearchInput');
  const clearBtn = document.getElementById('sdClearBtn');
  if (input) {
    input.value = '';
    input.focus();
  }
  if (clearBtn) clearBtn.style.display = 'none';

  // Bersihkan juga input sidebar jika ada
  const latInput = document.getElementById('latinInput');
  const trInput = document.getElementById('transInput');
  if (latInput) latInput.value = '';
  if (trInput) trInput.value = '';

  renderSearchEmptyState();
}

function handleDrawerSearchInput(e) {
  const val = e.target.value;
  const clearBtn = document.getElementById('sdClearBtn');
  if (clearBtn) {
    clearBtn.style.display = val.length > 0 ? 'block' : 'none';
  }

  // Sinkronkan ke input sidebar yang bersangkutan
  if (searchDrawerTab === 'latin') {
    const latInput = document.getElementById('latinInput');
    if (latInput && latInput !== e.target) latInput.value = val;
  } else {
    const trInput = document.getElementById('transInput');
    if (trInput && trInput !== e.target) trInput.value = val;
  }

  clearTimeout(searchDebounceTimer);
  searchDebounceTimer = setTimeout(() => {
    if (searchDrawerTab === 'latin') {
      performLatinSearch(val);
    } else {
      performTranslationSearch(val);
    }
  }, 120);
}

// ── SIDEBAR INPUT HANDLERS (SEAMLESS INTEGRATION) ─────────────
function handleLatinSearch(e) { handleSidebarSearch(e, 'latin'); }
function handleTranslationSearch(e) { handleSidebarSearch(e, 'translation'); }

function handleSidebarSearch(e, type) {
  const val = e.target.value;
  const input = document.getElementById('sdSearchInput');
  const clearBtn = document.getElementById('sdClearBtn');
  if (input) input.value = val;
  if (clearBtn) clearBtn.style.display = val.length > 0 ? 'block' : 'none';
  // Sync even an empty value before opening or changing tabs.
  if (!searchDrawerOpen) {
    openSearchDrawer(type);
  } else if (searchDrawerTab !== type) {
    switchSearchDrawerTab(type);
  } else {
    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(() => performSearch(val, type), 120);
  }
}

// ── SHARED SEARCH / PAGINATED RESULTS ───────────────────────
function performLatinSearch(rawQuery) { performSearch(rawQuery, 'latin'); }
function performTranslationSearch(rawQuery) { performSearch(rawQuery, 'translation'); }

function performSearch(rawQuery, type) {
  clearTimeout(searchDebounceTimer);
  const resultsContainer = document.getElementById('searchDrawerResults');
  const badgeCount = document.getElementById('sdBadgeCount');
  const status = document.getElementById('sdStatusSubtext');
  if (!resultsContainer) return;
  const query = String(rawQuery || '').trim();
  searchResultPage = null;
  if (!QuranSearch.query(query, type).valid) {
    renderSearchEmptyState();
    return;
  }
  if (!searchDataReady) {
    if (badgeCount) badgeCount.style.display = 'none';
    if (status) status.innerText = 'Menyiapkan data pencarian...';
    resultsContainer.innerHTML = '<div class="sd-empty-state"><p>Data indeks sedang disiapkan...</p></div>';
    return;
  }
  ensureTranslationSearchIndex();
  const matches = QuranSearch.search(type === 'latin' ? searchIndex : translationIndex, query, type);
  if (badgeCount) {
    badgeCount.innerText = matches.length;
    badgeCount.style.display = 'inline-block';
  }
  if (!matches.length) {
    if (status) status.innerText = 'Tidak ada hasil untuk "' + query + '"';
    resultsContainer.innerHTML = '<div class="sd-empty-state"><p>Tidak Ditemukan</p><p>Tidak ada ayat yang cocok dengan kata “<b>' + escapeHtml(query) + '</b>”. Coba kata kunci lain atau potongan bacaan yang lebih pendek.</p></div>';
    return;
  }
  searchResultPage = { matches, query, type, shown: 0 };
  resultsContainer.innerHTML = '';
  resultsContainer.scrollTop = 0;
  showMoreSearchResults();
}

function showMoreSearchResults() {
  if (!searchResultPage) return;
  const resultsContainer = document.getElementById('searchDrawerResults');
  if (!resultsContainer) return;
  const oldButton = document.getElementById('sdShowMore');
  if (oldButton) oldButton.remove();
  const { matches, query, type, shown } = searchResultPage;
  const displayMatches = matches.slice(shown, shown + SEARCH_PAGE_SIZE).map(match => match.item);
  const html = displayMatches.map(item => {
    const sName = item.surah_name || (surahNames && surahNames[item.surah_id - 1]) || `Surat ${item.surah_id}`;
    const key = `${item.surah_id}:${item.ayah}`;
    const isActive = lastLoadedSearchAyahKey === key ? 'sd-card-active' : '';

    return `
      <div class="sd-card-item ${isActive}" data-ayah-key="${key}">
        <div class="sd-card-top">
          <span class="sd-surah-tag"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px; margin-right:4px;"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>QS ${item.surah_id}. ${escapeHtml(sName)} : ${item.ayah}</span>
          <div class="sd-card-actions">
            <button class="sd-card-btn sd-btn-load" onclick="loadSearchResultToStage(${item.surah_id}, ${item.ayah}, false, this)" title="Muat ke panggung kontrol tanpa mengubah status tayang">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
              <span>Muat</span>
            </button>
            <button class="sd-card-btn sd-btn-live" onclick="loadSearchResultToStage(${item.surah_id}, ${item.ayah}, true, this)" title="Muat & langsung tayangkan ON AIR (SHOW)">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
              <span>Live</span>
            </button>
          </div>
        </div>
        <div class="sd-card-body" onclick="loadSearchResultToStage(${item.surah_id}, ${item.ayah}, false, this)" title="Klik untuk memuat ayat">
          <div class="sd-arabic-text">${escapeHtml(item.arabic)}</div>
          <div class="sd-snippet-text">"${QuranSearch.highlight(type === 'latin' ? item.latin : item.translation, query, type)}"</div>
        </div>
      </div>
    `;
  }).join('');
  resultsContainer.insertAdjacentHTML('beforeend', html);
  searchResultPage.shown += displayMatches.length;
  const status = document.getElementById('sdStatusSubtext');
  if (status) status.innerText = 'Ditemukan ' + matches.length + ' ayat • ' + searchResultPage.shown + ' ditampilkan • urutan relevansi';
  if (searchResultPage.shown < matches.length) {
    resultsContainer.insertAdjacentHTML('beforeend', '<button id="sdShowMore" class="sd-card-btn" style="width:100%;justify-content:center;padding:12px" onclick="showMoreSearchResults()">Tampilkan hasil berikutnya</button>');
  }
}

function renderSearchEmptyState() {
  searchResultPage = null;
  const badge = document.getElementById('sdBadgeCount');
  const status = document.getElementById('sdStatusSubtext');
  if (badge) { badge.innerText = ''; badge.style.display = 'none'; }
  if (status) status.innerText = 'Ketik minimal 3 huruf untuk mencari...';
  const container = document.getElementById('searchDrawerResults');
  if (!container) return;
  container.innerHTML = `
    <div class="sd-empty-state">
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
      <p>Belum ada pencarian.<br>Ketik kata kunci untuk menemukan ayat terkait.</p>
    </div>
  `;
}

// ── ACTION: MUAT KE PANGGUNG (LOAD vs LIVE) ──────────────────
async function loadSearchResultToStage(surahId, ayahNo, goLive = false, btnEl = null) {
  try {
    if (typeof QURAN_DATA === 'undefined') {
      showToast('Data Quran belum siap!', 'error');
      return;
    }

    // 1. Update form navigasi surat & ayat
    if (document.getElementById("surahInput")) {
      document.getElementById("surahInput").value = `${surahId}. ${surahNames[surahId - 1]}`;
    }
    if (document.getElementById("ayahInput")) {
      document.getElementById("ayahInput").value = ayahNo;
    }
    if (document.getElementById("ayahCountInput")) {
      document.getElementById("ayahCountInput").value = 1;
    }

    // 2. Muat data surat & ayat
    currentSurahData = QURAN_DATA.surahs[surahId - 1];
    currentSurahId = surahId;
    currentAyahNo = ayahNo;

    // Muat tidak boleh mengubah apa pun yang sedang ON AIR.
    // Kalau layar sedang OFF, kiriman tetap dilakukan supaya saat operator menekan
    // Show, ayat inilah yang naik — bukan ayat lama yang masih tersimpan di server.
    const isLiveNow = typeof isPresentationVisible !== 'undefined' ? isPresentationVisible : true;
    const pvwMode = typeof isPvwMode === 'function' && isPvwMode();
    // Mode PVW: "Muat" hanya ke panggung walau layar sedang blank.
    const pushToAir = goLive || (!isLiveNow && !pvwMode);

    const ayah = currentSurahData.find(a => a.ayah === ayahNo);
    if (ayah && typeof renderMultipleResults === 'function') {
      renderMultipleResults([ayah], { pushToAir });
    } else if (typeof searchAyah === 'function') {
      await searchAyah(true, goLive, pushToAir);
    }

    // 3. Highlight kartu pencarian aktif
    lastLoadedSearchAyahKey = `${surahId}:${ayahNo}`;
    document.querySelectorAll('.sd-card-item').forEach(card => {
      if (card.dataset.ayahKey === lastLoadedSearchAyahKey) {
        card.classList.add('sd-card-active');
      } else {
        card.classList.remove('sd-card-active');
      }
    });

    // 4. Handle Live vs Load
    const sName = surahNames[surahId - 1] || `Surat ${surahId}`;
    if (goLive) {
      window.ProjectorScreen?.selectIfOpen('quran');
      if (typeof isPresentationVisible !== 'undefined' && !isPresentationVisible) {
        toggleVisibility();
      }
      showToast(`QS ${sName} : ${ayahNo} ON AIR (SHOW)`, 'success');
    } else {
      showToast(
        pushToAir
          ? `QS ${sName} : ${ayahNo} dimuat ke panggung`
          : `QS ${sName} : ${ayahNo} dimuat ke panggung · tayangan tidak berubah`,
        'info'
      );
    }

    // 5. Update Confidence Monitor
    if (typeof syncConfidenceMonitor === 'function') {
      syncConfidenceMonitor();
    }
  } catch (err) {
    console.error('Error in loadSearchResultToStage:', err);
    showToast('Gagal memuat ayat dari pencarian', 'error');
  }
}

// Backward compatibility alias
async function selectSearchResult(surahId, ayahNo) {
  await loadSearchResultToStage(surahId, ayahNo, false);
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

// ── SHORTCUTS & EVENT LISTENERS ──────────────────────────────
document.addEventListener('keydown', (e) => {
  // ESC: tutup drawer hanya bila tidak ada modal/overlay di atasnya.
  // Dulu pemeriksaannya memakai kelas 'active' padahal modal memakai 'show',
  // sehingga Esc selalu menganggap tidak ada modal dan menutup drawer di belakang.
  if (e.key === 'Escape' && searchDrawerOpen) {
    const blocked = typeof isAnyModalOpen === 'function' ? isAnyModalOpen() : false;
    if (!blocked) {
      e.preventDefault();
      closeSearchDrawer();
    }
  }

  // F3: Buka pencarian Latin di Search Drawer
  if (e.key === 'F3') {
    e.preventDefault();
    openSearchDrawer('latin');
  }

  // F4: Buka pencarian Terjemahan di Search Drawer
  if (e.key === 'F4') {
    e.preventDefault();
    openSearchDrawer('translation');
  }
});

// Pastikan mode class diterapkan saat inisialisasi awal
document.addEventListener('DOMContentLoaded', () => {
  applySearchDrawerModeClass();
});
