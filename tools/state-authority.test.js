const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');

// Tally panel harus mengikuti server. applyState adalah satu-satunya pintu
// perubahan state: ia memvalidasi seluruh isi patch lebih dulu, baru menerapkan,
// lalu mengembalikan keadaan yang benar-benar dipakai.
function loadMain() {
    const filename = path.resolve(__dirname, '../main.js');
    const code = fs.readFileSync(filename, 'utf8').split('function createMainWindow(port)')[0];
    const ctx = vm.createContext({
        require: name => name === 'electron' ? {} : require(name),
        __dirname: path.dirname(filename),
        Buffer,
        console: { log() { } },
        URL,
        setTimeout,
        clearTimeout,
        process,
    });
    vm.runInContext(code, ctx);
    return ctx;
}

test('applyState validates atomically and returns the authoritative state', () => {
    const ctx = loadMain();
    const apply = patch => vm.runInContext(`applyState(${JSON.stringify(patch)})`, ctx);
    const snapshot = () => vm.runInContext('broadcastState()', ctx);

    // 1. Patch yang sah diterapkan dan dikembalikan
    const on = apply({ isVisible: true, isTransVisible: true });
    assert.equal(on.ok, true);
    assert.equal(on.state.isVisible, true);
    assert.equal(on.state.isTransVisible, true);

    // 2. Satu bagian tidak sah → seluruh patch ditolak, tidak ada yang berubah
    const before = snapshot();
    const rejected = apply({ isVisible: false, fontSize: 999 });
    assert.equal(rejected.ok, false);
    assert.match(rejected.error, /Ukuran teks/);
    assert.deepEqual(snapshot(), before, 'penolakan tidak boleh menyisakan perubahan');

    // 3. Jenis nilai yang salah juga ditolak
    assert.equal(apply({ isVisible: 'ya' }).ok, false);
    assert.equal(apply({ theme: 'ungu' }).ok, false);
    assert.equal(apply({ template: 'ngawur.html' }).ok, false);

    // 4. Nilai sah tetap diterima
    assert.equal(apply({ fontSize: 130 }).state.fontSize, 130);
    assert.equal(apply({ theme: 'light' }).state.theme, 'light');
    assert.equal(apply({ template: 'pip_video.html' }).state.template, 'pip_video.html');

    // 4b. Jeda gulir (Sprint 6) harus ikut state, bukan hanya divalidasi
    const paused = apply({ scrollPaused: true });
    assert.equal(paused.ok, true, 'scrollPaused sah harus diterima');
    assert.equal(paused.state.scrollPaused, true, 'nilai jeda harus tersimpan di state');
    assert.equal(snapshot().scrollPaused, true, 'server harus melaporkan status jeda');
    assert.equal(apply({ scrollPaused: 'ya' }).ok, false, 'jeda harus boolean');
    assert.equal(apply({ scrollPaused: false }).state.scrollPaused, false);

    // 5. Menyalakan ayat mematikan hadits (tidak boleh tayang bersamaan)
    apply({ hadithVisible: true });
    assert.equal(snapshot().hadithVisible, true);
    apply({ isVisible: true });
    assert.equal(snapshot().hadithVisible, false, 'ayat ON AIR harus mematikan hadits');

    // 6. Data yang bukan objek ditolak
    assert.equal(vm.runInContext('applyState(null).ok', ctx), false);
    assert.equal(vm.runInContext('applyState([]).ok', ctx), false);
});
