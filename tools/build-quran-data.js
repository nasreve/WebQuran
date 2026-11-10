#!/usr/bin/env node
// ============================================================
// Bangun ulang js/quran-data.js secara deterministik (A13)
// ------------------------------------------------------------
// Sumber: data/1.json … data/114.json (satu berkas per surat).
// Hasil : js/quran-data.js (window.QURAN_DATA).
//
// Sebelumnya berkas hasil dibangun manual, sehingga tidak dapat diulang dan
// memuat banyak field yang tidak pernah dibaca aplikasi (kitabah, arabic_words,
// footnotes, page, juz, manzil, quarter_hizb, updated_at). Field itu dibuang
// agar paket lebih kecil dan waktu parse saat aplikasi dibuka lebih singkat.
//
// Pemakaian:
//   node tools/build-quran-data.js --dry-run   # lihat dampaknya saja
//   node tools/build-quran-data.js             # tulis ulang js/quran-data.js
// ============================================================
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');
const SOURCE_DIR = path.join(ROOT, 'data');
const TARGET = path.join(ROOT, 'js', 'quran-data.js');
const SURAH_COUNT = 114;

// Field yang benar-benar dipakai antarmuka (dicek dengan pemindaian kode).
const KEPT_FIELDS = ['id', 'surah_id', 'ayah', 'arabic', 'latin', 'translation', 'surah'];

const dryRun = process.argv.includes('--dry-run');
const keepAll = process.argv.includes('--keep-all');

const surahs = [];
let droppedFields = new Set();

for (let number = 1; number <= SURAH_COUNT; number++) {
    const file = path.join(SOURCE_DIR, number + '.json');
    if (!fs.existsSync(file)) {
        console.error('Berkas sumber tidak ditemukan:', path.relative(ROOT, file));
        process.exit(1);
    }
    const verses = JSON.parse(fs.readFileSync(file, 'utf8'));
    surahs.push(verses.map(verse => {
        if (keepAll) return verse;
        const lean = {};
        for (const field of KEPT_FIELDS) {
            if (verse[field] !== undefined) lean[field] = verse[field];
        }
        for (const field of Object.keys(verse)) {
            if (!KEPT_FIELDS.includes(field)) droppedFields.add(field);
        }
        return lean;
    }));
}

const payload = JSON.stringify({ surahs });
const content = '// Dibangun otomatis oleh tools/build-quran-data.js - jangan disunting manual.\n'
    + 'window.QURAN_DATA = ' + payload + ';\n';

const totalVerses = surahs.reduce((sum, list) => sum + list.length, 0);
const bytes = Buffer.byteLength(content);
const digest = crypto.createHash('sha256').update(content).digest('hex');
const previousBytes = fs.existsSync(TARGET) ? fs.statSync(TARGET).size : 0;

console.log(`Sumber        : ${SURAH_COUNT} berkas di ${path.relative(ROOT, SOURCE_DIR)}`);
console.log(`Surah / ayat  : ${surahs.length} / ${totalVerses}`);
console.log(`Field dibuang : ${keepAll ? '(tidak ada, --keep-all)' : [...droppedFields].join(', ')}`);
console.log(`Ukuran hasil  : ${(bytes / 1048576).toFixed(2)} MB`);
if (previousBytes) {
    console.log(`Ukuran lama   : ${(previousBytes / 1048576).toFixed(2)} MB`);
    console.log(`Selisih       : ${((bytes - previousBytes) / 1048576).toFixed(2)} MB`);
}
console.log(`sha256        : ${digest}`);

if (dryRun) {
    console.log('\n--dry-run: tidak ada berkas yang ditulis.');
    process.exit(0);
}

fs.writeFileSync(TARGET, content, 'utf8');
console.log('\nDitulis       :', path.relative(ROOT, TARGET));
