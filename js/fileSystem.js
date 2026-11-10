// ============================================
// File System - Folder selection & indexing
// ============================================

async function autoLoadData() {
    const loadingBar = document.getElementById("loadingBar");
    if (typeof QURAN_DATA === 'undefined') {
        showToast("Gagal memuat data built-in!", "error");
        return;
    }

    try {
        searchDataReady = false;
        const nextIndex = [];
        const surahs = QURAN_DATA.surahs;

        // Prepare once, yielding between batches to keep input responsive.
        for (let i = 0; i < surahs.length; i++) {
            const data = surahs[i];
            data.forEach(ayat => {
                nextIndex.push({
                    surah_id: ayat.surah_id,
                    surah_name: surahNames[ayat.surah_id - 1],
                    ayah: ayat.ayah,
                    latin: ayat.latin,
                    arabic: ayat.arabic,
                    latinSearch: QuranSearch.prepare(ayat.latin, 'latin'),
                    defaultTranslation: ayat.translation
                });
            });

            // Update loading bar
            if (i % 10 === 0) {
                if (loadingBar) loadingBar.style.width = `${((i + 1) / surahs.length) * 100}%`;
                await new Promise(r => setTimeout(r, 0)); // Yield to UI
            }
        }

        // Publish atomically so a query cannot report a partial Quran as complete.
        searchIndex = nextIndex;
        translationIndex = nextIndex;
        indexedTranslationSource = null;
        ensureTranslationSearchIndex();
        searchDataReady = true;
        refreshSearchResults();
        if (loadingBar) loadingBar.style.width = "0%";
        // Tidak ada toast di sini: data Al-Qur'an selalu ikut terpasang, sehingga
        // pemberitahuannya hanya menambah kebisingan saat aplikasi dibuka.

    } catch (e) {
        console.error(e);
        showToast("Gagal Indexing Data Built-in", "error");
    }
}
