// ============================================================
// Webquran v5 — Electron Main Process
// ============================================================

const { app, BrowserWindow, ipcMain, screen, shell } = require('electron');
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const zlib = require('zlib');
const { presentationText: cleanHadithPresentation } = require(path.join(__dirname, 'js/hadith-engine.js'));
const urlModule = require('url');

let mainWindow = null;
let presentationWindow = null;
let presentationContent = null; // 'quran' atau 'hadith'; satu jendela bersama
let localServer = null;
let LOCAL_PORT = 34730;

// ── Akses jaringan lokal (opsional) ──────────────────────────
// Bawaan: hanya komputer ini (127.0.0.1). Bila diaktifkan operator, server
// mendengarkan di semua antarmuka sehingga vMix/OBS di komputer lain dalam
// jaringan yang sama dapat memakai halaman yang sama.
let lanAccessEnabled = false;

function getLanUrls(port) {
    // Urutkan agar alamat jaringan privat (yang biasanya dipakai) muncul lebih
    // dulu daripada adapter virtual Hyper-V/VMware.
    const rank = (ip) => {
        if (ip.startsWith('192.168.')) return 0;
        if (ip.startsWith('10.')) return 1;
        if (/^172\.(1[6-9]|2\d|3[01])\./.test(ip)) return 2;
        return 3;
    };
    const result = [];
    const interfaces = os.networkInterfaces();
    for (const [name, addresses] of Object.entries(interfaces)) {
        for (const address of addresses || []) {
            if (address.family === 'IPv4' && !address.internal) {
                result.push({ interface: name, address: address.address, url: `http://${address.address}:${port}` });
            }
        }
    }
    return result.sort((a, b) => rank(a.address) - rank(b.address));
}

function networkInfo() {
    return {
        lanAccess: lanAccessEnabled,
        lanUrls: lanAccessEnabled ? getLanUrls(LOCAL_PORT) : [],
    };
}

function serverInfoPayload() {
    return {
        port: LOCAL_PORT,
        obsUrl: `http://localhost:${LOCAL_PORT}/presentation.html`,
        obsOverlayUrl: `http://localhost:${LOCAL_PORT}/presentation.html?obs`,
        hadithObsUrl: `http://localhost:${LOCAL_PORT}/hadith-presentation.html`,
        ...networkInfo(),
    };
}

// Mengaktifkan/mematikan akses jaringan. Server dihidupkan ulang pada port yang
// sama dengan alamat ikat yang baru, sehingga URL/vMix tidak perlu diubah.
async function applyNetworkAccess(enabled) {
    const next = !!enabled;
    if (next === lanAccessEnabled) return { ok: true, ...networkInfo() };

    const previous = lanAccessEnabled;
    lanAccessEnabled = next;
    appSettings.lanAccess = next;
    scheduleSettingsSave();

    if (!localServer) return { ok: true, ...networkInfo() };

    const boundPort = LOCAL_PORT;
    await new Promise(resolve => { localServer.close(() => resolve()); });
    localServer = null;

    try {
        LOCAL_PORT = await startLocalServer(boundPort);
    } catch (err) {
        // Kembalikan ke keadaan sebelumnya agar siaran tidak mati.
        lanAccessEnabled = previous;
        appSettings.lanAccess = previous;
        scheduleSettingsSave();
        try { LOCAL_PORT = await startLocalServer(boundPort); } catch (e) { /* biarkan */ }
        return { ok: false, error: err.message, ...networkInfo() };
    }

    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('server-info', serverInfoPayload());
    }
    return { ok: true, ...networkInfo() };
}

// ── Shared state: data ayat & config di memori server ─────────
// OBS Browser Source polling /api/verse untuk mendapatkan data ini
// sehingga tidak bergantung pada localStorage (yg terisolasi per browser)
let currentVerseData = null;
let currentFontSize = 100; // Default 100%
let currentTheme = 'dark'; // Default theme
let currentTemplate = 'default.html'; // Default template
let currentVisibility = true; // Show/hide state for the verse display
let currentTransVisibility = false; // Show/hide state for the translation
let currentArabicFont = 'amiri'; // Default arabic font key
let currentScrollPaused = false; // Jeda gulir otomatis pada template dua kolom
let currentLatinFont = 'system';  // Default latin font key

// ── State presentasi hadits: konten dan urutan Arab → terjemah ──
// Durasi dalam detik; translationDuration = 0 berarti tampil sampai dikendalikan operator.
let currentHadithPresentation = {
    visible: false,
    arabic: '',
    translation: '',
    riwayat: '',
    arabicImages: [],
    displayMode: 'arabic',
    template: 'lower-third',
    showRiwayat: true,
    autoTranslate: true,
    // Gulir otomatis kutipan panjang (H4): bisa dijeda operator.
    scrollPaused: false,
    // Ukuran teks hadits di layar siaran (0,8–1,4 dari ukuran dasar).
    fontScale: 1,
    arabicDuration: 8,
    translationDuration: 0,
    timer: {
        paused: false,
        phaseStartedAt: null,
        remainingMs: null,
    },
    lastUpdate: null,
};

// ── Laporan muat/tidaknya teks hadits di layar (dikirim halaman presentasi) ──
// Dipakai panel operator untuk memperingatkan kutipan yang terpotong.
let currentHadithFit = {
    fits: null,
    template: null,
    mode: null,
    lastUpdate: null,
    at: null,
};

// ── MIME types ────────────────────────────────────────────────
const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.ico': 'image/x-icon',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
    '.svg': 'image/svg+xml',
};

// Template yang boleh dipakai. Tanpa daftar ini, nama template sembarang
// (mis. karena localStorage usang atau permintaan manual) bisa membuat server
// menyajikan halaman 404 di layar siaran.
const ALLOWED_TEMPLATES = ['default.html', 'lower_third.html', 'lower_third_dark.html', 'lower_third_dual.html', 'pip_video.html', 'lower_third_glass.html', 'lower_third_midnight.html', 'lower_third_paper.html', 'lower_third_dual_sapphire.html'];

// ── Pengaturan persisten (settings.json) ─────────────────────
// Disimpan di samping EXE untuk build portable, di folder aplikasi saat
// pengembangan, atau di userData untuk build terpasang. Isinya cermin dari
// localStorage panel operator, sehingga tema/template/font/bookmark tidak
// hilang ketika aplikasi ditutup — dan tidak ikut hilang bila port server
// bergeser (localStorage terikat pada nomor port).
const SETTINGS_MAX_BYTES = 1024 * 1024;

function settingsFilePath() {
    if (process.env.PORTABLE_EXECUTABLE_DIR) return path.join(process.env.PORTABLE_EXECUTABLE_DIR, 'settings.json');
    if (!app.isPackaged) return path.join(__dirname, 'settings.json');
    return path.join(app.getPath('userData'), 'settings.json');
}

let appSettings = { values: {}, hadithTemplate: null, lanAccess: false };
let settingsSaveTimer = null;

function loadSettings() {
    try {
        const raw = fs.readFileSync(settingsFilePath(), 'utf8');
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
            const values = (parsed.values && typeof parsed.values === 'object' && !Array.isArray(parsed.values)) ? parsed.values : {};
            const clean = {};
            for (const [key, value] of Object.entries(values)) {
                if (typeof key === 'string' && typeof value === 'string') clean[key] = value;
            }
            appSettings = {
                values: clean,
                hadithTemplate: ['lower-third', 'lower-third-white', 'full-screen'].includes(parsed.hadithTemplate)
                    ? parsed.hadithTemplate
                    : null,
                lanAccess: parsed.lanAccess === true,
            };
        }
    } catch (err) {
        if (err.code !== 'ENOENT') logError('Gagal membaca settings.json: ' + err.message);
        appSettings = { values: {}, hadithTemplate: null, lanAccess: false };
    }
    return appSettings;
}

function writeSettingsNow() {
    try {
        const serialized = JSON.stringify(appSettings, null, 2);
        if (Buffer.byteLength(serialized) > SETTINGS_MAX_BYTES) {
            logError('settings.json melebihi batas, tidak disimpan.');
            return;
        }
        const target = settingsFilePath();
        const temp = target + '.tmp';
        fs.writeFileSync(temp, serialized, 'utf8');
        fs.renameSync(temp, target); // atomik: berkas lama tidak pernah setengah tertulis
    } catch (err) {
        logError('Gagal menyimpan settings.json: ' + err.message);
    }
}

function logError(message) {
    if (typeof console !== 'undefined' && typeof console.error === 'function') console.error(message);
}

function scheduleSettingsSave() {
    clearTimeout(settingsSaveTimer);
    settingsSaveTimer = setTimeout(writeSettingsNow, 400);
}

// Dipakai endpoint hadits ketika operator mengganti template. Sengaja TIDAK
// menjadwalkan penulisan di sini: endpoint HTTP harus tetap murni, dan
// localStorage panel sudah rutin memicu penyimpanan. Sisa perubahan tetap
// ditulis saat aplikasi ditutup (lihat app.on('before-quit')).
function rememberHadithTemplate(template) {
    if (!['lower-third', 'lower-third-white', 'full-screen'].includes(template)) return;
    appSettings.hadithTemplate = template;
}

// ── Helper: Save vMix JSON ──────────────────────────────────
// Folder tempat feed JSON ditulis (dipakai juga oleh pemeriksaan siaran).
function feedDirectory() {
    if (process.env.NODE_ENV === 'development' || !app.isPackaged) return __dirname;
    if (process.env.PORTABLE_EXECUTABLE_DIR) return process.env.PORTABLE_EXECUTABLE_DIR;
    return path.dirname(app.getPath('exe'));
}

function saveVmixFeed(data) {
    try {
        const outputDir = feedDirectory();
        const vmixPath = path.join(outputDir, 'vmix-feed.json');
        console.log('📁 vMix JSON path:', vmixPath);

        const vmixData = [{
            "Arab": data.arabic || "",
            "Terjemahan": data.translation || "",
            "Judul": data.info || "",
            "LastUpdate": new Date().toLocaleTimeString()
        }];

        fs.writeFileSync(vmixPath, JSON.stringify(vmixData, null, 2), 'utf8');

        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('vmix-save-ok', { path: vmixPath });
        }
    } catch (err) {
        logError('Gagal save vMix JSON: ' + err.message);
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('vmix-save-error', { error: err.message });
        }
    }
}

// ── State siaran otoritatif ──────────────────────────────────
// Satu sumber kebenaran untuk tally panel. Panel tidak lagi mengubah tampilan
// lebih dulu lalu berharap perintahnya diterima: ia mengirim perubahan, lalu
// memakai keadaan yang benar-benar dipakai server.
function broadcastState() {
    return {
        isVisible: currentVisibility,
        isTransVisible: currentTransVisibility,
        scrollPaused: currentScrollPaused,
        fontSize: currentFontSize,
        theme: currentTheme,
        template: currentTemplate,
        arabicFont: currentArabicFont,
        latinFont: currentLatinFont,
        hadithVisible: currentHadithPresentation.visible,
    };
}

function applyState(patch) {
    if (!patch || typeof patch !== 'object' || Array.isArray(patch)) {
        return { ok: false, error: 'Data tidak valid.' };
    }

    // Semua isi divalidasi lebih dulu, baru diterapkan — supaya tidak pernah ada
    // keadaan setengah berubah ketika satu bagian patch ditolak.
    const next = {};
    if (patch.isVisible !== undefined) {
        if (typeof patch.isVisible !== 'boolean') return { ok: false, error: 'Status tampil ayat harus boolean.' };
        next.isVisible = patch.isVisible;
    }
    if (patch.isTransVisible !== undefined) {
        if (typeof patch.isTransVisible !== 'boolean') return { ok: false, error: 'Status terjemah harus boolean.' };
        next.isTransVisible = patch.isTransVisible;
    }
    if (patch.fontSize !== undefined) {
        const size = Number(patch.fontSize);
        if (!Number.isFinite(size) || size < 50 || size > 200) return { ok: false, error: 'Ukuran teks harus antara 50 dan 200.' };
        next.fontSize = Math.round(size);
    }
    if (patch.theme !== undefined) {
        if (!['dark', 'light'].includes(patch.theme)) return { ok: false, error: 'Tema tidak dikenal.' };
        next.theme = patch.theme;
    }
    if (patch.template !== undefined) {
        if (!ALLOWED_TEMPLATES.includes(patch.template)) return { ok: false, error: 'Template tidak dikenal.' };
        next.template = patch.template;
    }
    if (patch.hadithVisible !== undefined) {
        if (typeof patch.hadithVisible !== 'boolean') return { ok: false, error: 'Status hadits harus boolean.' };
        next.hadithVisible = patch.hadithVisible;
    }
    if (patch.scrollPaused !== undefined) {
        if (typeof patch.scrollPaused !== 'boolean') return { ok: false, error: 'Status jeda gulir harus boolean.' };
        next.scrollPaused = patch.scrollPaused;
    }

    const send = (channel, payload) => {
        if (presentationWindow && !presentationWindow.isDestroyed()) {
            presentationWindow.webContents.send(channel, payload);
        }
    };

    if (next.isVisible !== undefined) {
        currentVisibility = next.isVisible;
        if (next.isVisible) {
            // Ayat dan hadits tidak boleh tayang bersamaan.
            currentHadithPresentation.visible = false;
            currentHadithPresentation.displayMode = 'arabic';
            currentHadithPresentation.timer = { paused: true, phaseStartedAt: null, remainingMs: null };
            currentHadithPresentation.lastUpdate = nextHadithStamp();
        }
        send('toggle-visibility', currentVisibility);
    }
    if (next.isTransVisible !== undefined) {
        currentTransVisibility = next.isTransVisible;
        send('toggle-trans-visibility', currentTransVisibility);
    }
    if (next.fontSize !== undefined) {
        currentFontSize = next.fontSize;
        send('update-font-size', currentFontSize);
    }
    if (next.scrollPaused !== undefined) {
        currentScrollPaused = next.scrollPaused;
        send('toggle-scroll-pause', currentScrollPaused);
    }
    if (next.theme !== undefined) {
        currentTheme = next.theme;
        send('update-theme', currentTheme);
    }
    if (next.template !== undefined) {
        currentTemplate = next.template;
        send('update-template', currentTemplate);
    }
    if (next.hadithVisible !== undefined) {
        currentHadithPresentation.visible = next.hadithVisible;
        currentHadithPresentation.lastUpdate = nextHadithStamp();
    }

    return { ok: true, state: broadcastState() };
}

// Stempel waktu hadits harus selalu naik: klien polling memakai perubahan
// stempel ini untuk tahu ada konten baru.
function nextHadithStamp() {
    const previous = Date.parse(currentHadithPresentation.lastUpdate) || 0;
    return new Date(Math.max(Date.now(), previous + 1)).toISOString();
}

// Validasi menyeluruh untuk satu permintaan POST /api/verse. Dipakai SEBELUM
// perubahan apa pun, sehingga permintaan yang ditolak tidak menyisakan
// perubahan setengah jadi (dulu tiap field diterapkan sambil berjalan).
function validateVerseUpdate(data) {
    if (!data || typeof data !== 'object' || Array.isArray(data)) return 'Data tidak valid.';

    const bad = [
        [data.isVisible !== undefined && typeof data.isVisible !== 'boolean', 'Status tampil ayat harus boolean.'],
        [data.isTransVisible !== undefined && typeof data.isTransVisible !== 'boolean', 'Status terjemah harus boolean.'],
        [data.fontSize !== undefined && !(Number.isFinite(Number(data.fontSize)) && Number(data.fontSize) >= 50 && Number(data.fontSize) <= 200), 'Ukuran teks harus antara 50 dan 200.'],
        [data.theme !== undefined && !['dark', 'light'].includes(data.theme), 'Tema tidak dikenal.'],
        [data.template !== undefined && !ALLOWED_TEMPLATES.includes(data.template), 'Template tidak dikenal: ' + data.template],
        [data.arabic !== undefined && typeof data.arabic !== 'string', 'Teks Arab harus berupa teks.'],
        [data.translation !== undefined && typeof data.translation !== 'string', 'Terjemahan harus berupa teks.'],
        [data.info !== undefined && typeof data.info !== 'string', 'Keterangan ayat harus berupa teks.'],
        [data.arabicFont !== undefined && typeof data.arabicFont !== 'string', 'Nama font Arab tidak valid.'],
        [data.latinFont !== undefined && typeof data.latinFont !== 'string', 'Nama font Latin tidak valid.'],
        [data.scrollPaused !== undefined && typeof data.scrollPaused !== 'boolean', 'Status jeda gulir harus boolean.'],
    ];
    for (const [isBad, message] of bad) {
        if (isBad) return message;
    }
    return null;
}

// ── Halaman baca hadits dari paket terkompresi ──────────────
// tools/pack-reading.js mengemas ±28.450 halaman HTML menjadi satu berkas
// (199 MB → ±66 MB). Server menyajikan halaman itu per permintaan; bila folder
// aslinya masih ada (mis. setelah membangun ulang data), folder itulah yang
// dipakai lebih dulu.
const READING_PAK = path.join(__dirname, 'data', 'hadith', 'reading.pak');
let readingPakIndex = null;
let readingPakHeaderSize = 0;
let readingPakUnavailable = false;

function loadReadingPakIndex() {
    if (readingPakIndex || readingPakUnavailable) return readingPakIndex;
    try {
        const fd = fs.openSync(READING_PAK, 'r');
        try {
            const sizeBuffer = Buffer.alloc(4);
            fs.readSync(fd, sizeBuffer, 0, 4, 0);
            const headerLength = sizeBuffer.readUInt32LE(0);
            const headerBuffer = Buffer.alloc(headerLength);
            fs.readSync(fd, headerBuffer, 0, headerLength, 4);
            readingPakIndex = JSON.parse(headerBuffer.toString('utf8'));
            readingPakHeaderSize = headerLength + 4;
        } finally {
            fs.closeSync(fd);
        }
    } catch (err) {
        readingPakUnavailable = true;
        readingPakIndex = null;
    }
    return readingPakIndex;
}

function readFromReadingPak(key) {
    const index = loadReadingPakIndex();
    if (!index || !Object.prototype.hasOwnProperty.call(index, key)) return null;
    const entry = index[key];
    if (!Array.isArray(entry) || entry.length !== 2) return null;
    const [offset, length] = entry;
    const fd = fs.openSync(READING_PAK, 'r');
    try {
        const buffer = Buffer.alloc(length);
        fs.readSync(fd, buffer, 0, length, readingPakHeaderSize + offset);
        // Halaman disimpan sebagai gzip; deteksi magic 1f 8b agar format
        // tanpa kompresi pun tetap terbaca.
        if (buffer.length >= 2 && buffer[0] === 0x1f && buffer[1] === 0x8b) return zlib.gunzipSync(buffer);
        return buffer;
    } finally {
        fs.closeSync(fd);
    }
}

// ── Keamanan permintaan ──────────────────────────────────────
// Sejak akses jaringan lokal tersedia, server bisa dijangkau komputer lain.
// Yang diizinkan mengubah state hanyalah halaman milik aplikasi ini sendiri:
// origin localhost atau salah satu alamat IP mesin ini. Situs lain di jaringan
// (atau tab browser lain) tidak boleh mengubah tayangan.
let allowedHostsCache = { at: 0, hosts: new Set() };

function allowedOriginHosts() {
    const now = Date.now();
    if (now - allowedHostsCache.at < 5000) return allowedHostsCache.hosts;
    const hosts = new Set(['localhost', '127.0.0.1', '[::1]', '::1']);
    try {
        for (const entry of getLanUrls(LOCAL_PORT)) hosts.add(entry.address);
    } catch (err) { /* tanpa jaringan */ }
    allowedHostsCache = { at: now, hosts };
    return hosts;
}

function corsHeaders(req) {
    const origin = req.headers.origin;
    if (!origin) return {};
    try {
        const url = new URL(origin);
        if (allowedOriginHosts().has(url.hostname)) {
            return { 'Access-Control-Allow-Origin': origin, Vary: 'Origin' };
        }
    } catch (err) { /* Origin tidak valid */ }
    return {}; // tanpa header CORS → browser menolak membaca respons
}

function isTrustedWrite(req) {
    const origin = req.headers.origin || req.headers.referer;
    if (!origin) return true; // curl / OBS / skrip lokal tanpa Origin
    try {
        return allowedOriginHosts().has(new URL(origin).hostname);
    } catch (err) {
        return false;
    }
}

// ── Built-in Local HTTP Server ────────────────────────────────
function startLocalServer(port) {
    return new Promise((resolve, reject) => {
        const server = http.createServer((req, res) => {
            const parsedUrl = urlModule.parse(req.url);
            let reqPath = decodeURIComponent(parsedUrl.pathname || '/');

            // ── CORS OPTIONS Preflight ─────────────────────────
            if (req.method === 'OPTIONS') {
                res.writeHead(204, {
                    ...corsHeaders(req),
                    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type',
                });
                res.end();
                return;
            }

            // ── Tolak perubahan state dari origin asing ────────
            if ((req.method === 'POST' || req.method === 'PUT' || req.method === 'DELETE') && !isTrustedWrite(req)) {
                res.writeHead(403, { 'Content-Type': 'application/json; charset=utf-8', ...corsHeaders(req) });
                res.end(JSON.stringify({ error: 'Asal permintaan tidak diizinkan.' }));
                return;
            }

            // ── API hadits: state khusus layar hadits ──────────
            if (reqPath === '/api/hadith') {
                const respond = (status, data) => {
                    res.writeHead(status, {
                        'Content-Type': 'application/json; charset=utf-8',
                        'Cache-Control': 'no-store',
                        ...corsHeaders(req),
                        ...(status === 405 ? { Allow: 'GET, POST, OPTIONS' } : {}),
                    });
                    res.end(JSON.stringify(data));
                };
                if (req.method === 'GET') {
                    respond(200, { ...currentHadithPresentation, fit: currentHadithFit });
                    return;
                }
                if (req.method !== 'POST') {
                    respond(405, { error: 'Metode tidak didukung.' });
                    return;
                }
                const chunks = [];
                let size = 0;
                let oversized = false;
                req.on('data', chunk => {
                    size += chunk.length;
                    if (size > 1024 * 1024) {
                        if (!oversized) respond(413, { error: 'Data hadits terlalu besar.' });
                        oversized = true;
                        chunks.length = 0;
                    } else if (!oversized) chunks.push(chunk);
                });
                req.on('end', () => {
                    if (oversized) return;
                    try {
                        const data = JSON.parse(Buffer.concat(chunks).toString('utf8'));
                        if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Data harus berupa objek JSON.');
                        const text = (key, required = false) => {
                            const value = data[key] ?? '';
                            if (typeof value !== 'string' || value.length > 100000 || (required && !value.trim())) throw new Error('Field ' + key + ' tidak valid.');
                            return value;
                        };
                        const { arabic, translation, riwayat } = cleanHadithPresentation({
                            arabic: text('arabic'), translation: text('translation', true), riwayat: text('riwayat')
                        });
                        if (!translation) throw new Error('Terjemahan hadits kosong setelah informasi arsip dibersihkan.');
                        const template = data.template ?? currentHadithPresentation.template;
                        if (!['lower-third', 'lower-third-white', 'full-screen'].includes(template)) throw new Error('Template hadits tidak valid.');
                        const arabicImages = data.arabicImages ?? [];
                        if (!Array.isArray(arabicImages) || arabicImages.length > 20 || arabicImages.some(src => typeof src !== 'string' || !/^data\/hadith\/assets\/[\w-]+\/[\w.-]+\.(gif|png|jpe?g)$/i.test(src) || src.includes('..'))) throw new Error('Aset Arab tidak valid.');
                        if (!arabic.trim() && !arabicImages.length) throw new Error('Teks atau gambar Arab wajib tersedia.');
                        const boolean = key => {
                            if (data[key] === undefined) return currentHadithPresentation[key];
                            if (typeof data[key] !== 'boolean') throw new Error('Field ' + key + ' harus boolean.');
                            return data[key];
                        };
                        const duration = (key, minimum) => {
                            const value = data[key] ?? currentHadithPresentation[key];
                            if (typeof value !== 'number' || !Number.isFinite(value) || value < minimum || value > 3600) throw new Error('Durasi ' + key + ' tidak valid.');
                            return value;
                        };
                        const next = {
                            // Loading a selection prepares it; operator controls when it goes on air.
                            visible: data.visible === undefined ? false : boolean('visible'),
                            arabic, translation, riwayat, arabicImages,
                            displayMode: 'arabic',
                            template,
                            showRiwayat: boolean('showRiwayat'),
                            scrollPaused: false,   // kutipan baru selalu mulai dari atas
                            fontScale: Number.isFinite(currentHadithPresentation.fontScale)
                                ? currentHadithPresentation.fontScale : 1,
                            autoTranslate: boolean('autoTranslate'),
                            arabicDuration: duration('arabicDuration', 1),
                            translationDuration: duration('translationDuration', 0),
                            timer: { paused: false, phaseStartedAt: null, remainingMs: null },
                            lastUpdate: new Date(Math.max(Date.now(), Date.parse(currentHadithPresentation.lastUpdate) + 1 || 0)).toISOString(),
                        };
                        currentHadithPresentation = next;
                        // Laporan lama tidak berlaku untuk kutipan baru.
                        currentHadithFit = { fits: null, template: next.template, mode: 'arabic', lastUpdate: null, at: null };
                        if (next.visible) currentVisibility = false;
                        respond(200, { success: true, state: next });
                    } catch (err) {
                        respond(400, { error: err.message });
                    }
                });
                return;
            }

            // ── API kontrol manual fase hadits ───────────────
            if (reqPath === '/api/hadith/control') {
                const respond = (status, data) => {
                    res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...corsHeaders(req) });
                    res.end(JSON.stringify(data));
                };
                if (req.method !== 'POST') { respond(405, { error: 'Gunakan POST.' }); return; }
                let body = '';
                req.on('data', chunk => { body += chunk; if (body.length > 32000) req.destroy(); });
                req.on('end', () => {
                    try {
                        const data = JSON.parse(body || '{}');
                        const action = data.action;
                        if (action !== 'template' && (!currentHadithPresentation.translation || (!currentHadithPresentation.arabic.trim() && !currentHadithPresentation.arabicImages.length))) throw new Error('Belum ada hadits aktif.');
                        if (action === 'template') {
                            if (!['lower-third', 'lower-third-white', 'full-screen'].includes(data.template)) throw new Error('Template hadits tidak valid.');
                            currentHadithPresentation.template = data.template;
                            rememberHadithTemplate(data.template);
                        } else if (action === 'arabic' || action === 'translation') {
                            if (action === 'translation' && !currentHadithPresentation.visible) throw new Error('Tampilkan hadits sebelum mengaktifkan terjemah.');
                            if (action === 'translation' && !currentHadithPresentation.translation) throw new Error('Terjemah tidak tersedia.');
                            currentHadithPresentation.displayMode = action;
                            currentHadithPresentation.timer = { paused: true, phaseStartedAt: null, remainingMs: null };
                        } else if (action === 'visibility') {
                            if (typeof data.visible !== 'boolean') throw new Error('Status tampil harus boolean.');
                            currentHadithPresentation.visible = data.visible;
                            if (data.visible) currentVisibility = false;
                            if (!data.visible) currentHadithPresentation.displayMode = 'arabic';
                            currentHadithPresentation.timer = { paused: true, phaseStartedAt: null, remainingMs: null };
                        } else if (action === 'scale') {
                            const scale = Number(data.scale);
                            if (!Number.isFinite(scale) || scale < 0.8 || scale > 1.4) {
                                throw new Error('Ukuran tayang harus antara 80% dan 140%.');
                            }
                            currentHadithPresentation.fontScale = Math.round(scale * 100) / 100;
                        } else if (action === 'scroll') {
                            if (typeof data.paused !== 'boolean') throw new Error('Status jeda gulir harus boolean.');
                            currentHadithPresentation.scrollPaused = data.paused;
                        } else if (action === 'pause') {
                            currentHadithPresentation.autoTranslate = false;
                            currentHadithPresentation.timer = { ...currentHadithPresentation.timer, paused: true };
                        } else if (action === 'resume') {
                            currentHadithPresentation.autoTranslate = true;
                            currentHadithPresentation.timer = { ...currentHadithPresentation.timer, paused: false, phaseStartedAt: Date.now() };
                        } else if (action === 'durations') {
                            const arabicDuration = Number(data.arabicDuration);
                            const translationDuration = Number(data.translationDuration);
                            if (!Number.isFinite(arabicDuration) || arabicDuration < 1 || arabicDuration > 3600 || !Number.isFinite(translationDuration) || translationDuration < 0 || translationDuration > 3600) throw new Error('Durasi harus Arab 1–3600 detik dan terjemah 0–3600 detik.');
                            currentHadithPresentation.arabicDuration = arabicDuration;
                            currentHadithPresentation.translationDuration = translationDuration;
                            currentHadithPresentation.timer = { paused: false, phaseStartedAt: Date.now(), remainingMs: null };
                        } else throw new Error('Perintah kontrol tidak dikenal.');
                        // Jeda gulir tidak boleh memicu render ulang: teks akan
                        // kembali ke atas dan posisi jeda hilang.
                        if (action !== 'scroll') {
                            currentHadithPresentation.lastUpdate = new Date(Math.max(Date.now(), Date.parse(currentHadithPresentation.lastUpdate) + 1 || 0)).toISOString();
                        }
                        respond(200, { success: true, state: currentHadithPresentation });
                    } catch (err) { respond(400, { error: err.message }); }
                });
                return;
            }

            // ── API laporan muat/tidaknya hadits di layar ─────
            // Hanya halaman presentasi yang tahu hasil ukur sebenarnya,
            // jadi hasilnya dikirim ke sini agar panel operator bisa memperingatkan.
            if (reqPath === '/api/hadith/fit') {
                const respond = (status, data) => {
                    res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...corsHeaders(req) });
                    res.end(JSON.stringify(data));
                };
                if (req.method !== 'POST') { respond(405, { error: 'Gunakan POST.' }); return; }
                let body = '';
                req.on('data', chunk => { body += chunk; if (body.length > 4000) req.destroy(); });
                req.on('end', () => {
                    try {
                        const data = JSON.parse(body || '{}');
                        if (typeof data.fits !== 'boolean') throw new Error('Status muat harus boolean.');
                        if (!['lower-third', 'lower-third-white', 'full-screen'].includes(data.template)) throw new Error('Template hadits tidak valid.');
                        if (!['arabic', 'translation'].includes(data.mode)) throw new Error('Mode tampilan tidak valid.');
                        currentHadithFit = {
                            fits: data.fits,
                            template: data.template,
                            mode: data.mode,
                            lastUpdate: typeof data.lastUpdate === 'string' ? data.lastUpdate : null,
                            at: Date.now(),
                        };
                        respond(200, { success: true, fit: currentHadithFit });
                    } catch (err) { respond(400, { error: err.message }); }
                });
                return;
            }

            // ── API: /api/ping (pemeriksaan siaran) ──────────
            if (reqPath === '/api/ping') {
                res.writeHead(200, {
                    'Content-Type': 'application/json; charset=utf-8',
                    'Cache-Control': 'no-store',
                    ...corsHeaders(req),
                });
                res.end(JSON.stringify({ ok: true, port: LOCAL_PORT }));
                return;
            }

            // ── API: /api/verse (GET & POST) ──────────────────
            // OBS & vMix Browser Source polling GET tiap 500ms
            // Web operator browser juga bisa POST update
            if (reqPath === '/api/verse') {
                if (req.method === 'POST') {
                    let body = '';
                    req.on('data', chunk => { body += chunk; if (body.length > 200000) req.destroy(); });
                    req.on('end', () => {
                        let data;
                        try {
                            data = JSON.parse(body || '{}');
                        } catch (err) {
                            res.writeHead(400, { 'Content-Type': 'application/json', ...corsHeaders(req) });
                            res.end(JSON.stringify({ error: 'JSON tidak valid.' }));
                            return;
                        }

                        // Validasi SELURUH permintaan lebih dulu. Bila satu bagian
                        // ditolak, tidak ada satu pun perubahan yang tersisa.
                        const problem = validateVerseUpdate(data);
                        if (problem) {
                            res.writeHead(400, { 'Content-Type': 'application/json', ...corsHeaders(req) });
                            res.end(JSON.stringify({ error: problem }));
                            return;
                        }

                        // Isi ayat lebih dulu, supaya ketika layar dinyalakan server
                        // sudah memegang ayat yang benar.
                        if (data.arabic) {
                            currentVerseData = {
                                arabic: data.arabic,
                                translation: data.translation,
                                info: data.info,
                                ts: data.ts || Date.now()
                            };
                            saveVmixFeed(currentVerseData);
                            if (presentationWindow && !presentationWindow.isDestroyed()) {
                                presentationWindow.webContents.send('verse-update', currentVerseData);
                            }
                        }
                        if (data.arabicFont || data.latinFont) {
                            if (data.arabicFont) currentArabicFont = data.arabicFont;
                            if (data.latinFont) currentLatinFont = data.latinFont;
                            if (presentationWindow && !presentationWindow.isDestroyed()) {
                                presentationWindow.webContents.send('update-font', { arabicFont: currentArabicFont, latinFont: currentLatinFont });
                            }
                        }

                        // Field state lewat satu pintu yang sama dengan panel operator.
                        const applied = applyState({
                            isVisible: data.isVisible,
                            isTransVisible: data.isTransVisible,
                            fontSize: data.fontSize,
                            theme: data.theme,
                            template: data.template,
                            scrollPaused: data.scrollPaused,
                        });
                        if (!applied.ok) {
                            res.writeHead(400, { 'Content-Type': 'application/json', ...corsHeaders(req) });
                            res.end(JSON.stringify({ error: applied.error }));
                            return;
                        }

                        res.writeHead(200, {
                            'Content-Type': 'application/json',
                            ...corsHeaders(req),
                        });
                        res.end(JSON.stringify({ success: true, state: applied.state }));
                    });
                    return;
                }

                res.writeHead(200, {
                    'Content-Type': 'application/json',
                    'Cache-Control': 'no-cache',
                    ...corsHeaders(req),
                });
                const response = {
                    ...(currentVerseData || {}),
                    fontSize: currentFontSize,
                    theme: currentTheme,
                    template: currentTemplate,
                    isVisible: currentVisibility,
                    isTransVisible: currentTransVisibility,
        scrollPaused: currentScrollPaused,
                    arabicFont: currentArabicFont,
                    latinFont: currentLatinFont
                };
                res.end(JSON.stringify(response));
                return;
            }

            // ── Static file serving ───────────────────────────
            const safePath = path.normalize(reqPath).replace(/^(\.\.[/\\])+/, '');
            let filePath = path.join(__dirname, safePath === '/' ? 'index.html' : safePath);

            // Pastikan hasil resolusi tetap di dalam folder aplikasi. Tanpa ini,
            // permintaan yang dibuat khusus dapat menyentuh berkas di luar paket.
            const appRoot = path.resolve(__dirname);
            const resolved = path.resolve(filePath);
            if (resolved !== appRoot && !resolved.startsWith(appRoot + path.sep)) {
                res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
                res.end('403 Forbidden');
                return;
            }
            filePath = resolved;

            const ext = path.extname(filePath).toLowerCase();
            const contentType = MIME_TYPES[ext] || 'application/octet-stream';

            // Kebijakan keamanan konten untuk halaman HTML: hanya skrip/gaya dari
            // aplikasi ini (ditambah gaya inline yang memang dipakai antarmuka).
            const csp = [
                "default-src 'self'",
                "script-src 'self' 'unsafe-inline'",
                "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
                "font-src 'self' data: https://fonts.gstatic.com",
                "img-src 'self' data: blob:",
                "media-src 'self' blob:",
                "connect-src 'self'",
                "frame-src 'self'",
                "object-src 'none'",
                "base-uri 'none'",
                "form-action 'none'",
            ].join('; ');

            // Berkas dikirim dengan streaming (bukan dibaca penuh ke memori) dan
            // dilengkapi ETag, sehingga pemuatan ulang halaman oleh OBS/vMix tidak
            // mengirim ulang isi yang sama.
            fs.stat(filePath, (err, stat) => {
                if (err || !stat.isFile()) {
                    // Halaman baca hadits mungkin sudah dikemas ke reading.pak.
                    const readingPrefix = '/data/hadith/reading/';
                    if (reqPath.startsWith(readingPrefix)) {
                        const packed = readFromReadingPak(reqPath.slice(readingPrefix.length));
                        if (packed) {
                            res.writeHead(200, {
                                'Content-Type': 'text/html; charset=utf-8',
                                'Content-Length': packed.length,
                                'Cache-Control': 'no-cache',
                                ...corsHeaders(req),
                            });
                            res.end(packed);
                            return;
                        }
                    }
                    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
                    res.end('404 Not Found');
                    return;
                }

                const etag = 'W/"' + stat.size.toString(16) + '-' + Math.floor(stat.mtimeMs).toString(16) + '"';
                if (req.headers['if-none-match'] === etag) {
                    res.writeHead(304, { ETag: etag, ...corsHeaders(req) });
                    res.end();
                    return;
                }

                res.writeHead(200, {
                    'Content-Type': contentType,
                    'Content-Length': stat.size,
                    'Cache-Control': 'no-cache',
                    'Last-Modified': stat.mtime.toUTCString(),
                    ETag: etag,
                    ...(ext === '.html' ? { 'Content-Security-Policy': csp } : {}),
                    ...corsHeaders(req),
                });

                const stream = fs.createReadStream(filePath);
                stream.on('error', () => {
                    // Koneksi diputus tanpa membuat proses ikut gagal.
                    if (!res.headersSent) {
                        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
                        res.end('500 Read Error');
                    } else {
                        res.destroy();
                    }
                });
                stream.pipe(res);
            });
        });

        const host = lanAccessEnabled ? '0.0.0.0' : '127.0.0.1';
        server.listen(port, host, () => {
            localServer = server;
            console.log(`✅ Webquran local server: http://localhost:${port}`);
            console.log(`📺 OBS Browser Source: http://localhost:${port}/presentation.html`);
            if (lanAccessEnabled) {
                const urls = getLanUrls(port);
                console.log(urls.length
                    ? `🌐 Akses jaringan lokal aktif: ${urls.map(u => u.url).join(', ')}`
                    : '🌐 Akses jaringan lokal aktif, tetapi tidak ada alamat IPv4 yang terdeteksi.');
            }
            resolve(port);
        });

        server.on('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                resolve(startLocalServer(port + 1));
            } else {
                reject(err);
            }
        });
    });
}

// ── Create Main Window (Operator Panel) ─────────────────────
function createMainWindow(port) {
    // Ukuran mengikuti layar kerja yang tersedia: pada laptop 1366×768 jendela
    // 900 px sebelumnya lebih tinggi daripada layar, sehingga status bar dan
    // slider ukuran tayang tertutup taskbar.
    const workArea = screen.getPrimaryDisplay().workAreaSize;
    const windowWidth = Math.min(1400, Math.max(1024, workArea.width - 40));
    const windowHeight = Math.min(900, Math.max(600, workArea.height - 40));

    mainWindow = new BrowserWindow({
        width: windowWidth,
        height: windowHeight,
        minWidth: 960,
        minHeight: 580,
        title: 'Webquran v' + app.getVersion(),
        backgroundColor: '#0f172a',
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: true,
        },
    });

    mainWindow.loadURL(`http://localhost:${port}/index.html`);

    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        const target = new URL(url);
        if (target.origin === `http://localhost:${port}` && ['/presentation.html', '/hadith-presentation.html'].includes(target.pathname)) {
            createPresentationWindow(port, target.pathname === '/hadith-presentation.html' ? 'hadith' : 'quran');
            return { action: 'deny' };
        }
        if (url.startsWith('http://') || url.startsWith('https://')) {
            shell.openExternal(url);
            return { action: 'deny' };
        }
        return { action: 'allow' };
    });

    mainWindow.webContents.on('did-finish-load', () => {
        mainWindow.webContents.send('server-info', serverInfoPayload());
    });

    mainWindow.on('closed', () => {
        if (presentationWindow && !presentationWindow.isDestroyed()) {
            presentationWindow.close();
        }
        if (localServer) localServer.close();
        mainWindow = null;
        app.quit();
    });
}

// ── Create Presentation Window (Layar Display) ────────────────
function getPresentationState() {
    const open = !!(presentationWindow && !presentationWindow.isDestroyed());
    return { open, content: open ? presentationContent : null };
}

function notifyPresentationState() {
    if (mainWindow && !mainWindow.isDestroyed()) {
        const state = getPresentationState();
        mainWindow.webContents.send('presentation-status', state.open);
        mainWindow.webContents.send('presentation-state', state);
    }
}

function createPresentationWindow(port, content = 'quran') {
    if (!['quran', 'hadith'].includes(content)) return;
    const page = content === 'hadith' ? 'hadith-presentation.html' : 'presentation.html';
    const targetUrl = `http://localhost:${port}/${page}`;
    if (presentationWindow && !presentationWindow.isDestroyed()) {
        if (presentationContent !== content) {
            presentationContent = content;
            presentationWindow.loadURL(targetUrl);
        }
        presentationWindow.focus();
        notifyPresentationState();
        return;
    }

    const displays = screen.getAllDisplays();
    const primaryDisplay = screen.getPrimaryDisplay();
    const secondDisplay = displays.find(d => d.id !== primaryDisplay.id);
    const targetDisplay = secondDisplay || primaryDisplay;
    const { x, y, width, height } = targetDisplay.bounds;

    presentationWindow = new BrowserWindow({
        x, y, width, height,
        title: 'Webquran — Layar Presentasi',
        frame: false,
        backgroundColor: '#0a0f1e',
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: true,
        },
    });

    presentationContent = content;
    presentationWindow.loadURL(targetUrl);
    notifyPresentationState();

    presentationWindow.on('closed', () => {
        presentationWindow = null;
        presentationContent = null;
        notifyPresentationState();
    });
}

// ── App Lifecycle + IPC Handlers ─────────────────────────────
// ── Satu instance saja ────────────────────────────────────────
// Dua instance berarti dua server dengan port berbeda; OBS/vMix bisa menunjuk
// instance yang salah dan operator melihat layar yang tidak bereaksi.
// Karena itu instance kedua tidak dijalankan — jendela yang ada difokuskan.
const hasSingleInstanceLock = app.requestSingleInstanceLock();
if (!hasSingleInstanceLock) {
    app.quit();
} else {
    app.on('second-instance', () => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.show();
            mainWindow.focus();
        }
    });
}

app.whenReady().then(async () => {
    if (!hasSingleInstanceLock) return;

    // Pengaturan dibaca sebelum jendela dibuat: preload memintanya secara
    // sinkron (sendSync) agar tema/template/font sudah pulih sebelum skrip
    // halaman berjalan.
    loadSettings();
    if (appSettings.hadithTemplate) currentHadithPresentation.template = appSettings.hadithTemplate;
    lanAccessEnabled = appSettings.lanAccess === true;

    ipcMain.on('settings:get-sync', (event) => { event.returnValue = { ...appSettings, appVersion: app.getVersion() }; });
    ipcMain.on('settings:set', (event, key, value) => {
        if (typeof key !== 'string' || !key || key.length > 120) return;
        if (value === null) {
            delete appSettings.values[key];
            scheduleSettingsSave();
            return;
        }
        if (typeof value !== 'string' || value.length > 300000) return;
        appSettings.values[key] = value;
        scheduleSettingsSave();
    });
    ipcMain.handle('settings:path', () => settingsFilePath());

    const port = await startLocalServer(LOCAL_PORT);
    LOCAL_PORT = port;

    createMainWindow(port);

    ipcMain.on('open-presentation', (event, content = 'quran') => {
        createPresentationWindow(LOCAL_PORT, content);
    });

    ipcMain.on('close-presentation', () => {
        if (presentationWindow && !presentationWindow.isDestroyed()) {
            presentationWindow.close();
        }
    });

    ipcMain.handle('get-presentation-status', () => {
        return !!(presentationWindow && !presentationWindow.isDestroyed());
    });

    ipcMain.handle('get-presentation-state', () => getPresentationState());

    ipcMain.handle('get-server-info', () => serverInfoPayload());

    ipcMain.handle('network:set-lan', async (event, enabled) => applyNetworkAccess(enabled));

    // Terapkan perubahan state siaran; balasannya adalah keadaan otoritatif.
    ipcMain.handle('apply-state', (event, patch) => applyState(patch));

    // ── Pemeriksaan siaran (pre-flight) ─────────────────────
    // Menjawab hal-hal yang hanya diketahui main process: jumlah layar,
    // apakah folder feed bisa ditulis, dan apakah berkas data terbaca.
    ipcMain.handle('diagnostics:run', async () => {
        const primary = screen.getPrimaryDisplay();
        const displays = screen.getAllDisplays().map(d => ({
            width: d.size.width,
            height: d.size.height,
            primary: d.id === primary.id,
        }));

        let feed = { ok: false, dir: '', error: '' };
        try {
            const dir = feedDirectory();
            const probe = path.join(dir, '.write-test');
            fs.writeFileSync(probe, 'ok', 'utf8');
            fs.unlinkSync(probe);
            feed = { ok: true, dir, error: '' };
        } catch (err) {
            feed = { ok: false, dir: '', error: err.message };
        }

        let hadith = { ok: false, sources: 0, error: '' };
        try {
            const catalog = JSON.parse(fs.readFileSync(path.join(__dirname, 'data/hadith/catalog.json'), 'utf8'));
            hadith = { ok: Array.isArray(catalog.sources) && catalog.sources.length > 0, sources: (catalog.sources || []).length, error: '' };
        } catch (err) {
            hadith = { ok: false, sources: 0, error: err.message };
        }

        let fonts = { ok: false, files: 0, error: '' };
        try {
            const css = fs.readFileSync(path.join(__dirname, 'assets/fonts/fonts.css'), 'utf8');
            fonts = { ok: true, files: (css.match(/\.woff2/g) || []).length, error: '' };
        } catch (err) {
            fonts = { ok: false, files: 0, error: err.message };
        }

        let quran = { ok: false, error: '' };
        try {
            quran = { ok: fs.existsSync(path.join(__dirname, 'js/quran-data.js')), error: '' };
        } catch (err) {
            quran = { ok: false, error: err.message };
        }

        return {
            appVersion: app.getVersion(),
            port: LOCAL_PORT,
            displays,
            feed,
            hadith,
            fonts,
            quran,
            settingsPath: settingsFilePath(),
            ...networkInfo(),
        };
    });

    // ── Simpan verse data & forward ke presentation window ──
    ipcMain.on('verse-update', (event, data) => {
        // Simpan di memori server → bisa diakses via /api/verse
        currentVerseData = data;

        // Juga kirim langsung ke presentation window via IPC
        if (presentationWindow && !presentationWindow.isDestroyed()) {
            presentationWindow.webContents.send('verse-update', data);
        }

        // ── Auto-save vMix JSON ──────────────────────────────
        saveVmixFeed(data);
    });

    // ── Update Font Size (from Slider) ───────────────────────
    ipcMain.on('update-font-size', (event, size) => {
        currentFontSize = size;
        // Broadcast ke presentation window (IPC)
        if (presentationWindow && !presentationWindow.isDestroyed()) {
            presentationWindow.webContents.send('update-font-size', size);
        }
        // OBS akan dapat update via polling /api/verse
    });

    // ── Update Theme (from Presentation Window) ──────────────
    ipcMain.on('update-theme', (event, theme) => {
        currentTheme = theme;
        // Broadcast ke presentation window (IPC) — termasuk Electron dual screen
        if (presentationWindow && !presentationWindow.isDestroyed()) {
            presentationWindow.webContents.send('update-theme', theme);
        }
        // OBS akan dapat update via polling /api/verse
    });

    // ── Update Template (from Operator Panel) ──────────────
    ipcMain.on('update-template', (event, templateName) => {
        currentTemplate = templateName;
        if (presentationWindow && !presentationWindow.isDestroyed()) {
            presentationWindow.webContents.send('update-template', templateName);
        }
    });

    // ── Toggle Visibility (from Operator Panel) ──────────────
    ipcMain.on('toggle-visibility', (event, isVisible) => {
        currentVisibility = isVisible;
        if (presentationWindow && !presentationWindow.isDestroyed()) {
            presentationWindow.webContents.send('toggle-visibility', isVisible);
        }
    });

    ipcMain.on('toggle-trans-visibility', (event, isTransVisible) => {
        currentTransVisibility = isTransVisible;
        if (presentationWindow && !presentationWindow.isDestroyed()) {
            presentationWindow.webContents.send('toggle-trans-visibility', isTransVisible);
        }
    });

    // ── Update Font (from Operator Panel) ────────────────────
    ipcMain.on('update-font', (event, fontData) => {
        if (fontData.arabicFont) currentArabicFont = fontData.arabicFont;
        if (fontData.latinFont)  currentLatinFont  = fontData.latinFont;
        // Broadcast ke presentation window (IPC)
        if (presentationWindow && !presentationWindow.isDestroyed()) {
            presentationWindow.webContents.send('update-font', fontData);
        }
        // OBS akan dapat update via polling /api/verse
    });

    ipcMain.on('toggle-fullscreen', () => {
        if (presentationWindow && !presentationWindow.isDestroyed()) {
            presentationWindow.setFullScreen(!presentationWindow.isFullScreen());
        }
    });

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createMainWindow(LOCAL_PORT);
        }
    });
});

// Tulis sisa perubahan pengaturan saat aplikasi ditutup, supaya pilihan
// template hadits (dan apa pun yang belum sempat ditulis) tidak hilang.
app.on('before-quit', () => {
    clearTimeout(settingsSaveTimer);
    writeSettingsNow();
});

app.on('window-all-closed', () => {
    app.quit();
});
