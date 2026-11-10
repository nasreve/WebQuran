#!/usr/bin/env node
/**
 * Build dedup data hadits — versi AMAN.
 *
 * `kitab-9-imam.json` memuat 24% baris yang teks Arabnya sudah ada di berkas
 * per-kitab (±28 MB ganda). Menghapus begitu saja terbukti mengubah ±2% hasil
 * pencarian, karena judul/koleksi/rujukan/nomor baris yang dibuang ikut
 * menyumbang kecocokan. Karena itu metadata tersebut dipindahkan ke
 * `data/hadith/search-extra.json` (kecil, hanya untuk pencarian).
 *
 * Berkas asli TIDAK diubah. Pemakaian: npm run build:hadith-dedup
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const HADITH = path.join(ROOT, 'data/hadith');
const engine = require(path.join(ROOT, 'js/hadith-engine.js'));

const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
// Kunci aman: teks Arab + terjemahan identik. Baris seperti itu benar-benar
// kembar — membuangnya tidak mengubah hasil pencarian; perbedaan judul,
// koleksi, rujukan, dan nomor dipindahkan ke sidecar.
const keyOf = (item) => engine.dedupeKey(item) + '|' + engine.normalize(item.translation);
const RAW_NINE = path.join(HADITH, 'kitab-9-imam.json');
const metadataOf = (item) => [item.title, item.collection, item.reference].filter(Boolean).join(' • ');
const numbersOf = (item) => (String(item.number || '').match(/\d+[a-z]?/g) || []).join(' ');

function main() {
  const catalogPath = path.join(HADITH, 'catalog.json');
  const catalog = readJson(catalogPath);
  const sources = catalog.sources.filter((s) => s.group === 'kitab');
  const nine = sources.find((s) => s.id === 'kitab-9-imam');
  if (!nine) throw new Error('Sumber kitab-9-imam tidak ditemukan di catalog.');

  // 1. Peta kanonik: kunci → item (dari berkas per-kitab).
  const canonical = new Map();
  let perBookRows = 0;
  for (const source of sources) {
    if (source.id === nine.id) continue;
    const items = readJson(path.join(ROOT, source.file));
    perBookRows += items.length;
    for (const item of items) {
      const key = keyOf(item);
      if (!canonical.has(key)) canonical.set(key, item);
    }
  }

  // 2. Saring 9-Imam, pindahkan metadata yang hilang ke sidecar.
  if (!fs.existsSync(RAW_NINE)) {
    throw new Error('Berkas asli 9-Imam tidak ditemukan: ' + RAW_NINE
      + '. Skrip ini butuh berkas asli 62198 baris untuk membangun ulang.');
  }
  const all = readJson(RAW_NINE);
  const kept = [];
  const extra = {};
  // `canonical` HANYA memuat baris per-kitab (sasaran sidecar). Baris unik
  // 9-Imam dicatat di set terpisah agar tidak ikut menjadi sasaran sidecar.
  const seenUnik = new Set(canonical.keys());
  let duplicatePerBook = 0;
  for (const item of all) {
    const key = keyOf(item);
    const target = canonical.get(key);
    if (target) {
      duplicatePerBook++;
      const entry = extra[target.id] || (extra[target.id] = { m: '', n: '' });
      const meta = metadataOf(item);
      if (meta && !entry.m.includes(meta)) entry.m = (entry.m + ' ' + meta).trim();
      const numbers = numbersOf(item);
      if (numbers && !entry.n.includes(numbers)) entry.n = (entry.n + ' ' + numbers).trim();
      continue;
    }
    if (seenUnik.has(key)) continue;   // kembar di dalam 9-Imam sendiri
    seenUnik.add(key);
    kept.push(item);
  }

  // 3. Tulis berkas unik + sidecar.
  const outRel = 'data/hadith/kitab-9-imam-unik.json';
  const outPath = path.join(ROOT, outRel);
  fs.writeFileSync(outPath, '[' + kept.map((item) => JSON.stringify(item)).join(',\n') + ']', 'utf8');

  const extraRel = 'data/hadith/search-extra.json';
  const extraPath = path.join(ROOT, extraRel);
  fs.writeFileSync(extraPath, JSON.stringify(extra), 'utf8');

  // 4. Perbarui catalog: sumber 9-Imam menunjuk berkas unik; semua sumber
  //    membaca sidecar yang sama.
  nine.file = outRel;
  nine.bytes = fs.statSync(outPath).size;
  nine.rows = kept.length;
  catalog.search_extra = extraRel;
  fs.writeFileSync(catalogPath, JSON.stringify(catalog, null, 2) + '\n', 'utf8');

  const mb = (n) => (n / 1048576).toFixed(2);
  console.log(`per-kitab      : ${perBookRows} baris (${canonical.size} kunci unik)`);
  console.log(`9-imam asli    : ${all.length} baris`);
  console.log(`  digabung ke kanonik : ${duplicatePerBook}`);
  console.log(`9-imam unik    : ${kept.length} baris → ${outRel} (${mb(nine.bytes)} MB)`);
  console.log(`sidecar        : ${Object.keys(extra).length} entri → ${extraRel} (${mb(fs.statSync(extraPath).size)} MB)`);
}

main();
