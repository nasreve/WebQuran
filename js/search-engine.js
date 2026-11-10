/* Shared, offline search for the drawer and omnibar. No source text is modified. */
(function (root) {
  'use strict';

  const translationAliases = {
    shalat: 'salat', sholat: 'salat', solat: 'salat',
    rejeki: 'rezeki', rizki: 'rezeki', rizqi: 'rezeki',
    taqwa: 'takwa', syurga: 'surga'
  };
  const prefixes = /^(?:ber|ter|meng|men|mem|me|peng|pen|pem|per|pe|di|ke|se)/;
  const suffixes = ['an', 'kan', 'i', 'nya', 'mu', 'ku', 'lah'];

  // The same transformations drive matching and highlights. Offsets are only
  // allocated for visible results, not for all 6,236 verses in the index.
  function normalize(text, mode, relaxed = false, withMap = false) {
    let value = String(text || '');
    let offsets = withMap ? Array.from({ length: value.length }, (_, i) => [i, i + 1]) : null;
    function replace(regex, replacement) {
      if (!withMap) {
        value = value.replace(regex, replacement);
        return;
      }
      let next = '', nextOffsets = withMap ? [] : null, cursor = 0;
      for (const match of value.matchAll(regex)) {
        const start = match.index, end = start + match[0].length;
        const part = typeof replacement === 'function' ? replacement(match[0]) : replacement;
        next += value.slice(cursor, start) + part;
        if (withMap) {
          nextOffsets.push(...offsets.slice(cursor, start));
          for (let i = 0; i < part.length; i++) nextOffsets.push([offsets[start][0], offsets[end - 1][1]]);
        }
        cursor = end;
      }
      next += value.slice(cursor);
      if (withMap) nextOffsets.push(...offsets.slice(cursor));
      value = next;
      offsets = nextOffsets;
    }
    replace(/[\s\S]/gu, char => char.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''));
    if (mode === 'latin' && relaxed) {
      // Optional waqaf/i'rab endings in the supplied Latin data, e.g. ahad(un).
      replace(/\((?:a|i|u|un|in|n|tan|tin|tun|ta|ti|tu|um|uw)\)/g, '');
    }
    replace(/['’‘`ʾʿʼ]/g, '');
    replace(/[^a-z0-9]+/g, mode === 'latin' ? '' : ' ');
    if (mode === 'latin' && relaxed) {
      replace(/dz|dh/g, 'z');
      replace(/sy|sh/g, 'sy');
      replace(/ts|th/g, 's');
      replace(/([a-z])\1+/g, match => match[0]);
    }
    if (mode === 'translation') {
      replace(/\b(?:shalat|sholat|solat|rejeki|rizki|rizqi|taqwa|syurga)\b/g, word => translationAliases[word]);
    }
    return { value, offsets };
  }

  function prepare(text, mode) {
    const strict = normalize(text, mode).value;
    const words = mode === 'translation' ? strict.match(/[a-z0-9]+/g) || [] : [];
    return {
      strict,
      relaxed: mode === 'latin' ? normalize(text, mode, true).value : strict,
      words,
      wordSet: new Set(words),
      stems: new Set(words.map(word => word.replace(prefixes, '')).filter((stem, i) => stem !== words[i]))
    };
  }

  function query(raw, mode) {
    const normalized = prepare(raw, mode);
    const terms = mode === 'latin'
      ? String(raw || '').trim().split(/\s+/).map(t => normalize(t, mode).value).filter(Boolean)
      : normalized.words;
    return {
      ...normalized, terms: [...new Set(terms)],
      looseTerms: [...new Set(String(raw || '').trim().split(/\s+/).map(t => normalize(t, mode, true).value).filter(Boolean))],
      valid: normalized.strict.replace(/\s/g, '').length >= 3
    };
  }

  function wordQuality(word, term) {
    if (word === term) return 3;
    // Useful while typing; short terms must respect word boundaries.
    if (term.length >= 4 && word.startsWith(term)) return 2;
    if (suffixes.some(suffix => word === term + suffix)) return 1;
    // Conservative affix matching: iman -> beriman, puasa -> berpuasa.
    // Unlike substring matching, iman does not match "bagaimana".
    const stem = word.replace(prefixes, '');
    if (stem !== word && (stem === term || suffixes.some(s => stem === term + s))) return 1;
    return 0;
  }

  function score(prepared, q, mode) {
    if (!q.valid) return 0;
    if (mode === 'latin') {
      if (prepared.strict === q.strict) return 1000;
      if (prepared.strict.includes(q.strict)) return 900;
      // Alternate spelling is secondary to an exact phrase and is restricted
      // to queries of at least four letters to limit very broad matches.
      if (q.relaxed.length >= 4 && prepared.relaxed.includes(q.relaxed)) return 800;
      if (q.terms.every(t => prepared.strict.includes(t))) return 600;
      if (q.relaxed.length >= 4 && q.looseTerms.every(t => prepared.relaxed.includes(t))) return 500;
      return 0;
    }
    const qualities = [];
    for (const term of q.terms) {
      if (prepared.wordSet.has(term)) qualities.push(3);
      else if (term.length >= 4 && prepared.words.some(word => word.startsWith(term))) qualities.push(2);
      else if (prepared.stems.has(term) || suffixes.some(suffix => prepared.stems.has(term + suffix) || prepared.wordSet.has(term + suffix))) qualities.push(1);
      else return 0;
    }
    const phrase = q.words.join(' '), sentence = prepared.words.join(' ');
    if (sentence === phrase) return 1000;
    if ((' ' + sentence + ' ').includes(' ' + phrase + ' ')) return 900;
    return (qualities.every(quality => quality === 3) ? 700 : 500) + qualities.reduce((a, b) => a + b, 0) / qualities.length;
  }

  function search(index, raw, mode) {
    const q = query(raw, mode);
    if (!q.valid) return [];
    const matches = [];
    for (const item of index) {
      const prepared = mode === 'latin' ? item.latinSearch : item.translationSearch;
      const relevance = score(prepared, q, mode);
      if (relevance) matches.push({ item, score: relevance });
    }
    matches.sort((a, b) => b.score - a.score || a.item.surah_id - b.item.surah_id || a.item.ayah - b.item.ayah);
    return matches;
  }

  function escape(text) {
    return String(text || '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  }

  function highlight(text, raw, mode) {
    text = String(text || '');
    const q = query(raw, mode);
    if (!q.valid) return escape(text);
    const ranges = [];
    function add(mapped, start, length) {
      ranges.push([mapped.offsets[start][0], mapped.offsets[start + length - 1][1]]);
    }
    if (mode === 'translation') {
      const mapped = normalize(text, mode, false, true);
      for (const word of mapped.value.matchAll(/[a-z0-9]+/g)) {
        if (q.terms.some(term => wordQuality(word[0], term))) add(mapped, word.index, word[0].length);
      }
    } else {
      const prepared = prepare(text, mode);
      const relevance = score(prepared, q, mode);
      const relaxed = relevance === 800 || relevance === 500;
      const mapped = normalize(text, mode, relaxed, true);
      const terms = relevance >= 800 ? [relaxed ? q.relaxed : q.strict] : (relaxed ? q.looseTerms : q.terms);
      for (const term of terms.filter(Boolean)) {
        let start = mapped.value.indexOf(term);
        while (start !== -1) {
          add(mapped, start, term.length);
          start = mapped.value.indexOf(term, start + term.length);
        }
      }
    }
    ranges.sort((a, b) => a[0] - b[0]);
    const merged = [];
    for (const range of ranges) {
      const previous = merged[merged.length - 1];
      if (previous && range[0] <= previous[1]) previous[1] = Math.max(previous[1], range[1]);
      else merged.push(range);
    }
    let html = '', cursor = 0;
    for (const [start, end] of merged) {
      html += escape(text.slice(cursor, start)) + '<mark class="search-highlight">' + escape(text.slice(start, end)) + '</mark>';
      cursor = end;
    }
    return html + escape(text.slice(cursor));
  }

  const api = { prepare, query, search, highlight, normalize, escape };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.QuranSearch = api;
})(typeof globalThis !== 'undefined' ? globalThis : window);
