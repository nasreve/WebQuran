const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');

// Keamanan server lokal: permintaan dari origin asing tidak boleh mengubah
// tayangan, CORS hanya untuk origin aplikasi sendiri, halaman HTML membawa CSP,
// dan nama template divalidasi (supaya tidak ada 404 di layar siaran).
//
// Catatan harness: konteks vm baru tidak mewarisi global Node (URL, setTimeout),
// jadi keduanya harus disuntikkan. Tanpa URL, setiap pemeriksaan origin akan
// dianggap gagal dan test memberi kesan aplikasi yang salah.

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
            res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
        });
        req.on('error', reject);
        if (body !== undefined) req.write(body);
        req.end();
    });
}

test('local server rejects foreign origins, pins CORS, sets CSP, validates template', async () => {
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
    await vm.runInContext('startLocalServer(0)', ctx);
    const server = vm.runInContext('localServer', ctx);
    const port = server.address().port;
    const ownOrigin = 'http://localhost:' + port;
    const post = (payload, origin) => request(port, {
        path: '/api/verse',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(origin ? { Origin: origin } : {}),
        },
    }, JSON.stringify(payload));

    try {
        // 1. Halaman HTML membawa Content-Security-Policy
        const page = await request(port, { path: '/presentation.html' });
        assert.equal(page.status, 200);
        const csp = page.headers['content-security-policy'];
        assert.ok(csp && csp.includes("default-src 'self'"), 'CSP harus terpasang pada halaman HTML');
        assert.ok(!/script-src[^;]*\*/.test(csp), 'CSP tidak boleh membuka semua sumber skrip');

        // 2. CORS hanya untuk origin aplikasi sendiri
        const foreignGet = await request(port, { path: '/api/ping', headers: { Origin: 'http://evil.example' } });
        assert.equal(foreignGet.status, 200, 'GET tetap boleh dibaca (tidak mengubah state)');
        assert.equal(foreignGet.headers['access-control-allow-origin'], undefined, 'origin asing tidak boleh mendapat izin CORS');

        const ownGet = await request(port, { path: '/api/ping', headers: { Origin: ownOrigin } });
        assert.equal(ownGet.headers['access-control-allow-origin'], ownOrigin, 'origin aplikasi sendiri diizinkan');

        // 3. POST dari origin asing ditolak, state tidak berubah
        const before = JSON.parse((await request(port, { path: '/api/verse' })).body).isVisible;
        const blocked = await post({ isVisible: !before }, 'http://evil.example');
        assert.equal(blocked.status, 403, 'POST dari situs lain harus ditolak');
        const stateAfter = JSON.parse((await request(port, { path: '/api/verse' })).body).isVisible;
        assert.equal(stateAfter, before, 'state tidak boleh berubah oleh permintaan yang ditolak');

        // 4. POST tanpa Origin (OBS, curl, skrip lokal) tetap diterima
        assert.equal((await post({ isVisible: true })).status, 200);
        const stateOn = JSON.parse((await request(port, { path: '/api/verse' })).body);
        assert.equal(stateOn.isVisible, true);        // 5. Origin aplikasi sendiri juga diterima
        assert.equal((await post({ isVisible: false }, ownOrigin)).status, 200);

        // 6. Nama template divalidasi: template tak dikenal tidak boleh lolos
        assert.equal((await post({ template: 'tidak-ada.html' })).status, 400, 'template tidak dikenal harus ditolak');
        assert.equal((await post({ template: 'lower_third.html' })).status, 200);
        assert.equal((await post({ template: 'pip_video.html' })).status, 200);

        // 7. Percobaan path traversal tidak boleh menyajikan berkas di luar aplikasi
        for (const attempt of ['/%2e%2e/%2e%2e/Windows/win.ini', '/..%2f..%2f..%2fWindows/win.ini']) {
            const res = await request(port, { path: attempt });
            assert.notEqual(res.status, 200, 'traversal tidak boleh berhasil: ' + attempt);
        }

        // 8. Berkas statis dikirim streaming dengan Content-Length + ETag
        const first = await request(port, { path: '/presentation.html' });
        assert.equal(first.status, 200);
        assert.ok(Number(first.headers['content-length']) > 0, 'Content-Length harus dikirim');
        assert.equal(Number(first.headers['content-length']), Buffer.byteLength(first.body), 'Content-Length harus sesuai isi');
        const etag = first.headers.etag;
        assert.ok(etag, 'ETag harus dikirim');

        const cached = await request(port, { path: '/presentation.html', headers: { 'If-None-Match': etag } });
        assert.equal(cached.status, 304, 'ETag yang cocok harus dijawab 304 tanpa isi');
        assert.equal(cached.body, '', 'balasan 304 tidak boleh membawa isi');
    } finally {
        await new Promise(resolve => server.close(resolve));
    }
});
