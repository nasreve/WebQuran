const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');

test('hadith HTTP API validates atomically and keeps Quran state independent', async () => {
  const filename = path.resolve(__dirname, '../main.js');
  const code = fs.readFileSync(filename, 'utf8').split('function createMainWindow(port)')[0];
  const ctx = vm.createContext({ require: name => name === 'electron' ? {} : require(name), __dirname: path.dirname(filename), Buffer, console: { log() {} } });
  vm.runInContext(code, ctx);
  await vm.runInContext('startLocalServer(0)', ctx);
  const server = vm.runInContext('localServer', ctx);
  const base = 'http://127.0.0.1:' + server.address().port;
  const get = async () => (await fetch(base + '/api/hadith')).json();
  const post = body => fetch(base + '/api/hadith', { method: 'POST', body: typeof body === 'string' ? body : JSON.stringify(body) });
  const control = body => fetch(base + '/api/hadith/control', { method: 'POST', body: JSON.stringify(body) });
  try {
    const initial = await get();
    assert.equal(initial.visible, false); assert.equal(initial.displayMode, 'arabic');
    assert.equal(initial.template, 'lower-third');
    assert.equal((await control({ action: 'template', template: 'lower-third-white' })).status, 200);
    assert.equal((await get()).template, 'lower-third-white');
    assert.equal((await control({ action: 'template', template: 'full-screen' })).status, 200);
    const configured = await get();
    assert.equal(configured.template, 'full-screen'); assert.equal(configured.visible, false);
    assert.equal((await control({ action: 'visibility', visible: true })).status, 400);
    assert.equal((await control({ action: 'template', template: '../invalid.html' })).status, 400);
    assert.deepEqual(await get(), configured);
    vm.runInContext('currentVerseData = { arabic: "Quran sentinel" };', ctx);
    const content = { arabic: 'إِنَّمَا الْأَعْمَالُ بِالنِّيَّاتِ', translation: 'Amal tergantung niat.', riwayat: 'H.R. Bukhari, Juz 4 halaman 454 no. 4223', arabicDuration: 15, translationDuration: 30, title: 'Must not leak' };
    const response = await post(content); assert.equal(response.status, 200);
    const state = await get();
    assert.equal(state.template, 'full-screen', 'preparing a hadith must preserve the operator template');
    assert.equal(state.arabic, content.arabic); assert.equal(state.riwayat, content.riwayat); assert.equal(state.visible, false); assert.equal(state.arabicDuration, 15); assert.equal(state.title, undefined); assert.equal(state.timer.phaseStartedAt, null);
    assert.equal(vm.runInContext('currentVerseData.arabic', ctx), 'Quran sentinel');
    assert.equal((await control({ action: 'visibility', visible: true })).status, 200);
    assert.equal((await get()).visible, true);
    assert.equal(vm.runInContext('currentVisibility', ctx), false, 'menayangkan hadits harus menonaktifkan status ayat');
    assert.equal((await fetch(base + '/api/verse', { method: 'POST', body: JSON.stringify({ isVisible: true }) })).status, 200);
    assert.equal((await get()).visible, false, 'menayangkan ayat harus menyembunyikan hadits');
    assert.equal((await control({ action: 'visibility', visible: true })).status, 200);
    assert.equal((await control({ action: 'translation' })).status, 200);

    // Jeda gulir kutipan panjang (H4): boolean wajib, dan tidak boleh
    // mengubah lastUpdate (agar teks tidak dirender ulang dan posisi hilang).
    const beforeScroll = await (await fetch(base + '/api/hadith', { cache: 'no-store' })).json();
    assert.equal((await control({ action: 'scroll', paused: true })).status, 200);
    const pausedState = await (await fetch(base + '/api/hadith', { cache: 'no-store' })).json();
    assert.equal(pausedState.scrollPaused, true, 'status jeda harus tersimpan');
    assert.equal(pausedState.lastUpdate, beforeScroll.lastUpdate, 'jeda tidak boleh memicu render ulang');
    assert.equal((await control({ action: 'scroll', paused: false })).status, 200);
    assert.equal((await (await fetch(base + '/api/hadith', { cache: 'no-store' })).json()).scrollPaused, false);
    assert.equal((await control({ action: 'scroll', paused: 'ya' })).status, 400, 'harus boolean');

    // Ukuran tayang hadits (80–140%) tersimpan dan divalidasi.
    assert.equal((await control({ action: 'scale', scale: 1.25 })).status, 200);
    assert.equal((await (await fetch(base + '/api/hadith', { cache: 'no-store' })).json()).fontScale, 1.25);
    assert.equal((await control({ action: 'scale', scale: 2 })).status, 400, 'di atas 140% harus ditolak');
    assert.equal((await control({ action: 'scale', scale: 0.5 })).status, 400, 'di bawah 80% harus ditolak');
    assert.equal((await control({ action: 'scale', scale: 'besar' })).status, 400, 'harus angka');
    assert.equal((await get()).displayMode, 'translation');
    assert.equal((await control({ action: 'template', template: 'lower-third' })).status, 200);
    const restyled = await get();
    assert.equal(restyled.template, 'lower-third'); assert.equal(restyled.visible, true);
    assert.equal(restyled.displayMode, 'translation'); assert.equal(restyled.riwayat, content.riwayat);
    assert.equal(vm.runInContext('currentVerseData.arabic', ctx), 'Quran sentinel');
    assert.equal((await control({ action: 'visibility', visible: false })).status, 200);
    const hiddenTranslation = await get();
    assert.equal(hiddenTranslation.visible, false); assert.equal(hiddenTranslation.displayMode, 'arabic');
    assert.equal((await control({ action: 'translation' })).status, 400);
    assert.deepEqual(await get(), hiddenTranslation);
    assert.equal((await control({ action: 'visibility', visible: true })).status, 200);
    assert.equal((await get()).displayMode, 'arabic');
    assert.equal((await control({ action: 'arabic' })).status, 200);
    assert.equal((await get()).displayMode, 'arabic');
    const controlledState = await get();
    for (const body of ['{bad json', [], { ...content, translation: '' }, { ...content, template: 'invalid' }, { ...content, arabicDuration: -1 }, { ...content, visible: 'yes' }, { ...content, arabicImages: ['https://evil/image.gif'] }]) {
      assert.equal((await post(body)).status, 400); assert.deepEqual(await get(), controlledState);
    }
    assert.equal((await post('x'.repeat(1024 * 1024 + 1))).status, 413); assert.deepEqual(await get(), controlledState);
    assert.equal((await fetch(base + '/api/hadith', { method: 'DELETE' })).status, 405);
    const image = await post({ translation: 'Terjemahan gambar Arab.', riwayat: '', arabicImages: ['data/hadith/assets/kitab-himpunan-hadits-qudsi/qudsi_5a.gif'] });
    assert.equal(image.status, 200); const changed = await get(); assert.equal(changed.arabic, ''); assert.equal(changed.riwayat, ''); assert.equal(changed.arabicDuration, 15); assert.ok(changed.lastUpdate > controlledState.lastUpdate);
    const archived = { ...content, translation: 'Isi hadits.\n\nCopyleft © 2007-2009 Kampungsunnah.org\n\n' + content.riwayat };
    assert.equal((await post(archived)).status, 200);
    const cleaned = await get();
    assert.equal(cleaned.translation, 'Isi hadits.');
    assert.equal(cleaned.arabic, content.arabic);
    assert.equal(cleaned.riwayat, content.riwayat);
    assert.equal((await post({ ...content, translation: 'Copyleft © 2007-2009 Kampungsunnah.org' })).status, 400);
    assert.deepEqual(await get(), cleaned, 'rejected archive-only content must preserve the current presentation');
  } finally { await new Promise(resolve => server.close(resolve)); }
});
