# 📖 Panduan Penggunaan Operator — Webquran v5.4
**Aplikasi Al-Qur'an Interaktif untuk Siaran Langsung, Presentasi Proyektor, & Produksi Broadcast (OBS / vMix)**

---

## 🌟 Daftar Isi
1. [Tentang Webquran v5](#-tentang-webquran-v5)
2. [Arsitektur Antarmuka & Layar](#-arsitektur-antarmuka--layar)
3. [Alur Kerja Operator (Workflow)](#-alur-kerja-operator-workflow)
4. [Universal Smart Quick Jump (Omnibar)](#-universal-smart-quick-jump-omnibar)
5. [Fitur Panggung Kontrol (STAGE)](#-fitur-panggung-kontrol-stage)
6. [Pencarian Latin (F3) & Terjemahan (F4)](#-pencarian-latin-f3--terjemahan-f4)
7. [Pencarian dan Penayangan Hadits (F7)](#pencarian-dan-penayangan-hadits-f7)
8. [Integrasi Broadcast: OBS Studio & vMix](#-integrasi-broadcast-obs-studio--vmix)
9. [Dual Screen & Layar Proyektor](#-dual-screen--layar-proyektor)
10. [Koleksi Template Layar Presentasi](#-koleksi-template-layar-presentasi)
11. [Daftar Lengkap Shortcut Keyboard](#-daftar-lengkap-shortcut-keyboard)
12. [Pemeriksaan Sebelum Siaran (Pre-flight)](#-pemeriksaan-sebelum-siaran-pre-flight)
13. [Troubleshooting & Solusi Cepat](#-troubleshooting--solusi-cepat)

---

## 🚀 Tentang Webquran v5

**Webquran v5** adalah sistem kontrol dan presentasi Al-Qur'an profesional berkecepatan tinggi yang dirancang khusus untuk operator siaran masjid, kajian langsung, live streaming YouTube/Facebook, TV dakwah, dan presentasi proyektor. 

### Pembaruan Utama di Versi 5.4:
- **Mode siaran PVW → TAKE**: siapkan ayat di panggung tanpa mengudara, lalu tekan **TAKE** (`Shift+Enter`). Chip **PVW/PGM** di dock menunjukkan apa yang disiapkan dan apa yang sedang tayang.
- **Semua jalur konten mengikuti mode**: tombol utama, `Prev`/`Next`, panah `↑/↓` (jumlah ayat), dan tombol **Muat** pada hasil pencarian hanya masuk panggung; hanya **TAKE** dan **Show** yang menayangkan.
- **Tujuh template lower third menjadi full width** (menempel tepi kiri–kanan layar), sudut membulat hanya di atas.
- **Tab Bantuan → Setup OBS & vMix**: nomor urut diperbaiki (sebelumnya "2" dua kali).
- **Sidebar lebih rapi**: tombol `Copy` dan `CSV` pada bagian Navigasi Ayat dihapus (fungsi Copy tetap tersedia di kartu ARABIC dan TERJEMAHAN).

### Pembaruan Utama di Versi 5.3:
- **Empat template lower third baru**: **Emerald Glass**, **Midnight Blue**, **Paper Light**, dan **Dual Split Sapphire** — semuanya memakai sistem ukuran teks yang sama dengan Light/Dark, jadi perilaku teks konsisten.
- **Label sumber seragam**: pil emas diganti label editorial (teks emas kecil + garis bawah) di **ketujuh** template lower third; frame video tidak lagi tertutup.
- **Warna teks Arab**: hitam `#111827` pada panel terang (kontras 17,7:1) agar lebih tegas dibaca dari jauh.
- **Versi terjemahan benar-benar berfungsi lagi**: Kemenag 2019 / Kampung Sunnah / Kemenag 2002 dimuat dari berkas data yang kini ikut dibundel; label kuning di kartu menyebut nama versinya.
- **Dual Column dirapikan**: teks Arab tidak lagi menempel ke tepi kanan; auto-scroll untuk ayat panjang tetap berjalan.
- **Sidebar & top bar dirapikan**: kartu section seragam, ikon konsisten, kontrol setinggi 38 px; top bar dan bar panggung tidak terpotong di layar 1100–1440 px.
- **Perbaikan bug panggung**: ayat tidak lagi berhenti di skeleton (`isPresentationVisible` / `SVG_*` / `lanInfo` TDZ).

### Pembaruan Utama di Versi 5.2:
- **Tally sesuai standar broadcast**: merah = **ON AIR**, abu = **BLANK**. Tombol **Cut Black** kini benar-benar memotong (tidak lagi menyalakan layar yang sudah hitam).
- **Font Arab dibundel lokal**: teks Al-Qur'an tetap benar tanpa internet, termasuk harakat dan pemenggalan baris.
- **`?obs` benar-benar berfungsi**: URL overlay transparan untuk OBS/vMix bisa disalin langsung dari Bantuan → tab Setup.
- **Tombol Muat tidak lagi mengudara**: menyiapkan ayat berikutnya tidak mengubah ayat yang sedang dibaca jemaah.
- **Spasi & T selalu jalan** walau operator baru saja mengklik tombol lain.
- **Peringatan hadits terpotong**: panel hadits menampilkan badge *⚠ Terpotong* bila teks tidak muat di layar.
- **Pencarian hadits lebih cepat**: rujukan awal satu kitab (bukan seluruh koleksi).

### Pembaruan Utama di Versi 5.0:
- **Tampilan Harmonis & Selaras Penuh**: Seluruh tombol, badge, dan kontrol kini menggunakan sistem icon SVG modern berpresisi tinggi (menggantikan emoji kasar).
- **Tombol Copy STAGE Baru**: Dilengkapi icon SVG ganda dan feedback visual instan (*"Tersalin!"* dengan centang hijau) untuk menyalin teks Arab maupun Terjemahan dalam satu klik.
- **Quick Translation Switcher di STAGE**: Penggantian versi terjemahan (Kemenag 2019, Kampung Sunnah / CHM, Kemenag 2002) dapat dilakukan langsung dari kartu Terjemahan panggung kontrol maupun dari sidebar dengan sinkronisasi dua arah otomatis.
- **Custom Select System**: Dropdown pilihan terjemahan dan font di sidebar kini berpenampilan dark glass modern dengan custom chevron.
- **Enhanced Live Control Dock**: Kontrol navigasi di bilah tengah tidak bertumpuk dan memberikan kejelasan status tayang On-Air setiap detik.

---

## 🖥️ Arsitektur Antarmuka & Layar

Antarmuka Webquran v5 terbagi menjadi beberapa area strategis:

```
+-----------------------------------------------------------------------------------+
|  [Logo] Webquran v5   [Quick Jump Ctrl+K]   [ON AIR/BLANK] [TR: ON/OFF]   [Dual Screen] [Template]  |
+-----------------------------------------------------------------------------------+
| SIDEBAR KIRI          | BREADCRUMB & LIVE CONTROL DOCK (Tally & Stepper)          |
| - Versi Terjemahan    +------------------------------------+----------------------+
| - Font Selector       | PANGGUNG KONTROL (STAGE)           | SEARCH / PGM MONITOR |
| - Navigasi Surat/Ayat | - Kartu ARABIC (Teks & Tombol Copy)| - Program Feed 16:9  |
| - Riwayat & Bookmark  | - Kartu TERJEMAHAN (+ Selector)   | - Split View Search  |
+-----------------------+------------------------------------+----------------------+
| STATUS BAR: Indikator vMix JSON | Slider Ukuran Teks Tayang                      |
+-----------------------------------------------------------------------------------+
```

1. **Header Konsol Broadcast**: Memuat status master siaran (Tally ON AIR, Terjemahan ON/OFF, Dual Screen, Template, Mode Terang/Gelap).
2. **Sidebar Kontrol (Kiri)**: Panel pemilihan surat, input nomor ayat, rentang jumlah ayat (multi-ayat), selektor font, dan versi terjemahan.
3. **Surah Breadcrumb & Live Control Dock (Tengah Atas)**: Penunjuk identitas surat & ayat aktif, tombol navigasi `Prev`/`Next`, penghitung urutan ayat, serta toggle cepat.
4. **Panggung Kontrol (STAGE)**: Area kerja utama operator yang menampilkan teks Arab beresolusi tinggi dan teks terjemahan lengkap dengan aksi salin cepat.
5. **Program Feed 16:9 / Search Split Panel (Kanan)**: Monitor pratinjau langsung yang menampilkan apa yang sedang tayang di layar jemaah / live streaming.

---

## ⚡ Alur Kerja Operator (Workflow)

### 1. Menampilkan Ayat Tunggal
1. Tekan `F2` untuk fokus ke sidebar (atau klik input **Cari Surat**).
2. Ketik nama surat (misal: `Al-Baqarah` atau cukup `baq`), lalu pilih dari saran.
3. Masukkan **No. Ayat** (misal: `255`).
4. Tekan <kbd>Enter</kbd> atau klik tombol **TAMPILKAN AYAT**.
5. Ayat langsung dimuat di STAGE dan diteruskan ke layar presentasi/OBS.

### 2. Menampilkan Rangkaian Multi-Ayat (Contoh: Ayat 1 sampai 5)
1. Pilih surat yang diinginkan.
2. Masukkan **No. Ayat** awal: `1`.
3. Masukkan **Jumlah**: `5` (Maksimal 10 ayat sekaligus).
4. Tekan <kbd>Enter</kbd>. Semua 5 ayat akan dirender berurutan pada satu tampilan terpadu.

### 3. Melangkah Maju / Mundur (Stepper)
- Tekan tombol panah kanan <kbd>→</kbd> pada keyboard untuk melangkah ke ayat berikutnya.
- Tekan tombol panah kiri <kbd>←</kbd> pada keyboard untuk kembali ke ayat sebelumnya.
- **Pindah Surat Otomatis**: Ketika berada di ayat terakhir suatu surat, menekan <kbd>→</kbd> akan otomatis membawa Anda ke ayat 1 surat berikutnya tanpa jeda.

### 4. Memotong Tampilan (Cut to Black / Hide)
- Tekan tombol <kbd>Spasi</kbd> untuk menyembunyikan tampilan seketika (layar proyektor/OBS menjadi kosong/transparan).
- Tekan <kbd>Spasi</kbd> kembali untuk menampilkan ayat aktif ke layar.

### 5. Menampilkan / Menyembunyikan Teks Terjemahan
- Tekan tombol <kbd>T</kbd> untuk menyalakan atau mematikan tampilan teks terjemahan (menampilkan hanya teks Arab saja bila terjemahan OFF).

---

## 🔍 Universal Smart Quick Jump (Omnibar)

Tekan <kbd>Ctrl</kbd> + <kbd>K</kbd> atau tombol <kbd>/</kbd> kapan saja untuk membuka **Omnibar Universal**.

### Format Perintah yang Didukung:
| Format Ketikan | Contoh | Aksi yang Dijalankan |
| :--- | :--- | :--- |
| `[Nama Surat] [Ayat]` | `kahf 10` | Langsung lompat ke QS. Al-Kahf ayat 10 |
| `[No. Surat]:[Ayat]` | `18:10` | Langsung lompat ke QS. Al-Kahf ayat 10 |
| `[Nama Surat] [Awal]-[Akhir]` | `yasin 1-5` | Menampilkan QS. Yasin ayat 1 sampai 5 (5 ayat) |
| `show` / `on` | `show` | Mengaktifkan layar presentasi (ON AIR) |
| `hide` / `off` | `hide` | Mematikan layar presentasi (Cut to Black) |
| `tr on` / `tr off` | `tr on` | Mengaktifkan / mematikan teks terjemahan |
| `Kata Kunci Bebas` | `puasa` | Menelusuri seluruh ayat Al-Qur'an yang memuat kata tersebut |

---

## 🎛️ Fitur Panggung Kontrol (STAGE)

### 0. Template Dua Kolom: teks menyesuaikan, gulir bisa dijeda
Khusus **Lower Third Dual** dan **Dual Split Sapphire**:

- Teks diukur terhadap **tinggi kolom sebenarnya**, bukan tebakan. Ayat panjang otomatis mengecil sampai muat — tidak lagi langsung digulir.
- Bila masih terasa terlalu kecil, **panel tumbuh bertahap** dari 28vh sampai 40vh agar huruf tetap besar.
- **Gulir otomatis hanya dipakai untuk isi ekstrem** (mis. sangat banyak ayat pada ukuran tayang 200%). Saat itu aktif, tepi bawah teks memudar sebagai tanda masih berlanjut.
- Tombol **⏸ GULIR** di dock (atau tombol **P**) menjeda gulir di posisi terakhir; tekan lagi untuk melanjutkan dari titik itu. Status jeda juga berlaku di overlay OBS/vMix.

### 1. Tombol Salin (Copy Text)
Pada sudut kanan atas kartu **ARABIC** dan kartu **TERJEMAHAN**, terdapat tombol aksi `Copy`:
- **Klik sekali**: Teks langsung disalin ke clipboard komputer Anda.
- **Indikator Taktil**: Tombol seketika berubah warna menjadi hijau emerald dengan icon centang `✓` dan label `"Tersalin!"` selama 1.8 detik sebelum kembali ke kondisi awal.
- Tidak ada lagi emoji clipboard kasar; seluruh tombol menggunakan SVG presisi tinggi.

### 2. Quick Translation Switcher di Header Kartu Terjemahan
Di samping judul kartu **TERJEMAHAN**, terdapat *pill selector*:
- Klik pill untuk memilih versi terjemahan:
  - **Kemenag 2019**: Terjemahan resmi mutakhir Kementerian Agama RI.
  - **Kampung Sunnah**: Edisi CHM (Jihad Pagi).
  - **Kemenag 2002**: Terjemahan edisi klasik Kemenag RI.
- Memilih versi di STAGE akan langsung memperbarui teks panggung, tampilan OBS/presentasi, dan dropdown sidebar secara otomatis.

### 3. Mode Siaran: Langsung vs PVW → TAKE
Di panel sidebar (bagian **Navigasi Ayat**), ada pemilih **mode siaran**:

| Mode | Perilaku |
|---|---|
| **Langsung** (bawaan) | Tombol utama / `Enter` menayangkan ayat seketika. Sama seperti versi sebelumnya. |
| **PVW → TAKE** | Tombol utama berubah menjadi **MUAT (PVW)**: ayat hanya masuk panggung, layar OBS/vMix/proyektor **tidak berubah**. Tayang hanya setelah **TAKE**. |

Di dock panggung tampil status:

```
PVW  2:255      ← yang disiapkan di panggung
PGM  2:255      ← yang sedang mengudara
[✓ TAKE]        ← aktif hanya bila PVW ≠ PGM
```

- **TAKE** (`Shift+Enter`) menaikkan isi panggung ke layar. Bila layar sedang blank, TAKE otomatis menyalakannya.
- Bila PVW dan PGM sama, tombol TAKE **nonaktif** — tidak ada yang perlu dinaikkan.
- Pada mode **PVW**, semua perubahan (tombol utama, `Prev`/`Next` ← →, panah ↑/↓ jumlah ayat, serta tombol **Muat** di hasil pencarian) hanya masuk panggung. Tombol **Show** pada kartu hasil pencarian tetap langsung menayangkan.
- Pilihan mode diingat antar sesi.

---

## 📑 Pencarian Latin (F3) & Terjemahan (F4)

Webquran v5 memiliki laci pencarian (*Search Drawer*) dengan mode ganda: **Split Kolom** (berdampingan dengan STAGE) dan **Drawer Melayang**.

- **Pencarian Latin (Transliterasi)**: Tekan <kbd>F3</kbd>. Ketik bacaan latin tanpa spasi atau dengan spasi (misal: *yasalunaka*).
- **Pencarian Terjemahan**: Tekan <kbd>F4</kbd>. Ketik kata kunci bahasa Indonesia (misal: *rezeki*, *sabar*, *surga*).

Ketik minimal **3 huruf/angka**. Hasil diurutkan menurut relevansi: kecocokan frasa didahulukan, disusul kecocokan semua kata. Kata kunci tidak harus berurutan. Gunakan **Tampilkan hasil berikutnya** untuk membuka hasil setelah 60 ayat pertama.

Pencarian Latin mengabaikan huruf besar, diakritik, spasi, dan tanda petik. Variasi seperti **ya ayyuhalladzina amanu**, **yaa ayyuhalladhina aamanu**, serta vokal panjang dikenali; kecocokan ejaan asli tetap diprioritaskan. Akhiran bacaan opsional dalam tanda kurung juga diperhitungkan.

Pencarian terjemahan mengikuti **versi terjemahan yang sedang dipilih**, termasuk terjemahan kustom. Tanda baca dan nomor catatan kaki tidak mengganggu pencarian. Kata berimbuhan seperti **beriman** dan **berpuasa** dapat ditemukan lewat **iman** dan **puasa**; kata **bagaimana** tidak ikut muncul untuk pencarian **iman**. Beberapa variasi ejaan umum dikenali, misalnya **shalat/salat**, **rejeki/rezeki**, dan **taqwa/takwa**. Pencarian ini berbasis teks, bukan pencarian makna atau seluruh sinonim.

Pencarian bebas di **Ctrl+K** memakai logika yang sama untuk Latin dan terjemahan, dengan maksimal enam hasil ayat.

### Tombol Aksi pada Kartu Hasil Pencarian:
- **`Muat`**: Memuat ayat yang dipilih ke STAGE kontrol tanpa mengubah status tayang layar OBS/proyektor (berguna untuk persiapan pra-siar).
- **`Live`**: Memuat ayat dan **langsung menayangkannya ON AIR** ke layar proyektor / live stream seketika.

---

## Pencarian dan Penayangan Hadits (F7)

Klik **Hadits** di toolbar, **Pencarian Hadits** di sidebar, atau tekan **F7**. Pilih kelompok **Kitab Hadits** atau **Brosur Ahad Pagi**, lalu pilih rujukan. Kedua kelompok ditelusuri terpisah. Cari kata Indonesia, potongan Arab, atau nomor hadits; klik hasil untuk membaca dan memeriksa riwayatnya melalui **Buka halaman sumber**.

Nomor mengikuti edisi sumber dan dapat berbeda dari edisi lain. Derajat hadits tidak ditetapkan otomatis. Layar siaran hanya menampilkan Arab atau terjemah beserta riwayat yang tersedia pada data. Arab dan terjemah tidak tampil bersamaan; judul bab serta catatan sumber tetap berada di panel operator.

### Alur manual

1. Pilih dan periksa hasil pencarian, lalu klik **Tayangkan Hadits**. Sistem mengirim hasil ke URL layar hadits (termasuk Browser Input vMix) dan langsung menampilkan Arab beserta riwayat. Aksi ini tidak membuka dual screen.
2. Saat ingin menampilkan arti, klik **Terjemah**. Terjemah menggantikan Arab, sementara riwayat tetap tampil. Klik lagi untuk kembali ke Arab.
3. Klik **Sembunyikan Hadits** untuk menurunkan tayangan. Mode kembali ke Arab dan tombol Terjemah dinonaktifkan.

Gunakan **Siapkan saja** bila hasil perlu disimpan ke layar tanpa langsung ditayangkan. Ini merupakan opsi lanjutan dan bukan langkah wajib. Tayangkan setelah disembunyikan selalu dimulai dari Arab + riwayat. Tidak ada timer; setiap mode tetap tampil sampai operator menggantinya atau menyembunyikan layar.

Memilih hasil pencarian lain saja belum mengganti tayangan. Klik **Tayangkan Hadits** untuk mengganti konten aktif dalam satu langkah. Setelah aplikasi ditutup dan dijalankan ulang, pilih dan tayangkan kembali karena konten aktif disimpan selama server berjalan.

Tombol A−/A+ pada panel baca (berlabel **Ukuran baca**) hanya mengatur ukuran teks bacaan operator. Tombol ON AIR/BLANK, Terjemahan, slider **Ukuran Tayang**, dan pemilih template Al-Qur'an tidak mengendalikan layar hadits. Menutup pencarian dengan Esc tidak menyembunyikan hadits yang sedang tayang; gunakan **Sembunyikan Hadits**.

Panduan data dan batasan ekstraksi tersedia di [data/hadith/README.md](data/hadith/README.md).

### Peringatan teks tidak muat

Setelah hadits tayang, panel operator memeriksa apakah seluruh teks benar-benar muat di target layar yang dipilih:

| Badge di bilah atas panel hadits | Arti |
| :--- | :--- |
| **✓ Muat di …** (hijau) | Seluruh teks terlihat penonton |
| **⚠ Terpotong di …** (kuning) | Teks tidak muat pada ukuran terkecil; bagian akhir kutipan tidak terlihat |

Badge ini muncul **setelah** hadits ditayangkan, karena pengukuran dilakukan pada layar siaran yang sesungguhnya. Bila muncul peringatan, pilih **Full Screen** atau ringkas kutipannya, lalu tayangkan ulang. Badge hilang sendiri saat hadits diturunkan atau kutipan diganti.

**Pencarian hadits**: rujukan awal adalah **Shahih Bukhari** agar pencarian pertama cepat. Pilihan **Semua kitab** tetap tersedia, tetapi memuat sembilan koleksi sekaligus sehingga terasa jauh lebih lambat.

### Dual screen bersama untuk ayat dan hadits

Pemilih **Template Hadits** dan tombol **Buka Layar Hadits** berada di bilah atas panel pencarian hadits. Tombol tersebut khusus untuk membuka atau mengalihkan kanal second screen/proyektor. Untuk URL HTML atau Browser Input vMix, cukup klik **Tayangkan Hadits** pada hasil; dual screen tidak ikut terbuka.

Status **Proyektor: Ayat**, **Proyektor: Hadits**, atau **Proyektor: Tidak aktif** ditampilkan pada header aplikasi dan panel hadits. Tombol Dual Screen pada header tetap dapat menutup jendela bersama, apa pun kontennya.

Untuk kembali ke ayat, gunakan **Tampilkan Ayat**, navigasi ayat, **Live** pada hasil pencarian/Omnibar, atau aktifkan **Show** ayat. Tindakan tersebut menyembunyikan status tayang hadits, mengaktifkan ayat, dan mengalihkan proyektor yang sudah terbuka ke layar ayat. Data hadits terakhir tetap tersimpan. Memilih hasil pencarian, menekan **Muat**, atau mengganti versi terjemahan untuk persiapan tidak mengambil alih layar hadits.

Pada Electron, jendela dibuka di monitor kedua jika tersedia. Pada browser biasa, izinkan popup dan pindahkan satu jendela presentasi bersama ke monitor/proyektor yang diinginkan. Browser Input vMix tetap memakai URL ayat dan hadits masing-masing; perpindahan proyektor tidak mengganti sumber vMix.

### Pilihan template hadits

- **Lower Third**: panel di bawah layar; area di luar panel transparan untuk overlay siaran.
- **Full Screen**: latar penuh, panel terpusat, dan teks lebih besar untuk monitor atau proyektor.

Pilih **Full Screen** bila kanal hadits akan dipakai sebagai tampilan penuh di second screen/proyektor, lalu buka layar dengan **Buka Layar Hadits** dan tayangkan hasil yang diinginkan. Untuk URL/vMix dengan overlay kamera, pilih **Lower Third**. Template hanya mengubah layout; tidak menentukan apakah dual screen dibuka.

Pilihan template berlaku untuk seluruh layar hadits, termasuk Browser Input vMix. Mengganti template langsung memperbarui layout jika hadits sedang tayang; Arab/Terjemah dan status Show/Hide tidak berubah. Menyiapkan hadits baru mempertahankan template yang dipilih. Pilihan disimpan selama server berjalan dan kembali ke Lower Third saat aplikasi dijalankan ulang. Template ayat tetap memiliki pengaturan sendiri.

---

## 📡 Integrasi Broadcast: OBS Studio & vMix

Webquran v5 terintegrasi secara *native* dengan software broadcast terkemuka.

### A. Integrasi OBS Studio (Browser Source)
1. Di OBS Studio, tambahkan sumber baru: **Browser Source**.
2. Beri nama (misal: `Al-Quran Overlay`).
3. Masukkan URL. Ada **dua pilihan**, keduanya bisa disalin langsung dari **Bantuan (F1) → tab Setup OBS & vMix**:
   - **Overlay transparan** (ayat ditumpuk di atas kamera, tombol editor disembunyikan):
     ```
     http://localhost:34730/presentation.html?obs
     ```
   - **Kartu penuh 16:9** (grafik mengisi seluruh frame):
     ```
     http://localhost:34730/presentation.html
     ```
4. Atur resolusi:
   - **Width**: `1920`
   - **Height**: `1080` (atau `3840 x 2160` untuk 4K)
5. Centang **"Shutdown source when not visible"** dan **"Refresh browser when scene becomes active"** (opsional).
6. Dengan `?obs`, latar template `default` menjadi transparan dan kontrol editor tidak ikut terekam. Template `lower_third` dan `pip_video` sudah transparan sejak awal.

> **Penting:** bila hanya ada satu layar (tanpa monitor kedua), jangan mengandalkan peringatan otomatis — jendela proyektor akan terbuka menimpa panel operator. Gunakan Browser Source di OBS/vMix sebagai gantinya.

### B. Integrasi vMix melalui Browser Input

Jalankan Webquran dan biarkan aplikasi tetap terbuka selama siaran. Di vMix, tambahkan dua input **Web Browser** terpisah dengan ukuran **1920 × 1080**:

| Nama input yang disarankan | Alamat | Kontrol di Webquran |
| :--- | :--- | :--- |
| Ayat Al-Qur’an | `http://localhost:34730/presentation.html?obs` | Panel dan tombol Al-Qur’an |
| Hadits | `http://localhost:34730/hadith-presentation.html` | Tayangkan/Sembunyikan Hadits, Siapkan saja, Terjemah |

Untuk hadits, gunakan alamat tanpa `?preview=...`. Mode preview menampilkan contoh lokal dan tidak mengikuti perintah operator. Input hadits kosong sampai hadits disiapkan dan Show ditekan.

Gunakan input Hadits sebagai overlay di atas kamera atau video. Halaman menyediakan latar transparan di luar lower third. Webquran mengatur isi halaman; vMix tetap menentukan apakah input tersebut masuk ke output siaran. Menekan Show di Webquran tidak memasukkan input ke output vMix secara otomatis.

> **Catatan jaringan:** secara bawaan server hanya mendengarkan di komputer ini (`localhost`). Untuk vMix/OBS di **komputer lain**, aktifkan dulu **Bantuan (F1) → tab Setup OBS & vMix → bagian 2 “Akses dari Komputer Lain”**, lalu gunakan URL jaringan yang muncul di sana (bentuknya `http://192.168.x.x:34730/...`).

### B1. Mengaktifkan akses jaringan lokal (vMix/OBS di komputer lain)

1. Buka **Bantuan (F1) → tab Setup OBS & vMix**, gulir ke bagian **2. Akses dari Komputer Lain**.
2. Centang **“Izinkan komputer lain di jaringan lokal mengakses Webquran”**. Server dihidupkan ulang pada port yang sama — URL lama tetap berlaku.
3. Jika Windows Firewall bertanya, pilih **Allow access** untuk jaringan **Private** (jangan untuk jaringan publik).
4. Status akan menampilkan alamat komputer, misalnya **Aktif · 192.168.1.20**. Salin URL **Ayat (jaringan lokal)** atau **Hadits (jaringan lokal)** dan tempel di vMix/OBS pada komputer lain.
5. Matikan kembali centang tersebut setelah siaran selesai.

> **Keamanan:** selama aktif, siapa pun di jaringan yang sama dapat mengubah tayangan tanpa izin. Aktifkan hanya selama siaran berlangsung. Pastikan jaringan yang dipakai adalah jaringan privat (bukan Wi-Fi publik masjid/gedung).

> **Jika tidak bisa dibuka dari komputer lain:** pastikan kedua komputer berada di jaringan yang sama, port `34730` diizinkan di Windows Firewall, dan jaringan ditandai **Private** di Windows (bukan Public).

Browser Input tidak memerlukan pemetaan kolom atau Data Source JSON. Indikator vMix pada status bar aplikasi berkaitan dengan feed JSON ayat, bukan status Browser Input hadits.

### C. Integrasi vMix melalui Data Source JSON (opsional, ayat)

Jalur ini **tidak wajib** dan hanya untuk yang memang memakainya. Untuk sebagian besar kebutuhan, Browser Input (bagian B) lebih sederhana karena tidak perlu memetakan kolom.

Setiap kali ayat berganti, Webquran otomatis memperbarui file data feed lokal:
- **Lokasi file feed**: folder aplikasi (`vmix-feed.json`). Path lengkapnya bisa dilihat dengan mengarahkan kursor ke indikator **vMix JSON** di status bar, atau disalin lewat tombol salin di Bantuan → tab vMix.
- **Langkah Pemasangan di vMix**:
  1. Buka vMix → Klik ikon gerigi **Data Sources** di pojok kanan bawah.
  2. Klik **Add** → Pilih jenis **JSON**.
  3. Masukkan URL / File Path: arahkan ke file `vmix-feed.json`.
  4. Buka **Title Editor** pada title XAML Al-Quran Anda.
  5. Sambungkan data mapping:
     - Text Arab → Kolom `Arab`
     - Text Terjemahan → Kolom `Terjemahan`
     - Info Surat/Ayat → Kolom `Judul`

**Arti indikator vMix JSON di status bar:**

| Warna | Arti |
| :--- | :--- |
| Abu | Belum ada ayat yang ditayangkan, feed belum ditulis |
| Hijau berkedip | Feed baru saja berhasil ditulis (±2 detik) |
| Hijau tenang | Feed sudah berisi ayat terakhir |
| Merah | Gagal menulis berkas (folder tidak bisa ditulis) |

> Tombol “kirim ke vMix” yang lama sudah dihapus. Integrasi vMix sekarang hanya lewat Browser Input (disarankan) atau Data Source JSON otomatis di atas.

---

## 🖥️ Dual Screen & Layar Proyektor

Bagi operator di masjid atau gedung pertemuan yang menggunakan kabel HDMI ke proyektor / TV display:
1. Sambungkan monitor eksternal / kabel HDMI proyektor ke PC/laptop Anda.
2. Atur mode tampilan Windows ke **Extend Displays** (<kbd>Win</kbd> + <kbd>P</kbd> → *Extend*).
3. Klik tombol **Dual Screen** di header Webquran.
4. Jendela presentasi terbuka **tanpa bingkai** dan langsung menutupi seluruh monitor kedua (bila terdeteksi). Bila hanya ada satu monitor, jendela itu akan menimpa panel operator — pindahkan dengan <kbd>Win</kbd>+<kbd>Shift</kbd>+<kbd>←</kbd>/<kbd>→</kbd>, atau lebih baik gunakan Browser Source di OBS/vMix.
5. Operator tetap mengendalikan ayat dari layar laptop tanpa mengganggu pandangan jemaah.

> <kbd>F11</kbd> mengatur layar penuh **jendela operator** (panel kontrol), bukan jendela presentasi.

---

## 🎨 Koleksi Template Layar Presentasi

Webquran v5 menyediakan beragam template siap pakai (klik tombol **Template** di header):

| Nama Template | Target Penggunaan | Karakteristik Visual |
| :--- | :--- | :--- |
| **Default 16:9 (Layar Penuh)** | Proyektor Masjid, TV Display | Teks Arab besar terpusat di tengah dengan ornamen emas elegan dan adaptasi font cerdas. |
| **Lower Third Light** | Live Streaming Kajian Siang | Bar banner di sepertiga bawah layar dengan tema terang bersih & kontras tinggi. |
| **Lower Third Dark** | Live Streaming Kajian Malam | Bar banner kaca gelap (*glassmorphism*) dengan aksen aksara Arab menyala. |
| **Dual Column 16:9** | TV Display & Proyektor Luas | Kolom kiri teks Arab besar dan kolom kanan teks terjemahan berdampingan. |
| **PiP Video Corner** | Studio / Live Podcast | Menyisakan ruang sudut untuk webcam/video penceramah. |
| **Lower Third Emerald Glass** | TV, kajian malam, live report | Panel hijau zamrud mengambang dengan sudut membulat, garis emas tipis, dan rel emas di tepi kiri. Label sumber **teks emas kecil bergaris bawah** (tanpa pil). Ukuran teks dan penyesuaiannya **sama dengan Lower Third Light/Dark**; animasi tambahannya sapuan garis label 0,6 dtk. |
| **Lower Third Midnight Blue** | Siaran malam, kajian, TV | Panel biru malam mengambang, sudut membulat, garis emas tipis di atas, label sumber **di tengah** dengan garis emas. Ukuran teks **sama** dengan Lower Third Light/Dark; animasinya geser-naik tenang (tanpa kilau). |
| **Lower Third Paper Light** | Siaran siang, kajian, kelas | Panel kertas gading dengan garis emerald di tepi kiri dan butir emerald di depan label. Ukuran teks **sama** dengan Lower Third Light/Dark; animasinya *fade + rise* lembut. |
| **Dual Split Sapphire** | TV, kajian, kelas | Kolom ganda: **terjemahan** di kertas terang (kiri) dan **teks Arab** di nilam (kanan), dipisah garis emas — keduanya tampil **bersamaan**. Animasi tirai terbuka dari tengah, lalu kolom masuk dari sisinya. Paling cocok untuk ayat pendek–sedang. |

> **Cakupan tombol tema:** tema panel hanya mengubah **Default 16:9** dan **PiP Video Corner**. Keenam template **Lower Third** (Light, Dark, Dual, Emerald Glass, Midnight Blue, Paper Light) memakai desain tetap (warna sesuai nama kartunya) — bukan kerusakan bila tombol tema tidak mengubahnya. Sebaliknya, **Ukuran Tayang** di status bar berlaku untuk **semua** template.

---

## ⌨️ Daftar Lengkap Shortcut Keyboard

Kendalikan siaran tanpa menyentuh mouse dengan tombol pintas berikut:

| Tombol | Fungsi Siaran |
| :--- | :--- |
| <kbd>Spasi</kbd> | **Tampilkan / potong layar** (ON AIR ⇄ BLANK). Selalu aktif walau operator baru mengklik tombol lain. |
| <kbd>→</kbd> (Panah Kanan) | Maju ke **Ayat Selanjutnya** (otomatis lanjut surat di akhir) |
| <kbd>←</kbd> (Panah Kiri) | Mundur ke **Ayat Sebelumnya** |
| <kbd>T</kbd> | **Tampilkan / sembunyikan Terjemahan** (ON / OFF) |
| <kbd>Ctrl</kbd> + <kbd>K</kbd> atau <kbd>/</kbd> | Buka **Universal Smart Omnibar (Quick Jump)** |
| <kbd>F1</kbd> | Buka **Bantuan & Panduan** |
| <kbd>F2</kbd> | Buka / Fokus ke **Panel Navigasi Surat** |
| <kbd>F3</kbd> | Buka Pencarian **Transliterasi Latin** |
| <kbd>F4</kbd> | Buka Pencarian **Kata Terjemahan Indonesia** |
| <kbd>F5</kbd> | Buka Daftar **Riwayat Ayat Terakhir** |
| <kbd>F6</kbd> | Buka Daftar **Bookmark Tersimpan** |
| <kbd>F7</kbd> | Buka **Pencarian Hadits** |
| <kbd>F9</kbd> | Tampilkan / sembunyikan **Program Feed** (Confidence Monitor) |
| <kbd>F11</kbd> | **Mode Fullscreen** Jendela Operator |
| <kbd>Ctrl</kbd> + <kbd>↑</kbd> / <kbd>Ctrl</kbd> + <kbd>↓</kbd> | Perbesar / perkecil **Ukuran Teks Tayang** (langkah 5%) |
| <kbd>Ctrl</kbd> + <kbd>1</kbd> | Reset ukuran teks tayang ke **100%** |
| <kbd>Esc</kbd> | Menutup Drawer Pencarian, Omnibar, atau Modal Bantuan |

> Saat kursor sedang berada di kolom isian (mis. kotak pencarian), tombol <kbd>Spasi</kbd> dan <kbd>T</kbd> kembali berfungsi sebagai pengetikan biasa. Klik area kosong atau tekan <kbd>Esc</kbd> untuk mengembalikan fungsi siaran.

---

## 🩺 Pemeriksaan Sebelum Siaran (Pre-flight)

Lakukan pemeriksaan ini **sebelum** siaran dimulai — terutama di venue yang baru pertama kali dipakai.

1. Buka **Bantuan (F1) → tab Pemeriksaan**.
2. Klik **Jalankan Pemeriksaan**. Hasil muncul per baris:

| Baris | Arti bila hijau | Bila kuning/merah |
| :--- | :--- | :--- |
| **Server lokal** | server merespons di port yang benar | server tidak berjalan — tutup lalu jalankan ulang aplikasi |
| **Font Arab (offline)** | font Amiri termuat dari berkas lokal | font gagal dimuat — jalankan `npm run fonts` lalu build ulang |
| **Layar terdeteksi** | 2 layar atau lebih | hanya 1 layar — jendela proyektor akan menimpa panel operator; gunakan Browser Source OBS/vMix |
| **Folder feed vMix** | folder bisa ditulis | folder read-only — pindahkan aplikasi ke folder yang bisa ditulis |
| **Data hadits** | katalog terbaca | data hadits tidak ditemukan — pasang ulang aplikasi |
| **Berkas font terpasang** | berkas font lengkap | font hilang dari paket |
| **Akses jaringan** | aktif dengan alamat IP | hanya komputer ini (normal bila vMix/OBS di komputer yang sama) |

3. Klik **Salin laporan** bila perlu mengirim hasilnya ke teknisi — laporannya berupa teks biasa.
4. Setelah semua baris penting hijau, baru mulai siaran.

---

## 🛠️ Troubleshooting & Solusi Cepat

1. **Teks tidak berubah di OBS Browser Source?**
   - Pastikan Webquran sedang berjalan. Server berhenti saat aplikasi ditutup.
   - Periksa URL Browser Source: `http://localhost:34730/presentation.html?obs` (overlay) atau tanpa `?obs` (kartu penuh).
   - Klik kanan sumber browser di OBS → pilih **Refresh**.

2. **Indikator vMix JSON di status bar berwarna merah?**
   - Artinya berkas `vmix-feed.json` gagal ditulis.
   - Pastikan folder aplikasi memiliki izin tulis (*write permission*) — jangan dijalankan dari folder Program Files atau media yang write-protected.
   - Pastikan berkas tidak sedang dikunci software lain.

3. **Ukuran teks Arab terlalu besar atau terlalu kecil di layar proyektor?**
   - Gunakan slider **Ukuran Tayang** di sudut kanan status bar bawah (50%–200%), atau <kbd>Ctrl</kbd>+<kbd>↑</kbd> / <kbd>Ctrl</kbd>+<kbd>↓</kbd>.
   - Persentase yang sedang tayang juga terlihat di kaki **Program Feed** (mis. `· Teks 120%`).
   - Klik label persentase (misal `100%`) atau tekan <kbd>Ctrl</kbd>+<kbd>1</kbd> untuk mereset.

   > **Jangan tertukar:** tombol **A−/A+** di panel hadits (berlabel *Ukuran baca*) hanya memperbesar bacaan di layar operator — teks yang tayang **tidak berubah**. Untuk mengubah tayangan, gunakan **Ukuran Tayang** di status bar.

4. **Ayat tidak berganti padahal operator menekan tombol?**
   - Periksa tally di header: bila tertulis **BLANK**, layar memang tidak menayangkan apa pun.
   - Bila operator baru memakai **Muat**, tayangan memang sengaja tidak berubah. Klik **TAMPILKAN AYAT** untuk menayangkannya.

5. **Hadits belum muncul di vMix?**
   - Pastikan aplikasi Webquran masih terbuka.
   - Buka `http://localhost:34730/hadith-presentation.html` di browser komputer yang sama untuk memeriksa alamat dan port.
   - Pilih hasil, lalu klik **Tayangkan Hadits**. Periksa pesan berhasil atau gagal pada panel pencarian.
   - Pastikan URL input tidak memakai `?preview=...` dan input Hadits digunakan pada output atau overlay vMix.
   - Alamat ini hanya bisa dibuka dari komputer yang sama. Untuk komputer lain, aktifkan dulu **Akses jaringan lokal** (lihat bagian B1).

6. **Badge “⚠ Terpotong” muncul di panel hadits?**
   - Artinya teks tidak muat pada ukuran terkecil di target layar yang dipilih, sehingga bagian akhir kutipan tidak terlihat penonton.
   - Pilih **Full Screen** pada **Target Layar** (ruang lebih luas), atau ringkas kutipan, atau pilih hadits lain.
   - Badge hanya muncul setelah hadits benar-benar tayang, karena pengukuran dilakukan di layar siaran.

7. **Hadits tertentu kosong, tetapi hadits lain bisa tampil?**
   - Pastikan sumber menyediakan Arab sebagai teks/gambar dan terjemah; data yang tidak lengkap dapat ditolak saat persiapan.
   - Pemecahan kutipan sangat panjang menjadi beberapa bagian belum tersedia; periksa sebelum masuk siaran.

8. **Teks terakhir tetap terlihat saat koneksi server terputus?**
   - Halaman memang mempertahankan frame terakhir bila polling gagal, supaya layar tidak tiba-tiba kosong saat siaran.
   - Sembunyikan overlay dari vMix bila perlu menurunkan tayangan segera, lalu jalankan ulang aplikasi dan siapkan hadits lagi.

---

*Webquran v5.4 — Memberikan Kemudahan, Kecepatan, & Keanggunan Visual dalam Setiap Siaran Kalamullah.*
