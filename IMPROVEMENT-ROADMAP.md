# Webquran v5.2 — Application Review & Improvement Roadmap

**Reviewed:** `D:\8. PROJECT PERCEPATAN\Webquran v5.2`
**Scope:** Electron main process, embedded HTTP server, operator panel, presentation/template layer, hadith data pipeline, packaging.
**Method:** static code review plus measured numbers (file sizes, record counts, parse timings, test runs). Every finding cites file and line. Claims marked *verified* were re-read directly; nothing is inferred about intent.

---

## Status — Sprint 1 selesai (2026-11-01)

Seluruh butir Sprint 1 sudah diimplementasikan dan diuji. Tinggal build ulang EXE untuk verifikasi akhir.

| Butir | Status | Ringkas |
|---|---|---|
| B18 | ✅ | Pencarian hadits default satu kitab (22,7 s → ±1,3 s) |
| B1 | ✅ | State awal kosong; placeholder & ayat lama tidak lagi tayang |
| B2 | ✅ | `?obs` aktif sejak muatan pertama; URL overlay bisa disalin dari panel |
| B3 | ✅ | **Muat** tidak lagi mengubah tayangan on air; Show menayangkan isi panggung |
| B4 | ✅ | Spasi & T berfungsi walau fokus berada di tombol |
| B5 | ✅ | Tally **ON AIR / BLANK** (merah/abu) + Cut Black memotong, bukan toggle |
| B7 | ✅ | Badge **⚠ Terpotong / ✓ Muat** di panel hadits |
| B8 | ✅ | Baris riwayat di Full Screen tidak lagi terpotong |
| B9 | ✅ | 61 berkas font (1,96 MiB) dibundel lokal, `font-display: block` |
| B12 | ✅ | Indikator vMix menyala sesuai keadaan; tombol kirim vMix dihapus |
| D1–D14 | ✅ | Manual & bantuan aplikasi diselaraskan dengan kode |
| Ikon | ✅ | `build/icon.ico` (7 ukuran) + `build/icon.png` |

Tambahan di luar daftar Sprint 1: template **PiP** dirombak menjadi picture-in-picture sungguhan (panel 60% kanan, area kamera 40% kiri), tipografi panel PiP dirapikan, dan F9/F11 kini benar-benar berfungsi seperti yang tertulis di bantuan.

Yang **belum** dikerjakan (Sprint 2 ke atas): akses LAN, single-instance lock, settings persisten, pre-flight check, CSP/CORS, dedupe data hadits, pengecilan paket, dan templat berbasis token.

---

## Status — Sprint 2 selesai (2026-11-01)

| Butir | Status | Ringkas |
|---|---|---|
| A12 | ✅ | Paket ramping: **EXE 230,8 → 117,5 MB** (asar 551 → 432 MB), isi diverifikasi |
| B15a | ✅ | `requestSingleInstanceLock` — instance kedua keluar & memfokuskan jendela yang ada |
| B15b | ✅ | `settings.json` persisten (tema, template, font, ukuran tayang, bookmark, riwayat, posisi terakhir, template hadits) |
| B14 | ✅ | Akses jaringan lokal opsional + saklar di panel + URL LAN siap salin + catatan firewall |
| U1 | ✅ | F2 tidak mengosongkan kolom; kolom kosong ditandai merah + pesan jelas |
| U4 | ✅ | Bantuan sekali per versi, toast pemulihan template dihapus, toast berantre (maks 3) |
| U7 | ✅ | **Ukuran Tayang** vs **Ukuran Baca**, chip ukuran di Program Feed, ukuran tayang dipulihkan |
| U2 | ✅ | Esc konsisten; scroll tidak lagi terbuka di belakang modal |
| U3 | ✅ | Jendela mengikuti ukuran layar; breakpoint 1180–1500 px; Program Feed mengambang |
| U6 | ✅ | Tab **Pemeriksaan** (pre-flight) 8 baris + salin laporan |

Catatan teknis selama Sprint 2: `settings.json` sengaja ditulis di luar jalur HTTP (agar endpoint tetap murni dan mudah diuji), dan sebuah **benturan deklarasi global** (`isOmnibarOpen`) sempat ditemukan sebelum rilis — kini ada pemeriksa benturan nama di `scratch/` (sementara).

Yang **belum** dikerjakan (Sprint 3 ke atas): CSP/CORS + token, API atomik, satu kanal sinkronisasi, dedupe data hadits, template berbasis token, dan PVW/PGM.

---

## Status — Sprint 3 berjalan

| Butir | Status | Ringkas |
|---|---|---|
| A7 | ✅ | CSP pada semua halaman HTML, CORS dipatok ke origin aplikasi, POST dari origin asing **403**, `sandbox: true`, penjagaan path traversal |
| B13 | ✅ | Nama template divalidasi (allow-list 5 template) — tidak ada lagi 404 di layar |
| B16 | ✅ | `applyState()`: validasi menyeluruh dulu, baru terapkan; panel memakai keadaan balikan server. Tally tidak lagi menebak |
| B11 | ✅ | Heartbeat `/api/ping` tiap 3 detik; spanduk merah + tombol **Periksa Sekarang** bila 2× gagal, toast saat pulih |
| B17 | ✅ | `POST /api/verse` atomik lewat `validateVerseUpdate` + `applyState`; polling jendela Electron 0,5 → 3 dtk (OBS tetap 0,5 dtk) |
| U13 | ✅ | Skala teks diverifikasi ada di **kelima** template; cakupan tema dibuat jujur — catatan di modal Template, tooltip tombol tema, dan manual |
| B6 | ✅ | Fitter bersama dipakai **Dual Column** (dulu ukuran tetap 36 px → meluber); template melaporkan "terpotong" ke panel lewat Program Feed |
| B10 | ✅ | Ganti template memakai iframe kedua + crossfade — layar tidak lagi berkedip hitam/termuat ulang |

Sprint 3 **selesai**. Suite **45/45**.

Test baru: `server-security.test.js` (12 asersi), `state-authority.test.js` (16 asersi), `verse-api.test.js` (16 asersi). Suite kini **44/44**.

Catatan U13: tiga template Lower Third **sengaja** memakai desain tetap; memberi palet gelap/terang akan mengubah tampilan bawaannya (tema panel bawaannya gelap), jadi yang diperbaiki adalah kejujuran kontrolnya, bukan desainnya.

Catatan: konteks `vm` di test tidak mewarisi global Node, sehingga `URL`/`setTimeout` harus disuntikkan — tanpa itu pemeriksaan origin tampak gagal padahal aplikasi benar.

---

## Status — Sprint 4 berjalan

| Butir | Status | Ringkas |
|---|---|---|
| A3 | ✅ (audit) | **Tidak ada duplikat berkas** (0 grup hash dari 28.686 berkas). Tumpang tindih isi hanya 17.033 dari 44.102 teks (≈34 MB), sementara 27.069 teks **hanya** ada di berkas per-kitab → dedupe akan menghilangkan isi, jadi **tidak dilakukan** |
| A4 | ✅ | `reading/` **28.450 berkas / 199,2 MB → `reading.pak` 65,8 MB** (67%); folder proyek 662 → **409 MB**, jumlah berkas 28.936 → 476 |
| A8 | ✅ | `js/template-runtime.js` — kontrak bersama (mode OBS, `?side`, pendengar pesan, polling cadangan, laporan fit). **Empat** template memakainya: PiP (−37 baris), Dual (−55), Lower Third Light (−19), Lower Third Dark (−18). `default.html` sengaja belum: polling-nya juga menyinkronkan tema + ukuran dengan jeda (cooldown) sendiri |
| A9 | ✅ | Pemindaian 748 deklarasi → **8 kode mati dihapus** (`folderHandle`, `applyFontVars`, `HadithPresentation`, `pushTransVisibility`, `renderResult`, `loadCustomTranslation`, `copyObsUrl`, `wasVisible`). **111 berkas JSON per-surah lama (11 MB)** di luar paket — tidak dirujuk kode mana pun |
| A14 | ✅ | Berkas statis dikirim **streaming** (`createReadStream` + `Content-Length` + `ETag`/`Last-Modified`), balasan **304** untuk permintaan berulang OBS/vMix, penanganan galat baca tanpa mematikan proses |
| A13 | ✅ | `tools/build-quran-data.js` (`npm run build:quran`) membangun ulang `js/quran-data.js` dari `data/1…114.json` secara deterministik, dengan `--dry-run` dan `--keep-all` |
| A2 | ✅ | Data Al-Qur'an ramping: **9,42 MB → 4,49 MB** (−52%) dengan membuang 8 field yang tidak pernah dibaca (`page`, `quarter_hizb`, `juz`, `manzil`, `kitabah`, `arabic_words`, `footnotes`, `updated_at`). Isi diverifikasi 114 surat / 6.236 ayat + spot check QS 2:255 |

Sprint 4 **selesai**. Suite **50/50**.

Catatan A2: indeks pencarian sengaja **tidak** dibuat sebagai berkas terpisah — ukurannya akan hampir menyamai data itu sendiri, sementara indeks saat ini terbentuk dari 6.236 ayat dalam hitungan milidetik. Setelah data ramping, biaya parse saat aplikasi dibuka ikut turun separuh.

Test baru: `tools/reading-pak.test.js` — server menyajikan halaman dari paket, halaman asing 404, traversal keluar aplikasi gagal. Suite kini **46/46**.

Catatan A4: pengemasan memakai `tools/pack-reading.js` (`npm run pack:reading`), format `[4 byte panjang header][JSON indeks][data gzip]`. Server tetap mengutamakan folder asli bila ada, sehingga membangun ulang data hadits tidak merusak apa pun.

---

## Status — Sprint 5 selesai (v5.3.0, 2026-11-01 → 2026-11-02)

Sprint desain & pemolesan: keluarga template lower third diperluas, label diseragamkan, dan beberapa bug panggung yang menghalangi siaran diperbaiki. Dirilis sebagai **v5.3.0**.

| Butir | Status | Ringkas |
|---|---|---|
| F1 | ✅ | Empat template lower third baru: **Emerald Glass**, **Midnight Blue**, **Paper Light**, **Dual Split Sapphire**. Semua memakai sistem ukuran/fase yang sama dengan Light/Dark (`QuranTextFit` + line-height 2,25/1,55), jadi perilaku teks konsisten |
| F2 | ✅ | Label sumber diseragamkan di **ketujuh** template lower third: pil emas diganti label editorial (teks emas kecil + garis bawah) |
| F3 | ✅ | Sapuan garis label 0,6 dtk (`labelLine`) di Light, Dark, Dual, Sapphire; kilau besar `flare-sweep` di Dual **dihapus** (tidak terlihat karena `z-index: -1` di balik panel opak, dan mengganggu bila dinaikkan) |
| F4 | ✅ | Warna teks Arab: **hitam `#111827`** pada panel terang (kontras 17,7:1 vs putih; emerald lama 9,7:1). Panel gelap tetap putih |
| F5 | ✅ | **Versi terjemahan berfungsi lagi**: `loadTranslationFile()` membaca `data/custom_full_quran.json` + `data/kemenag2002.json` (6.236 ayat, BOM dibuang, cache per sesi); label kuning menyebut nama versi, bukan "CUSTOM" |
| F6 | ✅ | Berkas terjemahan **ikut dibundel** (`package.json` build `files`: dulu dikecualikan `!data/custom_full_quran.json`); diverifikasi ada di `app.asar` dan disajikan server paket (HTTP 200, 1,19 + 1,37 MB) |
| F7 | ✅ | Dual Column: padding kanan Arab 3,2 vw (dulu menempel tepi). Sapphire memakai `justify-content` adaptif (center bila muat, flex-start + auto-scroll bila meluber), sehingga ukuran 120% tidak lagi terpotong |
| F8 | ✅ | Tujuh template lower third menjadi **full-bleed** (`width: 100vw`), sudut membulat hanya di atas |
| F9 | ✅ | Sidebar & top bar dirapikan (397 baris CSS baru): kartu section seragam, kontrol 38 px, ikon konsisten, header & bar panggung tidak terpotong di 1100–1440 px |
| F10 | ✅ | Thumbnail modal Template disamakan dengan tampilan asli (9 kartu, full-bleed); catatan tema diperbarui jadi "ketujuh template" |
| F11 | ✅ | Bug panggung: `ReferenceError` TDZ (`isPresentationVisible`, `SVG_*`, `lanInfo`) membuat panggung berhenti di skeleton — state dipindah ke `<script>` paling awal + `syncBrowserSourceUrls` ditunda ke `DOMContentLoaded` |
| F12 | ✅ | Tab Bantuan → Setup OBS & vMix: nomor urut diperbaiki (dulu "2" dipakai dua kali) |
| F13 | ✅ | Rilis **v5.3.0**: `dist/Webquran-v5.3.0-Portable.exe` (160,9 MB), EXE diuji jalan, server lokal 34730 melayani `/index.html`, `/api/verse`, dan kedua berkas terjemahan |

Sprint 5 **selesai**. Suite **52/52** (13 berkas uji).

Catatan ukuran: EXE naik 117,5 → 160,9 MB karena paket membawa pustaka hadits (`data/hadith`, 271 MB mentah / 13 berkas) yang terkompresi.

Catatan: `dist/Webquran-v5.3.0-Portable.exe` dibangun **sebelum** F12 (nomor urut Bantuan) dan F8 (full-bleed) — keduanya masih di kode sumber dan menunggu build v5.3.1.

---

## Status — Sprint 6 berjalan (kapabilitas baru)

> Catatan penomoran: daftar **"Suggested sequence → Sprint 5 — new capability (pick two)"** dieksekusi sebagai **Sprint 6** di catatan status ini, karena nomor Sprint 5 sudah dipakai untuk siklus desain v5.3.0 di atas.

Pilihan jatuh pada **F5 (PVW/PGM)** dan **F1 (Rundown)**.

| Butir | Status | Ringkas |
|---|---|---|
| F5 langkah 1 | ✅ | Mode siaran **Langsung** / **PVW → TAKE** (pemilih di sidebar, disimpan di `localStorage`). Chip **PVW/PGM** di dock menampilkan `surah:ayah` masing-masing; warna amber + tombol **TAKE** aktif saat PVW ≠ PGM. TAKE = `pushToPresentation(konten PVW)`, membuka layar bila sedang blank. Pintasan **Shift+Enter**. Label tombol utama berubah otomatis ("TAMPILKAN AYAT" ↔ "MUAT (PVW)") |
| F5 langkah 2 | ✅ | Semua jalur memakai satu gerbang `resolvePushToAir()`: `searchAyah()` tanpa nilai eksplisit mengikuti mode, `loadSearchResultToStage()` membedakan Muat (PVW) vs Show (udara), panah ↑/↓ memakai `primaryDisplayAction()`. Uji regresi baru `tools/pvw-pgm.test.js` (6 asersi) |
| F1 | ⬜ | **Di-skip** oleh operator (rundown tidak relevan untuk alur kerja saat ini) |
| F5-lanjut | ✅ | **Dual & Dual Split Sapphire**: teks diukur ke tinggi kolom (js/dual-fit.js), panel tumbuh 28vh→40vh, gulir hanya untuk isi ekstrem, mask fade hanya aktif saat menggulir. Tombol **⏸ GULIR** di dock + pintasan **P**; status dikirim lewat /api/verse (scrollPaused) sehingga overlay OBS ikut berhenti. Uji: 	ools/dual-fit.test.js (4 asersi) — suite **62/62** |

---

## Status — Sprint 7 berjalan (pencarian hadits)

Diukur sebelum perbaikan: **91.138 hadits**, muat+siapkan **19,1 dtk**, RAM **1.042 MB**; الصابرين → **0 hasil**, lloh → **2 hasil**, sabar di 9-Imam+Bukhari → 492 hasil dengan duplikat antar edisi.

| Butir | Status | Ringkas |
|---|---|---|
| H1 dedup hasil | ✅ | engine.dedupe() (kunci teks Arab ternormalisasi, harakat/tatweel-insensitive; cadangan koleksi+nomor) dipakai worker **per sumber** dan **setelah gabungan**. Hasil nyata: puasa 2.921→2.753 (−6%), sabar 492→443 (−10%), niat 541→465 (−14%). Panel menampilkan "N duplikat disaring". Uji: 	ools/hadith-dedupe.test.js (5 asersi) |
| H2a mesin lebih cepat | ✅ | `normalize()` ditulis ulang: kelas karakter eksplisit (bukan `\p{L}`), NFD hanya untuk huruf Latin beraksen, alias diperiksa hanya bila perlu. **Prepare: Bukhari 1.472→791 ms (−46%), Nasai 853→463 ms**; **semua kitab 19,1→9,8 dtk (−49%)**, RAM **1.042→403 MB (−61%)**. Jumlah hasil tiap kueri identik sebelum/sesudah |
| H2b dedup data (aman) | ✅ | 	ools/build_hadith_dedup.js → kitab-9-imam-unik.json (48.601 baris, 98,8 MB) + sidecar search-extra.json (13.553 entri, 1,7 MB). Kunci dedup = **teks Arab + terjemahan identik**; judul/koleksi/rujukan/nomor baris yang digabung dipindahkan ke sidecar agar tetap bisa dicari. **Paritas hasil diuji: puasa 3245, sabar 551, niat 567, "orang yang beriman" 1173, "ibnu majah" 9121 — identik sebelum/sesudah.** Berkas asli 125 MB tetap disimpan tetapi dikecualikan dari paket |
| H2d rampingkan field | ✅ | 
pm run build:hadith-trim: buang 
eading_url (folder 
eading/ tidak pernah ikut paket → tautan 404), source_id, source_group (diisi worker dari catalog). **Hemat 11,85 MB**; semua kitab **7,7 → 6,3 dtk**, RAM 373 → 358 MB. source_path, 
otes, rabic_images tetap (dipakai detail). Uji: 	ools/hadith-fields.test.js (4 asersi). Cadangan data asli: D:\8. PROJECT PERCEPATAN\_hadith-backup-20261108 |
| H2e buang hadits bergambar | ✅ | 198 hadits kitab-himpunan-hadits-qudsi hanya berisi gambar (tanpa teks Arab) → sumber, berkas, dan 222 aset GIF (5,1 MB) dihapus; field rabic_images kosong (1,6 MB) ikut dibuang. Data paket 172,8 → **162,0 MB**; baris 77.541 → 77.343. Uji: 	ools/hadith-fields.test.js (5 asersi). Cadangan: D:\8. PROJECT PERCEPATAN\_hadith-backup-20261108\assets |
| H2c indeks pencarian | ✅ | `npm run build:hadith-index`: indeks token→baris per sumber (`data/hadith/index/`), 9-Imam & brosur di-gzip (33,6 MB total, bukan 57,6 MB). Worker menyaring kandidat dari indeks lalu hanya menyiapkan baris yang cocok. **Kueri pertama Bukhari 900 → 216 ms** (target <300 ms tercapai), **semua kitab 6,3 dtk → 2,0 dtk**. Paritas hasil diuji (73/203/177/7/95/131/250 identik). Catatan: indeks menambah ±33,6 MB paket dan RAM "semua kitab" naik (±600 MB). Uji: `tools/hadith-index.test.js` (3 asersi) |
| H3 morfologi Arab + alias | ✅ | Awalan (`ال، وال، بال، كال، فال، لل، و، ف، ب، ك، ل`) dan akhiran (`ين، ون، ات، ها، هم، هن، كم، نا، ه، ي، ا`) diurai dari kata kueri; cocok lewat varian diberi skor **−25** agar hasil persis tetap di atas. Alias Latin diperluas (alloh, mohammad, hadits, wudhu, shodaqoh, akherat, solat, sorga). Hasil nyata pada 77.343 baris: **الصابرين 0 → 85**, الصبر 76 → **549**, **alloh 2 → 63.894** (sama dengan allah), sholat = salat = **15.085** (tidak berubah). Waktu kueri 35,7 ms per 6.978 item (dalam rentang lama). Uji: `tools/hadith-morphology.test.js` (6 asersi) |
| H3b toleransi salah ketik | ✅ | Dua lapis, keduanya **hanya aktif bila hasil persis kosong**: (1) koreksi huruf dobel (`sholaat→sholat`, `puaasa→puasa`, `niiat→niat`) yang langsung memberi hasil persis; (2) fuzzy jarak edit 1 (kata 4–6 huruf) / 2 (≥7 huruf), huruf pertama harus sama. Saran dipilih dari kata yang paling sering muncul dan bisa diklik. Angka nyata (Bukhari): `sabarr` 0 → **73** hasil (saran `sabar`), `puaasa` 0 → **203** (`puasa`), `sholaat` 0 → **1.307** (`sholat`), `niiat` 0 → **95** (`niat`). Waktu kueri normal tidak berubah (7,6 ms/6.978 item). Uji: `tools/hadith-fuzzy.test.js` (6 asersi) |
| H4a presentasi hadits (fit + gulir) | ✅ | Panel lower-third tumbuh sampai **40vh** (dari 34vh) sebelum teks mengecil; bila masih meluap pada ukuran minimum, teks **bergulir otomatis 10 px/dtk** dengan fade bawah — di OBS/vMix tidak ada yang bisa menggulir manual. Tombol **⏸/P** kini juga mengirim `{action:"scroll", paused}` ke `/api/hadith/control`; posisi berhenti di tempat dan lanjut dari titik itu. Polling presentasi menerapkan jeda tanpa memicu render ulang (`lastUpdate` tidak diubah). Uji: `tools/hadith-api.test.js` (jeda boolean, `lastUpdate` tetap) + 91/91 suite |
| H4b varian tema hadits | ⬜ | Template hadits masih 3 (Gelap, Putih, Full Screen); belum ada Midnight/Emerald/Paper |
| H4c redesain modal hadits | ✅ | Tata letak baru: rail kiri (koleksi, rujukan, mode, siaran) + kolom utama (pencarian besar, hitungan hasil, kartu hasil), panel baca sebagai overlay dari kanan. File: `css/hadith-modal.css` (baru), markup di `js/hadith.js`, tautan di `index.html`. ID & kelas yang dipakai logika dipertahankan; responsif ≤1024 px (rail jadi baris ringkas). Diverifikasi lewat tangkapan headless: hasil, mode gelap/terang, panel baca, dan layar sempit. Suite 91/91 |
| H5 perbaikan UI hadits | ✅ | (1) **Ukuran bacaan** panel kembali berfungsi: CSS memakai `--hd-text-size`/`--hd-arabic-size` dan pilihan disimpan di perangkat. (2) **Gulir otomatis diperbaiki**: loop memakai interval 100 ms (bukan `requestAnimationFrame` yang bisa berhenti di browser source), batas bawah huruf dinaikkan ke 26 px Arab / 18 px terjemahan agar teks panjang menggulir alih-alih mengecil; **tombol ⏸/▶ Jeda gulir** ditambahkan di blok Siaran modal (POST `/api/hadith/control`). (3) **Navigasi hasil**: tombol ← Sebelumnya / Berikutnya → di panel baca, indikator “Hasil n dari N”, dan panah ↑/↓ di daftar langsung membuka isi hasil. Uji: suite 91/91; gulir terbukti bergerak (48 → 88 px pada 10 px/dtk) dan tombol jeda mengirim kontrol |
| H6 tombol tutup & ukuran tayang | ✅ | Tombol tutup dipindah ke **sudut kanan-atas modal** (lingkaran 34 px, hover merah) dan area pencarian diberi ruang agar tidak bertumpuk. Ditambahkan **Ukuran tayang hadits 80–140%** di blok Siaran (A−/A+, tersimpan di perangkat) → `POST /api/hadith/control {action:"scale"}` → `fontScale` dipakai `fit()` presentasi. Bukti: huruf Arab **40 px pada 100%** dan **52 px pada 130%**. Uji API: skala 1,25 tersimpan, 2 dan 0,5 ditolak. Suite 91/91 |
| H7 navigasi panah hasil | ✅ | Panah ↑/↓ kini ditangani **sekali di level dialog** (`moveSelection`) dan tidak lagi memindahkan fokus ke panel baca; navigasi tidak memakai klik sehingga fokus tetap di kartu hasil dan panah berikutnya tetap berpindah hasil, bukan menggulir teks. Panah diabaikan saat fokus di kolom ketik/pilih; tombol ← Sebelumnya / Berikutnya memakai fungsi yang sama. Uji regresi `tools/hadith.test.js` memastikan handler tidak kembali dobel/tidak memakai `.click()`. Suite 92/92 |
| H8 tombol siaran hadits | ✅ | **Tampilkan / Terjemahan** dirancang ulang menjadi satu bar siaran bersegmen selebar panel: tombol utama hijau “⚡ Tampilkan ke Layar” (berubah merah “⏹ Turunkan dari Layar” dengan glow saat ON AIR) dan tombol sekunder “ع Terjemahan” yang menjadi biru “✓ Terjemahan Aktif”. Label tanpa emoji di JS (ikon diatur CSS), state memakai `aria-pressed`. Suite 92/92 |
| H9a transliterasi Arab→Latin | ✅ | Tanda konsonan diperbaiki: **th→t** (thaharah/thuhur, bukan s), ts→s, sh/sy→s, dh/dz→z, ch/kh→k; tanda frasa dibangun **per kata** (batas kata tidak lagi hilang), varian **tanwin** (-un/-an/-in) dan **ta marbuthah** (h↔t) untuk kueri; pencocokan sadar **kata sandang** (ال) dan batas kata untuk frasa pendek. Benchmark 9 frasa nyata pada 77.343 baris: **8/9 target di 5 teratas** (sebelumnya 3/8), dan 5/5 pada teks mandiri. Sisa: sebagian frasa yang tersisip di tengah matan panjang (mis. “shalatu jamaah”) dan noise pada potongan sangat umum. Uji: `tools/hadith.test.js` (+1 asersi) |
| H9b frasa tersisip & varian | ✅ | Kueri Latin kini membentuk **kombinasi varian** (tanwin, ta marbuthah h/t, ث ts/th) lalu dicocokkan terhadap tanda per kata, tanda tanpa kata sandang, dan tanda frasa utuh; frasa pendek wajib mulai di batas kata. **Benchmark 9 frasa pada 77.343 baris: 9/9 target di 5 teratas** (H9a: 8/9, awal: 3/8). Catatan: toleransi 1 huruf pada kata 3–4 huruf sempat dicoba dan membuat hasil melebar (17.011 hasil) sehingga dibatalkan; presisi masih perlu peringkat kata (kandidat H9c). Uji: `tools/hadith.test.js` (+2 asersi) — suite 94/94 |
| H9c indeks Latin | ✅ | Tanda konsonan per kata dihitung **saat build** dan disimpan di berkas indeks (`latin`), jadi pencarian transliterasi pertama tidak menormalkan seluruh kitab. Ditambah pencocokan **tanpa huruf “l”** (kata sandang/preposisi) untuk menutup kasus "binniyat" vs "bal-niyyat". Hasil: kueri Latin pertama **Bukhari ±1.300 ms → 296 ms**, 9-Imam 1.400 ms; paritas benchmark tetap **9/9**. Biaya: indeks 33,6 → **43,0 MB** (+9,4 MB). Uji: `tools/hadith-index.test.js` (+1 asersi) — suite 95/95 |
| H9d peringkat kata | ✅ | `df` (document frequency) per sumber disimpan di indeks (±0,4 MB tambahan) dan dipakai sebagai **bobot IDF**: frasa yang memuat kata langka mendapat skor lebih tinggi, sedangkan jalur cadangan hanya dipakai bila kueri memuat **minimal satu kata langka** (df ≤ 5% hadits) sehingga potongan umum tidak membanjiri hasil. Benchmark 8 frasa: **8/8 target di 5 teratas**; `addinu nasihah` naik dari peringkat 5 → **2**, `shalatu jamaah` **2**, `man hadatsa fi amrina` tetap **1**. Catatan: jumlah hasil untuk potongan sangat umum masih besar (mis. 1.832) karena jalur frasa tidak digerbang — kandidat berikutnya: ambang skor/BM25. Suite 95/95 |
| H10 pencarian terjemahan | ✅ | **Stemming Indonesia** (ber-/me-/di-/ter-/pe-/per-/se-/ke-, -kan/-an/-nya/-lah/-kah/-pun/-i) dan **sinonim dua arah** (puasa↔shaum↔siyam, sedekah↔shodaqoh, salat↔sholat, nabi↔rasul, surga↔sorga, neraka↔jahanam, iman↔mukmin, ilmu↔pengetahuan, dll). Skor dirombak menjadi **berbobot IDF** (df dari indeks) dengan kualitas kecocokan: kata persis 1,0; bentuk berimbuhan/sinonim 0,6–0,75; potongan huruf 0,5. Hasil uji pada 77.343 baris: **`berpuasa` = `puasa` (3.213 hasil)**, **`shodaqoh` = `sedekah` (2.084)**, `shaum` 67 → **3.212**, `menyembunyikan ilmu` 39 hasil dengan 5/5 relevan di 5 teratas. Uji: `tools/hadith.test.js` (+1 asersi) — suite 96/96 |
| H11 mode terjemahan + ambang | ✅ | Mode pencarian baru **“Terjemahan Indonesia”**: hanya mencocokkan kolom terjemahan (judul, koleksi, dan teks Arab tidak ikut), memakai stemming/sinonim yang sama. Ditambah **ambang relevansi** di worker: hasil dengan skor < 50% skor terbaik (dan < 320) dibuang bila hasil > 12, sehingga kata umum tidak membanjiri daftar. Contoh pada 77.343 baris: `iman` 15.238 → **943**, `orang yang beriman` 9.235 → **967**, `puasa` 3.213 → **2.053**; mode terjemahan `menyembunyikan ilmu` 37 hasil (23 setelah ambang), semuanya relevan. Uji: `tools/hadith.test.js` (+2 asersi) — suite 98/98 |
| H12 riwayat pencarian | ✅ | Panel **“Terakhir dicari”** di bawah kolom pencarian: maksimal 12 entri, terbaru di depan, tanpa duplikat (kueri + mode sama), tersimpan di perangkat (`localStorage`), bisa diklik untuk mengulang (mode ikut dipulihkan), dan ada tombol **Hapus**. Muncul hanya saat kolom pencarian kosong. Uji: `tools/hadith.test.js` (+1 asersi `historyAdd`) — suite 99/99 |
| H13 revisi opsi pencarian | ✅ | Label mode disesuaikan kemampuan terbaru: **“Arab · Terjemahan · Nomor”**, **“Terjemahan Indonesia”**, dan **“Transliterasi Latin”** (dulu “Latin Arab (perkiraan)”). Ditambahkan **hint dinamis** di bawah dropdown yang menjelaskan tiap mode. Opsi sumber kini **“Semua kitab (9 sumber)”** (keterangan “lebih lambat” sudah tidak akurat), urutan hasil menjadi **“Urut nomor hadits”**, dan chip topik di panel kosong kini **sadar mode** (Terjemahan untuk Niat/Puasa/Sabar/Sedekah, Arab untuk نية, Latin untuk “innamal amalu binniyat”). Uji: klik chip Latin → mode & hint berubah, kueri terisi. Suite 99/99 |
| H14 default mode terjemahan | ✅ | **Terjemahan Indonesia** kini menjadi opsi pertama dan mode default saat modal dibuka: variabel `mode` default `translation`, placeholder awal “Kata kunci terjemahan…”, dan hint awal menjelaskan mode terjemahan. Uji regresi memastikan opsi pertama tetap `translation` dan default tidak kembali ke `text`. Suite 100/100 |

Suite setelah H1: **67/67** (16 berkas).
Catatan F5: **seluruh** jalur konten (tombol utama, Next/Prev, panah ↑/↓, Muat dari hasil pencarian) hanya masuk panggung saat mode PVW; hanya **TAKE** dan **Show** yang mengudara. Handoff siaran tetap satu arah: hanya `pushToPresentation()` yang menandai PGM, sehingga chip PVW/PGM tidak bisa berbeda status dari kenyataan.

Suite setelah F5: **58/58** (14 berkas uji, +6 asersi PVW/PGM).

Rilis: **v5.4.0** — `dist/Webquran-v5.4.0-Portable.exe` (160,9 MB). EXE diuji jalan: judul `Webquran v5.4 — Operator`, badge `v5.4 PRO`, chip PVW/PGM ada, tombol Copy/CSV sidebar hilang, `data/kemenag2002.json` (1,19 MB) dan `/api/verse` merespons 200.

Rilis: **v5.5.0** — `dist/Webquran-v5.5.0-Portable.exe` (176,4 MB). EXE diuji jalan: judul jendela `Webquran v5.5 — Operator` (kini diisi dari `app.getVersion()`, begitu pula lencana Bantuan), template Mihrab, thumbnail template, layar hadits, katalog & data hadits, `/api/verse` dan `/api/hadith` merespons 200. `data/hadith/kitab-9-imam.json` (data mentah 131 MB, hanya dipakai skrip analisis) dikecualikan dari build. Suite: **100/100**.

---

## 1. What the application is, as built

A single Electron window that doubles as an HTTP server on port `34730`, so one piece of content can appear in five places:

| Channel | How it gets content | Page |
|---|---|---|
| Operator panel (laptop) | its own DOM | `index.html` (1,946 lines) |
| Second screen / projector | Electron IPC **and** HTTP polling | `presentation.html` |
| OBS Browser Source / vMix Browser Input | HTTP polling `/api/verse` | `presentation.html` |
| Hadith overlay (OBS/vMix/projector) | HTTP polling `/api/hadith` | `hadith-presentation.html` |
| vMix JSON Data Source | file written by the main process | `vmix-feed.json` |

Two independent state machines live in `main.js`: `currentVerseData` (Quran) and `currentHadithPresentation` (hadith). They are deliberately separated and the tests enforce that separation.

**Operator journey:** pick surah → pick verse(s) → preview on **STAGE** → press Show → steer the projector live. Hadith: `F7` → search → *Tayangkan Hadits* → *Terjemah* / *Sembunyikan*.

**Verdict up front:** the domain model is good, the hadith specification (`implementation.md`) is unusually rigorous, and the test discipline is real (40/40). The weaknesses are concentrated in two places: **the operator-facing control layer** (labels, keyboard, state honesty) and **what actually reaches the screen** (offline fonts, transparency mode, long-content clipping). Both are cheap to fix relative to their impact.

---

## 2. Health snapshot (measured)

| Metric | Value | Note |
|---|---|---|
| Test suite | **40 pass / 0 fail** | 15 search + 18 hadith + 1 API + 4 dual-screen + 2 fit |
| Operator markup | 1,946 lines / 101 KB, **20 external `<script src>` + 1 inline block (≈14 KB), 71 inline `onclick`, 112 ids** | no build step; scripts loaded in a hard-coded order |
| Script payload at panel load | **9.6 MiB** (`js/quran-data.js` = 8.0 MiB / 8,393,484 chars on one line) | eval **233 ms**, +45 MiB heap; with the eager double index the app reaches “search ready” **1,772 ms** after that script evaluates |
| Search cost per keystroke | **44.3 ms** at the drawer (16.5–23 ms scan + 19.3 ms highlight), **25–29 ms** in the Omnibar | both scan `searchIndex` and `translationIndex`, i.e. **12,472 `score()` calls per keypress**, on the main thread, with no cancellation |
| Hadith first search | **22.7 s** and **0.6–1.0 GB** worker RSS for one query with the default scope | see B18 — this is the single largest performance defect measured |
| `data/hadith` | **404.5 MiB** — JSON 200 MiB (`kitab-9-imam.json` 119 MiB, brosur 19.7 MiB, 7 per-book files ≈ 52 MiB), `reading/` 199.2 MiB (28,450 HTML files), assets 4.9 MiB | 73% of the shipped app |
| Hadith records | 62,198 (aggregate) + 28,742 (per-book) + 15,387 (brosur) = **106,327** | ~16.8k of the 91,138 `kitab` rows (18%) are duplicates — A3 |
| Shipped package | `app.asar` **549.2 MiB** (568.0 MB payload), portable exe **240.6 MiB** | |
| Shipped but never read at runtime | `hadits/` **114 MiB** of source CHMs · `data/1-114.json` **8.4 MiB** (build input only) · `data/custom_full_quran.json` + `kemenag2002.json` **2.6 MiB** (already embedded in `quran-data.js`) · `scratch/` **1.8 MiB** · the three `.md` docs | ≈130 MiB of the package — A12 |
| Repo weight outside the app | `tools/` **497.8 MiB / 29,630 files**, `dist/` **1.38 GB** incl. two stale portable exes, `app.js.bak` | excluded from the build (`package.json:42–43`), still in the folder |
| Templates | 5 Quran templates, **11–21 KB inline JS + 8–10 KB inline CSS each**; `lower_third.html` and `lower_third_dark.html` are **706 of 718 identical lines**; 19–36% of long lines duplicated across ≥3 files | no shared contract, five copies of the font registry |
| Fonts | **0 bundled files**; 16 families fetched from `fonts.googleapis.com`; the hadith page declares no webfont at all | |
| Layout at 1366×768 | stage **636 px** wide, **216 px** with the search drawer open; at 1024×600 → **294 px**, clipped/negative with the drawer | see U3 |
| Security | `contextIsolation: true`, `nodeIntegration: false`, **no CSP**, **no `sandbox: true`**, `Access-Control-Allow-Origin: *` on every route incl. POST | loopback-only, so a local-trust risk |
| Persistence | **no settings file**; `app.getPath('userData')` unused; prefs in `localStorage` under 4 namespaces | lost when the port changes — B15 |
| Data integrity | **catalog counts match the JSON for 10/10 sources; every `reading_url` resolves** | the pipeline is honest about what it produced — the problems are size and shape, not correctness |
| App icon | **none** — no `.ico/.png` outside `node_modules`/`dist` | the exe ships with the default Electron icon |

---

## 3. How to read this list

* **B — Broadcast correctness (P0).** Can put wrong, blank or broken content on air. Fix first.
* **U — Usability (P1).** Makes the app faster and safer to operate. Best value per hour.
* **F — Features (P2).** Remove recurring, real-world friction.
* **A — Architecture & packaging (P3).** Slows you down now; blocks you in six months.
* **D — Documentation vs reality.** One-line fixes with outsized effect on operator trust.
* **H — Repo hygiene.** The 30-minute cleanup.
* Effort: **S** ≈ half a day · **M** ≈ 1–3 days · **L** ≈ 1–2 weeks.

---

## 4. B — Broadcast correctness (fix before the next event)

### B1. On every cold start, a “Menunggu Operator” placeholder airs — and a restart replays the previous verse
**Evidence.** The server holds no verse until one is pushed (`main.js:21` `currentVerseData = null`) but starts **visible**: `main.js:25` `let currentVisibility = true;`. The wrapper expects the opposite (`presentation.html:46` `isVisible: false, // Mulai blank`). The first poll flips it (`presentation.html:182–185`) and syncs a `QURAN_UPDATE` with an empty `arabic`. Templates then render their waiting block — `templates/default.html:370–374` `<div class="waiting" id="waitingMsg"><h2>📡 Menunggu Operator...</h2>`, and `templates/lower_third.html:580–582` calls `showPanel(wrap)` even when the content branch above it did not render.
**Impact.** If OBS/vMix is already live (the normal case — the source is loaded before the operator types anything), an opaque “Menunggu Ayat/Operator” card is composited over the camera about half a second after the source loads, and stays there. After an app crash or restart, the OBS page still holds `currentState.arabic`, so a verse-less `visible:true` state re-pushes the **previous verse** to air. The operator tally is local-only (`index.html:1691`) and never reconciled from `GET /api/verse`, so the panel can read *SHOW* while the screen is blank or *blank* while the screen shows an old verse.
**Fix.** Default server visibility to `false`; return `arabic: null` for “no verse yet” and let `presentation.html` refuse to sync visibility until it has non-empty content; keep the template’s waiting state invisible until the first real payload; hydrate the tally from `GET /api/verse` on load. **Effort S–M.**

### B2. The transparent overlay never activates on the default template — OBS gets an opaque card with the editor controls on it
**Evidence.** The initial iframe is hard-coded without the flag: `presentation.html:34` `<iframe id="templateFrame" src="templates/default.html">`. The query flag is read at `:56` (`const isObs = window.location.search.includes('obs')`) but only appended on a template **change** (`:154`, `:212`, `:247`). `currentTemplate` also starts as `templates/default.html` (`:38`), so a poll reporting `template: 'default.html'` never triggers the reload either. In `templates/default.html`, transparency is opt-in: `--bg: #0f172a` (`:11`) and `body.obs-mode { --bg: transparent }` (`:34`), with `body.obs-mode .controls { … }` (`:221`) hiding the floating controls. Only `default.html` depends on this — the other templates set `--bg: transparent` directly (e.g. `templates/lower_third.html:13`). `main.js:459` builds the projector URL with no `?obs` either, and `MANUAL_OPERATOR.md:196` documents the flagless URL.
**Impact.** Out of the box — default template, every fresh install, every restart before `localStorage` has a saved template — the OBS Browser Source is a **full-frame opaque dark card with visible editor controls**, not a lower third over the camera. It becomes correct only after the operator changes template and back. The Electron projector and the OBS source are therefore not the same picture for identical state.
**Fix.** Append the overlay flag when building the initial `frame.src` (and in `main.js` for the projector when used as an overlay), normalise the template name before comparing, and document `presentation.html?obs` in the manual. **Effort S.**

### B3. “Muat” (prepare) changes what the congregation is reading — contradicts the manual and the on-screen promise
**Evidence.** `js/render.js:158–161` pushes to the projector **unconditionally**:
```js
// Auto-push to presentation window if open
if (typeof pushToPresentation === 'function') {
  pushToPresentation(allArabic, allTranslations, infoString);
}
```
`pushToPresentation` (`js/presentation.js:165–214`) publishes Arabic + translation over IPC, `localStorage` and HTTP **with no visibility flag**, and `main.js:529–535` stores and forwards it. The prepare path reaches it: `js/search.js:341–342` → `renderMultipleResults([ayah])` (with `goLive` handled only afterwards, `:359–367`), and `js/omnibar.js:470–477` for a plain `Enter`. `isPresentationVisible` defaults to `true` (`index.html:1691`), so the projector is already live.
**Impact.** During tarawih the operator loads the next verse to preview it and the verse the *jemaah* is reading is replaced — mid-recitation, no undo. This contradicts `MANUAL_OPERATOR.md:141` (“Memuat ayat … **tanpa mengubah status tayang**”) and the Omnibar footer that advertises Enter as “Tampilkan Ayat” while describing `Ctrl+Enter` as the SHOW variant (`index.html:1581–1582`).
**Fix.** Keep the stage as a buffer: `pushToPresentation` only on an explicit Live/Tampilkan action, or take a `visible`/`force` flag that `presentation.html` honours. This is also the prerequisite for a real PVW/PGM workflow (F5). **Effort M.**

### B4. Space — the documented cut-to-black — stops working, or re-fires the last button you clicked
**Evidence.** `js/app.js:41–48`:
```js
const isTextInput = tag === 'INPUT' && activeEl.type !== 'range' && activeEl.type !== 'checkbox';
if (tag === 'TEXTAREA' || tag === 'SELECT' || isTextInput || tag === 'BUTTON') return;   // ← before Space/T/arrows
```
Nothing in the codebase blurs a button after a click, so a `BUTTON` keeps focus indefinitely. Click *Template* (`index.html:133`) then press Space → the template modal re-opens instead of blanking. Focus the drawer input (`index.html:714`) → Space types a space.
**Impact.** The one panic button in the app fails exactly when the operator has been clicking controls — the normal case — and a stray Space can re-trigger a live-changing action.
**Fix.** Handle Space/`T` in the capture phase with an explicit ignore list (text inputs, textarea, select, `contenteditable`), always `preventDefault()`, and blur buttons on click. **Effort S. Best severity-per-hour item in this document.**

### B5. The on-air control is labelled with the opposite of its action, in two conventions
**Evidence.** `index.html:1703–1711` and `:1715–1722`: when the verse **is** live the button gets `tally-live` and the label **“SHOW”**; when blank it gets `tally-blank` and **“HIDE”**. Its own tooltip says the reverse (“sedang TAMPIL … Klik untuk HIDE”). `:102` reads `Terjemahan: OFF` while it can be on. And `:783–786`:
```html
<button class="cm-btn-cut" onclick="toggleVisibility()" title="Potong tampilan / Cut to Black (Spasi)">
  <span>Cut Black</span>
```
so pressing **Cut Black while already black brings the verse back up.** The hadith panel meanwhile uses *action* labels (*Tayangkan Hadits* / *Sembunyikan Hadits*).
**Impact.** Two conventions on one screen for the highest-risk control. A new operator reads “SHOW” as “press to show” and blacks out the projector mid-recitation; “Cut Black” un-blanks it.
**Fix.** Separate state from action: a non-interactive chip (`● ON AIR` red / `○ BLANK` grey) plus a verb button (`Sembunyikan` / `Tampilkan`), identical wording in header, dock and hadith panel; make Cut Black **force** hide, not toggle. Red for on-air matches every broadcast tool the operator has used. **Effort S.**

### B6. Long verses are silently clipped — and two of the five templates have no fitter at all
**Evidence.** `js/quran-text-fit.js:34–44` binary-searches a font size; on failure `best` remains at the minimum and is returned with **no `fits` flag** to the caller. Callers clamp to `Math.round(30 * scale)` (`templates/default.html:553–554`, `templates/lower_third.html:489–491`), and overflow is hidden rather than scrolled: `templates/default.html:330–342` `.content-row { overflow-y: auto; scrollbar-width: none }`, same in `templates/lower_third.html:105–116`. `quran-text-fit.js` is only referenced by `default.html:364`, `lower_third.html:330` and `lower_third_dark.html:330` — **`pip_video.html` and `lower_third_dual.html` never load it** and clip via `overflow: hidden` (`pip_video.html:44`, `:65`). Dataset maxima are ~1,218 characters of Arabic / ~1,620 of translation (QS 2:282 class).
**Impact.** The classic “big ayah” case loses the tail of the verse on air, with no scrollbar, no badge, and no operator-side signal — the operator sees the full verse on the STAGE and the congregation does not.
**Fix.** Return `{ size, fits }`; when `!fits`, shrink below the nominal minimum or switch to a long-verse layout; publish `data-overflow` so the operator panel can warn (same mechanism as B7); add the fitter to the dual and PiP templates. **Effort M.**

### B7. “Hadith too long to fit” is detected and then discarded — and the flag is inverted
**Evidence.** `js/hadith-presentation.js:58–61` computes `fits`, sets `card.dataset.overflow`, and `:113–114` returns `{ visible: hasContent && fits, fits }`. The only caller is the poll loop (`:182–202`), which ignores the return value; `card.hidden` is never driven from it; nothing in CSS or the UI reads `dataset.overflow`, and `css/hadith-presentation.css:85` `.hp-content { overflow-y: auto }` simply hides the remainder. Note the inversion: when the cue overflows at minimum size, the card **is** on air while the function reports `visible: false`.
**Impact.** `implementation.md` (Tahap 2) explicitly forbids truncation — “Teks tidak dipotong dengan ellipsis atau pembatas baris” — and `MANUAL_OPERATOR.md:307` claims the panel is hidden when it does not fit. Neither is true, so a long hadith airs clipped with zero warning. Any future consumer of the return value would also report a live cue as off-air.
**Fix.** Define `visible` once; surface the fit result in the hadith panel (“6 baris · muat” / “⚠ terpotong di Lower Third — pakai Full Screen”) and add the split-into-parts control the manual already promises (F6). **Effort M.**

### B8. Hadith Full Screen loses the riwayat line — its own enter animation overrides the centring
**Evidence.** `css/hadith-presentation.css:54` applies `animation: hpPanelEnter .36s … both`, whose final keyframe is `to { opacity: 1; transform: translateY(0) }` (`:70–72`). Full-screen centring is a base transform on the same element: `:151–158` `.hp-fullscreen .hp-lower-third { top: 50%; transform: translateY(-50%); min-height: 64vh }`. With `animation-fill-mode: both`, the retained animated `transform` overrides the centring offset, so the panel top sits at 50 % of the viewport and its ≥64 vh body runs past the bottom edge (≈150 px lost at 1080p) — which is exactly where `.hp-reference` (the riwayat row) lives.
**Impact.** Selecting Full Screen — the recommended mode for projector use (`MANUAL_OPERATOR.md:179–181`) — silently drops the source/reference line, i.e. the attribution. The spec forbids this (“Riwayat … Riwayat mengikuti lower third pada kedua mode”, `implementation.md:13`).
**Fix.** Animate an inner element, or include the `-50%` offset in the fullscreen keyframes, or centre with flex and animate only opacity/translate. **Effort S.**

### B9. Arabic renders in a fallback font whenever there is no internet
**Evidence.** `index.html:10` and every template (`templates/default.html:8`, `lower_third.html:9`, `lower_third_dark.html:9`, `lower_third_dual.html:9`, `pip_video.html:8`) load from `fonts.googleapis.com`, render-blocking in `<head>`; `js/font.js:6–27` defines 16 families, all CDN URLs, duplicated again inside each template. The repository contains **no font files**, yet `main.js:64–65` already serves `woff`/`woff2` MIME types — local fonts were intended and never shipped. The hadith page declares no webfont at all (`css/hadith-presentation.css:91` falls back to `'Traditional Arabic'`). The help text claims “Keandalan 100% Offline” (`index.html:1233`).
**Impact.** On an offline or firewalled laptop the Quran is drawn in a system Arabic fallback: harakat in the wrong place, wrong line breaks, wrong metrics — and `quran-text-fit.js` measures those wrong metrics, so the fit decision is wrong too. Studio-approved templates do not look the same in the field, the Quran and hadith screens use different Arabic stacks, and on a non-Windows OBS host the fallback may not exist at all.
**Fix.** Bundle 3–4 WOFF2 subsets (Amiri, Amiri Quran, Noto Naskh, one Latin) in `assets/fonts/`, declare local `@font-face` with `font-display: block`, one shared registry for both presentation pages, CDN only as a secondary source; re-measure fit on `document.fonts.ready` (already wired in `js/quran-text-fit.js:59–60`). **Effort S** for the core families, **M** for all 16.

### B10. Changing template mid-broadcast reloads the frame (blank flash + late font reflow)
**Evidence.** `presentation.html:154`, `:212`, `:247` assign `frame.src = newFile + (isObs ? '?obs' : '')`, replacing the iframe document, which re-requests Google Fonts and re-runs 11–21 KB of inline script before the first correct frame.
**Impact.** A visible white/blank flash on the projector, then Arabic reflowing a second later. The hadith renderer already does this properly — fade only the text, keep the plate stable (`js/hadith-presentation.js:145–156`).
**Fix.** Preload all five templates into hidden containers and toggle, or move to one document that swaps a CSS class plus slot content (copy the hadith approach). Never reassign `frame.src` while visible. **Effort M.**

### B11. Nothing tells the operator the local server has stopped
**Evidence.** The footer “Ready” is static markup — `index.html:814` `<span style="font-weight:600;">Ready</span>` with no updater. `presentation.html:233` is `catch (e) { }`. `js/hadith-presentation.js:194–199` keeps the last frame and only `console.warn`s (right for on air, invisible to the operator).
**Impact.** If the server dies, the overlay freezes on the last verse and every indicator still says fine. The operator keeps pressing Next with no effect and no diagnosis. `MANUAL_OPERATOR.md:49` documents a “Status Server Ready” indicator that does not exist.
**Fix.** `/api/ping` heartbeat + a red header banner on failure + a “PGM: frame terakhir” badge on the Program Feed + a copyable log drawer (A10). **Effort M.**

### B12. vMix feedback is wired to DOM nodes that do not exist — and the buttons do something else entirely
**Evidence, part 1.** `index.html:1903–1904` and `:1928–1929`:
```js
const led = document.getElementById('vmixLed');
const txt = document.getElementById('vmixStatusText');
if (led && txt) { … }
```
Neither id exists anywhere in the document — the footer only has `#vmixIndicator` with `.vmix-dot` / `.vmix-label` (`index.html:818–821`). The block never runs, so `lastVmixPath` is never set, so `copyVmixPath()` (`:1883–1899`) toasts **“⚠️ Belum ada file tersimpan. Pilih ayat dulu!”** after a *successful* save.
**Evidence, part 2.** `index.html:373` (`title="Kirim data ayat aktif ke vMix JSON"`) and `:590` (`title="… ke vMix Feed JSON"`) call `sendToVmix()` (`js/vmix.js:9–55`), which does **not** write the JSON feed (the main process does that automatically, `main.js:70–102`). It GETs `http://localhost:8088/api?Function=SetText&Input=Quran&SelectedName=ARAB&Value=…` through a hidden iframe, with port, input name and three field names hardcoded, and always ends with `showToast("✅ Sukses! Teks vMix Berubah.")` — an iframe GET never surfaces failure to the parent.
**Impact.** Two buttons labelled “vMix JSON” that (a) do not do that, (b) cannot report failure, (c) need an undocumented vMix setup at a fixed port with a title input literally named “Quran”. Meanwhile the real indicator never lights up, and the copy-path helper reports failure after success.
**Fix.** Point the handlers at `#vmixIndicator` and take the path from the event payload; delete `sendToVmix()` and its two buttons, or promote it to a real integration (configurable host/port/input/field map, reachability check, honest errors) and document it. **Effort S** to delete, **M** to make it real.

### B13. A mistyped template name can put the server’s 404 page on air
**Evidence.** `main.js:287–292` accepts any template string from `POST /api/verse` without an allow-list (contrast the hadith endpoint, which validates at `main.js:167`), and `presentation.html:209` concatenates it: `'templates/' + data.template`. A nonexistent file renders the server’s plain-text `404 Not Found` inside the on-air iframe.
**Impact.** Any stale `localStorage` value, hand-crafted POST, or future UI entry can put a 404 on the projector. It also makes the three separate template registries (modal cards, `js/confidenceMonitor.js:7–19`, template files) drift silently.
**Fix.** Allow-list in `main.js` (it already has the list for hadith), and one shared registry consumed by the modal and the monitor. **Effort S.**

### B14. “vMix on another PC over LAN” is documented but impossible in the shipped build
**Evidence.** `MANUAL_OPERATOR.md:217` and `implementation.md:207` tell operators to open `http://192.168.1.20:34730/hadith-presentation.html` from another computer; `main.js:376` binds loopback only: `server.listen(port, '127.0.0.1', …)`.
**Impact.** The most-wanted broadcast topology — Webquran on the presentation laptop, vMix/OBS on a streaming PC — cannot work; the support path becomes “open DevTools”, which the manual never mentions.
**Fix.** Bind `0.0.0.0` behind an explicit setting (“Izinkan akses jaringan lokal”, default off), print the LAN URL in the existing “Setup OBS & vMix” modal (`index.html:1077+`) and the console, with the Windows Firewall hint beside it. **Effort S.**

### B15. Two instances can run at once and silently take over / lose settings
**Evidence.** No `app.requestSingleInstanceLock()` anywhere in `main.js`; the port fallback is `resolve(startLocalServer(port + 1))` at `main.js:383–389`. All preferences are `localStorage`, i.e. scoped to `http://localhost:34730` (`js/theme.js:11`, `js/modal.js:115,160,174`, `js/confidenceMonitor.js:134,152,160`, `js/bookmark.js:8`, `js/search.js:16`, `js/hadith.js:96`); `main.js` never writes a settings file.
**Impact.** The operator double-clicks the portable exe (the only launch affordance). The second instance comes up on `34731`, OBS/vMix still point at `34730` served by the *first* instance, and the new window looks like total data loss because bookmarks, template and theme are origin-scoped.
**Fix.** `requestSingleInstanceLock()` → focus the existing window; never hop ports silently (fail with a clear message and a retry); move preferences to `userData`/`PORTABLE_EXECUTABLE_DIR` through preload so they survive any port. **Effort S** for the lock, **M** for durable settings.

### B16. Tallies flip optimistically, with no acknowledgement from the other side
**Evidence.** `toggleVisibility()` mutates `isPresentationVisible` **then** fires IPC (`index.html:1782–1793`); every fallback is `catch (() => {})` (`index.html:1800, 1825`; `js/presentation.js:26, 41, 199, 240`); `searchAyah` fails silently (`js/navigation.js:174`); `loadSearchResultToStage` only `console.error`s (`js/search.js:373–376`); `saveBookmarks` has no `try/catch` (`js/bookmark.js:12`) so a quota failure still toasts success.
**Impact.** The panel can claim **ON AIR** while OBS shows nothing — the single most consequential wrong state in the app.
**Fix.** Make broadcast state authoritative from the main process (`ipcRenderer.invoke` returning the applied state), render an “unconfirmed” tally when it does not answer, stop swallowing errors (A10). **Effort M.**

### B17. `POST /api/verse` is not atomic, and there are up to five polling loops per page
**Evidence.** `main.js:263–271` mutates `currentVerseData` **before** the `isVisible` type check at `:293–294` throws — a rejected request leaves content applied but visibility unchanged (the hadith endpoint validates first). Body reads are unbounded (`main.js:257–262` `req.on('data', chunk => { body += chunk })`). On the client, the wrapper polls at 500 ms (`presentation.html:292–298`) while four templates run their own `fallbackPoll` at 1 s (`templates/lower_third.html:634`, `lower_third_dual.html:477`, `pip_video.html:478`, `default.html:806–808`), and `presentation.html:298` calls `pollVerseAPI()` even when embedded.
**Impact.** Half-applied state on air, ~2 req/s per source and ~10 req/s with OBS + vMix + monitor + projector on one laptop, and hide latency of up to 500 ms plus the template’s exit animation (0.18 s hadith, 0.45 s lower third, up to 2.7 s in `lower_third_dual.html:391–399`) — a visible lag between pressing Hide and the screen clearing.
**Fix.** Validate fully before mutating; cap the body; collapse to a single polling loop in the wrapper (or move to SSE / a versioned `/api/state`), remove the per-template fallback pollers. **Effort M.**

### B18. The default hadith scope costs 22.7 seconds and up to 1 GB of RAM for the first query
**Evidence.** `js/hadith.js:138–139` selects **every** book by default:
```js
$('source').innerHTML = (sources.length > 1 ? '<option value="">Semua kitab</option>' : '') + …
if (group === 'kitab' && sources.length > 1) $('source').value = '';
```
Measured across the nine `kitab` sources: **91,138 entries / 171 MiB → `JSON.parse` 2,975 ms + prepare+score 19,749 ms = 22.7 s** for a single `"ilmu"` query, at **0.6–1.0 GB** worker RSS. The largest file alone (`kitab-9-imam.json`, 119 MiB, 62,198 entries) costs 768 ms to parse and **+394.6 MB RSS** (~3.2× file size). `js/hadith-worker.js:4–5, 30–31` keeps every parsed source in a `loaded` Map forever and retains per-row prepared text (`:110`) — measured **15.2 KB/row** for Bukhari, 4.4 KB/row for 9-Imam. `data/hadith/README.md:3` claims the first search uses “Shahih Bukhari”; the code contradicts it (see D13).
**Impact.** This is the first thing a new operator tries, it takes half a minute, and it happens on the same 4–8 GB laptop that is simultaneously running OBS/vMix and a 1920×1080 browser source. On a low-end machine the 3–6× slowdown factor makes it worse than a minute, and the memory spike is a plausible mid-service crash. It is also pure waste: 18% of those rows are duplicates (A3).
**Fix.** Default the picker to one small book (**S**, one line, immediate 20× improvement); then pre-build a token index at build time and fetch full records on demand for the selected result; LRU-evict sources instead of caching everything (**L**). **Effort S** for the default, **L** for the index.

---

## 5. U — Usability: make it faster and safer to operate

### U1. `F2` — the documented “focus surah” shortcut — blanks the field and creates a silent dead end
**Evidence.** `js/app.js:16` → `switchTab('nav')` → `surahInput.focus()` → inline `onfocus="surahFocus(this)"` (`index.html:318`), which runs `el.value = ''; el.placeholder = _prevSurahValue || 'Ketik nama surat...'` (`js/navigation.js:29–35`). `searchAyah` then does `parseInt(...)` and returns **before** any feedback: `if (!sId || !aNo) return;` (`js/navigation.js:174`).
**Impact.** The grey “2. Al-Baqarah” looks like a value. The operator clicks TAMPILKAN AYAT and nothing happens — no toast, no error, and the arrow keys stop working too. Dead air while they debug.
**Fix.** Select-all on focus instead of clearing; never park the value in `placeholder`; toast and red-border the field when the surah cannot be parsed. **Effort S.**

### U2. Escape closes the wrong thing, and one modal cannot be closed at all
**Evidence.** `js/app.js:21` closes only Help; `js/omnibar.js:670` only from inside its own input; `js/search.js:392–404` decides “is another modal open” with `classList.contains('active')` while `js/modal.js:6, 137` open with class **`show`** (always false) — so Esc closes the search drawer *underneath* an open modal. `js/modal.js:57` unconditionally restores `body.overflow`, leaving a scrollable page behind a still-open modal. The template modal has no Esc path at all.
**Impact.** Mid-service, Esc meant to dismiss the template picker kills the search panel instead and unlocks the background.
**Fix.** One modal stack, one Esc handler that pops the topmost, one `isAnyModalOpen()`, overflow restored only when the stack empties. **Effort S.**

### U3. The window does not fit the laptops this runs on
**Evidence.** `main.js:395–400`: `width: 1400, height: 900, minWidth: 1000, minHeight: 650` — taller than a 1366×768 usable area. CSS: `css/styles.css:317` `.container { grid-template-columns: 350px 1fr }`, `:1444–1445` `.confidence-monitor-panel { width: 380px; min-width: 380px }`, `:4105` drawer `420px`. Breakpoints exist only at ≤480/520/600/768/820 — nothing between 1024 and 1440.

| Viewport | Stage width (monitor on) | With search drawer |
|---|---|---|
| 1920×1080 | 1,190 px | 770 px |
| **1366×768** | **636 px** | **216 px** |
| **1024×600** | **294 px** | clipped / negative |

The header is a non-wrapping flex row of 11 buttons (`css/styles.css:61–72`), so at 1024 the Help and theme buttons clip off-screen — making the only onboarding surface unreachable by mouse.
**Impact.** On the exact laptop this app targets, the Arabic stage is narrower than the side panels, and the footer (including the text-size slider) sits under the taskbar.
**Fix.** Size from `screen.getPrimaryDisplay().workAreaSize`; add `@media (max-width: 1440px)` → drawer mode by default and an inset/floating monitor; icon-only header labels below 1280 px; `clamp()` the sidebar; min height 640. **Effort M.**

### U4. Every launch begins with a focus-stealing dialog and two or three colliding toasts
**Evidence.** `js/modal.js:81–88` re-opens Help on **every** start unless `quranBroadcast_hideHelpModal` is set — and that is written only when the checkbox at the bottom of a scrollable modal is ticked (`index.html:1247`). `js/modal.js:172–181` re-applies the saved template 500 ms in via `selectTemplate()`, which fires “✅ Template diubah ke …” (`:167`) — a false “something changed” signal on every launch. `js/fileSystem.js:47` adds “Data Qur'an berhasil dimuat!”. `showToast` is single-slot (`js/utils.js:55–86`), so they overwrite each other, and `js/modal.js:11–14` focuses the close button, swallowing the first keystrokes.
**Impact.** The first two seconds of every session are a dialog plus competing notifications — which trains the operator to ignore the very channel used for real failures.
**Fix.** Onboard once per app version, non-modal; restore state silently; drop the redundant toasts; queue instead of overwrite. **Effort S.**

### U5. The in-app help — the only onboarding — documents shortcuts that do not exist
**Evidence.** `index.html:1021–1072` promises `Page Down`/`Page Up`, `Home`/`End`, `/` or `Ctrl+F`, `F9`, `F11`, `+`/`−`, `0`. A whole-tree search finds **no handler** for `Home`, `End`, `PageUp`, `PageDown`, `F9`, `F11`, `+`, `−` or `0`. `/` opens the Omnibar (`js/omnibar.js:718–725`); `Ctrl+F` is unbound. Conversely the bindings that *do* work — `Ctrl+↑`/`Ctrl+↓`/`Ctrl+1` (`js/app.js:24–38`) — appear in neither the modal nor `MANUAL_OPERATOR.md`. `toggleFullscreen()` (`js/fullscreen.js:5–28`) is never called and reads an undeclared `isFullscreen`, so it would throw `ReferenceError` if wired.
**Impact.** Under pressure the operator reaches for Home/End and gets nothing. Wrong muscle memory is worse than no documentation.
**Fix.** Implement or delete each row; document `Ctrl+↑/↓/1`; give `F9` something useful (e.g. the pre-flight check, U6); delete or fix `fullscreen.js`. **Effort S.**

### U6. No pre-flight check and no guided first run
**Evidence.** Nothing verifies the things that actually break on site: fonts (B9), server reachability (B11), overlay mode (B2), LAN access (B14), a second display — `main.js:470–474` silently falls back to the primary display, so with one screen the projector window opens **on top of the operator panel**, which reads as a crash — and the vMix feed path being writable (`main.js:70–102`).
**Impact.** Every new operator needs a phone call; every new venue needs a technician.
**Fix.** A “Pemeriksaan Siaran” panel with green/red rows (fonts · server · overlay mode · display count · vMix feed writable · hadith data readable), a 3-step wizard (translation → surah/ayah → show), and an explicit warning before opening the projector on the only display. **Effort M.**

### U7. Two different “text size” concepts, adjacent and confusable
**Evidence.** The footer slider drives the broadcast size (`js/app.js:24–38`); the hadith `A−/A+` only changes the operator’s reading pane, forcing a whole manual paragraph to explain that the SHOW slider does not affect the hadith layer (`MANUAL_OPERATOR.md:162`).
**Impact.** Operators change the wrong control and see no broadcast effect, or grow their reading text expecting the projector to grow.
**Fix.** “Ukuran Tayang” (broadcast, live percentage echoed on the Program Feed) versus “Ukuran Baca” (local only), visually separated. **Effort S.**

### U8. Destructive and live-changing actions have no undo, and one confirm blocks the renderer
**Evidence.** `clearBookmarks` uses native `confirm()` (`js/bookmark.js:111–116`), which blocks the renderer during a show; `clearHistory` has **no** confirmation (`js/render.js:123–127`); per-item delete is a 22×22 px target with no confirm (`js/bookmark.js:85`, `css/styles.css:1023–1032`); every template card is one large click target that applies to live output and closes the modal instantly (`index.html:1292, 1337, 1390, 1443, 1499` → `js/modal.js:151–169`).
**Impact.** One stray click changes the layout the congregation sees; deletions are unrecoverable; `window.confirm` freezes the UI at the worst moment.
**Fix.** Undo-toast (`Template diubah · Batalkan`, 6 s) for reversible actions; in-app confirmation dialogs (never `window.confirm`); larger delete targets. **Effort S.**

### U9. A failed surah/ayah search leaves the stage disagreeing with the projector
**Evidence.** `js/navigation.js:185–194` replaces `#resultArea` with an error box, does **not** push to air and does not update the breadcrumb. Because `dataset.arabic/trans/info` live on the element (`js/render.js:154–156`), `copyGlobal()` and `exportToCSV()` (`js/utils.js:99–120`) then copy the **previous** verse.
**Impact.** The operator’s program monitor no longer reflects what is on air, and Copy silently yields stale text — dangerous when that text goes into a livestream caption.
**Fix.** Keep the last good stage, show the error as a banner, mark the tally “on air: ayat sebelumnya”. **Effort S.**

### U10. Keyboard users lose their place, and divs pretend to be buttons
**Evidence.** `css/styles.css:42–47` applies `* { outline: none }` globally, with only four `:focus-visible` rules (`:2002, 4281, 5156–5158`) — header, sidebar, dock and breadcrumb get no focus ring. Click-only `<div onclick>` with no `role`/`tabindex`: `index.html:741`, `:1292+` (template cards), `js/bookmark.js:79`, `js/render.js:101`, `js/navigation.js:23`. `aria-pressed` in markup: **0**. `#themeToggle` (`index.html:145–160`) is icon-only with no `aria-label`; the monitor `<iframe>` (`index.html:771`) has no `title`. Hit targets: 20×20 zoom steppers (`css/styles.css:3009–3017`), 22×22 delete (`1023–1032`), 24 px Cut Black (`1650–1657`), 28 px drawer tools (`4174–4181`), 36 px header buttons (`142–144`).
**Impact.** This is a keyboard-driven broadcast app; an invisible focus ring on the dock is a functional defect, not a compliance checkbox.
**Fix.** Remove the global outline reset, add `:focus-visible` per interactive class, `role="button" tabindex="0"` + Enter/Space on the cards, `aria-pressed` on every toggle, `title` on the iframe, ≥32 px targets. **Effort M.**

### U11. `innerHTML` with data, and a JS-escaping bug that silently kills the Copy button
**Evidence.** `js/render.js:246` and `:255` insert `${data.arabic}` / `${finalTranslation}` raw; the templates do the same (`templates/default.html:504` and `:540` `trTextEl.innerHTML = cleanTr`, `pip_video.html:399–417`, `lower_third.html:439`). Only `lower_third_dual.html:419–425` uses `innerText`. Copy buttons embed payloads through `escapeJs` (`js/utils.js:88–90`), which escapes `'` and `"` but **not** `\`, inside a single-quoted JS string in a double-quoted attribute (`js/render.js:268, 303`) — one backslash in a custom translation produces a `SyntaxError` and a dead Copy button. `customTranslations` come from an arbitrary JSON file (`js/utils.js:203–226`). The Omnibar echoes the raw query and raw item titles (`js/omnibar.js:522, 542, 603–604`) while `js/search.js:384–387` has a proper `escapeHtml` that is not used there.
**Impact.** Built-in data is clean today, so this is latent for shipped content but live for imported/custom translations: a stray `<` breaks the overlay layout, a `\` breaks Copy, and typed markup renders in the Omnibar.
**Fix.** `textContent`/node building (build the intentional waqaf spans with `createElement`), `escapeHtml` everywhere, `data-` attributes instead of inline `onclick` payloads. **Effort M.**

### U12. The hidden Program Feed keeps polling, and the stage re-renders from scratch on every keypress
**Evidence.** `js/confidenceMonitor.js:140–165` plus `css/styles.css:1463–1466` hide the panel with `width: 0 !important; opacity: 0 !important` — **not** `display: none` — so the iframe stays mounted while `presentation.html:294` polls `/api/verse` every 500 ms and re-renders a 1920×1080 page. `js/render.js:260` rebuilds all of `#resultArea` per navigation (scroll position lost in a 10-ayah view); `js/navigation.js:198` adds an artificial 50 ms per keypress; `js/app.js:14` has no `e.repeat` guard, so holding → floods IPC.
**Impact.** On a low-power laptop the panel lags behind the qari, and CPU is spent rendering an invisible copy of the output.
**Fix.** `display: none` (or unmount) when hidden; drive the monitor by IPC instead of polling; patch the stage instead of replacing it; drop the 50 ms; guard `e.repeat`. **Effort S–M.**

### U13. The theme control is inert in three of five templates, and the on-screen size buttons snap back
**Evidence.** `templates/default.html:635–658` forwards arabic/translation/info/isVisible/isTransVisible but never `theme`; the only theme inputs are guarded by `isElectron && !isIframe` (`:580`) or poll-only (`:696`), both unreachable inside `presentation.html`’s iframe. `templates/lower_third.html:469` accepts `theme` and never uses it (identical in `lower_third_dark.html:469`). Only `pip_video.html:375–377` and `lower_third_dual.html:374` apply it. The same staleness hits the on-screen `A+/A−` buttons: `templates/default.html:642–651` accepts `FONT_SIZE_UPDATE`, but `presentation.html:172–175` re-sends the server value on the next 500 ms poll, so a manual size change snaps back.
**Impact.** The Tema button and the on-screen size controls silently do nothing on the live path — the operator changes them, sees no effect, and concludes the whole panel is unreliable.
**Fix.** Handle `theme` in every `QURAN_UPDATE` branch and send it on visibility changes; either remove the local size buttons or give them the same cooldown the template already applies to `localStorage`. **Effort S.**

### U14. At 4K the Arabic is half the relative size — the opposite of what the manual promises
**Evidence.** `templates/default.html:471–474` computes `const scale = currentFontSize/100; const baseAr = Math.round(64*scale)` in fixed pixels and the fitter caps at that value, overriding the CSS `clamp(40px, 5.5vw, 80px)` (`:152`); same pattern at `templates/lower_third.html:489–491`. At 3840×2160 the Arabic stays ≤64 px — half the relative size it has at 1080p — while `MANUAL_OPERATOR.md:201` recommends `3840 x 2160`. The hadith layer does this correctly (`js/hadith-presentation.js:29` `Math.min(innerWidth/1920, innerHeight/1080)`); the Quran layer has no equivalent. Fixed 1920×1080 is also baked into `js/confidenceMonitor.js:36–39`.
**Impact.** 4K OBS sources render at half proportion; 4:3, ultrawide and vertical projectors get a lower third designed for 16:9.
**Fix.** Feed the same `min(w/1920, h/1080)` factor into the Quran templates and the fitter floor, or express bases in `vw`/`vh` with px only as a floor. **Effort S–M.**

### U15. The in-app help advertises functions the templates no longer have; the hadith preview path is dead
**Evidence.** `js/hadith-presentation.js:8–15` looks for a `#hadith-template` element that **exists in no page** (grep: referenced only at that line), so the entire `?preview=arabic|translation|long|image` path (`:166–178`) never runs — and `scratch/hadith-fit-preview.html` is the only thing that references it. `templates/hadith-default.html` is a copy of `hadith-presentation.html` differing only in relative paths and title, so the two entry points are the same content. `implementation.md` Tahap 5 specifies `templates/hadith-default.html` as the template with lower-third/full-screen as CSS classes; the code implements the classes in the root page instead.
**Impact.** A documented preview feature does nothing, two URLs for one page diverge untested, and the spec no longer describes the code (see D). Separately, the spec’s hadith waiting state (“Tampilan tunggu muncul jika belum ada hadits aktif”, `implementation.md:129`) is not implemented — `js/hadith-presentation.js:84–86` simply sets `card.hidden = true`, leaving a fully transparent frame that looks identical to a failed load.
**Fix.** Delete the dead branch and the duplicate page (or make one the single entry), implement the waiting state, then update the spec. **Effort S.**

### U16. Indonesian is hardcoded across three layers and mixed with English on the same screen
**Evidence.** Strings live in markup (`index.html:45` “BROADCAST OPERATOR”, `117` “Dual Screen”, `129` “Program Feed”, `349` “TAMPILKAN AYAT”), in JS literals (`js/navigation.js:135`, `js/render.js:126`, `js/search.js:364`, `js/utils.js:101`) and in `title` attributes. One screen mixes `SHOW / Prev / Next / TR: OFF / Cut Black / PGM • ON AIR / Split / Ready / Copy / Bookmark` with `Terjemahan / Riwayat / Bantuan / Ayat Tidak Ditemukan`.
**Impact.** No seam for translation, and the mixed language itself slows a first-time operator (the audience is Indonesian; the broadcast jargon is English).
**Fix.** `data-i18n` keys + one dictionary now (populate `id` only), and settle on Indonesian for operator-facing labels while keeping broadcast state in English (`ON AIR`). **Effort M.**

### U17. Arabic marks and bidi are handled differently in each template
**Evidence.** `lang="ar"` appears **0** times in `index.html`; the templates set RTL only via CSS `direction: rtl` (`templates/default.html:145`, `lower_third.html:163`) while the hadith page correctly declares `lang="ar" dir="rtl"` (`hadith-presentation.html:13`). Waqaf/tajweed marks are styled `display: inline-block; margin: 0 5px` (`lower_third.html:172–182`), which detaches them from their base letter and adds spacing, **removed entirely** in `lower_third_dual.html:417` (U+06D6–06DC/06E9/06DF), left raw elsewhere. `font-feature-settings: "kern","mark","mkmk"` is set only in `default`/`lower_third` (`:157–158`, `:168`). Multi-verse Arabic is one concatenated string with RLM-wrapped markers (`js/render.js:137–139`), so per-verse `text-align` differences change line breaking per template.
**Impact.** Qur’anic marks are visually wrong in two templates and can become tofu boxes if Amiri fails to load (B9); screen readers read the Qur’an with an Indonesian voice; copied text loses direction.
**Fix.** `lang="ar"` + `unicode-bidi: isolate` on Arabic containers, `<bdi>` for mixed runs, never reflow marks into inline-block boxes, one canonical Arabic string per state with styling applied via CSS, standardise `text-align`. **Effort M.**

### U18. Navigation stops at “surah + ayah”
**Evidence.** No juz/page handling in `js/navigation.js` or `js/omnibar.js` (the only mention of juz is a marketing sentence, `index.html:1234`). The Omnibar supports `surah ayah`, `surah a-b`, `show/hide`, `tr on/off` (`js/omnibar.js:205–249`).
**Impact.** Operators think in juz during tadarus and khataman, and need “next surah” when a reciter finishes early. Both require manual re-entry today.
**Fix.** Add `juz 30`, `juz 30:5`, `hal 604`, `next surah` / `prev surah` to the Omnibar; expose the already-working cross-surah arrow behaviour (`MANUAL_OPERATOR.md:79`) as a visible dock control. **Effort M.**

### U19. Quran search rescans the whole corpus on the main thread for every keystroke
**Evidence.** There is no inverted index anywhere. `js/search.js:240` (drawer) and `js/omnibar.js:362–367` (which scans `searchIndex` **and** `translationIndex` — the same array, so **12,472 `score()` calls per keystroke**). Measured: `performTranslationSearch('allah')` **44.3 ms** (16.5–23 ms scan + 19.3 ms highlighting 60 result cards); the Omnibar costs **25.5–28.6 ms** even for `'2:183'` or `'yasin'`, and it runs the full-text scan even when a deterministic `S:V` or surah-name match already resolved. Only debouncing guards it — 120 ms (`js/search.js:193, 213`), 60 ms (`js/omnibar.js:664`) — with no throttle and no `AbortController` (the hadith path has request tokens; the Quran path has none, so superseded queries still finish).
**Impact.** Typing stutters on the class of laptop this app targets, every keystroke re-highlights 60 cards, and switching translation version re-prepares all 6,236 verses (~300 ms freeze, `js/utils.js:144–170` → `refreshSearchResults`).
**Fix.** Build a compact inverted index at build time (token → posting lists fits in well under 1 MB), skip the full scan when a deterministic pattern already matched, and cancel superseded searches. **Effort M.**

---

## 6. F — Features that remove repeated, real friction

Ordered by how often an operator would use them, not by novelty.

| # | Feature | Why it matters here | Effort |
|---|---|---|---|
| **F1** | **Rundown / “Susunan Tayang”** — ordered list of verses + hadith, next/prev cue | Every kajian and khutbah is a prepared sequence; today the operator re-searches between cues while the audience waits. Biggest workflow win available. | L |
| **F2** | **Standby screen** — logo, event name, “Shalat Isya — 19:30”, countdown | A mosque screen is on for 20 minutes before the lecture showing *something*; today the options are the last verse or a blank. Reuses the existing template slot system. | M |
| **F3** | **Prayer-time / adzan overlay, offline** — computed locally from lat/long + method | Natural companion to F2 for the same audience, no internet needed. | M |
| **F4** | **Phone remote via QR** — panel prints a QR to `http://<lan>:34730/remote.html`; phone gets Next / Show / Hide / Terjemah | The person who presses Next usually stands 15 m away. Depends on B14 plus a token (A7). | M |
| **F5** | **PVW / PGM** — prepare the next cue privately, then Take | The Program Feed iframe already exists; a preview path is the standard broadcast mental model and removes “did that go live?” anxiety. Blocked on B3. | M |
| **F6** | **Cue safety report** — “fits in Full Screen, clipped in Lower Third” + one-click split | Closes B6 and B7 and prevents the most embarrassing failure: a truncated quote attributed to the Prophet ﷺ. | M |
| **F7** | **Share card export** — 1080×1080 PNG of the current verse for WhatsApp/IG; `.txt` of the whole rundown | Turns the app into a tool for the whole event, not just the screen. `render.js` already assembles the strings. | S–M |
| **F8** | **Hadith ↔ Quran cross-links** — “ayat terkait” from a hadith and vice versa | Both corpora are already local; an offline-built mapping table adds a lot of study value. | L |
| **F9** | **Search upgrades** — real relevance, Arabic Quran search, typo tolerance, Indonesian morphology | Four measured gaps: **(a)** no Arabic search in the Quran at all — `'صبر'` and `'الصابرين'` return **0** hits while the hadith engine already normalises Arabic (`js/hadith-engine.js:7–14`); **(b)** the stemmer strips one prefix from a static list, so `menuntut→"untut"`, `menulis→"ulis"`, `menyucikan→"yucikan"` (measured recall: `pukul→memukul` 0 %, `suci→menyucikan` 20 %, `tulis→menulis` 40 %); **(c)** the alias table has 7 pairs, so `alloh` → **0** vs `allah` → 2,165, `akherat` → 0 vs `akhirat` → 147, and the hadith list omits `solat`/`rizqi` (same query: 93 / 111 Quran hits, **0** hadith hits); **(d)** no stopwords — `dan` → 3,183 hits (51 % of the corpus) → 54 “show more” clicks at 60/page, and ranking is match-class only with no TF-IDF/BM25. | M |
| **F10** | **Profiles / deploy kit** — export-import a settings bundle | So 20 mosques can be provisioned identically; pairs with B15. | S |
| **F11** | **Two translations side-by-side** (Arabic + ID + EN) | Growing demand for bilingual livestreams; `lower_third_dual.html` is 80% there. | M |
| **F12** | **“Laporkan masalah” log bundle** | With B11, turns support calls into copy-paste diagnosis. | S |
| **F13** | **Template variants as tokens, not forks** — Arabic-only, translation-only, both-visible, 4:3 and vertical, one light/dark switch | All five templates currently require `arabic && translation` (`templates/default.html:482`, `lower_third.html:494`, `pip_video.html:398`, `lower_third_dual.html:405`), so “Arabic only” and “terjemahan only” are impossible without hand-editing HTML, and 4:3/vertical rooms get a 16:9 design. | M (after A8) |

---

## 7. A — Architecture & packaging

### A1. No build step; everything is a global
20 `<script src>` tags in a fixed order (`index.html:1590+`), every function on `window`, 71 inline `onclick`, and one ~14 KB inline block that still holds the tally, OBS-URL and modal logic. There is no module boundary, so “who sets `isPresentationVisible`?” cannot be answered statically — which is exactly why B16 exists.
**Fix.** ESM `<script type="module">` with four modules — `state`, `broadcast`, `ui`, `data` — and one state object with subscribers. No framework required; Vite would add bundling and tree-shaking. **Effort M–L.**

### A2. 8 MiB of Quran data evaluated at boot, then indexed twice before first paint
**Measured startup cost.** `index.html:1591` loads the corpus as a plain, non-deferred script: **eval 233 ms, +45 MiB heap**. Then `js/fileSystem.js:18–44` eagerly builds `latinSearch` for all 6,236 verses and `ensureTranslationSearchIndex()` prepares another 6,236 — **367 ms + 297 ms = 664 ms, +52 MiB RSS**. Through the app’s own path the panel takes **1,772 ms from script eval to `searchDataReady`**, and every template iframe that needs the data pays the parse again.
**Measured dead weight.** Roughly **27 % of the `surahs` block is unused**: `kitabah` is byte-identical to `arabic` for 6,141 of 6,236 verses (733,832 chars), the per-verse `surah` object is repeated 6,236× (945,635 chars, 114 unique), and `arabic_words`/`footnotes`/`updated_at` appear nowhere in `js/`. A further 2.6 MiB of `kemenag_lama`/`kemenag_2002` is embedded *in addition to* the third copy inside each verse’s `translation`, byte-identical to the standalone JSONs shipped beside it.
**Fix.** Generate the data at build time with only what the runtime reads; ship a prebuilt token index; `defer` the corpus and load translations lazily. Target: under 200 ms to search-ready. **Effort M.**

### A3. The same hadith exist twice, in two editions, and both are offered
`data/hadith/catalog.json` exposes **Kitab 9 Imam (62,198 records, 119 MiB)** *and* the seven per-book files (28,742 records, ~52 MiB). For several books the wording differs between the two extractions, so the same hadith number can air with two different Arabic wordings depending on which dropdown entry was used.
**Measured duplication.** Row-level text match: **Sunan Nasa’i 5,325/5,559 (96 %)**, **Shahih Bukhari 6,493/6,978 (93 %)**, **Sunan Ad-Darimi 2,512/3,366 (75 %)** (an exact-hash comparison instead puts Bukhari at 79 % and Nasai/Darimi at 100 % — either way the conclusion holds). There are duplicates *within* single sources too (9-Imam 2,457, Bukhari 307, Nasai 215), and the brosur set has **5,277 duplicate rows (34 % of 15,387)**, 38 of them duplicated inside the same source page. Net: **≈16.8k of the 91,138 `kitab` rows (18 %) are redundant.** `js/hadith-worker.js:121` sorts results but never de-duplicates, so **the same hadith can appear up to three times in one result list**.

**Impact.** Beyond the 22.7 s of B18, this is a correctness problem: for books whose text differs between the two extractions, the same hadith number can air with two different Arabic wordings depending on which dropdown entry was used, and the operator has no way to see which edition is on screen.

**Fix.** Pick one canonical dataset (aggregate *or* per-book) and dedupe at build time, with worker-side de-duplication as a safety net; if both editions must stay, add an explicit “edisi” label to the picker plus a “tampilkan semua edisi” toggle. **Effort M** (mostly a rebuild plus catalog change).

### A4. 240 MiB installer, 199 MiB of it is a “read the source page” link
`data/hadith/reading/` is **199.2 MiB across 28,450 HTML files**, used only by “Buka halaman sumber” (`js/hadith.js:251`; `data/hadith/README.md:11`).
**Fix.** Drop the tree and render the context page on demand from the JSON (the text is already there), or pack it into one archive served per request. Together with A3 and A12 this takes the installer from ~240 MiB toward ~60–80 MiB — which matters for USB distribution at mosques. **Effort M.**

### A5. `tools/` and `dist/` dominate the folder
`tools/` = **497.8 MiB / 29,630 files** (extracted CHM audit trees — a third copy of the corpus, alongside the 114 MiB of CHMs that *do* ship, A12), `dist/` holds **1.38 GB including two stale portable exes** (240.6 MiB and 276.6 MiB) beside the current one, `app.js.bak` (24.7 KB) sits in the root. Exclusions are correct (`package.json:42–43`: `!dist`, `!*.bak`, `!tools`) so none of it ships — but nobody can tell which exe is current, and any backup of the folder carries ~1 GB of noise.
**Fix.** Move outputs to `release/`, keep only the current exe, `.gitignore` `dist/`, `scratch/`, `tools/*/extracted/`, delete `app.js.bak` and the two empty stray directories. **Effort S.**

### A6. Four version numbers
`package.json:3` → `5.1.0`; `main.js:400` window title → “Webquran v5.1”; folder → “v5.2”; `MANUAL_OPERATOR.md:1` → “v5.0”; `productName` → “Webquran v5”.
**Fix.** Single source of truth via `app.getVersion()`, injected into the title bar and the manual header. **Effort S.**

### A7. No CSP, no renderer sandbox, `Access-Control-Allow-Origin: *` on writable routes
`main.js` sets `Access-Control-Allow-Origin: *` on `/api/hadith` (`:128`), `/api/hadith/control` (`:207`), `/api/verse` POST (`:321`) and GET (`:338`), and on every static file (`:370`). Windows use `contextIsolation: true, nodeIntegration: false` (`:403–406`, `:481–485`) but not `sandbox: true`, and no `Content-Security-Policy` is sent. The static handler (`:355–373`) relies on `path.normalize` + `path.join` without asserting the resolved path stays inside `__dirname`.
**Impact.** Any page open in the operator’s browser can `POST /api/verse` and take over the projector. Loopback-only keeps this a local-trust issue, but it is real on a machine that also browses the web.
**Fix.** CSP header, `sandbox: true`, CORS pinned to `http://localhost:<port>`, a per-session token for POST, and `path.resolve(p).startsWith(path.resolve(__dirname))`. **Effort S.**

### A8. Five templates, five divergent implementations, no contract
`templates/lower_third.html` and `lower_third_dark.html` are **706 of 718 trimmed lines identical**; `default.html` and `pip_video.html` share **418 of 566**. Each carries its own font registry (`default.html:721–773`, `lower_third.html:637–678`, `lower_third_dual.html:480–521`, `pip_video.html:505–521`), its own `fallbackPoll`, its own show/hide timing, and its own Arabic treatment. Two of the five never load the text fitter (B6). `TRANS_VISIBILITY` is handled in 4 of 5. There are no shared CSS tokens (`--card-bg` in default/pip vs `--panel-bg` in lower_third/dual).
**Impact.** Every behaviour is implemented five times and already disagrees; templates cannot be trusted as previews of one another; a sixth template means another ~700-line copy.
**Fix.** `js/quran-template.js` (message contract, font registry, fit, transitions) + `templates/base.css` tokens; collapse `lower_third` + `dark` into one file with a theme attribute. **Effort L**, and it makes B6/B10/U13/U14 single-point fixes instead of five.

### A9. Dead code and spec drift
* `app.js.bak` — 24.7 KB orphan in the root.
* `js/vmix.js` — legacy path still wired to two buttons (B12).
* `js/confidenceMonitor.js:7–19` maps **six templates that do not exist** (`modern_elegant.html`, `classic_gold.html`, `neon_cyber.html`, `gradient_sunset.html`, `retro_islamic.html`, `elegant_minimalist.html`).
* `index.html:1609–1647` — dead duplicate OBS-URL init block targeting nonexistent `#obsUrlBox`/`#obsUrlText`, superseded by `:1653–1689`.
* `js/fullscreen.js:5–28` — `toggleFullscreen()` never called, references undeclared `isFullscreen`.
* `js/hadith-presentation.js:8–15` — dead `#hadith-template` branch (U15).
* Orphan data with zero references anywhere: `data/surah-list.json` (31.8 KB) and `data/vmix_feed.json` (479 B) — `main.js:81` writes `vmix-feed.json` to the output directory instead, so the checked-in copy is a decoy.
* `data/hadith/kitab-kumpulan-hadits-digital.json` (11.6 KB) plus 30 `reading/` pages are orphaned by `DISABLED_SEARCH_SOURCES` (`tools/build_hadith_data.py:20`) and unreachable from the UI, yet still shipped.
* Hadith state still carries `autoTranslate`, `arabicDuration`, `translationDuration`, `timer` (`main.js:41–49`) and the control actions `pause`, `resume`, `durations` (`main.js:232–245`), although `implementation.md:300` records that the timer flow was **cancelled**.
**Fix.** Delete all of the above in one commit. **Effort S.**

### A10. Test coverage stops at the logic layer
40 tests pass (search 15 @ 7.9 s, hadith 18 @ 2.4 s, API 1, dual-screen 4, presentation-fit 2), all against engines. **Not covered at all:** `js/hadith.js` (387 lines — the entire F7 dialog, saved favourites, and the *Tayangkan Hadits* → `POST /api/hadith` flow), the Omnibar actions (`executeOmnibarAction` show/hide/tr), `js/search.js:317` `loadSearchResultToStage` (the Muat/Live operator action), plus `render.js`, `navigation.js`, `font.js`, `modal.js`, `bookmark.js` and `confidenceMonitor.js`. There are no error-path tests (`worker.onerror` at `js/hadith.js:152`, missing/corrupt catalog, the worker’s source-identity rejection at `hadith-worker.js:16`), no performance budget, no data-integrity assertion (catalog-vs-files had to be verified by hand — it does pass: 10/10 counts match, all `reading_url` resolve), and no Electron end-to-end test (`main.js` is string-sliced in two test files). `tools/hadith_extract_test.py` (4 tests) is not wired into `npm test`.
**Impact.** Five of the P0 bugs above (B1, B2, B3, B4, B12) would have been caught by one jsdom/render smoke test, and the single most-used hadith flow has no test at all.
**Fix.** (a) jsdom tests for tally labels, template apply, toast queue, Esc stack and `loadSearchResultToStage`; (b) a Playwright/Electron smoke test loading `presentation.html` at 1920×1080, 3840×2160 and 1024×768 asserting no clipping and correct transparency; (c) `/api/*` tests for traversal, methods, body limits and atomicity; (d) a catalog-vs-files assertion and a perf budget. **Effort M.**

### A11. No diagnostics trail
Failures land in DevTools only: `presentation.html:233` `catch (e) {}`, `js/hadith-presentation.js:196` `console.warn`, multiple empty catches in `js/presentation.js`, `console.log/error` in `main.js`.
**Fix.** Ring buffer in the main process + a copyable log drawer + “Kirim log” (pairs with F12). **Effort S.**

### A12. The package ships ≈118 MiB the runtime never reads
`package.json:42–43` excludes `dist`, `tools` and `*.bak` — **verified against the real v5.2.0 build**: `tools/` is absent from `app.asar`, but the catch-all `files: ["**/*"]` still pulls in build inputs and dev leftovers. Measured from the shipped asar (551.3 MiB, 28.953 entri):

| Terpaket | Ukuran | Dipakai saat runtime? |
|---|---|---|
| `hadits/` (13 CHM sumber) | **114,3 MB** | tidak — hanya untuk rebuild data |
| `scratch/` (9 screenshot dev) | **1,9 MB** | tidak |
| `data/custom_full_quran.json` | **1,37 MB** | tidak — sudah tertanam di `quran-data.js` |
| `data/kemenag2002.json` | **1,19 MB** | tidak — idem |
| `data/surah-list.json`, `data/vmix_feed.json` | < 40 KB | tidak — tidak dirujuk kode |
| `*.md` (manual, implementasi, roadmap, task) | ±120 KB | tidak — hanya dokumentasi |

Catatan: `data/1-114.json` yang disebut pada versi awal dokumen ini **tidak ada** di repositori, jadi tidak ikut terpaket.

**Fix.** Replace the catch-all with an allow-list (`index.html`, `presentation.html`, `hadith-presentation.html`, `main.js`, `preload.js`, `js/`, `css/`, `templates/`, `assets/`, `data/quran*`, `data/hadith/*.json`, `data/hadith/assets/`), or add explicit `!hadits`, `!scratch`, `!data/custom_full_quran.json`, `!data/kemenag2002.json`, `!data/surah-list.json`, `!data/vmix_feed.json`, `!*.md`. **Effort S — EXE portable turun dari 230,8 MB ke sekitar ±118 MB.**

### A13. The hadith build pipeline is not reproducible
`tools/build_hadith_data.py:21` hardcodes the extractor: `EXTRACTOR = Path(r'C:\Program Files\NVIDIA Corporation\NVIDIA GeForce Experience\7z.exe')` — no PATH lookup, no fallback, no existence check, so a rebuild fails on any other machine. Lines 251–260 write `.extraction-complete` containing the CHM sha256 but **never compare it**, so a replaced CHM silently reuses a stale extraction. There is no dedupe step despite A3, and `:97` silently drops any entry whose translation is shorter than 30 characters (invisible recall loss).
**Fix.** Resolve 7-Zip from PATH with an override env var; compare the recorded hash and re-extract when it differs; add the dedupe pass; log dropped entries to a report file instead of discarding them silently. **Effort S–M.**

### A14. The static server re-reads whole files and sends no cache validator
`main.js:355–372` buffers the entire file per request (`fs.readFile`) and returns `Cache-Control: no-cache` with no `ETag`, `Last-Modified`, `Content-Length`, `Range` or compression. The 119 MiB hadith JSON is therefore fully read and shipped on each session’s first load.
**Fix.** Stream with `fs.createReadStream`, add `ETag`/`Last-Modified`, and enable `Range` + gzip for JSON/HTML — the worker already caches after the first load, so this is a one-session cost, but it is the difference between a 1 s and a 6 s first hadith search on a LAN link. **Effort S.**

---

## 8. D — Documentation vs reality (one-line fixes, outsized confusion)

| # | The docs say | The code does | Where |
|---|---|---|---|
| D1 | Reach `http://192.168.1.20:34730/…` over LAN | binds `127.0.0.1` only | `MANUAL_OPERATOR.md:217` vs `main.js:376` |
| D2 | “Muat … tanpa mengubah status tayang” | pushes to air unconditionally | `MANUAL_OPERATOR.md:141` vs `js/render.js:158–161` |
| D3 | Long hadith hidden so it never airs clipped | `fits` computed, never used; clipped instead | `MANUAL_OPERATOR.md:307` vs `js/hadith-presentation.js:58–61, 113–114` |
| D4 | Status bar shows “Status Server Ready” | static “Ready”, no updater | `MANUAL_OPERATOR.md:49` vs `index.html:814` |
| D5 | Help lists `Home/End`, `PageUp/Down`, `F9`, `F11`, `+`/`−`, `0`, `Ctrl+F` | none are bound | `index.html:1021–1072` vs no handler in `js/` |
| D6 | “F11 = fullscreen operator window” | no F11 handler | `MANUAL_OPERATOR.md:278` |
| D7 | Timer / auto-translate flow was cancelled | state + `pause`/`resume`/`durations` still live | `implementation.md:300` vs `main.js:41–49, 232–245` |
| D8 | vMix buttons “kirim ke vMix JSON” | send Web-API `SetText` to a hardcoded port | `index.html:373, 590` vs `js/vmix.js:9–55` |
| D9 | vMix indicator blinks green/red | wired to non-existent `#vmixLed` | `MANUAL_OPERATOR.md:290–292` vs `index.html:1903–1904` |
| D10 | OBS URL is `presentation.html` (transparent overlay) | transparency needs `?obs`, which the default entry never sends | `MANUAL_OPERATOR.md:196` vs `presentation.html:34, 56` |
| D11 | The hadith template lives in `templates/hadith-default.html` | it is a duplicate of the root page; the real renderer is `js/hadith-presentation.js` | `implementation.md` Tahap 5 vs `hadith-presentation.html` |
| D12 | Version 5.0 / 5.1 / 5.2 | three different strings in three files | §A6 |
| D13 | The hadith README says the first search uses “Shahih Bukhari” | the picker defaults to all nine books (22.7 s) | `data/hadith/README.md:3` vs `js/hadith.js:138–139` |
| D14 | The Quran library is “100 % offline” | 16 font families come from `fonts.googleapis.com`, none bundled | `index.html:1233` vs `index.html:10` |

**Fix.** Either implement each claim or correct the text. As a rule: the manual is the contract the operator was trained on, so a mismatch is a bug on whichever side is cheaper to change.

---

## 9. H — Repo & release hygiene (≈30 minutes)

| Item | Action |
|---|---|
| `app.js.bak` (24.7 KB) | delete |
| `dist/Webquran-v5.1-Portable.exe` (276.6 MiB) | delete — stale |
| `dist/win-unpacked/` | delete or move outside the repo |
| `inventory_lav/` (empty) and the empty dir with a non-ASCII name (`࿕ș`) | delete |
| `scratch/` (9 files, incl. 614 KB PNGs) | move to `docs/screenshots/` or delete — **note it currently ships inside `app.asar` (A12)** |
| `tools/hadits-kitab-audit/**/extracted` (497.8 MiB, 29,630 files) | keep out of version control; regenerate via `tools/build_hadith_data.py` |
| `hadits/` (114 MiB of source CHMs) | keep in the repo for rebuilds, but exclude from the package (A12) |
| `vmix-feed.json`, `data/vmix_feed.json`, `dist/vmix_feed.json`, `dist/vmix-feed.json` | four names for one artifact (`-` vs `_`) — keep one, document it |
| **App icon** | none exists; the exe ships with the default Electron icon. Add `build/icon.ico` (256 px) and set `win.icon`. **Effort S, visible on every desktop.** |
| Version strings | unify (§A6) |
| `.gitignore` | `dist/`, `scratch/`, `node_modules/`, `tools/*/extracted/`, `*.bak` |

---

## 10. Suggested sequence

**Sprint 1 — “nothing wrong on air” (≈1 week)**
B1 initial state + stale replay · B2 overlay transparency · B3 stop pushing on prepare · B4 Space capture · B5 tally semantics + Cut Black · B7/B8 hadith fit + Full Screen reference · B9 bundle fonts · B12 vMix indicator · **B18 default hadith scope (one line, 22.7 s → ~1 s)** · D1–D14 text corrections · app icon.

**Sprint 2 — “setup without a technician” (≈1–2 weeks)**
B14 LAN binding · B15 single-instance lock + durable settings · U6 pre-flight check + wizard · U3 window sizing and breakpoints · U1 F2 field fix · U2 modal/Esc stack · U4 startup noise · U7 rename size controls · **A12 package allow-list (≈130 MiB for one config change)**.

**Sprint 3 — “the projector never freezes or misleads” (≈2 weeks)**
B6 long-verse clipping · B10 template swap without reload · B11 heartbeat + banner · B13 template allow-list · B16 authoritative tallies · B17 atomic API + single poll loop · U13 theme/size wiring · U19 search index · A7 CSP/CORS.

**Sprint 4 — “smaller, cleaner, testable” (≈1–2 weeks)**
A3 canonical hadith data + dedupe · A4 drop or pack `reading/` · A8 template contract · A9 dead code · A5 + H cleanup · A2 lean Quran data + prebuilt index · A13 reproducible data build · A14 streaming static server · A10 tests · U12 performance · U10/U11 accessibility and escaping · U14 4K scaling · U17 Arabic fidelity.

**Sprint 5 — new capability (pick two)**
F1 rundown · F2 standby screen · F5 PVW/PGM · F7 share card · F4 phone remote.

---

## 11. If you only do five things

1. **Fix the initial state so nothing airs before a verse is chosen, and stop replaying the last verse after a restart (B1).** Every cold start currently puts a “Menunggu Operator” card — or yesterday’s verse — on air.
2. **Make the default template actually transparent (B2).** The OBS overlay target is an opaque card with visible controls until the operator switches template.
3. **Stop `Muat` from pushing to air (B3)** — a prepare action that replaces the verse a congregation is reading is the most damaging single bug in the app.
4. **Fix Space and the tally labels (B4, B5)** — one day of work removes the two highest-risk interactions in the live console.
5. **Bundle the Arabic fonts and fit long verses (B9, B6).** Offline venues otherwise get broken Arabic with wrong fit measurements, and the longest verses lose their ending on air, silently.

**And the cheapest line in the whole document:** `js/hadith.js:139` currently sets the hadith source picker to *all nine books*. Changing that one default takes the first search from **22.7 s to about a second** (B18) — worth doing today even if nothing else in Sprint 1 lands.
