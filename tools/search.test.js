const { test, before } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const engine = require('../js/search-engine');
const root = path.resolve(__dirname, '..');

const elements = new Map();
function element(id) {
  if (!elements.has(id)) elements.set(id, {
    value: '', innerHTML: '', innerText: '', style: {}, dataset: {},
    classList: { add() {}, remove() {}, contains() { return false; } },
    focus() {}, remove() {}, insertAdjacentHTML(position, html) { this.innerHTML += html; }
  });
  return elements.get(id);
}
const context = vm.createContext({
  console, setTimeout, clearTimeout, addEventListener() {},
  localStorage: { getItem() { return null; }, setItem() {} },
  document: { addEventListener() {}, getElementById: element, querySelector() { return null; }, querySelectorAll() { return []; } }
});
context.window = context;
const run = source => vm.runInContext(source, context);
let index;
before(async () => {
  for (const file of ['app', 'quran-data', 'data', 'utils', 'search-engine', 'fileSystem', 'search', 'omnibar']) {
    vm.runInContext(fs.readFileSync(path.join(root, 'js', file + '.js'), 'utf8'), context, { filename: file + '.js' });
  }
  await run('autoLoadData()');
  index = run('searchIndex');
});
const search = (q, mode = 'latin') => engine.search(index, q, mode);
const has = (results, s, a) => results.some(r => r.item.surah_id === s && r.item.ayah === a);
const fixture = (text, mode, ayah) => ({ surah_id: 1, ayah, [mode === 'latin' ? 'latinSearch' : 'translationSearch']: engine.prepare(text, mode) });

test('full built-in index is published with both search fields', () => {
  assert.equal(index.length, 6236);
  assert.equal(run('searchDataReady'), true);
  assert.ok(index.every(v => v.latinSearch && v.translationSearch));
});

test('common Latin spelling, vowels, apostrophes, spaces and diacritics', () => {
  for (const q of ['yasalunaka', 'YAS’ALŪNAKA']) assert.ok(has(search(q), 2, 219), q);
  for (const q of ['ya ayyuhalladzina amanu', 'yaa ayyuhalladhina aamanu', 'yā ayyuhal-lażīna āmanū']) {
    assert.ok(has(search(q), 2, 183), q);
  }
  assert.ok(has(search('bismillaahirrahmaanirrahiim'), 1, 1));
  assert.equal(search('qul huwallahu ahad')[0].item.surah_id, 112);
});

test('optional endings do not break a phrase crossing words', () => {
  const items = [fixture('Qul aḥad(un), allāh.', 'latin', 1)];
  assert.equal(engine.search(items, 'ahad allah', 'latin').length, 1);
  assert.equal(engine.search(items, 'ahadun allah', 'latin').length, 1);
});

test('exact phrases outrank scattered keywords and alternate spellings', () => {
  const items = [fixture('amin jauh tuhan', 'latin', 1), fixture('āmin Tuhan', 'latin', 2), fixture('aamiin tuhan', 'latin', 3)];
  assert.deepEqual(engine.search(items, 'amin tuhan', 'latin').map(r => r.item.ayah), [2, 3, 1]);
  const translations = [fixture('sabar serta banyak salat', 'translation', 1), fixture('dengan sabar dan salat', 'translation', 2)];
  assert.deepEqual(engine.search(translations, 'sabar dan salat', 'translation').map(r => r.item.ayah), [2]);
  assert.equal(engine.search(translations, 'sabar salat', 'translation').length, 2);
});

test('translation boundaries reject unrelated substrings but accept affixes', () => {
  const items = ['Bagaimana keadaanmu', 'Orang beriman', 'Iman kepada Allah', 'Keimanan mereka'].map((s, i) => fixture(s, 'translation', i + 1));
  assert.deepEqual(engine.search(items, 'iman', 'translation').map(r => r.item.ayah), [3, 2, 4]);
  assert.ok(has(search('puasa', 'translation'), 2, 183));
  assert.ok(!search('iman', 'translation').some(r => r.item.surah_id === 105 && r.item.ayah === 1));
  const water = ['airnya jernih', 'cair'].map((s, i) => fixture(s, 'translation', i + 1));
  assert.deepEqual(engine.search(water, 'air', 'translation').map(r => r.item.ayah), [1]);
});

test('translation punctuation, footnotes and common spelling aliases', () => {
  assert.ok(has(search('Tuhan semesta alam', 'translation'), 1, 2));
  assert.ok(has(search('"maha pengasih",', 'translation'), 1, 1));
  for (const [a, b] of [['shalat', 'salat'], ['rejeki', 'rezeki'], ['taqwa', 'takwa']]) {
    assert.deepEqual(search(a, 'translation').map(r => r.item.surah_id + ':' + r.item.ayah), search(b, 'translation').map(r => r.item.surah_id + ':' + r.item.ayah));
    assert.ok(search(a, 'translation').length > 0);
  }
});

test('empty or punctuation-only queries cannot match the entire index', () => {
  for (const mode of ['latin', 'translation']) {
    for (const q of ['', '  ', '!!!', 'a', 'a b', '()---']) assert.equal(search(q, mode).length, 0);
    assert.equal(search('zzzzqqqqnotaword', mode).length, 0);
  }
});

test('highlights follow alternate spelling and safely preserve original text', () => {
  for (const [text, q, mode] of [
    ['Yā ayyuhal-lażīna āmanū', 'ya ayyuhalladzina amanu', 'latin'],
    ['aamiin tuhan', 'amin tuhan', 'latin'],
    ['Qul aḥad(un), allāh.', 'ahad allah', 'latin'],
    ['Beriman & salat <img src=x>', 'iman shalat', 'translation']
  ]) {
    const html = engine.highlight(text, q, mode);
    assert.ok(html.includes('<mark class="search-highlight">'), html);
    assert.equal(html.replace(/<\/?mark(?: class="search-highlight")?>/g, ''), engine.escape(text));
    assert.ok(!html.includes('<img'));
  }
  assert.equal(engine.highlight('bagaimana', 'iman', 'translation'), 'bagaimana');
});

test('drawer paginates beyond 60 without truncating total results', () => {
  run("performTranslationSearch('Allah')");
  const total = run('searchResultPage.matches.length');
  assert.ok(total > 60);
  assert.equal(run('searchResultPage.shown'), 60);
  run('showMoreSearchResults()');
  assert.equal(run('searchResultPage.shown'), 120);
  assert.equal(Number(element('sdBadgeCount').innerText), total);
  const keys = [...element('searchDrawerResults').innerHTML.matchAll(/data-ayah-key="([^"]+)"/g)].map(m => m[1]);
  assert.equal(new Set(keys).size, 120);
});

test('clearing cancels pending input and resets count and status', async () => {
  run("searchDrawerTab = 'translation'; handleDrawerSearchInput({target: {value: 'surga'}}); clearSearchDrawerInput()");
  await new Promise(resolve => setTimeout(resolve, 150));
  assert.equal(run('searchResultPage'), null);
  assert.equal(element('sdBadgeCount').style.display, 'none');
  assert.match(element('searchDrawerResults').innerHTML, /Belum ada pencarian/);
});

test('switching tabs cancels a pending search from the previous input', async () => {
  element('sdSearchInput').value = 'qul huwallahu ahad';
  run("handleDrawerSearchInput({target: {value: 'surga'}}); switchSearchDrawerTab('latin')");
  await new Promise(resolve => setTimeout(resolve, 150));
  assert.equal(run('searchResultPage.query'), 'qul huwallahu ahad');
  assert.equal(run('searchResultPage.matches[0].item.surah_id'), 112);
});

test('sidebar deletion replaces an old query even when the drawer was closed', () => {
  element('sdSearchInput').value = 'surga';
  run("searchDrawerOpen = false; handleTranslationSearch({target: {value: ''}})");
  assert.equal(element('sdSearchInput').value, '');
  assert.equal(run('searchResultPage'), null);
  run("handleLatinSearch({target: {value: 'yasalunaka'}})");
  assert.equal(run('searchResultPage.query'), 'yasalunaka');
  assert.equal(run('searchResultPage.type'), 'latin');
  run('searchDrawerOpen = false');
});

test('active translation changes rebuild search, use fallback and restore default', async () => {
  run("customTranslations = {'1:1': 'Contoh kosakataunik untuk pencarian'}; refreshCurrentView()");
  assert.equal(search('kosakataunik', 'translation')[0].item.surah_id, 1);
  assert.ok(has(search('Tuhan semesta alam', 'translation'), 1, 2));
  for (const version of ['kemenag_2002', 'kemenag_lama', 'default']) {
    await run('changeTranslation(' + JSON.stringify(version) + ')');
    const expected = run("cleanTranslation(customTranslations['1:1'] || QURAN_DATA.surahs[0][0].translation)");
    assert.equal(index[0].translation, expected);
  }
  assert.equal(search('kosakataunik', 'translation').length, 0);
});

test('omnibar searches Latin and translation without missing translation errors', () => {
  for (const q of ['yasalunaka', 'ya ayyuhalladzina amanu', 'puasa']) {
    const results = run('parseOmnibarQuery(' + JSON.stringify(q) + ')').filter(r => r.type === 'verse_search_match');
    assert.ok(results.length > 0, q);
    assert.ok(results.every(r => typeof r.subtitle === 'string'));
    const keys = results.map(r => r.surahId + ':' + r.ayahNo);
    assert.equal(new Set(keys).size, keys.length);
  }
});

test('search waits for complete indexing and refreshes the open drawer', async () => {
  run("searchDataReady = false; searchDrawerOpen = true; searchDrawerTab = 'translation'");
  element('sdSearchInput').value = 'puasa';
  run("performTranslationSearch('puasa')");
  assert.equal(run('searchResultPage'), null);
  assert.match(element('sdStatusSubtext').innerText, /Menyiapkan/);
  await run('autoLoadData()');
  assert.equal(run('searchIndex.length'), 6236);
  assert.ok(run('searchResultPage.matches.length') > 0);
});
