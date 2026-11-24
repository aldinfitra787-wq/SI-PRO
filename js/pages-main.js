/* =========================================================================
   SI-PRO — Halaman: Beranda, Input Peserta, Data Peserta
   ========================================================================= */
'use strict';

/* ─────────────────────────── BERANDA ─────────────────────────── */
const Beranda = { wil: '', q: '', page: 1, per: 6 };
registerPage('beranda', {
  title: 'Beranda',
  render(el) { isAdmin() ? berandaAdmin(el) : berandaPetugas(el); }
});

function berandaAdmin(el, again) {
  const pelId = D.defaultPel(), pel = D.pel(pelId), wil = Beranda.wil;
  const st = pelId ? D.statusSatker(pelId, wil) : [];
  const sudah = st.filter((x) => x.n).length, tot = st.length, belum = tot - sudah;
  const pes = D.pesertaOf(pelId, wil);
  const kuota = pelId ? D.totalKuota(pelId, wil) : 0;
  const aktif = D.pelAktif(), selesai = D.d.pelatihan.filter((p) => p.Status === 'Selesai').length;
  const drafts = D.d.pelatihan.filter((p) => p.Status === 'Draft');

  if (!el._built) {
    el.innerHTML =
      '<div class="ph"><div><h1 class="ttl-bar">Pusat Kendali Pelatihan</h1>' +
      '<p class="desc mono">Monitoring distribusi &amp; kelengkapan berkas peserta pelatihan · Polda PB &amp; PBD · <span data-asof></span></p></div>' +
      '<div class="ph-act"><div class="filters"><div class="fbox"><span class="lbl">PROGRAM</span><select class="select" data-f="pel"></select></div>' +
      '<div class="fbox"><span class="lbl">WILAYAH</span><select class="select" data-f="wil"></select></div></div>' +
      '<button class="btn btn-icon" data-sync title="Sinkronkan data" aria-label="Sinkronkan">' + ic('refresh') + '</button><a class="btn btn-primary" href="#/master/pelatihan">' + ic('graduation') + 'Pelatihan &amp; Kuota</a></div></div>' +
      '<div data-body class="fcol fill"></div>';
    el._built = true;
    $('[data-sync]', el).addEventListener('click', async (e) => { const done = busyBtn(e.currentTarget, ''); const r = await Data.sync(true); done(); toast(r.success ? 'Data terbaru sudah dimuat.' : r.message, r.success ? 'info' : 'error'); });
    $('[data-f=pel]', el).addEventListener('change', (e) => { setPel(e.target.value); Beranda.page = 1; berandaAdmin(el); });
    $('[data-f=wil]', el).addEventListener('change', (e) => { Beranda.wil = e.target.value; Beranda.page = 1; berandaAdmin(el); });
    el.addEventListener('click', (e) => {
      const go = e.target.closest('[data-goto-belum]'); if (go) { AppState.selPel = go.dataset.gotoBelum; Router.go('belum'); }
      const lihat = e.target.closest('[data-lihat]'); if (lihat) { const [s, p] = lihat.dataset.lihat.split('|'); Object.assign(PesertaPg, { sat: s, pel: p, polda: '', q: '', page: 1 }); Router.go('peserta'); }
    });
  }
  $('[data-f=pel]', el).innerHTML = pelOptions(pelId) || '<option value="">Belum ada pelatihan</option>';
  $('[data-f=wil]', el).innerHTML = poldaOptions(wil);
  $('[data-asof]', el).textContent = 'Data per ' + (AppState.lastSync ? fmtWaktu(new Date(AppState.lastSync).toISOString()) : '-') + ' WIT';

  if (!D.d.pelatihan.length) {
    $('[data-body]', el).innerHTML = '<div class="card"><div class="empty">' + ic('graduation') + '<b>Belum ada program pelatihan</b>Buat pelatihan pertama di menu Kelola Master → Pelatihan.<br><br><a class="btn btn-navy" href="#/master/pelatihan">' + ic('plus') + 'Buat Pelatihan</a></div></div>';
    return;
  }
  const pctK = pct(sudah, tot);
  const notice = drafts.length ? '<div class="notice"><div style="display:flex;gap:12px;align-items:center">' + ic('alert-triangle') + '<div><b>' + drafts.length + ' pelatihan masih Draft</b> — belum dibagikan ke Satker: ' +
    esc(drafts.slice(0, 3).map((p) => p.Nama_Pelatihan).join(', ')) + (drafts.length > 3 ? ', …' : '') + '</div></div><a class="btn btn-sm btn-navy" href="#/master/pelatihan">Atur kuota &amp; bagikan</a></div>' : '';
  const stats = notice +
    '<div class="stats">' +
    '<div class="stat l-blue"><div class="top-l"><span class="lbl">Total Peserta Terdaftar</span><span class="si">' + ic('users') + '</span></div><div class="big c-navy">' + pes.length + '<small>personel</small></div>' +
    '<div class="foot"><span>Target kuota' + (kuota ? ' · terisi ' + pct(pes.length, kuota) + '%' : '') + '</span><span class="tag tag-blue">' + (kuota ? kuota + ' ORANG' : 'TANPA KUOTA') + '</span></div></div>' +
    '<div class="stat l-green"><div class="top-l"><span class="lbl">Satker Sudah Kirim</span><span class="si green">' + ic('check-circle') + '</span></div><div class="big c-green">' + sudah + ' / ' + tot + '<small>Satker ditunjuk</small></div>' +
    '<div class="foot"><span class="tag tag-green">' + pctK + '% KEPATUHAN</span><span>Tercatat di sistem</span></div></div>' +
    '<div class="stat l-red"><div class="top-l"><span class="lbl">Satker Belum Kirim</span><span class="si red">' + ic('alert-triangle') + '</span></div><div class="big c-red">' + belum + '<small>Satker/Polres</small></div>' +
    '<div class="foot">' + (belum ? '<span class="tag tag-red">[!] PERLU TINDAKAN</span><button class="linkbtn" data-goto-belum="' + esc(pelId) + '">Lihat daftar</button>' : '<span class="tag tag-green">NIHIL</span><span>Semua mengirim</span>') + '</div></div>' +
    '<div class="stat l-amber"><div class="top-l"><span class="lbl">Pelatihan Berjalan</span><span class="si amber">' + ic('graduation') + '</span></div><div class="big c-amber">' + aktif.length + '<small>Program aktif</small></div>' +
    '<div class="foot"><span>Draft ' + drafts.length + ' · Selesai ' + selesai + '</span><span class="tag tag-amber">DIBAGIKAN</span></div></div></div>';

  // Progres per pelatihan aktif
  const prog = aktif.length ? aktif.map((p) => {
    const s = D.statusSatker(p.ID_Pelatihan, wil), sd = s.filter((x) => x.n).length, t = s.length, pc = pct(sd, t);
    const sisa = D.sisaHari(p), lewat = D.lewat(p);
    const cls = pc >= 100 ? 'green' : pc >= 50 ? '' : 'amber';
    const kq = D.totalKuota(p.ID_Pelatihan, wil), np = D.pesertaOf(p.ID_Pelatihan, wil).length;
    const right = (kq ? '<span class="tag tag-gray">' + np + ' / ' + kq + ' PESERTA</span>' : '') + (pc >= 100 ? '<span class="tag tag-green">SEMUA SATKER KIRIM</span>' : '<span>' + sd + ' / ' + t + ' Satker (' + Math.round(pc) + '%)</span>');
    const foot = pc >= 100 ? '<span>Seluruh Satker telah mengirim peserta</span><span class="tag tag-green">SIAP REKAP</span>'
      : '<span>' + (t - sd) + ' satker belum mengirim peserta</span><button class="linkbtn blue" data-goto-belum="' + esc(p.ID_Pelatihan) + '">Lihat daftar defisit →</button>';
    return '<div class="prog-item"><div class="h"><div><b>' + esc(p.Nama_Pelatihan) + '</b><span class="bt">Batas: ' + (p.Batas_Kirim ? fmtTgl(p.Batas_Kirim) : '—') + '</span>' +
      (lewat ? ' <span class="tag tag-gray">DITUTUP</span>' : sisa != null && sisa <= 3 ? ' <span class="tag tag-red">' + sisa + ' HARI LAGI</span>' : '') + '</div><div class="v">' + right + '</div></div>' +
      '<div class="bar thick ' + cls + '"><i style="width:' + Math.min(100, pc) + '%"></i></div><div class="f">' + foot + '</div></div>';
  }).join('') : '<div class="empty">' + ic('calendar') + '<b>Tidak ada pelatihan aktif</b></div>';

  const pb = pes.filter((p) => p.Polda_Asal === POLDA[0]).length, pbd = pes.filter((p) => p.Polda_Asal === POLDA[1]).length;
  const donut = donutSvg([{ v: pb, color: '#1e3a8a' }, { v: pbd, color: '#0ea5e9' }], 170, 26,
    '<text x="85" y="86" text-anchor="middle" font-size="30" font-weight="800" fill="#0f2147" font-family="Arial,sans-serif">' + pes.length + '</text>' +
    '<text x="85" y="106" text-anchor="middle" font-size="9.5" letter-spacing="1.5" fill="#1d4ed8" font-family="Arial,sans-serif">PERSONEL</text>');

  // Pengiriman terakhir (satker × pelatihan)
  const grp = {};
  D.d.peserta.filter((p) => (!wil || p.Polda_Asal === wil)).forEach((p) => {
    const k = p.ID_Satker + '|' + p.ID_Pelatihan;
    const g = grp[k] || (grp[k] = { sat: p.ID_Satker, pel: p.ID_Pelatihan, n: 0, sprin: 0, sppd: 0, foto: 0, last: '' });
    g.n++; if (p.Link_SPRIN) g.sprin++; if (p.Link_SPPD) g.sppd++;
    const t = p.Tanggal_Ubah || p.Tanggal_Input; if (t > g.last) g.last = t;
  });
  let recent = Object.values(grp).sort((a, b) => String(b.last).localeCompare(String(a.last)));
  const q = Beranda.q.toLowerCase();
  if (q) recent = recent.filter((g) => D.satNama(g.sat).toLowerCase().includes(q) || D.pelNama(g.pel).toLowerCase().includes(q));
  const slice = recent;                                     // tanpa halaman: semua pengiriman, digulir
  const bk = (lbl, x, n) => '<span class="berkas-ok ' + (x === n ? '' : x ? 'berkas-part' : 'berkas-no') + '">' + lbl + '<span>' + (x === n ? '[OK]' : x + '/' + n) + '</span></span>';
  const rows = slice.length ? slice.map((g) => {
    const s = D.sat(g.sat) || {}, full = g.sprin === g.n && g.sppd === g.n, kq = D.alok(g.pel)[g.sat] || 0;
    return '<tr><td class="main" data-l="Satker"><div class="nm">' + esc(s.Nama_Satker || g.sat) + '</div><div class="sub" style="color:var(--blue)">' + esc((s.Jenis || 'Satker Polda') + ' · ' + (s.Polda || '')) + '</div></td>' +
      '<td data-l="Program" class="ell" title="' + esc(D.pelNama(g.pel)) + '">' + esc(D.pelNama(g.pel)) + '</td><td data-l="Jumlah" class="mono-n">' + g.n + (kq ? ' / ' + kq : '') + '<span class="fit-no"> orang</span></td>' +
      '<td data-l="Waktu kirim" class="mono-n" style="font-size:12.5px">' + fmtWaktu(g.last) + '<span class="fit-no"> WIT</span></td>' +
      '<td data-l="Berkas"><div class="berkas-set">' + bk('SPRIN', g.sprin, g.n) + bk('SPPD', g.sppd, g.n) + '</div></td>' +
      '<td class="acts-td"><div class="acts"><button class="btn btn-xs act-view" data-lihat="' + esc(g.sat + '|' + g.pel) + '" title="Lihat peserta">' + ic('eye') + '<span class="fit-no">Lihat</span></button></div></td></tr>';
  }).join('') : '<tr><td colspan="6"><div class="empty">' + ic('folder-open') + '<b>Belum ada pengiriman</b>Data akan muncul setelah Satker mengirimkan peserta.</div></td></tr>';

  $('[data-body]', el).innerHTML = stats +
    '<div class="dash fill">' +
    '<div class="card fill"><div class="card-h"><div><h3 class="up"><span class="ico">' + ic('history') + '</span>Pengiriman Data Terakhir</h3></div>' +
    '<div class="with-ic" style="min-width:240px">' + ic('search') + '<input class="input" data-q placeholder="Cari Satker / Polres…" value="' + esc(Beranda.q) + '"></div></div>' +
    '<div class="tbl-wrap" data-wrap><table class="tbl rtable fx tbl-recent"><thead><tr><th>Satker / Polres</th><th>Program</th><th>Jumlah</th><th>Waktu</th><th>Berkas</th><th class="r"></th></tr></thead><tbody>' + rows + '</tbody></table></div>' +
    '<div class="card-f"><span class="foot-info"><b>' + recent.length + '</b> pengiriman</span><span class="flow-hint">' + ic('chevron-down') + 'Gulir untuk melihat semua</span></div></div>' +
    '<div class="fcol side">' +
    '<div class="card fill" data-progc><div class="card-h"><h3 class="up"><span class="ico">' + ic('chart') + '</span>Progress per Pelatihan</h3><span class="tag tag-blue fit-no">' + (wil ? D.poldaShort(wil) : 'PB + PBD') + '</span></div><div class="card-b scroll">' + prog + '</div></div>' +
    '<div class="card"><div class="card-h"><h3 class="up"><span class="ico">' + ic('pie') + '</span>Distribusi per Polda</h3><span class="tag tag-gray">N = ' + pes.length + '</span></div><div class="card-b donut-row">' +
    '<div class="donut-wrap">' + donut + '</div>' +
    '<div class="legend"><div class="lbl" style="margin-bottom:4px">' + esc(pel ? pel.Nama_Pelatihan : '') + '</div><div class="li"><i style="background:#1e3a8a"></i>Polda Papua Barat<span class="v"><b>' + pb + '</b> (' + pct(pb, pes.length) + '%)</span></div>' +
    '<div class="li"><i style="background:#0ea5e9"></i>Polda Papua Barat Daya<span class="v"><b>' + pbd + '</b> (' + pct(pbd, pes.length) + '%)</span></div></div></div></div>' +
    '</div></div>';
  AutoPager.attach($('[data-wrap]', el).parentElement);
  AutoPager.attach($('[data-progc]', el), { box: '.card-b', items: '.prog-item' });
  const qi = $('[data-q]', el);
  qi.addEventListener('input', debounce((e) => { Beranda.q = e.target.value; Beranda.page = 1; berandaAdmin(el); const n = $('[data-q]', el); n.focus(); n.setSelectionRange(n.value.length, n.value.length); }, 250));
}

/** Petugas: pita pengumuman pembukaan diklat (yang belum dibaca ditandai BARU). */
function berandaPgm() {
  const list = (D.d.pengumuman || []).slice().sort((a, b) => String(a.Tanggal_Buka || a.Tanggal_Mulai || '9').localeCompare(String(b.Tanggal_Buka || b.Tanggal_Mulai || '9')));
  if (!list.length) return '';
  const baru = PgmSeen.baru().length, g = PgmSeen.baru()[0] || list[0], w = pgmWaktu(g);
  return '<a class="pgm-strip" href="#/pengumuman">' + ic('megaphone') + '<span class="lbl">Pengumuman</span>' + (baru ? '<span class="tag tag-red">' + baru + ' BARU</span>' : '') + pgmChip(g.Kategori) +
    '<b>' + esc(g.Judul) + '</b>' + (w ? '<span class="c-' + w.c + '">' + esc(w.t) + '</span>' : '') + '<span class="go">' + (list.length > 1 ? 'Lihat ' + list.length + ' pengumuman' : 'Lihat') + ic('arrow-right') + '</span></a>';
}
function berandaPetugas(el) {
  const me = D.d.me, mine = D.d.peserta, my = me.idSatker;
  const pels = D.pelSorted().filter((p) => p.Status !== 'Draft');
  const aktif = pels.filter((p) => p.Status === 'Aktif');
  const totKuota = aktif.reduce((s, p) => s + (D.alok(p.ID_Pelatihan)[my] || 0), 0);
  const terisi = aktif.reduce((s, p) => s + mine.filter((x) => x.ID_Pelatihan === p.ID_Pelatihan).length, 0);
  const lengkap = mine.filter(D.lengkap).length;
  el._built = false;
  el.innerHTML =
    '<div class="ph"><div><h1 class="ttl-bar">' + esc(me.namaSatker || 'Satker') + '</h1>' +
    '<p class="desc mono">' + esc(me.polda) + ' · ' + esc((D.sat(my) || {}).Jenis || '') + ' · ID ' + esc(my) + '</p></div></div>' +
    berandaPgm() +
    '<div class="stats">' +
    '<div class="stat l-blue"><div class="top-l"><span class="lbl">Kuota Diterima</span><span class="si">' + ic('users') + '</span></div><div class="big c-navy">' + totKuota + '<small>orang</small></div><div class="foot"><span>' + aktif.length + ' pelatihan dibagikan</span></div></div>' +
    '<div class="stat l-green"><div class="top-l"><span class="lbl">Peserta Didaftarkan</span><span class="si green">' + ic('check-circle') + '</span></div><div class="big c-green">' + terisi + (totKuota ? ' / ' + totKuota : '') + '</div><div class="foot"><span>' + (totKuota ? 'Terisi ' + pct(terisi, totKuota) + '% dari kuota' : 'Semua pelatihan aktif') + '</span></div></div>' +
    '<div class="stat l-red"><div class="top-l"><span class="lbl">Sisa Kuota</span><span class="si red">' + ic('alert-triangle') + '</span></div><div class="big c-red">' + Math.max(0, totKuota - terisi) + '<small>orang</small></div><div class="foot"><span>' + (totKuota - terisi > 0 ? 'Segera daftarkan peserta' : 'Kuota terpenuhi') + '</span></div></div>' +
    '<div class="stat l-amber"><div class="top-l"><span class="lbl">Berkas Lengkap</span><span class="si amber">' + ic('file-check') + '</span></div><div class="big c-amber">' + lengkap + ' / ' + mine.length + '</div><div class="foot"><span>SPRIN &amp; SPPD terunggah</span></div></div></div>' +
    '<div class="card fill" data-minec><div class="card-h"><h3 class="up"><span class="ico">' + ic('list-checks') + '</span>Pelatihan untuk Satker Anda</h3><span class="lbl">Dibagikan oleh Admin Induk</span></div><div class="card-b scroll"><div class="mine-pel">' +
    (pels.length ? pels.map((p) => {
      const ki = D.kuotaInfo(p.ID_Pelatihan, my), n = mine.filter((x) => x.ID_Pelatihan === p.ID_Pelatihan), lk = n.filter(D.lengkap).length;
      const lewat = D.lewat(p), sisa = D.sisaHari(p), tutup = lewat || p.Status !== 'Aktif';
      const st = p.Status === 'Selesai' ? '<span class="tag tag-gray">SELESAI</span>' : lewat ? '<span class="tag tag-gray">' + ic('lock') + 'PENDAFTARAN DITUTUP</span>'
        : !n.length ? '<span class="tag tag-red">' + ic('alert-triangle') + 'BELUM KIRIM</span>' : ki.penuh ? '<span class="tag tag-green">' + ic('check') + 'KUOTA TERPENUHI</span>' : '<span class="tag tag-amber">KURANG ' + ki.sisa + ' ORANG</span>';
      return '<div class="mine-row"><div class="t"><b>' + esc(p.Nama_Pelatihan) + '</b><div class="s"><span>' + ic('map-pin') + ' ' + esc(p.Lokasi || 'SPN Polda Papua Barat') + '</span><span>' + ic('calendar') + ' ' + fmtTgl(p.Tanggal_Mulai) + ' – ' + fmtTgl(p.Tanggal_Selesai) + '</span>' +
        (p.Batas_Kirim ? '<span>Batas pendaftaran: ' + fmtTgl(p.Batas_Kirim) + ' 23:59 WIT' + (!lewat && sisa != null ? ' (' + sisa + ' hari lagi)' : '') + '</span>' : '') + '</div>' +
        (ki.has ? '<div class="kq"><div class="s"><span><b style="color:var(--ink);text-transform:none;font-size:13.5px">Kuota ' + ki.kuota + ' orang</b> · terisi ' + ki.terisi + ' · berkas lengkap ' + lk + '/' + n.length + '</span></div><div class="bar ' + (ki.penuh ? 'green' : 'amber') + '"><i style="width:' + Math.min(100, pct(ki.terisi, ki.kuota)) + '%"></i></div></div>' : '') + '</div>' +
        '<div class="r">' + st + (!tutup && !ki.penuh ? '<button class="btn btn-sm btn-primary" data-add="' + esc(p.ID_Pelatihan) + '">' + ic('user-plus') + 'Daftarkan Peserta</button>' : '') +
        (n.length ? '<button class="btn btn-sm" data-see="' + esc(p.ID_Pelatihan) + '">' + ic('eye') + 'Lihat (' + n.length + ')</button>' : '') + '</div></div>';
    }).join('') : '<div class="empty">' + ic('calendar') + '<b>Belum ada pelatihan untuk Satker Anda</b>Pelatihan muncul di sini setelah Admin Induk membagikan kuota ke Satker Anda.</div>') +
    '</div></div></div>';
  AutoPager.attach($('[data-minec]', el), { box: '.card-b', items: '.mine-row' });
  el.onclick = (e) => {
    const a = e.target.closest('[data-add]'); if (a) { AppState.selPel = a.dataset.add; InputPg.reset = true; Router.go('input'); }
    const s = e.target.closest('[data-see]'); if (s) { Object.assign(PesertaPg, { pel: s.dataset.see, q: '', page: 1 }); Router.go('peserta'); }
  };
}

/* ─────────────────────────── INPUT PESERTA ─────────────────────────── */
const PANGKAT = ['IRJEN POL', 'BRIGJEN POL', 'KOMBES POL', 'AKBP', 'KOMPOL', 'AKP', 'IPTU', 'IPDA', 'AIPTU', 'AIPDA', 'BRIPKA', 'BRIGADIR', 'BRIPTU', 'BRIPDA',
  'ABRIP', 'ABRIPTU', 'ABRIPDA', 'BHARAKA', 'BHARATU', 'BHARADA', 'PEMBINA (IV/A)', 'PENATA TK.I (III/D)', 'PENATA (III/C)', 'PENATA MUDA TK.I (III/B)',
  'PENATA MUDA (III/A)', 'PENGATUR TK.I (II/D)', 'PENGATUR (II/C)', 'PENGATUR MUDA TK.I (II/B)', 'PENGATUR MUDA (II/A)', 'JURU (I/C)'];
const InputPg = { reset: false, f: null, slots: null, editId: '' };
function emptySlot() { return { fileId: '', name: '', size: 0, at: '', local: null, preview: '', status: 'idle', msg: '' }; }

registerPage('input', {
  title: 'Input Peserta', live: false, petugas: true,
  render(el, param, info) {
    const editId = param || '';
    const batch = !editId && !isAdmin();
    // Petugas: ambil kuota/pelatihan terbaru dari server setiap membuka formulir (di latar, tidak menunggu)
    if (!isAdmin() && Date.now() - AppState.lastSync > 15000) Data.sync(true);
    if (batch) {
      // Datang dari tombol "Tambah peserta" pada pelatihan tertentu → pakai pelatihan itu bila daftar masih kosong
      if (InputPg.batch && AppState.selPel && AppState.selPel !== InputPg.batch.pel && !InputPg.batch.rows.some(batchFilled)) { InputPg.batch = null; el._batch = false; }
      if (info.fresh || info.changed || InputPg.reset || InputPg.editId || !el._batch) { InputPg.reset = false; InputPg.editId = ''; if (!InputPg.batch) batchInit(); else InputPg.f = Object.assign(InputPg.f || {}, { ID_Satker: D.d.me.idSatker }); batchBuild(el); }
      return;
    }
    if (info.fresh || info.changed || InputPg.reset || InputPg.editId !== editId || el._batch) { el._batch = false; InputPg.reset = false; inputInit(editId); inputBuild(el); }
  },
  onData(el) {
    if (!el.isConnected || el.hidden) return;
    const adaBanner = !!$('.kosong-info', el), ada = pelChoices(D.d.me.idSatker).length > 0;
    if (el._batch && adaBanner === ada && !(InputPg.batch && InputPg.batch.rows.some(batchFilled))) { InputPg.batch = null; batchBuild(el); return; }   // ketersediaan berubah → susun ulang formulir
    if (el._batch) { $$('select[data-k=ID_Pelatihan]', el).forEach((s, i) => { s.innerHTML = batchPelOptions(InputPg.batch.rows[i].ID_Pelatihan, true); }); const bp = $('#bPel', el); if (bp) bp.innerHTML = batchPelOptions(InputPg.batch.pel, false); batchSummary(el); }
    else { inputPelOptions(el); inputKuota(el); }
  }
});

/**
 * Petugas: alasan formulir belum aktif — dihitung dari data yang diterima server
 * (server hanya mengirim pelatihan yang SUDAH DIBAGIKAN dan memberi kuota ke Satker ini).
 */
function kosongInfo() {
  const my = D.d.me.idSatker, pels = D.d.pelatihan.filter((p) => p.Status !== 'Draft');
  const aktif = pels.filter((p) => p.Status === 'Aktif'), lewat = aktif.filter((p) => D.lewat(p));
  let why;
  if (!pels.length) why = 'Belum ada pelatihan yang <strong>dibagikan</strong> ke ' + esc(D.d.me.namaSatker || 'Satker Anda') + '. Bila Admin Induk sudah mengatur kuota, pelatihan perlu <strong>dibagikan</strong> (Kelola Master → Pelatihan → Bagikan / Simpan &amp; Bagikan) agar muncul di sini.';
  else if (!aktif.length) why = 'Semua pelatihan untuk Satker Anda sudah <strong>selesai</strong>.';
  else if (lewat.length === aktif.length) why = 'Batas pendaftaran ' + lewat.map((p) => '<strong>' + esc(p.Nama_Pelatihan) + '</strong> (' + fmtTgl(p.Batas_Kirim) + ')').join(', ') + ' sudah lewat. Hubungi Admin Induk bila perlu dibuka kembali.';
  else why = 'Pelatihan yang dibagikan belum memberi kuota untuk ' + esc(D.d.me.namaSatker || 'Satker Anda') + '.';
  const t = AppState.lastSync ? fmtWaktu(new Date(AppState.lastSync).toISOString()) : '-';
  return '<div class="alert alert-amber kosong-info">' + ic('lock') + '<div><b>BELUM ADA PELATIHAN UNTUK SATKER ANDA</b><span>' + why +
    '</span><small class="muted" style="display:block;margin-top:4px">Data diperiksa ' + esc(t) + ' WIT · ID Satker Anda: <span class="mono">' + esc(my) + '</span></small></div>' +
    '<button type="button" class="btn btn-sm" data-recheck>' + ic('refresh') + 'Periksa ulang</button></div>';
}
/** Tombol "Periksa ulang" & sinkron otomatis saat formulir dibuka tanpa pelatihan tersedia. */
async function recheckPelatihan(el, manual) {
  if (recheckPelatihan.busy) return;
  recheckPelatihan.busy = true;
  const b = $('[data-recheck]', el), done = b ? busyBtn(b, 'Memeriksa…') : null;
  const res = await Data.sync(true);
  recheckPelatihan.busy = false; if (done && b.isConnected) done();
  const ada = pelChoices(D.d.me.idSatker).length > 0;
  if (ada && el.isConnected) {
    const kosong = !InputPg.batch || !InputPg.batch.rows.some(batchFilled);
    if (kosong) { InputPg.batch = null; batchBuild(el); }
    toast('Pelatihan untuk Satker Anda sudah tersedia. Silakan isi peserta.', 'success');
  } else if (manual) toast(res.success ? 'Belum ada pelatihan yang dibagikan ke Satker Anda.' : res.message, res.success ? 'warn' : 'error');
  else if (el.isConnected && el._batch) { const k = $('.kosong-info', el); if (k) k.outerHTML = kosongInfo(); }
}

/** Pelatihan yang bisa dipilih untuk Satker terpilih (sudah dibagikan & Satker mendapat kuota). */
function pelChoices(satId) {
  const admin = isAdmin();
  return D.pelSorted().filter((p) => (admin ? p.Status !== 'Selesai' : p.Status === 'Aktif') && D.canSubmit(p, satId || (admin ? '' : D.d.me.idSatker)));
}

function inputInit(editId) {
  const me = D.d.me;
  InputPg.editId = editId;
  InputPg.slots = { SPRIN: emptySlot(), SPPD: emptySlot() };
  const p = editId ? D.d.peserta.find((x) => x.ID_Peserta === editId) : null;
  if (editId && !p) { toast('Data peserta tidak ditemukan.', 'error'); InputPg.editId = ''; }
  if (p) {
    InputPg.f = { Nama: p.Nama, NRP_NIP: p.NRP_NIP, Pangkat: p.Pangkat, Jabatan: p.Jabatan, ID_Satker: p.ID_Satker, ID_Pelatihan: p.ID_Pelatihan };
    ['SPRIN', 'SPPD'].forEach((j) => {
      const id = D.fileId(p['Link_' + j]);
      if (id) Object.assign(InputPg.slots[j], { fileId: id, name: p.ID_Pelatihan + '_' + p.ID_Satker + '_' + j + '_' + p.NRP_NIP + '.pdf', status: 'done', existing: true });
    });
  } else {
    const prev = InputPg.f || {};
    const sat = isAdmin() ? (prev.ID_Satker || '') : me.idSatker;
    const ok = (id) => pelChoices(sat).some((x) => x.ID_Pelatihan === id);
    const first = (pelChoices(sat).find((x) => !D.kuotaInfo(x.ID_Pelatihan, sat).penuh) || pelChoices(sat)[0] || {}).ID_Pelatihan || '';
    InputPg.f = { Nama: '', NRP_NIP: '', Pangkat: '', Jabatan: '', ID_Satker: sat, ID_Pelatihan: ok(AppState.selPel) ? AppState.selPel : (ok(prev.ID_Pelatihan) ? prev.ID_Pelatihan : first) };
  }
}

function inputPelOptions(el) {
  const sel = $('[name=ID_Pelatihan]', el); if (!sel) return;
  const sat = InputPg.f.ID_Satker, list = pelChoices(sat), cur = InputPg.f.ID_Pelatihan;
  const extra = cur && !list.some((p) => p.ID_Pelatihan === cur) && D.pel(cur) && InputPg.editId ? [D.pel(cur)] : [];
  if (cur && !extra.length && !list.some((p) => p.ID_Pelatihan === cur)) InputPg.f.ID_Pelatihan = '';
  sel.innerHTML = '<option value="">' + (isAdmin() && !sat ? '— Pilih Satker terlebih dahulu —' : list.length ? '— Pilih program pelatihan —' : '— Tidak ada pelatihan untuk Satker ini —') + '</option>' +
    extra.concat(list).map((p) => {
      const ki = D.kuotaInfo(p.ID_Pelatihan, sat || D.d.me.idSatker, InputPg.editId);
      return '<option value="' + esc(p.ID_Pelatihan) + '"' + (p.ID_Pelatihan === InputPg.f.ID_Pelatihan ? ' selected' : '') + '>' + esc(p.Nama_Pelatihan) +
        (p.Status === 'Draft' ? ' (Draft)' : '') + (ki.has ? ' — sisa ' + ki.sisa + ' dari ' + ki.kuota : '') + '</option>';
    }).join('');
}
/** Kotak info kuota Satker untuk pelatihan terpilih; mengunci tombol simpan bila penuh. */
function inputKuota(el) {
  const box = $('[data-kuota]', el), save = $('[data-save]', el); if (!box) return;
  const f = InputPg.f, pel = D.pel(f.ID_Pelatihan), satId = f.ID_Satker;
  let full = false;
  if (!pel || !satId) box.innerHTML = '';
  else {
    const ki = D.kuotaInfo(pel.ID_Pelatihan, satId, InputPg.editId), s = D.sat(satId);
    if (!ki.has) box.innerHTML = '<div class="kuota-box none">' + ic('info') + '<span>Pelatihan ini tidak memakai pembatasan kuota.</span></div>';
    else if (ki.penuh && !InputPg.editId) { full = true; box.innerHTML = '<div class="kuota-box full">' + ic('alert-circle') + '<span><b>Kuota ' + esc(s.Nama_Satker) + ' sudah penuh</b> (' + ki.terisi + ' dari ' + ki.kuota + ' orang). ' + (isAdmin() ? 'Tambah kuota di Kelola Master → Pelatihan.' : 'Hubungi Admin Induk bila perlu tambahan kuota.') + '</span></div>'; }
    else box.innerHTML = '<div class="kuota-box ok">' + ic('users') + '<span>Kuota <b>' + esc(s.Nama_Satker) + '</b>: <b>' + ki.kuota + ' orang</b> · sudah terdaftar ' + ki.terisi + ' · <b>sisa ' + ki.sisa + '</b>' + (InputPg.editId ? ' (termasuk peserta ini)' : '') + '</span></div>';
  }
  if (save) save.disabled = full || !pelChoices(satId).length && !InputPg.editId;
}

function inputBuild(el) {
  const me = D.d.me, admin = isAdmin(), f = InputPg.f, edit = !!InputPg.editId;
  const sat = D.sat(f.ID_Satker);
  const tersedia = admin || pelChoices(me.idSatker).length > 0 || edit;
  el.innerHTML =
    '<div class="ph"><div><h1>' + (edit ? 'Ubah Data Peserta' : 'Formulir Pendaftaran Peserta Pelatihan') + ' <span class="tag tag-gray" style="font-size:11px">' + (edit ? 'MODE UBAH' : 'ENTRI BARU') + '</span></h1>' +
    '<p class="desc">Daftarkan personel yang diikutkan pelatihan di SPN sesuai kuota yang dibagikan Admin Induk. Lampirkan SPRIN &amp; SPPD (PDF).</p></div>' +
    '<div class="ph-act"><a class="btn" href="#/peserta">' + ic('arrow-left') + 'Data Peserta</a></div></div>' +
    '<div data-failed></div>' +
    (!tersedia ? kosongInfo() : '') +
    '<form id="fPeserta" class="fit-form" novalidate autocomplete="off">' +
    // 01 — program dulu agar kuota terlihat sebelum mengisi
    '<section class="card fsec s1"><div class="card-h"><h3><span class="num">01</span>Pelatihan &amp; Satker Pengirim</h3><span class="tag tag-blue">Sesuai kuota</span></div><div class="card-b"><div class="grid g3">' +
    (admin
      ? '<div class="field"><label for="iSat">Satuan Kerja (Satker)<span class="req">*</span></label><select id="iSat" class="select" name="ID_Satker">' + satOptions(f.ID_Satker, '', '— Pilih Satker —') + '</select><span class="hint">Admin dapat menginput untuk Satker berkuota</span></div>'
      : '<div class="field"><label>Satuan Kerja (Satker) ' + ic('lock', 'lock-ic') + '<span class="tag tag-blue" style="margin-left:auto">OTOMATIS</span></label><input class="input" value="' + esc(me.namaSatker || '') + '" readonly><span class="hint">Terkunci sesuai akun petugas</span></div>') +
    '<div class="field"><label>Polda Wilayah ' + ic('lock', 'lock-ic') + '<span class="tag tag-blue" style="margin-left:auto">OTOMATIS</span></label><input class="input" data-polda value="' + esc((sat && sat.Polda) || '') + '" readonly placeholder="Mengikuti Satker"></div>' +
    '<div class="field"><label for="iPel">Program Pelatihan<span class="req">*</span></label><select id="iPel" class="select" name="ID_Pelatihan"></select><span class="hint" data-pelhint></span></div>' +
    '</div><div data-kuota style="margin-top:14px"></div></div></section>' +
    // 02 — identitas
    '<section class="card fsec s2"><div class="card-h"><h3><span class="num">02</span>Identitas Personel</h3><span class="tag tag-blue">Data pribadi &amp; kepangkatan</span></div><div class="card-b"><div class="grid g2">' +
    '<div class="field"><label for="iNama">Nama Lengkap &amp; Gelar<span class="req">*</span></label><input id="iNama" class="input" name="Nama" value="' + esc(f.Nama) + '" placeholder="Contoh: Herman Sawaki, S.H." maxlength="120"><span class="hint">Sesuai KTA / KEP, sertakan gelar resmi</span></div>' +
    '<div class="field"><label for="iNrp">NRP / NIP<span class="req">*</span></label><input id="iNrp" class="input mono" name="NRP_NIP" value="' + esc(f.NRP_NIP) + '" inputmode="numeric" maxlength="18" placeholder="8 digit NRP / 18 digit NIP"><span class="hint">8 digit angka NRP atau 18 digit angka NIP</span></div>' +
    '<div class="field"><label for="iPangkat">Pangkat<span class="req">*</span></label><input id="iPangkat" class="input" name="Pangkat" list="dlPangkat" value="' + esc(f.Pangkat) + '" placeholder="Ketik / pilih pangkat" style="text-transform:uppercase"><datalist id="dlPangkat">' + PANGKAT.map((p) => '<option value="' + p + '">').join('') + '</datalist><span class="hint">Sesuai keputusan kenaikan pangkat terakhir</span></div>' +
    '<div class="field"><label for="iJabatan">Jabatan Saat Ini<span class="req">*</span></label><input id="iJabatan" class="input" name="Jabatan" value="' + esc(f.Jabatan) + '" placeholder="Contoh: BA Satreskrim Polres Manokwari" maxlength="150"><span class="hint">Nama jabatan &amp; satuan kerja penugasan riil</span></div>' +
    '</div></div></section>' +
    // 03 — berkas
    '<section class="card fsec s3"><div class="card-h"><h3><span class="num">03</span>Berkas Pendukung</h3><span class="tag tag-blue">PDF · Maks 5 MB per berkas</span></div><div class="card-b">' +
    '<div class="drive-path">' + ic('cloud-upload') + 'Folder tujuan Google Drive: <b data-path></b></div>' +
    '<div class="grid g2 slots"><div data-slot="SPRIN"></div><div data-slot="SPPD"></div></div>' +
    '</div></section>' +
    '<div class="sticky-bar"><div class="w">' + ic('alert-triangle') + '<span>Kolom bertanda <b style="color:var(--red)">*</b> wajib diisi. Berkas boleh masih diunggah saat Anda menekan Simpan.</span></div>' +
    '<span class="tag tag-blue pend" data-pend hidden></span>' +
    '<button type="button" class="btn" data-reset>' + (edit ? 'Batal' : 'Reset') + '</button>' +
    '<button type="submit" class="btn btn-success btn-lg" data-save' + (tersedia ? '' : ' disabled') + '>' + ic('save') + (edit ? 'Simpan Perubahan' : 'Simpan Data Peserta') + '</button></div>' +
    '</form>';

  inputPelOptions(el);
  const form = $('#fPeserta', el);
  const upd = () => {
    const s = D.sat(InputPg.f.ID_Satker);
    $('[data-polda]', el).value = s ? s.Polda : '';
    $('[data-path]', el).textContent = s ? 'Google Drive › ' + s.Polda + ' › ' + s.ID_Satker + ' - ' + s.Nama_Satker : 'Google Drive › … (pilih Satker)';
    const pl = D.pel(InputPg.f.ID_Pelatihan);
    $('[data-pelhint]', el).textContent = pl ? (pl.Lokasi || 'SPN Polda Papua Barat') + ' · ' + fmtTgl(pl.Tanggal_Mulai) + ' – ' + fmtTgl(pl.Tanggal_Selesai) + (pl.Batas_Kirim ? ' · daftar s.d. ' + fmtTgl(pl.Batas_Kirim) : '') : 'Hanya pelatihan yang dibagikan ke Satker ini';
    inputKuota(el);
  };
  form.addEventListener('input', (e) => {
    const n = e.target.name; if (!n || n === 'ID_Satker' || n === 'ID_Pelatihan') return;
    let v = e.target.value;
    if (n === 'NRP_NIP') { v = v.replace(/\D/g, ''); e.target.value = v; }
    InputPg.f[n] = v; e.target.classList.remove('err');
  });
  form.addEventListener('change', (e) => {
    const n = e.target.name; if (!n) return;
    InputPg.f[n] = e.target.value; e.target.classList.remove('err');
    if (n === 'ID_Satker') inputPelOptions(el);
    if (n === 'ID_Pelatihan') AppState.selPel = e.target.value;
    upd();
  });
  form.addEventListener('submit', (e) => { e.preventDefault(); inputSave(el); });
  form.addEventListener('keydown', (e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); inputSave(el); } });
  $('[data-reset]', el).addEventListener('click', async () => {
    if (InputPg.editId) return Router.go('peserta');
    if (await confirmDlg({ title: 'Kosongkan formulir?', message: 'Isian dan berkas yang belum disimpan akan dihapus dari formulir.', okText: 'Kosongkan' })) { InputPg.f = null; inputInit(''); inputBuild(el); }
  });
  ['SPRIN', 'SPPD'].forEach((j) => renderSlot(el, j));
  upd(); inputPend(0); inputFailBanner(el);
  if (!InputPg.editId) setTimeout(() => { const t = admin && !f.ID_Satker ? $('#iSat', el) : $('#iNama', el); if (t) t.focus(); }, 50);
}

function renderSlot(el, jenis) {
  const s = InputPg.slots[jenis], host = $('[data-slot="' + jenis + '"]', el);
  const B = InputPg.batch, batchMode = !!($('.page[data-page="input"]') || {})._batch && !InputPg.editId;
  const gab = batchMode && B && B.gabung;
  const title = gab ? 'SPRIN & SPPD (satu berkas PDF)' : jenis === 'SPRIN' ? '1. Surat Perintah (SPRIN)' : '2. Surat Perintah Perjalanan Dinas (SPPD)';
  const tag = s.status === 'done' ? '<span class="tag tag-green">TERUNGGAH</span>' : s.status === 'uploading' ? '<span class="tag tag-blue">MENGUNGGAH…</span>' : '<span class="tag tag-amber">MENUNGGU BERKAS</span>';
  let body;
  if (s.status === 'idle' || s.status === 'error') {
    body = '<div class="drop" data-drop tabindex="0" role="button" aria-label="Pilih berkas ' + jenis + '"><div class="fi ' + (jenis === 'SPPD' ? 'n' : '') + '">' + ic(jenis === 'SPPD' ? 'file-up' : 'file-text') + '</div>' +
      '<div class="t">Klik atau seret berkas PDF ' + (gab ? 'SPRIN + SPPD' : jenis) + ' di sini</div><div class="s">Format .PDF · ukuran maksimal 5 MB</div>' +
      '<span class="btn ' + (jenis === 'SPPD' ? 'btn-primary' : '') + ' btn-mono btn-sm">' + ic('upload') + 'Pilih Berkas PDF</span></div>' +
      (s.status === 'error' ? '<div class="file-card err"><div class="r1">' + ic('alert-circle', 'pdf') + '<div class="nmw"><b>' + esc(s.name || 'Unggah gagal') + '</b><small>' + esc(s.msg) + '</small></div></div></div>' : '');
  } else {
    body = '<div class="file-card ' + (s.status === 'uploading' ? 'busy' : '') + '"><div class="r1">' + ic('file-text', 'pdf') + '<div class="nmw"><b>' + esc(s.name) + '</b><small>' +
      (s.status === 'uploading' ? 'Mengunggah ke Google Drive…' : (s.size ? fmtSize(s.size) + ' · ' : '') + (s.existing ? 'Tersimpan di Drive' : 'Terunggah ' + s.at + ' WIT')) + '</small></div>' +
      (s.status === 'uploading' ? '<span class="spin" style="color:var(--blue)"></span>' : ic('check-circle', 'okc')) + '</div>' +
      (s.status === 'done' ? '<div class="r2"><button type="button" data-a="view" style="color:var(--blue)">[PRATINJAU]</button><button type="button" data-a="ganti" style="color:var(--amber)">[GANTI]</button><button type="button" data-a="hapus" style="color:var(--red)">[HAPUS]</button></div>' : '') + '</div>';
  }
  host.innerHTML = '<div class="up-h"><span>' + title + '<span class="req">*</span></span>' + tag + '</div>' + body +
    (jenis === 'SPPD' && !batchMode ? '<div class="upnote">' + ic('info') + '<span>SPPD wajib memuat tanda tangan otorisasi pejabat berwenang. Berkas dapat menyusul lewat menu Edit.</span></div>' : '') +
    '<input type="file" accept="application/pdf,.pdf" hidden data-file>';
  bindSlot(el, jenis, host);
}

function bindSlot(el, jenis, host) {
  const s = InputPg.slots[jenis], inp = $('[data-file]', host), pick = () => inp.click();
  const drop = $('[data-drop]', host);
  const handle = (file) => uploadSlot(el, jenis, file);
  if (drop) {
    drop.addEventListener('click', pick);
    drop.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); } });
    drop.addEventListener('dragover', (e) => { e.preventDefault(); drop.classList.add('over'); });
    drop.addEventListener('dragleave', () => drop.classList.remove('over'));
    drop.addEventListener('drop', (e) => { e.preventDefault(); drop.classList.remove('over'); if (e.dataTransfer.files[0]) handle(e.dataTransfer.files[0]); });
  }
  inp.addEventListener('change', () => { if (inp.files[0]) handle(inp.files[0]); });
  host.querySelectorAll('[data-a]').forEach((b) => b.addEventListener('click', () => {
    if (b.dataset.a === 'view') viewPdf(s.fileId, jenis + ' — ' + (InputPg.f.Nama || s.name), s.local);
    if (b.dataset.a === 'ganti') pick();
    if (b.dataset.a === 'hapus') { InputPg.slots[jenis] = emptySlot(); renderSlot(el, jenis); }
  }));
}

function slotNeedsSatker(jenis) {
  if (isAdmin() && !InputPg.f.ID_Satker) { Object.assign(InputPg.slots[jenis], emptySlot(), { status: 'error', msg: 'Pilih Satker terlebih dahulu.' }); toast('Pilih Satker terlebih dahulu sebelum mengunggah.', 'error'); return true; }
  return false;
}

async function uploadSlot(el, jenis, file) {
  const setErr = (slot, msg) => { Object.assign(slot, emptySlot(), { status: 'error', name: file.name, msg }); if (InputPg.slots[jenis] === slot) renderSlot(el, jenis); toast(msg, 'error', 'Berkas ' + jenis + ' ditolak'); };
  if (!/\.pdf$/i.test(file.name) && file.type !== 'application/pdf') return setErr(InputPg.slots[jenis], 'Hanya berkas PDF yang dapat diunggah.');
  if (file.size > 5 * 1024 * 1024) return setErr(InputPg.slots[jenis], 'Ukuran ' + fmtSize(file.size) + ' melebihi batas 5 MB.');
  const head = new Uint8Array(await file.slice(0, 5).arrayBuffer());
  if (String.fromCharCode.apply(null, head) !== '%PDF-') return setErr(InputPg.slots[jenis], 'Isi berkas bukan PDF yang valid.');
  if (slotNeedsSatker(jenis)) return renderSlot(el, jenis);
  // Unggah langsung di latar saat berkas dipilih; formulir boleh disimpan walau unggahan belum selesai
  const slot = InputPg.slots[jenis] = Object.assign(emptySlot(), { status: 'uploading', name: file.name, size: file.size, local: file });
  renderSlot(el, jenis);
  const f = InputPg.f;
  slot.promise = (async () => {
    const base64 = await readFileB64(file);
    const pg = $('.page[data-page="input"]'), batchMode = !!(pg && pg._batch) && !InputPg.editId;
    const apiJenis = batchMode && InputPg.batch.gabung && jenis === 'SPRIN' ? 'SPRIN-SPPD' : jenis;
    const res = await api('uploadBerkas', batchMode
      ? { jenis: apiJenis, idSatker: f.ID_Satker, name: file.name, base64 }               // berkas bersama: dinamai saat disimpan
      : { jenis, idSatker: f.ID_Satker, name: file.name, base64, pel: f.ID_Pelatihan, nrp: /^(\d{8}|\d{18})$/.test(f.NRP_NIP) ? f.NRP_NIP : '' });
    if (!res.success) { setErr(slot, res.message); return false; }
    const t = witParts(new Date().toISOString());
    Object.assign(slot, { status: 'done', fileId: res.data.fileId, at: t.d + ' ' + BLN[t.m - 1] + ' ' + String(t.H).padStart(2, '0') + ':' + String(t.M).padStart(2, '0') });
    if (InputPg.slots[jenis] === slot) renderSlot(el, jenis);
    return true;
  })();
}

async function inputSave(el) {
  const f = InputPg.f, errs = [];
  const mark = (name, bad) => { const i = $('[name="' + name + '"]', el); if (i) i.classList.toggle('err', bad); if (bad) errs.push(name); };
  if (isAdmin()) mark('ID_Satker', !f.ID_Satker);
  mark('ID_Pelatihan', !f.ID_Pelatihan);
  mark('Nama', !f.Nama.trim()); mark('NRP_NIP', !/^(\d{8}|\d{18})$/.test(f.NRP_NIP)); mark('Pangkat', !f.Pangkat.trim()); mark('Jabatan', !f.Jabatan.trim());
  if (errs.length) {
    const first = $('[name="' + errs[0] + '"]', el); if (first) first.focus();
    return toast(errs.includes('NRP_NIP') && f.NRP_NIP ? 'NRP harus 8 digit atau NIP 18 digit angka.' : 'Lengkapi kolom yang ditandai merah.', 'error', 'Data belum dapat disimpan');
  }
  const editId = InputPg.editId;
  const dup = D.d.peserta.find((x) => x.NRP_NIP === f.NRP_NIP && x.ID_Pelatihan === f.ID_Pelatihan && x.ID_Peserta !== editId);
  if (dup) { mark('NRP_NIP', true); return toast('NRP/NIP ' + f.NRP_NIP + ' sudah terdaftar pada pelatihan ini (' + dup.Nama + ').', 'error', 'Data ganda'); }
  if (Object.values(InputPg.slots).some((x) => x.status === 'error' && x.msg)) return toast('Perbaiki atau hapus berkas yang gagal diunggah.', 'warn');

  // ── Optimistic: tampil & formulir siap lagi seketika, pengiriman berjalan di latar ──
  const slots = InputPg.slots, me = D.d.me, sat = D.sat(f.ID_Satker) || {}, now = new Date().toISOString();
  const prev = editId ? D.d.peserta.find((x) => x.ID_Peserta === editId) : null;
  const tmpId = editId || 'TMP-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
  const link = (j) => slots[j].status === 'done' || slots[j].status === 'uploading' ? (slots[j].fileId ? 'https://drive.google.com/file/d/' + slots[j].fileId + '/view' : 'pending') : '';
  const row = Object.assign({}, prev || {}, {
    ID_Peserta: tmpId, Nama: f.Nama.replace(/\s+/g, ' ').trim(), NRP_NIP: f.NRP_NIP, Pangkat: f.Pangkat.trim().toUpperCase(), Jabatan: f.Jabatan.replace(/\s+/g, ' ').trim(),
    ID_Satker: f.ID_Satker, ID_Pelatihan: f.ID_Pelatihan, Polda_Asal: sat.Polda || '', Link_SPRIN: link('SPRIN'), Link_SPPD: link('SPPD'),
    Dibuat_Oleh: prev ? prev.Dibuat_Oleh : me.username, Tanggal_Input: prev ? prev.Tanggal_Input : now, Tanggal_Ubah: now, _pending: true
  });
  const draft = Object.assign({}, f);
  Data.pending[tmpId] = row;
  Data.mutate((d) => { const i = d.peserta.findIndex((x) => x.ID_Peserta === tmpId); if (i > -1) d.peserta[i] = row; else d.peserta.push(row); });
  inputPend(1);
  if (editId) Router.go('peserta');
  else { const keep = { ID_Satker: f.ID_Satker, ID_Pelatihan: f.ID_Pelatihan }; inputInit(''); Object.assign(InputPg.f, keep); inputBuild(el); }

  // Tunggu unggahan yang masih berjalan, lalu kirim ke server (api: timeout + retry + idempoten)
  const okUp = await Promise.all(['SPRIN', 'SPPD'].map((j) => slots[j].promise || true));
  let res;
  if (okUp.some((x) => x === false)) res = { success: false, message: 'Unggahan berkas gagal. Pilih ulang berkasnya.' };
  else res = await api('savePeserta', Object.assign({}, draft, { ID_Peserta: editId || '', sprinId: slots.SPRIN.fileId || '', sppdId: slots.SPPD.fileId || '' }));
  delete Data.pending[tmpId];
  inputPend(-1);
  if (res.success) {
    const p = res.data.peserta;
    Data.mutate((d) => { d.peserta = d.peserta.filter((x) => x.ID_Peserta !== tmpId && x.ID_Peserta !== p.ID_Peserta); d.peserta.push(p); });
    const kurang = ['SPRIN', 'SPPD'].filter((j) => !slots[j].fileId);
    toast(res.message + (kurang.length ? ' Berkas belum lengkap: ' + kurang.join(', ') + '.' : ''), kurang.length ? 'warn' : 'success', p.Nama);
  } else {
    Data.mutate((d) => { d.peserta = d.peserta.filter((x) => x.ID_Peserta !== tmpId); if (prev) d.peserta.push(prev); });
    InputPg.failed = { f: draft, slots, editId };
    toast(res.message + ' Buka Input Peserta untuk memperbaiki.', 'error', row.Nama + ' gagal disimpan');
    const pg = $('.page[data-page="input"]'); if (pg && !pg.hidden) inputFailBanner(pg);
  }
}
/** Penanda jumlah data yang sedang dikirim di latar. */
function inputPend(d) {
  InputPg.pend = Math.max(0, (InputPg.pend || 0) + d);
  $$('[data-pend]').forEach((x) => { x.hidden = !InputPg.pend; x.innerHTML = '<span class="spin" style="width:11px;height:11px"></span>' + InputPg.pend + ' data sedang disimpan…'; });
}
function inputFailBanner(el) {
  const box = $('[data-failed]', el); if (!box) return;
  const F = InputPg.failed;
  const nmF = F ? (F.batch ? F.batch.rows.length + ' peserta' : esc(F.f.Nama)) : '';
  box.innerHTML = F ? '<div class="alert alert-red">' + ic('alert-circle') + '<div><b>Data ' + nmF + ' belum tersimpan.</b> Periksa lalu simpan ulang.</div><button type="button" class="btn btn-sm" data-fixfail>Muat ke formulir</button><button type="button" class="btn btn-sm btn-ghost" data-dropfail>Abaikan</button></div>' : '';
  const fx = $('[data-fixfail]', box); if (fx) fx.onclick = () => {
    const G = InputPg.failed; InputPg.failed = null;
    if (G.batch) {
      const b = G.batch;
      InputPg.batch = { pel: b.pel, rows: b.rows, gabung: b.gabung };
      InputPg.slots = { SPRIN: Object.assign({}, b.slots.SPRIN, { promise: null }), SPPD: Object.assign({}, b.slots.SPPD, { promise: null }) };
      InputPg.editId = ''; if (location.hash !== '#/input') location.hash = '#/input'; else batchBuild(el);
      return;
    }
    InputPg.editId = G.editId; InputPg.f = G.f; InputPg.slots = { SPRIN: Object.assign({}, G.slots.SPRIN, { promise: null }), SPPD: Object.assign({}, G.slots.SPPD, { promise: null }) }; inputBuild(el); };
  const dr = $('[data-dropfail]', box); if (dr) dr.onclick = () => { InputPg.failed = null; inputFailBanner(el); };
}

/* ─────────────────────────── DATA PESERTA ─────────────────────────── */
const PesertaPg = { q: '', polda: '', sat: '', pel: '', kel: '', jenis: 'Satker Polda', page: 1, per: 10, sel: new Set() };
/** Admin: data kiriman Satker Polda dan Polres ditampilkan terpisah (tidak digabung). */
function jenisPeserta(p) { const s = D.sat(p.ID_Satker); return s && s.Jenis === 'Polres' ? 'Polres' : 'Satker Polda'; }
registerPage('peserta', {
  title: 'Data Peserta',
  render(el) { if (!el._built) pesertaBuild(el); pesertaUpdate(el); }
});

function pesertaFiltered(semuaJenis) {
  const S = PesertaPg, q = S.q.trim().toLowerCase(), adm = isAdmin();
  return D.d.peserta.filter((p) => (semuaJenis || !adm || jenisPeserta(p) === S.jenis) &&
    (!S.polda || p.Polda_Asal === S.polda) && (!S.sat || p.ID_Satker === S.sat) && (!S.pel || p.ID_Pelatihan === S.pel) &&
    (!S.kel || (S.kel === 'lengkap' ? D.lengkap(p) : !D.lengkap(p))) &&
    (!q || (p.Nama + ' ' + p.NRP_NIP + ' ' + p.Jabatan + ' ' + p.Pangkat).toLowerCase().includes(q))
  ).sort((a, b) => String(b.Tanggal_Input).localeCompare(String(a.Tanggal_Input)));
}
/** Admin Induk: lihat & hapus. Petugas: tambah/ubah/hapus data Satker sendiri. */
function canDeletePeserta(p) { return isAdmin() || canEditPeserta(p); }
function canEditPeserta(p) { if (isAdmin()) return false; const pl = D.pel(p.ID_Pelatihan); return p.ID_Satker === D.d.me.idSatker && D.canSubmit(pl, p.ID_Satker); }

function pesertaBuild(el) {
  const admin = isAdmin();
  el.innerHTML =
    '<div class="ph"><div><h1>Data Peserta Pelatihan <span class="tag tag-blue" style="font-size:12px" data-jtag>' + (admin ? 'SATKER POLDA' : esc(D.d.me.namaSatker)) + '</span></h1></div>' +
    '<div class="ph-act">' + (admin ? '<div class="seg jn-tabs" data-jn role="tablist" aria-label="Pengirim"></div><button class="btn btn-excel" data-xlsx>' + ic('sheet') + 'Unduh Excel</button>' : '<button class="btn btn-soft-green" data-csv>' + ic('sheet') + 'Ekspor CSV</button><a class="btn btn-primary" href="#/input">' + ic('plus') + 'Tambah Peserta</a>') + '</div></div>' +
    '<div class="card"><div class="card-b pf-b"><div class="pf-row' + (admin ? ' adm' : '') + '">' +
    '<div class="field pf-q"><label class="lbl">Cari peserta</label><div class="with-ic">' + ic('search') + '<input class="input" id="pSearch" placeholder="Nama / NRP / NIP / jabatan" style="text-transform:none"><span class="kbd">CTRL + K</span></div></div>' +
    '<div class="field"><label class="lbl">Program Pelatihan</label><select class="select" data-f="pel"></select></div>' +
    (admin ? '<div class="field"><label class="lbl">Polda</label><select class="select" data-f="polda"></select></div><div class="field"><label class="lbl">Satker / Polres</label><select class="select" data-f="sat"></select></div>' : '') +
    '<div class="field"><label class="lbl">Berkas</label><select class="select" data-f="kel"><option value="">Semua Status</option><option value="lengkap">Berkas Lengkap</option><option value="belum">Berkas Belum Lengkap</option></select></div>' +
    '</div><div class="factive" data-chips hidden></div></div></div>' +
    '<div data-bulk></div>' +
    '<div class="card fill"><div class="tbl-wrap" data-wrap><table class="tbl rtable fx tbl-peserta' + (admin ? ' adm' : '') + '"><thead><tr><th class="ck"><input type="checkbox" data-all aria-label="Pilih semua"></th><th class="c">No</th><th>Nama</th><th>NRP / NIP</th><th>Pangkat</th><th>Jabatan</th>' + (admin ? '<th>Satker / Polres</th>' : '') +
    '<th>Program Pelatihan</th><th class="c">SPRIN</th><th class="c">SPPD</th><th class="r">Aksi</th></tr></thead><tbody data-rows></tbody></table></div>' +
    '<div class="card-f"><span class="foot-info" data-info></span><span class="flow-hint">' + ic('chevron-down') + 'Gulir untuk melihat data berikutnya</span></div></div>';
  el._built = true;
  const S = PesertaPg;
  const search = $('#pSearch', el);
  search.addEventListener('input', debounce(() => { S.q = search.value; S.page = 1; pesertaUpdate(el); }, 250));
  $$('[data-f]', el).forEach((s) => s.addEventListener('change', () => { S[s.dataset.f] = s.value; if (s.dataset.f === 'polda') S.sat = ''; S.page = 1; pesertaUpdate(el); }));
  const csv = $('[data-csv]', el); if (csv) csv.addEventListener('click', () => pesertaCsv(pesertaFiltered(), 'peserta'));
  const xl = $('[data-xlsx]', el); if (xl) xl.addEventListener('click', () => pesertaExcel(pesertaFiltered()));
  $('[data-wrap]', el).classList.add('alir');
  $('[data-wrap]', el).addEventListener('scroll', (e) => e.currentTarget.classList.toggle('di-gulir', e.currentTarget.scrollTop > 2), { passive: true });
  $('[data-all]', el).addEventListener('change', (e) => {
    const ids = pesertaFiltered().filter(canDeletePeserta).map((p) => p.ID_Peserta);     // semua data yang sedang tersaring
    ids.forEach((id) => e.target.checked ? S.sel.add(id) : S.sel.delete(id)); pesertaUpdate(el);
  });
  el.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-act]');
    if (b) {
      const p = D.d.peserta.find((x) => x.ID_Peserta === b.dataset.id); if (!p) return;
      if (b.dataset.act === 'view') pesertaDetail(p);
      if (b.dataset.act === 'edit') Router.go('input', p.ID_Peserta);
      if (b.dataset.act === 'del') pesertaDelete([p.ID_Peserta], el);
      if (b.dataset.act === 'file') { const j = b.dataset.j; viewPdf(D.fileId(p['Link_' + j]), j + ' — ' + p.Nama); }
    }
    const chip = e.target.closest('[data-unset]'); if (chip) { S[chip.dataset.unset] = ''; if (chip.dataset.unset === 'q') search.value = ''; S.page = 1; pesertaUpdate(el); }
    if (e.target.closest('[data-resetf]')) { Object.assign(S, { q: '', polda: '', sat: '', pel: '', kel: '', page: 1 }); search.value = ''; pesertaUpdate(el); }
    const jn = e.target.closest('[data-jn-v]'); if (jn) { S.jenis = jn.dataset.jnV; S.sat = ''; S.page = 1; pesertaUpdate(el); }
    const bk = e.target.closest('[data-bulk-act]');
    if (bk) {
      const ids = Array.from(S.sel);
      if (bk.dataset.bulkAct === 'csv') { const rows = D.d.peserta.filter((p) => S.sel.has(p.ID_Peserta)); admin ? pesertaExcel(rows, true) : pesertaCsv(rows, 'peserta-terpilih'); }
      if (bk.dataset.bulkAct === 'del') pesertaDelete(ids, el);
      if (bk.dataset.bulkAct === 'clear') { S.sel.clear(); pesertaUpdate(el); }
    }
  });
  el.addEventListener('change', (e) => { const c = e.target.closest('[data-ck]'); if (c) { c.checked ? S.sel.add(c.dataset.ck) : S.sel.delete(c.dataset.ck); pesertaUpdate(el); } });
}

function pesertaUpdate(el, again) {
  const S = PesertaPg, admin = isAdmin();
  const set = (k, html) => { const s = $('[data-f="' + k + '"]', el); if (s) { s.innerHTML = html; s.value = S[k]; } };
  set('polda', poldaOptions(S.polda, 'Semua Polda'));
  if (admin && S.sat && D.sat(S.sat) && D.sat(S.sat).Jenis !== S.jenis) S.jenis = D.sat(S.sat).Jenis === 'Polres' ? 'Polres' : 'Satker Polda';   // dari Rekap/Beranda
  set('sat', satOptions(S.sat, S.polda, admin ? 'Semua ' + S.jenis : 'Semua Satker / Polres', true, admin ? (s) => (s.Jenis === 'Polres' ? 'Polres' : 'Satker Polda') === S.jenis : null));
  if (admin) {
    const base = pesertaFiltered(true), n = (j) => base.filter((p) => jenisPeserta(p) === j).length;
    $('[data-jn]', el).innerHTML = JENIS_SATKER.map((j) => '<button type="button" role="tab" data-jn-v="' + j + '" class="' + (S.jenis === j ? 'on' : '') + '" aria-selected="' + (S.jenis === j) + '">' + ic(j === 'Polres' ? 'map-pin' : 'building') + j + '<span class="cnt">' + n(j) + '</span></button>').join('');
    $('[data-jtag]', el).textContent = 'KIRIMAN ' + S.jenis.toUpperCase();
  }
  set('pel', pelOptions(S.pel, 'Semua Program Pelatihan'));
  set('kel', $('[data-f=kel]', el).innerHTML);
  if ($('#pSearch', el).value !== S.q && document.activeElement !== $('#pSearch', el)) $('#pSearch', el).value = S.q;

  const all = pesertaFiltered();
  const valid = new Set(D.d.peserta.map((p) => p.ID_Peserta)); Array.from(S.sel).forEach((id) => { if (!valid.has(id)) S.sel.delete(id); });
  const items = all;                                        // tanpa halaman: semua data mengalir saat digulir

  const chips = [];
  if (S.q) chips.push(['q', 'Cari: ' + S.q, '']);
  if (S.pel) chips.push(['pel', 'Pelatihan: ' + D.pelNama(S.pel), '']);
  if (S.polda) chips.push(['polda', 'Polda: ' + S.polda.replace('Polda ', ''), 'v']);
  if (S.sat) chips.push(['sat', 'Satker: ' + D.satNama(S.sat), 'g']);
  if (S.kel) chips.push(['kel', S.kel === 'lengkap' ? 'Berkas lengkap' : 'Berkas belum lengkap', 'a']);
  const chipBox = $('[data-chips]', el);
  chipBox.hidden = !chips.length;
  chipBox.innerHTML = '<span class="lbl">Filter aktif:</span>' + chips.map((c) => '<span class="fchip ' + c[2] + '"><span>' + esc(c[1]) + '</span><button data-unset="' + c[0] + '" aria-label="Hapus filter">' + ic('x') + '</button></span>').join('') + '<button class="linkbtn" data-resetf>Reset filter</button>' +
    '<span class="total-badge">' + all.length + ' PESERTA' + (admin ? ' ' + S.jenis.toUpperCase() : '') + '</span>';

  $('[data-bulk]', el).innerHTML = S.sel.size ? '<div class="bulk"><span class="dot" style="color:#60a5fa"></span><span class="n">' + S.sel.size + ' PERSONEL DIPILIH</span><span class="t">OPERASI DATA MASSAL</span><span class="sp"></span>' +
    '<button class="btn btn-sm" data-bulk-act="clear" style="background:transparent;color:#fff;border-color:#2d4a85">Batal pilih</button>' +
    '<button class="btn btn-sm btn-success" data-bulk-act="csv">' + ic('download') + (admin ? 'Unduh Excel' : 'Ekspor Data') + '</button>' +
    '<button class="btn btn-sm btn-danger" data-bulk-act="del">' + ic('trash') + 'Hapus Massal</button></div>' : '';

  const fb = (p, j) => p['Link_' + j] ? (p._pending ? '<span class="fbtn ok">ADA</span>' : '<button class="fbtn ok" data-act="file" data-j="' + j + '" data-id="' + esc(p.ID_Peserta) + '" title="Buka ' + j + '">' + ic('file-text') + 'ADA</button>') : '<span class="fbtn no" title="' + j + ' belum diunggah">BELUM</span>';
  const ncol = admin ? 11 : 10;
  const baris = (p, i) => {
    const busy = !!p._pending, can = !busy && canEditPeserta(p), canDel = !busy && canDeletePeserta(p), sel = S.sel.has(p.ID_Peserta);
    const pel = D.pelNama(p.ID_Pelatihan), sat = D.satNama(p.ID_Satker);
    return '<tr class="' + (sel ? 'sel' : '') + (busy ? ' pending' : '') + '"><td class="ck">' + (canDel ? '<input type="checkbox" data-ck="' + esc(p.ID_Peserta) + '"' + (sel ? ' checked' : '') + ' aria-label="Pilih">' : '') + '</td>' +
      '<td class="no no-m c">' + (i + 1) + '</td>' +
      '<td class="main" title="' + esc(p.Nama) + '"><div class="nm">' + esc(p.Nama) + '</div></td>' +
      '<td data-l="NRP / NIP" class="mono-n">' + esc(p.NRP_NIP) + '</td>' +
      '<td data-l="Pangkat" class="pkt">' + esc(p.Pangkat) + '</td>' +
      '<td data-l="Jabatan" title="' + esc(p.Jabatan) + '">' + esc(p.Jabatan) + '</td>' +
      (admin ? '<td data-l="Satker" title="' + esc(sat + ' · ' + p.Polda_Asal) + '">' + esc(sat) + '</td>' : '') +
      '<td data-l="Program" title="' + esc(pel) + '"><span class="prog-chip">' + esc(pel) + '</span></td>' +
      '<td data-l="SPRIN" class="c">' + fb(p, 'SPRIN') + '</td><td data-l="SPPD" class="c">' + fb(p, 'SPPD') + '</td>' +
      '<td class="acts-td"><div class="acts">' + (busy ? '<span class="tag tag-blue"><span class="spin" style="width:10px;height:10px"></span>Menyimpan…</span>' : '<button class="btn btn-xs act-view" data-act="view" data-id="' + esc(p.ID_Peserta) + '">Lihat</button>' +
      (can ? '<button class="btn btn-xs act-edit" data-act="edit" data-id="' + esc(p.ID_Peserta) + '">Edit</button>' : '') + (canDel ? '<button class="btn btn-xs act-del" data-act="del" data-id="' + esc(p.ID_Peserta) + '">Hapus</button>' : '')) + '</div></td></tr>';
  };
  Alir.isi($('[data-rows]', el), items, baris, {
    kunci: JSON.stringify([S.q, S.polda, S.sat, S.pel, S.kel, S.jenis]),
    kosong: '<tr><td colspan="' + ncol + '"><div class="empty">' + ic('search') + '<b>' + (admin ? 'Belum ada kiriman ' + esc(S.jenis) + ' yang cocok' : 'Tidak ada data yang cocok') + '</b>' + (D.d.peserta.length ? 'Ubah kata kunci atau reset filter.' : 'Belum ada peserta.' + (admin ? '' : ' Mulai dengan menekan "Tambah Peserta".')) + '</div></td></tr>'
  });
  const allCk = $('[data-all]', el), pageIds = items.filter(canDeletePeserta).map((p) => p.ID_Peserta);
  allCk.checked = pageIds.length > 0 && pageIds.every((id) => S.sel.has(id));
  allCk.indeterminate = !allCk.checked && pageIds.some((id) => S.sel.has(id));
  $('[data-info]', el).innerHTML = '<span class="dot"></span>' + (admin ? esc(S.jenis) + ' · ' : '') + '<b>' + all.length + '</b> peserta' + (S.sel.size ? ' · <b>' + S.sel.size + '</b> dipilih' : '');
}

function pesertaDetail(p) {
  const row = (k, v) => '<dt>' + k + '</dt><dd>' + v + '</dd>';
  const file = (j) => p['Link_' + j] ? '<button class="pdf-btn" data-v="' + j + '">' + ic('file-text') + 'Buka ' + j + '</button>' : '<span class="pdf-none">Belum diunggah</span>';
  const m = modal({ title: p.Nama, icon: 'users', cls: 'wide', noFocus: true,
    body: '<dl class="detail-grid">' + row('ID Peserta', '<span class="mono">' + esc(p.ID_Peserta) + '</span>') + row('NRP / NIP', '<span class="mono">' + esc(p.NRP_NIP) + '</span>') +
      row('Pangkat', esc(p.Pangkat)) + row('Jabatan', esc(p.Jabatan)) + row('Satker', esc(D.satNama(p.ID_Satker))) + row('Polda asal', esc(p.Polda_Asal)) +
      row('Program pelatihan', esc(D.pelNama(p.ID_Pelatihan))) + row('Berkas SPRIN', file('SPRIN')) + row('Berkas SPPD', file('SPPD')) +
      row('Dikirim oleh', esc(p.Dibuat_Oleh)) + row('Waktu input', fmtWaktu(p.Tanggal_Input) + ' WIT') + row('Terakhir diubah', fmtWaktu(p.Tanggal_Ubah) + ' WIT') + '</dl>',
    foot: (canEditPeserta(p) ? '<button class="btn act-edit" data-e>' + ic('pencil') + 'Edit</button>' : '') + '<button class="btn btn-navy" data-x>Tutup</button>' });
  m.el.addEventListener('click', (e) => {
    const v = e.target.closest('[data-v]'); if (v) viewPdf(D.fileId(p['Link_' + v.dataset.v]), v.dataset.v + ' — ' + p.Nama);
    if (e.target.closest('[data-e]')) { m.close(); Router.go('input', p.ID_Peserta); }
  });
}

async function pesertaDelete(ids, el) {
  const names = D.d.peserta.filter((p) => ids.includes(p.ID_Peserta)).map((p) => p.Nama);
  const ok = await confirmDlg({ danger: true, title: ids.length > 1 ? 'Hapus ' + ids.length + ' data peserta?' : 'Hapus data peserta?', okText: 'Ya, hapus',
    message: (ids.length > 1 ? '<b>' + ids.length + ' peserta</b> akan dihapus' : 'Data <b>' + esc(names[0]) + '</b> akan dihapus') + ' beserta berkas SPRIN/SPPD-nya (dipindah ke Sampah Google Drive). Tindakan ini tidak dapat dibatalkan dari aplikasi.' });
  if (!ok) return;
  // Optimistic: hilang dari tabel seketika, kembalikan bila server menolak
  const gone = D.d.peserta.filter((p) => ids.includes(p.ID_Peserta));
  ids.forEach((id) => { Data.gone.add(id); PesertaPg.sel.delete(id); });
  // 1) Baris dibuang dari layar saat itu juga (< 1 ms), 2) data & tabel dirapikan pada bingkai berikutnya, 3) server di latar
  const set = new Set(ids);
  $$('.page:not([hidden]) [data-id]').forEach((b) => { if (set.has(b.dataset.id)) { const tr = b.closest('tr'); if (tr) tr.remove(); } });
  toast(ids.length > 1 ? ids.length + ' data peserta dihapus.' : 'Data ' + names[0] + ' dihapus.', 'success');
  await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0)));
  Data.mutate((d) => { d.peserta = d.peserta.filter((p) => !set.has(p.ID_Peserta)); });
  const res = await api('deletePeserta', { ids });
  ids.forEach((id) => Data.gone.delete(id));
  if (!res.success) { Data.mutate((d) => { const ada = new Set(d.peserta.map((p) => p.ID_Peserta)); d.peserta = d.peserta.concat(gone.filter((p) => !ada.has(p.ID_Peserta))); }); return toast(res.message + ' Data dikembalikan.', 'error', 'Gagal menghapus'); }
}

function pesertaCsv(rows, name) {
  if (!rows.length) return toast('Tidak ada data untuk diekspor.', 'warn');
  downloadCsv(rows, [
    { label: 'ID_Peserta', get: 'ID_Peserta' }, { label: 'Nama', get: 'Nama' }, { label: 'NRP_NIP', get: (p) => "'" + p.NRP_NIP }, { label: 'Pangkat', get: 'Pangkat' },
    { label: 'Jabatan', get: 'Jabatan' }, { label: 'Satker', get: (p) => D.satNama(p.ID_Satker) }, { label: 'Polda', get: 'Polda_Asal' },
    { label: 'Pelatihan', get: (p) => D.pelNama(p.ID_Pelatihan) }, { label: 'SPRIN', get: (p) => p.Link_SPRIN ? 'Ada' : 'Kosong' }, { label: 'SPPD', get: (p) => p.Link_SPPD ? 'Ada' : 'Kosong' },
    { label: 'Dikirim_Oleh', get: 'Dibuat_Oleh' }, { label: 'Tanggal_Input', get: (p) => fmtWaktu(p.Tanggal_Input) }
  ], 'SI-PRO_' + name + '_' + new Date().toISOString().slice(0, 10) + '.csv');
  toast(rows.length + ' baris diekspor ke CSV.', 'info');
}

/* ── Unduh Excel (Admin): rapi, urut abjad, mengikuti filter yang sedang aktif ── */
function pesertaExcel(rows, terpilih) {
  rows = rows.filter((p) => !p._pending);
  if (!rows.length) return toast('Tidak ada data peserta untuk diunduh.', 'warn');
  const S = PesertaPg, now = witParts(new Date().toISOString());
  const stamp = now.d + ' ' + BLN_L[now.m - 1] + ' ' + now.y + ' pukul ' + String(now.H).padStart(2, '0') + ':' + String(now.M).padStart(2, '0') + ' WIT';
  const byName = (a, b) => String(a.Nama).localeCompare(String(b.Nama), 'id', { sensitivity: 'base', numeric: true }) || String(a.NRP_NIP).localeCompare(String(b.NRP_NIP));
  const filt = [];
  if (S.polda) filt.push(S.polda);
  if (S.sat) filt.push(D.satNama(S.sat));
  if (S.kel) filt.push(S.kel === 'lengkap' ? 'Berkas lengkap' : 'Berkas belum lengkap');
  if (S.q) filt.push('Pencarian "' + S.q + '"');
  if (terpilih) filt.push('Data terpilih');
  const H = ['NO', 'NAMA', 'NRP / NIP', 'PANGKAT', 'JABATAN', 'SATKER / POLRES', 'POLDA', 'SPRIN', 'SPPD', 'KETERANGAN'];
  const W = [6, 34, 21, 20, 36, 30, 26, 10, 10, 18];
  const last = XLSX.col(H.length - 1);
  const sheetFor = (pelId, list, jn) => {
    const pel = D.pel(pelId) || {}, nama = pel.Nama_Pelatihan || pelId || 'Tanpa Pelatihan';
    list = list.slice().sort(byName);
    const t = (v, st) => ({ v, s: st });
    const rowsX = [
      [t('DAFTAR PESERTA PELATIHAN', 1)],
      [t(String(nama).toUpperCase(), 2)],
      [t('PENGIRIMAN ' + jn.toUpperCase(), 2)],
      [t('Tempat: ' + (pel.Lokasi || 'SPN Polda Papua Barat') + (pel.Tanggal_Mulai ? '   ·   Pelaksanaan: ' + fmtTgl(pel.Tanggal_Mulai, true) + ' s.d. ' + fmtTgl(pel.Tanggal_Selesai, true) : ''), 3)],
      [t((filt.length ? 'Filter: ' + filt.join(' · ') + '   ·   ' : '') + 'Diurutkan menurut abjad nama   ·   Diunduh ' + stamp, 3)],
      [],
      H.map((h) => t(h, 4))
    ];
    list.forEach((p, i) => {
      const ok = D.lengkap(p);
      rowsX.push([t(i + 1, 6), t(p.Nama, 5), t(String(p.NRP_NIP), 7), t(p.Pangkat, 7), t(p.Jabatan, 5), t(D.satNama(p.ID_Satker), 5), t(p.Polda_Asal, 5),
        t(p.Link_SPRIN ? 'Ada' : 'Belum', p.Link_SPRIN ? 9 : 10), t(p.Link_SPPD ? 'Ada' : 'Belum', p.Link_SPPD ? 9 : 10), t(ok ? 'Lengkap' : 'Belum lengkap', ok ? 9 : 10)]);
    });
    const endData = rowsX.length;
    rowsX.push([t('JUMLAH PESERTA: ' + list.length + ' ORANG', 8)].concat(H.slice(1).map(() => t('', 8))));
    return {
      name: (jn === 'Polres' ? 'Polres - ' : 'Satker Polda - ') + nama, rows: rowsX, cols: W, freeze: 7, printTitle: 6,
      heights: { 0: 24, 1: 20, 2: 18, 6: 30 },
      filter: 'A7:' + last + endData,
      merges: ['A1:' + last + '1', 'A2:' + last + '2', 'A3:' + last + '3', 'A4:' + last + '4', 'A5:' + last + '5', 'A' + (endData + 1) + ':' + last + (endData + 1)]
    };
  };
  // Satu sheet per pelatihan × pengirim: Satker Polda dan Polres TIDAK digabung dalam satu daftar
  const groups = {};
  rows.forEach((p) => { const k = p.ID_Pelatihan + '|' + jenisPeserta(p); (groups[k] = groups[k] || []).push(p); });
  const pelIds = D.pelSorted().map((p) => p.ID_Pelatihan).concat(Array.from(new Set(rows.map((p) => p.ID_Pelatihan))).filter((id) => !D.pel(id)));
  const order = []; pelIds.forEach((id) => JENIS_SATKER.forEach((j) => { if (groups[id + '|' + j]) order.push(id + '|' + j); }));
  const sheets = order.map((k) => { const [id, j] = k.split('|'); return sheetFor(id, groups[k], j); });
  if (sheets.length > 1) {
    const t = (v, st) => ({ v, s: st });
    const r = [[t('RINGKASAN DATA PESERTA PELATIHAN', 1)], [t((filt.length ? 'Filter: ' + filt.join(' · ') + '   ·   ' : '') + 'Diunduh ' + stamp, 3)], [],
      ['NO', 'PROGRAM PELATIHAN', 'PENGIRIM', 'TEMPAT', 'PELAKSANAAN', 'JUMLAH PESERTA', 'BERKAS LENGKAP'].map((h) => t(h, 4))];
    order.forEach((k, i) => { const [id, j] = k.split('|'), pel = D.pel(id) || {}, g = groups[k];
      r.push([t(i + 1, 6), t(pel.Nama_Pelatihan || id, 5), t(j, 7), t(pel.Lokasi || 'SPN Polda Papua Barat', 5), t(pel.Tanggal_Mulai ? fmtTgl(pel.Tanggal_Mulai) + ' – ' + fmtTgl(pel.Tanggal_Selesai) : '-', 7), t(g.length, 6), t(g.filter(D.lengkap).length, 6)]); });
    const nj = (j) => rows.filter((p) => jenisPeserta(p) === j).length;
    r.push([t('TOTAL: Satker Polda ' + nj('Satker Polda') + ' · Polres ' + nj('Polres') + ' PESERTA', 8), t('', 8), t('', 8), t('', 8), t('', 8), t('', 8), t('', 8)]);
    sheets.unshift({ name: 'Ringkasan', rows: r, cols: [6, 44, 16, 30, 24, 16, 16], freeze: 4, heights: { 0: 24, 3: 28 }, merges: ['A1:G1', 'A2:G2', 'A' + r.length + ':G' + r.length] });
  }
  const slug = (x) => String(x).replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50);
  const one = order.length === 1 ? order[0].split('|') : null;
  const label = one ? slug(((D.pel(one[0]) || {}).Nama_Pelatihan || one[0]) + '-' + one[1]) : 'Semua-Pelatihan';
  const name = 'SI-PRO_Peserta_' + label + '_' + now.y + '-' + String(now.m).padStart(2, '0') + '-' + String(now.d).padStart(2, '0') + '.xlsx';
  downloadBlob(XLSX.build(sheets), name);
  toast(rows.length + ' peserta diunduh ke Excel' + (order.length > 1 ? ' (' + order.length + ' sheet terpisah Satker Polda / Polres + ringkasan)' : '') + ', urut abjad.', 'success');
}

/* ───────────────── PENDAFTARAN KOLEKTIF (Petugas) ─────────────────
   Banyak peserta sekaligus (pelatihan sama atau berbeda) + SATU SPRIN & SATU SPPD
   (atau satu PDF gabungan SPRIN+SPPD) yang berlaku untuk semua peserta di daftar. */
const BATCH_MAX = 60;
function batchRow(pel) { return { Nama: '', NRP_NIP: '', Pangkat: '', Jabatan: '', ID_Pelatihan: pel || '' }; }
function batchFilled(r) { return !!(r.Nama.trim() || r.NRP_NIP || r.Pangkat.trim() || r.Jabatan.trim()); }
function batchInit() {
  const me = D.d.me, list = pelChoices(me.idSatker);
  const ok = (id) => list.some((x) => x.ID_Pelatihan === id);
  const first = (list.find((x) => !D.kuotaInfo(x.ID_Pelatihan, me.idSatker).penuh) || list[0] || {}).ID_Pelatihan || '';
  const def = ok(AppState.selPel) ? AppState.selPel : first;
  InputPg.batch = { pel: def, rows: [batchRow(def)], gabung: !!(InputPg.batch && InputPg.batch.gabung) };
  InputPg.slots = { SPRIN: emptySlot(), SPPD: emptySlot() };
  InputPg.f = { Nama: '', NRP_NIP: '', Pangkat: '', Jabatan: '', ID_Satker: me.idSatker, ID_Pelatihan: def };
}
function batchPelOptions(cur, withEmpty) {
  const sat = D.d.me.idSatker;
  return (withEmpty ? '<option value="">— Pilih pelatihan —</option>' : '') + pelChoices(sat).map((p) => {
    const ki = D.kuotaInfo(p.ID_Pelatihan, sat);
    return '<option value="' + esc(p.ID_Pelatihan) + '"' + (p.ID_Pelatihan === cur ? ' selected' : '') + '>' + esc(p.Nama_Pelatihan) + (ki.has ? ' — sisa ' + ki.sisa + '/' + ki.kuota : '') + '</option>';
  }).join('');
}
function batchRowHtml(r, i) {
  return '<div class="brow" data-i="' + i + '"><span class="bno">' + (i + 1) + '</span>' +
    '<input class="input" data-k="Nama" value="' + esc(r.Nama) + '" placeholder="Nama lengkap &amp; gelar" maxlength="120" aria-label="Nama peserta ' + (i + 1) + '">' +
    '<input class="input mono" data-k="NRP_NIP" value="' + esc(r.NRP_NIP) + '" inputmode="numeric" maxlength="18" placeholder="NRP / NIP" aria-label="NRP/NIP peserta ' + (i + 1) + '">' +
    '<input class="input" data-k="Pangkat" value="' + esc(r.Pangkat) + '" list="dlPangkat" placeholder="Pangkat" style="text-transform:uppercase" aria-label="Pangkat peserta ' + (i + 1) + '">' +
    '<input class="input" data-k="Jabatan" value="' + esc(r.Jabatan) + '" placeholder="Jabatan" maxlength="150" aria-label="Jabatan peserta ' + (i + 1) + '">' +
    '<select class="select" data-k="ID_Pelatihan" aria-label="Pelatihan peserta ' + (i + 1) + '">' + batchPelOptions(r.ID_Pelatihan, true) + '</select>' +
    '<button type="button" class="btn btn-ghost btn-icon brm" data-rm title="Hapus baris ini" aria-label="Hapus baris ' + (i + 1) + '">' + ic('x') + '</button></div>';
}
function batchBuild(el) {
  el._batch = true;
  if (!InputPg.batch) batchInit();
  const B = InputPg.batch, me = D.d.me, tersedia = pelChoices(me.idSatker).length > 0;
  el.innerHTML =
    '<div class="ph"><div><h1>Pendaftaran Peserta <span class="tag tag-blue" style="font-size:11px">KOLEKTIF</span></h1>' +
    '<p class="desc">Masukkan beberapa peserta sekaligus. Satu SPRIN &amp; SPPD cukup diunggah sekali untuk semua peserta di daftar ini.</p></div>' +
    '<div class="ph-act"><a class="btn" href="#/peserta">' + ic('arrow-left') + 'Data Peserta</a></div></div>' +
    '<div data-failed></div>' +
    (!tersedia ? kosongInfo() : '') +
    '<form id="fBatch" class="fit-form batch" novalidate autocomplete="off">' +
    '<section class="card fsec s1"><div class="card-h bh"><h3><span class="num">01</span>Daftar Peserta <span class="tag tag-gray" data-count></span></h3>' +
    '<div class="bdef"><label for="bPel">Pelatihan</label><select id="bPel" class="select">' + batchPelOptions(B.pel, false) + '</select></div></div>' +
    '<div class="card-b scroll" data-rowsbox><div class="brow head" aria-hidden="true"><span>No</span><span>Nama Lengkap &amp; Gelar</span><span>NRP / NIP</span><span>Pangkat</span><span>Jabatan</span><span>Pelatihan</span><span></span></div>' +
    '<div data-brows></div>' +
    '<button type="button" class="btn btn-add" data-addrow' + (tersedia ? '' : ' disabled') + '>' + ic('plus') + 'Tambah Peserta</button>' +
    '<datalist id="dlPangkat">' + PANGKAT.map((p) => '<option value="' + p + '">').join('') + '</datalist></div>' +
    '<div class="card-f bk-f" data-bkuota></div></section>' +
    '<section class="card fsec s3"><div class="card-h"><h3><span class="num">02</span>Berkas SPRIN &amp; SPPD</h3></div><div class="card-b">' +
    '<div class="bshare">' + ic('info') + '<span>Cukup <b>satu kali unggah</b> untuk semua peserta di daftar, walau berbeda jenis pelatihan.</span></div>' +
    '<label class="check bgab"><input type="checkbox" data-gabung' + (B.gabung ? ' checked' : '') + '><span><b>SPRIN &amp; SPPD dalam satu PDF</b><small>Centang bila keduanya sudah digabung</small></span></label>' +
    '<div class="grid g2 slots"><div data-slot="SPRIN"></div><div data-slot="SPPD"' + (B.gabung ? ' hidden' : '') + '></div></div>' +
    '</div></section>' +
    '<div class="sticky-bar"><div class="w">' + ic('alert-triangle') + '<span>Baris kosong diabaikan. Berkas boleh masih diunggah saat Anda menekan Simpan.</span></div>' +
    '<span class="tag tag-blue pend" data-pend hidden></span>' +
    '<button type="button" class="btn" data-reset>Reset</button>' +
    '<button type="submit" class="btn btn-success btn-lg" data-save' + (tersedia ? '' : ' disabled') + '>' + ic('save') + '<span data-savelbl>Simpan Peserta</span></button></div>' +
    '</form>';
  batchRows(el);
  const form = $('#fBatch', el), box = $('[data-brows]', el);
  box.addEventListener('input', (e) => {
    const k = e.target.dataset.k, row = e.target.closest('.brow'); if (!k || !row) return;
    let v = e.target.value;
    if (k === 'NRP_NIP') { v = v.replace(/\D/g, ''); e.target.value = v; }
    B.rows[+row.dataset.i][k] = v; e.target.classList.remove('err'); batchSummary(el);
  });
  box.addEventListener('change', (e) => {
    const k = e.target.dataset.k, row = e.target.closest('.brow'); if (k !== 'ID_Pelatihan' || !row) return;
    B.rows[+row.dataset.i].ID_Pelatihan = e.target.value; e.target.classList.remove('err'); batchSummary(el);
  });
  box.addEventListener('click', (e) => {
    const rm = e.target.closest('[data-rm]'); if (!rm) return;
    const i = +rm.closest('.brow').dataset.i;
    B.rows.splice(i, 1); if (!B.rows.length) B.rows.push(batchRow(B.pel));
    batchRows(el);
  });
  // Enter di kolom Jabatan baris terakhir → baris baru
  box.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' || e.ctrlKey || e.metaKey) return;
    e.preventDefault();
    const row = e.target.closest('.brow'); if (!row) return;
    if (e.target.dataset.k === 'Jabatan' && +row.dataset.i === B.rows.length - 1) batchAdd(el);
    else { const ins = $$('input,select', box), at = ins.indexOf(e.target); if (ins[at + 1]) ins[at + 1].focus(); }
  });
  $('[data-addrow]', el).addEventListener('click', () => batchAdd(el));
  if (!el._recheckBound) { el._recheckBound = true; el.addEventListener('click', (e) => { if (e.target.closest('[data-recheck]')) recheckPelatihan(el, true); }); }
  if (!tersedia && Date.now() - AppState.lastSync > 5000) recheckPelatihan(el, false);   // pastikan data kuota terbaru dari server
  $('#bPel', el).addEventListener('change', (e) => {
    const old = B.pel; B.pel = e.target.value; AppState.selPel = B.pel;
    // Baris yang mengikuti pelatihan sebelumnya (atau belum dipilih) ikut berganti
    B.rows.forEach((r) => { if (!r.ID_Pelatihan || r.ID_Pelatihan === old) r.ID_Pelatihan = B.pel; });
    InputPg.f.ID_Pelatihan = B.pel; batchRows(el);
  });
  $('[data-gabung]', el).addEventListener('change', (e) => {
    B.gabung = e.target.checked;
    $('[data-slot="SPPD"]', el).hidden = B.gabung;
    if (B.gabung) InputPg.slots.SPPD = emptySlot();
    InputPg.slots.SPRIN = emptySlot();          // jenis berkas berubah → unggah ulang
    ['SPRIN', 'SPPD'].forEach((j) => renderSlot(el, j));
  });
  form.addEventListener('submit', (e) => { e.preventDefault(); batchSave(el); });
  form.addEventListener('keydown', (e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); batchSave(el); } });
  $('[data-reset]', el).addEventListener('click', async () => {
    if (await confirmDlg({ title: 'Kosongkan daftar?', message: 'Semua baris peserta dan berkas yang belum disimpan akan dihapus dari formulir.', okText: 'Kosongkan' })) { batchInit(); batchBuild(el); }
  });
  ['SPRIN', 'SPPD'].forEach((j) => renderSlot(el, j));
  inputPend(0); inputFailBanner(el);
  if (matchMedia('(min-width: 901px)').matches) setTimeout(() => { const t = $('.brow:not(.head) [data-k=Nama]', el); if (t && !t.value) t.focus(); }, 50);
}
function batchRows(el) {
  const B = InputPg.batch;
  $('[data-brows]', el).innerHTML = B.rows.map(batchRowHtml).join('');
  batchSummary(el);
}
function batchAdd(el) {
  const B = InputPg.batch;
  if (B.rows.length >= BATCH_MAX) return toast('Maksimal ' + BATCH_MAX + ' peserta per sekali simpan.', 'warn');
  const last = B.rows[B.rows.length - 1];
  B.rows.push(batchRow((last && last.ID_Pelatihan) || B.pel));
  const box = $('[data-brows]', el);
  box.insertAdjacentHTML('beforeend', batchRowHtml(B.rows[B.rows.length - 1], B.rows.length - 1));
  batchSummary(el);
  const nw = box.lastElementChild; nw.scrollIntoView({ block: 'nearest' }); $('[data-k=Nama]', nw).focus();
}
/** Ringkasan kuota per pelatihan yang dipakai di daftar + kunci tombol simpan bila melebihi kuota. */
function batchSummary(el) {
  const B = InputPg.batch, sat = D.d.me.idSatker, isi = B.rows.filter(batchFilled);
  const per = {}; isi.forEach((r) => { if (r.ID_Pelatihan) per[r.ID_Pelatihan] = (per[r.ID_Pelatihan] || 0) + 1; });
  let lebih = false;
  const chips = Object.keys(per).map((id) => {
    const ki = D.kuotaInfo(id, sat), pel = D.pel(id) || {}, total = ki.terisi + per[id], bad = ki.has && total > ki.kuota;
    if (bad) lebih = true;
    return '<span class="kchip ' + (bad ? 'bad' : 'ok') + '" title="' + esc(pel.Nama_Pelatihan || id) + '"><b>' + esc(pel.Nama_Pelatihan || id) + '</b>' +
      (ki.has ? per[id] + ' baru + ' + ki.terisi + ' terdaftar / kuota ' + ki.kuota : per[id] + ' baru') + '</span>';
  }).join('');
  $('[data-bkuota]', el).innerHTML = chips ? '<span class="lbl">Kuota:</span>' + chips : '<span class="foot-info">Isi baris peserta lalu tekan Simpan. Enter di kolom Jabatan = tambah baris.</span>';
  $('[data-count]', el).textContent = isi.length + ' terisi';
  const lbl = $('[data-savelbl]', el); if (lbl) lbl.textContent = isi.length > 1 ? 'Simpan ' + isi.length + ' Peserta' : 'Simpan Peserta';
  const save = $('[data-save]', el); if (save) save.disabled = lebih || !pelChoices(sat).length;
  const add = $('[data-addrow]', el); if (add) add.hidden = B.rows.length >= BATCH_MAX;
}
async function batchSave(el) {
  const B = InputPg.batch, me = D.d.me, sat = D.sat(me.idSatker) || {};
  const rowsEl = $$('.brow:not(.head)', el);
  $$('.err', el).forEach((x) => x.classList.remove('err'));
  const isi = [], errs = [], seen = {};
  B.rows.forEach((r, i) => {
    if (!batchFilled(r)) return;
    const mark = (k) => { const x = rowsEl[i] && $('[data-k="' + k + '"]', rowsEl[i]); if (x) x.classList.add('err'); };
    let bad = false;
    ['Nama', 'Pangkat', 'Jabatan', 'ID_Pelatihan'].forEach((k) => { if (!String(r[k]).trim()) { mark(k); bad = true; } });
    if (!/^(\d{8}|\d{18})$/.test(r.NRP_NIP)) { mark('NRP_NIP'); bad = true; }
    const key = r.ID_Pelatihan + '|' + r.NRP_NIP;
    if (!bad && seen[key]) { mark('NRP_NIP'); errs.push('Baris ' + (i + 1) + ': NRP/NIP sama dengan baris ' + seen[key] + '.'); bad = true; }
    const dup = !bad && D.d.peserta.find((x) => x.NRP_NIP === r.NRP_NIP && x.ID_Pelatihan === r.ID_Pelatihan);
    if (dup) { mark('NRP_NIP'); errs.push('Baris ' + (i + 1) + ': NRP/NIP ' + r.NRP_NIP + ' sudah terdaftar (' + dup.Nama + ').'); bad = true; }
    seen[key] = i + 1;
    if (bad && !errs.some((e) => e.startsWith('Baris ' + (i + 1) + ':'))) errs.push('Baris ' + (i + 1) + ': lengkapi kolom bertanda merah (NRP 8 digit / NIP 18 digit).');
    isi.push(r);
  });
  if (!isi.length) return toast('Isi minimal satu baris peserta.', 'error', 'Daftar masih kosong');
  if (errs.length) { const f = $('.brow .err', el); if (f) f.focus(); return toast(errs.slice(0, 3).join(' ') + (errs.length > 3 ? ' (+' + (errs.length - 3) + ' lainnya)' : ''), 'error', 'Data belum dapat disimpan'); }
  const sl = InputPg.slots;
  if (Object.values(sl).some((x) => x.status === 'error' && x.msg)) return toast('Perbaiki atau hapus berkas yang gagal diunggah.', 'warn');

  // ── Optimistic: semua baris langsung tampil, formulir kosong siap dipakai lagi ──
  const gab = B.gabung, now = new Date().toISOString(), stamp = Date.now().toString(36);
  const link = (s) => s.status === 'done' || s.status === 'uploading' ? (s.fileId ? 'https://drive.google.com/file/d/' + s.fileId + '/view' : 'pending') : '';
  const lS = link(sl.SPRIN), lD = gab ? lS : link(sl.SPPD);
  const temps = isi.map((r, i) => Object.assign({}, r, {
    ID_Peserta: 'TMP-' + stamp + '-' + i, Nama: r.Nama.replace(/\s+/g, ' ').trim(), Pangkat: r.Pangkat.trim().toUpperCase(), Jabatan: r.Jabatan.replace(/\s+/g, ' ').trim(),
    ID_Satker: me.idSatker, Polda_Asal: sat.Polda || '', Link_SPRIN: lS, Link_SPPD: lD, Dibuat_Oleh: me.username, Tanggal_Input: now, Tanggal_Ubah: now, _pending: true
  }));
  temps.forEach((t) => { Data.pending[t.ID_Peserta] = t; });
  Data.mutate((d) => { d.peserta = d.peserta.concat(temps); });
  inputPend(temps.length);
  const draft = { rows: isi.map((r) => Object.assign({}, r)), gabung: gab, slots: sl, pel: B.pel };
  const keepPel = B.pel; batchInit(); InputPg.batch.pel = keepPel; InputPg.batch.rows = [batchRow(keepPel)]; InputPg.batch.gabung = gab; batchBuild(el);

  const okUp = await Promise.all(['SPRIN', 'SPPD'].map((j) => sl[j].promise || true));
  let res;
  if (okUp.some((x) => x === false)) res = { success: false, message: 'Unggahan berkas gagal. Pilih ulang berkasnya.' };
  else res = await api('savePesertaBatch', { rows: draft.rows, sprinId: sl.SPRIN.fileId || '', sppdId: gab ? '' : (sl.SPPD.fileId || ''), gabung: gab });
  temps.forEach((t) => delete Data.pending[t.ID_Peserta]);
  inputPend(-temps.length);
  const tmpIds = new Set(temps.map((t) => t.ID_Peserta));
  if (res.success) {
    const got = res.data.peserta, gotIds = new Set(got.map((p) => p.ID_Peserta));
    Data.mutate((d) => { d.peserta = d.peserta.filter((x) => !tmpIds.has(x.ID_Peserta) && !gotIds.has(x.ID_Peserta)).concat(got); });
    const kurang = !sl.SPRIN.fileId ? (gab ? 'SPRIN & SPPD' : 'SPRIN') : (!gab && !sl.SPPD.fileId ? 'SPPD' : '');
    toast(res.message + (kurang ? ' Berkas belum lengkap: ' + kurang + ' (dapat menyusul lewat Edit).' : ''), kurang ? 'warn' : 'success', got.length + ' peserta tersimpan');
  } else {
    Data.mutate((d) => { d.peserta = d.peserta.filter((x) => !tmpIds.has(x.ID_Peserta)); });
    InputPg.failed = { batch: draft };
    toast(res.message + ' Buka Input Peserta untuk memperbaiki.', 'error', temps.length + ' peserta gagal disimpan');
    const pg = $('.page[data-page="input"]'); if (pg && !pg.hidden) inputFailBanner(pg);
  }
}
