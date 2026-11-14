/* =========================================================================
   SI-PRO — PENGUMUMAN PEMBUKAAN DIKLAT (Diktukba · Dikbangspes · Prolat)
   Admin Induk : buat → bagikan ke petugas Satker (semua / Satker Polda / Polres / pilihan),
                 tampilkan juga di halaman masuk, kirim lewat WhatsApp.
   Petugas     : melihat pelatihan yang segera dibuka untuk Satker-nya (penanda BARU).
   ========================================================================= */
'use strict';
const PGM_KAT = { Diktukba: { c: 'navy', i: 'graduation', t: 'Pendidikan Pembentukan Bintara' }, Dikbangspes: { c: 'teal', i: 'award', t: 'Pendidikan Pengembangan Spesialisasi' }, Prolat: { c: 'amber', i: 'book-open', t: 'Program Pelatihan' } };
const PgmPg = { kat: '', q: '' };

/* ── Penanda "sudah dibaca" (per pengguna, di perangkat) ── */
const PgmSeen = {
  get() { return new Set(Store.get(userKey('pgmSeen'), [])); },
  mark(ids) { const s = this.get(); ids.forEach((id) => s.add(id)); Store.set(userKey('pgmSeen'), Array.from(s).slice(-300)); },
  baru() { if (isAdmin()) return []; const s = this.get(); return pgmList().filter((g) => !s.has(g.ID_Pengumuman)); }
};
function pgmList() { return (D.d.pengumuman || []).slice(); }
function pgmHari(v) { return v ? Math.ceil((new Date(v + 'T00:00:00+09:00').getTime() - Date.now()) / 864e5) : null; }
function pgmSasaran(g) {
  if (g.Sasaran === 'Pilihan') { const ids = String(g.Satker_Tujuan || '').split(',').filter(Boolean); return ids.length + ' Satker/Polres pilihan'; }
  return g.Sasaran === 'Satker Polda' ? 'Semua Satker Polda' : g.Sasaran === 'Polres' ? 'Semua Polres' : 'Semua Satker & Polres';
}
/** Teks waktu: "Pendaftaran dibuka 5 hari lagi" / "Pendaftaran sudah dibuka" / pelaksanaan. */
function pgmWaktu(g) {
  const b = pgmHari(g.Tanggal_Buka), m = pgmHari(g.Tanggal_Mulai);
  if (b != null && b > 0) return { t: 'Pendaftaran dibuka ' + (b === 1 ? 'besok' : b + ' hari lagi'), c: 'amber' };
  if (b != null && b <= 0 && (m == null || m > 0)) return { t: 'Pendaftaran sudah dibuka', c: 'green' };
  if (m != null && m > 0) return { t: 'Pelaksanaan ' + (m === 1 ? 'besok' : m + ' hari lagi'), c: 'blue' };
  if (m != null && m <= 0) return { t: 'Sedang / sudah dilaksanakan', c: 'gray' };
  return null;
}
function pgmTanggal(g) {
  const out = [];
  if (g.Tanggal_Buka) out.push(ic('bell') + ' Pendaftaran dibuka <b>' + fmtTgl(g.Tanggal_Buka, true) + '</b>');
  if (g.Tanggal_Mulai) out.push(ic('calendar') + ' Pelaksanaan <b>' + fmtTgl(g.Tanggal_Mulai) + (g.Tanggal_Selesai ? ' – ' + fmtTgl(g.Tanggal_Selesai) : '') + '</b>');
  if (g.Lokasi) out.push(ic('map-pin') + ' ' + esc(g.Lokasi));
  return out;
}
function pgmChip(k) { const x = PGM_KAT[k] || PGM_KAT.Prolat; return '<span class="pgm-kat k-' + x.c + '">' + ic(x.i) + esc(k || 'Prolat') + '</span>'; }

registerPage('pengumuman', {
  title: 'Pengumuman',
  render(el) { if (!el._built) pgmBuild(el); pgmUpdate(el); },
  onShow() { if (!isAdmin()) setTimeout(() => { PgmSeen.mark(pgmList().map((g) => g.ID_Pengumuman)); if (window.Layout) Layout.update(); }, 1500); }
});

function pgmBuild(el) {
  const admin = isAdmin();
  el.innerHTML =
    '<div class="ph"><div><h1>Pengumuman Pembukaan Diklat</h1><p class="desc">' + (admin
      ? 'Umumkan pembukaan Diktukba, Dikbangspes, dan Prolat ke petugas Satker &amp; Polres serta di halaman masuk.'
      : 'Pendidikan &amp; pelatihan yang segera dibuka untuk ' + esc(D.d.me.namaSatker || 'Satker Anda') + '.') + '</p></div>' +
    '<div class="ph-act">' + (admin ? '<button class="btn btn-primary" data-new>' + ic('megaphone') + 'Buat Pengumuman</button>' : '') + '</div></div>' +
    '<div class="card"><div class="card-b pgm-bar"><div class="seg sm" data-kat></div><div class="with-ic" style="flex:1;min-width:220px">' + ic('search') + '<input class="input" data-q placeholder="Cari judul / tempat…" style="text-transform:none"></div>' +
    (admin ? '<span class="lbl" data-sum></span>' : '') + '</div></div>' +
    '<div class="card fill" data-pgc><div class="card-b scroll"><div class="pgm-grid" data-list></div></div></div>';
  el._built = true;
  $('[data-q]', el).addEventListener('input', debounce((e) => { PgmPg.q = e.target.value; pgmUpdate(el); }, 200));
  el.addEventListener('click', async (e) => {
    const k = e.target.closest('[data-kat-v]'); if (k) { PgmPg.kat = k.dataset.katV; pgmUpdate(el); return; }
    if (e.target.closest('[data-new]')) return pgmForm(null);
    const b = e.target.closest('[data-g]'); if (!b) return;
    const g = pgmList().find((x) => x.ID_Pengumuman === b.dataset.id); if (!g) return;
    const act = b.dataset.g;
    if (act === 'lihat') pgmDetail(g);
    if (act === 'edit') pgmForm(g);
    if (act === 'kirim') pgmKirim(g);
    if (act === 'daftar') { AppState.selPel = g.ID_Pelatihan; InputPg.reset = true; Router.go('input'); }
    if (act === 'bagikan' || act === 'tarik') {
      const to = act === 'bagikan' ? 'Dibagikan' : 'Draft';
      if (to === 'Dibagikan' && !(await confirmDlg({ title: 'Bagikan pengumuman?', okText: 'Bagikan', message: '<b>' + esc(g.Judul) + '</b><br>Sasaran: ' + esc(pgmSasaran(g)) + (g.Tampil_Login ? '<br>Juga tampil di <b>halaman masuk</b> SI-PRO.' : '') }))) return;
      const prev = { Status: g.Status, Dibagikan_Pada: g.Dibagikan_Pada };
      const res = await Data.quick({ action: 'savePengumuman', data: Object.assign({}, g, { Status: to }), ok: to === 'Dibagikan' ? 'Pengumuman dibagikan ke petugas Satker.' : 'Pengumuman ditarik (kembali Draft).',
        apply: (d) => { const x = d.pengumuman.find((y) => y.ID_Pengumuman === g.ID_Pengumuman); if (x) { x.Status = to; x.Dibagikan_Pada = to === 'Dibagikan' ? new Date().toISOString() : ''; } },
        undo: (d) => { const x = d.pengumuman.find((y) => y.ID_Pengumuman === g.ID_Pengumuman); if (x) Object.assign(x, prev); } });
      if (res.success && to === 'Dibagikan') pgmKirim(Object.assign({}, g, { Status: to }));
    }
    if (act === 'del') {
      if (!(await confirmDlg({ danger: true, title: 'Hapus pengumuman?', okText: 'Hapus', message: '<b>' + esc(g.Judul) + '</b> akan dihapus dan tidak lagi tampil di halaman masuk maupun di aplikasi petugas.' }))) return;
      const idx = D.d.pengumuman.indexOf(g);
      Data.quick({ action: 'deletePengumuman', data: { ID_Pengumuman: g.ID_Pengumuman }, ok: 'Pengumuman dihapus.', hide: ['pengumuman', 'ID_Pengumuman', g.ID_Pengumuman],
        apply: (d) => { d.pengumuman = d.pengumuman.filter((x) => x.ID_Pengumuman !== g.ID_Pengumuman); },
        undo: (d) => { d.pengumuman.splice(Math.min(idx, d.pengumuman.length), 0, g); } });
    }
  });
}

function pgmUpdate(el) {
  const admin = isAdmin(), all = pgmList(), q = PgmPg.q.trim().toLowerCase(), seen = PgmSeen.get();
  const n = (k) => all.filter((g) => !k || g.Kategori === k).length;
  $('[data-kat]', el).innerHTML = [['', 'Semua'], ['Diktukba'], ['Dikbangspes'], ['Prolat']].map(([k, t]) => '<button type="button" data-kat-v="' + k + '" class="' + (PgmPg.kat === k ? 'on' : '') + '">' + (t || k) + ' <span class="cnt">' + n(k) + '</span></button>').join('');
  // Urutan: aktif (dibagikan) paling dekat dibuka → draft → kedaluwarsa
  const rank = (g) => g.Kedaluwarsa ? 2 : g.Status === 'Draft' ? 1 : 0;
  const list = all.filter((g) => (!PgmPg.kat || g.Kategori === PgmPg.kat) && (!q || (g.Judul + ' ' + g.Lokasi + ' ' + g.Isi).toLowerCase().includes(q)))
    .sort((a, b) => rank(a) - rank(b) || String(a.Tanggal_Buka || a.Tanggal_Mulai || '9').localeCompare(String(b.Tanggal_Buka || b.Tanggal_Mulai || '9')));
  if (admin) { const sb = all.filter((g) => g.Status === 'Dibagikan' && !g.Kedaluwarsa).length; $('[data-sum]', el).textContent = sb + ' dibagikan · ' + all.filter((g) => g.Status === 'Draft').length + ' draft'; }
  const btn = (act, id, cls, label, icon) => '<button class="btn btn-xs ' + cls + '" data-g="' + act + '" data-id="' + esc(id) + '">' + (icon ? ic(icon) : '') + label + '</button>';
  $('[data-list]', el).innerHTML = list.length ? list.map((g) => {
    const w = pgmWaktu(g), busy = g._pending;
    const pel = g.ID_Pelatihan && D.pel(g.ID_Pelatihan);
    const bisaDaftar = !admin && pel && D.canSubmit(pel, D.d.me.idSatker);
    const st = admin ? (g.Kedaluwarsa ? '<span class="tag tag-gray">BERAKHIR</span>' : g.Status === 'Dibagikan' ? '<span class="tag tag-green">' + ic('send') + 'DIBAGIKAN</span>' : '<span class="tag tag-amber">DRAFT</span>')
      : (!seen.has(g.ID_Pengumuman) ? '<span class="tag tag-red pgm-new">BARU</span>' : '');
    return '<article class="pgm-card k-' + ((PGM_KAT[g.Kategori] || PGM_KAT.Prolat).c) + (g.Status === 'Draft' ? ' draft' : '') + (g.Kedaluwarsa ? ' old' : '') + (busy ? ' pending' : '') + '">' +
      '<div class="pgm-top">' + pgmChip(g.Kategori) + st + (admin && g.Tampil_Login ? '<span class="tag tag-blue" title="Tampil di halaman masuk">' + ic('lock') + 'HALAMAN MASUK</span>' : '') + '</div>' +
      '<h3 class="pgm-title">' + esc(g.Judul) + '</h3>' +
      (w ? '<div class="pgm-when c-' + w.c + '">' + ic('clock') + esc(w.t) + '</div>' : '') +
      '<div class="pgm-meta">' + pgmTanggal(g).map((x) => '<span>' + x + '</span>').join('') + '</div>' +
      (g.Isi ? '<p class="pgm-isi">' + esc(g.Isi) + '</p>' : '') +
      '<div class="pgm-foot">' + (admin ? '<span class="pgm-to">' + ic('users') + esc(pgmSasaran(g)) + '</span>' : '<span class="pgm-to">' + ic('megaphone') + 'Admin Induk' + (g.Dibagikan_Pada ? ' · ' + fmtTgl(g.Dibagikan_Pada) : '') + '</span>') +
      '<div class="acts">' + (busy ? '<span class="tag tag-blue"><span class="spin" style="width:10px;height:10px"></span>Menyimpan…</span>' : admin
        ? (g.Status === 'Draft' ? btn('bagikan', g.ID_Pengumuman, 'btn-primary', 'Bagikan', 'send') : btn('kirim', g.ID_Pengumuman, 'act-wa', 'Kirim WA', 'message') + btn('tarik', g.ID_Pengumuman, 'act-view', 'Tarik')) +
          btn('edit', g.ID_Pengumuman, 'act-edit', 'Edit') + btn('del', g.ID_Pengumuman, 'act-del', 'Hapus')
        : btn('lihat', g.ID_Pengumuman, 'act-view', 'Selengkapnya', 'eye') + (bisaDaftar ? btn('daftar', g.ID_Pengumuman, 'btn-primary', 'Daftarkan Peserta', 'user-plus') : '')) + '</div></div></article>';
  }).join('') : '<div class="empty">' + ic('megaphone') + '<b>' + (all.length ? 'Tidak ada pengumuman yang cocok' : 'Belum ada pengumuman') + '</b>' +
    (admin ? (all.length ? '' : 'Tekan "Buat Pengumuman" untuk mengumumkan pembukaan Diktukba, Dikbangspes, atau Prolat.') : 'Pengumuman pembukaan diklat dari Admin Induk akan tampil di sini.') + '</div>';
  AutoPager.attach($('[data-pgc]', el), { box: '.card-b', items: '.pgm-card' });
}

/* ── Detail (petugas & halaman masuk) ── */
function pgmDetail(g, publik) {
  const w = pgmWaktu(g);
  const pel = !publik && g.ID_Pelatihan && D.pel(g.ID_Pelatihan);
  const bisa = !publik && !isAdmin() && pel && D.canSubmit(pel, D.d.me.idSatker);
  const m = modal({ title: g.Judul, icon: 'megaphone', cls: 'wide', noFocus: true,
    body: '<div class="pgm-top">' + pgmChip(g.Kategori) + '<span class="muted" style="font-size:12.5px">' + esc((PGM_KAT[g.Kategori] || PGM_KAT.Prolat).t) + '</span></div>' +
      (w ? '<div class="pgm-when c-' + w.c + '" style="margin-top:10px">' + ic('clock') + esc(w.t) + '</div>' : '') +
      '<div class="pgm-meta lg">' + pgmTanggal(g).map((x) => '<span>' + x + '</span>').join('') + '</div>' +
      (g.Isi ? '<div class="pgm-full">' + esc(g.Isi) + '</div>' : '') +
      (publik ? '<div class="alert alert-blue" style="margin:14px 0 0">' + ic('info') + '<div>Petugas Satker &amp; Polres: masuk ke SI-PRO untuk melihat kuota dan mendaftarkan peserta setelah pelatihan dibagikan Admin Induk.</div></div>' : ''),
    foot: (bisa ? '<button class="btn btn-primary" data-d>' + ic('user-plus') + 'Daftarkan Peserta</button>' : '') + '<button class="btn btn-navy" data-x>Tutup</button>' });
  const d = $('[data-d]', m.el); if (d) d.addEventListener('click', () => { m.close(); AppState.selPel = g.ID_Pelatihan; InputPg.reset = true; Router.go('input'); });
  if (!publik && !isAdmin()) { PgmSeen.mark([g.ID_Pengumuman]); if (window.Layout) Layout.update(); }
}

/* ── Formulir buat / ubah (Admin) ── */
function pgmForm(g) {
  const edit = !!g, today = new Date().toISOString().slice(0, 10);
  g = Object.assign({ Judul: '', Kategori: 'Diktukba', ID_Pelatihan: '', Isi: '', Tanggal_Buka: today, Tanggal_Mulai: '', Tanggal_Selesai: '', Lokasi: 'SPN Polda Papua Barat', Sasaran: 'Semua', Satker_Tujuan: '', Tampil_Login: true, Tampil_Sampai: '', Status: 'Draft' }, g || {});
  const tujuan = new Set(String(g.Satker_Tujuan || '').split(',').filter(Boolean));
  const pels = D.pelSorted().filter((p) => p.Status !== 'Selesai' || p.ID_Pelatihan === g.ID_Pelatihan);
  const satList = D.d.satker.filter((s) => s.Status !== 'Nonaktif').sort(D.sortSat);
  const m = modal({ title: edit ? 'Ubah Pengumuman' : 'Buat Pengumuman Pembukaan Diklat', icon: 'megaphone', cls: 'wide', sticky: true,
    body: '<form data-f class="grid" novalidate autocomplete="off">' +
      '<div class="grid g2"><div class="field"><label>Ambil dari pelatihan (opsional)</label><select class="select" name="ID_Pelatihan"><option value="">— Tanpa pelatihan terkait —</option>' +
      pels.map((p) => '<option value="' + esc(p.ID_Pelatihan) + '"' + (p.ID_Pelatihan === g.ID_Pelatihan ? ' selected' : '') + '>' + esc(p.Nama_Pelatihan) + ' (' + esc(p.Kategori || 'Prolat') + ')</option>').join('') + '</select><span class="hint">Mengisi judul, kategori, tanggal &amp; tempat otomatis</span></div>' +
      '<div class="field"><label>Kategori<span class="req">*</span></label><select class="select" name="Kategori">' + Object.keys(PGM_KAT).map((k) => '<option value="' + k + '"' + (k === g.Kategori ? ' selected' : '') + '>' + k + ' — ' + PGM_KAT[k].t + '</option>').join('') + '</select></div></div>' +
      '<div class="field"><label>Judul pengumuman<span class="req">*</span></label><input class="input" name="Judul" maxlength="150" value="' + esc(g.Judul) + '" placeholder="Mis. Pembukaan Diktukba Polri Gelombang I TA 2027"></div>' +
      '<div class="grid g4"><div class="field"><label>Pendaftaran dibuka</label><input class="input mono" type="date" name="Tanggal_Buka" value="' + esc(g.Tanggal_Buka) + '"></div>' +
      '<div class="field"><label>Pelaksanaan mulai</label><input class="input mono" type="date" name="Tanggal_Mulai" value="' + esc(g.Tanggal_Mulai) + '"></div>' +
      '<div class="field"><label>Pelaksanaan selesai</label><input class="input mono" type="date" name="Tanggal_Selesai" value="' + esc(g.Tanggal_Selesai) + '"></div>' +
      '<div class="field"><label>Tempat</label><input class="input" name="Lokasi" value="' + esc(g.Lokasi) + '"></div></div>' +
      '<div class="field"><label>Isi pengumuman</label><textarea class="input" name="Isi" rows="4" maxlength="3000" placeholder="Persyaratan peserta, berkas yang disiapkan, kontak panitia, dll.">' + esc(g.Isi) + '</textarea></div>' +
      '<div class="grid g3"><div class="field"><label>Dibagikan kepada<span class="req">*</span></label><select class="select" name="Sasaran">' +
      [['Semua', 'Semua Satker Polda & Polres'], ['Satker Polda', 'Semua Satker Polda'], ['Polres', 'Semua Polres'], ['Pilihan', 'Pilih Satker / Polres…']].map(([v, t]) => '<option value="' + v + '"' + (v === g.Sasaran ? ' selected' : '') + '>' + t + '</option>').join('') + '</select></div>' +
      '<div class="field"><label>Tampil sampai</label><input class="input mono" type="date" name="Tampil_Sampai" value="' + esc(g.Tampil_Sampai) + '"><span class="hint">Kosong = sampai pelaksanaan selesai</span></div>' +
      '<div class="field"><label>Halaman masuk</label><label class="check" style="margin:0"><input type="checkbox" name="Tampil_Login"' + (g.Tampil_Login ? ' checked' : '') + '><span><b>Tampilkan di halaman masuk</b><small>Terlihat sebelum login</small></span></label></div></div>' +
      '<div class="pgm-pick" data-pick' + (g.Sasaran === 'Pilihan' ? '' : ' hidden') + '>' + JENIS_SATKER.map((j) => {
        const gs = satList.filter((s) => (s.Jenis === 'Polres' ? 'Polres' : 'Satker Polda') === j);
        return '<div class="pp-col"><div class="pp-h"><b>' + j + '</b><button type="button" class="linkbtn blue" data-all-j="' + j + '">Pilih semua</button></div>' +
          gs.map((s) => '<label class="pp-i"><input type="checkbox" value="' + esc(s.ID_Satker) + '" data-jn="' + j + '"' + (tujuan.has(s.ID_Satker) ? ' checked' : '') + '><span>' + esc(s.Nama_Satker) + '</span><small>' + D.poldaShort(s.Polda) + '</small></label>').join('') + '</div>';
      }).join('') + '</div>' +
      '</form>',
    foot: '<button class="btn" data-x>Batal</button><button class="btn" data-save="Draft">' + ic('save') + 'Simpan Draft</button><button class="btn btn-primary" data-save="Dibagikan">' + ic('send') + (g.Status === 'Dibagikan' ? 'Simpan' : 'Simpan &amp; Bagikan') + '</button>' });
  const f = $('[data-f]', m.el);
  f.Sasaran.addEventListener('change', () => { $('[data-pick]', f).hidden = f.Sasaran.value !== 'Pilihan'; });
  $$('[data-all-j]', f).forEach((b) => b.addEventListener('click', () => { const cks = $$('[data-jn="' + b.dataset.allJ + '"]', f), on = !cks.every((c) => c.checked); cks.forEach((c) => { c.checked = on; }); }));
  f.ID_Pelatihan.addEventListener('change', () => {
    const p = D.pel(f.ID_Pelatihan.value); if (!p) return;
    f.Kategori.value = p.Kategori || 'Prolat';
    if (!f.Judul.value.trim() || /^Pembukaan /.test(f.Judul.value)) f.Judul.value = 'Pembukaan ' + p.Nama_Pelatihan;
    f.Tanggal_Mulai.value = p.Tanggal_Mulai || ''; f.Tanggal_Selesai.value = p.Tanggal_Selesai || ''; f.Lokasi.value = p.Lokasi || 'SPN Polda Papua Barat';
    if (!f.Isi.value.trim()) f.Isi.value = 'Diberitahukan kepada Satker/Polres jajaran bahwa ' + p.Nama_Pelatihan + ' akan dilaksanakan di ' + (p.Lokasi || 'SPN Polda Papua Barat') + ' pada ' + fmtTgl(p.Tanggal_Mulai, true) + ' s.d. ' + fmtTgl(p.Tanggal_Selesai, true) + '.' + (p.Batas_Kirim ? '\nBatas pendaftaran peserta: ' + fmtTgl(p.Batas_Kirim, true) + ' pukul 23:59 WIT.' : '') + '\nSiapkan personel yang memenuhi syarat beserta SPRIN & SPPD.';
    const al = D.alok(p.ID_Pelatihan), ids = Object.keys(al);
    if (ids.length) { f.Sasaran.value = 'Pilihan'; $('[data-pick]', f).hidden = false; $$('[data-jn]', f).forEach((c) => { c.checked = !!al[c.value]; }); }
  });
  $$('[data-save]', m.el).forEach((b) => b.addEventListener('click', () => {
    const d = Object.fromEntries(new FormData(f).entries());
    d.Tampil_Login = f.Tampil_Login.checked; d.Status = b.dataset.save;
    d.Satker_Tujuan = $$('[data-jn]:checked', f).map((c) => c.value).join(',');
    if (!d.Judul.trim()) return toast('Judul pengumuman wajib diisi.', 'error');
    if (d.Sasaran === 'Pilihan' && !d.Satker_Tujuan) return toast('Pilih minimal satu Satker / Polres.', 'error');
    if (d.Tanggal_Mulai && d.Tanggal_Selesai && d.Tanggal_Selesai < d.Tanggal_Mulai) return toast('Tanggal selesai tidak boleh sebelum tanggal mulai.', 'error');
    if (edit) d.ID_Pengumuman = g.ID_Pengumuman;
    m.close(); pgmSimpan(d, edit ? g : null);
  }));
}
async function pgmSimpan(d, lama) {
  const tmp = lama ? lama.ID_Pengumuman : 'TMP-' + Date.now().toString(36);
  const row = Object.assign({}, lama || {}, d, { ID_Pengumuman: tmp, _pending: true, Kedaluwarsa: false, Dibagikan_Pada: d.Status === 'Dibagikan' ? (lama && lama.Dibagikan_Pada) || new Date().toISOString() : '' });
  Data.mutate((x) => { x.pengumuman = x.pengumuman || []; const i = x.pengumuman.findIndex((y) => y.ID_Pengumuman === tmp); if (i > -1) x.pengumuman[i] = row; else x.pengumuman.unshift(row); });
  toast(d.Status === 'Dibagikan' ? 'Pengumuman dibagikan ke petugas Satker.' : 'Pengumuman disimpan sebagai Draft.', 'success');
  const res = await api('savePengumuman', d);
  if (res.success) {
    Data.mutate((x) => { const i = x.pengumuman.findIndex((y) => y.ID_Pengumuman === tmp); if (i > -1) x.pengumuman[i] = res.data.pengumuman; else x.pengumuman.unshift(res.data.pengumuman); });
    if (d.Status === 'Dibagikan' && (!lama || lama.Status !== 'Dibagikan')) pgmKirim(res.data.pengumuman);
  } else {
    Data.mutate((x) => { const i = x.pengumuman.findIndex((y) => y.ID_Pengumuman === tmp); if (i > -1) { if (lama) x.pengumuman[i] = lama; else x.pengumuman.splice(i, 1); } });
    toast(res.message, 'error', 'Pengumuman belum tersimpan'); pgmForm(Object.assign({}, lama || {}, d));
  }
}

/* ── Kirim ke petugas lewat WhatsApp / salin pesan massal ── */
function pgmPesan(g, sat) {
  const tgl = [];
  if (g.Tanggal_Buka) tgl.push('• Pendaftaran dibuka: ' + fmtTgl(g.Tanggal_Buka, true));
  if (g.Tanggal_Mulai) tgl.push('• Pelaksanaan: ' + fmtTgl(g.Tanggal_Mulai, true) + (g.Tanggal_Selesai ? ' s.d. ' + fmtTgl(g.Tanggal_Selesai, true) : ''));
  if (g.Lokasi) tgl.push('• Tempat: ' + g.Lokasi);
  return 'PENGUMUMAN ' + String(g.Kategori || '').toUpperCase() + '\n' + (sat ? 'Yth. Petugas SI-PRO ' + sat.Nama_Satker + ',\n\n' : '\n') + g.Judul + '\n' + tgl.join('\n') +
    (g.Isi ? '\n\n' + g.Isi : '') + '\n\nInformasi lengkap di aplikasi SI-PRO (menu Pengumuman): ' + location.origin + location.pathname + '\n— Admin Induk SI-PRO';
}
function pgmTarget(g) {
  const ids = new Set(String(g.Satker_Tujuan || '').split(',').filter(Boolean));
  return D.d.satker.filter((s) => s.Status !== 'Nonaktif' && (g.Sasaran === 'Pilihan' ? ids.has(s.ID_Satker) : g.Sasaran === 'Satker Polda' ? s.Jenis !== 'Polres' : g.Sasaran === 'Polres' ? s.Jenis === 'Polres' : true)).sort(D.sortSat);
}
function pgmKirim(g) {
  const sats = pgmTarget(g), massal = pgmPesan(g, null);
  const m = modal({ title: 'Kirim Pengumuman ke Petugas', icon: 'send', cls: 'wide', noFocus: true,
    body: '<div class="alert alert-green">' + ic('check-circle') + '<div><b>' + esc(g.Judul) + '</b> sudah tampil di aplikasi petugas ' + esc(pgmSasaran(g).toLowerCase()) + (g.Tampil_Login ? ' dan di halaman masuk' : '') + '. Kirim juga lewat WhatsApp (opsional).</div></div>' +
      '<div class="tbl-wrap" style="border:1px solid var(--line);border-radius:8px;max-height:46vh;overflow:auto"><table class="tbl"><thead><tr><th>Satker / Polres</th><th>Petugas PIC</th><th class="r">Kirim</th></tr></thead><tbody>' +
      sats.map((s) => {
        const u = D.pic(s.ID_Satker)[0], wa = u && u.No_HP ? D.waLink(u.No_HP, pgmPesan(g, s)) : '';
        return '<tr><td><div class="nm">' + esc(s.Nama_Satker) + '</div><div class="sub">' + esc(s.Jenis) + ' · ' + esc(s.Polda) + '</div></td>' +
          '<td>' + (u ? esc(u.Nama) + (u.No_HP ? '<div class="sub">' + esc(u.No_HP) + '</div>' : '') : '<span class="tag tag-amber">BELUM ADA AKUN</span>') + '</td>' +
          '<td class="r">' + (wa ? '<a class="btn btn-xs act-wa" href="' + wa + '" target="_blank" rel="noopener">' + ic('message') + 'WhatsApp</a>' : '<span class="tag tag-gray">TANPA NO. HP</span>') + '</td></tr>';
      }).join('') + '</tbody></table></div>',
    foot: '<button class="btn" data-copy>' + ic('copy') + 'Salin Pesan Massal</button><button class="btn btn-navy" data-x>Selesai</button>' });
  $('[data-copy]', m.el).addEventListener('click', () => (navigator.clipboard ? navigator.clipboard.writeText(massal) : Promise.reject()).then(() => toast('Pesan disalin. Tempel di grup WhatsApp/Telegram jajaran.', 'success')).catch(() => modal({ title: 'Salin pesan', icon: 'copy', body: '<textarea class="input" rows="14" readonly>' + esc(massal) + '</textarea>' })));
}

/* ── Halaman masuk: kotak pengumuman (tanpa login) ── */
const LoginPgm = {
  list: [], i: 0, timer: null,
  async load() {
    const c = Store.get('pgmPub', null); if (c && Array.isArray(c.data)) { this.list = c.data; this.render(); }
    if (!GAS_URL) return;
    const res = await api('pengumumanPublik', {}, { read: true });
    if (res.success && Array.isArray(res.data)) { const changed = JSON.stringify(res.data) !== JSON.stringify(this.list); this.list = res.data; Store.set('pgmPub', { t: Date.now(), data: res.data }); if (changed) this.render(); }
  },
  item(g) {
    const w = pgmWaktu(g), when = g.Tanggal_Buka ? 'Dibuka ' + fmtTgl(g.Tanggal_Buka) : g.Tanggal_Mulai ? 'Mulai ' + fmtTgl(g.Tanggal_Mulai) : '';
    return '<button type="button" class="lp-item" data-lp="' + esc(g.ID_Pengumuman) + '">' + pgmChip(g.Kategori) +
      '<span class="lp-t">' + esc(g.Judul) + '</span><span class="lp-s">' + esc([when, g.Lokasi].filter(Boolean).join(' · ')) + (w ? ' <b class="c-' + w.c + '">' + esc(w.t) + '</b>' : '') + '</span></button>';
  },
  render() {
    const box = $('#loginPgm'); if (!box) return;
    clearInterval(this.timer);
    if (!this.list.length) { box.hidden = true; return; }
    box.hidden = false;
    this.i = Math.min(this.i, this.list.length - 1);
    box.innerHTML = '<div class="lp-h">' + ic('megaphone') + '<b>Pengumuman Diklat</b><span class="lp-n">' + this.list.length + '</span>' +
      (this.list.length > 1 ? '<span class="lp-dots">' + this.list.map((_, k) => '<i data-lpi="' + k + '" class="' + (k === this.i ? 'on' : '') + '"></i>').join('') + '</span>' : '') +
      '<button type="button" class="linkbtn blue" data-lp-all>Lihat semua</button></div><div class="lp-body">' + this.item(this.list[this.i]) + '</div>';
    if (!box._b) {
      box._b = true;
      box.addEventListener('click', (e) => {
        const d = e.target.closest('[data-lpi]'); if (d) { this.i = +d.dataset.lpi; this.render(); return; }
        if (e.target.closest('[data-lp-all]')) return this.all();
        const it = e.target.closest('[data-lp]'); if (it) { const g = this.list.find((x) => x.ID_Pengumuman === it.dataset.lp); if (g) pgmDetail(g, true); }
      });
    }
    if (this.list.length > 1 && !(window.Motion && Motion.off())) this.timer = setInterval(() => { if (!$('#loginPgm')) return clearInterval(this.timer); this.i = (this.i + 1) % this.list.length; this.render(); }, 6000);
  },
  all() {
    const m = modal({ title: 'Pengumuman Pembukaan Diklat', icon: 'megaphone', cls: 'wide', noFocus: true,
      body: '<div class="lp-all">' + this.list.map((g) => this.item(g)).join('') + '</div>', foot: '<button class="btn btn-navy" data-x>Tutup</button>' });
    m.el.addEventListener('click', (e) => { const it = e.target.closest('[data-lp]'); if (it) { const g = this.list.find((x) => x.ID_Pengumuman === it.dataset.lp); if (g) pgmDetail(g, true); } });
  }
};
window.PgmSeen = PgmSeen; window.LoginPgm = LoginPgm;
