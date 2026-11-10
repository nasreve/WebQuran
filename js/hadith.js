(() => {
  'use strict';
  const E = window.HadithSearchEngine;
  const esc = E.escape;
  const book = '<svg width="27" height="27" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 6c-3-2-6-2-10-1v15c4-1 7-1 10 1 3-2 6-2 10-1V5c-4-1-7-1-10 1Z"/><path d="M12 6v15M5 9l4 1M15 10l4-1M5 13l4 1M15 14l4-1"/></svg>';
  const dialog = document.createElement('dialog');
  dialog.className = 'hd-dialog';
  dialog.setAttribute('aria-labelledby', 'hd-title');
  dialog.innerHTML = `<div class="hd-shell">
  <aside class="hd-rail">
    <div class="hd-top">
      <div class="hd-brand"><div class="hd-brand-icon">${book}</div><div><div class="hd-kicker">PERPUSTAKAAN RUJUKAN</div><h2 id="hd-title">Pencarian Hadits</h2></div></div>
    </div>

    <div class="hd-rail-block">
      <div class="hd-rail-label">Koleksi</div>
      <div class="hd-tabs" role="group" aria-label="Kelompok sumber"><button class="hd-tab" data-group="kitab" aria-pressed="true">Kitab Hadits</button><button class="hd-tab" data-group="brosur" aria-pressed="false">Brosur Ahad Pagi</button></div>
      <span class="hd-source-note" id="hd-source-note">Memuat daftar rujukan…</span>

      <label class="hd-rail-label" for="hd-source">Rujukan</label>
      <select id="hd-source" class="hd-select hd-source-select" aria-label="Pilih rujukan" disabled><option>Memuat rujukan…</option></select>

      <label class="hd-rail-label" for="hd-mode">Mode pencarian</label>
      <select id="hd-mode" class="hd-select" aria-label="Mode pencarian"><option value="translation" selected>Terjemahan Indonesia</option><option value="text">Arab · Terjemahan · Nomor</option><option value="latin">Transliterasi Latin</option></select>
      <span class="hd-rail-hint" id="hd-mode-hint">Hanya terjemahan Indonesia — cocok bila hanya tahu artinya.</span>

      <button class="hd-saved-filter" id="hd-saved" aria-pressed="false">☆ Tersimpan</button>
    </div>

    <div class="hd-rail-block">
      <div class="hd-rail-label">Siaran</div>
      <label class="hd-rail-hint" for="hd-template">Target layar</label>
      <select id="hd-template" class="hd-select" disabled>
        <option value="lower-third">Lower Third Gelap (vMix / OBS)</option>
        <option value="lower-third-white">Lower Third Putih (vMix / OBS)</option>
        <option value="lower-third-full">Lower Third Penuh (lebar layar, rapat bawah)</option>
        <option value="full-screen">Full Screen (Proyektor)</option>
      </select>
      <button class="hd-action hd-projector-btn" id="hd-projector" type="button" title="Buka jendela layar proyektor / second screen">Buka Layar Proyektor</button>
      <span id="hd-projector-status" class="hd-projector-status" role="status" aria-live="polite">Proyektor: Memeriksa…</span>
      <span id="hd-fit" class="hd-fit-badge" role="status" aria-live="polite" hidden></span>
      <label class="hd-rail-hint" for="hd-scale-down">Ukuran tayang hadits</label>
      <div class="hd-scale-row" role="group" aria-label="Ukuran teks hadits di layar siaran">
        <button class="hd-action" id="hd-scale-down" type="button" aria-label="Perkecil teks siaran">A−</button>
        <span class="hd-scale-value" id="hd-scale-value" role="status" aria-live="polite">100%</span>
        <button class="hd-action" id="hd-scale-up" type="button" aria-label="Perbesar teks siaran">A+</button>
      </div>
      <button class="hd-action hd-scroll-btn" id="hd-scroll-pause" type="button" aria-pressed="false" title="Hentikan atau lanjutkan gulir kutipan panjang di layar">⏸ Jeda gulir</button>
      <span id="hd-scroll-state" class="hd-rail-hint" role="status" aria-live="polite">Gulir: otomatis bila teks meluap</span>
    </div>

    <div class="hd-rail-foot">
      <span id="hd-feedback" class="hd-feedback" role="status" aria-live="polite">Kitab dan brosur ditelusuri secara terpisah.</span>
      <span class="hd-footer-hint">F7 buka pencarian · Esc kembali ke operator</span>
    </div>
  </aside>

  <main class="hd-main">
    <form class="hd-search-row" id="hd-form" role="search" aria-label="Pencarian hadits">
      <div class="hd-search-box"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></svg><input id="hd-query" type="search" placeholder="Kata kunci terjemahan, mis. sabar, puasa, sedekah…" aria-label="Kata Arab, terjemahan, nomor hadits, atau frasa Latin Arab sesuai mode" autocomplete="off" maxlength="200"><button type="button" class="hd-clear" id="hd-clear" aria-label="Hapus pencarian" hidden>×</button></div>
      <button class="hd-search-submit" id="hd-submit" type="submit" disabled>Cari</button>
    </form>

    <div class="hd-history" id="hd-history" hidden></div>

    <div class="hd-main-head">
      <span class="hd-result-count" id="hd-count" role="status" aria-live="polite">Jelajahi koleksi</span>
      <div class="hd-main-tools">
        <span class="hd-progress" id="hd-progress"></span>
        <select class="hd-select hd-sort" id="hd-sort" aria-label="Urutan hasil"><option value="relevance">Paling relevan</option><option value="number">Urut nomor hadits</option></select>
      </div>
    </div>

    <div class="hd-body" id="hd-body">
      <section class="hd-results-pane" aria-label="Hasil pencarian"><div class="hd-results" id="hd-results"></div></section>
      <section class="hd-reader" id="hd-reader" aria-label="Bacaan hadits"></section>
    </div>
  </main>

  <button class="hd-close-float" id="hd-close" aria-label="Tutup pencarian hadits" title="Tutup (Esc)">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
  </button>
</div>`;
  document.body.appendChild(dialog);
  const $ = id => dialog.querySelector('#hd-' + id);

  const projectorStatus = $('projector-status');
  let deactivateRenderedHadith = () => {};
  const updateProjectorStatus = state => {
    projectorStatus.textContent = !state?.open ? 'Proyektor: Tidak aktif' : 'Proyektor: ' + (state.content === 'hadith' ? 'Hadits' : 'Ayat');
    $('projector').textContent = !state?.open ? 'Buka Layar Proyektor' : (state.content === 'hadith' ? 'Proyektor: Hadits Aktif' : 'Alihkan Proyektor ke Hadits');
  };
  updateProjectorStatus(window.ProjectorScreen?.getState());
  window.addEventListener('projector-state', event => {
    updateProjectorStatus(event.detail);
    if (event.detail?.content === 'quran') {
      updateHeaderHadithTally(false);
      deactivateRenderedHadith();
    }
  });
  window.addEventListener('presentation-content-activated', event => {
    if (event.detail?.content === 'quran') {
      updateHeaderHadithTally(false);
      deactivateRenderedHadith();
    }
  });
  // Ukuran teks hadits di LAYAR (berbeda dari ukuran baca panel).
  let hadithFontScale = (() => {
    try {
      const saved = Number(localStorage.getItem('webquran.hadith.fontScale'));
      return Number.isFinite(saved) && saved >= 0.8 && saved <= 1.4 ? saved : 1;
    } catch { return 1; }
  })();

  const renderFontScale = () => {
    const value = $('scale-value');
    if (!value) return;
    value.textContent = Math.round(hadithFontScale * 100) + '%';
    $('scale-down').disabled = hadithFontScale <= 0.8;
    $('scale-up').disabled = hadithFontScale >= 1.4;
  };

  const applyFontScale = async (next, announce) => {
    hadithFontScale = Math.max(0.8, Math.min(1.4, Math.round(next * 20) / 20));
    renderFontScale();
    try { localStorage.setItem('webquran.hadith.fontScale', String(hadithFontScale)); } catch { /* abaikan */ }
    try {
      const response = await fetch('/api/hadith/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'scale', scale: hadithFontScale })
      });
      if (!response.ok) throw new Error('HTTP ' + response.status);
      if (announce) feedback('Ukuran tayang hadits: ' + Math.round(hadithFontScale * 100) + '%.');
    } catch (error) {
      if (announce) feedback('Ukuran tayang berlaku setelah hadits tampil di layar.');
    }
  };

  $('scale-down').onclick = () => applyFontScale(hadithFontScale - 0.05, true);
  $('scale-up').onclick = () => applyFontScale(hadithFontScale + 0.05, true);
  renderFontScale();

  let hadithScrollPaused = false;
  const renderScrollState = () => {
    const button = $('scroll-pause');
    if (!button) return;
    button.textContent = hadithScrollPaused ? '▶ Lanjutkan gulir' : '⏸ Jeda gulir';
    button.setAttribute('aria-pressed', String(hadithScrollPaused));
    $('scroll-state').textContent = hadithScrollPaused
      ? 'Gulir dijeda di posisi terakhir.'
      : 'Gulir otomatis bila teks meluap.';
  };
  $('scroll-pause').onclick = async () => {
    hadithScrollPaused = !hadithScrollPaused;
    renderScrollState();
    try {
      const response = await fetch('/api/hadith/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'scroll', paused: hadithScrollPaused })
      });
      if (!response.ok) throw new Error('HTTP ' + response.status);
    } catch (error) {
      feedback('Jeda gulir hanya berlaku saat hadits aktif di layar.');
      hadithScrollPaused = !hadithScrollPaused;
      renderScrollState();
    }
  };
  renderScrollState();

  // Panah atas/bawah selalu menavigasi hasil, dari fokus mana pun — kecuali
  // saat kursor sedang di kolom ketik/pilih.
  dialog.addEventListener('keydown', event => {
    if (!['ArrowDown', 'ArrowUp'].includes(event.key)) return;
    const tag = (event.target && event.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select' || event.target.isContentEditable) return;
    if (!items.length) return;
    event.preventDefault();
    moveSelection(event.key === 'ArrowDown' ? 1 : -1);
  });

  $('projector').onclick = () => {
    if (!window.ProjectorScreen) { feedback('Kontrol proyektor belum tersedia. Muat ulang aplikasi.'); return; }
    if (window.ProjectorScreen.open('hadith')) feedback('Layar proyektor aktif untuk Hadits.');
    else feedback('Proyektor belum terbuka. Izinkan popup untuk aplikasi ini pada browser.');
  };
  function updateHeaderHadithTally(isLive) {
    const btn = document.getElementById('headerBtnHadith');
    const dot = document.getElementById('hadithHeaderLiveDot');
    if (btn) {
      btn.classList.toggle('hadith-live-on-air', !!isLive);
      btn.title = isLive ? 'Hadits sedang ON AIR (Klik untuk buka kontrol F7)' : 'Pencarian Hadits (Tekan F7)';
    }
    if (dot) dot.hidden = !isLive;
  }
  let selectedTemplate = 'lower-third';

  // ── Peringatan kutipan terpotong ─────────────────────────────
  // Halaman presentasi mengukur teks yang benar-benar dirender, lalu mengirim
  // hasilnya ke server. Di sini hasil itu dicocokkan dengan kutipan yang aktif.
  const TEMPLATE_LABELS = { 'lower-third': 'Lower Third Gelap', 'lower-third-white': 'Lower Third Putih', 'lower-third-full': 'Lower Third Penuh', 'full-screen': 'Full Screen' };
  function renderFitBadge(state) {
    const badge = $('fit');
    if (!badge) return;
    const fit = state && state.fit;
    const currentMode = state && state.displayMode === 'translation' ? 'translation' : 'arabic';
    const relevant = !!(state && state.visible && fit && fit.fits !== null
      && fit.lastUpdate === state.lastUpdate
      && fit.template === state.template
      && fit.mode === currentMode);
    if (!relevant) { badge.hidden = true; badge.textContent = ''; return; }
    const label = TEMPLATE_LABELS[state.template] || 'template ini';
    const clipped = fit.fits === false;
    badge.hidden = false;
    badge.classList.toggle('hd-fit-warn', clipped);
    badge.classList.toggle('hd-fit-ok', !clipped);
    badge.textContent = clipped ? `⚠ Terpotong di ${label}` : `✓ Muat di ${label}`;
    badge.title = clipped
      ? 'Teks tidak muat pada ukuran terkecil dan terpotong di layar. Pilih Full Screen atau ringkas kutipannya.'
      : 'Seluruh teks muat di layar.';
  }

  // Layar hadits memperbarui sekitar 500 ms setelah perintah dikirim.
  async function refreshFitReport(attempts = 6) {
    for (let i = 0; i < attempts; i++) {
      try {
        const response = await fetch('/api/hadith', { cache: 'no-store' });
        if (response.ok) {
          const state = await response.json();
          renderFitBadge(state);
          if (state && state.fit && state.fit.lastUpdate === state.lastUpdate) return;
        }
      } catch { /* diamkan: laporan bersifat informatif */ }
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  async function syncPresentationSettings() {
    try {
      const response = await fetch('/api/hadith', { cache: 'no-store' });
      if (!response.ok) throw new Error('Pengaturan layar hadits belum tersedia.');
      const state = await response.json();
      selectedTemplate = ['lower-third', 'lower-third-white', 'lower-third-full', 'full-screen'].includes(state.template) ? state.template : 'lower-third';
      $('template').value = selectedTemplate;
      $('template').disabled = false;
      updateHeaderHadithTally(state.visible);
      renderFitBadge(state);
    } catch (error) { feedback(error.message); }
  }
  fetch('/api/hadith', { cache: 'no-store' })
    .then(r => r.ok ? r.json() : null)
    .then(s => { if (s) updateHeaderHadithTally(s.visible); })
    .catch(() => {});
  $('template').onchange = async () => {
    const next = $('template').value;
    $('template').disabled = true;
    try {
      const response = await fetch('/api/hadith/control', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'template', template: next }) });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || 'Template gagal diperbarui.');
      selectedTemplate = result.state.template;
      const templateLabels = { 'lower-third': 'Lower Third Gelap', 'lower-third-white': 'Lower Third Putih', 'lower-third-full': 'Lower Third Penuh', 'full-screen': 'Full Screen' };
      feedback('Template hadits: ' + templateLabels[selectedTemplate] + '.');
      refreshFitReport(2);
    } catch (error) { feedback('Gagal mengganti template: ' + error.message); }
    finally { $('template').value = selectedTemplate; $('template').disabled = false; }
  };
  let catalog, worker, group = 'kitab', request = 0, items = [], selected = null, selectedId = '', query = '', mode = 'translation', savedOnly = false, total = 0, opener, loadingCatalog;
  let saved;
  try { saved = new Set(JSON.parse(localStorage.getItem('webquran.hadith.saved.v1') || '[]')); } catch { saved = new Set(); }
  // Ukuran bacaan panel (bukan ukuran siaran) disimpan di perangkat.
  let fontSize = (() => {
    try {
      const saved = Number(localStorage.getItem('webquran.hadith.readerSize'));
      return Number.isFinite(saved) && saved >= 14 && saved <= 24 ? saved : 16;
    } catch { return 16; }
  })();
  const fmt = n => n.toLocaleString('id-ID');
  function displayTitle(item) {
    if (item.source_group !== 'brosur') return item.title;
    const title = item.title.replace(/^\d{8}\s*[-–:]?\s*/, '').replace(/^\((.*)\)$/, '$1');
    return title || 'Kutipan kajian Ahad Pagi';
  }
  function feedback(message) { $('feedback').textContent = message; }
  function sourceOf(id) { return catalog?.sources.find(s => s.id === id); }
  function welcome() {
    const topics = [
      { label: 'Niat', q: 'Niat', mode: 'translation' },
      { label: 'Puasa', q: 'Puasa', mode: 'translation' },
      { label: 'Sabar', q: 'Sabar', mode: 'translation' },
      { label: 'Sedekah', q: 'Sedekah', mode: 'translation' },
      { label: 'نية', q: 'نية', mode: 'text' },
      { label: 'Latin: niyyat', q: 'innamal amalu binniyat', mode: 'latin' }
    ];
    $('reader').innerHTML = `<div class="hd-welcome"><div class="hd-book-art">${book.replace('width="27" height="27"','width="56" height="56"')}</div><div class="hd-kicker" style="margin-bottom:12px">TEMUKAN • BACA • TELUSURI</div><h3>Mulai dari kata yang kamu ingat</h3><p>Telusuri kata Arab, terjemahan Indonesia, nomor hadits, atau transliterasi Latin.</p><div class="hd-topics">${topics.map(t => `<button class="hd-topic" data-topic="${esc(t.q)}" data-mode="${esc(t.mode || 'text')}">${esc(t.label)}</button>`).join('')}</div><div class="hd-welcome-hint">Coba kata Arab “نية”, terjemahan “menuntut ilmu”, atau nomor hadits “1”.</div></div>`;
    $('reader').querySelectorAll('[data-topic]').forEach(b => b.addEventListener('click', () => {
      applyModeValue(b.dataset.mode || 'text');
      $('query').value = b.dataset.topic;
      search();
    }));
  }
  function initialList() {
    const topics = [
      { label: 'Niat', q: 'Niat', mode: 'translation' },
      { label: 'Puasa', q: 'Puasa', mode: 'translation' },
      { label: 'Sabar', q: 'Sabar', mode: 'translation' },
      { label: 'نية', q: 'نية', mode: 'text' },
      { label: 'Latin: niyyat', q: 'innamal amalu binniyat', mode: 'latin' }
    ];
    $('results').innerHTML = `<div class="hd-empty-list"><strong>Satu pencarian, rujukan yang jelas.</strong>Gunakan teks Arab, terjemahan, atau pilih salah satu topik.<div class="hd-topics" style="margin-top:18px">${topics.map(t => `<button class="hd-topic" data-topic="${esc(t.q)}" data-mode="${esc(t.mode || 'text')}">${esc(t.label)}</button>`).join('')}</div></div>`;
    $('results').querySelectorAll('[data-topic]').forEach(b => b.onclick = () => {
      applyModeValue(b.dataset.mode || 'text');
      $('query').value = b.dataset.topic;
      search();
    });
  }
  function reset() {
    request++; worker?.postMessage({ type:'cancel', request });
    items = []; selected = null; selectedId = ''; total = 0;
    $('count').textContent = 'Jelajahi koleksi'; $('progress').textContent = '';
    $('body').classList.remove('hd-reading'); $('results').setAttribute('aria-busy','false');
    initialList(); welcome();
  }
  // Rujukan awal: satu kitab, bukan seluruh koleksi.
  // "Semua kitab" memuat ±171 MB JSON (sembilan berkas) sehingga pencarian pertama
  // bisa memakan puluhan detik. Operator tetap bisa memilihnya secara sadar.
  const DEFAULT_KITAB = 'kitab-shahih-bukhari';
  function sourceOptions() {
    const sources = catalog.sources.filter(s => s.group === group);
    $('source').innerHTML = (sources.length > 1 ? '<option value="">Semua kitab (9 sumber)</option>' : '') + sources.map(s => `<option value="${esc(s.id)}">${esc(s.label)}</option>`).join('');
    if (sources.length > 1) {
      const preferred = sources.find(s => s.id === DEFAULT_KITAB) || sources[0];
      $('source').value = preferred.id;
    }
    $('source-note').textContent = `${sources.length} rujukan · ${fmt(sources.reduce((n,s) => n+s.count,0))} entri hasil ekstraksi`;
  }
  async function init() {
    if (catalog) return true;
    if (loadingCatalog) return loadingCatalog;
    loadingCatalog = (async () => {
      try {
        const res = await fetch('data/hadith/catalog.json');
        if (!res.ok) throw new Error('Katalog hadits belum tersedia.');
        catalog = await res.json();
        worker = new Worker('js/hadith-worker.js');
        worker.onmessage = onMessage;
        worker.onerror = () => { $('results').setAttribute('aria-busy','false'); $('count').textContent = 'Pencarian terhenti'; $('progress').textContent = ''; feedback('Mesin pencarian gagal dimuat. Tutup lalu buka kembali pencarian.'); worker.terminate(); worker=null;catalog=null; };
        sourceOptions(); $('source').disabled = false; $('submit').disabled = false;
        return true;
      } catch (err) {
        catalog = null; $('source-note').textContent = 'Rujukan belum siap'; $('submit').disabled = false;
        feedback(err.message + ' Tekan Cari untuk mencoba lagi.'); return false;
      } finally { loadingCatalog = null; }
    })();
    return loadingCatalog;
  }
  // ── Riwayat pencarian (tersimpan di perangkat) ────────────────────────
  const HISTORY_KEY = 'webquran.hadith.history.v1';
  const HISTORY_MAX = 12;
  let history = (() => {
    try {
      const raw = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
      return Array.isArray(raw) ? raw.filter((item) => item && typeof item.q === 'string').slice(0, HISTORY_MAX) : [];
    } catch { return []; }
  })();

  const saveHistory = () => {
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(history)); } catch { /* abaikan */ }
  };

  const rememberHistory = (value, mode) => {
    history = E.historyAdd(history, { q: value, mode }, HISTORY_MAX);
    saveHistory();
    renderHistory();
   if (typeof updateModeHint === 'function') updateModeHint();
  };

  function renderHistory() {
    const box = $('history');
    if (!box) return;
    const typed = $('query').value.trim();
    const visible = !typed && history.length > 0;
    box.hidden = !visible;
    if (!visible) { box.innerHTML = ''; return; }
    const chips = history.map((entry, index) => {
      const label = entry.mode === 'latin' ? 'Latin' : entry.mode === 'translation' ? 'Terjemahan' : '';
      return `<button type="button" class="hd-history-chip" data-index="${index}">${esc(entry.q)}`
        + (label ? `<small>${label}</small>` : '') + '</button>';
    }).join('');
    box.innerHTML = '<div class="hd-history-head"><span>Terakhir dicari</span>'
      + '<button type="button" class="hd-history-clear" id="hd-history-clear">Hapus</button></div>'
      + `<div class="hd-history-chips">${chips}</div>`;
    box.querySelectorAll('.hd-history-chip').forEach((chip) => {
      chip.onclick = () => {
        const entry = history[Number(chip.dataset.index)];
        if (!entry) return;
        if (entry.mode && $('mode').querySelector(`option[value="${entry.mode}"]`)) $('mode').value = entry.mode;
        $('query').value = entry.q;
        $('clear').hidden = false;
        $('mode').onchange();
      };
    });
    const clear = $('history-clear');
    if (clear) {
      clear.onclick = () => {
        history = [];
        saveHistory();
        renderHistory();
        feedback('Riwayat pencarian dihapus.');
      };
    }
  }

  async function search() {
    if (!await init()) return;
    if (!dialog.open) return;
    mode = $('mode').value; query = $('query').value.trim(); $('clear').hidden = !query;
    reset();
    if (!E.parse(query, mode).valid && !savedOnly) {
      if (query) feedback(mode === 'latin' ? 'Gunakan frasa Latin lebih panjang, misalnya innamal amalu binniyat.' : 'Masukkan minimal 3 huruf Latin, 2 huruf Arab, atau sebuah nomor hadits.');
      else feedback('Tuliskan kata kunci untuk mulai mencari.');
      return;
    }
    if (query) rememberHistory(query, mode);
    $('count').textContent = 'Mencari…'; $('results').setAttribute('aria-busy','true');
    $('results').innerHTML = '<div class="hd-empty-list"><div class="hd-spinner"></div><strong>Menelusuri rujukan</strong>Pemuatan pertama dapat membutuhkan beberapa saat.</div>';
    feedback(mode === 'latin'
      ? 'Kecocokan Latin bersifat perkiraan. Cocokkan kembali dengan teks Arab sumber.'
      : mode === 'translation'
        ? 'Mencari hanya dalam terjemahan bahasa Indonesia, bukan teks Arab.'
        : group === 'kitab' ? 'Mencari hanya dalam rujukan kitab yang dipilih.' : 'Mencari kutipan hadits dalam brosur kajian.');
    // Daftar "Tersimpan" selalu menelusuri seluruh kelompok: operator biasanya
    // tidak ingat kitab asal hadits yang pernah ia simpan.
    const scope = savedOnly ? '' : $('source').value;
    worker.postMessage({type:'search',request,query,mode,group,source:scope,sources:catalog.sources,searchExtra:catalog.search_extra,sort:$('sort').value,savedOnly,savedIds:[...saved]});
  }
  function onMessage({data}) {
    if (data.request !== request || !dialog.open) return;
    if (data.type === 'progress') { $('progress').textContent = `${data.done + 1}/${data.total} · ${data.label}`; return; }
    if (data.type === 'error') {
      $('count').textContent = 'Belum berhasil'; $('progress').textContent = ''; $('results').setAttribute('aria-busy','false');
      $('results').innerHTML = `<div class="hd-empty-list"><strong>Rujukan belum bisa dibaca</strong>${esc(data.message)}<button class="hd-more" id="hd-retry">Coba lagi</button></div>`;
      $('retry').onclick = search; return;
    }
    if (data.type === 'detail') { if (data.item.id === selectedId) { selected = data.item; renderDetail(); } return; }
    if (data.type !== 'results') return;
    $('results').setAttribute('aria-busy','false'); total = data.total;
    // Dedup: satu hadits bisa muncul dari beberapa edisi. Tampilkan jumlah yang
    // disaring agar operator tahu hasilnya sudah bersih, bukan berkurang misterius.
    const removed = Number(data.removed) || 0;
    const fuzzy = !!data.fuzzy;
    $('count').textContent = `${fmt(total)} hasil${savedOnly ? ' tersimpan' : ''}`
      + (data.corrected ? ' untuk kueri yang dikoreksi' : (fuzzy ? ' mirip (tidak ada hasil persis)' : ''))
      + (removed > 0 ? ` · ${fmt(removed)} duplikat disaring` : '');
    $('progress').textContent = '';
    // Salah ketik: tampilkan saran yang bisa langsung diklik.
    if (fuzzy && data.suggestion) {
      $('progress').innerHTML = 'Mungkin maksud Anda: '
        + `<button type="button" class="hd-suggest" id="hd-suggest">${esc(data.suggestion)}</button>`;
      const suggest = $('hd-suggest');
      if (suggest) suggest.onclick = () => { $('query').value = data.suggestion; search(); };
    }
    if (!data.offset) { items = []; $('results').innerHTML = ''; }
    $('results').querySelector('.hd-more')?.remove();
    items.push(...data.items);
    for (const item of data.items) {
      const button = document.createElement('button');
      button.className = 'hd-result'; button.dataset.id = item.id;
      button.setAttribute('aria-current', String(item.id === selectedId));
      const snippetDir = item.is_arabic_snippet ? 'dir="rtl" lang="ar"' : '';
      const snippetClass = item.is_arabic_snippet ? 'hd-result-snippet hd-result-snippet-ar' : 'hd-result-snippet';
      button.innerHTML = `<div class="hd-result-meta"><span>${esc(item.collection)}</span><span>${item.number ? 'No. '+esc(item.number) : 'Kutipan'}</span></div><div class="hd-result-title">${E.highlight(displayTitle(item),query,mode)}</div><div class="${snippetClass}" ${snippetDir}>${E.highlight(item.snippet,query,mode)}</div>`;
      const origin = sourceOf(item.source_id)?.label;
      if (origin && origin !== item.collection) button.innerHTML += `<div class="hd-result-origin">${esc(origin)}</div>`;
      button.onclick = () => select(item);
      // Panah ditangani satu kali di level dialog (lihat bawah) supaya tidak
      // dobel: fokus tetap di kartu, hasil berpindah satu langkah.
      $('results').appendChild(button);
    }
    if (!total) $('results').innerHTML = `<div class="hd-empty-list"><strong>${savedOnly ? 'Belum ada hadits tersimpan' : 'Belum menemukan hasil'}</strong>${savedOnly ? 'Simpan hadits dari panel baca, lalu lihat kembali di sini.' : 'Coba kata yang lebih singkat, ejaan lain, atau rujukan berbeda. Nomor mengikuti edisi masing-masing kitab.'}</div>`;
    if (items.length < total) {
      const more = document.createElement('button'); more.className='hd-more'; more.textContent = `Tampilkan 40 berikutnya · ${fmt(items.length)} dari ${fmt(total)}`;
      more.onclick = () => { more.disabled=true; worker.postMessage({type:'page',request,offset:items.length}); }; $('results').appendChild(more);
    }
    if (!data.offset && items.length && matchMedia('(min-width:761px)').matches) select(items[0],false);
    feedback(total ? 'Nomor mengikuti edisi sumber. Buka halaman sumber untuk membaca konteks.' : 'Kitab dan brosur ditelusuri secara terpisah.');
  }
  // Navigasi antarhasil yang dipakai daftar, panel baca, dan tombol panah.
  // Fokus tetap di kartu hasil supaya panah berikutnya tidak "jatuh" ke panel
  // teks (yang membuat panah menggulir bacaan, bukan hasil).
  function moveSelection(delta) {
    if (!items.length) return;
    const current = items.findIndex((entry) => entry.id === selectedId);
    const from = current < 0 ? 0 : current;
    const next = Math.min(items.length - 1, Math.max(0, from + delta));
    if (next === current) return;
    const target = items[next];
    if (!target) return;
    select(target, false);
    const card = [...$('results').querySelectorAll('.hd-result')]
      .find((button) => button.dataset.id === target.id);
    if (card) {
      try { card.focus({ preventScroll: true }); } catch { card.focus(); }
      card.scrollIntoView({ block: 'nearest' });
    }
  }

  function select(item, focus = true) {
    selectedId = item.id;
    $('results').querySelectorAll('.hd-result').forEach(b => b.setAttribute('aria-current',String(b.dataset.id===selectedId)));
    $('body').classList.add('hd-reading');
    $('reader').innerHTML = '<div class="hd-empty-list"><div class="hd-spinner"></div>Membuka bacaan…</div>';
    worker.postMessage({type:'detail',request,source:item.source_id,id:item.id});
    if (focus) { $('reader').setAttribute('tabindex','-1'); $('reader').focus(); }
  }
  function safeUrl(value, prefix) {
    const url = new URL(value, location.href);
    const base = new URL(prefix, location.href);
    return url.origin === base.origin && url.pathname.startsWith(base.pathname) ? url.href : '';
  }
  function renderDetail() {
    const item = selected, source = sourceOf(item.source_id);
    // `reading_url` tidak lagi dibawa berkas paket (folder halaman sumber tidak
    // ikut dikemas), jadi tautan hanya muncul bila datanya memang tersedia.
    const reading = item.reading_url ? safeUrl(item.reading_url,'data/hadith/reading/') : '';
    const isLongText = (item.arabic && item.arabic.length > 300) || (item.translation && item.translation.length > 400);
    $('reader').innerHTML = `<article class="hd-detail">
      <div class="hd-detail-actions">
        <div class="hd-detail-head">
          <button class="hd-action hd-back" id="hd-back">← Hasil</button>
          <span class="hd-badge">${group==='kitab' ? 'RUJUKAN KITAB' : 'KUTIPAN BROSUR'}</span>
          <span class="hd-tools-caption hd-position" id="hd-position"></span>
        </div>
        <div class="hd-detail-air" role="group" aria-label="Kontrol siaran hadits">
          <button class="hd-air-primary" id="hd-air" type="button">Tampilkan ke Layar</button>
          <button class="hd-air-secondary" id="hd-show-translation" type="button" aria-pressed="false" disabled>Terjemahan</button>
        </div>
        <div class="hd-detail-tools">
          <div class="hd-nav-tools">
            <button class="hd-action" id="hd-prev" title="Hasil sebelumnya" aria-label="Hasil sebelumnya">← Sebelumnya</button>
            <button class="hd-action" id="hd-next" title="Hasil berikutnya" aria-label="Hasil berikutnya">Berikutnya →</button>
          </div>
          <div class="hd-reading-tools">
            <span class="hd-tools-caption" title="Hanya memperbesar bacaan di panel ini — teks yang tayang di layar tidak berubah.">Ukuran baca</span>
            <button class="hd-action" id="hd-font-down" aria-label="Perkecil ukuran bacaan" title="Perkecil bacaan di panel ini">A−</button>
            <button class="hd-action" id="hd-font-up" aria-label="Perbesar ukuran bacaan" title="Perbesar bacaan di panel ini">A+</button>
            <button class="hd-action" id="hd-save" aria-pressed="${saved.has(item.id)}">${saved.has(item.id) ? '★ Tersimpan' : '☆ Simpan'}</button>
            <button class="hd-action" id="hd-copy">Salin</button>
          </div>
        </div>
      </div>
      ${isLongText ? '<div class="hd-long-warning">⚠️ <strong>Teks Panjang:</strong> Untuk keterbacaan optimal di proyektor, pilih <strong>Full Screen (Proyektor)</strong> pada <em>Target layar</em> di panel kiri.</div>' : ''}
      <h3>${esc(displayTitle(item))}</h3><div class="hd-reference">${esc(item.collection)}${item.number ? ' <span aria-hidden="true">/</span> <strong>No. '+esc(item.number)+'</strong>' : ''}</div>
      ${item.arabic ? `<div class="hd-arabic" lang="ar" dir="rtl">${E.highlight(item.arabic,query,mode)}</div>` : ''}
      ${(item.arabic_images || []).length ? `<div class="hd-arabic-images">${(item.arabic_images || []).map(src => `<img src="${esc(safeUrl(src,'data/hadith/assets/'))}" alt="Teks Arab dalam gambar dari ${esc(source.label)}" loading="lazy">`).join('')}</div><p class="hd-reference">Teks Arab dipertahankan sebagai gambar dari sumber.</p>` : ''}
      <div class="hd-section-label">TERJEMAHAN</div><div class="hd-translation">${E.highlight(item.translation,query,mode)}</div>
      ${item.notes ? `<details class="hd-notes"><summary>Catatan yang tercantum dalam sumber</summary>${esc(item.notes)}</details>` : ''}
      <div class="hd-source-card"><div class="hd-section-label">JEJAK RUJUKAN</div><dl><dt>Koleksi</dt><dd>${esc(source.label)}</dd><dt>Riwayat</dt><dd>${esc(item.reference || 'Lihat keterangan pada halaman sumber.')}</dd><dt>Nomor</dt><dd>${esc(item.number || 'Tidak tercantum pada kutipan ini')}</dd><dt>Halaman asal</dt><dd>${esc(item.source_path)}</dd></dl>${reading ? `<a href="${esc(reading)}" target="_blank" rel="noopener noreferrer">Buka halaman sumber ↗</a>` : ''}<small>Hasil ekstraksi dari ${esc(source.source_file.split('/').pop())}. ${group==='brosur' ? 'Kutipan berasal dari brosur kajian; periksa konteks dan rujukan yang dicantumkan.' : 'Penomoran mengikuti edisi ini dan dapat berbeda dari edisi lain.'} Derajat hadits tidak ditetapkan otomatis.${source.excluded_pages?.length ? ' Ada '+source.excluded_pages.length+' halaman arsip rusak yang tidak diindeks.' : ''}</small></div></article>`;
    $('reader').scrollTop = 0;
    $('back').onclick = () => { $('body').classList.remove('hd-reading'); [...$('results').querySelectorAll('.hd-result')].find(b => b.dataset.id===selectedId)?.focus(); };
    // Navigasi antarhasil tanpa harus kembali ke daftar.
    const index = () => items.findIndex(entry => entry.id === selectedId);
    $('prev').disabled = index() <= 0;
    $('next').disabled = index() < 0 || index() >= items.length - 1;
    $('prev').onclick = () => moveSelection(-1);
    $('next').onclick = () => moveSelection(1);
    $('position').textContent = index() >= 0 ? `Hasil ${index() + 1} dari ${items.length}` : '';
    const resize = (delta, silent) => {
      fontSize = Math.max(14, Math.min(24, fontSize + delta));
      dialog.style.setProperty('--hd-text-size', fontSize + 'px');
      dialog.style.setProperty('--hd-arabic-size', (fontSize + 14) + 'px');
      $('font-down').disabled = fontSize === 14;
      $('font-up').disabled = fontSize === 24;
      if (!silent) {
        try { localStorage.setItem('webquran.hadith.readerSize', String(fontSize)); } catch { /* abaikan */ }
      }
    };
    $('font-down').onclick = () => resize(-1); $('font-up').onclick = () => resize(1); resize(0, true);
    $('save').onclick = () => {
      const next = new Set(saved); if (next.has(item.id)) next.delete(item.id); else next.add(item.id);
      try { localStorage.setItem('webquran.hadith.saved.v1',JSON.stringify([...next])); saved=next; }
      catch { feedback('Penyimpanan penuh atau tidak tersedia. Hadits belum tersimpan.'); return; }
      $('save').setAttribute('aria-pressed',String(saved.has(item.id))); $('save').textContent=saved.has(item.id)?'★ Tersimpan':'☆ Simpan';
      feedback(saved.has(item.id)?'Hadits disimpan di perangkat ini.':'Hadits dihapus dari daftar tersimpan.');
      if (savedOnly && !saved.has(item.id)) search();
    };
    const cleanPresentation = E.presentationText(item);
    const presentationPayload = visible => ({
      visible,
      ...cleanPresentation,
      arabicImages: item.arabic_images || [],
    });
    async function sendSelectedHadith(visible) {
      const response = await fetch('/api/hadith', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(presentationPayload(visible)) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.success) throw new Error(data.error || `Server merespons HTTP ${response.status}`);
      return data.state;
    }

    async function control(action, extra = {}) {
      try {
        const response = await fetch('/api/hadith/control', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({action, ...extra}) });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || !data.success) throw new Error(data.error || 'Kontrol ditolak server.');
        feedback(action === 'visibility' ? (extra.visible ? 'Hadits ditampilkan.' : 'Hadits disembunyikan.') : 'Mode ' + (action === 'arabic' ? 'Arab' : 'terjemah') + ' aktif.');
        return true;
      } catch (error) { feedback('Kontrol layar gagal: ' + error.message); return false; }
    }
    const setAirLabel = visible => {
      $('air').textContent = visible ? 'Turunkan dari Layar' : 'Tampilkan ke Layar';
      $('air').setAttribute('aria-pressed', String(visible));
      $('air').classList.toggle('hd-active', visible);
      $('air').classList.toggle('hd-live-tally', visible);
      $('show-translation').disabled = !visible;
      updateHeaderHadithTally(visible);
    };
    const setTranslationState = enabled => {
      $('show-translation').setAttribute('aria-pressed', String(enabled));
      $('show-translation').classList.toggle('hd-active', enabled);
      $('show-translation').textContent = enabled ? 'Terjemahan Aktif' : 'Terjemahan';
    };
    let onAir = false;
    let stateRevision = 0;
    $('air').onclick = async () => {
      stateRevision++;
      const button = $('air');
      button.disabled = true;
      if (onAir) {
        if (await control('visibility', { visible: false })) {
          onAir = false; translationOn = false; setTranslationState(false); setAirLabel(false);
          refreshFitReport(1);
        }
        button.disabled = false;
        return;
      }
      button.textContent = 'Menayangkan…';
      try {
        // Direct Go-Live: Kirim data & tayangkan langsung ke URL/vMix
        const state = await sendSelectedHadith(true);
        onAir = true;
        translationOn = state.displayMode === 'translation';
        setTranslationState(translationOn); setAirLabel(true);

        // Jika proyektor sedang terbuka, otomatis alihkan ke hadits agar operator tidak perlu klik terpisah
        if (window.ProjectorScreen && window.ProjectorScreen.getState()?.open) {
          window.ProjectorScreen.open('hadith');
        }

        window.dispatchEvent(new CustomEvent('presentation-content-activated', { detail: { content: 'hadith' } }));
        feedback('Hadits sedang ON AIR di layar.');
        refreshFitReport(); // layar butuh ±0,5 detik untuk mengukur teks
      } catch (error) {
        feedback('Gagal menayangkan hadits: ' + error.message);
        setAirLabel(false);
      } finally { button.disabled = false; }
    };
    let translationOn = false;
    setAirLabel(false);
    deactivateRenderedHadith = () => {
      if (!buttonIsCurrent()) return;
      stateRevision++;
      onAir = false; translationOn = false;
      setAirLabel(false); setTranslationState(false);
    };
    function buttonIsCurrent() { return !!$('air') && selected?.id === item.id; }
    const syncRevision = stateRevision;
    fetch('/api/hadith', { cache: 'no-store' }).then(response => response.ok ? response.json() : null).then(state => {
      if (!state || stateRevision !== syncRevision || !selected || selected.id !== item.id) return;
      const sameSelection = state.arabic === cleanPresentation.arabic && state.translation === cleanPresentation.translation && state.riwayat === cleanPresentation.riwayat && JSON.stringify(state.arabicImages || []) === JSON.stringify(item.arabic_images || []);
      onAir = !!state.visible && sameSelection;
      translationOn = onAir && state.displayMode === 'translation';
      setAirLabel(onAir); setTranslationState(translationOn);
    }).catch(() => {});
    $('show-translation').onclick = async () => { stateRevision++; const next = !translationOn; if (await control(next ? 'translation' : 'arabic')) { translationOn = next; setTranslationState(translationOn); refreshFitReport(); } };
    $('copy').onclick = async () => {
      const text = E.copyText(item);
      try {
        await navigator.clipboard.writeText(text);
        const originalText = $('copy').textContent;
        $('copy').textContent = '✓ Tersalin!';
        $('copy').classList.add('hd-copied');
        setTimeout(() => {
          if ($('copy')) {
            $('copy').textContent = originalText;
            $('copy').classList.remove('hd-copied');
          }
        }, 1500);
        feedback((item.arabic_images || []).length?'Terjemahan dan rujukan disalin. Teks Arab berupa gambar.':'Teks Arab, terjemahan, dan rujukan disalin.');
      } catch { feedback('Tidak dapat mengakses papan klip. Pilih teks lalu salin secara manual.'); }
    };
  }
  window.openHadithSearch = async () => {
    if (dialog.open) { $('query').focus(); return; }
    opener = document.activeElement; dialog.showModal(); $('query').focus();
   renderHistory();
    await Promise.all([init(), syncPresentationSettings()]);
    if ($('query').value.trim() || savedOnly) search();
  };
  $('close').onclick = () => dialog.close();
  dialog.addEventListener('close',() => { reset(); opener?.focus(); });
  dialog.addEventListener('keydown',event => event.stopPropagation());
  document.addEventListener('keydown',event => { if(event.key==='F7' && !event.repeat) {event.preventDefault();window.openHadithSearch();} });
  $('form').onsubmit = event => { event.preventDefault(); search(); };
  $('query').oninput = () => { $('clear').hidden = !$('query').value; renderHistory(); };
  $('query').onkeydown = event => { if(event.key==='ArrowDown') {event.preventDefault();$('results').querySelector('.hd-result')?.focus();} };
  $('clear').onclick = () => { $('query').value='';$('clear').hidden=true;reset();renderHistory();$('query').focus(); };
  const MODE_HINTS = {
    text: 'Mencari teks Arab, terjemahan Indonesia, nomor, dan rujukan sekaligus.',
    translation: 'Hanya terjemahan Indonesia — cocok bila hanya tahu artinya.',
    latin: 'Ketik penggalan Arab dengan huruf Latin, mis. “innamal amalu binniyat”.',
  };
  const updateModeHint = () => {
    const hint = $('mode-hint');
    if (hint) hint.textContent = MODE_HINTS[$('mode').value] || MODE_HINTS.text;
  };
  const applyModeValue = (value) => {
    $('mode').value = value;
    $('query').placeholder = value === 'latin'
      ? 'Contoh: innamal amalu binniyat'
      : value === 'translation'
        ? 'Kata kunci terjemahan, mis. sabar, puasa, sedekah…'
        : 'Kata Arab, terjemahan, atau nomor…';
    updateModeHint();
  };
  $('mode').onchange = () => {
    applyModeValue($('mode').value);
    search();
  };
  $('source').onchange = search; $('sort').onchange = search;
  $('saved').onclick = () => { savedOnly=!savedOnly;$('saved').setAttribute('aria-pressed',String(savedOnly));search(); };
  dialog.querySelectorAll('[data-group]').forEach(b => b.onclick = () => {
    if (b.dataset.group===group) return;
    group=b.dataset.group; dialog.querySelectorAll('[data-group]').forEach(t => t.setAttribute('aria-pressed',String(t.dataset.group===group)));
    if(catalog) sourceOptions(); reset();
    if($('query').value.trim() || savedOnly) search(); else $('query').focus();
  });
  initialList(); welcome();
})();
