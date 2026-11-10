/* ============================================================
   DualFit — penyesuaian teks untuk template dua kolom
   (Lower Third Dual & Dual Split Sapphire)

   Tujuan:
   1. Teks diukur terhadap tinggi kolom yang sebenarnya, bukan 42% viewport.
   2. Bila huruf jadi terlalu kecil, panel boleh tumbuh bertahap
      (28vh → 40vh) supaya ayat tetap enak dibaca.
   3. Gulir otomatis hanya dipakai sebagai jalan terakhir, dan bisa dijeda
      (posisi dibekukan, lalu dilanjutkan dari titik yang sama).
   ============================================================ */
(() => {
  'use strict';

  const SPEED_PX_PER_SEC = 10;   // sama dengan perilaku lama
  const START_DELAY_MS = 4000;   // jeda sebelum mulai bergulir
  const RESUME_DELAY_MS = 1500;  // jeda pendek setelah resume
  const HEIGHT_STEPS_VH = [28, 32, 36, 40];
  const TARGET_RATIO = 0.8;      // huruf dianggap cukup besar bila >= 80% maksimum
  const COLUMN_MARGIN = 12;      // ruang aman di dalam kolom
  const MIN_ARABIC_PX = 22;      // batas keterbacaan (skala 100%)
  const MIN_LATIN_PX = 13;

  let paused = false;
  let lastDiag = null;
  let last = null;               // konfigurasi terakhir untuk resize
  const timers = new Map();      // name -> timeout id
  const lanes = new Map();       // name -> { wrap, el, col, distance, duration, offset, startedAt }

  function clearTimer(name) {
    const id = timers.get(name);
    if (id) { clearTimeout(id); timers.delete(name); }
  }

  function clearAllTimers() {
    for (const id of timers.values()) clearTimeout(id);
    timers.clear();
  }

  // Sisa jarak setelah pause: dipakai terpisah agar bisa diuji tanpa DOM.
  function remainingDistance(distance, duration, elapsedMs) {
    if (!Number.isFinite(distance) || distance <= 0) return 0;
    if (!Number.isFinite(duration) || duration <= 0) return distance;
    const progress = Math.min(1, Math.max(0, elapsedMs / duration));
    return Math.round(distance * (1 - progress));
  }

  function columnBudget(col) {
    if (!col) return 0;
    return Math.max(0, col.clientHeight - COLUMN_MARGIN);
  }

  function fitColumn(lane, maximum) {
    const size = window.QuranTextFit.size(
      lane.el, lane.el.innerHTML, maximum, lane.minimum, lane.lineHeight, true,
      () => columnBudget(lane.col)
    );
    // size() hanya MENGEMBALIKAN angka — terapkan ke elemen aslinya.
    lane.el.style.fontSize = size + 'px';
    return size;
  }

  function setupLane(name, lane) {
    lane.el.style.transition = 'none';
    lane.el.style.transform = 'translateY(0)';
    lane.distance = 0;
    lane.duration = 0;
    lane.offset = 0;
    lane.startedAt = 0;
    lanes.set(name, lane);
  }

  function isOverflowing(lane) {
    if (!lane.col) return false;
    return lane.el.scrollHeight > columnBudget(lane.col) + 1;
  }

  function scheduleScroll(name, delayMs) {
    const lane = lanes.get(name);
    if (!lane || lane.distance <= 0) return;
    clearTimer(name);

    const start = () => {
      if (paused) return;
      lane.startedAt = performance.now();
      lane.el.style.transition = `transform ${lane.duration}ms linear`;
      lane.el.style.transform = `translateY(-${lane.distance}px)`;
    };

    if (delayMs <= 0) start();
    else timers.set(name, setTimeout(start, delayMs));
  }

  function prepareScroll(panel) {
    let any = false;
    for (const [name, lane] of lanes) {
      if (!isOverflowing(lane)) {
        // Tidak meluap (mis. setelah font selesai dimuat): bersihkan sisa status.
        clearTimer(name);
        lane.distance = 0;
        lane.offset = 0;
        lane.el.style.transition = 'none';
        lane.el.style.transform = 'translateY(0)';
        continue;
      }
      any = true;
      lane.distance = lane.el.scrollHeight - columnBudget(lane.col) + 20;
      lane.duration = Math.round((lane.distance / SPEED_PX_PER_SEC) * 1000);
      scheduleScroll(name, paused ? 0 : START_DELAY_MS);
    }
    if (panel) panel.classList.toggle('is-scrolling', any);
    return any;
  }

  function apply(options) {
    const { panel, arabic, latin, scale } = options;

    // Render ulang saat sedang dijeda (mis. layar dikirim ulang) tidak boleh
    // melompatkan teks ke atas: simpan posisi, lalu pulihkan setelah diukur.
    const sameContent = !!last && last.textAr === arabic.el.textContent && last.textTr === latin.el.textContent;
    const keepOffset = sameContent;
    const prevOffset = {
      arabic: keepOffset && lanes.has('arabic') ? lanes.get('arabic').offset : 0,
      latin: keepOffset && lanes.has('latin') ? lanes.get('latin').offset : 0,
    };

    clearAllTimers();
    setupLane('arabic', arabic);
    setupLane('latin', latin);

    // Panel yang tingginya ditransisikan CSS (mis. Dual Mihrab) akan melaporkan
    // tinggi LAMA saat diukur — ayat berikutnya dikira muat, lalu terpotong
    // tanpa gulir setelah panel menyusut. Matikan transisi selama pengukuran,
    // lalu animasikan dari tinggi lama ke tinggi baru di akhir.
    const heightAnimated = /(^|,\s*)(height|all)(\s*,|$)/.test(getComputedStyle(panel).transitionProperty);
    const previousHeight = panel.getBoundingClientRect().height;
    if (heightAnimated) panel.style.transition = 'none';

    // Ukuran maksimum bisa ditentukan template (mis. Dual Mihrab yang lebih
    // lega); bawaannya tetap 36/20 seperti template dua kolom lama.
    const arMax = Math.round((Number(options.arabicMax) || 36) * scale);
    const trMax = Math.round((Number(options.latinMax) || 20) * scale);
    // Batas minimum juga bisa ditentukan template. Makin tinggi batasnya,
    // makin cepat ayat panjang beralih ke gulir alih-alih mengecil sampai
    // sulit dibaca (Dual Mihrab: 30/20). Bawaannya tetap 22/13.
    arabic.minimum = Math.round((Number(options.arabicMin) || MIN_ARABIC_PX) * scale);
    latin.minimum = Math.round((Number(options.latinMin) || MIN_LATIN_PX) * scale);
    const enough = Math.round(arMax * TARGET_RATIO);

    // Tahap 1: cari tinggi panel terkecil yang membuat huruf Arab cukup besar.
    let chosen = HEIGHT_STEPS_VH[0];
    for (let i = 0; i < HEIGHT_STEPS_VH.length; i++) {
      const vh = HEIGHT_STEPS_VH[i];
      panel.style.height = vh + 'vh';
      void panel.offsetHeight; // paksa layout agar clientHeight terbaru
      const size = window.QuranTextFit.size(
        arabic.el, arabic.el.innerHTML, arMax, arabic.minimum, arabic.lineHeight, true,
        () => columnBudget(arabic.col)
      );
      chosen = vh;
      if (size >= enough || i === HEIGHT_STEPS_VH.length - 1) break;
    }

    // Tahap 2: kunci tinggi itu, lalu ukur kedua kolom sekali lagi.
    panel.style.height = chosen + 'vh';
    void panel.offsetHeight;
    const arSize = fitColumn(arabic, arMax);
    const trSize = fitColumn(latin, trMax);

    // Tahap 2b: fitter mengukur pada klon; pada elemen nyata kadang tersisa
    // luapan beberapa piksel. Turunkan 1 px demi 1 px supaya gulir benar-benar
    // hanya muncul ketika ukuran minimum pun tidak cukup.
    for (const lane of [arabic, latin]) {
      let size = parseFloat(lane.el.style.fontSize) || lane.minimum;
      let guard = 0;
      while (isOverflowing(lane) && size > lane.minimum && guard < 40) {
        size -= 1;
        lane.el.style.fontSize = size + 'px';
        guard++;
      }
    }

    // Tahap 3: hanya bila masih meluber, aktifkan gulir (bisa dijeda).
    const scrolling = prepareScroll(panel);
    last = { ...options, textAr: arabic.el.textContent, textTr: latin.el.textContent };

    // Konten sama (mis. layar dikirim ulang karena status jeda berubah):
    // jangan kembalikan teks ke atas — lanjutkan dari posisi terakhir.
    if (sameContent) {
      for (const [name, lane] of lanes) {
        if (!lane.distance || !prevOffset[name]) continue;
        clearTimer(name);
        lane.offset = Math.min(prevOffset[name], lane.distance);
        lane.el.style.transition = 'none';
        lane.el.style.transform = 'translateY(-' + lane.offset + 'px)';
        if (!paused) {
          const left = Math.max(0, lane.distance - lane.offset);
          if (left > 0) {
            lane.duration = Math.round((left / SPEED_PX_PER_SEC) * 1000);
            scheduleScroll(name, RESUME_DELAY_MS);
          }
        }
      }
    }
    lastDiag = {
      chosen, arSize, trSize, scrolling,
      arSh: arabic.el.scrollHeight, arBudget: columnBudget(arabic.col),
      arOverflow: isOverflowing(arabic), trSh: latin.el.scrollHeight,
      arFont: parseFloat(arabic.el.style.fontSize) || 0
    };

    // Semua ukuran sudah dihitung pada tinggi akhir: pulihkan transisi dan
    // biarkan panel bergerak halus dari tinggi lama ke tinggi baru.
    if (heightAnimated) {
      const target = panel.style.height;
      const finalHeight = panel.getBoundingClientRect().height;
      if (previousHeight > 0 && Math.abs(finalHeight - previousHeight) > 1) {
        panel.style.height = previousHeight + 'px';
        void panel.offsetHeight;
        panel.style.transition = '';
        panel.style.height = target;
      } else {
        panel.style.transition = '';
      }
    }

    return { height: chosen, arSize, trSize, scrolling, paused };
  }

  function pause() {
    if (paused) return false;
    paused = true;
    for (const [name, lane] of lanes) {
      if (lane.distance <= 0) continue;
      clearTimer(name);
      // Bekukan di posisi sekarang, bukan kembali ke atas.
      const computed = getComputedStyle(lane.el).transform;
      let offset = lane.offset;
      if (computed && computed !== 'none') {
        const m = /matrix\([^,]+,[^,]+,[^,]+,[^,]+,[^,]+,\s*(-?[\d.]+)\)/.exec(computed);
        if (m) offset = Math.abs(parseFloat(m[1]));
      }
      lane.offset = Math.min(lane.distance, offset);
      lane.el.style.transition = 'none';
      lane.el.style.transform = `translateY(-${lane.offset}px)`;
    }
    return true;
  }

  function resume() {
    if (!paused) return false;
    paused = false;
    for (const [name, lane] of lanes) {
      if (lane.distance <= 0) continue;
      const left = Math.max(0, lane.distance - lane.offset);
      if (left <= 0) continue;                 // sudah sampai bawah
      lane.duration = Math.round((left / SPEED_PX_PER_SEC) * 1000);
      // offset sengaja DIPERTAHANKAN: transisi berjalan dari posisi sekarang.
      scheduleScroll(name, RESUME_DELAY_MS);
    }
    return true;
  }

  function setPaused(value) {
    return value ? pause() : resume();
  }

  function isPaused() { return paused; }

  function reset(panel) {
    clearAllTimers();
    for (const lane of lanes.values()) {
      lane.el.style.transition = 'none';
      lane.el.style.transform = 'translateY(0)';
      lane.distance = 0;
      lane.duration = 0;
      lane.offset = 0;
    }
    if (panel) panel.classList.remove('is-scrolling');
  }

  function reapply() {
    if (last) apply(last);
  }

  window.addEventListener('resize', () => { if (last) reapply(); });
  // Font web bisa selesai dimuat setelah pengukuran pertama: ukur ulang supaya
  // gulir tidak menyala hanya karena ukuran teks masih sementara.
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => { if (last) reapply(); });
  }

  function metrics() {
    const out = {};
    for (const [name, lane] of lanes) {
      out[name] = {
        scrollHeight: lane.el.scrollHeight,
        budget: columnBudget(lane.col),
        overflow: isOverflowing(lane),
        fontSize: parseFloat(lane.el.style.fontSize) || 0,
        distance: lane.distance
      };
    }
    return out;
  }
  window.DualFit = {
    apply, reset, pause, resume, setPaused, isPaused, reapply, metrics,
    diag: () => lastDiag,
    remainingDistance,
    constants: { SPEED_PX_PER_SEC, START_DELAY_MS, RESUME_DELAY_MS, HEIGHT_STEPS_VH }
  };
})();
