(function (root) {
  'use strict';
  const aliases = {
    shalat: 'salat', sholat: 'salat', solat: 'salat',
    rejeki: 'rezeki', rizki: 'rezeki',
    taqwa: 'takwa', syurga: 'surga', sorga: 'surga',
    alloh: 'allah', allaah: 'allah',
    mohammad: 'muhammad', muhhamad: 'muhammad',
    hadits: 'hadis', hadist: 'hadis',
    wudhu: 'wudu', wudlu: 'wudu',
    shodaqoh: 'sedekah', shadaqah: 'sedekah',
    akherat: 'akhirat',
  };
  const ALIAS_HINTS = Object.keys(aliases);
  const ALIAS_RE = new RegExp('\\b(?:' + ALIAS_HINTS.join('|') + ')\\b', 'g');
  function hasArabic(text) {
    return /[\u0600-\u06ff]/.test(String(text || ''));
  }
  const ARABIC_RE = /[\u0600-\u06ff]/;
  const LATIN_ACCENT_RE = /[\u00c0-\u024f\u1e00-\u1eff]/;
  const ARABIC_PUNCT_RE = /[\u060c\u061b\u061f\u066a-\u066d\u06d4]+/g;
  function normalize(text) {
    let s = String(text || '').toLowerCase();
    if (!s) return '';
    // NFD hanya perlu untuk huruf Latin beraksen (é, ā, ṣ). Teks Arab/ASCII
    // tidak butuh dekomposisi, dan dulu itulah biaya terbesar saat prepare.
    if (LATIN_ACCENT_RE.test(s)) s = s.normalize('NFD');
    s = s.replace(/[\u0300-\u036f]/g, '');
    if (ARABIC_RE.test(s)) {
      s = s
        .replace(/[\u064b-\u065f\u0670\u06d6-\u06ed\u0640]/g, '')
        .replace(/[إأآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه')
        .replace(/[٠-٩۰-۹]/g, digit => String(digit.charCodeAt(0) - (digit <= '٩' ? 0x660 : 0x6f0)));
    }
    // Kelas karakter eksplisit jauh lebih cepat daripada \p{L}/\p{N}.
    s = s.replace(/[‘’'`]/g, '')
      .replace(ARABIC_PUNCT_RE, ' ')
      .replace(/[^0-9a-z\u0600-\u06ff]+/g, ' ')
      .trim().replace(/\s+/g, ' ');
    if (ALIAS_HINTS.some((word) => s.includes(word))) {
      s = s.replace(ALIAS_RE, word => aliases[word]);
    }
    return s;
  }
  // Consonant signatures are retrieval hints, never displayed as a reading.
  const consonants = {ب:'b',ت:'t',ث:'s',ج:'j',ح:'h',خ:'k',د:'d',ذ:'z',ر:'r',ز:'z',س:'s',ش:'s',ص:'s',ض:'d',ط:'t',ظ:'z',غ:'g',ف:'f',ق:'k',ك:'k',ل:'l',م:'m',ن:'n',ه:'h',ة:'t'};
  // Tanda konsonan per kata, dipakai pencarian transliterasi.
  function phoneticTokens(text, arabic) {
    const parts = String(text || '').split(arabic ? /[^\p{L}\p{M}]+/u : /[^A-Za-z']+/);
    const out = [];
    for (const part of parts) {
      const value = phonetic(part, arabic).value;
      if (value) out.push(value);
    }
    return out;
  }

  // Varian ejaan untuk satu kata kueri: tanwin (-un/-an/-in) dan ث (ts/th).
  function latinVariants(word) {
    const base = phonetic(word, false).value;
    if (!base) return [];
    const set = new Set([base]);
    if (/(?:un|an|in)$/.test(String(word).toLowerCase()) && base.endsWith('n') && base.length > 2) {
      set.add(base.slice(0, -1));
    }
    if (/th/i.test(word)) set.add(phonetic(String(word).replace(/th/gi, 'ts'), false).value);
    if (/dh/i.test(word)) set.add(phonetic(String(word).replace(/dh/gi, 'dz'), false).value);
    // Ta marbuthah ditulis "h" (jamaah) tetapi di tabel konsonan Arab menjadi "t".
    if (base.endsWith('h')) set.add(base.slice(0, -1) + 't');
    if (base.endsWith('t')) set.add(base.slice(0, -1) + 'h');
    return [...set].filter(Boolean);
  }

  const MARKS = new Set();
  for (let code = 0x064B; code <= 0x065F; code++) MARKS.add(code);
  MARKS.add(0x0670);
  for (let code = 0x06D6; code <= 0x06ED; code++) MARKS.add(code);
  MARKS.add(0x0640);
  const SUN_LETTERS = 'تثدذرزسشصضطظلن';

  function phonetic(text, arabic, withMap = false) {
    const offsets = [], letters = [];
    const original = String(text || '');
    const push = (value, from, to) => {
      for (const char of value) {
        if (letters[letters.length - 1] === char) {
          if (withMap) offsets[offsets.length - 1][1] = to;
        } else {
          letters.push(char);
          if (withMap) offsets.push([from, to]);
        }
      }
    };

    if (arabic) {
      // Jalur cepat: per karakter, tanpa regex per huruf. Ini yang membuat
      // pencarian transliterasi pertama tidak lagi memakan 1–3 detik.
      for (let index = 0; index < original.length; index++) {
        const char = original[index];
        if (MARKS.has(char.charCodeAt(0))) continue;
        if (char === 'ل') {   // lam: lewati bila bagian dari "ال" + huruf matahari
          let before = index - 1;
          while (before >= 0 && MARKS.has(original.charCodeAt(before))) before--;
          let after = index + 1;
          while (after < original.length && MARKS.has(original.charCodeAt(after))) after++;
          const previous = before >= 0 ? original[before] : '';
          const next = after < original.length ? original[after] : '';
          if ((previous === 'ا' || previous === 'ٱ') && SUN_LETTERS.includes(next)) continue;
        }
        push(consonants[char] || '', index, index + 1);
      }
      return { value: letters.join(''), offsets };
    }

    for (const token of original.matchAll(/[\p{L}\p{M}]+/gu)) {
      const value = token[0].toLowerCase().normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        // "sy"/"sh" = ش, "ts" = ث, tetapi "th" umumnya ط/ت (thaharah, thuhur).
        .replace(/sh|sy/g, 's').replace(/ts/g, 's').replace(/th/g, 't')
        .replace(/dz|dh/g, 'z').replace(/kh|ch/g, 'k').replace(/gh/g, 'g').replace(/q/g, 'k')
        .replace(/[aeiouwy]/g, '').replace(/[^b-df-hj-np-tv-z]/g, '');
      push(value, token.index, token.index + token[0].length);
    }
    return { value: letters.join(''), offsets };
  }

  function latinRange(text, raw) {
    const q = parse(raw, 'latin');
    if (!q.valid) return null;
    const mapped = phonetic(text, true, true);
    const index = mapped.value.indexOf(q.phonetic);
    if (index < 0) return null;
    let start = mapped.offsets[index][0], end = mapped.offsets[index + q.phonetic.length - 1][1];
    // Expand to original words, retaining harakat and the adjoining vowel letters.
    while (start > 0 && /[\p{L}\p{M}]/u.test(text[start - 1])) start--;
    while (end < text.length && /[\p{L}\p{M}]/u.test(text[end])) end++;
    return [start, end];
  }
  /* ── Morfologi Arab ringan ──────────────────────────────────────
     Bahasa Arab menempelkan awalan (ال، و، ب، ك، ل …) dan akhiran
     (ين، ون، ات، ها، هم …). Tanpa ini, "الصابرين" tidak menemukan
     "صبر". Varian dibuat dari kata kueri, bukan dari seluruh teks,
     sehingga biaya pencarian tetap kecil. */
  // Stemming ringan bahasa Indonesia untuk kata kunci terjemahan.
  const ID_PREFIXES = ['meng', 'meny', 'mem', 'men', 'ber', 'ter', 'pen', 'peng', 'per', 'me', 'di', 'se', 'ke'];
  const ID_SUFFIXES = ['kannya', 'annya', 'kan', 'an', 'nya', 'lah', 'kah', 'pun', 'i'];
  const SYNONYMS = {
    salat: ['sholat', 'shalat', 'solat'],
    sholat: ['salat'], shalat: ['salat'], solat: ['salat'],
    puasa: ['shaum', 'siyam'],
    shaum: ['puasa'], siyam: ['puasa'],
    sedekah: ['shodaqoh', 'shadaqah'],
    shodaqoh: ['sedekah'], shadaqah: ['sedekah'],
    nabi: ['rasul'],
    rasul: ['nabi'],
    surga: ['syurga', 'sorga'],
    syurga: ['surga'], sorga: ['surga'],
    neraka: ['jahanam'],
    jahanam: ['neraka'],
    akhirat: ['akherat'],
    akherat: ['akhirat'],
    wudu: ['wudhu', 'wudlu'],
    wudhu: ['wudu'], wudlu: ['wudu'],
    zakat: ['zakah'],
    zakah: ['zakat'],
    haji: ['hajj'],
    hajj: ['haji'],
    iman: ['mukmin'],
    mukmin: ['iman'],
    ilmu: ['pengetahuan'],
    pengetahuan: ['ilmu'],
  };

  function indonesianStem(word) {
    let stem = String(word || '');
    for (let pass = 0; pass < 2; pass++) {
      for (const prefix of ID_PREFIXES) {
        if (stem.startsWith(prefix) && stem.length - prefix.length >= 4) { stem = stem.slice(prefix.length); break; }
      }
      for (const suffix of ID_SUFFIXES) {
        if (stem.endsWith(suffix) && stem.length - suffix.length >= 4) { stem = stem.slice(0, -suffix.length); break; }
      }
    }
    return stem;
  }

  function latinAlternatives(term) {
    const out = new Set([term]);
    const stem = indonesianStem(term);
    if (stem && stem !== term) out.add(stem);
    for (const base of [term, stem]) {
      for (const synonym of SYNONYMS[base] || []) out.add(synonym);
    }
    return [...out];
  }

  const AR_PREFIXES = ['وال', 'بال', 'كال', 'فال', 'ال', 'لل', 'و', 'ف', 'ب', 'ك', 'ل'];
  const AR_SUFFIXES = ['ين', 'ون', 'ات', 'ها', 'هم', 'هن', 'كم', 'نا', 'ه', 'ي', 'ا'];
  function arabicStems(term) {
    if (!hasArabic(term) || term.length < 3) return [term];
    const out = new Set([term]);
    const add = (base) => {
      if (!base || base.length < 3) return;
      out.add(base);
      for (const suffix of AR_SUFFIXES) {
        if (base.endsWith(suffix) && base.length - suffix.length >= 3) {
          out.add(base.slice(0, -suffix.length));
        }
      }
    };
    add(term);
    for (const prefix of AR_PREFIXES) {
      if (term.startsWith(prefix) && term.length - prefix.length >= 3) {
        add(term.slice(prefix.length));
        break;
      }
    }
    return [...out];
  }
  function parse(raw, mode = 'text') {
    const normalized = normalize(raw);
    const isArabic = hasArabic(normalized);
    const cleanNoSpace = normalized.replace(/\s/g, '');
    const valid = /^\d+[a-z]?$/.test(normalized) || (isArabic ? cleanNoSpace.length >= 2 : cleanNoSpace.length >= 3);
    if (mode === 'latin') {
      const key = phonetic(raw, false).value;
      const words = String(raw || '').split(/[^A-Za-z']+/).filter(Boolean);
      const phoneticTokens = words.map(latinVariants).filter((list) => list.length);
      // Tanda frasa dibangun per kata: menggabungkan seluruh kalimat membuat
      // huruf kembar antar kata menyatu dan batas kata hilang.
      const phoneticJoined = phoneticTokens.map((list) => list[0]).join('');
      // Semua kombinasi varian (tanwin, h/t, th) supaya frasa tetap cocok
      // walau hanya satu kata yang ejaannya berbeda.
      let combos = [''];
      for (const list of phoneticTokens) {
        const next = [];
        for (const prefix of combos) for (const variant of list) { if (variant) next.push(prefix + variant); }
        combos = next.slice(0, 64);
      }
      const phoneticCombos = combos.filter(Boolean);
      return {normalized: String(raw || '').trim().toLowerCase(), terms: [], number: null, isArabic: false,
        mode, phonetic: key, phoneticTokens, phoneticJoined, phoneticCombos,
        valid: !hasArabic(raw) && !/\d/.test(raw) && key.length >= 4};
    }
    const terms = [...new Set(normalized.split(' ').filter(Boolean))];
    if (mode === 'translation') {
      return {normalized, terms, alternatives: terms.map((term) => latinAlternatives(term)),
        number: /^\d+[a-z]?$/.test(normalized) ? normalized : null, isArabic, translationOnly: true, valid};
    }
    return {
      normalized,
      terms,
      // Setiap kata punya daftar varian; kata asli selalu di urutan pertama.
      alternatives: terms.map((term) => (hasArabic(term) ? arabicStems(term) : latinAlternatives(term))),
      number: /^\d+[a-z]?$/.test(normalized) ? normalized : null,
      isArabic,
      valid
    };
  }
  function prepare(item) {
    const title = normalize(item.title);
    const body = normalize([item.translation, item.arabic].join(' '));
    // searchExtra: metadata dari edisi lain yang barisnya sudah digabung ke
    // edisi kanonik. Hanya untuk pencarian, tidak pernah ditampilkan.
    const extra = item.searchExtra ? ' ' + normalize(item.searchExtra) : '';
    const text = [title, normalize(item.collection), body, normalize(item.reference)].join(' ') + extra;
    const numbers = normalize([item.number, item.searchNumbers].filter(Boolean).join(' ')).match(/\d+[a-z]?/g) || [];
    const translationOnly = ' ' + normalize(item.translation) + ' ';
    return { text, padded: ' ' + text + ' ', body: ' ' + body + ' ', title, numbers, translation: translationOnly };
  }
  function matchesWord(word, term) {
    return word === term || ((hasArabic(term) || term.length >= 4) && word.includes(term));
  }
  function score(prepared, q) {
    if (!q.valid) return 0;
    if (q.number) return prepared.numbers.includes(q.number) ? 1000 : 0;
    const translationOnly = !!q.translationOnly;
    const padded = translationOnly ? (prepared.translation || '  ') : prepared.padded;
    const haystack = translationOnly ? padded : prepared.text;
    const alternatives = q.alternatives || q.terms.map((term) => [term]);
    let weightSum = 0;
    let qualitySum = 0;
    let exactWords = 0;
    for (let i = 0; i < q.terms.length; i++) {
      const term = q.terms[i];
      if (/^\d+[a-z]?$/.test(term)) {
        if (!prepared.numbers.includes(term)) return 0;
        weightSum += 1;
        qualitySum += 1;
        exactWords += 1;
        continue;
      }
      const termIsArabic = hasArabic(term);
      const variants = alternatives[i] || [term];
      const weight = tokenWeight(q, term);
      let matched = '';
      let quality = 0;
      for (const variant of variants) {
        const hit = ((termIsArabic && variant.length >= 2) || variant.length >= 4)
          ? haystack.includes(variant)
          : padded.includes(' ' + variant + ' ');
        if (!hit) continue;
        const variantQuality = variant === term ? (padded.includes(' ' + term + ' ') ? 1 : 0.75) : 0.6;
        if (variantQuality > quality) { matched = variant; quality = variantQuality; }
        if (quality === 1) break;
      }
      if (!matched) return 0;
      weightSum += weight;
      qualitySum += weight * quality;
      if (quality === 1) exactWords += 1;
    }
    const coverage = weightSum ? qualitySum / weightSum : 0;
    let value = 200 + Math.round(300 * coverage);
    if (padded.includes(' ' + q.normalized + ' ')) value += 400;
    if (!translationOnly && prepared.body.includes(' ' + q.normalized + ' ')) value += 60;
    if (!translationOnly && (' ' + prepared.title + ' ').includes(' ' + q.normalized + ' ')) value += 60;
    value += exactWords * 40;
    return value;
  }
  // Bobot kata: makin langka, makin besar pengaruhnya (IDF sederhana).
  function tokenWeight(q, token) {
    if (!q || !q.df) return 1;
    const total = q.total || 1;
    const df = q.df[token] || 0;
    return Math.log(1 + total / (1 + df));
  }

  function scoreLatin(row, q) {
    if (!q.valid) return 0;
    const arabic = row.item && row.item.arabic;
    if (!arabic) return 0;
    if (row.latinWords === undefined) row.latinWords = phoneticTokens(arabic, true);
    if (row.latinPlain === undefined) {
      row.latinPlain = row.latinWords.map((word) => (word.startsWith('l') ? word.slice(1) : word)).join('');
    }
    if (row.latinKey === undefined) row.latinKey = row.latinWords.join('');
    if (!row.latinStarts) {
      row.latinStarts = new Set();
      row.latinPlainStarts = new Set();
      let pos = 0;
      let plain = 0;
      for (const word of row.latinWords) {
        if (!word) continue;
        row.latinStarts.add(pos);
        row.latinPlainStarts.add(plain);
        pos += word.length;
        plain += word.startsWith('l') ? word.length - 1 : word.length;
      }
    }

    const needles = [q.phoneticJoined, q.phonetic, ...(q.phoneticCombos || [])].filter(Boolean);
    const plainNeedle = (q.phoneticTokens || []).map((list) => {
      const base = list[0] || '';
      return base.startsWith('l') ? base.slice(1) : base;
    }).join('');
    if (plainNeedle) needles.push(plainNeedle);
    if (!needles.length) return 0;

    // Frasa pendek hanya diterima bila dimulai di batas kata; frasa panjang
    // cukup dicari di mana saja (lebih spesifik). Kata sandang "ال" diabaikan.
    const matches = (hay, starts, needle) => {
      if (needle.length >= 10) return hay.includes(needle);
      let index = hay.indexOf(needle);
      while (index >= 0) {
        if (starts.has(index)) return true;
        index = hay.indexOf(needle, index + 1);
      }
      return false;
    };
    const pairs = [
      [row.latinWords.join(''), row.latinStarts],
      [row.latinPlain, row.latinPlainStarts],
      [row.latinKey, row.latinStarts],
    ];
    const tokens = q.phoneticTokens && q.phoneticTokens.length ? q.phoneticTokens : [[q.phonetic]];
    const significant = tokens.filter((variants) => variants.some((variant) => variant.length >= 3));
    let idfSum = 0;
    let rare = 0;
    for (const variants of significant) {
      const weight = Math.max(...variants.map((variant) => tokenWeight(q, variant)), 0);
      idfSum += weight;
      const best = Math.max(...variants.map((variant) => (q.df && q.df[variant] ? q.df[variant] / (q.total || 1) : 1)), 0);
      if (best <= 0.05) rare++;
    }
    const rarityBonus = Math.round(Math.min(180, idfSum * 10));

    if (needles.some((item) => pairs.some(([hay, starts]) => matches(hay, starts, item)))) {
      return 700 + rarityBonus;
    }

    // Huruf "l" (kata sandang/preposisi) sering tidak diketik: "binniyat"
    // vs "bal-niyyat". Bandingkan juga tanda tanpa huruf l.
    if (row.latinStripped === undefined) row.latinStripped = row.latinWords.join('').replace(/l/g, '');
    const stripped = needles.map((item) => item.replace(/l/g, '')).filter((item) => item.length >= 6);
    if (stripped.some((item) => row.latinStripped.includes(item))) return 690 + rarityBonus;

    // Cadangan: kata-kata muncul berurutan dan berdekatan (frasa tersisip).
    const needle = needles[0];
    if (significant.length < 2) return 0;
    // Gerbang presisi: cadangan hanya dipakai bila ada kata langka. Tanpa itu,
    // potongan umum seperti "man hadatsa fi amrina" membanjiri hasil.
    if (q.df && rare === 0) return 0;
    const haystack = row.latinPlain;
    let cursor = -1, first = -1, lastEnd = -1;
    for (const variants of significant) {
      let best = -1, bestLen = 0;
      for (const variant of variants) {
        if (!variant) continue;
        const index = haystack.indexOf(variant, cursor + 1);
        if (index >= 0 && (best < 0 || index < best)) { best = index; bestLen = variant.length; }
      }
      if (best < 0) return 0;
      if (first < 0) first = best;
      lastEnd = best + bestLen;
      cursor = best + 1;
    }
    const span = lastEnd - first;
    const budget = Math.max(12, Math.round(needle.length * 1.4) + 4);
    if (span > budget) return 0;
    return 300 + Math.round(Math.min(200, idfSum * 12)) + Math.max(0, 80 - span);
  }

  /* ── Toleransi salah ketik (Latin) ───────────────────────────────
     Hanya dipakai sebagai cadangan ketika pencarian persis kosong,
     supaya pencarian normal tidak melambat. Jarak 1 untuk kata 4–6
     huruf dan 2 untuk kata ≥7 huruf; huruf pertama harus sama agar
     hasil tidak melebar. */
  function editDistance(a, b, limit = 1) {
    if (a === b) return 0;
    if (Math.abs(a.length - b.length) > limit) return limit + 1;
    let previous = Array.from({ length: b.length + 1 }, (_, i) => i);
    for (let i = 1; i <= a.length; i++) {
      const current = [i];
      let rowMin = i;
      for (let j = 1; j <= b.length; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        const value = Math.min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + cost);
        current.push(value);
        if (value < rowMin) rowMin = value;
      }
      if (rowMin > limit) return limit + 1;   // tidak mungkin membaik
      previous = current;
    }
    return previous[b.length];
  }
  // Salah ketik yang paling umum di Indonesia: huruf dobel (sholaat, puaasa).
  function collapseDoubles(text) {
    return String(text || '').toLowerCase().replace(/([a-z])\1+/g, '$1');
  }
  function tokensOf(text) {
    return String(text || '').split(' ').filter(Boolean);
  }
  function fuzzyLimit(term) {
    return term.length >= 7 ? 2 : 1;
  }
  // Skor cadangan: setiap kata kueri harus punya kemiripan.
  function fuzzyScore(prepared, q) {
    if (!q.valid || q.number || q.isArabic) return 0;
    const terms = q.terms || [];
    if (!terms.length) return 0;
    const tokens = tokensOf(prepared.text);
    let total = 0;
    for (const term of terms) {
      if (term.length < 4) return 0;
      const limit = fuzzyLimit(term);
      let best = limit + 1;
      for (const token of tokens) {
        if (token[0] !== term[0]) continue;
        if (Math.abs(token.length - term.length) > limit) continue;
        const distance = editDistance(term, token, limit);
        if (distance < best) { best = distance; if (best === 0) break; }
      }
      if (best > limit) return 0;
      total += 200 - best * 60;
    }
    return total;
  }
  // Kata terdekat pada sebuah teks, untuk saran "Mungkin maksud Anda".
  function closestToken(text, term) {
    if (!term || term.length < 4) return '';
    const limit = fuzzyLimit(term);
    let best = '';
    let bestDistance = limit + 1;
    for (const token of tokensOf(text)) {
      if (token[0] !== term[0]) continue;
      if (Math.abs(token.length - term.length) > limit) continue;
      const distance = editDistance(term, token, limit);
      if (distance < bestDistance) { bestDistance = distance; best = token; if (distance === 1) break; }
    }
    return best;
  }
  function escape(text) {
    return String(text || '').replace(/[&<>"']/g, ch => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[ch]));
  }
  function highlight(text, raw, mode = 'text') {
    text = String(text || '');
    if (mode === 'latin') {
      const range = latinRange(text, raw);
      return range ? escape(text.slice(0, range[0])) + '<mark class="hd-highlight">' + escape(text.slice(...range)) + '</mark>' + escape(text.slice(range[1])) : escape(text);
    }
    const q = parse(raw);
    if (!q.valid || q.number) return escape(text);
    // Whole original words keep Arabic harakat and HTML escaping intact.
    const words = /[\p{L}\p{N}\p{M}‘’'`]+/gu;
    let output = '', last = 0;
    for (const match of text.matchAll(words)) {
      const word = normalize(match[0]);
      const hit = word && q.terms.some(term => {
        return matchesWord(word, term);
      });
      output += escape(text.slice(last, match.index));
      output += hit ? '<mark class="hd-highlight">' + escape(match[0]) + '</mark>' : escape(match[0]);
      last = match.index + match[0].length;
    }
    return output + escape(text.slice(last));
  }
  function snippet(text, raw, length = 190, mode = 'text') {
    text = String(text || '').replace(/\s+/g, ' ').trim();
    if (text.length <= length) return text;
    if (mode === 'latin') {
      const range = latinRange(text, raw);
      let start = Math.max(0, (range ? range[0] : 0) - 35);
      if (start) start = text.indexOf(' ', start) + 1;
      const end = Math.max(start + length, range ? range[1] : 0);
      return (start ? '…' : '') + text.slice(start, end).trim() + (end < text.length ? '…' : '');
    }
    const terms = parse(raw).terms;
    // Prefer the window covering the most distinct terms, not the first narrator match.
    const hits = [];
    for (const word of text.matchAll(/[\p{L}\p{N}\p{M}‘’'`]+/gu)) {
      const normalized = normalize(word[0]);
      const matched = terms.filter(t => matchesWord(normalized, t));
      if (matched.length) hits.push({ position: word.index, terms: matched });
    }
    let position = 0;
    let best = 0, right = 0;
    const counts = new Map();
    for (let left = 0; left < hits.length; left++) {
      while (right < hits.length && hits[right].position < hits[left].position + length - 55) {
        for (const term of hits[right].terms) counts.set(term, (counts.get(term) || 0) + 1);
        right++;
      }
      if (counts.size > best) { best = counts.size; position = hits[left].position; }
      for (const term of hits[left].terms) {
        const remaining = counts.get(term) - 1;
        if (remaining) counts.set(term, remaining); else counts.delete(term);
      }
    }
    let start = Math.max(0, position - 55);
    if (start) start = text.indexOf(' ', start) + 1;
    return (start ? '…' : '') + text.slice(start, start + length).trim() + (start + length < text.length ? '…' : '');
  }
  function presentationText(item) {
    const clean = value => String(value || '').replace(/\r\n?/g, '\n').trim();
    // Remove only known standalone archive furniture, not hadith commentary.
    const translation = clean(item.translation).split('\n')
      .filter(part => !/^(?:<\s*kembali\s*$|daftar isi\s*$|lanjut\s*>\s*$|Produksi Kampungsunnah\.org tahun \d{4}\.|(?:Copyleft|Copyright)\s*(?:©|\(c\))?\s*\d{4}(?:\s*[-–]\s*\d{4})?\s+Kampungsunnah\.org\s*\.?\s*$)/i.test(part.trim()))
      .join('\n').replace(/\n{3,}/g, '\n\n').trim();
    const originalReference = clean(item.reference || item.riwayat);
    let reference = originalReference || clean(item.collection);
    const number = clean(item.number);
    if (number) {
      const numbers = reference.match(/\d+[a-z]?(?:\s*[-–]\s*\d+[a-z]?)?/gi) || [];
      if (!numbers.some(value => value.replace(/\s/g, '') === number.replace(/\s/g, ''))) {
        reference += (reference ? ' • ' : '') + 'No. ' + number;
      }
    }
    let body = translation;
    if (originalReference) {
      const escaped = originalReference.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
      // A duplicated citation at the end belongs in the single reference block.
      body = body.replace(new RegExp('\\s*' + escaped + '[.\\s]*$'), '').trim();
    }
    return { arabic: clean(item.arabic), translation: body, riwayat: reference };
  }
  function copyText(item) {
    const text = presentationText(item);
    return [text.arabic, text.translation, text.riwayat].filter(Boolean).join('\n\n');
  }

  /* ── Deduplikasi hasil ────────────────────────────────────────────
     Satu hadits bisa muncul lebih dari sekali: duplikat di dalam satu
     berkas, atau tumpang tindih antara "Kitab 9 Imam" dan berkas
     per-kitab (edisi berbeda). Kuncinya teks Arab ternormalisasi;
     bila teks Arab terlalu pendek/kosong, pakai koleksi + nomor. */
  function dedupeKey(item) {
    const arabic = normalize(String(item.arabic || '').replace(/\u0640/g, ''))
      .replace(/\s+/g, ' ')
      .trim();
    if (arabic.length >= 12) return 'ar:' + arabic;
    return 'ref:' + normalize(item.collection || '') + '|'
      + normalize(item.number || '') + '|' + normalize(item.title || '');
  }

  // Masukan HARUS sudah terurut (skor tertinggi lebih dulu) agar yang
  // dipertahankan adalah versi terbaik.
  function dedupe(matches) {
    const list = Array.isArray(matches) ? matches : [];
    const seen = new Set();
    const kept = [];
    for (const match of list) {
      if (!match || !match.item) continue;
      const key = dedupeKey(match.item);
      if (seen.has(key)) continue;
      seen.add(key);
      kept.push(match);
    }
    return { matches: kept, removed: list.length - kept.length };
  }

  // Riwayat pencarian: terbaru di depan, tanpa duplikat (kueri + mode sama).
  function historyAdd(list, entry, max = 12) {
    const items = Array.isArray(list) ? list : [];
    const query = String(entry && entry.q || '').trim();
    if (!query) return items.slice(0, max);
    const mode = String(entry && entry.mode || 'text');
    const rest = items.filter((item) => !(item && item.q === query && (item.mode || 'text') === mode));
    return [{ q: query, mode, at: entry && entry.at ? entry.at : Date.now() }, ...rest].slice(0, max);
  }

  const api = { hasArabic, normalize, parse, prepare, score, scoreLatin, fuzzyScore, closestToken, editDistance, collapseDoubles, phonetic, escape, highlight, snippet, presentationText, copyText, dedupe, dedupeKey, phoneticTokens, latinVariants, historyAdd };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.HadithSearchEngine = api;
})(typeof globalThis !== 'undefined' ? globalThis : window);
