// ============================================================
// Webquran v5 — Preload Script (Context Bridge)
// ============================================================

const { contextBridge, ipcRenderer } = require('electron');

// ── Hidrasi pengaturan ──────────────────────────────────────
// settings.json dibaca secara sinkron SEBELUM skrip halaman berjalan, lalu
// nilainya disalin ke localStorage. Dengan begitu tema, template, font,
// bookmark, dan riwayat tetap ada walau aplikasi ditutup — dan tidak hilang
// ketika port server bergeser (localStorage terikat pada port).
let initialSettings = null;
try {
    initialSettings = ipcRenderer.sendSync('settings:get-sync');
} catch (error) {
    initialSettings = null;
}
if (initialSettings && initialSettings.values) {
    try {
        for (const [key, value] of Object.entries(initialSettings.values)) {
            if (typeof value === 'string') window.localStorage.setItem(key, value);
        }
    } catch (error) {
        // Penyimpanan tidak tersedia: aplikasi tetap berjalan dengan nilai bawaan.
    }
}

contextBridge.exposeInMainWorld('electronAPI', {
    // ── Penanda bahwa app berjalan di Electron ──────────────
    isElectron: true,
    // Preload berjalan di konteks sandbox: `process` tersedia terbatas,
    // jadi aksesnya dijaga agar tidak melempar ReferenceError.
    platform: (typeof process !== 'undefined' && process && process.platform) ? process.platform : 'unknown',
    appVersion: (initialSettings && initialSettings.appVersion) || '',

    // ── Pengaturan persisten ────────────────────────────────
    saveSetting: (key, value) => ipcRenderer.send('settings:set', key, value),
    getSettingsPath: () => ipcRenderer.invoke('settings:path'),

    // ── Akses jaringan lokal ────────────────────────────────
    setLanAccess: (enabled) => ipcRenderer.invoke('network:set-lan', enabled),

    // ── Pemeriksaan siaran ──────────────────────────────────
    runDiagnostics: () => ipcRenderer.invoke('diagnostics:run'),

    // ── State siaran otoritatif ─────────────────────────────
    // Mengembalikan keadaan yang benar-benar diterapkan server.
    applyState: (patch) => ipcRenderer.invoke('apply-state', patch),

    // ── Server Info (untuk OBS setup) ───────────────────────
    getServerInfo: () => ipcRenderer.invoke('get-server-info'),

    // ── Presentation Window Control ─────────────────────────
    openPresentation: (content = 'quran') => ipcRenderer.send('open-presentation', content),
    closePresentation: () => ipcRenderer.send('close-presentation'),
    getPresentationStatus: () => ipcRenderer.invoke('get-presentation-status'),
    getPresentationState: () => ipcRenderer.invoke('get-presentation-state'),

    // ── Kirim verse data via IPC ─────────────────────────────
    sendVerseUpdate: (data) => ipcRenderer.send('verse-update', data),
    updateFontSize: (size) => ipcRenderer.send('update-font-size', size),
    updateTheme: (theme) => ipcRenderer.send('update-theme', theme),
    updateTemplate: (templateName) => ipcRenderer.send('update-template', templateName),
    toggleVisibility: (isVisible) => ipcRenderer.send('toggle-visibility', isVisible),
    toggleTransVisibility: (isTransVisible) => ipcRenderer.send('toggle-trans-visibility', isTransVisible),
    updateFont: (fontData) => ipcRenderer.send('update-font', fontData),

    // ── Toggle fullscreen presentation ───────────────────────
    togglePresentationFullscreen: () => ipcRenderer.send('toggle-fullscreen'),

    // ── Event Listeners ─────────────────────────────────────
    onPresentationStatus: (callback) =>
        ipcRenderer.on('presentation-status', (event, isOpen) => callback(isOpen)),
    onPresentationState: (callback) =>
        ipcRenderer.on('presentation-state', (event, state) => callback(state)),

    onVerseUpdate: (callback) =>
        ipcRenderer.on('verse-update', (event, data) => callback(data)),

    onFontSizeUpdate: (callback) =>
        ipcRenderer.on('update-font-size', (event, size) => callback(size)),

    onThemeUpdate: (callback) =>
        ipcRenderer.on('update-theme', (event, theme) => callback(theme)),

    onTemplateUpdate: (callback) =>
        ipcRenderer.on('update-template', (event, templateName) => callback(templateName)),

    onVisibilityUpdate: (callback) =>
        ipcRenderer.on('toggle-visibility', (event, isVisible) => callback(isVisible)),

    onTransVisibilityUpdate: (callback) =>
        ipcRenderer.on('toggle-trans-visibility', (event, isTransVisible) => callback(isTransVisible)),

    onScrollPauseUpdate: (callback) =>
        ipcRenderer.on('toggle-scroll-pause', (event, paused) => callback(paused)),

    onFontUpdate: (callback) =>
        ipcRenderer.on('update-font', (event, fontData) => callback(fontData)),

    onServerInfo: (callback) =>
        ipcRenderer.on('server-info', (event, info) => callback(info)),

    onVmixSaveOk: (callback) =>
        ipcRenderer.on('vmix-save-ok', (event, data) => callback(data)),

    onVmixSaveError: (callback) =>
        ipcRenderer.on('vmix-save-error', (event, data) => callback(data)),

    removeAllListeners: (channel) =>
        ipcRenderer.removeAllListeners(channel),
});
