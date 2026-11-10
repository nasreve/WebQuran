const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

// Runtime template bersama (js/template-runtime.js) dipakai keempat template.
// Test ini mengunci perilaku pentingnya tanpa perlu browser.
function loadRuntime(options = {}) {
    const listeners = {};
    const posted = [];
    const body = { classList: { add(name) { body.classes.push(name); } }, dataset: {}, classes: [] };
    const window = {
        location: { search: options.search || '' },
        self: options.embedded ? { child: true } : null,
        top: null,
        parent: options.embedded ? { postMessage: (data, origin) => posted.push({ data, origin }) } : null,
        addEventListener(type, fn) { (listeners[type] = listeners[type] || []).push(fn); },
    };
    window.self = options.embedded ? window.self : window;
    window.top = options.embedded ? { top: true } : window;
    const ctx = {
        window,
        document: { body },
        URLSearchParams,
        fetch: async () => ({ ok: true, json: async () => options.payload || {} }),
        setInterval: () => 0,
        console,
    };
    ctx.globalThis = ctx;
    vm.createContext(ctx);
    vm.runInContext(fs.readFileSync(require.resolve('../js/template-runtime.js'), 'utf8'), ctx);
    const send = data => (listeners.message || []).forEach(fn => fn({ data }));
    return { runtime: window.TemplateRuntime, send, posted, body };
}

test('shared runtime dispatches content, re-renders on setting changes, and reports fit', () => {
    const { runtime, send, posted, body } = loadRuntime();

    assert.equal(typeof runtime.init, 'function');
    assert.equal(runtime.isObs, false, 'tanpa ?obs tidak boleh masuk mode OBS');

    const calls = { content: [], fontSize: [], fonts: [], trans: [] };
    runtime.init({
        onContent: data => calls.content.push(data),
        onFontSize: size => calls.fontSize.push(size),
        onFonts: (a, l) => calls.fonts.push([a, l]),
        onTransVisible: value => calls.trans.push(value),
    });

    const verse = { type: 'QURAN_UPDATE', arabic: 'بِسْمِ', translation: 'Dengan nama', info: 'QS 1:1', fontSize: 100, theme: 'dark', isVisible: true };

    // 1. Konten pertama dirender
    send(verse);
    assert.equal(calls.content.length, 1);

    // 2. Konten yang sama + setelan sama tidak dirender ulang (hemat)
    send({ ...verse });
    assert.equal(calls.content.length, 1, 'pembaruan identik tidak boleh merender ulang');

    // 3. Ukuran teks berubah tanpa ganti ayat → HARUS dirender ulang
    send({ ...verse, fontSize: 140 });
    assert.equal(calls.content.length, 2, 'perubahan ukuran teks harus tembus ke template');

    // 4. Tema berubah tanpa ganti ayat → juga harus dirender ulang
    send({ ...verse, fontSize: 140, theme: 'light' });
    assert.equal(calls.content.length, 3, 'perubahan tema harus tembus ke template');

    // 5. Pesan khusus terjemahan
    send({ type: 'TRANS_VISIBILITY_UPDATE', isTransVisible: true });
    assert.deepEqual(calls.trans, [true]);

    // 6. Pesan font
    send({ type: 'FONT_UPDATE', arabicFont: 'amiri', latinFont: 'montserrat' });
    assert.deepEqual(calls.fonts, [['amiri', 'montserrat']]);

    // 7. Laporan "teks terpotong": selalu menandai body; pesan ke induk hanya
    //    dikirim bila halaman memang berjalan di dalam induk.
    runtime.reportFit(true);
    assert.equal(body.dataset.clipped, 'true');
    assert.equal(posted.length, 0, 'tanpa induk tidak perlu mengirim pesan');

    const embedded = loadRuntime({ embedded: true });
    embedded.runtime.init({ onContent: () => { } });
    embedded.runtime.reportFit(true);
    assert.equal(embedded.posted.length, 1);
    // Objek dibuat di konteks vm, jadi dibandingkan per field.
    assert.equal(embedded.posted[0].data.type, 'QURAN_FIT');
    assert.equal(embedded.posted[0].data.clipped, true);
});

test('shared runtime reads obs and side flags from the URL', () => {
    const obs = loadRuntime({ search: '?obs&side=left' });
    assert.equal(obs.runtime.isObs, true);
    assert.equal(obs.runtime.side, 'left');
    assert.ok(obs.body.classes.includes('obs-mode'), 'mode OBS harus menandai body');
    assert.equal(obs.body.dataset.side, 'left', 'sisi panel harus diteruskan ke body');

    const embedded = loadRuntime({ embedded: true });
    assert.equal(embedded.runtime.isEmbedded, true, 'harus tahu saat berjalan di dalam induk');
});
