/* Text retrieval runs off the operator UI thread. Never mixes source groups. */
importScripts('hadith-engine.js');
const engine = self.HadithSearchEngine;
const loaded = new Map();
const inflight = new Map();
let currentRequest = 0;
let lastSearch = null;
// Sidecar metadata: baris 9-Imam yang digabung ke edisi kanonik tetap bisa
// ditemukan lewat judul/koleksi/rujukan/nomornya.
let extraPath = null;
let extraMap = {};
let extraLoading = null;
function loadSearchExtra(rel) {
  if (!rel) return Promise.resolve({});
  if (rel === extraPath && extraLoading) return extraLoading;
  extraPath = rel;
  extraLoading = fetch(new URL('../' + rel, self.location.href))
    .then((response) => (response.ok ? response.json() : {}))
    .catch(() => ({}));
  extraLoading.then((map) => { extraMap = map || {}; });
  return extraLoading;
}

// Indeks besar dikirim terkompresi; DecompressionStream tersedia di Chromium.
async function readIndex(response, gzip) {
  if (!gzip) return response.json();
  if (typeof DecompressionStream === 'function' && response.body) {
    const stream = response.body.pipeThrough(new DecompressionStream('gzip'));
    return JSON.parse(await new Response(stream).text());
  }
  return response.json();
}

async function loadSource(source) {
  if (loaded.has(source.id)) return loaded.get(source.id);
  if (inflight.has(source.id)) return inflight.get(source.id);
  const promise = (async () => {
    const response = await fetch(new URL('../' + source.file, self.location.href));
    if (!response.ok) throw new Error('Sumber ' + source.label + ' belum bisa dimuat.');
    const data = await response.json();
    // Indeks token mempercepat pencarian pertama: worker tidak perlu
    // menormalkan seluruh kitab, cukup baris yang cocok.
    let indexTokens = null;
    let indexLatin = null;
    let indexDf = null;
    if (source.index) {
      try {
        const res = await fetch(new URL('../' + source.index, self.location.href));
        const payload = res.ok ? await readIndex(res, source.index.endsWith('.gz')) : null;
        if (payload && payload.tokens && payload.count === data.length) {
          indexTokens = payload.tokens;
          if (Array.isArray(payload.latin) && payload.latin.length === data.length) indexLatin = payload.latin;
          if (payload.df && typeof payload.df === 'object') indexDf = payload.df;
        }
      } catch (error) { indexTokens = null; }
    }
  if (extraPath) {
    const map = await (extraLoading || loadSearchExtra(extraPath));
    if (map && typeof map === 'object') {
      for (const item of data) {
        const entry = map[item.id];
        if (!entry) continue;
        if (entry.m) item.searchExtra = entry.m;
        if (entry.n) item.searchNumbers = entry.n;
      }
    }
  }
    if (!Array.isArray(data) || data.some(item => (item.source_id && item.source_id !== source.id) || (item.source_group && item.source_group !== source.group))) throw new Error('Identitas sumber tidak sesuai: ' + source.label);
    const rows = [];
    const byId = new Map(), byNumber = new Map();
    for (let i = 0; i < data.length; i++) {
      const item = data[i];
      // Identitas tidak lagi disimpan di tiap baris (hemat ±4,7 MB); isi
      // kembali dari catalog. Bila berkas masih membawanya, nilai asli sudah
      // divalidasi di atas dan dipakai apa adanya.
      if (!item.source_id) item.source_id = source.id;
      if (!item.source_group) item.source_group = source.group;
      const row = { item, prepared: null };
      if (indexLatin && indexLatin[i]) row.latinWords = indexLatin[i].split(' ');
      rows.push(row);
      byId.set(row.item.id, row.item);
      for (const number of new Set(engine.normalize(row.item.number).match(/\d+[a-z]?/g) || [])) {
        if (!byNumber.has(number)) byNumber.set(number, []);
        byNumber.get(number).push(row);
      }
      // Let a new query, group switch or close interrupt a large first load.
      if (i && i % 1000 === 0) await new Promise(resolve => setTimeout(resolve, 0));
    }
    const dataset = { rows, byId, byNumber, indexTokens, indexDf, total: rows.length, cachedQuery: null, cachedMatches: null };
    loaded.set(source.id, dataset);
    return dataset;
  })();
  inflight.set(source.id, promise);
  try { return await promise; } finally { inflight.delete(source.id); }
}

function resultsPage(search, offset) {
  const isArabicQuery = search.mode === 'latin' || engine.hasArabic(search.query);
  const items = search.matches.slice(offset, offset + 40).map(({ item }) => {
    const isArabicMatch = isArabicQuery && item.arabic;
    const snippetText = isArabicMatch
      ? engine.snippet(item.arabic, search.query, 140, search.mode)
      : engine.snippet(item.translation, search.query);
    return {
      id: item.id, source_id: item.source_id, source_group: item.source_group,
      title: item.title, collection: item.collection, number: item.number,
      reference: item.reference, snippet: snippetText, is_arabic_snippet: !!isArabicMatch,
      arabic_preview: String(item.arabic || '').slice(0, 110), image_arabic: !!(item.arabic_images || []).length,
    };
  });
  postMessage({ type: 'results', request: search.request, total: search.matches.length, removed: search.removed || 0, fuzzy: !!search.fuzzy, corrected: !!search.corrected, suggestion: search.suggestion || '', offset, items });
}

// Kandidat dari indeks: kunci token yang MENGANDUNG kata kueri (atau satu
// variannya), lalu iris untuk kueri multi-kata. Hasilnya superset dari
// pencocokan teks biasa, jadi skor akhir tetap ditentukan engine.score().
function candidatesFromIndex(dataset, q) {
  const tokens = dataset.indexTokens;
  if (!tokens) return dataset.rows;
  const keys = Object.keys(tokens);
  const sets = [];
  for (let i = 0; i < q.terms.length; i++) {
    const variants = (q.alternatives && q.alternatives[i]) || [q.terms[i]];
    const set = new Set();
    for (const variant of variants) {
      const substring = (engine.hasArabic(variant) && variant.length >= 2) || variant.length >= 4;
      for (const key of keys) {
        const hit = substring ? key.includes(variant) : key === variant;
        if (!hit) continue;
        for (const index of tokens[key]) set.add(index);
      }
    }
    if (!set.size) return [];
    sets.push(set);
  }
  sets.sort((a, b) => a.size - b.size);
  let result = sets[0];
  for (let i = 1; i < sets.length; i++) {
    result = new Set([...result].filter((value) => sets[i].has(value)));
  }
  return [...result].map((index) => dataset.rows[index]).filter(Boolean);
}

self.onmessage = async ({ data }) => {
  if (data.type === 'cancel') { currentRequest = data.request; lastSearch = null; return; }
  if (data.type === 'page') {
    if (lastSearch && lastSearch.request === data.request) resultsPage(lastSearch, data.offset);
    return;
  }
  if (data.type === 'detail') {
    const item = loaded.get(data.source)?.byId.get(data.id);
    if (item) postMessage({ type: 'detail', request: data.request, item });
    return;
  }
  if (data.type !== 'search') return;
  currentRequest = data.request;
  lastSearch = null;
  if (data.searchExtra) loadSearchExtra(data.searchExtra);
  const q = engine.parse(data.query, data.mode);
  const matches = [];
  if (!q.valid && !data.savedOnly) {
    lastSearch = { request: data.request, query: data.query, mode: data.mode, matches };
    resultsPage(lastSearch, 0); return;
  }
  try {
    const sources = data.sources.filter(s => s.group === data.group && (!data.source || s.id === data.source))
      .sort((a, b) => (a.bytes || 0) - (b.bytes || 0));
    const saved = new Set(data.savedIds || []);
    let complete = 0;
    for (const source of sources) {
      if (currentRequest !== data.request) return;
      postMessage({ type: 'progress', request: data.request, label: source.label, done: complete, total: sources.length });
      const dataset = await loadSource(source);
      if (currentRequest !== data.request) return;
      // IDF per sumber untuk peringkat kata pada pencarian terjemahan.
      if (dataset.indexTokens && !dataset.df) {
        dataset.df = Object.create(null);
        for (const [token, list] of Object.entries(dataset.indexTokens)) dataset.df[token] = list.length;
      }
      if (dataset.df) { q.df = dataset.df; q.total = dataset.total; }
      const cacheKey = JSON.stringify([data.mode || 'text', q.normalized, !!data.savedOnly, data.savedOnly ? [...saved].sort() : []]);
      if (dataset.cachedQuery === cacheKey) {
        for (const match of dataset.cachedMatches) matches.push(match);
        complete++;
        continue;
      }
      // A number narrows candidates before any expensive text normalization.
      const numberTerms = q.terms.filter(term => /^\d+[a-z]?$/.test(term));
      const useIndex = !numberTerms.length && q.valid && !q.number && data.mode !== 'latin'
        && !(data.savedOnly && !q.valid) && dataset.indexTokens;
      const candidates = numberTerms.length
        ? numberTerms.map(term => dataset.byNumber.get(term) || []).sort((a, b) => a.length - b.length)[0]
        : useIndex ? candidatesFromIndex(dataset, q) : dataset.rows;
      let sourceMatches = [];
      for (let i = 0; i < candidates.length; i++) {
        if (i && i % 250 === 0) {
          await new Promise(resolve => setTimeout(resolve, 0));
          if (currentRequest !== data.request) return;
        }
        const row = candidates[i];
        if (data.savedOnly && !saved.has(row.item.id)) continue;
        if (dataset.indexDf && data.mode === 'latin' && !q.df) { q.df = dataset.indexDf; q.total = dataset.total; }
        // Build text only when needed, and retain it for later queries.
        let relevance;
        if (data.savedOnly && !q.valid) relevance = 1;
        else if (data.mode === 'latin') relevance = engine.scoreLatin(row, q);
        else if (q.number) relevance = 1000;
        else {
          if (!row.prepared) row.prepared = engine.prepare(row.item);
          relevance = engine.score(row.prepared, q);
        }
        if (relevance) sourceMatches.push({ item: row.item, score: relevance });
      }
      // Buang duplikat di dalam satu berkas (mis. Nasa'i punya 50 teks kembar).
      const uniqueSource = engine.dedupe
        ? engine.dedupe(sourceMatches).matches
        : sourceMatches;
      sourceMatches = uniqueSource;
      dataset.cachedQuery = cacheKey;
      dataset.cachedMatches = sourceMatches;
      for (const match of sourceMatches) matches.push(match);
      complete++;
    }
    // Cadangan salah ketik: hanya bila pencarian persis benar-benar kosong.
    // Pencarian normal tidak pernah menyentuh jalur ini.
    let fuzzy = false;
    let corrected = false;
    let suggestion = '';
    const eligible = !data.savedOnly && !q.number && !q.isArabic && q.valid
      && data.mode !== 'latin' && q.terms.length && q.terms.every((term) => term.length >= 4);
    // 1) Salah ketik huruf dobel: "sholaat" → "sholat" (hasilnya bisa persis).
    if (!matches.length && eligible) {
      const collapsed = engine.collapseDoubles(data.query);
      if (collapsed && collapsed !== String(data.query || '').trim().toLowerCase()) {
        const correctedQuery = engine.parse(collapsed);
        if (correctedQuery.valid && !correctedQuery.isArabic) {
          for (const dataset of loaded.values()) {
            for (const row of dataset.rows) {
              if (!row.prepared) row.prepared = engine.prepare(row.item);
              const score = engine.score(row.prepared, correctedQuery);
              if (score) matches.push({ item: row.item, score });
            }
          }
          if (matches.length) { fuzzy = true; corrected = true; suggestion = collapsed; }
        }
      }
    }
    if (!matches.length && eligible) {
      // Saran dipilih dari kata yang paling sering muncul, bukan yang pertama
      // ditemukan: "sholaat" harus menyarankan "sholat", bukan "shalaah".
      const counts = q.terms.map(() => new Map());
      for (const dataset of loaded.values()) {
        for (const row of dataset.rows) {
          if (!row.prepared) row.prepared = engine.prepare(row.item);
          const score = engine.fuzzyScore(row.prepared, q);
          if (!score) continue;
          matches.push({ item: row.item, score });
          for (let i = 0; i < q.terms.length; i++) {
            const hit = engine.closestToken(row.prepared.text, q.terms[i]);
            if (hit) counts[i].set(hit, (counts[i].get(hit) || 0) + 1);
          }
        }
      }
      if (matches.length) {
        fuzzy = true;
        suggestion = counts.map((map) => {
          let best = '';
          let bestCount = 0;
          for (const [word, count] of map) if (count > bestCount) { best = word; bestCount = count; }
          return best;
        }).filter(Boolean).join(' ');
      }
    }
    const number = item => parseInt(item.number, 10) || Number.MAX_SAFE_INTEGER;
    matches.sort((a, b) => (data.sort === 'number' ? number(a.item) - number(b.item) : b.score - a.score) || a.item.collection.localeCompare(b.item.collection) || number(a.item) - number(b.item) || a.item.id.localeCompare(b.item.id));
    if (currentRequest !== data.request) return;
    // Setelah urut: simpan hanya versi terbaik dari tiap hadits.
    const deduped = engine.dedupe ? engine.dedupe(matches) : { matches, removed: 0 };
    // Ambang relevansi: buang hasil yang skornya jauh di bawah hasil terbaik
    // agar kata umum tidak membanjiri daftar. Tidak berlaku untuk nomor/latin.
    let finalMatches = deduped.matches;
    if (data.mode !== 'latin' && !q.number && finalMatches.length > 12) {
      const top = finalMatches[0].score;
      const cut = Math.max(320, Math.round(top * 0.5));
      const kept = finalMatches.filter((match) => match.score >= cut);
      if (kept.length) finalMatches = kept;
    }
    lastSearch = { request: data.request, query: data.query, mode: data.mode, matches: finalMatches,
      removed: deduped.removed, fuzzy, corrected, suggestion };
    resultsPage(lastSearch, 0);
  } catch (error) {
    if (currentRequest === data.request) postMessage({ type: 'error', request: data.request, message: error.message });
  }
};
