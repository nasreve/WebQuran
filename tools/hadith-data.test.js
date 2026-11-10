// Integritas data hadits setelah dedup: tidak ada isi yang hilang.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const engine = require('../js/hadith-engine.js');
const read = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/^\uFEFF/, ''));
const catalog = read('data/hadith/catalog.json');

test('setiap sumber kitab menunjuk berkas yang benar-benar ada', () => {
  for (const source of catalog.sources) {
    assert.ok(fs.existsSync(path.join(ROOT, source.file)), source.id + ' → ' + source.file + ' tidak ada');
  }
});

test('9-Imam memakai berkas unik dan jumlah barisnya cocok dengan catalog', () => {
  const nine = catalog.sources.find((s) => s.id === 'kitab-9-imam');
  assert.match(nine.file, /kitab-9-imam-unik\.json$/, 'catalog harus menunjuk berkas unik');
  const rows = read(nine.file);
  assert.equal(rows.length, nine.rows, 'catalog.rows harus sama dengan isi berkas');
  assert.ok(rows.length > 45000, 'isi unik tidak boleh menyusut drastis');
  // Berkas asli tetap disimpan untuk pembangunan ulang, tapi tidak dipakai runtime.
  assert.ok(fs.existsSync(path.join(ROOT, 'data/hadith/kitab-9-imam.json')), 'berkas asli harus tetap ada');
});

test('sidecar metadata mencakup baris yang digabung, tanpa id dari berkas unik', () => {
  assert.ok(catalog.search_extra, 'catalog.search_extra harus terisi');
  const extra = read(catalog.search_extra);
  const ids = Object.keys(extra);
  assert.ok(ids.length > 10000, 'entri sidecar terlalu sedikit: ' + ids.length);
  const nine = read('data/hadith/kitab-9-imam-unik.json');
  const unikIds = new Set(nine.map((item) => item.id));
  const overlap = ids.filter((id) => unikIds.has(id));
  assert.equal(overlap.length, 0, 'sidecar tidak boleh menunjuk baris yang masih ada di berkas unik');
  for (const id of ids.slice(0, 50)) {
    const entry = extra[id];
    assert.ok(entry && (entry.m || entry.n), 'entri ' + id + ' harus berisi metadata');
  }
});

test('prepare memakai metadata sidecar untuk pencarian, bukan untuk tampilan', () => {
  const item = {
    id: 'x', title: 'Judul', collection: 'Koleksi', number: '1', reference: 'Ref',
    arabic: 'نص عربي طويل بما يكفي', translation: 'terjemahan',
  };
  const plain = engine.prepare(item);
  assert.equal(plain.text.includes('kata-kata sidecar'), false);

  const withExtra = engine.prepare({ ...item, searchExtra: 'Kata-kata sidecar', searchNumbers: '999' });
  assert.ok(withExtra.text.includes('kata kata sidecar'), 'teks sidecar harus ikut dicari');
  assert.ok(withExtra.numbers.includes('999'), 'nomor sidecar harus ikut dicari');
  // Tampilan tetap memakai field asli.
  assert.equal(item.title, 'Judul');
});
