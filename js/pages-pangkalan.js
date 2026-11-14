/* =========================================================================
   SI-PRO — PANGKALAN DATA PENDIDIKAN DAN PELATIHAN (Admin Induk)
   Riwayat personel yang SUDAH melaksanakan Diktukba, Dikbangspes, dan Prolat.
   Sumber data:
     • Aplikasi : peserta pelatihan SI-PRO yang pelatihannya sudah selesai (otomatis)
     • Manual / Impor : riwayat lama atau dari luar aplikasi yang dicatat Admin
   Data Satker Polda dan Polres selalu ditampilkan TERPISAH (tidak digabung).
   ========================================================================= */
'use strict';
const KATEGORI = [
  { k: 'Diktukba', t: 'Pendidikan Pembentukan Bintara', i: 'graduation', c: 'navy' },
  { k: 'Dikbangspes', t: 'Pendidikan Pengembangan Spesialisasi', i: 'award', c: 'teal' },
  { k: 'Prolat', t: 'Program Pelatihan', i: 'book-open', c: 'amber' }
];
const KAT_NAMA = KATEGORI.map((x) => x.k);

/* ── Penyimpanan riwayat manual/impor (dimuat terpisah dari bootstrap) ── */
const PK = {
  rows: null, t: 0, loading: false, err: '', rev: 0,
  pending: {},            // ID_Riwayat → baris yang sedang disimpan
  gone: new Set(),        // ID_Riwayat yang sedang dihapus
  key() { return userKey('pangkalan'); },
  init() { if (this.rows) return; const c = Store.get(this.key(), null); if (c && Array.isArray(c.data)) { this.rows = c.data.filter((r) => !r._pending); this.t = c.t; this.rev++; } },
  overlay(list) {
    const P = this.pending, ids = Object.keys(P);
    return list.filter((r) => !P[r.ID_Riwayat] && !this.gone.has(r.ID_Riwayat)).concat(ids.map((id) => P[id]));
  },
  save() {
    clearTimeout(this._t);
    this._t = setTimeout(() => { const run = () => Store.set(this.key(), { t: this.t, data: (this.rows || []).filter((r) => !r._pending) }); window.requestIdleCallback ? requestIdleCallback(run, { timeout: 1500 }) : run(); }, 0);
  },
  set(fn) { this.rows = this.rows || []; fn(this.rows); this.rows = this.rows.slice(); this.rev++; this.save(); pkRefresh(); },
  async load(force) {
    this.init();
    if (this.loading || (!force && this.rows && Date.now() - this.t < 60000)) return;
    this.loading = true; pkRefresh();
    const res = await api('pangkalan', {}, { read: true });
    this.loading = false;
    if (res.success) { this.rows = this.overlay(res.data.riwayat || []); this.t = Date.now(); this.err = ''; this.rev++; this.save(); }
    else if (!this.rows) this.err = res.message;
    pkRefresh();
  }
};

/* ── Data gabungan (aplikasi + manual), dihitung sekali per perubahan ── */
function pkToday() { const p = witParts(new Date().toISOString()); return p.y + '-' + String(p.m).padStart(2, '0') + '-' + String(p.d).padStart(2, '0'); }
/** Pelatihan dianggap sudah dilaksanakan bila berstatus Selesai atau tanggal selesainya sudah lewat. */
function pkSelesai(pel) { return pel && (pel.Status === 'Selesai' || (pel.Status !== 'Draft' && pel.Tanggal_Selesai && pel.Tanggal_Selesai < pkToday())); }
function pkAll() {
  return D.memo('pkAll|' + PK.rev, () => {
    const app = D.d.peserta.filter((p) => !p._pending).map((p) => {
      const pel = D.pel(p.ID_Pelatihan); if (!pkSelesai(pel)) return null;
      const s = D.sat(p.ID_Satker) || {};
      return { ID_Riwayat: 'APP:' + p.ID_Peserta, app: true, Kategori: pel.Kategori || 'Prolat', Nama_Diklat: pel.Nama_Pelatihan,
        Tahun: String(pel.Tanggal_Selesai || pel.Tanggal_Mulai || '').slice(0, 4), Tanggal_Mulai: pel.Tanggal_Mulai, Tanggal_Selesai: pel.Tanggal_Selesai,
        Lokasi: pel.Lokasi, Nama: p.Nama, NRP_NIP: p.NRP_NIP, Pangkat: p.Pangkat, Jabatan: p.Jabatan, ID_Satker: p.ID_Satker,
        Satker: s.Nama_Satker || p.ID_Satker, Jenis_Satker: s.Jenis || 'Satker Polda', Polda: p.Polda_Asal || s.Polda || '', Sumber: 'Aplikasi', Keterangan: '' };
    }).filter(Boolean);
    const man = (PK.rows || []).map((r) => Object.assign({}, r, { Jenis_Satker: r.Jenis_Satker === 'Polres' ? 'Polres' : 'Satker Polda' }));
    return app.concat(man);
  });
}
const byNama = (a, b) => String(a.Nama).localeCompare(String(b.Nama), 'id', { sensitivity: 'base', numeric: true }) || String(a.NRP_NIP).localeCompare(String(b.NRP_NIP)) || String(b.Tahun).localeCompare(String(a.Tahun));

/* ── Halaman ── */
const PangkalanPg = { kat: 'Diktukba', jenis: 'Satker Polda', q: '', diklat: '', tahun: '', polda: '', page: 1, per: 10, sel: new Set() };
registerPage('pangkalan', {
  title: 'Pangkalan Data Diklat', admin: true,
  render(el) { if (!el._built) pkBuild(el); pkUpdate(el); PK.load(false); }
});
function pkRefresh() { const el = $('.page[data-page="pangkalan"]'); if (el && el._built && Router.cur === 'pangkalan') pkUpdate(el); }

/** Filter selain jenis Satker → dipakai untuk hitungan tab Satker Polda / Polres. */
function pkBase() {
  const S = PangkalanPg, q = S.q.trim().toLowerCase();
  return pkAll().filter((r) => r.Kategori === S.kat && (!S.diklat || r.Nama_Diklat === S.diklat) && (!S.tahun || String(r.Tahun) === S.tahun) &&
    (!S.polda || r.Polda === S.polda) && (!q || (r.Nama + ' ' + r.NRP_NIP + ' ' + r.Jabatan + ' ' + r.Pangkat + ' ' + r.Satker + ' ' + r.Nama_Diklat).toLowerCase().includes(q)));
}
function pkFiltered() { return D.memo('pkF|' + PK.rev + '|' + JSON.stringify([PangkalanPg.kat, PangkalanPg.jenis, PangkalanPg.q, PangkalanPg.diklat, PangkalanPg.tahun, PangkalanPg.polda]), () => pkBase().filter((r) => r.Jenis_Satker === PangkalanPg.jenis).sort(byNama)); }

function pkBuild(el) {
  el.innerHTML =
    '<div class="ph"><div><h1>Pangkalan Data Pendidikan dan Pelatihan</h1>' +
    '<p class="desc">Riwayat personel yang telah melaksanakan Diktukba, Dikbangspes, dan Prolat <span class="muted" data-st></span></p></div>' +
    '<div class="ph-act"><button class="btn" data-imp>' + ic('upload') + 'Impor Excel</button><button class="btn btn-primary" data-add>' + ic('plus') + 'Tambah Riwayat</button>' +
    '<button class="btn btn-excel" data-xlsx>' + ic('sheet') + 'Unduh Excel</button></div></div>' +
    '<div class="pk-kat" data-kat></div>' +
    '<div class="card"><div class="card-b pf-b"><div class="pk-row">' +
    '<div class="field pf-q"><label class="lbl">Cari personel</label><div class="with-ic">' + ic('search') + '<input class="input" data-q placeholder="Nama / NRP / NIP / jabatan / satker" style="text-transform:none"></div></div>' +
    '<div class="field"><label class="lbl">Nama diklat</label><select class="select" data-f="diklat"></select></div>' +
    '<div class="field"><label class="lbl">Tahun</label><select class="select" data-f="tahun"></select></div>' +
    '<div class="field"><label class="lbl">Polda</label><select class="select" data-f="polda"></select></div>' +
    '<div class="field"><label class="lbl">Pengirim / kesatuan</label><div class="seg pk-jn" data-jn></div></div>' +
    '</div></div></div>' +
    '<div data-bulk></div>' +
    '<div class="card fill"><div class="tbl-wrap" data-wrap><table class="tbl rtable fx tbl-pk"><thead><tr><th class="ck w-ck"><input type="checkbox" data-all aria-label="Pilih semua"></th><th class="c w-no">No</th><th class="w-nm">Nama</th><th class="w-nrp">NRP / NIP</th><th class="w-pkt">Pangkat</th><th class="w-jab">Jabatan</th><th class="w-sat">Satker / Polres</th><th class="w-dik">Nama Diklat</th><th class="c w-th">Tahun</th><th class="c w-src">Sumber</th><th class="r w-act">Aksi</th></tr></thead><tbody data-rows></tbody></table></div>' +
    '<div class="card-f"><span class="foot-info" data-info></span><div class="pager" data-pager></div></div></div>';
  el._built = true;
  const S = PangkalanPg;
  const qi = $('[data-q]', el);
  qi.addEventListener('input', debounce(() => { S.q = qi.value; S.page = 1; pkUpdate(el); }, 220));
  $$('[data-f]', el).forEach((s) => s.addEventListener('change', () => { S[s.dataset.f] = s.value; S.page = 1; pkUpdate(el); }));
  $('[data-add]', el).addEventListener('click', () => pkForm(null));
  $('[data-imp]', el).addEventListener('click', () => pkImport());
  $('[data-xlsx]', el).addEventListener('click', () => pkExcel(pkFiltered()));
  Fit.watch($('[data-wrap]', el), () => pkUpdate(el));
  $('[data-all]', el).addEventListener('change', (e) => { pkPageItems().filter((r) => !r.app && !r._pending).forEach((r) => e.target.checked ? S.sel.add(r.ID_Riwayat) : S.sel.delete(r.ID_Riwayat)); pkUpdate(el); });
  el.addEventListener('change', (e) => { const c = e.target.closest('[data-ck]'); if (c) { c.checked ? S.sel.add(c.dataset.ck) : S.sel.delete(c.dataset.ck); pkUpdate(el); } });
  el.addEventListener('click', (e) => {
    const k = e.target.closest('[data-kat-v]'); if (k) { S.kat = k.dataset.katV; S.diklat = ''; S.tahun = ''; S.page = 1; S.sel.clear(); pkUpdate(el); return; }
    const j = e.target.closest('[data-jn-v]'); if (j) { S.jenis = j.dataset.jnV; S.page = 1; pkUpdate(el); return; }
    const pg = e.target.closest('[data-pg]'); if (pg && !pg.disabled) { S.page = +pg.dataset.pg; pkUpdate(el); return; }
    const b = e.target.closest('[data-pk]');
    if (b) {
      const r = pkAll().find((x) => x.ID_Riwayat === b.dataset.id); if (!r) return;
      if (b.dataset.pk === 'lihat') pkPersonel(r);
      if (b.dataset.pk === 'edit') pkForm(r);
      if (b.dataset.pk === 'del') pkDelete([r.ID_Riwayat]);
    }
    if (e.target.closest('[data-retry]')) PK.load(true);
    const bk = e.target.closest('[data-bulk-act]');
    if (bk) {
      if (bk.dataset.bulkAct === 'clear') { S.sel.clear(); pkUpdate(el); }
      if (bk.dataset.bulkAct === 'xlsx') pkExcel(pkAll().filter((r) => S.sel.has(r.ID_Riwayat)).sort(byNama), true);
      if (bk.dataset.bulkAct === 'del') pkDelete(Array.from(S.sel));
    }
  });
}

function pkPageItems() { const S = PangkalanPg, all = pkFiltered(); return all.slice((S.page - 1) * S.per, S.page * S.per); }

function pkUpdate(el, again) {
  const S = PangkalanPg, all = pkAll();
  // Kartu kategori: jumlah personel unik & program diklat, terpisah Satker Polda / Polres
  $('[data-kat]', el).innerHTML = KATEGORI.map((k) => {
    const rows = all.filter((r) => r.Kategori === k.k);
    const uniq = (f) => new Set(rows.filter(f).map((r) => r.NRP_NIP)).size;
    const prog = new Set(rows.map((r) => r.Nama_Diklat.toLowerCase() + '|' + r.Tahun)).size;
    return '<button type="button" class="pk-k k-' + k.c + (S.kat === k.k ? ' on' : '') + '" data-kat-v="' + k.k + '">' +
      '<span class="pk-ic">' + ic(k.i) + '</span><span class="pk-t"><b>' + k.k.toUpperCase() + '</b><small>' + k.t + '</small></span>' +
      '<span class="pk-n"><b data-count>' + uniq(() => true) + '</b><small>personel</small></span>' +
      '<span class="pk-s"><span>Satker Polda <b>' + uniq((r) => r.Jenis_Satker === 'Satker Polda') + '</b></span><span>Polres <b>' + uniq((r) => r.Jenis_Satker === 'Polres') + '</b></span><span>' + prog + ' angkatan diklat</span></span></button>';
  }).join('');

  const kat = all.filter((r) => r.Kategori === S.kat);
  const opt = (list, cur, label) => '<option value="">' + label + '</option>' + list.map((v) => '<option value="' + esc(v) + '"' + (v === cur ? ' selected' : '') + '>' + esc(v) + '</option>').join('');
  const diklats = Array.from(new Set(kat.map((r) => r.Nama_Diklat))).sort((a, b) => a.localeCompare(b, 'id'));
  const tahuns = Array.from(new Set(kat.map((r) => String(r.Tahun)).filter(Boolean))).sort().reverse();
  if (S.diklat && !diklats.includes(S.diklat)) S.diklat = '';
  if (S.tahun && !tahuns.includes(S.tahun)) S.tahun = '';
  $('[data-f=diklat]', el).innerHTML = opt(diklats, S.diklat, 'Semua ' + S.kat);
  $('[data-f=tahun]', el).innerHTML = opt(tahuns, S.tahun, 'Semua tahun');
  $('[data-f=polda]', el).innerHTML = poldaOptions(S.polda, 'Semua Polda');
  const qi = $('[data-q]', el); if (qi.value !== S.q && document.activeElement !== qi) qi.value = S.q;

  const base = pkBase(), nJ = (j) => base.filter((r) => r.Jenis_Satker === j).length;
  $('[data-jn]', el).innerHTML = JENIS_SATKER.map((j) => '<button type="button" data-jn-v="' + j + '" class="' + (S.jenis === j ? 'on' : '') + '">' + ic(j === 'Polres' ? 'map-pin' : 'building') + j + '<span class="cnt">' + nJ(j) + '</span></button>').join('');

  const st = $('[data-st]', el);
  st.innerHTML = PK.loading && !PK.rows ? '· <span class="spin" style="width:10px;height:10px"></span> memuat riwayat…' : PK.err && !PK.rows ? '· <span class="c-red">' + esc(PK.err) + '</span> <button class="linkbtn blue" data-retry>Coba lagi</button>' : '';

  const list = pkFiltered();
  const valid = new Set(all.map((r) => r.ID_Riwayat)); Array.from(S.sel).forEach((id) => { if (!valid.has(id)) S.sel.delete(id); });
  const pages = Math.max(1, Math.ceil(list.length / S.per)); S.page = Math.min(S.page, pages);
  const items = list.slice((S.page - 1) * S.per, S.page * S.per);

  $('[data-bulk]', el).innerHTML = S.sel.size ? '<div class="bulk"><span class="dot" style="color:#60a5fa"></span><span class="n">' + S.sel.size + ' RIWAYAT DIPILIH</span><span class="t">DATA MANUAL / IMPOR</span><span class="sp"></span>' +
    '<button class="btn btn-sm" data-bulk-act="clear" style="background:transparent;color:#fff;border-color:#2d4a85">Batal pilih</button>' +
    '<button class="btn btn-sm btn-success" data-bulk-act="xlsx">' + ic('download') + 'Unduh Excel</button>' +
    '<button class="btn btn-sm btn-danger" data-bulk-act="del">' + ic('trash') + 'Hapus Massal</button></div>' : '';

  const src = (r) => r.app ? '<span class="tag tag-blue" title="Peserta pelatihan SI-PRO yang sudah selesai">APLIKASI</span>' : r.Sumber === 'Impor' ? '<span class="tag tag-amber">IMPOR</span>' : '<span class="tag tag-gray">MANUAL</span>';
  const empty = !PK.rows && PK.loading ? '<span class="spin" style="width:22px;height:22px;color:var(--blue)"></span><b>Memuat Pangkalan Data…</b>'
    : ic('search') + '<b>Belum ada riwayat ' + esc(S.kat) + ' dari ' + esc(S.jenis) + '</b>' + (S.q || S.diklat || S.tahun || S.polda ? 'Ubah kata kunci atau filter.' : 'Peserta pelatihan yang sudah selesai masuk otomatis. Riwayat lama dapat ditambah atau diimpor dari Excel.');
  $('[data-rows]', el).innerHTML = items.length ? items.map((r, i) => {
    const busy = !!r._pending, can = !r.app && !busy, sel = S.sel.has(r.ID_Riwayat);
    return '<tr class="' + (sel ? 'sel' : '') + (busy ? ' pending' : '') + '"><td class="ck">' + (can ? '<input type="checkbox" data-ck="' + esc(r.ID_Riwayat) + '"' + (sel ? ' checked' : '') + ' aria-label="Pilih">' : '') + '</td>' +
      '<td class="no no-m c">' + ((S.page - 1) * S.per + i + 1) + '</td>' +
      '<td class="main" title="' + esc(r.Nama) + '"><div class="nm">' + esc(r.Nama) + '</div></td>' +
      '<td data-l="NRP / NIP" class="mono-n">' + esc(r.NRP_NIP) + '</td>' +
      '<td data-l="Pangkat" class="pkt">' + esc(r.Pangkat || '-') + '</td>' +
      '<td data-l="Jabatan" class="w-jab" title="' + esc(r.Jabatan) + '">' + esc(r.Jabatan || '-') + '</td>' +
      '<td data-l="Satker" title="' + esc(r.Satker + (r.Polda ? ' · ' + r.Polda : '')) + '">' + esc(r.Satker) + '</td>' +
      '<td data-l="Diklat" title="' + esc(r.Nama_Diklat + (r.Lokasi ? ' · ' + r.Lokasi : '')) + '"><span class="prog-chip">' + esc(r.Nama_Diklat) + '</span></td>' +
      '<td data-l="Tahun" class="c mono-n">' + esc(r.Tahun) + '</td>' +
      '<td data-l="Sumber" class="c w-src">' + src(r) + '</td>' +
      '<td class="acts-td"><div class="acts">' + (busy ? '<span class="tag tag-blue"><span class="spin" style="width:10px;height:10px"></span>Menyimpan…</span>'
        : '<button class="btn btn-xs act-view" data-pk="lihat" data-id="' + esc(r.ID_Riwayat) + '" title="Riwayat lengkap personel">' + ic('history') + '<span class="bt">Riwayat</span></button>' +
        (can ? '<button class="btn btn-xs act-edit" data-pk="edit" data-id="' + esc(r.ID_Riwayat) + '" title="Edit">' + ic('pencil') + '<span class="bt">Edit</span></button><button class="btn btn-xs act-del" data-pk="del" data-id="' + esc(r.ID_Riwayat) + '" title="Hapus">' + ic('trash') + '<span class="bt">Hapus</span></button>' : '')) + '</div></td></tr>';
  }).join('') : '<tr><td colspan="11"><div class="empty">' + empty + '</div></td></tr>';
  const allCk = $('[data-all]', el), ids = items.filter((r) => !r.app && !r._pending).map((r) => r.ID_Riwayat);
  allCk.checked = ids.length > 0 && ids.every((id) => S.sel.has(id)); allCk.indeterminate = !allCk.checked && ids.some((id) => S.sel.has(id)); allCk.disabled = !ids.length;
  const uniq = new Set(list.map((r) => r.NRP_NIP)).size;
  $('[data-info]', el).innerHTML = '<span class="dot"></span>' + esc(S.kat) + ' · ' + esc(S.jenis) + ': <b>' + list.length + '</b> riwayat · <b>' + uniq + '</b> personel' + (items.length ? ' · baris ' + ((S.page - 1) * S.per + 1) + '–' + ((S.page - 1) * S.per + items.length) : '');
  $('[data-pager]', el).innerHTML = pagerHtml(S.page, pages);
  const per = Fit.on() ? Fit.rows($('[data-wrap]', el), 10) : 10;
  if (per !== S.per && (again || 0) < 2) { const first = (S.page - 1) * S.per; S.per = per; S.page = Math.floor(first / per) + 1; pkUpdate(el, (again || 0) + 1); }
}

/* ── Riwayat lengkap satu personel (semua kategori) ── */
function pkPersonel(r) {
  const list = pkAll().filter((x) => x.NRP_NIP === r.NRP_NIP).sort((a, b) => String(b.Tahun).localeCompare(String(a.Tahun)) || KAT_NAMA.indexOf(a.Kategori) - KAT_NAMA.indexOf(b.Kategori));
  const last = list[0] || r;
  const row = (k, v) => '<dt>' + k + '</dt><dd>' + v + '</dd>';
  const per = KATEGORI.map((k) => {
    const g = list.filter((x) => x.Kategori === k.k);
    return '<div class="pk-tl"><div class="pk-tl-h k-' + k.c + '">' + ic(k.i) + '<b>' + k.k + '</b><small>' + k.t + '</small><span class="tag ' + (g.length ? 'tag-blue' : 'tag-gray') + '">' + g.length + '×</span></div>' +
      (g.length ? g.map((x) => '<div class="pk-tl-i"><span class="th mono">' + esc(x.Tahun) + '</span><div><b>' + esc(x.Nama_Diklat) + '</b><small>' +
        esc([x.Tanggal_Mulai ? fmtTgl(x.Tanggal_Mulai) + (x.Tanggal_Selesai ? ' – ' + fmtTgl(x.Tanggal_Selesai) : '') : '', x.Lokasi, x.Satker + ' (' + x.Jenis_Satker + ')', x.Keterangan].filter(Boolean).join(' · ')) +
        '</small></div><span class="tag ' + (x.app ? 'tag-blue' : x.Sumber === 'Impor' ? 'tag-amber' : 'tag-gray') + '">' + (x.app ? 'APLIKASI' : esc(String(x.Sumber || 'Manual').toUpperCase())) + '</span></div>').join('')
        : '<div class="pk-tl-e">Belum ada catatan ' + k.k + '.</div>') + '</div>';
  }).join('');
  const m = modal({ title: 'Riwayat Diklat — ' + last.Nama, icon: 'history', cls: 'wide', noFocus: true,
    body: '<dl class="detail-grid">' + row('NRP / NIP', '<span class="mono">' + esc(last.NRP_NIP) + '</span>') + row('Pangkat terakhir', esc(last.Pangkat || '-')) +
      row('Jabatan', esc(last.Jabatan || '-')) + row('Satker / Polres', esc(last.Satker) + ' <span class="tag tag-gray">' + esc(last.Jenis_Satker) + '</span>') + '</dl>' +
      '<div class="pk-tls">' + per + '</div>',
    foot: (r.app ? '' : '<button class="btn act-edit" data-e>' + ic('pencil') + 'Edit catatan ini</button>') + '<button class="btn" data-n>' + ic('plus') + 'Tambah riwayat personel ini</button><button class="btn btn-navy" data-x>Tutup</button>' });
  m.el.addEventListener('click', (e) => {
    if (e.target.closest('[data-e]')) { m.close(); pkForm(r); }
    if (e.target.closest('[data-n]')) { m.close(); pkForm({ Nama: last.Nama, NRP_NIP: last.NRP_NIP, Pangkat: last.Pangkat, Jabatan: last.Jabatan, ID_Satker: last.ID_Satker, Satker: last.Satker, Jenis_Satker: last.Jenis_Satker, Polda: last.Polda, Kategori: PangkalanPg.kat }, true); }
  });
}

/* ── Validasi (sama dengan server) ── */
function pkCek(o) {
  if (!KAT_NAMA.includes(o.Kategori)) return 'Kategori harus Diktukba, Dikbangspes, atau Prolat';
  if (!String(o.Nama || '').trim()) return 'Nama wajib diisi';
  if (!/^(\d{8}|\d{18})$/.test(o.NRP_NIP)) return 'NRP harus 8 digit atau NIP 18 digit';
  if (!String(o.Nama_Diklat || '').trim()) return 'Nama diklat wajib diisi';
  const th = +o.Tahun; if (!th || th < 1950 || th > 2100) return 'Tahun pelaksanaan tidak valid';
  if (o.Tanggal_Mulai && o.Tanggal_Selesai && o.Tanggal_Selesai < o.Tanggal_Mulai) return 'Tanggal selesai sebelum tanggal mulai';
  if (!String(o.Satker || o.ID_Satker || '').trim()) return 'Satker / Polres wajib diisi';
  return '';
}
function pkNrp(v) { let s = String(v == null ? '' : v).replace(/[\s.'-]/g, ''); if (/^\d{7}$/.test(s)) s = '0' + s; return s; }
function pkKunci(o) { return [pkNrp(o.NRP_NIP), o.Kategori, String(o.Nama_Diklat || '').trim().toLowerCase().replace(/\s+/g, ' '), String(o.Tahun)].join('|'); }

/* ── Tambah / ubah satu riwayat (instan: tampil dulu, server di latar) ── */
function pkForm(r, prefill) {
  const edit = !!(r && r.ID_Riwayat && !prefill);
  r = Object.assign({ Kategori: PangkalanPg.kat, Nama_Diklat: '', Tahun: '', Tanggal_Mulai: '', Tanggal_Selesai: '', Lokasi: '', Keterangan: '', Nama: '', NRP_NIP: '', Pangkat: '', Jabatan: '', ID_Satker: '', Satker: '', Jenis_Satker: PangkalanPg.jenis, Polda: '' }, r || {});
  const lain = !r.ID_Satker && !!r.Satker;
  const diklats = Array.from(new Set(pkAll().filter((x) => x.Kategori === r.Kategori).map((x) => x.Nama_Diklat))).slice(0, 200);
  const m = modal({ title: edit ? 'Ubah Riwayat Diklat' : 'Tambah Riwayat Diklat', icon: 'history', cls: 'wide', sticky: true,
    body: '<form data-f class="grid" novalidate autocomplete="off">' +
      '<div class="pk-sec">' + ic('graduation') + 'Pendidikan / pelatihan</div>' +
      '<div class="grid g3"><div class="field"><label>Kategori<span class="req">*</span></label><select class="select" name="Kategori">' + KATEGORI.map((k) => '<option value="' + k.k + '"' + (k.k === r.Kategori ? ' selected' : '') + '>' + k.k + ' — ' + k.t + '</option>').join('') + '</select></div>' +
      '<div class="field" style="grid-column:span 2"><label>Nama diklat / angkatan<span class="req">*</span></label><input class="input" name="Nama_Diklat" list="pkDiklatList" value="' + esc(r.Nama_Diklat) + '" placeholder="Mis. Diktukba Polri Gelombang I"><datalist id="pkDiklatList">' + diklats.map((d) => '<option value="' + esc(d) + '">').join('') + '</datalist></div></div>' +
      '<div class="grid g4"><div class="field"><label>Tahun<span class="req">*</span></label><input class="input mono" name="Tahun" inputmode="numeric" maxlength="4" value="' + esc(r.Tahun) + '" placeholder="2024"></div>' +
      '<div class="field"><label>Tanggal mulai</label><input class="input mono" type="date" name="Tanggal_Mulai" value="' + esc(r.Tanggal_Mulai) + '"></div>' +
      '<div class="field"><label>Tanggal selesai</label><input class="input mono" type="date" name="Tanggal_Selesai" value="' + esc(r.Tanggal_Selesai) + '"></div>' +
      '<div class="field"><label>Tempat</label><input class="input" name="Lokasi" value="' + esc(r.Lokasi) + '" placeholder="Mis. SPN Polda Papua Barat"></div></div>' +
      '<div class="pk-sec">' + ic('users') + 'Personel</div>' +
      '<div class="grid g4"><div class="field" style="grid-column:span 2"><label>Nama lengkap<span class="req">*</span></label><input class="input" name="Nama" value="' + esc(r.Nama) + '"></div>' +
      '<div class="field"><label>NRP / NIP<span class="req">*</span></label><input class="input mono" name="NRP_NIP" inputmode="numeric" maxlength="18" value="' + esc(r.NRP_NIP) + '" placeholder="8 / 18 digit"></div>' +
      '<div class="field"><label>Pangkat</label><input class="input" name="Pangkat" value="' + esc(r.Pangkat) + '" placeholder="Mis. BRIPDA"></div></div>' +
      '<div class="grid g4"><div class="field"><label>Jabatan</label><input class="input" name="Jabatan" value="' + esc(r.Jabatan) + '"></div>' +
      '<div class="field" style="grid-column:span 2"><label>Satker / Polres<span class="req">*</span></label><select class="select" name="ID_Satker">' + satOptions(lain ? '' : r.ID_Satker, '', 'Pilih Satker / Polres…', true) + '<option value="__lain"' + (lain ? ' selected' : '') + '>Lainnya (di luar daftar)…</option></select></div>' +
      '<div class="field"><label>Keterangan</label><input class="input" name="Keterangan" value="' + esc(r.Keterangan) + '" placeholder="Opsional"></div></div>' +
      '<div class="grid g3" data-lain' + (lain ? '' : ' hidden') + '><div class="field"><label>Nama kesatuan<span class="req">*</span></label><input class="input" name="Satker" value="' + esc(lain ? r.Satker : '') + '" placeholder="Mis. Polres Teluk Bintuni (lama)"></div>' +
      '<div class="field"><label>Jenis</label><select class="select" name="Jenis_Satker">' + JENIS_SATKER.map((j) => '<option' + (j === r.Jenis_Satker ? ' selected' : '') + '>' + j + '</option>').join('') + '</select></div>' +
      '<div class="field"><label>Polda</label><select class="select" name="Polda">' + POLDA.map((p) => '<option' + (p === r.Polda ? ' selected' : '') + '>' + p + '</option>').join('') + '</select></div></div>' +
      '</form>',
    foot: '<button class="btn" data-x>Batal</button><button class="btn btn-navy" data-save>' + ic('save') + 'Simpan</button>' });
  const f = $('[data-f]', m.el);
  f.ID_Satker.addEventListener('change', () => { $('[data-lain]', f).hidden = f.ID_Satker.value !== '__lain'; });
  f.Tanggal_Selesai.addEventListener('change', () => { if (!f.Tahun.value && f.Tanggal_Selesai.value) f.Tahun.value = f.Tanggal_Selesai.value.slice(0, 4); });
  const save = () => {
    const d = Object.fromEntries(new FormData(f).entries());
    d.NRP_NIP = pkNrp(d.NRP_NIP); d.Pangkat = d.Pangkat.toUpperCase();
    if (!d.Tahun && (d.Tanggal_Selesai || d.Tanggal_Mulai)) d.Tahun = (d.Tanggal_Selesai || d.Tanggal_Mulai).slice(0, 4);
    if (d.ID_Satker === '__lain') d.ID_Satker = ''; else { const s = D.sat(d.ID_Satker); d.Satker = s ? s.Nama_Satker : ''; d.Jenis_Satker = s ? s.Jenis : d.Jenis_Satker; d.Polda = s ? s.Polda : d.Polda; }
    const err = pkCek(d); if (err) return toast(err + '.', 'error');
    const k = pkKunci(d), dobel = pkAll().find((x) => x.ID_Riwayat !== (edit ? r.ID_Riwayat : '') && pkKunci(x) === k);
    if (dobel) return toast(d.Nama + ' sudah tercatat mengikuti ' + d.Nama_Diklat + ' tahun ' + d.Tahun + (dobel.app ? ' (dari aplikasi)' : '') + '.', 'error');
    if (edit) d.ID_Riwayat = r.ID_Riwayat;
    m.close();
    pkSimpan(d, edit ? r : null);
  };
  $('[data-save]', m.el).addEventListener('click', save);
  f.addEventListener('submit', (e) => { e.preventDefault(); save(); });
}
async function pkSimpan(d, lama) {
  const tmp = lama ? lama.ID_Riwayat : 'TMP-' + Date.now().toString(36);
  const row = Object.assign({}, lama || {}, d, { ID_Riwayat: tmp, _pending: true, Sumber: lama ? lama.Sumber : 'Manual', Tahun: String(d.Tahun) });
  PK.pending[tmp] = row;
  PK.set((rows) => { const i = rows.findIndex((x) => x.ID_Riwayat === tmp); if (i > -1) rows[i] = row; else rows.push(row); });
  PangkalanPg.kat = d.Kategori; PangkalanPg.jenis = d.Jenis_Satker === 'Polres' ? 'Polres' : 'Satker Polda';
  toast(lama ? 'Perubahan riwayat ' + d.Nama + ' tersimpan.' : 'Riwayat ' + d.Nama + ' ditambahkan.', 'success');
  const res = await api('saveRiwayat', d);
  delete PK.pending[tmp];
  if (res.success) PK.set((rows) => { const i = rows.findIndex((x) => x.ID_Riwayat === tmp); if (i > -1) rows[i] = res.data.riwayat; else rows.push(res.data.riwayat); });
  else { PK.set((rows) => { const i = rows.findIndex((x) => x.ID_Riwayat === tmp); if (i > -1) { if (lama) rows[i] = lama; else rows.splice(i, 1); } }); toast(res.message, 'error', 'Riwayat belum tersimpan'); pkForm(lama ? Object.assign({}, lama, d) : d, !lama); }
}
async function pkDelete(ids) {
  const set = new Set(ids), gone = (PK.rows || []).filter((r) => set.has(r.ID_Riwayat));
  if (!gone.length) return;
  const ok = await confirmDlg({ danger: true, title: gone.length > 1 ? 'Hapus ' + gone.length + ' riwayat?' : 'Hapus riwayat?', okText: 'Ya, hapus',
    message: gone.length > 1 ? '<b>' + gone.length + ' catatan riwayat</b> akan dihapus dari Pangkalan Data.' : 'Riwayat <b>' + esc(gone[0].Nama_Diklat) + '</b> milik <b>' + esc(gone[0].Nama) + '</b> akan dihapus dari Pangkalan Data.' });
  if (!ok) return;
  ids.forEach((id) => { PK.gone.add(id); PangkalanPg.sel.delete(id); });
  // baris hilang seketika, server dikonfirmasi di latar
  $$('.page[data-page="pangkalan"] [data-id]').forEach((b) => { if (set.has(b.dataset.id)) { const tr = b.closest('tr'); if (tr) tr.remove(); } });
  toast(gone.length > 1 ? gone.length + ' riwayat dihapus.' : 'Riwayat ' + gone[0].Nama + ' dihapus.', 'success');
  await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0)));
  PK.set((rows) => { for (let i = rows.length - 1; i >= 0; i--) if (set.has(rows[i].ID_Riwayat)) rows.splice(i, 1); });
  const res = await api('deleteRiwayat', { ids: gone.map((r) => r.ID_Riwayat) });
  ids.forEach((id) => PK.gone.delete(id));
  if (!res.success) { PK.set((rows) => { const ada = new Set(rows.map((r) => r.ID_Riwayat)); gone.forEach((r) => { if (!ada.has(r.ID_Riwayat)) rows.push(r); }); }); toast(res.message + ' Data dikembalikan.', 'error', 'Gagal menghapus'); }
}

/* ── Unduh Excel: rapi, urut abjad, mengikuti kategori + kesatuan + filter yang aktif ── */
function pkExcel(rows, terpilih) {
  rows = rows.filter((r) => !r._pending);
  if (!rows.length) return toast('Tidak ada data untuk diunduh.', 'warn');
  const S = PangkalanPg, now = witParts(new Date().toISOString());
  const stamp = now.d + ' ' + BLN_L[now.m - 1] + ' ' + now.y + ' pukul ' + String(now.H).padStart(2, '0') + ':' + String(now.M).padStart(2, '0') + ' WIT';
  const filt = [];
  if (S.diklat && !terpilih) filt.push(S.diklat); if (S.tahun && !terpilih) filt.push('Tahun ' + S.tahun);
  if (S.polda && !terpilih) filt.push(S.polda); if (S.q && !terpilih) filt.push('Pencarian "' + S.q + '"'); if (terpilih) filt.push('Data terpilih');
  const H = ['NO', 'NAMA', 'NRP / NIP', 'PANGKAT', 'JABATAN', 'SATKER / POLRES', 'POLDA', 'NAMA DIKLAT', 'TAHUN', 'PELAKSANAAN', 'TEMPAT', 'SUMBER'];
  const W = [6, 32, 21, 16, 30, 28, 24, 36, 9, 26, 24, 12], last = XLSX.col(H.length - 1);
  const t = (v, s) => ({ v, s });
  // Satu sheet per kategori × kesatuan (Satker Polda dan Polres TIDAK digabung)
  const groups = [];
  KAT_NAMA.forEach((k) => JENIS_SATKER.forEach((j) => { const g = rows.filter((r) => r.Kategori === k && r.Jenis_Satker === j).sort(byNama); if (g.length) groups.push({ k, j, g }); }));
  const sheets = groups.map(({ k, j, g }) => {
    const info = KATEGORI.find((x) => x.k === k);
    const R = [[t('PANGKALAN DATA PENDIDIKAN DAN PELATIHAN', 1)], [t(k.toUpperCase() + ' — ' + info.t.toUpperCase(), 2)], [t('Pengirim / kesatuan: ' + j.toUpperCase(), 2)],
      [t((filt.length ? 'Filter: ' + filt.join(' · ') + '   ·   ' : '') + 'Diurutkan menurut abjad nama   ·   Diunduh ' + stamp, 3)], [], H.map((h) => t(h, 4))];
    g.forEach((r, i) => R.push([t(i + 1, 6), t(r.Nama, 5), t(String(r.NRP_NIP), 7), t(r.Pangkat, 7), t(r.Jabatan, 5), t(r.Satker, 5), t(r.Polda, 5), t(r.Nama_Diklat, 5),
      t(String(r.Tahun), 7), t(r.Tanggal_Mulai ? fmtTgl(r.Tanggal_Mulai) + (r.Tanggal_Selesai ? ' – ' + fmtTgl(r.Tanggal_Selesai) : '') : '-', 7), t(r.Lokasi || '-', 5), t(r.app ? 'Aplikasi' : r.Sumber || 'Manual', 7)]));
    const end = R.length;
    R.push([t('JUMLAH: ' + g.length + ' RIWAYAT · ' + new Set(g.map((r) => r.NRP_NIP)).size + ' PERSONEL', 8)].concat(H.slice(1).map(() => t('', 8))));
    return { name: k + ' - ' + j, rows: R, cols: W, freeze: 6, printTitle: 5, heights: { 0: 24, 1: 20, 2: 18, 5: 30 }, filter: 'A6:' + last + end,
      merges: ['A1:' + last + '1', 'A2:' + last + '2', 'A3:' + last + '3', 'A4:' + last + '4', 'A' + (end + 1) + ':' + last + (end + 1)] };
  });
  const slug = (x) => String(x).replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const label = groups.length === 1 ? slug(groups[0].k + '-' + groups[0].j) : 'Terpilih';
  downloadBlob(XLSX.build(sheets), 'SI-PRO_Pangkalan-Data_' + label + '_' + now.y + '-' + String(now.m).padStart(2, '0') + '-' + String(now.d).padStart(2, '0') + '.xlsx');
  toast(rows.length + ' riwayat diunduh ke Excel' + (groups.length > 1 ? ' (' + groups.length + ' sheet terpisah)' : '') + ', urut abjad.', 'success');
}

/* ── Impor Excel / CSV ── */
const PK_ALIAS = {
  Kategori: ['kategori', 'kategoridiklat', 'jenisdiklat', 'kelompokdiklat', 'jenispendidikan'],
  Nama_Diklat: ['namadiklat', 'diklat', 'namapendidikan', 'pendidikan', 'namapelatihan', 'pelatihan', 'program', 'programdiklat', 'kursus', 'namakursus', 'angkatan'],
  Tahun: ['tahun', 'thn', 'tahunpelaksanaan', 'tahundiklat', 'tahunlulus'],
  Tanggal_Mulai: ['tanggalmulai', 'tglmulai', 'mulai'],
  Tanggal_Selesai: ['tanggalselesai', 'tglselesai', 'selesai', 'tanggallulus'],
  Lokasi: ['lokasi', 'tempat', 'tempatpendidikan', 'lembaga', 'tempatdiklat'],
  Nama: ['nama', 'namalengkap', 'namapersonel', 'namapeserta'],
  NRP_NIP: ['nrpnip', 'nrp', 'nip', 'nrpataunip', 'nomorinduk'],
  Pangkat: ['pangkat', 'pangkatgol', 'golongan', 'pangkatgolongan'],
  Jabatan: ['jabatan'],
  Satker: ['satkerpolres', 'satker', 'satuankerja', 'kesatuan', 'satuan', 'polres', 'satkerasal', 'asalsatker'],
  Jenis_Satker: ['jenissatker', 'jeniskesatuan', 'pengirim'],
  Polda: ['polda', 'wilayah', 'poldaasal'],
  Keterangan: ['keterangan', 'ket', 'catatan']
};
function pkNorm(h) { return String(h || '').toLowerCase().replace(/[^a-z0-9]/g, ''); }
/** Cari baris judul kolom (template punya judul di atasnya), lalu ubah ke objek. */
function pkRowsFromGrid(grid) {
  const map = {}; Object.keys(PK_ALIAS).forEach((k) => PK_ALIAS[k].forEach((a) => { map[a] = k; }));
  let hi = -1, best = 0;
  for (let i = 0; i < Math.min(grid.length, 15); i++) { const n = (grid[i] || []).filter((c) => map[pkNorm(c)]).length; if (n > best) { best = n; hi = i; } }
  if (hi < 0 || best < 3) throw new Error('Judul kolom tidak dikenali. Gunakan template: Kategori, Nama Diklat, Tahun, Nama, NRP / NIP, Satker / Polres, …');
  const cols = (grid[hi] || []).map((c) => map[pkNorm(c)] || '');
  const out = [];
  for (let i = hi + 1; i < grid.length; i++) {
    const r = grid[i] || []; if (!r.some((c) => String(c || '').trim())) continue;
    const o = { _baris: i + 1 }; cols.forEach((k, j) => { if (k && o[k] === undefined) o[k] = String(r[j] == null ? '' : r[j]).trim(); });
    if (/^jumlah/i.test(String(r[0] || '')) || (!o.Nama && !o.NRP_NIP)) continue;
    out.push(o);
  }
  return { rows: out, cols: cols.filter(Boolean) };
}
function pkTanggal(v) {
  const s = String(v || '').trim(); if (!s) return '';
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/); if (m) return m[1] + '-' + m[2].padStart(2, '0') + '-' + m[3].padStart(2, '0');
  m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})/); if (m) return m[3] + '-' + m[2].padStart(2, '0') + '-' + m[1].padStart(2, '0');
  return s;
}
/** Kolom Kategori kosong → tebak dari nama diklat (sama seperti server). */
function pkTebak(n) { n = String(n || '').toLowerCase(); return /diktuk|pembentukan|bintara|tamtama/.test(n) ? 'Diktukba' : /dikbangspes|pengembangan spesial|spesialisasi|kejuruan/.test(n) ? 'Dikbangspes' : ''; }
/**
 * Siapkan baris impor. j = jenis pelatihan terpilih { kat, nama, tahun, mulai, selesai, lokasi } → SEMUA baris
 * dicatat untuk jenis itu (kolom Kategori/Nama Diklat di berkas diabaikan). Tanpa jenis → ikuti kolom berkas.
 */
function pkSiapkan(raw, katDefault, j) {
  const satByName = {}; D.d.satker.forEach((s) => { satByName[s.Nama_Satker.toLowerCase()] = s; });
  const ada = new Set(pkAll().map(pkKunci)), lihat = new Set();
  const siap = [], salah = []; let dobel = 0;
  raw.forEach((x) => {
    const kRaw = String(x.Kategori || '').trim().toLowerCase();
    const o = Object.assign({}, x, {
      Kategori: j ? j.kat : KAT_NAMA.find((k) => k.toLowerCase() === kRaw) || (kRaw ? x.Kategori : pkTebak(x.Nama_Diklat) || katDefault),
      NRP_NIP: pkNrp(x.NRP_NIP), Pangkat: String(x.Pangkat || '').toUpperCase(),
      Tanggal_Mulai: pkTanggal(x.Tanggal_Mulai), Tanggal_Selesai: pkTanggal(x.Tanggal_Selesai)
    });
    if (j) {
      o.Nama_Diklat = j.nama;
      if (j.tahun) o.Tahun = j.tahun;
      if (!o.Tanggal_Mulai && j.mulai) o.Tanggal_Mulai = j.mulai;
      if (!o.Tanggal_Selesai && j.selesai) o.Tanggal_Selesai = j.selesai;
      if (!o.Lokasi && j.lokasi) o.Lokasi = j.lokasi;
    }
    o.Tahun = String(o.Tahun || '').replace(/\D/g, '').slice(0, 4) || (o.Tanggal_Selesai || o.Tanggal_Mulai || '').slice(0, 4);
    const s = satByName[String(o.Satker || '').toLowerCase()];
    if (s) { o.ID_Satker = s.ID_Satker; o.Jenis_Satker = s.Jenis; o.Polda = s.Polda; }
    else o.Jenis_Satker = /polres/i.test(o.Jenis_Satker || o.Satker || '') ? 'Polres' : 'Satker Polda';
    const err = pkCek(o); if (err) { salah.push({ baris: o._baris, pesan: err, nama: o.Nama }); return; }
    const k = pkKunci(o); if (ada.has(k) || lihat.has(k)) { dobel++; return; }
    lihat.add(k); siap.push(o);
  });
  return { siap, salah, dobel };
}
/** Daftar jenis pelatihan per kategori: pelatihan di aplikasi + nama diklat yang sudah ada di Pangkalan Data. */
function pkJenisList(kat) {
  const out = [], seen = new Set();
  D.pelSorted().filter((p) => (p.Kategori || 'Prolat') === kat).forEach((p) => {
    const key = p.Nama_Pelatihan.toLowerCase(); if (seen.has(key)) return; seen.add(key);
    out.push({ v: 'P:' + p.ID_Pelatihan, nama: p.Nama_Pelatihan, tahun: String(p.Tanggal_Selesai || p.Tanggal_Mulai || '').slice(0, 4), mulai: p.Tanggal_Mulai, selesai: p.Tanggal_Selesai, lokasi: p.Lokasi, g: 'Pelatihan di SI-PRO' });
  });
  Array.from(new Set(pkAll().filter((r) => r.Kategori === kat && !r.app).map((r) => r.Nama_Diklat))).sort((a, b) => a.localeCompare(b, 'id')).forEach((n) => {
    const key = n.toLowerCase(); if (seen.has(key)) return; seen.add(key);
    out.push({ v: 'N:' + n, nama: n, g: 'Sudah ada di Pangkalan Data' });
  });
  return out;
}
function pkTemplate(j) {
  const t = (v, s) => ({ v, s });
  const H = j ? ['NAMA', 'NRP / NIP', 'PANGKAT', 'JABATAN', 'SATKER / POLRES', 'POLDA', 'KETERANGAN']
    : ['KATEGORI', 'NAMA DIKLAT', 'TAHUN', 'TANGGAL MULAI', 'TANGGAL SELESAI', 'TEMPAT', 'NAMA', 'NRP / NIP', 'PANGKAT', 'JABATAN', 'SATKER / POLRES', 'POLDA', 'KETERANGAN'];
  const nrpCol = H.indexOf('NRP / NIP'), last = XLSX.col(H.length - 1);
  const contoh = j ? ['Contoh Nama Personel', t('95010123', 7), 'BRIPKA', 'Banit Reskrim', 'Polres Manokwari', 'Polda Papua Barat', 'Hapus baris contoh ini']
    : ['Diktukba', 'Diktukba Polri Gelombang I', 2015, '02/03/2015', '30/09/2015', 'SPN Polda Papua Barat', 'Contoh Nama Personel', t('95010123', 7), 'BRIPKA', 'Banit Reskrim', 'Polres Manokwari', 'Polda Papua Barat', 'Hapus baris contoh ini'];
  const rows = [[t('TEMPLATE IMPOR PANGKALAN DATA PENDIDIKAN DAN PELATIHAN — SI-PRO', 1)],
    [t(j ? 'Jenis pelatihan: ' + j.kat.toUpperCase() + ' — ' + j.nama + (j.tahun ? ' (' + j.tahun + ')' : '') + '. Isi daftar personel mulai baris 4. Kolom NRP / NIP berformat teks (8 atau 18 digit).'
      : 'Isi mulai baris 4. Kategori: Diktukba / Dikbangspes / Prolat. Kolom NRP / NIP sudah berformat teks (8 atau 18 digit). Tanggal boleh kosong; format 31/12/2024.', 3)],
    [], H.map((h) => t(h, 4)), contoh];
  for (let i = 0; i < 400; i++) { const r = H.map(() => ''); r[nrpCol] = t('', 7); rows.push(r); }
  const W = j ? [32, 21, 14, 28, 30, 24, 24] : [14, 34, 9, 15, 15, 24, 30, 21, 14, 26, 28, 24, 22];
  const slug = j ? '_' + String(j.nama).replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) : '';
  downloadBlob(XLSX.build([{ name: 'Pangkalan Data', rows, cols: W, freeze: 4, heights: { 0: 24, 1: 34, 3: 28 }, merges: ['A1:' + last + '1', 'A2:' + last + '2'] }]), 'Template_Impor_Pangkalan_Data' + slug + '.xlsx');
}
function pkImport() {
  const st = { siap: [], salah: [], dobel: 0, nama: '' };
  const m = modal({ title: 'Impor Riwayat dari Excel / CSV', icon: 'upload', cls: 'wide', sticky: true, noFocus: true,
    body: '<div class="pk-imp-g"><div class="field"><label>Kategori<span class="req">*</span></label><select class="select" data-kd>' + KATEGORI.map((k) => '<option value="' + k.k + '"' + (k.k === PangkalanPg.kat ? ' selected' : '') + '>' + k.k + ' — ' + k.t + '</option>').join('') + '</select></div>' +
      '<div class="field"><label>Jenis pelatihan</label><select class="select" data-jp></select></div>' +
      '<div class="field"><label>Tahun</label><input class="input mono" data-th inputmode="numeric" maxlength="4" placeholder="2024"></div></div>' +
      '<div class="field" data-baru hidden><label>Nama jenis pelatihan baru<span class="req">*</span></label><input class="input" data-nb placeholder="Mis. Diktukba Polri Gelombang II TA 2015"></div>' +
      '<p class="hint" data-jh style="margin:6px 0 0"></p>' +
      '<label class="pk-drop" data-drop><input type="file" accept=".xlsx,.csv,text/csv" hidden data-file>' + ic('cloud-upload') + '<b>Pilih atau seret berkas .xlsx / .csv</b><small>Sheet pertama dibaca · maks. 5.000 baris</small></label>' +
      '<div data-prev></div>',
    foot: '<button class="btn" data-tpl style="margin-right:auto">' + ic('download') + 'Unduh Template</button><button class="btn" data-x>Tutup</button><button class="btn btn-navy" data-go disabled>' + ic('save') + 'Simpan ke Pangkalan Data</button>' });
  const $m = (s) => $(s, m.el);
  const prev = $m('[data-prev]'), go = $m('[data-go]'), kd = $m('[data-kd]'), jp = $m('[data-jp]'), th = $m('[data-th]'), nb = $m('[data-nb]');
  let raw = [], opsi = [];
  const isiJenis = () => {
    opsi = pkJenisList(kd.value);
    const grup = (g) => opsi.filter((o) => o.g === g);
    jp.innerHTML = '<option value="">Ikuti kolom "Nama Diklat" di berkas</option>' +
      ['Pelatihan di SI-PRO', 'Sudah ada di Pangkalan Data'].map((g) => grup(g).length ? '<optgroup label="' + g + '">' + grup(g).map((o) => '<option value="' + esc(o.v) + '">' + esc(o.nama) + '</option>').join('') + '</optgroup>' : '').join('') +
      '<option value="__baru">+ Jenis pelatihan baru…</option>';
  };
  /** Jenis terpilih → objek; kosong → null (ikuti berkas). */
  const jenis = () => {
    const v = jp.value; if (!v) return null;
    if (v === '__baru') { const n = nb.value.trim().replace(/\s+/g, ' '); return n ? { kat: kd.value, nama: n, tahun: th.value.trim() } : { kat: kd.value, nama: '', tahun: th.value.trim() }; }
    const o = opsi.find((x) => x.v === v); return o ? { kat: kd.value, nama: o.nama, tahun: th.value.trim() || o.tahun || '', mulai: o.mulai, selesai: o.selesai, lokasi: o.lokasi } : null;
  };
  const hint = () => {
    const j = jenis();
    $m('[data-baru]').hidden = jp.value !== '__baru';
    $m('[data-jh]').innerHTML = j
      ? ic('info') + ' Semua baris dicatat sebagai <b>' + esc(kd.value) + ' — ' + esc(j.nama || '(isi nama jenis)') + '</b>' + (j.tahun ? ' tahun <b>' + esc(j.tahun) + '</b>' : ' (tahun dari kolom Tahun/Tanggal di berkas)') + '. Berkas cukup berisi daftar personel: Nama, NRP/NIP, Pangkat, Jabatan, Satker/Polres.'
      : ic('info') + ' Jenis &amp; tahun dibaca dari kolom <b>Nama Diklat</b> dan <b>Tahun</b> di setiap baris berkas. Kategori ' + esc(kd.value) + ' dipakai bila kolom Kategori kosong.';
  };
  const show = () => {
    hint(); if (!raw.length) return;
    const j = jenis();
    if (j && !j.nama) { prev.innerHTML = '<div class="alert alert-amber" style="margin-top:12px">' + ic('alert-triangle') + '<div>Isi nama jenis pelatihan baru terlebih dahulu.</div></div>'; go.disabled = true; return; }
    const r = pkSiapkan(raw, kd.value, j); Object.assign(st, r);
    const perKat = KAT_NAMA.map((k) => { const n = r.siap.filter((x) => x.Kategori === k).length; return n ? k + ' ' + n : ''; }).filter(Boolean).join(' · ');
    const perJn = JENIS_SATKER.map((x) => x + ' ' + r.siap.filter((y) => y.Jenis_Satker === x).length).join(' · ');
    prev.innerHTML = '<div class="pk-sum"><span class="tag tag-gray">' + esc(st.nama) + '</span><span class="tag tag-blue">' + raw.length + ' BARIS</span><span class="tag tag-green">' + r.siap.length + ' SIAP DISIMPAN</span>' +
      (r.dobel ? '<span class="tag tag-amber">' + r.dobel + ' SUDAH ADA</span>' : '') + (r.salah.length ? '<span class="tag tag-red">' + r.salah.length + ' SALAH</span>' : '') + '</div>' +
      (r.siap.length ? '<p class="hint" style="margin:6px 0">' + esc(perKat) + ' &nbsp;|&nbsp; ' + esc(perJn) + '</p><div class="tbl-wrap pk-pv"><table class="tbl"><thead><tr><th>Baris</th><th>Kategori</th><th>Jenis pelatihan</th><th>Tahun</th><th>Nama</th><th>NRP / NIP</th><th>Satker / Polres</th></tr></thead><tbody>' +
        r.siap.slice(0, 5).map((x) => '<tr><td class="mono-n">' + x._baris + '</td><td>' + esc(x.Kategori) + '</td><td>' + esc(x.Nama_Diklat) + '</td><td class="mono-n">' + esc(x.Tahun) + '</td><td>' + esc(x.Nama) + '</td><td class="mono-n">' + esc(x.NRP_NIP) + '</td><td>' + esc(x.Satker) + ' <span class="tag tag-gray">' + esc(x.Jenis_Satker) + '</span></td></tr>').join('') +
        '</tbody></table></div>' + (r.siap.length > 5 ? '<p class="hint">… dan ' + (r.siap.length - 5) + ' baris lainnya.</p>' : '') : '') +
      (r.salah.length ? '<div class="alert alert-red" style="margin-top:8px">' + ic('alert-triangle') + '<div><b>Baris yang dilewati karena salah:</b><br>' + r.salah.slice(0, 6).map((x) => 'Baris ' + x.baris + (x.nama ? ' (' + esc(x.nama) + ')' : '') + ': ' + esc(x.pesan)).join('<br>') + (r.salah.length > 6 ? '<br>… ' + (r.salah.length - 6) + ' baris lainnya.' : '') +
        (!j && r.salah.some((x) => /Nama diklat/.test(x.pesan)) ? '<br><br>Tip: pilih <b>Jenis pelatihan</b> di atas bila berkas hanya berisi daftar personel.' : '') + (r.salah.some((x) => /Tahun/.test(x.pesan)) ? '<br>Tip: isi kolom <b>Tahun</b> di atas.' : '') + '</div></div>' : '');
    go.disabled = !r.siap.length;
    go.innerHTML = ic('save') + 'Simpan ' + r.siap.length + ' riwayat';
  };
  const baca = async (file) => {
    if (!file) return;
    prev.innerHTML = '<p class="hint"><span class="spin" style="width:12px;height:12px"></span> Membaca ' + esc(file.name) + '…</p>';
    try {
      let grid;
      if (/\.csv$/i.test(file.name) || file.type === 'text/csv') {
        const text = await file.text(), objs = parseCsv(text);
        const h = objs.length ? Object.keys(objs[0]) : [];
        grid = [h].concat(objs.map((o) => h.map((k) => o[k])));
      } else grid = await XLSX.read(await file.arrayBuffer());
      const res = pkRowsFromGrid(grid);
      if (res.rows.length > 5000) throw new Error('Maksimal 5.000 baris sekali impor. Pecah berkas menjadi beberapa bagian.');
      if (!res.rows.length) throw new Error('Tidak ada baris data di bawah judul kolom.');
      raw = res.rows; st.nama = file.name; show();
    } catch (e) { raw = []; go.disabled = true; prev.innerHTML = '<div class="alert alert-red">' + ic('alert-triangle') + '<div>' + esc(e.message || String(e)) + '</div></div>'; }
  };
  isiJenis(); hint();
  $m('[data-file]').addEventListener('change', (e) => baca(e.target.files[0]));
  const drop = $m('[data-drop]');
  drop.addEventListener('dragover', (e) => { e.preventDefault(); drop.classList.add('over'); });
  drop.addEventListener('dragleave', () => drop.classList.remove('over'));
  drop.addEventListener('drop', (e) => { e.preventDefault(); drop.classList.remove('over'); baca(e.dataTransfer.files[0]); });
  kd.addEventListener('change', () => { isiJenis(); show(); });
  jp.addEventListener('change', () => { const o = opsi.find((x) => x.v === jp.value); if (o && o.tahun) th.value = o.tahun; show(); if (jp.value === '__baru') nb.focus(); });
  th.addEventListener('input', debounce(show, 250)); nb.addEventListener('input', debounce(show, 250));
  $m('[data-tpl]').addEventListener('click', () => { const j = jenis(); if (j && !j.nama) return toast('Isi nama jenis pelatihan baru dulu.', 'warn'); pkTemplate(j); });
  go.addEventListener('click', async () => {
    const rows = st.siap.slice(); if (!rows.length) return;
    const done = busyBtn(go, 'Menyimpan…'); m.busy(true);
    let tambah = 0, lewat = 0; const gagal = [];
    for (let i = 0; i < rows.length; i += 500) {
      go.innerHTML = '<span class="spin" style="width:12px;height:12px"></span> Menyimpan ' + Math.min(rows.length, i + 500) + ' / ' + rows.length + '…';
      const res = await api('saveRiwayatBatch', { rows: rows.slice(i, i + 500) });
      if (!res.success) { gagal.push(res.message); break; }
      tambah += res.data.riwayat.length; lewat += res.data.dilewati;
      (res.data.salah || []).forEach((x) => gagal.push('Baris ' + x.baris + ': ' + x.pesan));
      PK.set((list) => { res.data.riwayat.forEach((x) => list.push(x)); });
    }
    done(); m.busy(false);
    if (tambah) { const first = rows[0]; PangkalanPg.kat = first.Kategori; PangkalanPg.jenis = first.Jenis_Satker; PangkalanPg.diklat = jenis() ? first.Nama_Diklat : ''; PangkalanPg.tahun = ''; PangkalanPg.page = 1; pkRefresh(); }
    if (gagal.length && !tambah) return toast(gagal[0], 'error', 'Impor gagal');
    m.close();
    toast(tambah + ' riwayat masuk Pangkalan Data' + (lewat ? ', ' + lewat + ' sudah ada' : '') + (gagal.length ? ', ' + gagal.length + ' gagal' : '') + '.', gagal.length ? 'warn' : 'success', 'Impor selesai');
  });
}
