# PANDUAN INSTALASI — SI-PRO v2.3

Sistem Informasi Pendidikan dan Pelatihan · SPN Polda Papua Barat

Arsitektur:

```
[ Browser HP/Komputer ]  →  GitHub Pages (index.html, css/, js/)
          │  fetch() JSON
          ▼
[ Google Apps Script — Kode.gs ]  →  Google Sheets (database) + Google Drive (PDF SPRIN/SPPD)
```

Yang Anda terima:

| Berkas | Untuk apa |
|---|---|
| `Kode.gs` | Backend. Disalin-tempel ke editor Apps Script (**berubah di v2.3**) |
| `appsscript.json` | Manifest Apps Script (zona waktu WIT & izin) |
| `si-prolat.zip` | Frontend untuk GitHub Pages (isi ZIP = isi repository) |
| `PANDUAN-INSTALASI.md` | Dokumen ini |

Urutan kerja: **A → C → D**. Total ±30 menit. Login memakai **username + password** (tidak perlu akun Google bagi petugas, tidak perlu Google Cloud Console).

> **Sudah memasang v2.2 / v2.2.1?** Perbarui **keduanya** (Kode.gs → Deploy versi baru; frontend → `git push`). Tidak perlu otorisasi ulang. Saat aplikasi pertama kali dibuka, server otomatis menetralkan rumus yang mungkin sudah tersisip dan mengunci ulang sheet.
>
> **Perubahan v2.3 — hasil audit keamanan:**
> - **Celah "formula injection" ditutup (penting).** Sebelumnya, teks yang diawali `=` (mis. diketik di kolom *username* halaman masuk, tanpa perlu login) tersimpan ke sheet sebagai **rumus Google Sheets** yang bisa mengirim isi database ke situs luar ketika spreadsheet dibuka. Kini semua teks diawali `= + - @ '` disimpan sebagai teks biasa di **setiap** penulisan ke sheet, dan rumus lama yang terlanjur tersisip dinetralkan otomatis. Ekspor CSV juga diamankan (tidak dijalankan Excel sebagai rumus).
> - **Admin hanya bisa membuka berkas milik SI-PRO**, bukan berkas Google Drive lain milik akun pemilik.
> - **Halaman masuk tidak lagi membocorkan username yang ada** (akun tanpa password dijawab sama seperti password salah).
> - **Hasil permintaan berulang (idempoten) terikat ke pengguna**, tidak bisa diambil akun lain.
> - **Fungsi editor baru `bukaKunciLogin('username')`** untuk membuka kunci login 15 menit, mis. bila akun Admin sengaja dikunci orang lain dengan password salah berkali-kali.
>
> **Sudah memasang v2.1?** Perbarui **keduanya**: (1) ganti seluruh isi `Kode.gs` → **Deploy → Kelola deployment → ✏️ Edit → Versi: Versi baru → Deploy**; (2) ganti isi folder frontend dengan isi `si-prolat.zip`, isi lagi `GAS_URL`, lalu `git add .` → `git commit -m "v2.2"` → `git push`. Setelah itu masuk sebagai Admin Induk → **Kelola Master → Keamanan → Amankan Sekarang**.
>
> **Perbaikan v2.2.1:** di server asli, panel Keamanan sempat menampilkan *TIDAK DIKETAHUI* dan *0/10 terkunci* karena fungsi pengecekan memakai izin Google (`userinfo.email`) yang tidak ada di `appsscript.json`. Kini email pemilik dibaca dari pemilik spreadsheet (izin Drive yang sudah ada) dan folder dicek dengan fungsi folder. Setelah `Kode.gs` 2.2.1 dipasang, sheet **dikunci otomatis** saat aplikasi pertama kali dibuka; lalu tekan **Amankan Sekarang** agar spreadsheet & folder menjadi Privat. Tidak perlu otorisasi ulang.
>
> **Perubahan v2.2 — Row Level Security (RLS) & pengamanan database:**
> - **Google Sheets tidak punya tombol "Row Level Security"** seperti Supabase/PostgreSQL, jadi RLS dipasang di server Apps Script — satu-satunya pintu ke database. Hasilnya setara: setiap baris di setiap tabel diperiksa kebijakannya **sebelum** dibaca, ditambah, diubah, atau dihapus. RLS **selalu aktif** dan tidak dapat dimatikan dari aplikasi.
>   - **Tolak-bawaan:** tabel tanpa kebijakan tidak bisa disentuh pengguna.
>   - **Diperiksa di lapisan terbawah** (fungsi tulis sheet), jadi walaupun ada celah di fitur mana pun, petugas tetap **tidak bisa** mengubah/menghapus/menambah peserta Satker lain, memindahkan peserta ke Satker lain, menaikkan perannya menjadi Admin, atau mengubah pelatihan, kuota, pengumuman, dan Pangkalan Data.
>   - **Kolom rahasia** (`Password_Hash`, `Salt`, `Folder_ID`) dibuang dari setiap respons server.
>   - **Pelanggaran dicatat** di Log sebagai `RLS_DITOLAK` dan tampil di panel Keamanan.
>   - Petugas tidak bisa mencetak laporan pelatihan yang belum dibagikan ke Satker-nya.
> - **Spreadsheet & folder Drive dikunci.** Semua sheet diberi proteksi (hanya server/akun pemilik yang bisa mengubah, termasuk bila spreadsheet tak sengaja dibagikan). Tombol **Amankan Sekarang** juga mematikan "siapa saja yang memiliki link" pada spreadsheet & folder berkas. Bisa juga dijalankan dari editor: fungsi `amankanDatabase()`.
> - **Password lebih kuat:** hash berulang + salt per akun + **pepper** (kunci rahasia di Script Properties `PWD_PEPPER`). Isi sheet `Pengguna` saja tidak cukup untuk menebak password. Akun lama dinaikkan otomatis saat login berikutnya (tanpa perlu ganti password).
> - **Pengamanan lain:** perbandingan token waktu-konstan, kunci sesi dibangkitkan secara kriptografis (fungsi `rotasiKunciSesi()` untuk mengeluarkan semua sesi bila curiga bocor), batas ukuran permintaan 12 MB, galat internal tidak dibocorkan ke petugas (cukup kode laporan), dan di browser: **Content-Security-Policy** (hanya skrip SI-PRO & server Apps Script yang boleh jalan — menangkal XSS), anti-iframe/clickjacking, tanpa referrer.
> - **Panel baru: Kelola Master → Keamanan** — status RLS, tabel kebijakan per tabel (Admin vs Petugas), status berbagi spreadsheet & folder, jumlah sheet terkunci, status hash password, proteksi login, dan daftar akses yang ditolak RLS 30 hari terakhir.
> - **Tetap wajib dijaga sendiri:** jangan bagikan spreadsheet/folder/proyek Apps Script ke orang lain; aktifkan **Verifikasi 2 Langkah** pada akun Google pemilik; deployment tetap *Jalankan sebagai: Saya*.
>
> **Sudah memasang v2.0?** Perbarui **keduanya**: (1) ganti seluruh isi `Kode.gs` → **Deploy → Kelola deployment → ✏️ Edit → Versi: Versi baru → Deploy**; (2) ganti isi folder frontend dengan isi `si-prolat.zip`, isi lagi `GAS_URL`, lalu `git add .` → `git commit -m "v2.1"` → `git push`. Tidak ada sheet/kolom baru.
>
> **Perubahan v2.1 — kuota & petugas selalu sinkron:**
> - **Penyebab utama "kuota sudah diatur tapi petugas tidak bisa mengisi":** pelatihan masih berstatus **DRAFT** (kuota disimpan dengan *Simpan Kuota* tetapi belum *Bagikan*). Petugas hanya melihat pelatihan yang sudah **dibagikan**. Kini hal ini dicegah:
>   - Jendela **Atur Kuota** pelatihan Draft memakai tombol utama **Simpan & Bagikan** yang menyimpan kuota **dan** membagikan dalam **satu langkah** di server (tidak bisa setengah jalan). *Simpan Draft* tetap ada bila belum ingin dibagikan, dan pesannya menegaskan "petugas belum dapat melihatnya".
>   - Di Kelola Master → Pelatihan, baris Draft diberi keterangan **Belum dibagikan** / **Belum ada kuota**.
> - **Atur Kuota: centang dulu, lalu isi kuota.** Langkah 1 centang Satker Polda / Polres yang mengikuti (per baris, per kelompok, atau tombol *Semua Satker Polda* / *Semua Polres*); langkah 2 kolom kuota baru terbuka untuk Satker yang dicentang (isi satu per satu atau *Kuota untuk yang dicentang → Terapkan*). Satker yang tidak dicentang otomatis tanpa kuota. Tombol simpan terkunci bila ada Satker tercentang yang kuotanya belum diisi. Ringkasan di bawah menampilkan jumlah tercentang, total kuota, dan Satker yang **belum punya akun petugas**. Satker yang sudah mendaftarkan peserta tidak bisa dilepas centangnya.
> - **Formulir Input Peserta (petugas) mengambil data terbaru dari server setiap dibuka**, sehingga kuota/pelatihan yang baru dibagikan langsung muncul. Bila belum ada pelatihan, kotak kuning menjelaskan **alasannya** (belum dibagikan / batas pendaftaran lewat / sudah selesai), menampilkan **ID Satker** petugas (untuk dicocokkan Admin), dan tombol **Periksa ulang**; begitu pelatihan tersedia, formulir aktif dengan sendirinya.
>
> **Sudah memasang v1.9?** Perbarui **keduanya**: (1) ganti seluruh isi `Kode.gs` → **Deploy → Kelola deployment → ✏️ Edit → Versi: Versi baru → Deploy** (URL tetap sama); (2) ganti isi folder frontend dengan isi `si-prolat.zip`, isi lagi `GAS_URL` di `js/config.js`, lalu `git add .` → `git commit -m "v2.0"` → `git push`. Sheet baru `Pengumuman` dibuat **otomatis** saat aplikasi pertama kali dibuka.
>
> **Perubahan v2.0:**
> - **Pengumuman pembukaan diklat (Diktukba, Dikbangspes, Prolat).** Menu baru **Pengumuman** untuk Admin Induk dan Petugas.
>   - *Admin Induk:* **Buat Pengumuman** → isi judul, kategori, tanggal pendaftaran dibuka, tanggal pelaksanaan, tempat, isi (persyaratan, kontak, dll.). Bisa **diambil dari pelatihan** yang sudah dibuat (judul, tanggal, tempat, dan Satker berkuota terisi otomatis). Pilih **Dibagikan kepada**: semua Satker & Polres, semua Satker Polda, semua Polres, atau Satker/Polres pilihan. Simpan sebagai *Draft* atau langsung **Bagikan**; setelah dibagikan muncul daftar petugas tiap Satker dengan tombol **WhatsApp** dan **Salin Pesan Massal**. Pengumuman bisa *Tarik* (kembali Draft), *Edit*, dan *Hapus*.
>   - *Halaman masuk:* pengumuman yang dicentang **Tampilkan di halaman masuk** muncul di bawah formulir masuk (bergantian otomatis, tombol *Lihat semua*), di laptop maupun HP — tetap satu layar tanpa digulir. Yang tampil hanya judul, kategori, tanggal, tempat, dan isi; daftar Satker sasaran tidak ditampilkan.
>   - *Petugas Satker:* melihat pengumuman yang ditujukan ke Satker-nya di menu **Pengumuman** (penanda **BARU** + angka di menu) dan pita pengumuman di **Beranda**, lengkap dengan hitung mundur ("Pendaftaran dibuka 6 hari lagi"). Bila pengumuman terkait pelatihan yang sudah dibagikan ke Satker-nya, ada tombol **Daftarkan Peserta**.
>   - Pengumuman otomatis hilang setelah tanggal **Tampil sampai** (atau tanggal selesai pelaksanaan) lewat.
> - **Hapus pelatihan yang sudah dibagikan / selesai** (Kelola Master → Pelatihan, tombol 🗑 Hapus). Bila pelatihan sudah punya peserta, jendela konfirmasi menyebut jumlahnya; peserta beserta berkas SPRIN/SPPD (yang tidak dipakai peserta lain) ikut terhapus. Tombol *Kirim Info* kini berlabel *Info*.
> - **Impor Pangkalan Data: menu Jenis pelatihan.** Pilih **Kategori → Jenis pelatihan → Tahun**, lalu unggah berkas yang cukup berisi daftar personel (Nama, NRP/NIP, Pangkat, Jabatan, Satker/Polres). Semua baris dicatat untuk jenis pelatihan tersebut. Pilihan jenis berisi pelatihan di SI-PRO dan nama diklat yang sudah ada di Pangkalan Data, atau **+ Jenis pelatihan baru**. Tombol **Unduh Template** menyesuaikan: bila jenis dipilih, template hanya berisi kolom personel. Pilih *Ikuti kolom "Nama Diklat" di berkas* untuk berkas campuran banyak jenis.
>
> **Sudah memasang v1.8?** Perbarui **keduanya**:
> 1. Ganti seluruh isi `Kode.gs` → **Deploy → Kelola deployment → ✏️ Edit → Versi: Versi baru → Deploy** (URL tetap sama).
> 2. Ganti isi folder frontend dengan isi `si-prolat.zip`, isi lagi `GAS_URL` di `js/config.js`, lalu `git add .` → `git commit -m "v1.9"` → `git push`.
>
> Saat aplikasi pertama kali dibuka sesudah pembaruan, server **otomatis** menambah sheet baru `Pangkalan_Data` dan kolom `Kategori` di sheet `Pelatihan`. Pelatihan lama diberi kategori otomatis dari namanya (mengandung *Diktuk/Bintara* → Diktukba, *Dikbangspes/Spesialisasi* → Dikbangspes, selain itu Prolat); periksa & ubah bila perlu lewat **Kelola Master → Pelatihan → Edit**.
>
> **Perubahan v1.9:**
> - **Menu baru (Admin Induk): Pangkalan Data Pendidikan dan Pelatihan.** Berisi riwayat personel yang **sudah** melaksanakan **Diktukba**, **Dikbangspes**, dan **Prolat**, dengan tiga kartu kategori (jumlah personel per kategori), pencarian nama/NRP/NIP, filter nama diklat, tahun, dan Polda.
>   - **Otomatis dari aplikasi:** peserta pelatihan SI-PRO masuk ke Pangkalan Data setelah pelatihannya **Selesai** (atau tanggal selesainya lewat), sesuai **Kategori** pelatihan. Kategori dipilih saat membuat/mengubah pelatihan.
>   - **Riwayat lama:** tombol **Tambah Riwayat** (satu per satu) atau **Impor Excel** (banyak sekaligus, `.xlsx` atau `.csv`). Unduh template dari jendela impor. Sebelum disimpan tampil pratinjau: baris siap disimpan, yang sudah ada (dilewati), dan yang salah beserta nomor barisnya. Impor aman diulang — data yang sama tidak tercatat dua kali (kunci: NRP + kategori + nama diklat + tahun).
>   - Tombol **Riwayat** menampilkan seluruh riwayat Diktukba, Dikbangspes, dan Prolat seorang personel dalam satu jendela.
>   - **Unduh Excel** rapi, urut abjad, mengikuti kategori, kesatuan, dan filter yang aktif.
>   - Riwayat dari aplikasi tidak bisa diedit/dihapus di sini (ubah lewat Data Peserta); riwayat manual/impor bisa diedit dan dihapus (juga hapus massal).
> - **Kiriman Satker Polda dan Polres tidak lagi digabung:**
>   - *Data Peserta* (Admin) punya tab **Satker Polda | Polres** dengan jumlahnya masing-masing; filter Satker mengikuti tab.
>   - *Unduh Excel* peserta: sheet terpisah per pelatihan **dan** per pengirim (`Satker Polda - …`, `Polres - …`), sheet *Ringkasan* memuat kolom Pengirim.
>   - *Rekapitulasi*: tabel per Satker dikelompokkan **A. Pengiriman Satker Polda** dan **B. Pengiriman Polres** (lalu per Polda); tabel per jenis pelatihan memakai kolom *Satker Polda* dan *Polres*.
>   - *Belum Mengirim*: daftar dikelompokkan Satker Polda lalu Polres, termasuk pesan pengingat massal.
>   - *Laporan PDF* (nominatif, rekap, belum mengirim): bagian **A. Satker Polda** dan **B. Polres** dengan penomoran masing-masing, subtotal per kelompok, dan jumlah keseluruhan.
>
> **Sudah memasang v1.7?** Cukup perbarui frontend: ganti isi folder frontend dengan isi `si-prolat.zip`, isi lagi `GAS_URL` di `js/config.js`, lalu `git add .` → `git commit -m "v1.8"` → `git push`. `Kode.gs` tidak berubah.
>
> **Perubahan v1.8:** gambar halaman masuk diganti (*Selamat Datang Aplikasi SI-PRO*) · animasi elegan: gambar masuk perlahan dengan kilau emas yang melintas berkala, formulir masuk meluncur dari kanan, tombol Masuk berpendar lembut; di dalam aplikasi menu & bilah atas masuk bertahap, kartu/tabel muncul berurutan saat pindah menu, angka statistik menghitung naik, batang progres tumbuh, grafik cincin berputar masuk, jendela dialog & notifikasi muncul halus, efek kilau saat kursor di atas tombol utama. Animasi singkat (≤ 1 detik), hanya saat pindah menu — tidak memperlambat simpan/hapus — dan otomatis dimatikan bila perangkat diatur "kurangi gerakan".
>
> **Sudah memasang v1.6?** Perbarui keduanya: (1) ganti seluruh isi `Kode.gs` → **Deploy → Kelola deployment → ✏️ Edit → Versi baru → Deploy**; (2) ganti isi folder frontend dengan isi `si-prolat.zip`, isi lagi `GAS_URL`, lalu `git add .` → `git commit -m "v1.7"` → `git push`. Tidak ada kolom sheet yang berubah.
>
> **Perubahan v1.7:**
> - **Hapus akun petugas** (Kelola Master → Pengguna, tombol 🗑). Akun langsung terhapus dan sesinya terputus; data peserta yang pernah diinput akun itu **tetap tersimpan**. Akun sendiri dan Admin Induk aktif terakhir tidak bisa dihapus.
> - **Pendaftaran kolektif (Petugas):** menu *Input Peserta* kini berupa daftar — pilih pelatihan, isi baris peserta, tekan **Tambah Peserta** (atau Enter di kolom Jabatan) untuk baris berikutnya, lalu simpan semuanya sekaligus. Tiap baris boleh memilih pelatihan berbeda; ringkasan kuota per pelatihan tampil di bawah daftar dan tombol simpan terkunci bila melebihi kuota.
> - **Satu kali unggah SPRIN & SPPD untuk semua peserta di daftar** (mis. 4 pelatihan dengan tanggal sama → cukup satu SPRIN & satu SPPD). Bila SPRIN dan SPPD sudah digabung jadi satu PDF, centang **SPRIN & SPPD dalam satu PDF** dan unggah sekali saja. Berkas bersama dinamai `[ID_Satker]_SPRIN_BERSAMA_[tanggal]_[n]-peserta.pdf` dan **tidak dibuang** saat salah satu pesertanya dihapus — baru dibuang setelah tidak dipakai peserta mana pun.
> - Mengubah satu peserta tetap lewat tombol **Edit** di Data Peserta (formulir per orang); mengganti berkas di sana hanya berlaku untuk peserta itu.
>
> **Sudah memasang v1.5?** Perbarui keduanya: (1) ganti seluruh isi `Kode.gs` → **Deploy → Kelola deployment → ✏️ Edit → Versi baru → Deploy** (URL tetap sama); (2) ganti isi folder frontend dengan isi `si-prolat.zip`, isi lagi `GAS_URL`, lalu `git add .` → `git commit -m "v1.6"` → `git push`. Data tidak berubah. Folder Drive & spreadsheet yang sudah ada tetap bernama lama (`SI-PROLAT…`) dan tetap dipakai — tidak perlu diganti.
>
> **Perubahan v1.6:** nama aplikasi menjadi **SI-PRO** (Sistem Informasi Pendidikan dan Pelatihan) di seluruh tampilan, pesan WhatsApp, laporan PDF, dan berkas Excel/CSV · halaman masuk tanpa baris "Polda Papua Barat & Polda Papua Barat Daya" dan tanpa kotak keterangan akses · di HP: gambar SPN lalu langsung kolom Username, Password, dan tombol Masuk — muat satu layar tanpa digulir.
>
> **Sudah memasang v1.4?** Cukup perbarui frontend: ganti isi folder frontend dengan isi `si-prolat.zip` baru, isi lagi `GAS_URL` di `js/config.js`, lalu `git add .` → `git commit -m "v1.5"` → `git push`. `Kode.gs` **tidak berubah** (boleh tetap diganti, hasilnya sama).
>
> **Perubahan v1.5:**
> - **Hapus seketika.** Baris peserta hilang dari layar ±1 ms setelah menekan *Ya, hapus*, dan notifikasi berhasil langsung tampil. Hapus Satker, hapus Pelatihan, Aktif/Nonaktif akun, dan Tandai Selesai/Buka kembali pelatihan kini juga langsung berubah di layar (sebelumnya menunggu server lalu memuat ulang seluruh data). Konfirmasi ke server berjalan di latar; bila server menolak, data dikembalikan otomatis dan muncul pesan merah.
> - **Halaman masuk baru:** gambar *SI-PRO SPN Polda Papua Barat* tampil utuh di kiri, formulir masuk di kanan (tidak menutup gambar). Di HP gambar di atas, formulir di bawahnya. Gambar ada di `img/login-hero.jpg` — ganti berkas itu (nama sama) bila ingin memakai gambar lain.
>
> **Sudah memasang v1.3?** Cukup 2 langkah: (1) ganti seluruh isi `Kode.gs` → **Deploy → Kelola deployment → ✏️ Edit → Versi: Versi baru → Deploy** (URL tetap sama); (2) ganti isi folder frontend dengan isi `si-prolat.zip` baru, isi lagi `GAS_URL` di `js/config.js`, lalu `git add .` → `git commit -m "v1.4"` → `git push`. Tidak ada kolom sheet yang berubah. Saat aplikasi pertama kali dibuka sesudah pembaruan, server memastikan pemicu waktu `flushLogs` (5 menit) ada — pemicu ini sekarang juga mengerjakan tugas latar (penamaan/pemindahan berkas Drive & rekap `Status_Pengiriman`).
>
> **Perubahan v1.4:**
> - **Lebih cepat saat simpan/ubah/hapus/unggah.** Data langsung tampil di tabel dan formulir langsung siap untuk entri berikutnya, sementara pengiriman berjalan di latar (penanda *"… data sedang disimpan"*). Bila server menolak, data ditarik kembali dan muncul pesan + tombol **Muat ke formulir**. Unggahan PDF tidak lagi antre di belakang pengguna lain, berkas langsung diberi nama akhir bila pelatihan & NRP sudah diisi, dan tabel master dibaca dari cache server.
> - **Pas layar tanpa digulir** di laptop/desktop (lebar ≥ 1024 px, tinggi ≥ 560 px): jumlah baris tabel menyesuaikan tinggi layar, sisanya lewat tombol halaman. Di laptop 1024–1279 px menu samping otomatis menjadi ikon. Di HP halaman tetap digulir seperti biasa.
> - **Kolom tabel Data Peserta dipisah:** No · Nama · NRP/NIP · Pangkat · Jabatan · Satker/Polres · Program Pelatihan · SPRIN · SPPD · Aksi.
> - **Unduh Excel (Admin Induk)** di Data Peserta: berkas `.xlsx` rapi (judul, header berwarna, garis tabel, kolom beku, filter, siap cetak A4 landscape), **urut abjad nama**, dan **mengikuti filter yang sedang aktif** (terutama Program Pelatihan). Tanpa filter pelatihan → satu sheet per pelatihan + sheet **Ringkasan**.
>
> **Sudah memasang v1.2?** Cukup 2 langkah: (1) ganti seluruh isi `Kode.gs` → **Deploy → Kelola deployment → ✏️ Edit → Versi: Versi baru → Deploy** (URL tetap sama); (2) ganti isi folder frontend dengan isi `si-prolat.zip` baru, isi lagi `GAS_URL` di `js/config.js`, lalu `git add .` → `git commit -m "v1.3"` → `git push`. Kolom foto profil (`Link_Foto`, `Foto_Thumb` di sheet `Pengguna`) dan folder Drive `Foto Pengguna` dibuat **otomatis**. Data peserta & berkas lama tidak berubah.
>
> **Perubahan v1.3:** teks teknis (status server, versi, breadcrumb, zona waktu, dsb.) dihapus dari tampilan · pas foto dipindah dari formulir peserta menjadi **foto profil Admin/Petugas** · menu **Input Peserta** hanya untuk Petugas Satker (Admin Induk memantau, tidak mengisi).
>
> **Sudah memasang v1.1 (login username + password)?** Cukup: ganti isi `Kode.gs` → **Deploy → Kelola deployment → ✏️ Edit → Versi baru → Deploy**, lalu ganti folder frontend dengan isi `si-prolat.zip` baru (isi lagi `GAS_URL`) dan `git push`. Sheet `Alokasi` serta kolom baru (`Jenis`, `Lokasi`, `Link_Foto`, dll.) dibuat **otomatis** saat aplikasi pertama kali dibuka. Pelatihan lama tetap berjalan tanpa kuota; untuk pelatihan baru gunakan alur kuota di Bagian D.
>
> **Masih memakai versi login Google?** Ikuti **Bagian B — Upgrade**.

---

## A. Backend (Google Apps Script)

Gunakan **satu akun Google pemilik** (mis. akun dinas Biro SDM). Semua data & berkas PDF tersimpan di Drive akun ini. Petugas **tidak** memerlukan akun Google.

1. Buka <https://script.google.com> → **Proyek baru**. Beri nama `SI-PRO`.
2. Hapus isi `Code.gs`, tempel seluruh isi **`Kode.gs`**, lalu simpan (Ctrl+S).
3. Tampilkan manifest: ⚙️ **Setelan proyek** → centang **"Tampilkan file manifes appsscript.json di editor"**. Kembali ke editor, buka `appsscript.json`, ganti seluruh isinya dengan berkas **`appsscript.json`**. Simpan.
4. Pilih fungsi **`setupAppEnvironment`** di dropdown → **▶ Jalankan** → **Tinjau izin** → pilih akun → *Lanjutan* → *Buka SI-PRO (tidak aman)* → **Izinkan**.
5. Buka **Log eksekusi**. Pastikan muncul `✅ Setup selesai!` dan bagian:
   ```
   🔑 AKUN ADMIN INDUK
      Username          : admin
      Password sementara: AbCd47xyZ
   ```
   **Catat password sementara itu.** Anda akan diminta membuat password baru saat login pertama.
   - ⚠️ Jangan jalankan `setupAppEnvironment` dua kali. Bila ada sheet terhapus, jalankan `perbaikiStruktur`.
6. **Deploy** → **Deployment baru** → ikon ⚙️ → **Aplikasi web**:
   - Jalankan sebagai: **Saya**
   - Yang memiliki akses: **Siapa saja**
   - Klik **Deploy** → salin **URL aplikasi web** (berakhiran `/exec`).

> "Siapa saja" diperlukan agar halaman di GitHub Pages bisa memanggil server. Keamanan tetap terjaga: setiap permintaan wajib membawa token login yang ditandatangani server, dan Petugas hanya bisa menyentuh data Satker-nya sendiri.

**Lupa password Admin?** Di editor Apps Script jalankan fungsi **`aturPasswordAdmin`** → Log eksekusi menampilkan password sementara baru untuk username `admin`.

---

## B. Upgrade dari versi login Google (bila sudah terpasang)

Data lama **tidak hilang**; sheet `Pengguna` hanya ditambah kolom `Username`, `Password_Hash`, `Salt`, `Wajib_Ganti`.

1. Editor Apps Script → buka `Kode.gs` → hapus semua isinya → tempel **`Kode.gs` versi baru** → simpan.
2. Ganti isi `appsscript.json` dengan berkas baru (izin lebih sedikit) → simpan.
3. Pilih fungsi **`aturPasswordAdmin`** → **▶ Jalankan** (izinkan bila diminta). Catat **Username** dan **Password sementara** di Log eksekusi.
4. **Deploy → Kelola deployment → ✏️ Edit → Versi: Versi baru → Deploy** (URL `/exec` tetap sama).
5. Ganti folder frontend dengan isi **`si-prolat.zip` baru**, isi lagi `GAS_URL` di `js/config.js` (tidak ada lagi `GOOGLE_CLIENT_ID`), lalu `git add .` → `git commit -m "Login username password"` → `git push`.
6. Masuk sebagai `admin` → buat password baru → **Kelola Master → Pengguna**. Petugas lama otomatis mendapat username dari bagian depan emailnya (tercantum di Log eksekusi langkah 3, bisa diubah lewat **Edit**). Klik **Reset** pada tiap petugas untuk membuat password sementara, lalu kirim slipnya via WhatsApp.

Proyek Google Cloud / OAuth Client ID yang sempat dibuat tidak dipakai lagi dan boleh dibiarkan.

---

## C. Frontend ke GitHub Pages

### C1. Isi konfigurasi
1. Ekstrak `si-prolat.zip`. Hasilnya folder **`si-prolat`** (atau `si-prolat (1)` bila diunduh berulang) yang langsung berisi `index.html`, `css/`, `js/`.
2. Buka `js/config.js` dengan Notepad, isi:
   ```javascript
   GAS_URL: 'https://script.google.com/macros/s/XXXX/exec',
   ```
   Simpan.

### C2. Sekali saja per komputer
1. Install Git: <https://git-scm.com/download/win> (pengaturan default). Cek di PowerShell: `git --version`.
2. Buat akun di <https://github.com> (username menjadi alamat situs: `username.github.io`).
3. Identitas Git:
   ```bash
   git config --global user.name "Nama Anda"
   git config --global user.email "email-akun-github@contoh.com"
   ```

### C3. Buat repository
Di github.com: **+ → New repository** → nama `si-prolat` → **Public** → **jangan** centang README/.gitignore/license → **Create**.

### C4. Push pertama — dari folder yang BENAR
Buka folder **`si-prolat`** (yang berisi `index.html`) di File Explorer → klik address bar → ketik `powershell` → Enter. Lalu:

```powershell
dir
```
**Wajib terlihat `index.html`, `css`, `js` di daftar.** Bila yang terlihat justru folder `si-prolat` lagi, jalankan `cd si-prolat` dulu. Jangan lanjut sebelum `index.html` terlihat.

Jalankan satu per satu:
```powershell
git init
git add .
git commit -m "Upload pertama SI-PRO"
git branch -M main
git remote add origin https://github.com/USERNAME/si-prolat.git
git push -u origin main
```
- **Username**: username GitHub.
- **Password**: **Personal Access Token**, bukan kata sandi akun. Buat di <https://github.com/settings/tokens> → *Generate new token (classic)* → centang **repo** → salin `ghp_…`. Saat ditempel, layar memang tidak menampilkan apa-apa — itu normal, tekan Enter.

### C5. Aktifkan Pages
Repository → **Settings → Pages** → Source **Deploy from a branch** → Branch **main** / **(root)** → **Save**. Centang **Enforce HTTPS**. Tunggu 1–2 menit hingga muncul *Your site is live at `https://USERNAME.github.io/si-prolat/`*.

### C6. Update di kemudian hari
```powershell
git add .
git commit -m "Update"
git push
```
Bila tampilan belum berubah: **Ctrl+Shift+R**.

---

## D. Uji & mulai pakai

1. Buka `https://USERNAME.github.io/si-prolat/` — muncul kartu login SI-PRO dengan logo Lemdiklat.
2. Masuk dengan username **`admin`** + password sementara dari Log eksekusi → buat password baru (min. 8 karakter, huruf & angka). Klik avatar di kanan atas → **Foto profil** untuk mengunggah foto Anda.
3. **Kelola Master → Satker / Polres**: periksa daftar Polres; tambahkan Satker Polda (Dit/Biro/Bid) dengan **Jenis = Satker Polda**.
4. **Kelola Master → Pengguna**: buat akun petugas untuk tiap Satker/Polres (username & password sementara otomatis; slip bisa dikirim via WhatsApp).
5. **Alur pelatihan (Kelola Master → Pelatihan & Kuota):**
   1. **Pelatihan Baru** — isi jenis pelatihan, tempat (default *SPN Polda Papua Barat*), tanggal pelaksanaan, dan batas pendaftaran. Tersimpan sebagai **Draft** (belum terlihat Satker).
   2. **Atur Kuota** — tunjuk Satker Polda & Polres dan isi jumlah peserta masing-masing (ada *isi cepat* untuk semua Polres / semua Satker Polda).
   3. **Bagikan** — pelatihan langsung muncul di halaman petugas Satker yang ditunjuk. Setelah itu muncul daftar **Kirim Info** untuk mengabarkan kuota ke tiap PIC lewat WhatsApp atau pesan massal.
6. **Petugas Satker** membuka **Input Peserta** (menu ini hanya ada di akun petugas), memilih pelatihan (terlihat sisa kuota), mengisi data peserta, dan mengunggah **SPRIN & SPPD (PDF, maks. 5 MB)**. Jumlah peserta tidak bisa melebihi kuota; pendaftaran terkunci setelah batas 23:59 WIT.
7. **Admin** memantau di **Beranda**, **Rekapitulasi** (kuota vs terisi, kelengkapan SPRIN & SPPD), dan **Belum Mengirim** (Satker yang belum mengirim / kuota belum terpenuhi + tombol Ingatkan).
8. **Kelola Master → Pengaturan Laporan**: isi kop surat & pejabat penanda tangan, lalu cetak di **Cetak Laporan**.

**Foto profil 4×6 (Admin & Petugas):** klik avatar di kanan atas → **Foto profil** → **Pilih Foto JPG**. Hanya JPG/JPEG; foto otomatis dipotong ke rasio 4×6 (2:3) dan diperkecil ke ±472×709 piksel (≈300 dpi) di perangkat sebelum diunggah. Foto muncul sebagai avatar di kanan atas dan di daftar **Kelola Master → Pengguna**; Admin juga dapat mengganti/menghapus foto petugas lewat kolom **Foto** di daftar itu. Berkas disimpan privat di folder Drive `SI-PRO/Foto Pengguna/`.

**Unduh Excel (Admin Induk):** buka **Data Peserta** → pilih **Program Pelatihan** (dan bila perlu Polda / Satker / Berkas / kata kunci) → **Unduh Excel**. Nama berkas mengikuti pelatihan, mis. `SI-PRO_Peserta_Latpraops-Pekat-Manokwari-2026_2026-11-14.xlsx`. Mencentang beberapa peserta lalu **Unduh Excel** di bilah biru hanya mengunduh yang dicentang.

**Peran:** Admin Induk membuat pelatihan, mengatur kuota, membagikan, memantau & mencetak laporan (dapat menghapus data peserta yang keliru, tetapi tidak mengisi/mengubah). Petugas Satker mendaftarkan & mengubah peserta Satker-nya sendiri. Peserta dianggap **lengkap** bila SPRIN dan SPPD sudah terunggah.

Keamanan login: password disimpan sebagai hash + salt (Admin pun tidak bisa melihatnya), 5× salah password → akun dikunci 15 menit, sesi berlaku 7 hari, dan ganti/reset password atau menonaktifkan akun langsung mengeluarkan semua perangkat.

Daftar uji PRD 8.2 yang sudah diperiksa otomatis sebelum diserahkan: akun tidak terdaftar ditolak · Petugas Satker A tidak melihat/mengubah data Satker B · kolom wajib kosong ditolak · berkas bukan PDF & > 5 MB ditolak · edit data sendiri tersimpan · daftar "Belum Mengirim" benar · laporan PDF sesuai filter.

---

## E. Migrasi data dari spreadsheet lama (modul Migrasi Data)

Untuk memindahkan rekap lama (mis. spreadsheet pengumpulan peserta tahun lalu) atau data dari versi SI-PRO sebelumnya.

1. Pastikan spreadsheet lama bisa dibuka oleh **akun pemilik Apps Script** (dibagikan minimal *Viewer*). Spreadsheet lama **hanya dibaca**, tidak pernah diubah.
2. **Kelola Master → Migrasi Data** → tempel URL spreadsheet lama.
3. Centang data yang diimpor (Satker, Pelatihan, Pengguna, Peserta). Urutan otomatis: master dulu, baru peserta.
4. Tekan **Pindai (Dry-run)** → periksa tabel *Ditambah / Diperbarui / Dilewati* dan semua peringatan. Belum ada data yang ditulis.
5. Tekan **Jalankan Import**.
6. Aman diulang: data yang sama tidak menjadi ganda (kunci: NRP/NIP + pelatihan untuk peserta, email untuk pengguna, ID/nama untuk Satker & pelatihan).

Yang dikenali otomatis:
- Kolom dibaca dari **nama header**, bukan urutan. Contoh header yang dikenali: `NRP`, `NIP`, `NRP/NIP`, `Nama Lengkap`, `Satker`, `Nama Satker`, `Jenis Pelatihan`, `Diklat`, `No WA`, `Username`, `Email`, `Password`, `Role`.
- Akun pengguna: username diambil dari kolom `Username`; bila tidak ada, dari bagian depan email atau NRP. Isi **"Password awal akun impor"** agar semua akun baru langsung bisa login (wajib ganti saat login pertama).
- Satker & pelatihan boleh berupa **nama** (dicocokkan ke master).
- NRP 7 digit yang kehilangan angka 0 di depan dipulihkan; nomor HP `62…`/`8…` diubah menjadi `08…`.
- Tautan SPRIN/SPPD lama (link Google Drive) dipertahankan apa adanya.

Peringatan yang mungkin muncul: username ganda, akun tanpa password, akun Admin lama (sengaja tidak diimpor kecuali dicentang), peserta yang Satker/pelatihannya tidak ditemukan, dan **NIP 18 digit yang di spreadsheet lama tersimpan sebagai angka** (digit terakhirnya sudah rusak di sumber — periksa manual).

Alternatif: **Import dari Berkas CSV** (unduh templat, isi di Excel, simpan sebagai CSV, Pindai, Import).

**Cutover**: jalankan Import sekali lagi tepat sebelum semua Satker beralih (delta sync), lalu umumkan alamat baru.

---

## F. Memperbarui Kode.gs tanpa mengganti URL

Selalu: **Deploy → Kelola deployment → ✏️ Edit → Versi: Versi baru → Deploy**.
Jangan memilih "Deployment baru" — itu menghasilkan URL `/exec` baru dan frontend akan terputus.

---

## G. Masalah umum

| Gejala | Penyebab & solusi |
|---|---|
| Saat masuk muncul *Aplikasi belum terhubung ke server* | `GAS_URL` di `js/config.js` belum diisi → isi, lalu `git add . && git commit -m "config" && git push` |
| *Server terlalu lama merespons* / *Gagal terhubung* saat masuk | `GAS_URL` salah, atau deployment bukan "Siapa saja" |
| *Server belum disiapkan* | `setupAppEnvironment` belum dijalankan |
| *Username atau password salah* | Periksa huruf besar/kecil password. Petugas lupa → Admin klik **Reset** |
| *Akun dikunci sementara* | 5× salah password. Tunggu 15 menit, atau Admin klik **Reset** (langsung membuka kunci) |
| *Akun belum memiliki password* | Akun hasil impor/upgrade → Admin klik **Reset** |
| Admin lupa password | Editor Apps Script → jalankan `aturPasswordAdmin` → lihat Log eksekusi |
| Situs 404 | `git init` dijalankan di folder yang salah. Di GitHub, `index.html` harus terlihat langsung di halaman repo |
| Tampilan tanpa warna | Folder `css/` & `js/` tidak ikut. Selalu push lewat terminal, jangan "Upload files" |
| Petugas tidak bisa input | Pelatihan sudah *Selesai* atau batas kirim lewat (terkunci 23:59 WIT). Admin tetap bisa |

Diagnostik kecepatan: tekan F12 → Console → ketik `Perf.table()` untuk melihat waktu setiap panggilan (total vs server).

---

## H. Catatan & batasan

- Tugas latar (nama berkas `[ID_Pelatihan]_[ID_Satker]_[SPRIN|SPPD]_[NRP].pdf`, pemindahan & pembuangan berkas lama ke Sampah, sheet `Status_Pengiriman`) dikerjakan pemicu 5 menit. Ingin selesai sekarang? Di editor Apps Script jalankan fungsi `prosesAntrean`. Aplikasi tidak membaca `Status_Pengiriman` (hanya untuk dilihat di spreadsheet), jadi jeda ini tidak memengaruhi tampilan.
- Sheet `Pengguna`, `Satker`, `Pelatihan`, `Alokasi` disimpan di cache server dan langsung diperbarui setiap kali diubah lewat aplikasi. Bila Anda mengedit sheet tersebut **langsung di Google Sheets**, perubahan terlihat di aplikasi paling lambat ±5–10 menit.
- Aplikasi bekerja cepat karena data ditampilkan dulu dari salinan di perangkat, lalu disegarkan diam-diam (±1 menit). Menu avatar → **Sinkronkan data** memaksa sinkron. Saat logout, salinan di perangkat dihapus.
- Berkas PDF disimpan **privat** di Drive pemilik (`SI-PRO/<Polda>/<Satker>/`), dinamai `[ID_Pelatihan]_[ID_Satker]_[SPRIN|SPPD]_[NRP_NIP].pdf`, dan hanya dapat dibuka lewat aplikasi setelah server memeriksa hak akses. Berkas yang diganti/dihapus masuk **Sampah Drive** (dapat dipulihkan 30 hari).
- Alur kuota (v1.2): pelatihan berstatus **Draft → Dibagikan → Selesai**; kuota per Satker disimpan di sheet `Alokasi`; daftar "Belum Mengirim" & rekap hanya menghitung Satker yang ditunjuk.
- Tampilan memakai huruf **Arial** dan logo Lemdiklat (berkas `img/`); ikon tab browser memakai logo yang sama.
- Login memakai username + password (perubahan dari PRD 6.2 yang semula akun Google). Kolom `Email` di sheet `Pengguna` kini opsional, hanya untuk kontak.
- Kolom tambahan di luar PRD: `Pengguna.Username/Password_Hash/Salt/Wajib_Ganti`, `Pengguna.NRP/No_HP/Jabatan` (kontak PIC), `Satker.Status/Folder_ID/Jenis`, `Pelatihan.Batas_Kirim/Keterangan/Lokasi/Dibagikan_Pada`, `Pengguna.Link_Foto/Foto_Thumb` (foto profil; kolom lama `Peserta.Link_Foto` dibiarkan, tidak dipakai lagi), sheet `Alokasi` (kuota) dan sheet `Log` untuk audit. Kolom lama `Pelatihan.Kuota_Per_Satker` tidak dipakai lagi.
- Pengumuman (v2.0) disimpan di sheet `Pengumuman` (`ID_Pengumuman, Judul, Kategori, ID_Pelatihan, Isi, Tanggal_Buka, Tanggal_Mulai, Tanggal_Selesai, Lokasi, Sasaran, Satker_Tujuan, Tampil_Login, Status, Tampil_Sampai, …`). Halaman masuk membaca pengumuman tanpa login (data umum saja) dan disimpan di cache server ±10 menit; perubahan lewat aplikasi langsung berlaku.
- Pangkalan Data (v1.9): riwayat manual/impor disimpan di sheet `Pangkalan_Data` (kolom `ID_Riwayat, Kategori, Nama_Diklat, Tahun, Tanggal_Mulai, Tanggal_Selesai, Lokasi, Nama, NRP_NIP, Pangkat, Jabatan, ID_Satker, Satker, Jenis_Satker, Polda, Keterangan, Sumber, …`). Peserta pelatihan aplikasi **tidak disalin** ke sheet itu — dihitung langsung dari sheet `Peserta` + `Pelatihan` (kolom `Kategori`), sehingga perubahan data peserta otomatis ikut. Kesatuan yang tidak ada di master Satker tetap bisa dicatat (pilih *Lainnya*); jenisnya (Satker Polda/Polres) ditebak dari nama bila tidak diisi. Membaca berkas `.xlsx` memakai fitur bawaan browser terbaru (Chrome/Edge/Firefox/Safari); di browser lama simpan sebagai CSV lalu impor. Maks. 5.000 baris per impor (dikirim per 500 baris).
- Pengingat ke Satker memakai tautan WhatsApp (`wa.me`) dan teks salin massal — belum ada pengiriman otomatis (Gmail/WA di luar lingkup v1.0).
- Satu eksekusi Apps Script maksimal 6 menit. Import > ±20.000 baris: jalankan per jenis data (centang satu per satu).
