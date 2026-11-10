# Implementation Plan — Layar Presentasi Hadits

Dokumen ini menetapkan rencana implementasi layar presentasi hadits untuk vMix. Layar hadits berdiri sendiri dan tidak bercampur dengan `presentation.html` yang digunakan untuk Al-Qur’an.

## Batasan tampilan

Informasi yang boleh tampil pada layar presentasi hanya tiga bagian:

1. **Arab** — teks Arab hadits. Jika sumber hanya menyediakan gambar Arab, gambar asli ditampilkan.
2. **Terjemah** — terjemahan atau arti dalam bahasa Indonesia.
3. **Riwayat** — keterangan sumber sebagaimana tercantum pada data, misalnya `H.R. Bukhari, Juz 4 halaman 454 no. 4223`.

Arab dan terjemah tidak ditampilkan bersamaan. Hadits baru disiapkan dalam keadaan tersembunyi dan mode Arab. Operator mengendalikan penayangan melalui **Show/Hide hadits** dan **Terjemah**, tanpa timer atau perpindahan otomatis. Hide mereset mode ke Arab, mematikan highlight Terjemah, dan menonaktifkan tombol Terjemah sampai Show ditekan lagi. Show setelah Hide selalu menampilkan Arab + riwayat terlebih dahulu. Riwayat mengikuti lower third pada kedua mode. Judul bab, nama file, `source_id`, nomor internal, catatan editor, dan status derajat hadits tidak ditampilkan pada layar presentasi. Metadata tersebut tetap boleh digunakan di panel operator dan disimpan untuk pelacakan sumber.

## Kontrak data presentasi

Bagian state server yang digunakan alur manual adalah:

```js
{
  visible: false,
  arabic: "إِنَّمَا الْأَعْمَالُ بِالنِّيَّاتِ",
  translation: "Sesungguhnya amal itu tergantung niatnya.",
  riwayat: "H.R. Bukhari, Juz 4 halaman 454 no. 4223",
  arabicImages: [],
  displayMode: "arabic",
  template: "lower-third",
  showRiwayat: true,
  lastUpdate: "2026-09-13T22:00:00.000Z"
}
```

Aturan:

- `arabic`, `translation`, dan `riwayat` adalah satu-satunya data tekstual yang dirender pada layar.
- `displayMode` hanya boleh bernilai `arabic` atau `translation`; nilainya menentukan tampilan aktif.
- `template` bernilai `lower-third` atau `full-screen`; pilihan berlaku untuk layar hadits di proyektor dan Browser Input vMix. Mengganti template tidak mengubah konten, mode, atau visibilitas hadits.
- `showRiwayat` tetap aktif pada alur operator; tidak ada kontrol riwayat terpisah.
- Server masih menyimpan field dan perintah timer dari implementasi sebelumnya. Field tersebut bukan bagian kontrol manual dan renderer tidak menjalankan perpindahan otomatis.
- `visible: false` membuat layar kembali ke keadaan tunggu atau kosong.
- `arabicImages` digunakan hanya jika `arabic` tidak tersedia sebagai teks.
- `lastUpdate` digunakan halaman presentasi untuk mengetahui perubahan data tanpa memuat ulang halaman.
- Tidak boleh mengarang riwayat, nomor, juz, halaman, atau derajat hadits.
- Bila riwayat tidak tercantum, tampilkan teks `Riwayat tidak tercantum pada sumber` di panel operator; pada layar presentasi bagian riwayat boleh disembunyikan.
- Bila terjemah tidak tersedia, hadits tidak dikirim ke layar presentasi sampai operator memilih sumber lain atau memeriksa data.

## Tahap 1 — State dan endpoint server

File utama: `main.js`.

Tambahkan state terpisah dari state Al-Qur’an:

```js
let currentHadithPresentation = {
  visible: false,
  arabic: "",
  translation: "",
  riwayat: "",
  arabicImages: [],
  displayMode: "arabic",
  template: "lower-third",
  showRiwayat: true,
  lastUpdate: null
};
```

Endpoint yang diperlukan:

```text
GET  /api/hadith
POST /api/hadith
POST /api/hadith/control
```

Endpoint tidak boleh membaca atau mengubah `currentVerseData`. Data ayat dan data hadits harus memiliki jalur state yang berbeda.

Kriteria selesai:

- `GET /api/hadith` mengembalikan state hadits aktif.
- `POST /api/hadith` menerima tiga data tampilan dan aset Arab opsional; kiriman operator menggunakan `visible: false` untuk menyiapkan hadits.
- `POST /api/hadith/control` menerima `{ action: "visibility", visible: true/false }`, `{ action: "arabic" }`, atau `{ action: "translation" }` untuk kontrol manual.
- `{ action: "template", template: "lower-third"/"full-screen" }` memilih template, termasuk sebelum ada hadits aktif. Menyiapkan hadits baru mempertahankan pilihan template. Template tidak valid ditolak tanpa mengubah state.
- State bertahan selama server Electron berjalan.

## Tahap 2 — Halaman presentasi khusus

Buat file:

```text
hadith-presentation.html
js/hadith-presentation.js
css/hadith-presentation.css
```

Halaman melakukan polling ke `/api/hadith` secara berkala. Ketika `lastUpdate` berubah, halaman memperbarui tampilan tanpa reload.

Layout default menggunakan gaya lower third, bukan kartu bacaan penuh:

```text
+------------------------------------------------+
|                                                |
|                                                |
|                                                |
|   TEKS ARAB ATAU TERJEMAH (bergantian)         |
|                                                |
|  RIWAYAT HADITS                                |
+------------------------------------------------+
```

Karakteristik tampilan:

- Area utama hanya menampilkan salah satu: Arab atau terjemah.
- Hadits baru disiapkan pada mode Arab dalam keadaan tersembunyi.
- Operator menggunakan **Show/Hide hadits** untuk visibilitas dan **Terjemah** untuk memilih mode saat tayang. Hide mengembalikan mode ke Arab.
- Lower third ditempatkan di bagian bawah layar dengan latar semi-transparan.
- Riwayat tetap ringkas dan tidak mengambil ruang utama dari teks.
- Teks Arab panjang boleh mengalir beberapa baris di dalam area lower third dengan ukuran adaptif.
- Terjemah panjang menggunakan ukuran adaptif yang berbeda dari Arab. Teks tidak dipotong dengan ellipsis atau pembatas baris yang menghilangkan isi.
- Perubahan mode mengikuti perintah operator tanpa reload halaman.

Kriteria selesai:

- URL dapat dibuka di browser: `http://localhost:34730/hadith-presentation.html`.
- Hanya satu dari Arab atau terjemah yang terlihat pada satu waktu, dengan riwayat sebagai lower third yang tetap dipertahankan.
- Hadits baru yang disiapkan mereset pilihan ke Arab dan menunggu Show.
- Tidak ada timer atau pergantian mode otomatis.
- Tidak ada sidebar, kontrol operator, atau elemen Al-Qur’an.
- Halaman tetap terbaca pada rasio 16:9.
- Tampilan tunggu muncul jika belum ada hadits aktif.
- Tampilan tidak berubah jika server mengirim state yang sama.

## Tahap 3 — Tombol dari pencarian hadits

Pada panel detail pencarian hadits tambahkan tombol:

```text
Siapkan hadits
Show hadits / Hide hadits
Terjemah
```

Saat **Siapkan hadits** ditekan, aplikasi mengirim:

```js
{
  visible: false,
  arabic: selected.arabic,
  translation: selected.translation,
  riwayat: selected.reference,
  arabicImages: selected.arabic_images || []
}
```

Panel operator boleh menampilkan nama kitab, nomor, dan jalur sumber sebagai informasi pemeriksaan, tetapi data itu tidak diteruskan sebagai elemen visual tambahan ke layar presentasi.

Kriteria selesai:

- Memilih hasil pencarian tidak mengubah tayangan; **Siapkan hadits** menyimpan pilihan ke server dalam keadaan tersembunyi, lalu **Show hadits** menayangkannya.
- Hadits dari kelompok `kitab` dan `brosur` tetap mempertahankan riwayat masing-masing.
- Tombol memberi umpan balik berhasil atau gagal.
- Menyiapkan hadits baru mengganti konten, menyembunyikan layar, dan mereset mode ke Arab.

## Tahap 4 — Kontrol layar

Hanya dua kontrol penayangan:

- **Show/Hide hadits**: saat tayang, label menjadi Hide dan tombol diberi highlight. Hide menyembunyikan layar sekaligus mereset mode ke Arab.
- **Terjemah**: memilih terjemah jika aktif, atau Arab jika tidak aktif. Hide mematikan highlight dan menonaktifkan tombol ini; Show mengaktifkannya kembali dalam keadaan tidak terpilih.

**Siapkan hadits** adalah aksi persiapan sebelum dua kontrol tersebut. Tombol A−/A+ pada panel baca mengubah ukuran bacaan operator, bukan font layar presentasi.

Kontrol ini berlaku hanya untuk `hadith-presentation.html`. Kontrol tampilan Al-Qur’an tidak boleh ikut berubah.

## Tahap 5 — Template visual

Halaman layar hadits (satu-satunya entry point produksi):

```text
hadith-presentation.html
```

> Catatan revisi (v5.2): `templates/hadith-default.html` yang disebut pada versi awal dokumen ini sudah dihapus. Berkas itu hanya salinan `hadith-presentation.html` dengan path relatif berbeda dan tidak pernah dipakai — halaman root inilah yang menjadi template sekaligus renderer.

Halaman ini menyediakan dua layout melalui kelas CSS pada `css/hadith-presentation.css`: **Lower Third** dengan latar transparan di luar panel dan **Full Screen** dengan latar penuh, teks lebih besar, serta panel terpusat untuk proyektor. Keduanya memakai slot konten dan controller yang sama; URL produksi tidak berubah. Pemilih template dan tombol Tampilkan di Proyektor ditempatkan pada bilah atas panel pencarian hadits, terpisah dari hasil bacaan.

Template default menggunakan gaya lower third dengan konten `arabic`, `translation`, dan `riwayat`. Renderer memilih konten melalui `displayMode`; elemen pada template yang berjalan adalah:

```text
hadith-card
hadith-arabic
hadith-translation
hadith-images
hadith-reference
```

Implementasi template harus memilih Arab atau terjemah berdasarkan `displayMode`. Keduanya tidak dirender bersamaan pada layar. Visibilitas dan mode mengikuti state server yang diperbarui oleh perintah operator; controller tidak menjalankan timer. Template tambahan dapat dibuat kemudian, misalnya lower third yang lebih ringkas atau variasi warna, selama tetap hanya merender tiga data tersebut.

## Tahap 6 — Pengaturan vMix

Tambahkan Browser Input baru di vMix dengan alamat:

```text
http://localhost:34730/hadith-presentation.html
```

Jika vMix berada di komputer lain, gunakan alamat IP komputer yang menjalankan Webquran:

```text
http://192.168.1.20:34730/hadith-presentation.html
```

Port `34730` harus diizinkan pada Windows Firewall jika diakses melalui jaringan lokal.

vMix tidak perlu membaca JSON. vMix hanya menampilkan halaman browser, sedangkan halaman tersebut mengambil state hadits dari server lokal Webquran.

## Tahap 7 — Pengujian

Skenario wajib:

1. Buka halaman presentasi tanpa hadits aktif.
2. Kirim hadits dengan teks Arab dan terjemah dalam mode Arab.
3. Kirim hadits dengan Arab berupa gambar.
4. Kirim hadits tanpa nomor tetapi memiliki riwayat.
5. Kirim hadits dari Brosur Ahad Pagi.
6. Kirim hadits dari Kitab Hadits.
7. Klik **Show hadits** dan pastikan Arab + riwayat tampil.
8. Klik **Terjemah** dan pastikan terjemah menggantikan Arab, sementara riwayat tetap tampil.
9. Klik **Hide hadits**, pastikan Terjemah tidak aktif dan tombolnya dinonaktifkan. Klik **Show hadits** lagi dan pastikan Arab + riwayat yang tampil.
10. Aktifkan Terjemah, lalu klik lagi untuk kembali ke Arab saat tayang.
11. Pastikan layar Al-Qur’an tidak berubah.
12. Pastikan judul bab dan metadata internal tidak tampil.
13. Uji perubahan ukuran teks pada resolusi 16:9.
14. Uji vMix pada komputer yang sama.
15. Uji vMix melalui IP lokal komputer Webquran.

Kriteria penerimaan:

- Layar hanya menampilkan Arab atau terjemah secara bergantian, dengan riwayat pada lower third.
- Hadits yang baru disiapkan selalu berada pada mode Arab dan tersembunyi sampai operator menekan **Show hadits**.
- Operator mengendalikan seluruh perpindahan secara manual melalui **Show/Hide hadits** dan **Terjemah**.
- Tidak ada pencampuran state ayat dan hadits.
- Perubahan hadits terlihat tanpa reload Browser Input vMix.
- Riwayat yang tampil persis berasal dari sumber data.
- Data kosong tidak menghasilkan teks palsu atau nomor rekaan.

## Urutan pengerjaan kecil

Pengerjaan dapat dilakukan bertahap sebagai berikut:

1. Tambahkan state `currentHadithPresentation` dengan `displayMode` dan visibilitas.
2. Tambahkan `GET /api/hadith` dan `POST /api/hadith`.
3. Buat lower third default dengan data contoh lokal.
4. Hubungkan halaman ke endpoint server.
5. Tambahkan tombol kirim dari panel pencarian.
6. Tambahkan kontrol manual **Show/Hide hadits** dan **Terjemah**.
7. Uji sebagai Browser Input vMix.
8. Dokumentasikan konfigurasi final di `MANUAL_OPERATOR.md`.
9. Revisi desain atau tambahkan template visual bila diperlukan.

Versi minimum dianggap selesai ketika operator memilih dan menyiapkan hadits, lalu mengendalikan Arab, terjemah, dan hide dari dua tombol manual tanpa memuat ulang Browser Input.

## Arsip eksekusi bertahap

### Pengembangan dual screen bersama

Eksekusi dilakukan satu langkah per permintaan operator:

1. **Selesai — fondasi Electron:** satu jendela presentasi mendukung `quran` atau `hadith`. `openPresentation(content)` membuka jendela jika belum ada atau mengganti halaman pada jendela yang sama. Pemanggilan lama tanpa argumen tetap membuka ayat. Status baru `{ open, content }` tersedia lewat `getPresentationState` dan `onPresentationState`; status boolean lama tetap kompatibel. Memilih konten yang sama tidak me-reload halaman. Pemisahan URL Browser Input vMix tetap berlaku.
2. **Selesai — panel operator:** tombol Tampilkan di Proyektor pada hadits membuka/mengalihkan jendela bersama tanpa mengubah konten hadits aktif atau status Show/Hide. Status Proyektor: Ayat/Hadits/Tidak aktif tersedia pada header dan panel hadits. Tampilkan Ayat, navigasi ayat, Live dari pencarian/Omnibar, dan Show ayat mengalihkan proyektor yang sudah terbuka kembali ke ayat. Memuat hasil pencarian untuk persiapan dan memperbarui data terjemahan tidak mengalihkan layar. Fallback browser memakai satu popup bernama `WebquranProjector`; popup perlu dipindahkan ke monitor kedua oleh operator.
3. **Selesai — template hadits:** pemilih Lower Third/Full Screen dan tombol Tampilkan di Proyektor berada di bilah atas panel hadits, bukan detail hasil. Renderer memakai slot yang sama dengan layout adaptif: panel bawah transparan atau panel terpusat dengan latar penuh. Pergantian template hanya mengubah layout; kontrol Show/Hide dan Terjemah tetap berlaku. Pilihan template disimpan selama server berjalan, berlaku pada proyektor dan vMix, serta dipertahankan saat hadits baru disiapkan.
4. **Belum dikerjakan — validasi:** uji perpindahan Ayat → Hadits → Ayat dan pemilihan template pada layar kedua; perbarui panduan operator.

Validasi langkah pertama: sintaks `main.js` dan `preload.js` lulus; `npm test` lulus 23/23. Pengujian dengan mock Electron membuktikan perpindahan konten memakai satu jendela, membuka pada monitor kedua, tidak me-reload konten yang sama, serta mereset status ketika ditutup. Pengujian pada perangkat proyektor menunggu integrasi operator.

Validasi langkah kedua: pemeriksaan sintaks skrip operator lulus; `npm test` lulus 26/26. Pengujian mencakup satu popup bersama, perubahan indikator konten, popup yang diblokir, mempertahankan hadits saat data ayat diperbarui untuk persiapan, tidak membuka kembali popup yang ditutup, dan status awal Electron yang terlambat. Pemeriksaan visual pada proyektor dilakukan pada langkah validasi perangkat.

Validasi langkah ketiga: `npm test` lulus 26/26 dengan tambahan skenario template pada pengujian API. Template dapat dipilih sebelum persiapan, tidak membuat data kosong bisa ditayangkan, dipertahankan saat menyiapkan hadits, tidak mengubah mode Terjemah/visibilitas saat tayang, serta tidak menyentuh state ayat. Posisi toolbar dan pratinjau Full Screen Arab diperiksa di browser lokal pada kanvas 16:9. Server aplikasi yang sudah terbuka perlu dijalankan ulang untuk memakai endpoint template baru. Pratinjau Full Screen: `hadith-presentation.html?preview=arabic&template=full-screen`; query preview tidak dipakai untuk produksi.

Catatan berikut merekam urutan pengerjaan, termasuk eksperimen timer yang kemudian dibatalkan. Spesifikasi di atas adalah panduan aktif; tombol jeda, lanjutkan, dan durasi dalam arsip ini tidak lagi digunakan.

- **Langkah 1 selesai:** state `currentHadithPresentation` ditambahkan di `main.js`, mencakup tiga konten tampilan, mode Arab awal, visibilitas, durasi operator, dan metadata timer. Belum ada timer yang berjalan.
- **Validasi langkah 1:** pemeriksaan sintaks `node --check main.js` lulus.
- **Langkah 2 selesai:** `GET /api/hadith` mengembalikan state hadits; `POST /api/hadith` menerima konten Arab/terjemah/riwayat, aset Arab lokal opsional, dan pengaturan durasi. Kiriman baru mengaktifkan layar dan memulai mode Arab; eksekusi timer masih menunggu langkah 6.
- **Validasi langkah 2:** pemeriksaan sintaks dan pengujian HTTP `node --test tools/hadith-api.test.js` lulus. Pengujian mencakup konten Arab Unicode, riwayat, aset gambar, data kosong/tidak valid, pembatas ukuran kiriman, metode HTTP, serta independensi state Al-Qur’an. Kiriman yang ditolak tidak mengubah state sebelumnya.
- **Aturan endpoint:** terjemah wajib berisi teks; Arab wajib tersedia sebagai teks atau aset gambar lokal. Durasi Arab 1–3600 detik; durasi terjemah 0–3600 detik (`0` berarti terus tampil). Metadata tambahan seperti judul tidak dimasukkan ke state presentasi. `lastUpdate` ditetapkan server. Respons berhasil POST berupa `{ success: true, state: ... }`.
- **Langkah 3 selesai:** `hadith-presentation.html`, `templates/hadith-default.html`, `css/hadith-presentation.css`, dan `js/hadith-presentation.js` menyediakan lower third dengan satu konten aktif (Arab atau terjemah) serta riwayat. Contoh lokal dari rujukan proyek disimpan di `data/hadith/presentation-samples.json`; nomor contoh mengikuti edisi sumber.
- **Pratinjau langkah 3:** buka `hadith-presentation.html?preview=arabic` atau `?preview=translation`. Varian `?preview=long` menguji Arab panjang; `?preview=image` menguji gambar Arab. Query pratinjau tidak dipakai pada URL Browser Input produksi. Latar gelap hanya untuk pratinjau; URL biasa kosong/transparan sampai ada data dari controller.
- **Validasi langkah 3:** sintaks JavaScript diperiksa; tampilan Arab, terjemah, teks panjang, dan gambar diperiksa di browser pada kanvas 16:9. Mode terjemah menyembunyikan Arab. Renderer memakai teks biasa, mempertahankan riwayat, dan menyesuaikan font tanpa memangkas kutipan.
- **Batas layout:** panel dapat berkembang sampai 43% tinggi layar untuk teks panjang, dengan margin bawah 5%. Jika teks masih tidak muat pada ukuran minimum, renderer mengembalikan `fits: false` dan menyembunyikan panel agar kutipan tidak tayang terpotong. Integrasi operator pada langkah berikutnya perlu menampilkan kondisi ini; pembagian hadits sangat panjang menjadi beberapa bagian belum diimplementasikan.
- **Langkah 4 selesai:** konteks template produksi kini melakukan polling `GET /api/hadith` setiap 500 ms dengan `cache: no-store`. Renderer hanya menggambar ulang ketika `lastUpdate` berubah; jika server sementara gagal, frame terakhir dipertahankan tanpa menampilkan error ke siaran. URL wrapper tetap meneruskan query `preview` ke template dan tidak memanggil endpoint saat pratinjau.
- **Validasi langkah 4:** pemeriksaan sintaks `node --check js/hadith-presentation.js` dan seluruh `npm test` (22 pengujian) lulus. URL produksi `http://localhost:34730/hadith-presentation.html` berhasil dibuka melalui server Electron dan tetap kosong ketika state server `visible: false`; mode pratinjau tetap menampilkan Arab/terjemah/gambar.
- **Langkah berikutnya:** langkah 5, menambahkan tombol kirim dari panel pencarian ke `POST /api/hadith`. Pergantian otomatis Arab → terjemah dan kontrol timer belum dikerjakan.
- **Langkah 5 selesai:** panel detail hadits sekarang memiliki tombol **Tampilkan di layar hadits**. Tombol mengirim `arabic`, `translation`, `riwayat`, dan `arabicImages` ke `POST /api/hadith`; metadata internal tidak ikut dikirim. Status tombol berubah saat berhasil, dapat dikirim ulang, dan menampilkan pesan kegagalan bila server tidak tersedia.
- **Validasi langkah 5:** sintaks `js/hadith.js` diperiksa dan seluruh `npm test` (22 pengujian) lulus. Pengiriman aktual dapat dicoba setelah aplikasi Electron dijalankan ulang agar endpoint langkah 2 tersedia.
- **Langkah berikutnya:** langkah 6, menambahkan urutan otomatis Arab → terjemah pada controller layar. Tombol hide/show dan kontrol timer belum dikerjakan.
- **Langkah 6 selesai:** controller `js/hadith-presentation.js` kini memulai fase Arab setiap kali state hadits baru dirender, lalu otomatis berpindah ke terjemah setelah `arabicDuration` (default 8 detik). Riwayat tetap dipertahankan. `translationDuration: 0` membuat terjemah tetap tampil; durasi positif menyembunyikan panel setelah waktunya selesai. Timer lama dibatalkan saat hadits baru masuk, dan pergantian memakai fade singkat.
- **Validasi langkah 6:** sintaks controller diperiksa dan seluruh `npm test` (22 pengujian) lulus. Timer berjalan pada halaman template produksi; mode `preview` tetap menampilkan fase yang diminta tanpa mengaktifkan urutan otomatis.
- **Langkah berikutnya:** langkah 7, menambahkan kontrol manual mode Arab/terjemah, jeda, dan lanjutkan. Pengaturan timer dari panel operator belum tersedia.
- **Langkah 7 selesai:** endpoint `POST /api/hadith/control` dan tombol panel **Arab**, **Terjemah**, **Jeda otomatis**, serta **Lanjutkan otomatis** telah ditambahkan. Kontrol mode memperbarui `displayMode`, jeda mematikan pergantian otomatis, dan lanjutkan mengaktifkannya kembali. Perintah ditolak jika belum ada hadits aktif atau terjemah tidak tersedia.
- **Validasi langkah 7:** pemeriksaan sintaks `main.js` dan `js/hadith.js`, serta seluruh `npm test` (22 pengujian) lulus. Tombol kontrol mengirim perintah terpisah dari data ayat.
- **Langkah berikutnya:** langkah 8, menambahkan pengaturan durasi Arab dan terjemah dari panel operator. Hide/show riwayat dan kontrol font sudah tersedia di panel baca, tetapi belum menjadi kontrol presentasi tersendiri.
- **Langkah 8 dibatalkan oleh penyederhanaan alur:** input durasi, timer, dan pergantian otomatis dihapus dari kontrol operator. `POST /api/hadith` kini menyiapkan hadits dalam keadaan tersembunyi; operator menentukan kapan tayang.
- **Alur manual saat ini:** klik **Show hadits** untuk Arab + riwayat; klik **Terjemah** untuk terjemah + riwayat; klik **Hide hadits** untuk menyembunyikan lower third. Tombol Show/Hide dan Terjemah diberi highlight sesuai status.
- **Penyelarasan manual selesai:** status tombol diperbarui setelah server menerima perintah; menyiapkan ulang hadits mereset Show/Hide dan pilihan Terjemah. Kontrol riwayat terpisah tidak diperlukan karena riwayat mengikuti lower third.
- **Pengujian end-to-end selesai:** pada `14 September 2026`, alur Shahih Bukhari No. 1 diuji dari panel pencarian hingga `hadith-presentation.html`. **Siapkan hadits** membuat state tetap tersembunyi; **Show hadits** menampilkan Arab + `Shahih Bukhari • No. 1`; **Terjemah** mengganti konten dengan terjemah dan mempertahankan riwayat; **Hide hadits** mengosongkan lower third; lalu **Show hadits** kembali menampilkan terjemah karena tombol Terjemah masih aktif. Tombol status berubah menjadi **Hide hadits** saat siaran dan kembali menjadi **Show hadits** saat disembunyikan. API Al-Qur’an tetap menggunakan state terpisah.
- **Penyederhanaan alur operator (14 September 2026):** aksi utama menjadi **Tayangkan Hadits**, yang mengirim hasil terpilih dalam keadaan tampil sekaligus membuka/mengalihkan satu jendela proyektor ke hadits. **Siapkan saja** dipertahankan sebagai opsi sekunder tanpa tayang. Aktivasi ayat dan hadits kini saling menonaktifkan visibilitas lawannya tanpa mencampur data konten; perpindahan kembali ke ayat menyembunyikan hadits dan meresetnya ke mode Arab.
- **Pemisahan kanal (14 September 2026):** **Tayangkan Hadits** hanya memperbarui state URL HTML/Browser Input vMix; aksi ini tidak membuka atau mengalihkan dual screen. **Buka Layar Hadits** tetap menjadi kontrol khusus second screen/proyektor. Template Full Screen/Lower Third hanya mengatur layout.
- **Validasi akhir:** `npm test` lulus 22/22. Pengujian API mencakup urutan Show → Terjemah → Hide → Show dan memastikan state Al-Qur’an tidak berubah. Tampilan lower third diperiksa pada browser lokal 16:9.
- **Dokumentasi operator selesai:** `MANUAL_OPERATOR.md` menjelaskan pemisahan sumber kitab/brosur, persiapan hadits, dua tombol manual, Browser Input vMix terpisah, serta pemeriksaan jika lower third tidak muncul. Pengujian browser lokal tidak menggantikan pemeriksaan akhir pada vMix dan jaringan operator.
- **Langkah berikutnya:** revisi desain template lower third setelah kebutuhan visual ditentukan. Template tambahan bersifat opsional dan tidak menambah kontrol penayangan.
- **Revisi alur Hide:** sesuai perubahan kebutuhan operator, Hide kini mereset mode server ke Arab dan menonaktifkan tombol Terjemah beserta highlight-nya. Show berikutnya menampilkan Arab terlebih dahulu. Pengujian API diperbarui untuk memastikan Hide → Show kembali ke Arab dan perintah Terjemah ditolak saat tersembunyi. `npm test` lulus 22/22; hasil E2E sebelumnya dalam arsip memakai aturan lama.
