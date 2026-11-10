
// Focus helpers (sections are always visible, just focus the right input)
function switchTab(tabName) {
    if (tabName === 'nav') { document.getElementById('surahInput').focus(); }
    if (tabName === 'search') { document.getElementById('latinInput').focus(); }
    if (tabName === 'trans-search') { document.getElementById('transInput').focus(); }
}

function handleEnter(e) { if (e.key === "Enter" && !e.shiftKey) { (typeof primaryDisplayAction === "function") ? primaryDisplayAction() : searchAyah(); } }

// ── Custom Surah Dropdown ────────────────────────────────────
let _prevSurahValue = '';
let _dropdownHighlight = -1;

function surahBuildList(filterText) {
    const dropdown = document.getElementById('surahDropdown');
    if (!dropdown) return;
    const filter = (filterText || '').toLowerCase();
    let html = '';
    surahNames.forEach((name, i) => {
        const label = `${i + 1}. ${name}`;
        if (filter && !label.toLowerCase().includes(filter) && !name.toLowerCase().includes(filter)) return;
        html += `<div class="surah-option" data-value="${label}" onmousedown="surahSelect('${label.replace(/'/g, "\\'")}')">${label}</div>`;
    });
    dropdown.innerHTML = html || '<div class="surah-option surah-no-result">Tidak ditemukan</div>';
    _dropdownHighlight = -1;
}

function surahFocus(el) {
    _prevSurahValue = el.value;
    // Nilai TIDAK dikosongkan lagi. Dulu isinya dipindah ke placeholder sehingga
    // operator melihat "2. Al-Baqarah" berwarna abu-abu, mengira kolom sudah
    // terisi, lalu menekan TAMPILKAN AYAT tanpa hasil apa pun.
    el.placeholder = 'Ketik nama surat...';
    if (el.value) {
        try { el.select(); } catch (e) { /* abaikan */ }
    }
    surahBuildList('');
    document.getElementById('surahDropdown').classList.add('open');
}

// Tandai kolom yang belum terisi saat operator menekan Tampilkan Ayat.
function markFieldInvalid(el) {
    if (!el) return;
    el.classList.add('field-invalid');
    clearTimeout(el._invalidTimer);
    el._invalidTimer = setTimeout(() => el.classList.remove('field-invalid'), 2200);
    try {
        el.focus();
        if (el.value) el.select();
    } catch (e) { /* abaikan */ }
}

function surahFilter(value) {
    surahBuildList(value);
    document.getElementById('surahDropdown').classList.add('open');
}

function surahSelect(value) {
    const input = document.getElementById('surahInput');
    input.value = value;
    _prevSurahValue = value;
    input.placeholder = 'Ketik nama surat...';
    document.getElementById('surahDropdown').classList.remove('open');
    handleSurahInput();
}

function surahKeydown(e) {
    const dropdown = document.getElementById('surahDropdown');
    const items = dropdown.querySelectorAll('.surah-option:not(.surah-no-result)');
    if (!items.length) return;

    if (e.key === 'ArrowDown') {
        e.preventDefault();
        _dropdownHighlight = Math.min(_dropdownHighlight + 1, items.length - 1);
        surahHighlightItem(items);
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        _dropdownHighlight = Math.max(_dropdownHighlight - 1, 0);
        surahHighlightItem(items);
    } else if (e.key === 'Enter') {
        e.preventDefault();
        if (_dropdownHighlight >= 0 && items[_dropdownHighlight]) {
            surahSelect(items[_dropdownHighlight].dataset.value);
        } else if (items.length === 1) {
            surahSelect(items[0].dataset.value);
        }
    } else if (e.key === 'Escape') {
        // Restore dan tutup
        const input = document.getElementById('surahInput');
        if (_prevSurahValue) input.value = _prevSurahValue;
        input.placeholder = 'Ketik nama surat...';
        dropdown.classList.remove('open');
        input.blur();
    }
}

function surahHighlightItem(items) {
    items.forEach((el, i) => {
        el.classList.toggle('highlighted', i === _dropdownHighlight);
        if (i === _dropdownHighlight) el.scrollIntoView({ block: 'nearest' });
    });
}

// Klik di luar dropdown → tutup dan restore
document.addEventListener('click', (e) => {
    const wrap = document.getElementById('surahDropdownWrap');
    const dropdown = document.getElementById('surahDropdown');
    if (wrap && dropdown && !wrap.contains(e.target)) {
        dropdown.classList.remove('open');
        const input = document.getElementById('surahInput');
        if (input && !input.value && _prevSurahValue) {
            input.value = _prevSurahValue;
            input.placeholder = 'Ketik nama surat...';
        }
    }
});

function handleSurahInput() {
    document.getElementById("ayahInput").value = "1";
    currentSurahData = [];
    _prevSurahValue = document.getElementById("surahInput").value;
    // setTimeout kecil agar browser selesai proses blur dari surahInput
    // sebelum kita pindahkan fokus ke ayahInput (terutama saat klik mouse)
    setTimeout(() => {
        const ayahField = document.getElementById("ayahInput");
        ayahField.focus();
        ayahField.select();
    }, 50);
}

function navAyah(d) {
    if (typeof QURAN_DATA === 'undefined') return;

    const el = document.getElementById("ayahInput");
    let val = parseInt(el.value) || 0;
    let newVal = val + d;

    // ── Cek batas surat: otomatis pindah surat ──────────────
    if (currentSurahId && currentSurahData.length > 0) {
        const maxAyah = currentSurahData.length;

        // Next melewati ayat terakhir → pindah ke surat berikutnya
        if (d > 0 && newVal > maxAyah) {
            if (currentSurahId < 114) {
                const nextSurahId = currentSurahId + 1;
                const nextSurahName = surahNames[nextSurahId - 1];
                document.getElementById("surahInput").value = `${nextSurahId}. ${nextSurahName}`;
                el.value = 1;
                currentSurahData = QURAN_DATA.surahs[nextSurahId - 1];
                currentSurahId = nextSurahId;
                showToast(`📖 Lanjut ke ${nextSurahName} (${nextSurahId})`, "success");
                searchAyah(true);
            } else {
                showToast("📖 Sudah di surat terakhir (An-Nas)", "");
            }
            return;
        }

        // Prev di ayat 1 → pindah ke ayat terakhir surat sebelumnya
        if (d < 0 && newVal < 1) {
            if (currentSurahId > 1) {
                const prevSurahId = currentSurahId - 1;
                const prevSurahName = surahNames[prevSurahId - 1];
                const prevSurahData = QURAN_DATA.surahs[prevSurahId - 1];
                document.getElementById("surahInput").value = `${prevSurahId}. ${prevSurahName}`;
                el.value = prevSurahData.length; // Ayat terakhir surat sebelumnya
                currentSurahData = prevSurahData;
                currentSurahId = prevSurahId;
                showToast(`📖 Kembali ke ${prevSurahName} (${prevSurahId}) ayat ${prevSurahData.length}`, "success");
                searchAyah(true);
            } else {
                showToast("📖 Sudah di surat pertama (Al-Fatihah)", "");
            }
            return;
        }
    }

    // Normal navigation (masih dalam range surat)
    if (newVal > 0) { el.value = newVal; searchAyah(); }
}

async function searchAyah(force = false, activateProjector = true, pushToAir) {
    if (typeof QURAN_DATA === 'undefined') { showToast("Data belum siap!", "error"); return; }

    const surahEl = document.getElementById("surahInput");
    const ayahEl = document.getElementById("ayahInput");
    const sInput = surahEl.value;
    const sId = parseInt(sInput.split('.')[0]);
    const aNo = parseInt(ayahEl.value);
    const count = Math.min(parseInt(document.getElementById("ayahCountInput").value) || 1, 10);

    // Dulu berhenti diam-diam di sini: operator menekan TAMPILKAN AYAT dan
    // tidak terjadi apa pun tanpa penjelasan. Sekarang ditandai + diberi pesan.
    if (!sId || !aNo) {
        markFieldInvalid(!sId ? surahEl : ayahEl);
        showToast(!sId ? 'Pilih surat dulu (F2), lalu tekan Enter.' : 'Isi nomor ayat dulu.', 'error');
        return;
    }
    showSkeleton();

    try {
        if (force || currentSurahId !== sId || currentSurahData.length === 0) {
            // Use built-in data instead of file handle
            currentSurahData = QURAN_DATA.surahs[sId - 1];
            currentSurahId = sId;
        }

        const versesToRender = [];
        for (let i = 0; i < count; i++) {
            const targetAyah = aNo + i;
            const ayah = currentSurahData.find(a => a.ayah === targetAyah);
            if (ayah) versesToRender.push(ayah);
        }

        if (versesToRender.length === 0) {
            document.getElementById("resultArea").innerHTML = `<div style="text-align:center; color:var(--danger); margin-top:50px;"><h3>Ayat Tidak Ditemukan</h3></div>`;
            return;
        }

        currentAyahNo = aNo;
        // Small delay to let skeleton show (optional, can be removed for instant load)
        await new Promise(resolve => setTimeout(resolve, 50));
        // Mode PVW: jalur tanpa nilai eksplisit tidak mengudara (lihat resolvePushToAir)
        const kirimKeUdara = (typeof resolvePushToAir === 'function')
            ? resolvePushToAir(pushToAir)
            : (pushToAir !== false);
        renderMultipleResults(versesToRender, { pushToAir: kirimKeUdara });
        if (activateProjector) window.ProjectorScreen?.selectIfOpen('quran');
    } catch (e) {
        console.error(e);
        showToast("Error memuat ayat", "error");
    }
}
