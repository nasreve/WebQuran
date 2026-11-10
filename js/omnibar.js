// ============================================================
// Webquran — Omnibar / Universal Smart Quick Jump (Ctrl+K)
// ============================================================

let isOmnibarOpen = false;
let omnibarSelectedIndex = 0;
let omnibarCurrentResults = [];
let omnibarDebounceTimer = null;

// ── SVG Icons Library untuk Omnibar (Clean Broadcast UI) ──
const OMNIBAR_ICONS = {
  surah: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path><line x1="9" y1="7" x2="16" y2="7"></line><line x1="9" y1="11" x2="14" y2="11"></line></svg>`,
  verse: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>`,
  search: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>`,
  show: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="4" fill="currentColor"></circle></svg>`,
  hide: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>`,
  tr_on: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>`,
  tr_off: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>`,
  monitor: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>`,
  template: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>`,
  alert: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`
};

// ── Daftar Alias & Kamus Normalisasi Surat ─────────────────
const SURAH_ALIASES = {
  'fatihah': 1, 'al fatihah': 1, 'alfatihah': 1,
  'baqarah': 2, 'al baqarah': 2, 'albaqarah': 2, 'sapi': 2,
  'ali imran': 3, 'ali \'imran': 3, 'ali imron': 3, 'imran': 3, 'imron': 3, 'al imran': 3,
  'nisa': 4, 'an nisa': 4, 'annisa': 4,
  'maidah': 5, 'al maidah': 5, 'almaidah': 5,
  'anam': 6, 'al anam': 6, 'al-an\'am': 6,
  'araf': 7, 'al araf': 7, 'al-a\'raf': 7,
  'anfal': 8, 'al anfal': 8,
  'taubah': 9, 'at taubah': 9, 'attaubah': 9, 'taubat': 9,
  'yunus': 10,
  'hud': 11,
  'yusuf': 12, 'joseph': 12,
  'rad': 13, 'ar rad': 13, 'ar-ra\'d': 13, 'ar radu': 13, 'ar-rad': 13, 'petir': 13,
  'ibrahim': 14,
  'hijr': 15, 'al hijr': 15,
  'nahl': 16, 'an nahl': 16, 'lebah': 16,
  'isra': 17, 'al isra': 17, 'al-isra\'': 17,
  'kahfi': 18, 'kahf': 18, 'al kahf': 18, 'al kahfi': 18, 'alkahf': 18, 'alkahfi': 18,
  'maryam': 19,
  'taha': 20, 'ta ha': 20, 'thaha': 20, 'tha-ha': 20,
  'anbiya': 21, 'al anbiya': 21, 'al anbiya\'': 21,
  'hajj': 22, 'al hajj': 22, 'haji': 22,
  'muminun': 23, 'al muminun': 23, 'al mu\'minun': 23, 'mukminun': 23,
  'nur': 24, 'an nur': 24, 'cahaya': 24,
  'furqan': 25, 'al furqan': 25,
  'syuara': 26, 'asy syuara': 26, 'asy-syu\'ara\'': 26,
  'naml': 27, 'an naml': 27, 'semut': 27,
  'qasas': 28, 'al qasas': 28,
  'ankabut': 29, 'al ankabut': 29, 'al-\'ankabut': 29, 'labalaba': 29,
  'rum': 30, 'ar rum': 30,
  'luqman': 31, 'lukman': 31,
  'sajdah': 32, 'as sajdah': 32,
  'ahzab': 33, 'al ahzab': 33,
  'saba': 34, 'saba\'': 34,
  'fatir': 35,
  'yasin': 36, 'ya sin': 36, 'ya-sin': 36,
  'saffat': 37, 'as saffat': 37,
  'sad': 38,
  'zumar': 39, 'az zumar': 39,
  'ghafir': 40, 'mu\'min': 40,
  'fussilat': 41, 'fusilat': 41,
  'syura': 42, 'asy syura': 42,
  'zukhruf': 43, 'az zukhruf': 43,
  'dukhan': 44, 'ad dukhan': 44,
  'jasiyah': 45, 'al jasiyah': 45, 'jatsiyah': 45, 'al jatsiyah': 45,
  'ahqaf': 46, 'al ahqaf': 46,
  'muhammad': 47,
  'fath': 48, 'al fath': 48,
  'hujurat': 49, 'al hujurat': 49,
  'qaf': 50,
  'zariyat': 51, 'az zariyat': 51, 'dzariyat': 51, 'ad dzariyat': 51,
  'tur': 52, 'at tur': 52,
  'najm': 53, 'an najm': 53, 'bintang': 53,
  'qamar': 54, 'al qamar': 54, 'bulan': 54,
  'rahman': 55, 'ar rahman': 55, 'ar-rahman': 55,
  'waqiah': 56, 'al waqiah': 56, 'al-waqi\'ah': 56, 'al waqi\'ah': 56,
  'hadid': 57, 'al hadid': 57, 'besi': 57,
  'mujadilah': 58, 'al mujadilah': 58,
  'hasyr': 59, 'al hasyr': 59,
  'mumtahanah': 60, 'al mumtahanah': 60,
  'saff': 61, 'as saff': 61,
  'jumuah': 62, 'al jumuah': 62, 'jumat': 62,
  'munafiqun': 63, 'al munafiqun': 63, 'munafik': 63,
  'taghabun': 64, 'at taghabun': 64,
  'talaq': 65, 'at talaq': 65, 'talak': 65,
  'tahrim': 66, 'at tahrim': 66,
  'mulk': 67, 'al mulk': 67, 'tabarak': 67, 'kerajaan': 67,
  'qalam': 68, 'al qalam': 68, 'nun': 68,
  'haqqah': 69, 'al haqqah': 69,
  'maarij': 70, 'al maarij': 70, 'al-ma\'arij': 70,
  'nuh': 71,
  'jinn': 72, 'al jinn': 72, 'jin': 72,
  'muzzammil': 73, 'al muzzammil': 73,
  'muddassir': 74, 'al muddassir': 74,
  'qiyamah': 75, 'al qiyamah': 75, 'kiamat': 75,
  'insan': 76, 'al insan': 76, 'dahr': 76,
  'mursalat': 77, 'al mursalat': 77,
  'naba': 78, 'an naba': 78, 'an naba\'': 78, 'amma': 78,
  'naziat': 79, 'an naziat': 79, 'an-nazi\'at': 79,
  'abasa': 80, '\'abasa': 80,
  'takwir': 81, 'at takwir': 81,
  'infitar': 82, 'al infitar': 82,
  'mutaffifin': 83, 'al mutaffifin': 83,
  'insyiqaq': 84, 'al insyiqaq': 84,
  'buruj': 85, 'al buruj': 85,
  'tariq': 86, 'at tariq': 86,
  'ala': 87, 'al ala': 87, 'al-a\'la': 87,
  'ghasyiyah': 88, 'al ghasyiyah': 88,
  'fajr': 89, 'al fajr': 89,
  'balad': 90, 'al balad': 90,
  'syams': 91, 'asy syams': 91, 'matahari': 91,
  'lail': 92, 'al lail': 92, 'malam': 92,
  'duha': 93, 'ad duha': 93, 'dhuha': 93,
  'syarh': 94, 'asy syarh': 94, 'insyirah': 94, 'alam nasyrah': 94,
  'tin': 95, 'at tin': 95,
  'alaq': 96, 'al alaq': 96, 'al-\'alaq': 96, 'iqra': 96,
  'qadr': 97, 'al qadr': 97, 'qadar': 97,
  'bayyinah': 98, 'al bayyinah': 98,
  'zalzalah': 99, 'az zalzalah': 99, 'zilzal': 99,
  'adiyat': 100, 'al adiyat': 100, 'al-\'adiyat': 100,
  'qariah': 101, 'al qariah': 101, 'al-qari\'ah': 101,
  'takasur': 102, 'at takasur': 102,
  'ashr': 103, 'al ashr': 103, 'al \'ashr': 103, 'wal ashr': 103, 'asr': 103,
  'humazah': 104, 'al humazah': 104,
  'fil': 105, 'al fil': 105, 'gajah': 105,
  'quraisy': 106, 'qurais': 106,
  'maun': 107, 'al maun': 107, 'al-ma\'un': 107,
  'kautsar': 108, 'al kautsar': 108, 'kawtsar': 108,
  'kafirun': 109, 'al kafirun': 109,
  'nasr': 110, 'an nasr': 110,
  'lahab': 111, 'al lahab': 111, 'masad': 111,
  'ikhlas': 112, 'al ikhlas': 112, 'qulhu': 112,
  'falaq': 113, 'al falaq': 113,
  'nas': 114, 'an nas': 114, 'annas': 114
};

// Fungsi membersihkan dan menormalkan teks (hapus apostrof, spasi ganda, strip, dll)
function cleanFuzzyText(text) {
  if (!text) return '';
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Hapus diakritik / tanda panjang
    .replace(/[''‘’`^~_]/g, '')     // Hapus koma atas & apostrof
    .replace(/[-]/g, ' ')            // Ganti tanda hubung dengan spasi
    .replace(/\s+/g, ' ')            // Satukan spasi berlebih
    .trim();
}

// Fungsi mendeteksi ID surat dari nama input operator (bisa mengembalikan lebih dari 1 jika cocok)
function matchSurahIds(queryName) {
  const clean = cleanFuzzyText(queryName);
  if (!clean) return [];

  const matched = [];

  // 1. Cek langsung di kamus alias
  if (SURAH_ALIASES[clean]) {
    matched.push(SURAH_ALIASES[clean]);
  }

  // 2. Coba hilangkan prefiks Arab (al, ar, an, as, asy, at, ad, az)
  const noPrefix = clean.replace(/^(al|ar|an|as|asy|at|ad|az)\s+/, '');
  if (SURAH_ALIASES[noPrefix] && !matched.includes(SURAH_ALIASES[noPrefix])) {
    matched.push(SURAH_ALIASES[noPrefix]);
  }

  // 3. Cari di daftar resmi 114 surat
  for (let i = 0; i < surahNames.length; i++) {
    const sId = i + 1;
    if (matched.includes(sId)) continue;

    const sNameClean = cleanFuzzyText(surahNames[i]);
    const sNameNoPrefix = sNameClean.replace(/^(al|ar|an|as|asy|at|ad|az)\s+/, '');

    if (sNameClean === clean || sNameNoPrefix === clean || sNameNoPrefix === noPrefix) {
      matched.push(sId);
    } else if (clean.length >= 2 && (sNameClean.startsWith(clean) || sNameNoPrefix.startsWith(clean) || sNameNoPrefix.startsWith(noPrefix))) {
      matched.push(sId);
    }
    if (matched.length >= 4) break;
  }

  return matched;
}

function matchSurahId(queryName) {
  const list = matchSurahIds(queryName);
  return list.length > 0 ? list[0] : null;
}

// ── Smart Parser Engine ─────────────────────────────────────
// Menganalisis string input dan mengembalikan kandidat aksi / ayat
function parseOmnibarQuery(rawQuery) {
  const q = rawQuery.trim();
  if (!q) return [];

  const results = [];

  // Pola 0: Perintah Cepat Operator (Broadcast Commands)
  const lowQ = q.toLowerCase();
  if (lowQ === 'show' || lowQ === 'live' || lowQ === 'on air') {
    results.push({
      type: 'command',
      action: 'show',
      title: 'Perintah Siaran: SHOW / ON AIR',
      subtitle: 'Tampilkan teks ayat ke OBS & Proyektor (Status Hijau)',
      iconType: 'show'
    });
  } else if (lowQ === 'hide' || lowQ === 'blank' || lowQ === 'cut') {
    results.push({
      type: 'command',
      action: 'hide',
      title: 'Perintah Siaran: HIDE / BLANK',
      subtitle: 'Sembunyikan teks ayat dari OBS & Proyektor (Cut to Black)',
      iconType: 'hide'
    });
  } else if (lowQ === 'tr on' || lowQ === 'terjemahan on') {
    results.push({
      type: 'command',
      action: 'tr_on',
      title: 'Perintah Siaran: Terjemahan ON',
      subtitle: 'Tampilkan teks terjemahan pada layar proyektor',
      iconType: 'tr_on'
    });
  } else if (lowQ === 'tr off' || lowQ === 'terjemahan off') {
    results.push({
      type: 'command',
      action: 'tr_off',
      title: 'Perintah Siaran: Terjemahan OFF',
      subtitle: 'Sembunyikan teks terjemahan (hanya teks Arab)',
      iconType: 'tr_off'
    });
  } else if (lowQ === 'monitor' || lowQ === 'confidence') {
    results.push({
      type: 'command',
      action: 'toggle_monitor',
      title: 'Toggle Confidence Monitor 16:9',
      subtitle: 'Buka atau tutup mini Program Feed monitor di dashboard',
      iconType: 'monitor'
    });
  } else if (lowQ === 'template') {
    results.push({
      type: 'command',
      action: 'open_template',
      title: 'Buka Template Picker',
      subtitle: 'Pilih template Lower Third, Full 16:9, Modern Elegant, dll',
      iconType: 'template'
    });
  }

  // Pola 1: Format Angka Murni S:A atau S:A-B (misal: 2:183, 2:183-185, 36:1-5, 2 183)
  const numColonMatch = q.match(/^(\d{1,3})\s*[:\s]\s*(\d{1,3})(?:\s*[-–]\s*(\d{1,3}))?$/);
  if (numColonMatch) {
    const sId = parseInt(numColonMatch[1]);
    const startAyah = parseInt(numColonMatch[2]);
    const endAyah = numColonMatch[3] ? parseInt(numColonMatch[3]) : null;

    if (sId >= 1 && sId <= 114 && typeof QURAN_DATA !== 'undefined' && QURAN_DATA.surahs) {
      const sData = QURAN_DATA.surahs[sId - 1] || [];
      const totalAyah = sData.length;

      if (startAyah >= 1 && startAyah <= totalAyah) {
        let count = 1;
        if (endAyah && endAyah >= startAyah) {
          count = Math.min(endAyah - startAyah + 1, 10);
        }
        const sName = surahNames[sId - 1];
        const previewAyat = sData.find(a => a.ayah === startAyah);

        results.push({
          type: 'verse_jump',
          surahId: sId,
          surahName: sName,
          ayahNo: startAyah,
          count: count,
          title: count > 1 ? `QS ${sName} (${sId}): ${startAyah}–${startAyah + count - 1}` : `QS ${sName} (${sId}): ${startAyah}`,
          subtitle: previewAyat ? `${previewAyat.translation.substring(0, 85)}...` : `Melompat ke surat ${sName} ayat ${startAyah}`,
          arabicSnippet: previewAyat ? previewAyat.arabic : '',
          iconType: 'verse'
        });
      }
    }
  }

  // Pola 2: Format Nama Surat + Nomor Ayat (misal: 'baqarah 183', 'al-baqarah 183-185', 'yasin 1-5', 'rad 1', 'kahfi 10')
  const nameAyahMatch = q.match(/^([a-zA-Z\s''‘’-]+)\s+(\d{1,3})(?:\s*[-–]\s*(\d{1,3}))?$/);
  if (nameAyahMatch) {
    const surahQuery = nameAyahMatch[1].trim();
    const startAyah = parseInt(nameAyahMatch[2]);
    const endAyah = nameAyahMatch[3] ? parseInt(nameAyahMatch[3]) : null;

    const matchedSId = matchSurahId(surahQuery);
    if (matchedSId && typeof QURAN_DATA !== 'undefined' && QURAN_DATA.surahs) {
      const sData = QURAN_DATA.surahs[matchedSId - 1] || [];
      const totalAyah = sData.length;

      if (startAyah >= 1 && startAyah <= totalAyah) {
        let count = 1;
        if (endAyah && endAyah >= startAyah) {
          count = Math.min(endAyah - startAyah + 1, 10);
        }
        const sName = surahNames[matchedSId - 1];
        const previewAyat = sData.find(a => a.ayah === startAyah);

        // Jangan masukkan duplikat jika sudah ada di results
        const exists = results.some(r => r.surahId === matchedSId && r.ayahNo === startAyah && r.count === count);
        if (!exists) {
          results.push({
            type: 'verse_jump',
            surahId: matchedSId,
            surahName: sName,
            ayahNo: startAyah,
            count: count,
            title: count > 1 ? `QS ${sName} (${matchedSId}): ${startAyah}–${startAyah + count - 1}` : `QS ${sName} (${matchedSId}): ${startAyah}`,
            subtitle: previewAyat ? `${previewAyat.translation.substring(0, 85)}...` : `Melompat ke surat ${sName} ayat ${startAyah}`,
            arabicSnippet: previewAyat ? previewAyat.arabic : '',
            iconType: 'verse'
          });
        }
      }
    }
  }

  // Pola 3: Format Nama Surat Saja (misal: 'al fatihah', 'yasin', 'kahfi', 'rad', 'ar rahman')
  if (!nameAyahMatch && !numColonMatch) {
    const matchedSIds = matchSurahIds(q);
    if (matchedSIds.length > 0 && typeof QURAN_DATA !== 'undefined' && QURAN_DATA.surahs) {
      matchedSIds.forEach(matchedSId => {
        const sName = surahNames[matchedSId - 1];
        const sData = QURAN_DATA.surahs[matchedSId - 1] || [];
        const totalAyah = sData.length;
        const firstAyah = sData[0];
        const rawTrans = firstAyah ? (typeof customTranslations !== 'undefined' && customTranslations[`${matchedSId}:1`] ? customTranslations[`${matchedSId}:1`] : firstAyah.translation) : '';
        const cleanTrans = typeof cleanTranslation === 'function' ? cleanTranslation(rawTrans) : rawTrans;
        const arSurahName = firstAyah && firstAyah.surah && firstAyah.surah.arabic ? firstAyah.surah.arabic.trim() : '';

        results.push({
          type: 'surah_info',
          surahId: matchedSId,
          surahName: sName,
          arabicSurahName: arSurahName,
          totalAyah: totalAyah,
          ayahNo: 1,
          count: 1,
          title: `Surat ${sName}`,
          subtitle: `Total ${totalAyah} Ayat • Mulai dari Ayat 1`,
          firstAyahTranslation: cleanTrans,
          arabicSnippet: firstAyah ? firstAyah.arabic : '',
          iconType: 'surah'
        });
      });
    }
  }

  // Pola 4: Pencarian Kata Kunci Terjemahan & Latin (Fallback Pencarian Bebas)
  if (searchDataReady && q.length >= 3) {
    ensureTranslationSearchIndex();
    const ranked = [
      ...QuranSearch.search(searchIndex, q, 'latin'),
      ...QuranSearch.search(translationIndex, q, 'translation')
    ].sort((a, b) => b.score - a.score || a.item.surah_id - b.item.surah_id || a.item.ayah - b.item.ayah);
    const seen = new Set(results.filter(r => r.surahId && r.ayahNo).map(r => `${r.surahId}:${r.ayahNo}`));
    const matches = [];
    for (const { item } of ranked) {
      const key = `${item.surah_id}:${item.ayah}`;
      if (seen.has(key)) continue;
      seen.add(key);
      matches.push(item);
      if (matches.length === 6) break;
    }

    matches.forEach(m => {
      const sName = surahNames[m.surah_id - 1] || `Surat ${m.surah_id}`;
      results.push({
        type: 'verse_search_match',
        surahId: m.surah_id,
        surahName: sName,
        ayahNo: m.ayah,
        count: 1,
        title: `QS ${sName} (${m.surah_id}): Ayat ${m.ayah}`,
        subtitle: m.translation.substring(0, 95) + '...',
        arabicSnippet: m.arabic || '',
        iconType: 'search'
      });
    });
  }

  return results;
}

// ── Eksekusi Aksi dari Omnibar ──────────────────────────────
async function executeOmnibarAction(item, goLive = false) {
  if (!item) return;

  closeOmnibar();

  if (item.type === 'command') {
    switch (item.action) {
      case 'show':
        if (typeof isPresentationVisible !== 'undefined' && !isPresentationVisible) {
          toggleVisibility();
        }
        showToast('🟢 Layar Siaran: SHOW / ON AIR', 'success');
        break;
      case 'hide':
        if (typeof isPresentationVisible !== 'undefined' && isPresentationVisible) {
          toggleVisibility();
        }
        showToast('🔴 Layar Siaran: HIDE / BLANK', 'warning');
        break;
      case 'tr_on':
        if (typeof isTranslationVisible !== 'undefined' && !isTranslationVisible) {
          toggleTransVisibility();
        }
        showToast('🌐 Terjemahan: ON', 'success');
        break;
      case 'tr_off':
        if (typeof isTranslationVisible !== 'undefined' && isTranslationVisible) {
          toggleTransVisibility();
        }
        showToast('📖 Terjemahan: OFF', '');
        break;
      case 'toggle_monitor':
        if (typeof toggleConfidenceMonitor === 'function') {
          toggleConfidenceMonitor();
        }
        break;
      case 'open_template':
        if (typeof showTemplateModal === 'function') {
          showTemplateModal();
        }
        break;
    }
    return;
  }

  if (item.type === 'verse_jump' || item.type === 'surah_info' || item.type === 'verse_search_match') {
    const sId = item.surahId;
    const aNo = item.ayahNo || 1;
    const count = item.count || 1;

    // 1. Update form navigasi sidebar
    const surahInput = document.getElementById('surahInput');
    const ayahInput = document.getElementById('ayahInput');
    const ayahCountInput = document.getElementById('ayahCountInput');

    if (surahInput) surahInput.value = `${sId}. ${surahNames[sId - 1]}`;
    if (ayahInput) ayahInput.value = aNo;
    if (ayahCountInput) ayahCountInput.value = count;

    // 2. Load surah data
    if (typeof QURAN_DATA !== 'undefined' && QURAN_DATA.surahs) {
      currentSurahData = QURAN_DATA.surahs[sId - 1];
      currentSurahId = sId;
      currentAyahNo = aNo;

      const versesToRender = [];
      for (let i = 0; i < count; i++) {
        const targetAyah = aNo + i;
        const ayah = currentSurahData.find(a => a.ayah === targetAyah);
        if (ayah) versesToRender.push(ayah);
      }

      if (versesToRender.length > 0) {
        renderMultipleResults(versesToRender);
        if (item.type === 'surah_info') {
          showToast(`📖 Membuka Surat ${surahNames[sId - 1]} dari Ayat 1`, 'success');
        } else {
          showToast(`⚡ Melompat ke QS ${surahNames[sId - 1]}: ${aNo}${count > 1 ? `–${aNo + count - 1}` : ''}`, 'success');
        }
      }
    }

    // 3. Jika diminta goLive (Ctrl+Enter), nyalakan SHOW jika sedang HIDE
    if (goLive) {
      window.ProjectorScreen?.selectIfOpen('quran');
      if (typeof isPresentationVisible !== 'undefined' && !isPresentationVisible) {
        toggleVisibility();
      }
    }
  }
}

// ── UI Modal & Keyboard Event Handlers ───────────────────────
function openOmnibar() {
  const modal = document.getElementById('omnibarModal');
  const input = document.getElementById('omnibarInput');
  if (!modal || !input) return;

  isOmnibarOpen = true;
  modal.classList.add('active');
  input.value = '';
  omnibarSelectedIndex = 0;
  omnibarCurrentResults = [];
  renderOmnibarResults([]);

  // Auto focus input
  setTimeout(() => input.focus(), 50);
}

function closeOmnibar() {
  const modal = document.getElementById('omnibarModal');
  if (!modal) return;
  isOmnibarOpen = false;
  modal.classList.remove('active');
}

function renderOmnibarResults(results) {
  const listEl = document.getElementById('omnibarList');
  const previewEl = document.getElementById('omnibarPreview');
  if (!listEl) return;

  omnibarCurrentResults = results;

  if (results.length === 0) {
    const inputVal = document.getElementById('omnibarInput')?.value.trim() || '';
    if (!inputVal) {
      listEl.innerHTML = `
        <div class="omnibar-empty-state">
          <div class="omnibar-hint-tag">TIPS SMART JUMP</div>
          <div class="omnibar-shortcuts-guide">
            <div class="guide-item"><code>yasin</code> <span>Surat Yā-Sīn (Mulai Ayat 1)</span></div>
            <div class="guide-item"><code>2:183</code> <span>QS Al-Baqarah ayat 183</span></div>
            <div class="guide-item"><code>yasin 1-5</code> <span>QS Yā-Sīn ayat 1 sampai 5</span></div>
            <div class="guide-item"><code>rad 1</code> <span>QS Ar-Ra‘d ayat 1 (bebas tanda petik)</span></div>
            <div class="guide-item"><code>kahfi 10</code> <span>QS Al-Kahf ayat 10</span></div>
            <div class="guide-item"><code>puasa</code> <span>Cari ayat bertema puasa</span></div>
            <div class="guide-item"><code>show / hide</code> <span>Kontrol layar siaran</span></div>
          </div>
        </div>
      `;
    } else {
      listEl.innerHTML = `
        <div class="omnibar-no-match">
          <div class="no-match-icon">${OMNIBAR_ICONS.alert}</div>
          <div class="no-match-text">Tidak ditemukan ayat atau perintah yang cocok dengan "<b>${inputVal}</b>"</div>
        </div>
      `;
    }
    if (previewEl) previewEl.innerHTML = '';
    return;
  }

  // Batasi index aktif
  if (omnibarSelectedIndex >= results.length) {
    omnibarSelectedIndex = Math.max(0, results.length - 1);
  }

  let html = '';
  results.forEach((item, index) => {
    const isSelected = index === omnibarSelectedIndex;
    const isSurah = item.type === 'surah_info';
    const isCmd = item.type === 'command';
    const isSearch = item.type === 'verse_search_match';

    const iconSvg = OMNIBAR_ICONS[item.iconType] || OMNIBAR_ICONS.verse;

    if (isSurah) {
      html += `
        <div class="omnibar-item omnibar-item-surah ${isSelected ? 'selected' : ''}" data-index="${index}" onclick="onOmnibarItemClick(${index})">
          <div class="omnibar-item-icon omnibar-icon-surah">
            ${iconSvg}
          </div>
          <div class="omnibar-item-body">
            <div class="omnibar-item-title omnibar-title-surah">
              <span class="surah-num-tag">QS ${item.surahId}</span>
              <span class="surah-title-name">${item.surahName}</span>
              ${item.arabicSurahName ? `<span class="surah-title-ar">${item.arabicSurahName}</span>` : ''}
            </div>
            <div class="omnibar-item-subtitle omnibar-subtitle-chips">
              <span class="meta-chip chip-total">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
                Total ${item.totalAyah} Ayat
              </span>
              <span class="meta-chip chip-start">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                Mulai dari Ayat 1
              </span>
            </div>
          </div>
          <div class="omnibar-item-badge">
            <span class="badge-surah">AYAT 1</span>
          </div>
        </div>
      `;
    } else {
      let badgeHtml = '<span class="badge-jump">JUMP</span>';
      if (isCmd) badgeHtml = '<span class="badge-cmd">CMD</span>';
      else if (isSearch) badgeHtml = '<span class="badge-search">SEARCH</span>';

      html += `
        <div class="omnibar-item omnibar-item-${item.iconType || 'default'} ${isSelected ? 'selected' : ''}" data-index="${index}" onclick="onOmnibarItemClick(${index})">
          <div class="omnibar-item-icon omnibar-icon-${item.iconType || 'default'}">
            ${iconSvg}
          </div>
          <div class="omnibar-item-body">
            <div class="omnibar-item-title">${item.title}</div>
            <div class="omnibar-item-subtitle">${item.subtitle}</div>
          </div>
          <div class="omnibar-item-badge">
            ${badgeHtml}
          </div>
        </div>
      `;
    }
  });

  listEl.innerHTML = html;

  // Render preview dari item yang sedang dipilih
  const activeItem = results[omnibarSelectedIndex];
  if (previewEl && activeItem) {
    if (activeItem.arabicSnippet) {
      const isSurah = activeItem.type === 'surah_info';
      previewEl.innerHTML = `
        <div class="omnibar-preview-box ${isSurah ? 'preview-surah-box' : ''}">
          <div class="preview-header-tag">
            <span class="preview-badge-cat ${isSurah ? 'cat-surah' : 'cat-verse'}">${isSurah ? 'PEMBUKA SURAT' : 'PREVIEW AYAT'}</span>
            <span class="preview-badge-ref">QS ${activeItem.surahName} (${activeItem.surahId}) : Ayat ${activeItem.ayahNo || 1}</span>
          </div>
          <div class="preview-arabic">${activeItem.arabicSnippet}</div>
          <div class="preview-translation">${activeItem.firstAyahTranslation || activeItem.subtitle}</div>
          <div class="preview-actions-bar">
            <span class="preview-key-hint"><kbd>Enter</kbd> ${isSurah ? 'Mulai dari Ayat 1' : 'Tampilkan'}</span>
            <span class="preview-key-hint"><kbd>Ctrl</kbd>+<kbd>Enter</kbd> ${isSurah ? 'Buka & SHOW (Live)' : 'Jump & SHOW'}</span>
          </div>
        </div>
      `;
      previewEl.style.display = 'block';
    } else {
      previewEl.innerHTML = '';
      previewEl.style.display = 'none';
    }
  } else if (previewEl) {
    previewEl.style.display = 'none';
  }

  // Auto scroll item terpilih ke dalam view
  const activeEl = listEl.querySelector('.omnibar-item.selected');
  if (activeEl) {
    activeEl.scrollIntoView({ block: 'nearest' });
  }
}

function onOmnibarItemClick(index) {
  omnibarSelectedIndex = index;
  executeOmnibarAction(omnibarCurrentResults[index]);
}

function handleOmnibarInput(e) {
  const query = e.target.value;
  clearTimeout(omnibarDebounceTimer);

  omnibarDebounceTimer = setTimeout(() => {
    omnibarSelectedIndex = 0;
    const results = parseOmnibarQuery(query);
    renderOmnibarResults(results);
  }, 60);
}

function handleOmnibarKeydown(e) {
  if (!isOmnibarOpen) return;

  if (e.key === 'Escape') {
    e.preventDefault();
    closeOmnibar();
    return;
  }

  if (e.key === 'ArrowDown') {
    e.preventDefault();
    if (omnibarCurrentResults.length > 0) {
      omnibarSelectedIndex = (omnibarSelectedIndex + 1) % omnibarCurrentResults.length;
      renderOmnibarResults(omnibarCurrentResults);
    }
    return;
  }

  if (e.key === 'ArrowUp') {
    e.preventDefault();
    if (omnibarCurrentResults.length > 0) {
      omnibarSelectedIndex = (omnibarSelectedIndex - 1 + omnibarCurrentResults.length) % omnibarCurrentResults.length;
      renderOmnibarResults(omnibarCurrentResults);
    }
    return;
  }

  if (e.key === 'Enter') {
    e.preventDefault();
    const goLive = e.ctrlKey || e.metaKey;
    if (omnibarCurrentResults.length > 0 && omnibarCurrentResults[omnibarSelectedIndex]) {
      executeOmnibarAction(omnibarCurrentResults[omnibarSelectedIndex], goLive);
    }
    return;
  }
}

// ── Global Keyboard Shortcut Listener ────────────────────────
window.addEventListener('keydown', (e) => {
  // Ctrl + K atau Cmd + K -> Buka Omnibar
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault();
    if (isOmnibarOpen) {
      closeOmnibar();
    } else {
      openOmnibar();
    }
    return;
  }

  // Tombol '/' saat tidak sedang fokus di input apapun -> Buka Omnibar
  if (e.key === '/' && !isOmnibarOpen) {
    const tag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
    if (tag !== 'input' && tag !== 'textarea') {
      e.preventDefault();
      openOmnibar();
      return;
    }
  }

  // Esc juga menutup Omnibar walau fokus sedang di tombol hasil pencarian,
  // bukan hanya saat kursor berada di kotak ketik.
  if (e.key === 'Escape' && isOmnibarOpen) {
    e.preventDefault();
    closeOmnibar();
    return;
  }
});
