# SI-PRO — Frontend

Sistem Informasi Pendidikan dan Pelatihan · SPN Polda Papua Barat.

Folder ini adalah **frontend statis** (HTML/CSS/JS murni, tanpa framework) yang di-deploy ke GitHub Pages.
Backend-nya adalah Google Apps Script (`Kode.gs`) yang **tidak** disimpan di repository ini.

```
index.html          ← halaman tunggal (SPA)
css/style.css       ← seluruh tampilan
js/config.js        ← WAJIB DIISI: GAS_URL
js/icons.js         ← subset ikon Lucide (ISC)
js/core.js          ← API (timeout, retry, idempoten), cache perangkat, router
js/data.js          ← rekap & status pengiriman dihitung di perangkat
js/auth.js          ← login username + password, ganti password
js/xlsx.js          ← penulis & pembaca berkas Excel (.xlsx) tanpa pustaka luar
js/pages-*.js       ← halaman-halaman aplikasi
js/app.js           ← kerangka & inisialisasi
```

Panduan lengkap: **PANDUAN-INSTALASI.md**.

Update setelah mengubah berkas:

```bash
git add .
git commit -m "Update SI-PRO"
git push
```
