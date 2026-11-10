const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');

// Halaman baca hadits dikemas ke data/hadith/reading.pak (199 MB → 66 MB).
// Test ini memastikan server benar-benar menyajikan halaman dari paket itu,
// dan tetap menolak berkas yang tidak ada di dalamnya.
const PAK = path.resolve(__dirname, '../data/hadith/reading.pak');
const skip = !fs.existsSync(PAK);

function request(port, reqPath) {
    return new Promise((resolve, reject) => {
        const req = http.request({ host: '127.0.0.1', port, path: reqPath, method: 'GET' }, res => {
            const chunks = [];
            res.on('data', chunk => chunks.push(chunk));
            res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) }));
        });
        req.on('error', reject);
        req.end();
    });
}

test('reading.pak is served by the local server', { skip }, async () => {
    // Ambil satu kunci dari header paket.
    const fd = fs.openSync(PAK, 'r');
    const sizeBuffer = Buffer.alloc(4);
    fs.readSync(fd, sizeBuffer, 0, 4, 0);
    const header = Buffer.alloc(sizeBuffer.readUInt32LE(0));
    fs.readSync(fd, header, 0, header.length, 4);
    fs.closeSync(fd);
    const index = JSON.parse(header.toString('utf8'));
    const keys = Object.keys(index);
    assert.ok(keys.length > 1000, 'paket harus berisi ribuan halaman');
    const key = keys.find(k => k.endsWith('.html'));
    assert.ok(key, 'harus ada halaman HTML di dalam paket');

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

    try {
        // 1. Halaman dari paket tersaji sebagai HTML
        const page = await request(port, '/data/hadith/reading/' + key);
        assert.equal(page.status, 200, 'halaman dari paket harus tersaji');
        assert.match(String(page.headers['content-type']), /text\/html/);
        assert.ok(page.body.length > 0, 'isi halaman tidak boleh kosong');

        // 2. Halaman yang tidak ada di paket tetap 404
        const missing = await request(port, '/data/hadith/reading/tidak-ada/halaman.html');
        assert.equal(missing.status, 404);

        // 3. Percobaan keluar dari folder aplikasi tetap gagal. (Jalur "../"
        //    yang masih menunjuk berkas di dalam aplikasi memang dinormalkan
        //    oleh server — itu perilaku penyajian statis biasa, bukan kebocoran.)
        const traversal = await request(port, '/data/hadith/reading/%2e%2e/%2e%2e/%2e%2e/%2e%2e/Windows/win.ini');
        assert.notEqual(traversal.status, 200, 'traversal tidak boleh menyajikan berkas di luar aplikasi');
    } finally {
        await new Promise(resolve => server.close(resolve));
    }
});
