#!/usr/bin/env node
// ============================================================
// Kemas halaman baca hadits menjadi satu berkas: reading.pak
// ------------------------------------------------------------
// data/hadith/reading/ berisi ±28.450 halaman HTML (199 MB) yang membuat
// paket besar dan proses build lambat. Semua halaman itu dikemas menjadi
// satu berkas terkompresi; server menyajikannya kembali per permintaan.
//
// Format berkas:
//   [4 byte] panjang header (little endian)
//   [header] JSON { "kitab-x/abc.html": [offsetData, panjangTerkompresi], ... }
//   [data]   kumpulan gzip dari tiap halaman
//
// Pemakaian:
//   node tools/pack-reading.js            # kemas lalu hapus folder asal
//   node tools/pack-reading.js --dry-run  # hitung saja, tidak menulis
//   node tools/pack-reading.js --keep     # kemas tanpa menghapus folder
// ============================================================
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const ROOT = path.resolve(__dirname, '..');
const SOURCE_DIR = path.join(ROOT, 'data', 'hadith', 'reading');
const TARGET = path.join(ROOT, 'data', 'hadith', 'reading.pak');

const dryRun = process.argv.includes('--dry-run');
const keepSource = process.argv.includes('--keep');

function walk(folder, base = folder, out = []) {
    for (const entry of fs.readdirSync(folder, { withFileTypes: true })) {
        const full = path.join(folder, entry.name);
        if (entry.isDirectory()) walk(full, base, out);
        else out.push(path.relative(base, full).split(path.sep).join('/'));
    }
    return out;
}

if (!fs.existsSync(SOURCE_DIR)) {
    console.error('Folder tidak ditemukan:', SOURCE_DIR);
    console.error('Mungkin sudah dikemas sebelumnya (reading.pak ada).');
    process.exit(1);
}

const files = walk(SOURCE_DIR);
files.sort();
console.log(`Berkas sumber : ${files.length}`);

const index = {};
const chunks = [];
let originalBytes = 0;
let packedBytes = 0;

for (const relative of files) {
    const content = fs.readFileSync(path.join(SOURCE_DIR, relative));
    originalBytes += content.length;
    const packed = zlib.gzipSync(content, { level: 9 });
    index[relative] = [packedBytes, packed.length];
    chunks.push(packed);
    packedBytes += packed.length;
}

const payload = Buffer.concat(chunks);
const header = Buffer.from(JSON.stringify(index), 'utf8');
const lengthPrefix = Buffer.alloc(4);
lengthPrefix.writeUInt32LE(header.length, 0);
const pak = Buffer.concat([lengthPrefix, header, payload]);

console.log(`Ukuran asal   : ${(originalBytes / 1048576).toFixed(1)} MB`);
console.log(`Setelah kemas : ${(pak.length / 1048576).toFixed(1)} MB (header ${(header.length / 1024).toFixed(0)} KB)`);
console.log(`Hemat         : ${((1 - pak.length / originalBytes) * 100).toFixed(0)}%`);

if (dryRun) {
    console.log('\n--dry-run: tidak ada berkas yang ditulis.');
    process.exit(0);
}

fs.writeFileSync(TARGET, pak);
console.log(`\nDitulis       : ${path.relative(ROOT, TARGET)}`);

// Verifikasi cepat: baca kembali tiga entri dan bandingkan isinya.
const fd = fs.openSync(TARGET, 'r');
const readHeaderLength = Buffer.alloc(4);
fs.readSync(fd, readHeaderLength, 0, 4, 0);
const headerLength = readHeaderLength.readUInt32LE(0);
const readHeader = Buffer.alloc(headerLength);
fs.readSync(fd, readHeader, 0, headerLength, 4);
const verifyIndex = JSON.parse(readHeader.toString('utf8'));
const samples = Object.keys(verifyIndex).slice(0, 3);
let verified = 0;
for (const key of samples) {
    const [offset, length] = verifyIndex[key];
    const slice = Buffer.alloc(length);
    fs.readSync(fd, slice, 0, length, 4 + headerLength + offset);
    const content = zlib.gunzipSync(slice);
    const original = fs.readFileSync(path.join(SOURCE_DIR, key));
    if (content.equals(original)) verified++;
}
fs.closeSync(fd);
console.log(`Verifikasi    : ${verified}/${samples.length} halaman identik`);

if (verified !== samples.length) {
    console.error('Verifikasi gagal — folder asal TIDAK dihapus.');
    process.exit(1);
}

if (keepSource) {
    console.log('\n--keep: folder asal dipertahankan.');
} else {
    fs.rmSync(SOURCE_DIR, { recursive: true, force: true });
    console.log('Folder asal   : dihapus (bangun ulang dengan tools/build_hadith_data.py).');
}
