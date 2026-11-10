#!/usr/bin/env node
/**
 * Buang hadits yang datanya hanya berupa gambar.
 *
 * Seluruh 198 hadits seperti ini berasal dari `kitab-himpunan-hadits-qudsi`:
 * teks Arabnya tidak ada, hanya berkas GIF. Karena pencarian teks tidak bisa
 * menjangkaunya dan presentasi bergantung pada gambar, sumber tersebut dibuang
 * seluruhnya beserta asetnya.
 *
 * Pemakaian: npm run build:hadith-drop-images
 * Jalankan SETELAH `build:hadith-dedup` dan `build:hadith-trim`.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const HADITH = path.join(ROOT, 'data/hadith');
const CATALOG = path.join(HADITH, 'catalog.json');
const ASSETS = path.join(HADITH, 'assets');

function isImageOnly(item) {
  const images = Array.isArray(item.arabic_images) ? item.arabic_images : [];
  const arabic = String(item.arabic || '').trim();
  return images.length > 0 && !arabic;
}

function main() {
  const catalog = JSON.parse(fs.readFileSync(CATALOG, 'utf8').replace(/^\uFEFF/, ''));
  const keepSources = [];
  let removedRows = 0;
  let removedFiles = 0;

  for (const source of catalog.sources) {
    const file = path.join(ROOT, source.file);
    if (!fs.existsSync(file)) { keepSources.push(source); continue; }
    const items = JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
    const kept = items.filter((item) => !isImageOnly(item));
    const dropped = items.length - kept.length;
    removedRows += dropped;

    if (!kept.length) {
      // Sumber yang seluruh isinya bergambar: keluarkan dari catalog.
      fs.rmSync(file, { force: true });
      removedFiles++;
      console.log(`${source.id.padEnd(30)} ${items.length.toString().padStart(6)} baris → SELURUHNYA DIBUANG (berkas dihapus)`);
      continue;
    }

    // Tidak ada lagi hadits bergambar: field kosongnya dibuang dari SEMUA baris
    // (±1,6 MB). Berkas selalu ditulis ulang agar idempoten.
    for (const item of kept) delete item.arabic_images;
    const body = '[' + kept.map((item) => JSON.stringify(item)).join(',\n') + ']';
    fs.writeFileSync(file, body, 'utf8');
    source.bytes = Buffer.byteLength(body, 'utf8');
    console.log(`${source.id.padEnd(30)} ${items.length.toString().padStart(6)} baris → ${kept.length} (buang ${dropped})`);
    keepSources.push(source);
  }

  catalog.sources = keepSources;
  fs.writeFileSync(CATALOG, JSON.stringify(catalog, null, 2) + '\n', 'utf8');

  // Buang aset gambar bila tidak ada lagi yang merujuk.
  let assetsRemoved = 0;
  if (fs.existsSync(ASSETS)) {
    assetsRemoved = fs.readdirSync(ASSETS, { recursive: true })
      .filter((name) => fs.statSync(path.join(ASSETS, name)).isFile()).length;
    fs.rmSync(ASSETS, { recursive: true, force: true });
  }

  console.log('---');
  console.log(`hadits bergambar dibuang : ${removedRows}`);
  console.log(`berkas sumber dihapus    : ${removedFiles}`);
  console.log(`aset gambar dihapus      : ${assetsRemoved} berkas`);
}

main();
