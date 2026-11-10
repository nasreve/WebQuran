**Hasil pemeriksaan CHM Brosur Ahad Pagi 1995–2024**

File ini dapat digunakan sebagai sumber koleksi kajian tematik dan bahan penyusunan pencarian ayat/hadits. Pemeriksaan mencakup ekstraksi arsip, inventaris seluruh HTML, pemeriksaan tautan daftar isi, dan pembacaan beberapa sampel. Ini bukan verifikasi ilmiah seluruh hadits atau penilaian atas kebenaran setiap penjelasan dalam brosur.

Kop brosur yang diperiksa bertuliskan **Majlis Tafsir Al-Qur'an (MTA) Pusat**. Identitas brosur dan lembaga perlu tetap dicantumkan ketika isinya disajikan kembali.

| Hasil inventaris | Jumlah |
|---|---:|
| File CHM asli | 20.522.239 byte, sekitar 20,5 MB |
| File hasil ekstraksi | 1.531 |
| Halaman HTML | 1.442 |
| Halaman langsung dalam folder tahun dengan nama berformat tanggal | 1.392 |
| HTML lainnya: indeks, pendukung, dan halaman tanpa pola tanggal tersebut | 50 |
| Rentang tanggal dari nama file | 12 Februari 1995–29 Desember 2024 |
| Target unik daftar isi | 1.424; semuanya ditemukan setelah decoding URL |
| Ukuran seluruh hasil ekstraksi | sekitar 92,9 MB |
| Teks UTF-8 dari halaman bertanggal | sekitar 26,4 MB, sebelum indeks pencarian |
| Halaman bertanggal dengan lebih dari 20 karakter Arab | 1.377 |

Jumlah 1.392 adalah jumlah halaman bertanggal, **bukan jumlah hadits unik**. Di dalamnya ada pengumuman bergambar, materi berulang, dan beberapa halaman bertanggal sama. Contoh satu halaman bergambar adalah 27 Desember 2015 (Silatnas). Jumlah riwayat unik baru bisa dihitung setelah pemisahan kutipan dan pencocokan antarhalaman.

**Contoh rujukan dan derajat yang benar-benar ditemukan**

| Brosur | Isi yang relevan | Implikasi pengolahan |
|---|---|---|
| [26 Februari 1995, Shalat 'Ied](</D:/8. PROJECT PERCEPATAN/Webquran v5/tools/hadits-audit/extracted/1995/19950226.htm>) | “HR. Baihaqi dan Hakim. Dlaif, mauquf dalam Nailul Authar” | Ada keterangan eksplisit, tetapi identitas penilai dan rujukan rinci belum lengkap pada kutipan ini. |
| [16 April 1995, Thaharah ke-1](</D:/8. PROJECT PERCEPATAN/Webquran v5/tools/hadits-audit/extracted/1995/19950416.htm>) | “Tirmidzi berkata: Ini adalah hadits hasan shahih” | Nama penilai dan bunyi penilaiannya dapat disimpan bersama kutipan. |
| [20 November 2005, Shalat Sunnah ke-1](</D:/8. PROJECT PERCEPATAN/Webquran v5/tools/hadits-audit/extracted/2005/20051120.htm>) | Pembahasan menyebut ada yang menganggap hasan/mengesahkan, ada yang melemahkan, dan Ibnu Taimiyah menganggapnya maudlu'; rujukan Zaadul Ma'aad juz 1, hal. 311. | Harus mendukung beberapa penilaian dan mempertahankan konteks pembahasan. |
| [10 Februari 2008, Kedudukan Hadits-hadits Fadlilah Yaasiin ke-5](</D:/8. PROJECT PERCEPATAN/Webquran v5/tools/hadits-audit/extracted/2008/20080210.htm>) | “Hadits ini dla'if, bahkan Al-Albaniy mengatakannya maudlu' (palsu)”; disertai rujukan Silsilatul Ahaadiitsidl Dla'iifah juz 3, hal. 397, no. 1246. | Contoh keterangan dengan nama penilai dan lokasi sumber. Belum dicocokkan secara independen dengan kitab tersebut. |
| [16 Mei 2010, Khitan](</D:/8. PROJECT PERCEPATAN/Webquran v5/tools/hadits-audit/extracted/2010/20100516.htm>) | Ada keterangan dla'if, sanad munqathi', dan nama Ibnul Qaththan; rujukan Talkhiishul Habiir juz 4, hal. 223, no. 1806. | Perlu membedakan penilaian hadits, sanad, dan perawi. |
| [17 Maret 2024, Shalatul Lail](</D:/8. PROJECT PERCEPATAN/Webquran v5/tools/hadits-audit/extracted/2024/20240317_SHALATUL_LAIL.htm>) | “HR. Tirmidzi juz 1, hal. 278, no. 447, ia berkata: Ini hadits shahih, gharib” | Contoh data terbaru dengan nomor riwayat dan penilaian eksplisit. |

Isi dan ejaan kutipan di atas merujuk brosur; beberapa spasi/ejaan tanda petik disederhanakan untuk laporan. Label penilaian dalam aplikasi perlu menyebut “menurut keterangan brosur”, dengan status verifikasi sumber terpisah.

**Hal yang perlu ditangani sebelum menjadi database hadits**

- Halaman memadukan ayat, hadits, terjemahan, dan pendapat/penjelasan penulis. Keempatnya harus dipisahkan sambil mempertahankan urutan dan konteks.
- Tidak semua riwayat memuat derajat, nama penilai, atau nomor hadits. Beberapa hanya memuat kitab, juz, dan halaman. Nomor edisi berbeda tidak boleh disamakan berdasarkan angka saja.
- Penyebutan “Ibnu Hibban di dalam shahihnya” menyebut kitab. Istilah “sumpah palsu” dan “saksi palsu” membahas isi hadits. Kata-kata tersebut tidak dapat dijadikan label derajat secara otomatis.
- Penjelasan seperti “hadits no. 1, 2, 3” harus ditautkan ke kutipan pada halaman yang sama. Derajat tidak boleh dipindahkan ke riwayat lain hanya karena teksnya mirip.
- Banyak halaman merupakan HTML hasil ekspor Word. Spasi, baris, serta nomor yang terpecah perlu dibersihkan dengan pembandingan terhadap sumber.
- Encoding halaman terdiri dari 1.155 Windows-1256 dan 287 UTF-8 dengan BOM. Setelah decoding, tidak ditemukan karakter pengganti Unicode dalam hasil teks; ini belum menjamin seluruh ejaan sudah benar.
- Sampel teks Arab dapat dibaca sebagai karakter Arab, sehingga OCR tidak diperlukan untuk sampel tersebut. Halaman pengumuman bergambar perlu diperlakukan tersendiri.
- Teks hasil ekstraksi tanggal 23 dan 30 Desember 2018 identik. Materi cetak ulang lain mungkin masih ada; satu pasangan ini bukan hasil deduplikasi seluruh hadits.

Sebagai indikator lokasi pemeriksaan, dari 1.392 halaman bertanggal ditemukan penanda QS pada 819 halaman dan HR pada 1.148 halaman. Kata shahih ada pada 468 halaman, hasan 546, variasi dhaif 362, maudhu/maudlu 21, dan palsu 52. Angka ini menghitung **halaman yang menyebut kata**, bukan jumlah hadits dengan derajat tersebut. Metode ini juga tidak menangkap semua kemungkinan penulisan rujukan.

**Pengembangan yang paling sesuai**

Mulai dengan pencarian kajian tematik: hasil menampilkan judul, tanggal, kutipan yang cocok, dan halaman sumber. Setelah itu, hubungkan referensi QS ke database Quran yang sudah ada. Pencarian hadits per riwayat dapat ditambahkan setelah batas kutipan, terjemahan, rujukan, dan keterangannya diperiksa.

Untuk entri hadits, simpan teks Arab, terjemahan, referensi riwayat asli, halaman/paragraf sumber, serta daftar penilaian (bunyi penilaian, nama penilai, rujukan, dan status verifikasi). Jika keterangan tidak ada, tampilkan “Derajat belum tersedia”.

Dengan arsip ini, prototipe pencarian teks/tema diperkirakan 3–7 hari kerja setelah cakupan disepakati. Waktu pemisahan seluruh hadits dan pemeriksaan derajat belum dapat ditentukan hanya dari inventaris ini. Ukuran teks sekitar 26,4 MB mendukung pendekatan pencarian offline; kebutuhan indeks dan memori harus diukur pada implementasi.

**Berkas hasil pemeriksaan**

- `extracted/`: HTML dan aset hasil ekstraksi; CHM asli tidak diubah.
- `inventory.json`: statistik, daftar tahun, indikator, dan batasan audit.
- `pages.jsonl`: teks hasil parsing dengan judul, jalur sumber, encoding, dan metadata untuk 1.442 HTML. Ini bahan audit, belum database hadits terverifikasi.
- `audit_chm.py`: skrip inventaris yang dapat dijalankan kembali setelah ekstraksi tersedia.

Ekstraksi memakai alat bawaan Windows `hh.exe -decompile` dengan nama/path relatif tanpa spasi setelah percobaan memakai path panjang tidak menghasilkan file. Hasil disimpan di folder `tools`, yang sudah dikecualikan dari paket aplikasi oleh konfigurasi proyek. Fitur aplikasi belum diubah atau ditambahkan pada pemeriksaan ini.
