// DualFit — uji matematika jeda/lanjut gulir tanpa DOM.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');

function load() {
  const listeners = [];
  const window = { addEventListener: (name, fn) => listeners.push([name, fn]) };
  const ctx = vm.createContext({
    window,
    document: { getElementById: () => null },
    performance: { now: () => 0 },
    getComputedStyle: () => ({ transform: 'none' }),
    setTimeout: () => 1,
    clearTimeout: () => {},
    console,
  });
  vm.runInContext(fs.readFileSync(path.resolve(__dirname, '../js/dual-fit.js'), 'utf8'), ctx);
  return { DualFit: window.DualFit, listeners };
}

test('remainingDistance menghitung sisa jarak setelah jeda', () => {
  const { DualFit } = load();
  assert.equal(DualFit.remainingDistance(100, 10000, 0), 100, 'belum mulai: sisa penuh');
  assert.equal(DualFit.remainingDistance(100, 10000, 2500), 75, '25% waktu lewat: sisa 75%');
  assert.equal(DualFit.remainingDistance(100, 10000, 10000), 0, 'selesai: sisa 0');
  assert.equal(DualFit.remainingDistance(100, 10000, 20000), 0, 'tidak pernah negatif');
  assert.equal(DualFit.remainingDistance(0, 10000, 500), 0, 'tanpa luapan: sisa 0');
});

test('konstanta gulir dipertahankan sama dengan perilaku lama', () => {
  const { DualFit } = load();
  assert.equal(DualFit.constants.SPEED_PX_PER_SEC, 10, 'kecepatan 10 px/detik');
  assert.equal(DualFit.constants.START_DELAY_MS, 4000, 'jeda awal 4 detik');
  assert.ok(DualFit.constants.HEIGHT_STEPS_VH.includes(40), 'panel boleh tumbuh sampai 40vh');
});

test('status jeda bisa diubah dan dilaporkan', () => {
  const { DualFit } = load();
  assert.equal(DualFit.isPaused(), false, 'bawaan: berjalan');
  DualFit.pause();
  assert.equal(DualFit.isPaused(), true);
  DualFit.resume();
  assert.equal(DualFit.isPaused(), false);
  // setPaused hanya mengubah status, tidak melempar meski tidak ada lane
  DualFit.setPaused(true);
  assert.equal(DualFit.isPaused(), true);
  DualFit.setPaused(false);
  assert.equal(DualFit.isPaused(), false);
});

test('reapply aman saat belum pernah ada konten', () => {
  const { DualFit } = load();
  assert.doesNotThrow(() => DualFit.reapply());
  assert.doesNotThrow(() => DualFit.reset());
});
