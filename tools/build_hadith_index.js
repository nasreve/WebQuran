#!/usr/bin/env node
/**
 * Bangun indeks pencarian hadits (token → nomor baris).
 *
 * Tujuan: pencarian pertama tidak perlu menormalkan seluruh kitab. Worker
 * memakai indeks untuk menyaring kandidat, lalu hanya menyiapkan baris yang
 * benar-benar cocok.
 *
 * Keluaran: data/hadith/index/<id>.json
 *   { "v": 1, "id": "...", "count": N, "tokens": { "sabar": [12, 44, ...], ... } }
 *
 * Pemakaian: npm run build:hadith-index
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const HADITH = path.join(ROOT, 'data/hadith');
const OUT_DIR = path.join(HADITH, 'index');
const engine = require(path.join(ROOT, 'js/hadith-engine.js'));

const zlib = require('zlib');

const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
// Indeks besar di-gzip: paket lebih kecil, sedangkan berkas per-kitab tetap
// JSON biasa agar pencarian pertama tetap cepat (dekompresi menambah ±80 ms).
const GZIP_ABOVE = 6 * 1048576;   // Bukhari (±5 MB) tetap JSON agar jalur default tercepat

function main() {
  const catalog = readJson(path.join(HADITH, 'catalog.json'));
  const extra = catalog.search_extra && fs.existsSync(path.join(ROOT, catalog.search_extra))
    ? readJson(path.join(ROOT, catalog.search_extra))
    : {};
  fs.mkdirSync(OUT_DIR, { recursive: true });

  for (const source of catalog.sources) {
    const file = path.join(ROOT, source.file);
    if (!fs.existsSync(file)) continue;
    const items = readJson(file);
    const tokens = Object.create(null);
    for (let index = 0; index < items.length; index++) {
      const item = items[index];
      const entry = extra[item.id];
      const text = [
        engine.normalize(item.title),
        engine.normalize(item.collection),
        engine.normalize([item.translation, item.arabic].join(' ')),
        engine.normalize(item.reference),
        entry && entry.m ? engine.normalize(entry.m) : '',
      ].join(' ');
      for (const token of new Set(text.split(' ').filter(Boolean))) {
        (tokens[token] || (tokens[token] = [])).push(index);
      }
    }
    // Tanda konsonan per kata untuk pencarian transliterasi. Dihitung sekali
    // di sini supaya pencarian Latin pertama tidak menormalkan seluruh kitab.
    const latin = items.map((item) => engine.phoneticTokens(item.arabic || '', true).join(' '));
    // Document frequency: berapa hadits memuat tiap kata. Dipakai untuk
    // memberi bobot lebih besar pada kata langka (peringkat kata).
    const df = Object.create(null);
    for (const entry of latin) {
      for (const word of new Set(entry.split(' ').filter(Boolean))) {
        df[word] = (df[word] || 0) + 1;
      }
    }
    const payload = { v: 1, id: source.id, count: items.length, tokens, latin, df };
    const json = JSON.stringify(payload);
    const gzip = Buffer.byteLength(json) > GZIP_ABOVE;
    const out = path.join(OUT_DIR, source.id + (gzip ? '.json.gz' : '.json'));
    fs.writeFileSync(out, gzip ? zlib.gzipSync(json, { level: 9 }) : json);
    const mb = fs.statSync(out).size / 1048576;
    console.log(`${source.id.padEnd(30)} ${items.length.toString().padStart(6)} baris  ${Object.keys(tokens).length.toString().padStart(7)} token  ${mb.toFixed(2)} MB${gzip ? ' (gzip)' : ''}`);
    source.index = 'data/hadith/index/' + source.id + (gzip ? '.json.gz' : '.json');
  }

  fs.writeFileSync(path.join(HADITH, 'catalog.json'), JSON.stringify(catalog, null, 2) + '\n', 'utf8');
  console.log('catalog: field index ditambahkan');
}

main();
