// ============================================================
// Webquran — Live Confidence Monitor (Program Feed 16:9)
// ============================================================

let isConfidenceMonitorVisible = true;

const TEMPLATE_NAMES_MAP = {
  'default.html': 'Default 16:9',
  'lower_third.html': 'Lower Third Light',
  'lower_third_dark.html': 'Lower Third Dark',
  'lower_third_dual.html': 'Lower Third Dual',
  'pip_video.html': 'Picture-in-Picture',
  'modern_elegant.html': 'Modern Elegant',
  'classic_gold.html': 'Classic Gold',
  'neon_cyber.html': 'Neon Cyber',
  'gradient_sunset.html': 'Gradient Sunset',
  'retro_islamic.html': 'Retro Islamic',
  'elegant_minimalist.html': 'Elegant Minimalist'
};

function formatTemplateLabel(fileName) {
  if (!fileName) return 'Default 16:9';
  const clean = fileName.replace('templates/', '');
  return TEMPLATE_NAMES_MAP[clean] || clean.replace('.html', '').replace('_', ' ').toUpperCase();
}

function updateMonitorScale() {
  const aspectBox = document.getElementById('cmAspectBox');
  const frame = document.getElementById('confidenceMonitorFrame');
  if (!aspectBox || !frame) return;

  const containerWidth = aspectBox.clientWidth;
  if (containerWidth <= 0) return;

  // Resolusi kanvas virtual output adalah 1920x1080 (Full HD 16:9)
  const scale = containerWidth / 1920;
  frame.style.transform = `scale(${scale}) translateZ(0)`;
  frame.style.width = '1920px';
  frame.style.height = '1080px';
}

function updateConfidenceMonitorTally(isVisible) {
  const panel = document.getElementById('confidenceMonitorPanel');
  const box = document.getElementById('cmAspectBox');
  const dot = document.getElementById('cmTallyDot');
  const label = document.getElementById('cmTallyLabel');
  const btnDock = document.getElementById('dockBtnToggleMonitor');

  if (isVisible) {
    if (panel) panel.classList.add('is-live');
    if (box) {
      box.classList.add('tally-border-live');
      box.classList.remove('tally-border-hide');
    }
    if (dot) dot.className = 'cm-tally-dot dot-live';
    if (label) label.textContent = 'PGM • ON AIR';
    if (btnDock) btnDock.classList.add('dock-monitor-live');
  } else {
    if (panel) panel.classList.remove('is-live');
    if (box) {
      box.classList.remove('tally-border-live');
      box.classList.add('tally-border-hide');
    }
    if (dot) dot.className = 'cm-tally-dot dot-hide';
    if (label) label.textContent = 'PGM • BLANK';
    if (btnDock) btnDock.classList.remove('dock-monitor-live');
  }
}

function updateConfidenceMonitorTemplate(templateName) {
  const badgeText = document.getElementById('cmTemplateName');
  if (badgeText) {
    badgeText.textContent = formatTemplateLabel(templateName);
  }

  // Kirim sinyal update template ke frame monitor
  const frame = document.getElementById('confidenceMonitorFrame');
  if (frame && frame.contentWindow) {
    try {
      frame.contentWindow.postMessage({
        type: 'CONFIDENCE_SYNC',
        template: templateName
      }, '*');
    } catch (e) {}
  }
}

let cmSyncTimer = null;
let cmPendingData = {};

function syncConfidenceMonitor(data = {}) {
  const frame = document.getElementById('confidenceMonitorFrame');
  if (!frame || !frame.contentWindow) return;

  // Template selalu ikut disertakan: dulu pratinjau bisa tertinggal di template
  // bawaan bila pesan perubahan template datang sebelum iframe siap.
  let savedTemplate = 'default.html';
  try { savedTemplate = localStorage.getItem('quran_template') || 'default.html'; } catch (e) { /* abaikan */ }
  Object.assign(cmPendingData, { template: savedTemplate }, data);

  if (!cmSyncTimer) {
    cmSyncTimer = requestAnimationFrame(() => {
      cmSyncTimer = null;
      try {
        frame.contentWindow.postMessage({
          type: 'CONFIDENCE_SYNC',
          ...cmPendingData
        }, '*');
      } catch (e) {}
      cmPendingData = {};
    });
  }
}

function toggleConfidenceMonitor(forceState = null) {
  const panel = document.getElementById('confidenceMonitorPanel');
  const btnHeader = document.getElementById('headerBtnMonitor');
  const btnDock = document.getElementById('dockBtnToggleMonitor');

  if (forceState !== null) {
    isConfidenceMonitorVisible = forceState;
  } else {
    isConfidenceMonitorVisible = !isConfidenceMonitorVisible;
  }

  if (panel) {
    if (isConfidenceMonitorVisible) {
      panel.classList.remove('cm-panel-hidden');
      if (btnHeader) btnHeader.classList.add('active');
      if (btnDock) btnDock.classList.add('active');
    } else {
      panel.classList.add('cm-panel-hidden');
      if (btnHeader) btnHeader.classList.remove('active');
      if (btnDock) btnDock.classList.remove('active');
    }
  }

  localStorage.setItem('quranBroadcast_confidenceMonitor', isConfidenceMonitorVisible ? '1' : '0');

  // Beri waktu animasi transisi selesai lalu re-scale
  setTimeout(updateMonitorScale, 260);
}

function initConfidenceMonitor() {
  const aspectBox = document.getElementById('cmAspectBox');
  if (aspectBox && window.ResizeObserver) {
    const ro = new ResizeObserver(() => {
      updateMonitorScale();
    });
    ro.observe(aspectBox);
  }

  window.addEventListener('resize', updateMonitorScale);

  // Baca preferensi tersimpan
  const savedPref = localStorage.getItem('quranBroadcast_confidenceMonitor');
  if (savedPref === '0') {
    toggleConfidenceMonitor(false);
  } else {
    toggleConfidenceMonitor(true);
  }

  // Muat nama template yang tersimpan
  const savedTemplate = localStorage.getItem('quran_template') || 'default.html';
  // Setel src pratinjau lengkap dengan nama template, supaya tampilannya benar
  // sejak pemuatan pertama (pesan postMessage bisa tiba sebelum iframe siap).
  const frameEl = document.getElementById('confidenceMonitorFrame');
  if (frameEl) {
    frameEl.src = 'presentation.html?obs&template=' + encodeURIComponent(savedTemplate);
  }
  updateConfidenceMonitorTemplate(savedTemplate);

  // Initial scaling
  setTimeout(updateMonitorScale, 150);
}

document.addEventListener('DOMContentLoaded', initConfidenceMonitor);
