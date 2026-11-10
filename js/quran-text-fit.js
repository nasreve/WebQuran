/* Measure rendered text, including the selected font, instead of counting letters. */
(() => {
  'use strict';
  const entries = new Map();
  function measure(element, html, maximum, minimum, lineHeight, lowerThird, budget) {
    const wrap = document.getElementById('mainWrap');
    const style = getComputedStyle(element), panel = getComputedStyle(wrap);
    const number = value => parseFloat(value) || 0;
    const header = wrap.querySelector(lowerThird ? '.header-row' : '.info-block');
    const width = element.clientWidth || wrap.clientWidth - number(panel.paddingLeft) - number(panel.paddingRight);
    let wrapperSpace = 0;
    for (let parent = element.parentElement; parent && parent !== wrap; parent = parent.parentElement) {
      const parentStyle = getComputedStyle(parent);
      wrapperSpace += number(parentStyle.paddingTop) + number(parentStyle.paddingBottom)
        + number(parentStyle.borderTopWidth) + number(parentStyle.borderBottomWidth);
    }
    // `budget` (angka piksel atau fungsi) menimpa anggaran bawaan. Dipakai template
    // dua kolom agar teks diukur terhadap tinggi kolomnya yang sebenarnya.
    const explicit = typeof budget === 'function' ? Number(budget()) : Number(budget);
    const height = (Number.isFinite(explicit) && explicit > 0)
      ? explicit
      : innerHeight * (lowerThird ? .42 : .90) - number(panel.paddingTop) - number(panel.paddingBottom)
        - number(panel.borderTopWidth) - number(panel.borderBottomWidth)
        - (header ? header.offsetHeight + number(getComputedStyle(header).marginBottom) : 0)
        - wrapperSpace - number(panel.gap) - 8;
    if (width <= 0 || height <= 0) return minimum;
    const probe = element.cloneNode(false);
    probe.removeAttribute('id');
    probe.setAttribute('aria-hidden', 'true');
    Object.assign(probe.style, {
      position: 'fixed', left: '-100000px', top: '0', visibility: 'hidden',
      width: width + 'px', maxWidth: 'none', height: 'auto', maxHeight: 'none',
      margin: '0', flex: 'none', transform: 'none', animation: 'none', transition: 'none',
      fontFamily: style.fontFamily, fontWeight: style.fontWeight, fontStyle: style.fontStyle,
      letterSpacing: style.letterSpacing, lineHeight: String(lineHeight), overflow: 'visible'
    });
    probe.innerHTML = html;
    document.body.appendChild(probe);
    let low = Math.max(1, Math.round(minimum)), high = Math.max(low, Math.round(maximum)), best = low;
    try {
      while (low <= high) {
        const size = Math.floor((low + high) / 2);
        probe.style.fontSize = size + 'px';
        if (probe.scrollHeight <= height + 1 && probe.scrollWidth <= width + 1) {
          best = size; low = size + 1;
        } else high = size - 1;
      }
      return best;
    } finally { probe.remove(); }
  }
  function size(element, html, maximum, minimum, lineHeight, lowerThird, budget) {
    entries.set(element, { maximum, minimum, lineHeight, lowerThird, budget });
    return measure(element, html, maximum, minimum, lineHeight, lowerThird, budget);
  }
  function refresh() {
    for (const [element, options] of entries) {
      if (!element.isConnected) { entries.delete(element); continue; }
      element.style.fontSize = measure(element, element.innerHTML, options.maximum, options.minimum,
        options.lineHeight, options.lowerThird, options.budget) + 'px';
    }
  }
  window.QuranTextFit = { size, refresh };
  addEventListener('resize', refresh);
  document.fonts?.ready.then(refresh);
  document.fonts?.addEventListener('loadingdone', refresh);
})();
