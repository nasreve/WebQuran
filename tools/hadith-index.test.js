// Indeks pencarian: worker memakainya, dan hasilnya sama dengan pindai penuh.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const engine = require('../js/hadith-engine.js');
const zlib = require('node:zlib');

const ROOT = path.resolve(__dirname, '..');
const read = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/^\uFEFF/, ''));
const readIndex = (rel) => {
  const file = path.join(ROOT, rel);
  const buffer = fs.readFileSync(file);
  return JSON.parse(rel.endsWith('.gz') ? zlib.gunzipSync(buffer).toString('utf8') : buffer.toString('utf8'));
};

function harness(items, index) {
  const messages = [];
  const ctx = {
    self: { HadithSearchEngine: engine, location: { href: 'http://localhost/js/hadith-worker.js' } },
    importScripts() {}, postMessage: (m) => messages.push(m), URL, setTimeout,
    fetch: async (url) => {
      const name = String(url.pathname || url);
      if (name.includes('/index/')) return { ok: true, json: async () => index };
      return { ok: true, json: async () => items };
    },
  };
  vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'js/hadith-worker.js'), 'utf8'), ctx);
  return { ctx, messages };
}

const item = (id, translation, number) => ({
  id, title: '', collection: 'A', number: String(number), arabic: '', translation, reference: '',
});

test('worker memakai indeks dan menemukan hasil yang sama', async () => {
  const items = [item('a', 'Sabar adalah bagian dari iman', 1), item('b', 'Puasa itu perisai', 2)];
  const index = { v: 1, count: 2, tokens: { sabar: [0], puasa: [1] } };
  const { ctx, messages } = harness(items, index);
  const sources = [{ id: 'a', group: 'kitab', file: 'a.json', index: 'data/hadith/index/a.json', label: 'A' }];

  await ctx.self.onmessage({ data: { type: 'search', request: 1, query: 'sabar', mode: 'text', group: 'kitab', sources } });
  const result = messages.at(-1);
  assert.equal(result.type, 'results');
  assert.equal(result.total, 1);
  assert.equal(result.items[0].id, 'a');

  await ctx.self.onmessage({ data: { type: 'search', request: 2, query: 'zakat', mode: 'text', group: 'kitab', sources } });
  assert.equal(messages.at(-1).total, 0, 'kata yang tidak ada di indeks tidak menghasilkan apa pun');
});

test('indeks yang tidak cocok dengan data diabaikan (fallback pindai penuh)', async () => {
  const items = [item('a', 'Sabar adalah bagian dari iman', 1)];
  const index = { v: 1, count: 999, tokens: { sabar: [0] } };   // count salah
  const { ctx, messages } = harness(items, index);
  const sources = [{ id: 'a', group: 'kitab', file: 'a.json', index: 'data/hadith/index/a.json', label: 'A' }];
  await ctx.self.onmessage({ data: { type: 'search', request: 1, query: 'sabar', mode: 'text', group: 'kitab', sources } });
  assert.equal(messages.at(-1).total, 1, 'fallback harus tetap menemukan hasil');
});

test('setiap sumber kitab punya berkas indeks dengan jumlah baris yang cocok', () => {
  const catalog = read('data/hadith/catalog.json');
  for (const source of catalog.sources) {
    const file = path.join(ROOT, source.file);
    if (!fs.existsSync(file)) continue;
    assert.ok(source.index, source.id + ' belum punya field index');
    const index = readIndex(source.index);
    const rows = read(source.file).length;
    assert.equal(index.count, rows, source.id + ': jumlah baris indeks tidak cocok');
    assert.ok(Object.keys(index.tokens).length > 0, source.id + ': indeks kosong');
  }
});


test('tanda konsonan Latin dari indeks dipakai untuk pencarian transliterasi', async () => {
  const arabic = 'صَلَاةُ الْجَمَاعَةِ أَفْضَلُ مِنْ صَلَاةِ الْفَذِّ';
  const items = [{ id: 'a', title: '', collection: 'A', number: '1', arabic, translation: 'Salat berjamaah', reference: '' }];
  const index = { v: 1, count: 1, tokens: { slt: [0] }, latin: [engine.phoneticTokens(arabic, true).join(' ')] };
  const { ctx, messages } = harness(items, index);
  const sources = [{ id: 'a', group: 'kitab', file: 'a.json', index: 'data/hadith/index/a.json', label: 'A' }];
  await ctx.self.onmessage({ data: { type: 'search', request: 1, query: 'shalatu jamaah', mode: 'latin', group: 'kitab', sources } });
  const result = messages.at(-1);
  assert.equal(result.type, 'results');
  assert.equal(result.total, 1, 'frasa Latin harus menemukan hadits lewat indeks');
});
