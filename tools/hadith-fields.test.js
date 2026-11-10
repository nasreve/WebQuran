// Berkas paket sudah dirampingkan: field identitas & tautan mati tidak lagi dibawa.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const E = require('../js/hadith-engine.js');

const ROOT = path.resolve(__dirname, '..');
const read = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/^\uFEFF/, ''));
const catalog = read('data/hadith/catalog.json');

const DROPPED = ['reading_url', 'source_id', 'source_group', 'arabic_images'];

test('berkas paket tidak lagi memuat field yang dibuang', () => {
  for (const source of catalog.sources) {
    const file = path.join(ROOT, source.file);
    if (!fs.existsSync(file)) continue;
    const items = read(source.file);
    assert.ok(items.length > 0, source.id + ' kosong');
    const sample = items.slice(0, 200);
    for (const field of DROPPED) {
      const found = sample.filter((item) => field in item).length;
      assert.equal(found, 0, `${source.id}: field ${field} masih ada di ${found} baris contoh`);
    }
    // Field tampilan tetap harus ada.
    for (const field of ['id', 'title', 'collection', 'number', 'arabic', 'translation', 'reference']) {
      assert.ok(sample.every((item) => field in item), `${source.id}: field ${field} hilang`);
    }
  }
});

test('catalog.bytes cocok dengan ukuran berkas di disk', () => {
  for (const source of catalog.sources) {
    const file = path.join(ROOT, source.file);
    if (!fs.existsSync(file)) continue;
    assert.equal(source.bytes, fs.statSync(file).size, source.id + ': bytes di catalog tidak cocok');
  }
});

test('isi penting tidak ikut terbuang (Arab, terjemahan, rujukan)', () => {
  const items = read('data/hadith/kitab-shahih-bukhari.json');
  assert.ok(items.length > 6000, 'jumlah hadits Bukhari menyusut');
  const withArabic = items.filter((item) => item.arabic && item.arabic.length > 0).length;
  const withTranslation = items.filter((item) => item.translation && item.translation.length > 0).length;
  assert.equal(withArabic, items.length, 'setiap baris harus tetap punya teks Arab');
  assert.equal(withTranslation, items.length, 'setiap baris harus tetap punya terjemahan');
});

test('worker mengisi kembali identitas sumber yang tidak ada di berkas', async () => {
  const messages = [];
  const item = {
    id: 'a1', number: '1', title: 'Niat', collection: 'A',
    arabic: 'إِنَّمَا الأَعْمَالُ بِالنِّيَّاتِ', translation: 'Amal bergantung niat',
    reference: '', arabic_images: [],
  };
  const ctx = {
    self: { HadithSearchEngine: E, location: { href: 'http://localhost/js/hadith-worker.js' } },
    importScripts() {}, postMessage: (m) => messages.push(m), URL, setTimeout,
    fetch: async () => ({ ok: true, json: async () => [item] }),
  };
  vm.runInNewContext(fs.readFileSync(require.resolve('../js/hadith-worker.js'), 'utf8'), ctx);
  await ctx.self.onmessage({ data: { type: 'search', request: 1, query: 'niat', mode: 'text', group: 'kitab',
    sources: [{ id: 'a', group: 'kitab', file: 'a.json', label: 'A' }] } });
  const result = messages.at(-1);
  assert.equal(result.type, 'results');
  assert.equal(result.total, 1);
  assert.equal(result.items[0].source_id, 'a', 'source_id harus diisi dari catalog');
  assert.equal(result.items[0].source_group, 'kitab', 'source_group harus diisi dari catalog');
});
test('tidak ada lagi hadits bergambar maupun asetnya', () => {
  assert.equal(fs.existsSync(path.join(ROOT, 'data/hadith/assets')), false, 'folder aset gambar harus sudah dihapus');
  const qudsi = catalog.sources.find((s) => s.id === 'kitab-himpunan-hadits-qudsi');
  assert.equal(qudsi, undefined, 'sumber yang seluruhnya bergambar harus keluar dari catalog');
  for (const source of catalog.sources) {
    const file = path.join(ROOT, source.file);
    if (!fs.existsSync(file)) continue;
    const items = read(source.file);
    assert.equal(items.filter((item) => Array.isArray(item.arabic_images) && item.arabic_images.length).length, 0, source.id + ' masih punya gambar');
  }
});