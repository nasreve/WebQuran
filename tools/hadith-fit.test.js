const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');

// Endpoint /api/hadith/fit: laporan dari halaman presentasi tentang teks
// yang muat / terpotong, dipakai panel operator untuk memperingatkan.
test('fit report is validated, attached to the state, and reset by new content', async () => {
  const filename = path.resolve(__dirname, '../main.js');
  const code = fs.readFileSync(filename, 'utf8').split('function createMainWindow(port)')[0];
  const ctx = vm.createContext({ require: name => name === 'electron' ? {} : require(name), __dirname: path.dirname(filename), Buffer, console: { log() {} } });
  vm.runInContext(code, ctx);
  await vm.runInContext('startLocalServer(0)', ctx);
  const server = vm.runInContext('localServer', ctx);
  const base = 'http://127.0.0.1:' + server.address().port;
  const get = async () => (await fetch(base + '/api/hadith')).json();
  const post = body => fetch(base + '/api/hadith', { method: 'POST', body: JSON.stringify(body) });
  const report = body => fetch(base + '/api/hadith/fit', { method: 'POST', body: typeof body === 'string' ? body : JSON.stringify(body) });

  try {
    // 1. Sebelum ada apa pun: belum ada laporan.
    assert.equal((await get()).fit.fits, null);

    const content = { arabic: 'إِنَّمَا الْأَعْمَالُ بِالنِّيَّاتِ', translation: 'Amal tergantung niat.', riwayat: 'H.R. Bukhari' };
    assert.equal((await post(content)).status, 200);
    const prepared = await get();
    assert.equal(prepared.fit.fits, null, 'kutipan baru harus mengosongkan laporan lama');

    // 2. Laporan valid tersimpan dan menempel pada state.
    const payload = { fits: false, template: 'lower-third', mode: 'arabic', lastUpdate: prepared.lastUpdate };
    assert.equal((await report(payload)).status, 200);
    const reported = await get();
    assert.equal(reported.fit.fits, false);
    assert.equal(reported.fit.template, 'lower-third');
    assert.equal(reported.fit.mode, 'arabic');
    assert.equal(reported.fit.lastUpdate, prepared.lastUpdate);
    assert.equal(typeof reported.fit.at, 'number');

    // 3. Laporan "muat" menimpa laporan sebelumnya.
    assert.equal((await report({ ...payload, fits: true, template: 'full-screen' })).status, 200);
    const fitsOk = await get();
    assert.equal(fitsOk.fit.fits, true);
    assert.equal(fitsOk.fit.template, 'full-screen');

    // 4. Kiriman tidak valid ditolak tanpa mengubah laporan terakhir.
    for (const body of ['{bad json', [], { ...payload, fits: 'ya' }, { ...payload, template: '../evil.html' }, { ...payload, mode: 'keduanya' }]) {
      assert.equal((await report(body)).status, 400);
    }
    assert.deepEqual((await get()).fit, fitsOk.fit, 'laporan yang ditolak tidak boleh mengubah state');

    // 5. Metode selain POST ditolak.
    assert.equal((await fetch(base + '/api/hadith/fit')).status, 405);

    // 6. Kutipan berikutnya mengosongkan lagi.
    assert.equal((await post({ ...content, translation: 'Niat adalah dasar amal.' })).status, 200);
    assert.equal((await get()).fit.fits, null);

    // 7. Laporan tidak boleh mengganggu state presentasi itu sendiri.
    const finalState = await get();
    assert.equal(finalState.translation, 'Niat adalah dasar amal.');
    assert.equal(finalState.visible, false);
  } finally { await new Promise(resolve => server.close(resolve)); }
});
