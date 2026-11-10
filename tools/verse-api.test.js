const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');

// POST /api/verse harus atomik: satu bagian yang tidak sah membatalkan SELURUH
// permintaan, termasuk isi ayat yang sudah ikut dikirim. Sebelumnya field
// diterapkan sambil berjalan, sehingga penolakan di field ke-5 menyisakan
// field 1–4 sudah berubah.

function request(port, opts = {}, body) {
    return new Promise((resolve, reject) => {
        const req = http.request({
            host: '127.0.0.1',
            port,
            path: opts.path || '/',
            method: opts.method || 'GET',
            headers: opts.headers || {},
        }, res => {
            let data = '';
            res.on('data', chunk => { data += chunk; });
            res.on('end', () => resolve({ status: res.statusCode, body: data, json: () => JSON.parse(data) }));
        });
        req.on('error', reject);
        if (body !== undefined) req.write(body);
        req.end();
    });
}

test('POST /api/verse is atomic and reports the applied state', async () => {
    const filename = path.resolve(__dirname, '../main.js');
    const code = fs.readFileSync(filename, 'utf8').split('function createMainWindow(port)')[0];
    const ctx = vm.createContext({
        require: name => name === 'electron' ? {} : require(name),
        __dirname: path.dirname(filename),
        Buffer,
        console: { log() { }, error() { } },
        URL,
        setTimeout,
        clearTimeout,
        process,
    });
    vm.runInContext(code, ctx);
    await vm.runInContext('startLocalServer(0)', ctx);
    const server = vm.runInContext('localServer', ctx);
    const port = server.address().port;
    const post = payload => request(port, {
        path: '/api/verse',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
    }, JSON.stringify(payload));
    const state = async () => (await request(port, { path: '/api/verse' })).json();

    try {
        // 1. Permintaan sah: isi ayat + state diterapkan, balasan memuat state
        const ok = await post({ arabic: 'بِسْمِ اللهِ', translation: 'Dengan nama Allah', info: 'QS 1:1', isVisible: true, fontSize: 120 });
        assert.equal(ok.status, 200);
        const body = ok.json();
        assert.equal(body.success, true);
        assert.equal(body.state.isVisible, true, 'balasan harus memuat keadaan yang diterapkan');
        assert.equal(body.state.fontSize, 120);

        const applied = await state();
        assert.equal(applied.arabic, 'بِسْمِ اللهِ');
        assert.equal(applied.isVisible, true);

        // 2. Satu field tidak sah membatalkan seluruh permintaan (termasuk isi ayat)
        const before = await state();
        const rejected = await post({ arabic: 'AYAT-BARU', isVisible: 'ya' });
        assert.equal(rejected.status, 400);
        assert.match(rejected.json().error, /Status tampil ayat/);
        const after = await state();
        assert.equal(after.arabic, before.arabic, 'isi ayat tidak boleh ikut tersimpan saat permintaan ditolak');
        assert.equal(after.isVisible, before.isVisible);

        // 3. Ukuran teks di luar rentang juga membatalkan seluruhnya
        const badSize = await post({ arabic: 'AYAT-LAIN', fontSize: 999 });
        assert.equal(badSize.status, 400);
        assert.equal((await state()).arabic, before.arabic);

        // 3b. Jeda gulir harus benar-benar tersimpan lewat HTTP, bukan hanya divalidasi.
        // (Regresi: handler POST sempat menyusun ulang objek state tanpa scrollPaused.)
        const paused = await post({ scrollPaused: true });
        assert.equal(paused.status, 200);
        assert.equal(paused.json().state.scrollPaused, true, 'balasan POST harus memuat status jeda');
        assert.equal((await state()).scrollPaused, true, 'GET /api/verse harus melaporkan jeda');
        const resumed = await post({ scrollPaused: false });
        assert.equal(resumed.json().state.scrollPaused, false);
        assert.equal((await state()).scrollPaused, false, 'jeda harus bisa dilepas');

        // 4. JSON rusak ditolak tanpa mengubah apa pun
        const badJson = await request(port, { path: '/api/verse', method: 'POST', headers: { 'Content-Type': 'application/json' } }, '{bukan json');
        assert.equal(badJson.status, 400);
        assert.equal((await state()).arabic, before.arabic);

        // 5. Tipe salah untuk isi ayat juga ditolak
        assert.equal((await post({ arabic: 12345 })).status, 400);

        // 6. Mematikan layar tetap berfungsi dan tercatat di state
        const off = await post({ isVisible: false });
        assert.equal(off.status, 200);
        assert.equal((await state()).isVisible, false);
    } finally {
        await new Promise(resolve => server.close(resolve));
    }
});
