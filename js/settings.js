// ============================================================
// Pengaturan persisten
// ------------------------------------------------------------
// Seluruh modul menyimpan preferensi di localStorage. Karena localStorage
// terikat pada origin (http://localhost:PORT), semua preferensi itu hilang
// begitu port server bergeser. Berkas ini mencerminkan setiap penulisan ke
// settings.json di main process, sehingga preferensi tetap ada.
//
// Dimuat PALING AWAL agar cermin sudah terpasang sebelum modul lain menulis.
// ============================================================
(() => {
    const api = window.electronAPI;
    if (!api || typeof api.saveSetting !== 'function') return;

    const nativeSet = Storage.prototype.setItem;
    const nativeRemove = Storage.prototype.removeItem;

    const mirror = (key, value) => {
        try { api.saveSetting(String(key), value); } catch (e) { /* pengaturan tidak wajib */ }
    };

    localStorage.setItem = function setItem(key, value) {
        nativeSet.call(localStorage, key, value);
        mirror(key, String(value));
    };

    localStorage.removeItem = function removeItem(key) {
        nativeRemove.call(localStorage, key);
        mirror(key, null);
    };

    // Pulihkan isian surat & ayat terakhir supaya operator tidak mengetik ulang
    // setiap kali aplikasi dibuka. Sengaja hanya mengisi kolom, tidak menayangkan
    // apa pun — layar tetap kosong sampai operator menekan Tampilkan Ayat.
    document.addEventListener('DOMContentLoaded', () => {
        try {
            const surah = localStorage.getItem('webquran.lastSurah');
            const ayah = localStorage.getItem('webquran.lastAyah');
            const surahInput = document.getElementById('surahInput');
            const ayahInput = document.getElementById('ayahInput');
            if (surahInput && surah && !surahInput.value) surahInput.value = surah;
            if (ayahInput && ayah && !ayahInput.value) ayahInput.value = ayah;
        } catch (e) { /* abaikan */ }
    });
})();
