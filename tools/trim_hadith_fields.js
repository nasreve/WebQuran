#!/usr/bin/env node
/**
 * Buang field yang tidak dibutuhkan dari berkas paket hadits.
 *
 *  A. `reading_url`  — folder `data/hadith/reading/` tidak pernah ikut paket,
 *                      jadi tautannya selalu 404 (±6,9 MB).
 *  B. `source_id` / `source_group` — nilainya sudah diketahui dari catalog;
 *                      worker mengisinya kembali saat memuat (±4,7 MB).
 *
 * `source_path`, `notes`, dan `arabic_images` TETAP dipertahankan karena
 * dipakai tampilan detail.
 *
 * Pemakaian: npm run build:hadith-trim
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const CATALOG = path.join(ROOT, 'data/hadith/catalog.json');
const DROP = ['reading_url', 'source_id', 'source_group'];

function main() {
  const catalog = JSON.parse(fs.readFileSync(CATALOG, 'utf8').replace(/^\uFEFF/, ''));
  let saved = 0;
  let rows = 0;

  for (const source of catalog.sources) {
    const file = path.join(ROOT, source.file);
    if (!fs.existsSync(file)) { console.log('lewat', source.id); continue; }
    const before = fs.statSync(file).size;
    const items = JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
    for (const item of items) {
      for (const field of DROP) delete item[field];
    }
    rows += items.length;
    const body = '[' + items.map((item) => JSON.stringify(item)).join(',\n') + ']';
    fs.writeFileSync(file, body, 'utf8');
    const after = Buffer.byteLength(body, 'utf8');
    saved += Math.max(0, before - after);
    source.bytes = after;
    console.log(`${source.id.padEnd(30)} ${items.length.toString().padStart(6)} baris  ${(before / 1048576).toFixed(1)} → ${(after / 1048576).toFixed(1)} MB`);
  }

  fs.writeFileSync(CATALOG, JSON.stringify(catalog, null, 2) + '\n', 'utf8');
  console.log('---');
  console.log(`${rows} baris diproses, hemat ${(saved / 1048576).toFixed(2)} MB`);
}

main();
