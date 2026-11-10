// ============================================
// Bookmark - Simpan Ayat Favorit (localStorage)
// ============================================

const BOOKMARK_KEY = 'quranBroadcast_bookmarks';

function loadBookmarks() {
    try { return JSON.parse(localStorage.getItem(BOOKMARK_KEY)) || []; } catch { return []; }
}

function saveBookmarks(bookmarks) {
    localStorage.setItem(BOOKMARK_KEY, JSON.stringify(bookmarks));
}

function isBookmarked(surahId, ayah) {
    return loadBookmarks().some(b => b.surahId === surahId && b.ayah === ayah);
}

function toggleBookmark(surahId, surahName, ayah) {
    let bookmarks = loadBookmarks();
    const idx = bookmarks.findIndex(b => b.surahId === surahId && b.ayah === ayah);

    if (idx >= 0) {
        // Hapus bookmark
        bookmarks.splice(idx, 1);
        saveBookmarks(bookmarks);
        renderBookmarks();
        updateBookmarkButton(surahId, ayah, false);
        showToast('Bookmark dihapus');
    } else {
        // Tambah bookmark
        const now = new Date();
        const dateStr = now.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
        bookmarks.unshift({
            surahId: surahId,
            surahName: surahName,
            ayah: ayah,
            date: dateStr
        });
        saveBookmarks(bookmarks);
        renderBookmarks();
        updateBookmarkButton(surahId, ayah, true);
        showToast('Ayat ditambahkan ke bookmark!', 'success');
    }
}

function updateBookmarkButton(surahId, ayah, active) {
    const btn = document.getElementById('btnBookmarkAyah');
    if (!btn) return;
    if (active) {
        btn.classList.add('bookmark-active');
        btn.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg> <span>Tersimpan</span>';
    } else {
        btn.classList.remove('bookmark-active');
        btn.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg> <span>Bookmark</span>';
    }
}

function renderBookmarks() {
    const list = document.getElementById('bookmarkList');
    const badge = document.getElementById('bookmarkCountBadge');
    const actions = document.getElementById('bookmarkActions');
    if (!list) return;

    const bookmarks = loadBookmarks();

    if (bookmarks.length === 0) {
        list.innerHTML = '<div class="bookmark-empty">Belum ada bookmark</div>';
        if (badge) badge.style.display = 'none';
        if (actions) actions.style.display = 'none';
        return;
    }

    if (badge) { badge.textContent = bookmarks.length; badge.style.display = 'inline-block'; }
    if (actions) actions.style.display = 'block';

    list.innerHTML = bookmarks.map((b, i) => {
        return `<div class="bookmark-item" title="${b.surahName} Ayat ${b.ayah}">
      <div class="bookmark-item-main" onclick="navigateFromBookmark(${i})">
        <span class="bookmark-item-surah">${b.surahName}</span>
        <span class="bookmark-item-ayah">Ayat ${b.ayah}</span>
      </div>
      <div class="bookmark-item-right">
        <span class="bookmark-item-date">${b.date || ''}</span>
        <button class="bookmark-item-delete" onclick="event.stopPropagation(); removeBookmark(${i})" title="Hapus bookmark">✕</button>
      </div>
    </div>`;
    }).join('');
}

function navigateFromBookmark(index) {
    const bookmarks = loadBookmarks();
    const b = bookmarks[index];
    if (!b) return;

    document.getElementById('surahInput').value = `${b.surahId}. ${b.surahName}`;
    document.getElementById('ayahInput').value = b.ayah;
    document.getElementById('ayahCountInput').value = 1;
    expandSection('sectionNav');
    searchAyah(true);
}

function removeBookmark(index) {
    let bookmarks = loadBookmarks();
    const removed = bookmarks.splice(index, 1);
    saveBookmarks(bookmarks);
    renderBookmarks();
    showToast('Bookmark dihapus');
}

function clearBookmarks() {
    if (!confirm('Hapus semua bookmark?')) return;
    localStorage.removeItem(BOOKMARK_KEY);
    renderBookmarks();
    showToast('Semua bookmark dihapus');
}

// Load bookmarks on page load
document.addEventListener('DOMContentLoaded', renderBookmarks);
