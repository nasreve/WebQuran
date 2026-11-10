const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// Data Al-Qur'an dibangun oleh tools/build-quran-data.js (A13) dan hanya
// memuat field yang dipakai antarmuka (A2). Test ini menjaga dua hal itu:
// isinya lengkap, dan berkasnya tidak membengkak lagi.
const FILE = path.resolve(__dirname, '../js/quran-data.js');

test('bundled Quran data is complete, lean, and reproducible', () => {
    const code = fs.readFileSync(FILE, 'utf8');

    // 1. Ditandai sebagai berkas hasil bangunan, bukan suntingan manual
    assert.match(code, /Dibangun otomatis oleh tools\/build-quran-data\.js/, 'harus ada penanda berkas hasil bangunan');

    // 2. Muat dan periksa isi
    const sandbox = { window: {} };
    vm.runInNewContext(code, sandbox);
    const data = sandbox.window.QURAN_DATA;
    assert.ok(data && Array.isArray(data.surahs), 'QURAN_DATA.surahs harus ada');
    assert.equal(data.surahs.length, 114, 'harus 114 surat');

    const total = data.surahs.reduce((sum, list) => sum + list.length, 0);
    assert.equal(total, 6236, 'jumlah ayat harus 6236');

    // 3. Hanya field yang dipakai (A2)
    const expected = ['id', 'surah_id', 'ayah', 'arabic', 'latin', 'translation', 'surah'];
    const fields = Object.keys(data.surahs[0][0]).sort();
    assert.deepEqual(fields, expected.slice().sort(), 'field ayat harus sesuai daftar ramping');

    // 4. Tidak ada ayat tanpa teks Arab atau terjemahan
    for (const list of data.surahs) {
        for (const verse of list) {
            assert.ok(verse.arabic && verse.arabic.length > 0, `ayat ${verse.surah_id}:${verse.ayah} tanpa teks Arab`);
            assert.ok(typeof verse.translation === 'string' && verse.translation.length > 0, `ayat ${verse.surah_id}:${verse.ayah} tanpa terjemahan`);
            assert.ok(verse.surah && verse.surah.latin, `ayat ${verse.surah_id}:${verse.ayah} tanpa nama surat`);
        }
    }

    // 5. Spot check ayat yang mudah dikenali
    assert.equal(data.surahs[0][0].arabic.length > 0, true, 'QS 1:1 harus ada');
    assert.match(data.surahs[1][254].arabic, /اَللّٰهُ/, 'QS 2:255 harus memuat lafaz Allah');

    // 6. Ukuran tetap ramping (dulu 9,4 MB karena field tak terpakai)
    const bytes = fs.statSync(FILE).size;
    assert.ok(bytes < 6 * 1024 * 1024, `berkas tidak boleh membengkak lagi (sekarang ${(bytes / 1048576).toFixed(2)} MB)`);
});
