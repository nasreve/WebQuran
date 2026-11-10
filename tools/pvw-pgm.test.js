// F5 · PVW/PGM — uji perilaku dasar tanpa DOM sungguhan.
// Fokus: satu gerbang (resolvePushToAir) dan TAKE tidak pernah menayangkan
// konten yang belum ada di panggung.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');

function makeEl() {
  const classes = new Set();
  return {
    textContent: '',
    title: '',
    disabled: false,
    dataset: {},
    attrs: {},
    classList: {
      add: (name) => classes.add(name),
      remove: (name) => classes.delete(name),
      contains: (name) => classes.has(name),
    },
    setAttribute: function (name, value) { this.attrs[name] = value; },
  };
}

function createHarness(sharedStorage) {
  const elements = new Map([
    ['pvwValue', makeEl()],
    ['pgmValue', makeEl()],
    ['pvwPgmChip', makeEl()],
    ['takeBtn', makeEl()],
    ['primaryActionLabel', makeEl()],
    ['broadcastModeHint', makeEl()],
  ]);
  const toasts = [];
  const pushed = [];
  const storage = sharedStorage || new Map();

  const window = {
    screen: { availWidth: 1920, availHeight: 1080 },
    open: () => ({ closed: false, location: { href: '' } }),
    dispatchEvent: () => {},
    addEventListener: () => {},
  };

  const ctx = vm.createContext({
    window,
    document: {
      getElementById: (id) => elements.get(id) || null,
      querySelectorAll: () => [],
      addEventListener: () => {},
    },
    localStorage: {
      getItem: (key) => (storage.has(key) ? storage.get(key) : null),
      setItem: (key, value) => storage.set(key, String(value)),
    },
    showToast: (message, kind) => toasts.push({ message, kind }),
    setInterval: () => 1,
    clearInterval: () => {},
    fetch: () => Promise.resolve(),
    CustomEvent: class { constructor(name, options) { this.detail = options && options.detail; } },
    console,
  });

  vm.runInContext(fs.readFileSync(path.resolve(__dirname, '../js/presentation.js'), 'utf8'), ctx);

  // Tangkap pemanggilan ke udara tanpa benar-benar mengirim apa pun.
  ctx.pushToPresentation = (arabic, translation, info) => {
    pushed.push({ arabic, translation, info });
    ctx.__markProgram(arabic, translation, info);
  };
  vm.runInContext('__markProgram = function (a, t, i) { programLive = { arabic: a, translation: t, info: i, label: refLabelFromInfo(i), ts: 1 }; }', ctx);

  return { ctx, elements, toasts, pushed, storage };
}

test('resolvePushToAir: nilai eksplisit menang, selain itu ikut mode', () => {
  const { ctx } = createHarness();
  const run = (code) => vm.runInContext(code, ctx);

  run("setBroadcastMode('direct')");
  assert.equal(run('resolvePushToAir()'), true, 'mode langsung: default menayangkan');
  assert.equal(run('resolvePushToAir(false)'), false, 'Muat tetap tidak menayangkan');
  assert.equal(run('resolvePushToAir(true)'), true, 'Show tetap menayangkan');

  run("setBroadcastMode('pvw')");
  assert.equal(run('resolvePushToAir()'), false, 'mode PVW: default hanya ke panggung');
  assert.equal(run('resolvePushToAir(true)'), true, 'goLive eksplisit tetap menayangkan');
});

test('label ayat diambil dari info surat/ayat', () => {
  const { ctx } = createHarness();
  const run = (code) => vm.runInContext(code, ctx);
  assert.equal(run("refLabelFromInfo('QS Al-Baqarah (2) Ayat 255')"), '2:255');
  assert.equal(run("refLabelFromInfo('QS Al-Baqarah (2) Ayat 255-257')"), '2:255-257');
  assert.equal(run("refLabelFromInfo('')"), '—');
});

test('markStagePreview mengisi PVW dan mengaktifkan TAKE saat berbeda dari PGM', () => {
  const { ctx, elements } = createHarness();
  const run = (code) => vm.runInContext(code, ctx);

  run("markStagePreview('arab', 'trans', 'QS Al-Baqarah (2) Ayat 255')");
  assert.equal(elements.get('pvwValue').textContent, '2:255');
  assert.equal(elements.get('pgmValue').textContent, '—');
  assert.equal(elements.get('takeBtn').disabled, false, 'TAKE harus aktif saat PVW belum mengudara');
  assert.equal(elements.get('pvwPgmChip').classList.contains('is-dirty'), true);
});

test('TAKE tanpa isi panggung tidak menayangkan apa pun', () => {
  const { ctx, toasts, pushed } = createHarness();
  vm.runInContext('takeToAir()', ctx);
  assert.equal(pushed.length, 0, 'tidak boleh ada kiriman ke udara');
  assert.equal(toasts.at(-1).kind, 'error');
});

test('TAKE menayangkan isi PVW lalu menonaktifkan dirinya', () => {
  const { ctx, elements, pushed } = createHarness();
  const run = (code) => vm.runInContext(code, ctx);

  run("markStagePreview('arab-255', 'trans-255', 'QS Al-Baqarah (2) Ayat 255')");
  run('takeToAir()');

  assert.equal(pushed.length, 1);
  assert.equal(pushed[0].arabic, 'arab-255');
  assert.equal(elements.get('pgmValue').textContent, '2:255', 'PGM mengikuti isi yang dinaikkan');
  assert.equal(elements.get('takeBtn').disabled, true, 'setelah TAKE, tidak ada lagi yang perlu dinaikkan');
  assert.equal(elements.get('pvwPgmChip').classList.contains('is-dirty'), false);
});

test('mode disimpan dan dipulihkan dari localStorage', () => {
  const first = createHarness();
  vm.runInContext("setBroadcastMode('pvw')", first.ctx);
  assert.equal(first.storage.get('webquran.broadcastMode'), 'pvw');

  const second = createHarness(first.storage);
  vm.runInContext('loadBroadcastMode()', second.ctx);
  assert.equal(vm.runInContext('broadcastMode', second.ctx), 'pvw');
  assert.equal(vm.runInContext("isPvwMode()", second.ctx), true);
});
