// H3 — morfologi Arab ringan & alias ejaan Latin.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const engine = require('../js/hadith-engine.js');

const hadith = (arabic, translation, over = {}) => Object.assign({
  id: 'x', collection: 'Shahih Bukhari', number: '1', title: '', reference: '', translation,
}, { arabic }, over);

const prepared = (item) => engine.prepare(item);

test('kata Arab berimbuhan menemukan bentuk dasarnya', () => {
  const sabar = hadith('إِنَّ اللَّهَ مَعَ الصَّابِرِينَ', 'Sesungguhnya Allah bersama orang-orang sabar');
  const sabarDasar = hadith('وَاصْبِرْ عَلَى الصَّبْرِ', 'Bersabarlah atas kesabaran');
  // "الصابرين" → "صابر" (isim fa'il), "الصبر" → "صبر" (mashdar).
  for (const query of ['الصابرين', 'صابر']) {
    assert.ok(engine.score(prepared(sabar), engine.parse(query)) > 0, query + ' harus menemukan الصابرين');
  }
  for (const query of ['الصبر', 'صبر']) {
    assert.ok(engine.score(prepared(sabarDasar), engine.parse(query)) > 0, query + ' harus menemukan الصبر');
  }
});

test('bentuk berimbuhan tidak cocok dengan kata yang tidak berkaitan', () => {
  const item = hadith('أَقِمِ الصَّلَاةَ', 'Dirikanlah salat');
  assert.equal(engine.score(prepared(item), engine.parse('الصابرين')), 0, 'tidak boleh cocok ke salat');
});

test('cocok lewat varian diberi skor lebih rendah daripada kata persis', () => {
  const exact = hadith('الصابرين', 'Orang-orang sabar');
  const variant = hadith('صبر', 'Sabar');
  const q = engine.parse('الصابرين');
  const exactScore = engine.score(prepared(exact), q);
  const variantScore = engine.score(prepared(variant), q);
  assert.ok(exactScore > variantScore, `persis (${exactScore}) harus di atas varian (${variantScore})`);
});

test('alias ejaan Latin menyamakan hasil dengan bentuk baku', () => {
  const items = [
    hadith('', 'Allah Maha Pengasih'),
    hadith('', 'Bersyukurlah kepada Allah'),
    hadith('', 'Salat lima waktu'),
  ];
  const rows = items.map(prepared);
  const count = (query) => rows.filter((row) => engine.score(row, engine.parse(query)) > 0).length;
  assert.equal(count('alloh'), count('allah'), 'alloh harus sama dengan allah');
  assert.equal(count('sholat'), count('salat'), 'sholat harus sama dengan salat');
  assert.ok(count('alloh') >= 2);
});

test('alias tidak mengubah kata yang hanya mirip', () => {
  // "alloh" tidak boleh memotong kata lain; normalisasi memakai batas kata.
  assert.notEqual(engine.normalize('allohan'), engine.normalize('allahan'));
});

test('morfologi hanya berlaku untuk Arab, Latin tidak berubah', () => {
  const item = hadith('', 'Orang yang beriman dan bersabar');
  const q = engine.parse('sabar');
  assert.ok(engine.score(prepared(item), q) > 0);
  assert.deepEqual(q.alternatives, [['sabar']], 'kueri Latin tidak punya varian');
});
