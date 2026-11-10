#!/usr/bin/env node
/*
 * Mengunduh font Arab (dan satu font Latin) dari Google Fonts sekali saja,
 * lalu menyimpannya sebagai berkas lokal agar aplikasi tetap benar tanpa internet.
 *
 * Hasil:
 *   assets/fonts/<family>-<weight>-<n>.woff2
 *   assets/fonts/fonts.css      (dipakai halaman & template)
 *
 * Semua keluarga di bawah berlisensi SIL Open Font License, sehingga boleh
 * didistribusikan ulang bersama aplikasi.
 *
 * Pemakaian:  node tools/fetch-fonts.js [--force]
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const OUT_DIR = path.join(__dirname, '..', 'assets', 'fonts');
const CSS_FILE = path.join(OUT_DIR, 'fonts.css');
const FORCE = process.argv.includes('--force');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

// Keluarga font yang dipakai pemilih font aplikasi (js/font.js).
const FAMILIES = [
    { slug: 'amiri', query: 'Amiri:wght@400;700' },
    { slug: 'amiri-quran', query: 'Amiri+Quran' },
    { slug: 'noto-naskh', query: 'Noto+Naskh+Arabic:wght@400;700' },
    { slug: 'scheherazade', query: 'Scheherazade+New:wght@400;700' },
    { slug: 'lateef', query: 'Lateef:wght@400;700' },
    { slug: 'noto-kufi', query: 'Noto+Kufi+Arabic:wght@400;700' },
    // Satu font Latin supaya teks terjemahan tetap rapi saat offline.
    { slug: 'inter', query: 'Inter:wght@400;600;700' },
];

function log(message) { process.stdout.write(message + '\n'); }

async function fetchText(url) {
    const response = await fetch(url, { headers: { 'User-Agent': UA } });
    if (!response.ok) throw new Error(`HTTP ${response.status} untuk ${url}`);
    return response.text();
}

async function downloadBinary(url, target) {
    if (!FORCE && fs.existsSync(target) && fs.statSync(target).size > 1024) return { skipped: true, bytes: fs.statSync(target).size };
    const response = await fetch(url, { headers: { 'User-Agent': UA } });
    if (!response.ok) throw new Error(`HTTP ${response.status} untuk ${url}`);
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.subarray(0, 4).toString('latin1') !== 'wOF2') throw new Error(`Bukan berkas WOFF2: ${url}`);
    fs.writeFileSync(target, buffer);
    return { skipped: false, bytes: buffer.length };
}

function parseFaces(css) {
    const faces = [];
    const blockPattern = /@font-face\s*\{([\s\S]*?)\}/g;
    let match;
    while ((match = blockPattern.exec(css))) {
        const body = match[1];
        const family = (body.match(/font-family:\s*'([^']+)'/) || [])[1];
        const weight = (body.match(/font-weight:\s*(\d+)/) || [])[1] || '400';
        const style = (body.match(/font-style:\s*(\w+)/) || [])[1] || 'normal';
        const range = (body.match(/unicode-range:\s*([^;]+);/) || [])[1];
        const url = (body.match(/url\((https:[^)]+\.woff2)\)/) || [])[1];
        if (family && url) faces.push({ family, weight, style, range: range && range.trim(), url });
    }
    return faces;
}

(async () => {
    fs.mkdirSync(OUT_DIR, { recursive: true });
    const cssBlocks = [];
    const report = [];

    for (const family of FAMILIES) {
        const url = `https://fonts.googleapis.com/css2?family=${family.query}&display=block`;
        const css = await fetchText(url);
        const faces = parseFaces(css);
        if (!faces.length) throw new Error(`Tidak ada @font-face untuk ${family.slug}`);

        let bytes = 0, index = 0;
        for (const face of faces) {
            const file = `${family.slug}-${face.weight}-${++index}.woff2`;
            const result = await downloadBinary(face.url, path.join(OUT_DIR, file));
            bytes += result.bytes;
            cssBlocks.push([
                '@font-face {',
                `  font-family: '${face.family}';`,
                '  font-style: ' + face.style + ';',
                '  font-weight: ' + face.weight + ';',
                '  /* block: jangan pernah menggambar dengan font cadangan lebih dulu */',
                '  font-display: block;',
                `  src: url('./${file}') format('woff2');`,
                face.range ? `  unicode-range: ${face.range};` : null,
                '}',
            ].filter(Boolean).join('\n'));
        }
        report.push({ slug: family.slug, family: faces[0].family, faces: faces.length, bytes });
        log(`  ${family.slug.padEnd(14)} ${String(faces.length).padStart(2)} berkas  ${(bytes / 1024).toFixed(0).padStart(5)} KiB`);
    }

    const header = [
        '/*',
        ' * Font lokal untuk Webquran — dibuat oleh tools/fetch-fonts.js',
        ' * Jangan disunting manual: jalankan ulang skripnya bila perlu memperbarui.',
        ' * Semua keluarga berlisensi SIL Open Font License (OFL).',
        ' */',
        '',
    ].join('\n');
    fs.writeFileSync(CSS_FILE, header + cssBlocks.join('\n\n') + '\n', 'utf8');

    const totalFaces = report.reduce((n, r) => n + r.faces, 0);
    const totalBytes = report.reduce((n, r) => n + r.bytes, 0);
    log('');
    log(`Selesai: ${report.length} keluarga, ${totalFaces} berkas, ${(totalBytes / 1048576).toFixed(2)} MiB`);
    log(`CSS: ${path.relative(path.join(__dirname, '..'), CSS_FILE)}`);
})().catch(error => {
    console.error('Gagal mengambil font:', error.message);
    process.exit(1);
});
