**Sumber untuk fitur pencarian hadits**

Sesuai permintaan pengguna, koleksi **Brosur Ahad Pagi** dan **Kitab Hadits** adalah dua sumber terpisah. Pencarian berfokus pada hadits: teks Arab, arti/terjemahan Indonesia, riwayat atau nama kitab, dan nomor hadits jika tersedia. Keterangan derajat bersifat opsional.

| Kelompok | File asli | Hasil pengolahan |
|---|---|---|
| `brosur` — Brosur Ahad Pagi | `hadits/Brosur Ahad Pagi 1995 - 2024.chm` | `tools/hadits-audit/` |
| `kitab` — Kitab Hadits | 10 CHM dalam `hadits/Kitab Hadits/` | Folder tersendiri per `source_id` di `tools/hadits-kitab-audit/` ketika diproses |

Daftar sumber resmi untuk proyek ini ada di `hadits/sources.json`. Setiap file memiliki ID stabil, jalur asli, ukuran, dan checksum SHA-256. Judul dalam manifest berasal dari nama file; penerbit, edisi, sistem penomoran, dan kelengkapan setiap kitab belum dipastikan.

**Ketentuan pemisahan untuk pengembangan berikutnya**

- Setiap dokumen dan entri hadits wajib mempunyai `source_group`, `source_id`, dan `source_path` yang menunjuk halaman sumbernya.
- Pencarian menggunakan pilihan sumber **Kitab Hadits** atau **Brosur Ahad Pagi**. Kedua kelompok memiliki kumpulan hasil masing-masing.
- Hasil dari kelompok kitab tetap menampilkan nama file/koleksi asal. Sebuah CHM kumpulan dapat berisi beberapa kitab; identitas kitab di dalamnya perlu dicatat tersendiri setelah diperiksa.
- Hadits yang mirip atau sama dari beberapa CHM tidak otomatis digabung atau ditimpa. Nomor hadits saja tidak menjadi identitas unik.
- Teks Arab, terjemahan, penomoran, dan penilaian suatu sumber tidak otomatis dilengkapi menggunakan sumber lain. Hubungan antarriwayat hanya dicatat setelah pemeriksaan dengan mempertahankan asal masing-masing.
- Simpan rujukan asli. Jika nomor hadits tidak ada, tampilkan rujukan yang tersedia, misalnya kitab/juz/halaman. Nomor halaman, nomor brosur, dan urutan file tidak menjadi nomor hadits.
- Kata “shahih” pada nama berkas atau nama kitab tidak otomatis menjadi label derajat setiap entri. Jika keterangan derajat tersedia, simpan bunyi penilaian, penilai bila disebutkan, dan rujukannya.
- Rujukan tafsir tidak disertakan dalam koleksi dan pencarian hadits.
- Dalam `KumpulanHadits-Digital.chm` ditemukan folder `quran/`. Jalur tersebut dicatat sebagai pengecualian impor hadits; arsip ini memerlukan pemilahan isi.

**Inventaris kitab**

Kesepuluh CHM dapat dibaca sebagai arsip. Ukuran file aslinya total 99.364.994 byte (sekitar 99,4 MB). Listing awal menunjukkan 27.767 halaman HTML; jumlah ini bukan jumlah hadits unik dan mencakup halaman pendukung serta isi lain. Total ukuran entry arsip sebelum kompresi sekitar 448 MB, termasuk aset dan metadata. Ekstraksi untuk pencarian sudah dijalankan; keterbatasan dan status terbaru dijelaskan di bawah.

| Nama file CHM | Halaman HTML dalam arsip |
|---|---:|
| Himpunan Hadits Qudsi | 56 |
| Kitab-9-Imam | 16.726 |
| KumpulanHadits-Digital | 428 |
| shahih Bukhari | 3.718 |
| shahih Muslim | 1.755 |
| shahih sunan abu daud | 1.679 |
| shahih sunan ibnu majah | 1.385 |
| shahih sunan tirmidzi | 1.941 |
| sunan ad-darimi | 26 |
| Sunan Nasa'i | 53 |

Satu halaman bisa memuat banyak hadits, atau hanya indeks. Nama “shahih sunan” juga belum membuktikan bahwa berkas memuat seluruh kitab asal. Kelengkapan teks Arab, terjemahan, dan penomoran belum diaudit. Detail listing per sumber disimpan di `tools/hadits-kitab-audit/archive-inventory.json` dengan `source_group` dan `source_id`.

**Status**

Antarmuka pencarian tersedia melalui tombol **Hadits / F7**. Data lokal berada di `data/hadith/`, dipisahkan per `source_id`; katalog aktual beserta jumlah hasil ekstraksi ada di `data/hadith/catalog.json`. Berkas CHM asli tetap pada lokasi yang diberikan pengguna.

Pembangunan awal menghasilkan **91.143 entri kitab** dan **15.387 kutipan brosur**. Angka ini adalah entri hasil ekstraksi, bukan jumlah hadits unik atau jaminan kelengkapan. Riwayat yang sama dalam sumber berbeda tetap dipertahankan. Halaman indeks dan bagian yang pasangan Arab–terjemahannya tidak jelas dikecualikan. Kumpulan Hadits Digital baru menyumbang 5 kutipan bilingual yang lolos pemilahan; banyak bagian lainnya hanya memuat terjemahan. Sebanyak 198 entri Qudsi menggunakan gambar Arab asli.

CHM Sunan Nasa’i memiliki kegagalan dekompresi pada `6.Waktu-waktu Shalat.htm`; halaman tersebut tidak diindeks dan dicatat di `excluded_pages` dalam katalog. Judul `Mukhtashar Shahih Muslim` mengikuti isi berkas, dan nomor dari edisi itu tidak dikonversi menjadi nomor edisi lain. Derajat hadits tidak disimpulkan dari nama kitab.

Penggunaan, pembangunan ulang, dan batasan ekstraksi dijelaskan di `data/hadith/README.md`.
