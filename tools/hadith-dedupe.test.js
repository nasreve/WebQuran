// Hadith dedupe — satu hadits tidak boleh tampil dua kali, baik karena
// duplikat di dalam satu berkas maupun tumpang tindih antar edisi.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const engine = require('../js/hadith-engine.js');

const item = (over) => Object.assign({
  id: 'x', collection: 'Shahih Bukhari', number: '1',
  arabic: 'إِنَّمَا الْأَعْمَالُ بِالنِّيَّاتِ', translation: 'Sesungguhnya amal itu tergantung niat',
  title: 'Niat',
}, over);

test('teks Arab identik dari sumber berbeda disaring menjadi satu', () => {
  const matches = [
    { item: item({ id: 'a', collection: 'Kitab 9 Imam' }), score: 900 },
    { item: item({ id: 'b', collection: 'Shahih Bukhari' }), score: 800 },
  ];
  const out = engine.dedupe(matches);
  assert.equal(out.matches.length, 1, 'hanya satu yang disimpan');
  assert.equal(out.matches[0].item.id, 'a', 'versi skor tertinggi dipertahankan');
  assert.equal(out.removed, 1);
});

test('harakat dan tatweel tidak membuat hadits dianggap berbeda', () => {
  const a = item({ id: 'a', arabic: 'إِنَّمَا الْأَعْمَالُ بِالنِّيَّاتِ' });
  const b = item({ id: 'b', arabic: 'انما الاعمال بالنيات' });
  const out = engine.dedupe([{ item: a, score: 10 }, { item: b, score: 5 }]);
  assert.equal(out.matches.length, 1, 'normalisasi harus menyatukan keduanya');
});

test('hadits berbeda tetap dipertahankan', () => {
  const matches = [
    { item: item({ id: 'a', arabic: 'إِنَّمَا الْأَعْمَالُ بِالنِّيَّاتِ' }), score: 10 },
    { item: item({ id: 'b', arabic: 'الدِّينُ النَّصِيحَةُ' }), score: 9 },
  ];
  assert.equal(engine.dedupe(matches).matches.length, 2);
});

test('teks Arab pendek/kosong memakai kunci koleksi + nomor', () => {
  const a = item({ id: 'a', arabic: '', collection: 'Sunan Nasa’i', number: '42' });
  const b = item({ id: 'b', arabic: '', collection: 'Sunan Nasa’i', number: '42' });
  const c = item({ id: 'c', arabic: '', collection: 'Sunan Nasa’i', number: '43' });
  const out = engine.dedupe([{ item: a, score: 3 }, { item: b, score: 2 }, { item: c, score: 1 }]);
  assert.equal(out.matches.length, 2, 'nomor 42 kembar disaring, 43 tetap');
});

test('masukan tidak sah tidak membuat fungsi gagal', () => {
  assert.deepEqual(engine.dedupe(null), { matches: [], removed: 0 });
  assert.equal(engine.dedupe([null, { item: null }]).matches.length, 0);
});
