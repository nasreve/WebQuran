# Pencarian hadits lokal

Buka melalui **Hadits** di toolbar, kartu **Pencarian Hadits** di sidebar, atau **F7**. Pilih **Kitab Hadits** atau **Brosur Ahad Pagi**. Pencarian awal menggunakan Shahih Bukhari; pilih rujukan lain atau Semua kitab sesuai kebutuhan. Ketik kata Indonesia, potongan Arab, atau nomor, lalu tekan Enter/Cari. Nomor mengikuti edisi sumber, bukan penomoran universal. Kata minimal 3 huruf; nomor satu digit diperbolehkan.

Klik hasil untuk membaca teks Arab dan terjemahan, menyimpan favorit, menyalin kutipan, memperbesar teks, atau membuka konteks halaman sumber. Teks Arab Qudsi yang berupa gambar ditampilkan apa adanya; penyalinan untuk entri tersebut hanya mencakup terjemahan dan rujukan. Favorit tersimpan di perangkat ini. Filter Tersimpan tetap mengikuti kelompok, rujukan, dan kata kunci yang dipilih. Escape menutup panel; F7 membukanya kembali. Pintasan operator tidak berjalan ketika panel pencarian menerima input.

## Struktur dan kualitas sumber

- `catalog.json`: daftar rujukan, kelompok, jumlah entri/halaman, ukuran, dan halaman arsip rusak yang dikecualikan.
- `<source_id>.json`: hasil ekstraksi per sumber, dengan ID stabil, `source_group`, `source_id`, `source_path`, judul/kitab, Arab, terjemahan, nomor eksplisit, referensi, catatan, serta tautan konteks.
- `reading/`: salinan konteks teks dari halaman sumber yang sudah dibersihkan dari skrip. Tampilan bukan reproduksi tata letak CHM.
- `assets/`: gambar Arab asli yang diperlukan pembaca.

Hasil ekstraksi belum diverifikasi satu per satu oleh penyunting. Halaman indeks, Quran, serta pasangan teks yang tidak jelas tidak disajikan sebagai hadits. Brosur dan artikel memerlukan rujukan HR yang berdekatan dengan kutipan. Penyaringan ini mengutamakan ketepatan dan dapat melewatkan kutipan yang formatnya berbeda. Riwayat dan nomor tidak dilengkapi dari sumber lain. Catatan yang tersedia dipertahankan, tetapi aplikasi tidak menetapkan derajat atau menganggap setiap isi kitab berjudul “Shahih” sebagai penilaian individual. Baca konteks sumber sebelum mengutip.

## Pembangunan ulang

Jalankan dari folder proyek dengan Python 3.9+:

```text
python tools/build_hadith_data.py
```

Gunakan ID sebagai argumen untuk membangun ulang sumber tertentu, misalnya:

```text
python tools/build_hadith_data.py kitab-shahih-bukhari
```

Skrip membaca manifest `hadits/sources.json`, menggunakan 7-Zip dengan dukungan CHM (`EXTRACTOR` di skrip dapat disesuaikan), dan mengekstrak kitab ke folder audit per sumber. Brosur memakai hasil ekstraksi `tools/hadits-audit/extracted`. Berkas asli tidak diubah. Jika CHM diganti, ekstraksi harus diperbarui sebelum indeks dibangun ulang. Folder `data/hadith` diperlukan aplikasi dan ikut dalam paket Electron; folder `tools` dikecualikan dari paket.

Pencarian menggunakan Web Worker, memuat rujukan saat dibutuhkan, menormalkan harakat serta variasi ejaan dasar, mencocokkan seluruh kata kunci, dan menampilkan 40 hasil per halaman. Pembacaan pertama “Semua kitab” memuat koleksi besar; pilih satu kitab untuk penggunaan memori lebih ringan. Konten tidak dikirim ke layanan pencarian luar.

## Pemeriksaan

```text
npm test
python tools/hadith_extract_test.py
```

Pengujian mencakup pencarian Arab/Indonesia, nomor eksplisit, pemisahan kelompok, pemuatan hasil lanjutan, favorit, keamanan penanda teks, dan pemilahan kutipan. Antarmuka berjalan melalui server lokal aplikasi Electron; gunakan `npm start`.
