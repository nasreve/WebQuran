const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// Ganti template di presentation.html harus benar-benar memindahkan "frame"
// ke iframe baru. Sebelumnya frame dideklarasikan `const`, sehingga
// `frame = next` melempar TypeError di dalam callback load: iframe baru tetap
// transparan dan pratinjau Program Feed tidak pernah berganti template —
// padahal OBS/vMix (yang memuat ulang halaman) tetap berubah.
//
// Test ini MENJALANKAN fungsi switchTemplate yang sesungguhnya (diambil dari
// presentation.html) dengan DOM tiruan, jadi kesalahan seperti itu tertangkap.

function extractFunction(source, name) {
    const start = source.indexOf('function ' + name + '(');
    assert.ok(start >= 0, 'fungsi ' + name + ' harus ada');
    let depth = 0;
    let began = false;
    for (let i = start; i < source.length; i++) {
        const ch = source[i];
        if (ch === '{') { depth++; began = true; }
        else if (ch === '}') {
            depth--;
            if (began && depth === 0) return source.slice(start, i + 1);
        }
    }
    throw new Error('blok fungsi tidak lengkap: ' + name);
}

function makeIframe(label) {
    const listeners = {};
    const el = {
        id: '',
        label,
        style: {},
        classList: {
            set: new Set(),
            add(name) { this.set.add(name); },
            remove(name) { this.set.delete(name); },
            contains(name) { return this.set.has(name); },
        },
        setAttribute() { },
        removeAttribute(name) { if (name === 'id') el.id = ''; },
        addEventListener(type, fn) { listeners[type] = fn; },
        remove() { el.removed = true; },
        fire(type) { if (listeners[type]) listeners[type](); },
        parentNode: { appendChild(child) { child.appendedTo = this; } },
        contentWindow: { postMessage() { } },
    };
    return el;
}

test('switchTemplate actually swaps the live frame (regression: const reassignment)', async () => {
    const html = fs.readFileSync(path.resolve(__dirname, '../presentation.html'), 'utf8');

    // Deklarasi aslinya harus `let`; dengan `const`, `frame = next` melempar
    // TypeError dan pratinjau tidak pernah berganti template.
    assert.match(html, /let frame = document\.getElementById\('templateFrame'\)/,
        'frame harus dideklarasikan let karena diganti saat crossfade');

    const fnSource = extractFunction(html, 'switchTemplate');

    const oldFrame = makeIframe('old');
    oldFrame.id = 'templateFrame';
    oldFrame.classList.add('is-live');
    const created = [];

    const sandbox = {
        document: {
            createElement(tag) {
                assert.equal(tag, 'iframe');
                const el = makeIframe('new' + created.length);
                created.push(el);
                return el;
            },
            body: { appendChild() { } },
        },
        console: { warn() { }, log() { }, info() { } },
        // Timer pendek dijalankan langsung; timer ≥1 detik (jeda gagal) dibiarkan
        // menunggu supaya tidak menghapus iframe baru.
        setTimeout(fn, ms) {
            if (ms >= 1000) return 0;
            fn();
            return 1;
        },
        clearTimeout() { },
        querySuffix: () => '?obs',
        syncIframeCalls: 0,
        syncIframe() { sandbox.syncIframeCalls++; },
    };
    sandbox.frame = oldFrame;
    sandbox.switchToken = 0;
    sandbox.currentTemplate = 'templates/default.html';
    vm.createContext(sandbox);
    vm.runInContext(
        'let frame = __frame; let switchToken = 0; let currentTemplate = __template;' + fnSource,
        Object.assign(sandbox, { __frame: oldFrame, __template: 'templates/default.html' })
    );

    // Jalankan penggantian
    vm.runInContext("switchTemplate('templates/pip_video.html')", sandbox);

    assert.equal(created.length, 1, 'harus membuat iframe baru');
    const next = created[0];
    assert.equal(next.appendedTo, oldFrame.parentNode, 'iframe baru ditempel di tempat yang sama');
    assert.equal(next.src, 'templates/pip_video.html?obs', 'flag ?obs harus diteruskan');

    // iframe baru selesai dimuat
    next.fire('load');

    assert.equal(vm.runInContext('frame', sandbox), next, 'frame harus berpindah ke iframe baru');
    assert.equal(vm.runInContext('currentTemplate', sandbox), 'templates/pip_video.html');
    assert.ok(next.classList.contains('is-live'), 'iframe baru harus ditampilkan');
    // Inline style menang atas stylesheet; kalau tertinggal "0" iframe baru
    // tidak akan pernah terlihat (gejala: Program Feed hitam).
    assert.equal(next.style.opacity, '1', 'iframe baru harus dibuat terlihat secara eksplisit');
    assert.equal(oldFrame.style.opacity, '0', 'iframe lama harus dipudarkan');
    assert.ok(!oldFrame.classList.contains('is-live'), 'iframe lama tidak boleh dianggap live');
    assert.equal(oldFrame.id, '', 'id templateFrame dipindahkan ke iframe baru');
    assert.equal(next.id, 'templateFrame');
    // Dua kali: sekali saat swap, sekali lagi 250 ms kemudian sebagai jaring
    // pengaman bagi template yang baru siap menerima pesan setelah jeda.
    assert.equal(sandbox.syncIframeCalls, 2, 'state harus dikirim saat swap dan diulang sekali');
});
