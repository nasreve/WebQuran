/* Renderer layar hadits + polling server lokal.
   Pratinjau memakai halaman ini sendiri: ?preview=arabic|translation|long|image
   (lihat data/hadith/presentation-samples.json). */
(() => {
  'use strict';
  const preview = new URLSearchParams(location.search).get('preview');
  const previewMode = ['arabic', 'translation', 'long', 'image'].includes(preview) ? preview : null;
  const requestedPreviewTemplate = new URLSearchParams(location.search).get('template');
  const previewTemplate = ['lower-third', 'lower-third-white', 'lower-third-full', 'full-screen'].includes(requestedPreviewTemplate) ? requestedPreviewTemplate : 'lower-third';

  const card = document.getElementById('hadith-card');
  const content = document.getElementById('hadith-content');
  const arabic = document.getElementById('hadith-arabic');
  const translation = document.getElementById('hadith-translation');
  const images = document.getElementById('hadith-images');
  const reference = document.getElementById('hadith-reference');
  let activeState = null;
  let transitionTimer = null;
  let transitionSequence = 0;
  const reduceMotion = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

  function fit() {
    const scale = Math.min(innerWidth / 1920, innerHeight / 1080);
    document.documentElement.style.setProperty('--hp-scale', scale);
    if (card.hidden) return;
    const text = activeState.displayMode === 'translation' ? translation : arabic;
    const fullscreen = activeState.template === 'full-screen';
    // Ukuran tayang dari operator (80–140%) memperbesar/memperkecil teks hadits.
    const fontScale = Number(activeState.fontScale) >= 0.8 && Number(activeState.fontScale) <= 1.4
      ? Number(activeState.fontScale) : 1;
    const base = fontScale * (activeState.displayMode === 'translation' ? (fullscreen ? 54 : 32) : (fullscreen ? 76 : 48));
    const minimum = fontScale * (activeState.displayMode === 'translation' ? (fullscreen ? 28 : 18) : (fullscreen ? 38 : 26));
    const heightLimit = innerHeight * (fullscreen ? .82 : .40);
    text.style.fontSize = base * scale + 'px';
    // The panel grows with its content first; shrink only at its height limit.
    // Always restart at the normal reading size, including after a long cue.
    const exceedsLowerThird = () => {
      if (fullscreen) return card.offsetHeight > heightLimit;
      const style = getComputedStyle(content);
      const available = content.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
      const rendered = activeState.displayMode === 'arabic' && !activeState.arabic ? images : text;
      return rendered.scrollHeight > available + 1 || rendered.scrollWidth > content.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight) + 1;
    };
    if (exceedsLowerThird()) {
      // Find the largest whole-pixel size that fits, with fewer layout reads.
      let low = minimum, high = base - 1, best = minimum;
      while (low <= high) {
        const size = Math.floor((low + high) / 2);
        text.style.fontSize = size * scale + 'px';
        if (exceedsLowerThird()) high = size - 1;
        else { best = size; low = size + 1; }
      }
      text.style.fontSize = best * scale + 'px';
    }
    const fits = !exceedsLowerThird();
    // At the minimum size, overflow remains scrollable without blanking the cue.
    card.dataset.overflow = String(!fits);
    // Muat: tidak perlu gulir. Meluap pada ukuran minimum: gulir otomatis,
    // karena di OBS/vMix tidak ada yang bisa menggulir manual.
    if (fits) stopAutoScroll();
    else startAutoScroll();
    return fits;
  }

  function visualKey(state) {
    if (!state || !state.visible) return 'hidden';
    const mode = state.displayMode === 'translation' ? 'translation' : 'arabic';
    return JSON.stringify([
      ['lower-third-white', 'lower-third-full', 'full-screen'].includes(state.template) ? state.template : 'lower-third',
      mode,
      mode === 'translation' ? state.translation || '' : state.arabic || '',
      mode === 'arabic' ? state.arabicImages || [] : [],
      state.showRiwayat !== false ? state.riwayat || '' : ''
    ]);
  }

  // Laporkan hasil ukur ke server supaya panel operator bisa memperingatkan
  // kutipan yang terpotong. Hanya halaman inilah yang tahu ukuran sebenarnya.
  let lastFitKey = '';
  function reportFit(state, hasContent, fits) {
    if (previewMode || !state || !hasContent) return;
    const payload = {
      fits: !!fits,
      template: ['lower-third-white', 'lower-third-full', 'full-screen'].includes(state.template) ? state.template : 'lower-third',
      mode: state.displayMode === 'translation' ? 'translation' : 'arabic',
      lastUpdate: state.lastUpdate || null,
    };
    const key = JSON.stringify(payload);
    if (key === lastFitKey) return;
    lastFitKey = key;
    fetch('../api/hadith/fit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch(() => { /* laporan bersifat informatif, kegagalan tidak boleh mengganggu siaran */ });
  }

  /* ── Gulir otomatis kutipan panjang (H4) ─────────────────────────
     Hanya aktif bila teks masih meluap pada ukuran minimum. Bisa dijeda
     operator lewat /api/hadith/control {action:'scroll'}; posisi berhenti
     di tempat, lalu lanjut dari titik yang sama. */
  const SCROLL_SPEED = 10;          // px per detik
  const SCROLL_DELAY_MS = 4000;
  const SCROLL_RESUME_MS = 1500;
  let scrollPaused = false;
  let scrollTimer = null;
  let scrollFrame = null;

  function stopAutoScroll() {
    if (scrollTimer) { clearTimeout(scrollTimer); scrollTimer = null; }
    stopScrollLoop();
    if (content) content.classList.remove('is-scrolling');
  }

  // Memakai interval, bukan requestAnimationFrame: rAF bisa berhenti total di
  // sebagian browser source OBS/vMix dan saat jendela tidak menggambar.
  function stopScrollLoop() {
    if (scrollFrame) { clearInterval(scrollFrame); scrollFrame = null; }
  }

  function runAutoScroll() {
    stopScrollLoop();
    if (scrollPaused || !content) return;
    let last = Date.now();
    scrollFrame = setInterval(() => {
      if (scrollPaused || !content) { stopScrollLoop(); return; }
      const max = content.scrollHeight - content.clientHeight;
      if (max <= 1 || content.scrollTop >= max - 0.5) { stopScrollLoop(); return; }
      const now = Date.now();
      const delta = Math.min(1000, now - last) / 1000;
      last = now;
      content.scrollTop = Math.min(max, content.scrollTop + SCROLL_SPEED * delta);
    }, 100);
  }

  function startAutoScroll() {
    if (!content) return;
    const max = content.scrollHeight - content.clientHeight;
    if (max <= 1) { stopAutoScroll(); return; }
    content.classList.add('is-scrolling');
    if (scrollPaused) return;
    if (scrollTimer) clearTimeout(scrollTimer);
    scrollTimer = setTimeout(runAutoScroll, SCROLL_DELAY_MS);
  }

  function setScrollPaused(paused) {
    paused = !!paused;
    if (scrollPaused === paused) return;
    scrollPaused = paused;
    if (paused) {
      if (scrollTimer) { clearTimeout(scrollTimer); scrollTimer = null; }
      stopScrollLoop();
    } else if (content && content.classList.contains('is-scrolling')) {
      if (scrollTimer) clearTimeout(scrollTimer);
      scrollTimer = setTimeout(runAutoScroll, SCROLL_RESUME_MS);
    }
  }

  function commitRender(state) {
    activeState = state;
    // Kutipan baru selalu mulai dari atas.
    stopAutoScroll();
    if (content) content.scrollTop = 0;
    document.body.classList.toggle('hp-fullscreen', state?.template === 'full-screen');
    document.body.classList.toggle('hp-lower-third-white', state?.template === 'lower-third-white');
    document.body.classList.toggle('hp-lower-third-full', state?.template === 'lower-third-full');
    if (!previewMode) document.title = state?.template === 'full-screen' ? 'Hadits — Full Screen' : 'Hadits — Lower Third';
    arabic.hidden = translation.hidden = images.hidden = reference.hidden = true;
    arabic.textContent = translation.textContent = reference.textContent = '';
    images.replaceChildren();
    if (!state || !state.visible) {
      card.hidden = true;
      return { visible: false, fits: true };
    }
    const mode = state.displayMode === 'translation' ? 'translation' : 'arabic';
    activeState = { ...state, displayMode: mode };
    if (mode === 'translation') {
      translation.textContent = String(state.translation || '');
      translation.hidden = false;
    } else if (state.arabic) {
      arabic.textContent = String(state.arabic);
      arabic.hidden = false;
    } else {
      for (const src of state.arabicImages || []) {
        if (typeof src !== 'string' || !/^data\/hadith\/assets\/[\w-]+\/[\w.-]+\.(gif|png|jpe?g)$/i.test(src) || src.includes('..')) continue;
        const img = document.createElement('img');
        img.src = new URL('../' + src, location.href).href;
        img.alt = 'نص الحديث';
        img.onload = fit;
        images.appendChild(img);
      }
      images.hidden = !images.childElementCount;
    }
    if (state.showRiwayat !== false && state.riwayat) {
      reference.textContent = String(state.riwayat);
      reference.hidden = false;
    }
    const hasContent = mode === 'translation' ? !!translation.textContent : !!arabic.textContent || !!images.childElementCount;
    card.hidden = !hasContent;
    const fits = fit() !== false;
    reportFit(state, hasContent, fits);
    return { visible: hasContent && fits, fits };
  }

  function render(state) {
    if (state) state = { ...state, ...window.HadithSearchEngine.presentationText(state) };
    const sequence = ++transitionSequence;
    clearTimeout(transitionTimer);
    transitionTimer = null;
    card.classList.remove('hp-changing', 'hp-leaving');

    const nextVisible = !!(state && state.visible);
    const currentlyVisible = !card.hidden;
    const contentChanged = visualKey(state) !== visualKey(activeState);

    // Non-visual state updates should not restart or blink the broadcast graphic.
    if (currentlyVisible && nextVisible && !contentChanged) {
      activeState = state;
      const fits = fit() !== false;
      return { visible: fits, fits };
    }

    if (!reduceMotion && currentlyVisible && !nextVisible) {
      card.classList.add('hp-leaving');
      // Semua lower third punya gerakan keluar ±0,45 dtk (CSS hpFullOut / hpLtOut);
      // Full Screen tetap memakai pudar singkat.
      const exitMs = document.body.classList.contains('hp-fullscreen') ? 180 : 460;
      transitionTimer = setTimeout(() => {
        if (sequence !== transitionSequence) return;
        commitRender(state);
        card.classList.remove('hp-leaving');
      }, exitMs);
      return { visible: false, fits: true, transitioning: true };
    }

    if (!reduceMotion && currentlyVisible && nextVisible && contentChanged) {
      // Fade only the content; the backing plate remains stable on air.
      card.classList.add('hp-changing');
      transitionTimer = setTimeout(() => {
        if (sequence !== transitionSequence) return;
        commitRender(state);
        requestAnimationFrame(() => requestAnimationFrame(() => {
          if (sequence === transitionSequence) card.classList.remove('hp-changing');
        }));
      }, 165);
      return { visible: true, fits: true, transitioning: true };
    }

    return commitRender(state);
  }
  addEventListener('resize', fit);
  document.fonts?.ready.then(fit);
  document.fonts?.addEventListener('loadingdone', fit);
  fit();

  if (previewMode) {
    document.body.classList.add('hp-preview');
    document.title = 'Pratinjau Hadits — ' + previewMode;
    fetch('../data/hadith/presentation-samples.json')
      .then(response => { if (!response.ok) throw new Error('Contoh lokal tidak tersedia'); return response.json(); })
      .then(samples => render({
        ...samples[previewMode === 'long' ? 'long' : previewMode === 'image' ? 'image' : 'default'],
        visible: true,
        template: previewTemplate,
        showRiwayat: true,
        displayMode: previewMode === 'translation' ? 'translation' : 'arabic',
      }))
      .catch(error => console.error('Pratinjau hadits:', error.message));
  } else {
    let lastUpdate = null;
    let polling = false;
    async function poll() {
      if (polling) return;
      polling = true;
      try {
        const response = await fetch('../api/hadith', { cache: 'no-store' });
        if (!response.ok) throw new Error('Server hadits merespons HTTP ' + response.status);
        const state = await response.json();
        if (!state || typeof state !== 'object') throw new Error('Respons server hadits tidak valid.');
        setScrollPaused(!!state.scrollPaused);
        if (state.lastUpdate !== lastUpdate) {
          lastUpdate = state.lastUpdate || null;
          render(state);
        }
      } catch (error) {
        // Do not replace the broadcast with an error card; keep the last valid frame.
        console.warn('Polling hadits:', error.message);
      } finally {
        polling = false;
      }
    }
    poll();
    // Di jendela Electron, konten hadits juga didorong lewat IPC, jadi polling
    // cukup sebagai jaring pengaman. Di OBS/vMix (browser tanpa IPC) tetap 0,5 dtk.
    const hasIpc = !!(window.electronAPI && window.electronAPI.isElectron);
    setInterval(poll, hasIpc ? 3000 : 500);
  }
})();
