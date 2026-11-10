// H3b — toleransi salah ketik Latin (fallback saat hasil persis kosong).
const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const engine = require('../js/hadith-engine.js');

const hadith = (translation, arabic = '') => ({
  id: 'x', collection: 'Shahih Bukhari', number: '1', title: '', reference: '', translation, arabic,
});
const prepared = (item) => engine.prepare(item);

test('jarak edit menghitung salah ketik sederhana', () => {
  assert.equal(engine.editDistance('sabar', 'sabar'), 0);
  assert.equal(engine.editDistance('sabarr', 'sabar'), 1);
  assert.equal(engine.editDistance('sabbr', 'sabar'), 1);
  assert.equal(engine.editDistance('sbr', 'sabar'), 2);
  assert.ok(engine.editDistance('kucing', 'sabar') > 1);
});

test('fuzzyScore hanya aktif untuk Latin dan kata ≥4 huruf', () => {
  const row = prepared(hadith('Sabar adalah bagian dari iman'));
  assert.ok(engine.fuzzyScore(row, engine.parse('sabarr')) > 0);
  assert.equal(engine.fuzzyScore(row, engine.parse('sbr')), 0, 'kata 3 huruf tidak difuzikan');
  const arabicRow = prepared(hadith('Orang sabar', 'الصابرين'));
  assert.equal(engine.fuzzyScore(arabicRow, engine.parse('الصابرين')), 0, 'kueri Arab tidak lewat jalur fuzzy');
});

test('kata yang tidak mirip tidak lolos', () => {
  const row = prepared(hadith('Sabar adalah bagian dari iman'));
  assert.equal(engine.fuzzyScore(row, engine.parse('kucing')), 0);
  assert.equal(engine.fuzzyScore(row, engine.parse('zakat')), 0);
});

test('huruf dobel dikoreksi sebelum fuzzy', () => {
  assert.equal(engine.collapseDoubles('sholaat'), 'sholat');
  assert.equal(engine.collapseDoubles('puaasa'), 'puasa');
  assert.equal(engine.collapseDoubles('sabar'), 'sabar');
});

test('closestToken memberi saran kata yang benar', () => {
  const row = prepared(hadith('Sabar adalah bagian dari iman'));
  assert.equal(engine.closestToken(row.text, 'sabarr'), 'sabar');
  assert.equal(engine.closestToken(row.text, 'kucing'), '');
});

test('worker memberi hasil mirip hanya bila pencarian persis kosong', async () => {
  const items = [hadith('Sabar adalah bagian dari iman'), hadith('Puasa itu perisai')];
  const messages = [];
  const ctx = {
    self: { HadithSearchEngine: engine, location: { href: 'http://localhost/js/hadith-worker.js' } },
    importScripts() {}, postMessage: (m) => messages.push(m), URL, setTimeout,
    fetch: async () => ({ ok: true, json: async () => items }),
  };
  vm.runInNewContext(fs.readFileSync(require.resolve('../js/hadith-worker.js'), 'utf8'), ctx);
  const sources = [{ id: 'a', group: 'kitab', file: 'a.json', label: 'A' }];

  // 1. Kueri persis: tanpa flag fuzzy.
  await ctx.self.onmessage({ data: { type: 'search', request: 1, query: 'puasa', mode: 'text', group: 'kitab', sources } });
  const exact = messages.at(-1);
  assert.equal(exact.fuzzy, false, 'hasil persis tidak boleh ditandai fuzzy');
  assert.ok(exact.total >= 1);

  // 2. Salah ketik: hasil mirip + saran.
  await ctx.self.onmessage({ data: { type: 'search', request: 2, query: 'sabarr', mode: 'text', group: 'kitab', sources } });
  const fuzzy = messages.at(-1);
  assert.equal(fuzzy.fuzzy, true, 'harus ditandai fuzzy');
  assert.ok(fuzzy.total >= 1, 'harus ada hasil mirip');
  assert.equal(fuzzy.suggestion, 'sabar');
  assert.equal(fuzzy.corrected, true, 'harus lewat jalur koreksi huruf dobel');
});
