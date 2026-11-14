/* =========================================================================
   SI-PRO — Halaman: Rekapitulasi, Belum Mengirim (Admin), Cetak Laporan
   ========================================================================= */
'use strict';

/* ─────────────────────────── REKAPITULASI ─────────────────────────── */
const RekapPg = { wil: '', showAll: false, tbl: 'satker' };
registerPage('rekap', {
  title: 'Rekapitulasi', admin: true,
  render(el) {
    if (!el._built) {
      el.innerHTML =
        '<div class="ph"><div><h1>Rekapitulasi</h1>' +
        '<p class="desc">Konsolidasi kuota, kepatuhan pengiriman Satker, serta kelengkapan berkas SPRIN/SPPD lintas Polda.</p></div>' +
        '<div class="ph-act"><div class="filters"><div class="fbox"><span class="lbl">PROGRAM</span><select class="select" data-f="pel"></select></div><div class="fbox"><span class="lbl">WILAYAH</span><select class="select" data-f="wil"></select></div></div>' +
        '<button class="btn btn-icon" data-reset title="Reset filter" aria-label="Reset filter">' + ic('refresh') + '</button>' +
        '<button class="btn btn-soft-green" data-csv>' + ic('sheet') + 'CSV</button><button class="btn btn-navy" data-pdf>' + ic('printer') + 'Cetak PDF</button></div></div>' +
        '<div data-body class="fcol fill"></div>';
      el._built = true;
      $('[data-f=pel]', el).addEventListener('change', (e) => { setPel(e.target.value); this.render(el); });
      $('[data-f=wil]', el).addEventListener('change', (e) => { RekapPg.wil = e.target.value; this.render(el); });
      $('[data-reset]', el).addEventListener('click', () => { AppState.selPel = ''; RekapPg.wil = ''; this.render(el); });
      $('[data-csv]', el).addEventListener('click', () => rekapCsv());
      $('[data-pdf]', el).addEventListener('click', () => { Object.assign(LapPg, { jenis: 'rekap', pel: D.defaultPel(), polda: RekapPg.wil, sat: '' }); LapPg.dirty = true; Router.go('laporan'); });
      el.addEventListener('click', (e) => {
        if (e.target.closest('[data-more]')) { RekapPg.showAll = !RekapPg.showAll; this.render(el); }
        const tv = e.target.closest('[data-tbl]'); if (tv) { RekapPg.tbl = tv.dataset.tbl; this.render(el); }
        const l = e.target.closest('[data-lihat]'); if (l) { Object.assign(PesertaPg, { sat: l.dataset.lihat, pel: D.defaultPel(), polda: '', q: '', kel: '', page: 1 }); Router.go('peserta'); }
        const pr = e.target.closest('[data-pickpel]'); if (pr) { AppState.selPel = pr.dataset.pickpel; this.render(el); window.scrollTo({ top: 0, behavior: 'smooth' }); }
      });
    }
    rekapBody(el);
  }
});

function rekapBody(el) {
  const pelId = D.defaultPel(), pel = D.pel(pelId), wil = RekapPg.wil;
  $('[data-f=pel]', el).innerHTML = pelOptions(pelId) || '<option>Belum ada pelatihan</option>';
  $('[data-f=wil]', el).innerHTML = poldaOptions(wil);
  const body = $('[data-body]', el);
  if (!pel) { body.innerHTML = '<div class="card"><div class="empty">' + ic('chart') + '<b>Belum ada data pelatihan</b></div></div>'; return; }

  const st = D.statusSatker(pelId, wil), tot = st.length, sudah = st.filter((x) => x.n).length;
  const pes = D.pesertaOf(pelId, wil), n = pes.length, kuota = D.totalKuota(pelId, wil), hasK = D.hasAlok(pelId);
  const kp = pct(sudah, tot), level = kp >= 75 ? ['TINGGI', 'tag-green'] : kp >= 50 ? ['SEDANG', 'tag-amber'] : ['RENDAH', 'tag-red'];
  const poldaStat = (pd) => { const s = D.statusSatker(pelId, pd), np = D.pesertaOf(pelId, pd).length; return { n: np, kq: D.totalKuota(pelId, pd), kirim: s.filter((x) => x.n).length, tot: s.length, share: pct(np, n) }; };
  const pb = poldaStat(POLDA[0]), pbd = poldaStat(POLDA[1]);
  const poldaCard = (title, code, cls, ps, barCls) =>
    '<div class="stat ' + cls + '"><div class="top-l"><span class="lbl">' + title + '</span><span class="tag tag-blue">' + code + '</span></div><div class="big c-navy">' + ps.n + (ps.kq ? ' / ' + ps.kq : '') + '<small>Personel</small></div>' +
    '<div class="bar ' + barCls + '"><i style="width:' + (ps.kq ? Math.min(100, pct(ps.n, ps.kq)) : ps.share) + '%"></i></div><div class="foot" style="margin-top:12px"><span>' + ps.kirim + ' / ' + ps.tot + ' Satker pengirim</span><span class="tag tag-blue">' + ps.share + '% SHARE</span></div></div>';
  const draftNote = pel.Status === 'Draft' ? '<div class="notice"><span>' + ic('alert-triangle') + ' <b>Pelatihan ini masih Draft</b> — belum dibagikan ke Satker, sehingga belum ada pengiriman.</span><a class="btn btn-sm btn-navy" href="#/master/pelatihan">Atur kuota &amp; bagikan</a></div>' : '';

  const stats = draftNote + '<div class="stats">' +
    '<div class="stat t-blue"><div class="top-l"><span class="lbl">Total Personel</span><span class="tag tag-blue">K-01</span></div><div class="big c-blue">' + n + (kuota ? '<small>dari kuota ' + kuota + '</small>' : '') + '</div>' +
    '<div class="bar"><i style="width:' + (kuota ? Math.min(100, pct(n, kuota)) : 0) + '%"></i></div>' +
    '<div class="foot" style="margin-top:12px"><span>Keterisian kuota' + (kuota ? ' ' + pct(n, kuota) + '%' : '') + '</span>' + (kuota ? '<span class="tag ' + (n >= kuota ? 'tag-green' : 'tag-amber') + '">' + (n >= kuota ? 'TERPENUHI' : 'KURANG ' + (kuota - n)) + '</span>' : '<span class="tag tag-gray">TANPA KUOTA</span>') + '</div></div>' +
    '<div class="stat t-green"><div class="top-l"><span class="lbl">Kepatuhan Satker</span><span class="tag tag-green">K-02</span></div><div class="big c-green">' + kp + '%<span class="tag ' + level[1] + '">' + level[0] + '</span></div>' +
    '<div class="bar green"><i style="width:' + kp + '%"></i></div><div class="foot" style="margin-top:12px"><span>Satker ditunjuk yang sudah mengirim</span><span class="tag tag-green">' + sudah + ' / ' + tot + '</span></div></div>' +
    poldaCard('Polda Papua Barat', 'REG-PB', 't-navy', pb, 'navy') + poldaCard('Polda Papua Barat Daya', 'REG-PBD', 't-teal', pbd, 'green') + '</div>';

  const jr = (x) => (x.sat.Jenis === 'Polres' ? 1 : 0);
  const sorted = st.slice().sort((a, b) => jr(a) - jr(b) || (b.kuota ? b.n / b.kuota : b.n) - (a.kuota ? a.n / a.kuota : a.n) || b.n - a.n || a.sat.Nama_Satker.localeCompare(b.sat.Nama_Satker));
  const maxN = Math.max(1, ...sorted.map((x) => Math.max(x.n, x.kuota)));
  const shown = Fit.on() || RekapPg.showAll ? sorted : sorted.slice(0, 6);
  const bars = shown.map((x) => {
    const p = x.kuota ? pct(x.n, x.kuota) : pct(x.n, maxN);
    const cls = !x.n ? 'red' : (x.kuota && x.n < x.kuota ? 'amber' : '');
    return '<div class="hbar"><div class="h"><span style="color:var(--ink)">' + esc(x.sat.Nama_Satker) + '</span><span>' + x.n + (x.kuota ? ' / ' + x.kuota : '') + ' Pers</span></div>' +
      '<div class="bar thick ' + cls + '"><i style="width:' + Math.min(100, p) + '%"></i></div>' +
      '<div class="f"><span>' + D.poldaShort(x.sat.Polda) + ' · ' + esc(x.sat.Jenis || '') + ' · ' + esc(x.sat.ID_Satker) + '</span><span class="' + (!x.n ? 'c-red' : x.kuota && x.n < x.kuota ? 'c-amber' : 'c-green') + '">' +
      (!x.n ? 'BELUM MENGIRIM' : x.kuota ? Math.min(100, p) + '% KUOTA (' + x.n + '/' + x.kuota + ')' : 'BERKAS LENGKAP ' + x.full + '/' + x.n) + '</span></div></div>';
  }).join('');

  const sprin = pes.filter((p) => p.Link_SPRIN).length, sppd = pes.filter((p) => p.Link_SPPD).length, both = pes.filter(D.lengkap).length;
  const audit = '<div class="rings"><div class="ring">' + ringSvg(pct(sprin, n), '#10b981', 'TERUNGGAH') + '<div class="cap">SPRIN<small>' + sprin + ' dari ' + n + '</small></div></div>' +
    '<div class="ring">' + ringSvg(pct(sppd, n), '#0284c7', 'TERUNGGAH') + '<div class="cap">SPPD<small>' + sppd + ' dari ' + n + '</small></div></div>' +
    '<div class="ring">' + ringSvg(pct(both, n), '#0f2147', 'LENGKAP') + '<div class="cap">LENGKAP<small>' + both + ' dari ' + n + '</small></div></div></div>' +
    (n - both ? '<div class="audit"><div class="ar bad"><span class="dot"></span>Berkas belum lengkap<span class="tag tag-red">' + (n - both) + ' PESERTA</span></div></div>' : '');

  const statusTag = (x) => x.status === 'lengkap' ? '<span class="tag tag-green pill"><span class="dot"></span>LENGKAP</span>' : x.status === 'draft' ? '<span class="tag tag-amber pill"><span class="dot"></span>BERKAS KURANG</span>'
    : x.status === 'kurang' ? '<span class="tag tag-amber pill">KURANG ' + (x.kuota - x.n) + ' ORANG</span>' : '<span class="status-bel">' + ic('alert-triangle') + 'BELUM KIRIM</span>';
  // Satker Polda dan Polres ditampilkan dalam kelompok terpisah (tidak digabung), lalu per Polda
  const satRow = (x) => {
    const pic = D.pic(x.sat.ID_Satker)[0];
    const wa = pic && pic.No_HP ? D.waLink(pic.No_HP, D.pesanPengingat(x.sat, pel)) : '';
    return '<tr><td class="main"><div class="nm">' + esc(x.sat.Nama_Satker) + '</div><div class="sub ' + (x.n ? '' : 'red') + '">' + D.poldaShort(x.sat.Polda) + ' · ' + esc(x.sat.ID_Satker) + (x.n ? '' : ' · BELUM ADA RESPONS') + '</div></td>' +
      '<td data-l="Kuota" class="c mono-n">' + (x.kuota || '—') + '</td>' +
      '<td data-l="Terdaftar" class="c mono-n" style="font-weight:700">' + x.n + '</td>' +
      '<td data-l="SPRIN/SPPD" class="c ' + (x.n && x.sprin === x.n && x.sppd === x.n ? 'num-ok' : 'num-bad') + '">' + x.sprin + '/' + x.sppd + '<span class="fit-no"> dari ' + x.n + '</span></td>' +
      '<td data-l="Status" class="c">' + statusTag(x) + '</td><td data-l="Terakhir" class="c mono-n fit-no" style="font-size:13px">' + (x.last ? fmtWaktu(x.last) : '—') + '</td>' +
      '<td class="acts-td"><div class="acts">' + (x.n ? '<button class="btn btn-xs act-view" data-lihat="' + esc(x.sat.ID_Satker) + '">Lihat</button>' : '') +
      (x.status === 'belum' || x.status === 'kurang' ? (wa ? '<a class="btn btn-xs act-wa" href="' + wa + '" target="_blank" rel="noopener">' + ic('message') + 'Ingatkan</a>' : '<span class="tag tag-gray">' + (pic ? 'PIC TANPA NO. HP' : 'BELUM ADA PIC') + '</span>') : '') + '</div></td></tr>';
  };
  const hier = JENIS_SATKER.map((jn, ji) => {
    const g = st.filter((x) => (x.sat.Jenis === 'Polres' ? 'Polres' : 'Satker Polda') === jn); if (!g.length) return '';
    const np = g.reduce((s, x) => s + x.n, 0), kq = g.reduce((s, x) => s + x.kuota, 0), kirim = g.filter((x) => x.n).length;
    return '<tr class="grp ' + (ji ? 'pbd' : '') + '"><td colspan="7">' + ic(jn === 'Polres' ? 'map-pin' : 'building') + ' ' + 'AB'[ji] + '. PENGIRIMAN ' + jn.toUpperCase() + ' — ' + np + (kq ? ' / ' + kq : '') + ' personel · ' + kirim + ' / ' + g.length + ' kesatuan mengirim<span class="kode tag ' + (ji ? 'tag-green' : 'tag-navy') + '">' + (ji ? 'POLRES' : 'SATKER POLDA') + '</span></td></tr>' +
      POLDA.filter((pd) => !wil || wil === pd).map((pd) => {
        const gp = g.filter((x) => x.sat.Polda === pd); if (!gp.length) return '';
        return '<tr class="grp sub"><td colspan="7">' + esc(pd) + ' · ' + gp.reduce((s, x) => s + x.n, 0) + ' personel · ' + gp.length + ' kesatuan</td></tr>' + gp.map(satRow).join('');
      }).join('');
  }).join('');

  const perProg = D.pelSorted().map((p) => {
    const s = D.statusSatker(p.ID_Pelatihan, wil), ps = D.pesertaOf(p.ID_Pelatihan, wil);
    const a = ps.filter((x) => jenisPeserta(x) === 'Satker Polda').length, b = ps.length - a, k = s.filter((x) => x.n).length, kq = D.totalKuota(p.ID_Pelatihan, wil);
    return '<tr' + (p.ID_Pelatihan === pelId ? ' class="sel"' : '') + '><td class="main"><div class="nm">' + esc(p.Nama_Pelatihan) + '</div><div class="sub">' + esc(p.ID_Pelatihan) + ' · ' + fmtTgl(p.Tanggal_Mulai) + '</div></td>' +
      '<td data-l="Status">' + D.statusTag(p) + '</td><td data-l="Kuota" class="c mono-n">' + (kq || '—') + '</td>' +
      '<td data-l="Satker Polda" class="c mono-n">' + a + '</td><td data-l="Polres" class="c mono-n">' + b + '</td><td data-l="Total" class="c mono-n" style="font-weight:700">' + ps.length + '</td>' +
      '<td data-l="Satker kirim" class="c mono-n">' + k + ' / ' + s.length + '</td><td class="acts-td"><div class="acts"><button class="btn btn-xs act-view" data-pickpel="' + esc(p.ID_Pelatihan) + '">Pilih</button></div></td></tr>';
  }).join('');

  const satTbl = '<table class="tbl rtable fx tbl-rekap"><thead><tr><th>Satker / Polres</th><th class="c">Kuota</th><th class="c">Terdaftar</th><th class="c">SPRIN / SPPD</th><th class="c">Status</th><th class="c fit-no">Terakhir Kirim</th><th class="r">Aksi</th></tr></thead><tbody>' +
    (hier || '<tr><td colspan="7"><div class="empty">Belum ada Satker yang ditunjuk untuk pelatihan ini.</div></td></tr>') + '</tbody></table>';
  const progTbl = '<table class="tbl rtable fx tbl-prog"><thead><tr><th>Program</th><th>Status</th><th class="c">Kuota</th><th class="c">Satker Polda</th><th class="c">Polres</th><th class="c">Total</th><th class="c">Satker Kirim</th><th class="r"></th></tr></thead><tbody>' + perProg + '</tbody></table>';
  const isSat = RekapPg.tbl !== 'prog';
  body.innerHTML = stats +
    '<div class="rk-grid fill">' +
    '<div class="card fill" data-rkt><div class="card-h"><div class="seg sm"><button type="button" data-tbl="satker" class="' + (isSat ? 'on' : '') + '">' + ic('building') + 'Per Satker yang Ditunjuk</button><button type="button" data-tbl="prog" class="' + (isSat ? '' : 'on') + '">' + ic('graduation') + 'Per Jenis Pelatihan</button></div>' +
    '<span class="lbl rk-lbl">' + (isSat ? esc(pel.Nama_Pelatihan) + ' · ' + st.length + ' Satker · ' + n + ' peserta' + (kuota ? ' / kuota ' + kuota : '') : (wil ? esc(wil) : 'SEMUA WILAYAH')) + '</span></div>' +
    '<div class="tbl-wrap">' + (isSat ? satTbl : progTbl) + '</div></div>' +
    '<div class="fcol side">' +
    '<div class="card"><div class="card-h"><h3><span class="ico" style="background:var(--green-50);color:var(--green)">' + ic('shield-check') + '</span>Kelengkapan Berkas</h3></div><div class="card-b rk-audit">' + audit + '</div></div>' +
    '<div class="card fill" data-rkq><div class="card-h"><h3><span class="ico">' + ic('chart') + '</span>Keterisian Kuota per Satker</h3><span class="lbl fit-no">' + (hasK ? 'Skala: kuota Satker' : 'Tanpa kuota') + '</span></div>' +
    '<div class="card-b scroll" style="padding-top:6px">' + (bars || '<div class="empty">Belum ada Satker yang ditunjuk.</div>') + '</div>' +
    (!Fit.on() && sorted.length > 6 ? '<div class="card-f"><span></span><button class="linkbtn blue" data-more>' + (RekapPg.showAll ? 'Tampilkan 6 teratas' : 'Lihat ' + (sorted.length - 6) + ' Satker lainnya') + '</button></div>' : '') + '</div>' +
    '</div></div>';
  AutoPager.attach($('[data-rkt]', body));
  AutoPager.attach($('[data-rkq]', body), { box: '.card-b', items: '.hbar' });
}

function rekapCsv() {
  const pelId = D.defaultPel(), st = D.statusSatker(pelId, RekapPg.wil).slice().sort((a, b) => (a.sat.Jenis === 'Polres') - (b.sat.Jenis === 'Polres'));
  downloadCsv(st, [
    { label: 'Polda', get: (x) => x.sat.Polda }, { label: 'Jenis', get: (x) => x.sat.Jenis }, { label: 'ID_Satker', get: (x) => x.sat.ID_Satker }, { label: 'Satker', get: (x) => x.sat.Nama_Satker },
    { label: 'Pelatihan', get: () => D.pelNama(pelId) }, { label: 'Kuota', get: 'kuota' }, { label: 'Terdaftar', get: 'n' }, { label: 'SPRIN', get: 'sprin' }, { label: 'SPPD', get: 'sppd' },
    { label: 'Status', get: (x) => ({ belum: 'Belum Kirim', kurang: 'Kurang dari kuota', draft: 'Berkas belum lengkap', lengkap: 'Lengkap' }[x.status]) }, { label: 'Terakhir_Kirim', get: (x) => x.last ? fmtWaktu(x.last) : '' }
  ], 'SI-PRO_rekap_' + pelId + '.csv');
}

/* ─────────────────────────── BELUM MENGIRIM ─────────────────────────── */
const BelumPg = { q: '', wil: '', mode: 'belum' };
function belumList(pelId) {
  const l = BelumPg.mode === 'kurang' ? D.kurang(pelId, BelumPg.wil) : D.belum(pelId, BelumPg.wil);
  return l.slice().sort((a, b) => (a.sat.Jenis === 'Polres') - (b.sat.Jenis === 'Polres'));   // Satker Polda dulu, lalu Polres (terpisah)
}
registerPage('belum', {
  title: 'Belum Mengirim', admin: true,
  render(el) {
    if (!el._built) {
      el.innerHTML = '<div data-head></div>' +
        '<div class="card"><div class="card-b bl-bar">' +
        '<div class="fbox" style="flex:1;min-width:240px"><span class="lbl">PROGRAM</span><select class="select" data-f="pel" style="flex:1;max-width:none"></select></div>' +
        '<select class="select" data-f="wil" style="max-width:240px"></select>' +
        '<div class="seg" data-mode><button type="button" data-v="belum">Belum mengirim</button><button type="button" data-v="kurang">Kuota belum terpenuhi</button></div>' +
        '<button class="btn btn-icon" data-sync title="Sinkronkan" aria-label="Sinkronkan">' + ic('refresh') + '</button><button class="btn btn-soft-green" data-csv>' + ic('download') + 'CSV</button></div></div>' +
        '<div data-body class="fcol fill"></div>';
      el._built = true;
      $('[data-f=pel]', el).addEventListener('change', (e) => { setPel(e.target.value); this.render(el); });
      $('[data-f=wil]', el).addEventListener('change', (e) => { BelumPg.wil = e.target.value; this.render(el); });
      $('[data-mode]', el).addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) { BelumPg.mode = b.dataset.v; this.render(el); } });
      $('[data-sync]', el).addEventListener('click', async (e) => { const done = busyBtn(e.currentTarget, 'Sinkron…'); const r = await Data.sync(true); done(); toast(r.success ? 'Daftar diperbarui dari server.' : r.message, r.success ? 'info' : 'error'); });
      $('[data-csv]', el).addEventListener('click', () => {
        const pelId = D.defaultPel(), list = belumList(pelId);
        if (!list.length) return toast('Tidak ada Satker untuk diekspor.', 'info');
        downloadCsv(list, [{ label: 'Polda', get: (x) => x.sat.Polda }, { label: 'ID_Satker', get: (x) => x.sat.ID_Satker }, { label: 'Satker', get: (x) => x.sat.Nama_Satker },
          { label: 'Kuota', get: 'kuota' }, { label: 'Terdaftar', get: 'n' },
          { label: 'PIC', get: (x) => (D.pic(x.sat.ID_Satker)[0] || {}).Nama || '' }, { label: 'No_HP', get: (x) => "'" + ((D.pic(x.sat.ID_Satker)[0] || {}).No_HP || '') }, { label: 'Pelatihan', get: () => D.pelNama(pelId) }],
        'SI-PRO_' + BelumPg.mode + '_' + pelId + '.csv');
      });
      el.addEventListener('click', (e) => {
        if (e.target.closest('[data-copyall]')) {
          const pel = D.pel(D.defaultPel()), list = belumList(pel.ID_Pelatihan);
          const txt = 'PENGINGAT PENDAFTARAN PESERTA — ' + pel.Nama_Pelatihan + ' (' + (pel.Lokasi || 'SPN Polda Papua Barat') + ')\n' +
            (BelumPg.mode === 'kurang' ? 'Kesatuan yang kuotanya belum terpenuhi:\n' : 'Kesatuan yang belum mendaftarkan peserta:\n') +
            JENIS_SATKER.map((j) => { const g = list.filter((x) => (x.sat.Jenis === 'Polres' ? 'Polres' : 'Satker Polda') === j); return g.length ? '\n' + j.toUpperCase() + ':\n' + g.map((x, i) => (i + 1) + '. ' + x.sat.Nama_Satker + (x.kuota ? ' — terdaftar ' + x.n + ' dari kuota ' + x.kuota : '')).join('\n') : ''; }).join('\n') +
            '\n\nMohon segera mendaftarkan peserta beserta SPRIN & SPPD melalui aplikasi SI-PRO' + (pel.Batas_Kirim ? ' paling lambat ' + fmtTgl(pel.Batas_Kirim, true) + ' pukul 23:59 WIT' : '') + '.';
          (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).then(() => toast('Pesan pengingat disalin. Tempel di grup WhatsApp/Telegram.', 'success')).catch(() => modal({ title: 'Salin pesan pengingat', icon: 'copy', body: '<textarea class="input" rows="12" readonly>' + esc(txt) + '</textarea>' }));
        }
        if (e.target.closest('[data-torekap]')) Router.go('rekap');
      });
      el.addEventListener('input', debounce((e) => { if (e.target.matches('[data-q]')) { BelumPg.q = e.target.value; belumTable(el); } }, 200));
    }
    $$('[data-mode] button', el).forEach((b) => b.classList.toggle('on', b.dataset.v === BelumPg.mode));
    belumBody(el);
  },
  onShow(el) { tickCountdowns(); }
});

function belumBody(el) {
  const pelId = D.defaultPel(), pel = D.pel(pelId), wil = BelumPg.wil, kurangMode = BelumPg.mode === 'kurang';
  $('[data-f=pel]', el).innerHTML = pelOptions(pelId) || '<option>Belum ada pelatihan</option>';
  $('[data-f=wil]', el).innerHTML = poldaOptions(wil);
  const list = pel ? belumList(pelId) : [], tot = pel ? D.statusSatker(pelId, wil).length : 0;
  $('[data-head]', el).innerHTML = '<div class="ph"><div>' +
    '<h1>' + (kurangMode ? 'Satker dengan Kuota Belum Terpenuhi' : 'Satker Belum Mengirim Peserta') + ' ' + (list.length ? '<span class="tag tag-red pill" style="font-size:12.5px;text-transform:none;letter-spacing:0">Defisit aktif</span>' : '') + '</h1>' +
    '<p class="desc mono">Hanya Satker yang ditunjuk &amp; diberi kuota untuk pelatihan terpilih</p></div></div>';
  const body = $('[data-body]', el);
  if (!pel) { body.innerHTML = '<div class="card"><div class="empty">' + ic('calendar') + '<b>Belum ada pelatihan</b></div></div>'; return; }
  if (pel.Status === 'Draft') { body.innerHTML = '<div class="notice"><span>' + ic('alert-triangle') + ' <b>' + esc(pel.Nama_Pelatihan) + '</b> masih Draft — belum dibagikan ke Satker.</span><a class="btn btn-sm btn-navy" href="#/master/pelatihan">Atur kuota &amp; bagikan</a></div>'; return; }
  if (!list.length) {
    body.innerHTML = '<div class="ok-card"><div class="ico">' + ic('shield-check') + '</div><div class="t"><span class="lbl">Tolok ukur kepatuhan paripurna</span> <span class="tag tag-green">100% KOMPLET</span>' +
      '<h3>' + (kurangMode ? 'SEMUA SATKER YANG SUDAH MENGIRIM TELAH MEMENUHI KUOTA' : 'DEFISIT 0: SEMUA SATKER TELAH MENGIRIMKAN PESERTA') + '</h3><p>' + tot + ' Satker ditunjuk ' + (wil ? esc(wil) : 'jajaran Polda PB &amp; PBD') + ' untuk ' + esc(pel.Nama_Pelatihan) + '.</p></div>' +
      '<button class="btn btn-navy btn-lg" data-torekap>' + ic('chart') + 'Lihat Rekapitulasi Lengkap</button></div>';
    return;
  }
  const dl = D.deadline(pel), p = pct(list.length, tot), kurangOrang = list.reduce((s, x) => s + Math.max(0, x.kuota - x.n), 0);
  body.innerHTML =
    '<div class="def-grid"><div class="def-card"><div class="h"><div><b><span class="dot"></span>STATUS DEFISIT SAAT INI</b><small>DIHITUNG OTOMATIS DARI DATA PESERTA</small></div>' + ic('alert-triangle') + '</div>' +
    '<div class="n">' + list.length + ' SATKER /<br>POLRES</div><div class="bar red thick"><i style="width:' + p + '%"></i></div>' +
    '<div class="f"><span>Dari <b>' + tot + ' Satker ditunjuk</b>, ' + (kurangMode ? 'kuotanya belum terpenuhi' : 'belum mengirim data') + '.' + (kurangOrang ? ' Kekurangan <b>' + kurangOrang + ' orang</b>.' : '') + '</span><span class="tag tag-red" style="padding:6px 10px">' + p + '% DEFISIT</span></div></div>' +
    '<div class="dl-card"><div class="h"><span class="w">PERINGATAN</span><span>[!] BATAS AKHIR PENDAFTARAN: ' + (dl ? fmtTgl(pel.Batas_Kirim, true).toUpperCase() : 'BELUM DITETAPKAN') + '</span>' +
    (dl && !D.lewat(pel) ? '<span style="margin-left:auto">(TERSISA ' + D.sisaHari(pel) + ' HARI)</span>' : '') + '</div>' +
    '<div class="mid"><div><div class="cd-l">PENGHITUNG MUNDUR PENUTUPAN PORTAL (WIT / GMT+9)</div><div class="countdown" data-cd="' + (dl ? dl.getTime() : '') + '">' + (dl ? '…' : 'Atur batas di Kelola Master → Pelatihan') + '</div></div>' +
    '<div><button class="btn btn-primary btn-lg btn-block" data-copyall>' + ic('copy') + 'Salin Pesan Pengingat Massal</button><p class="hint" style="text-align:center;margin:8px 0 0">Tempel ke grup WhatsApp / Telegram, atau gunakan tombol "Ingatkan" per Satker</p></div></div>' +
    '<div class="ft"><span>Petugas Satker tidak dapat mendaftar setelah batas lewat (Admin tetap bisa).</span><span class="r">PORTAL TERKUNCI PUKUL 23:59:59 WIT</span></div></div></div>' +
    '<div class="card fill" data-blt><div class="card-h"><h3><span class="ico red">' + ic('alert-circle') + '</span>Tabel Satker Defisit &amp; Kontak PIC <span class="tag tag-red pill">' + list.length + ' SATKER</span></h3>' +
    '<div class="with-ic" style="min-width:260px">' + ic('search') + '<input class="input" data-q placeholder="Cari Satker atau nama PIC…" value="' + esc(BelumPg.q) + '"></div></div>' +
    '<div class="tbl-wrap"><table class="tbl rtable"><thead><tr><th>No</th><th>Polda</th><th>Nama Satker / Polres</th><th class="c">Kuota</th><th class="c">Terdaftar</th><th>Petugas PIC</th><th>Kontak / WA</th><th class="r">Aksi</th></tr></thead><tbody data-rows></tbody></table></div>' +
    '</div>';
  belumTable(el);
  AutoPager.attach($('[data-blt]', el));
  tickCountdowns();
}

function belumTable(el) {
  const pel = D.pel(D.defaultPel()); if (!pel || !$('[data-rows]', el)) return;
  const q = BelumPg.q.toLowerCase();
  const list = belumList(pel.ID_Pelatihan).filter((x) => !q || (x.sat.Nama_Satker + ' ' + D.pic(x.sat.ID_Satker).map((u) => u.Nama).join(' ')).toLowerCase().includes(q));
  let no = 0, cur = '';
  $('[data-rows]', el).innerHTML = list.length ? list.map((x) => {
    const jn = x.sat.Jenis === 'Polres' ? 'Polres' : 'Satker Polda', head = jn !== cur ? (cur = jn, no = 0, '<tr class="grp' + (jn === 'Polres' ? ' pbd' : '') + '"><td colspan="8">' + ic(jn === 'Polres' ? 'map-pin' : 'building') + ' ' + jn.toUpperCase() + ' — ' + list.filter((y) => (y.sat.Jenis === 'Polres' ? 'Polres' : 'Satker Polda') === jn).length + ' kesatuan</td></tr>') : '';
    const i = no++;
    const pics = D.pic(x.sat.ID_Satker), u = pics[0];
    const wa = u && u.No_HP ? D.waLink(u.No_HP, D.pesanPengingat(x.sat, pel)) : '';
    return head + '<tr><td class="no no-m">' + String(i + 1).padStart(2, '0') + '</td><td data-l="Polda">' + D.poldaChip(x.sat.Polda, true) + '</td>' +
      '<td class="main"><div class="nm" style="display:flex;gap:8px;align-items:center">' + ic('building') + esc(x.sat.Nama_Satker) + '</div><div class="sub" style="margin-left:26px">' + esc(x.sat.Jenis || '') + ' · ' + esc(x.sat.ID_Satker) + '</div></td>' +
      '<td data-l="Kuota" class="c mono-n" style="font-weight:700">' + (x.kuota || '—') + '</td><td data-l="Terdaftar" class="c mono-n ' + (x.n ? 'c-amber' : 'c-red') + '" style="font-weight:700">' + x.n + '</td>' +
      '<td data-l="PIC">' + (u ? '<div class="nm">' + esc(u.Nama) + '</div><div class="sub">' + (u.NRP ? 'NRP. ' + esc(u.NRP) : '@' + esc(u.Username)) + (u.Jabatan ? ' · ' + esc(u.Jabatan) : '') + (pics.length > 1 ? ' · +' + (pics.length - 1) + ' petugas' : '') + '</div>' : '<span class="tag tag-amber">BELUM ADA AKUN PETUGAS</span>') + '</td>' +
      '<td data-l="Kontak">' + (u && u.No_HP ? '<span class="phone"><span class="dot"></span>' + esc(u.No_HP) + '</span>' : '<span class="phone none">— tidak ada</span>') + '</td>' +
      '<td class="acts-td"><div class="acts">' + (wa ? '<a class="btn btn-xs act-wa" href="' + wa + '" target="_blank" rel="noopener">' + ic('message') + 'Ingatkan</a>' : u && u.Email ? '<a class="btn btn-xs act-view" href="mailto:' + esc(u.Email) + '?subject=' + encodeURIComponent('Pengingat SI-PRO: ' + pel.Nama_Pelatihan) + '&body=' + encodeURIComponent(D.pesanPengingat(x.sat, pel)) + '">Email</a>' : u ? '<span class="tag tag-gray">TANPA KONTAK</span>' : '<a class="btn btn-xs" href="#/master/pengguna">Daftarkan PIC</a>') + '</div></td></tr>';
  }).join('') : '<tr><td colspan="8"><div class="empty">Tidak ada yang cocok dengan pencarian.</div></td></tr>';
}

let cdTimer = null;
function tickCountdowns() {
  clearInterval(cdTimer);
  const upd = () => {
    const els = $$('[data-cd]').filter((x) => x.dataset.cd && x.offsetParent);
    if (!els.length) { clearInterval(cdTimer); return; }
    els.forEach((x) => {
      const ms = +x.dataset.cd - Date.now();
      if (ms <= 0) { x.classList.add('done'); x.textContent = 'PORTAL PENGIRIMAN SUDAH DITUTUP'; return; }
      const d = Math.floor(ms / 864e5), h = Math.floor(ms / 36e5) % 24, m = Math.floor(ms / 6e4) % 60, s = Math.floor(ms / 1e3) % 60;
      const p = (n) => String(n).padStart(2, '0');
      x.textContent = p(d) + ' HARI : ' + p(h) + ' JAM : ' + p(m) + ' MENIT : ' + p(s) + ' DETIK';
    });
  };
  upd(); cdTimer = setInterval(upd, 1000);
}

/* ─────────────────────────── CETAK LAPORAN ─────────────────────────── */
const LapPg = { jenis: 'nominatif', pel: '', polda: '', sat: '', nomor: '', kontak: true, berkas: true, ttd: true, zoom: 0, html: '', dirty: true, key: '' };
registerPage('laporan', {
  title: 'Cetak Laporan', live: false,
  render(el) { if (!el._built) lapBuild(el); lapSync(el); },
  onData(el) { lapSync(el); }
});

function lapBuild(el) {
  const admin = isAdmin();
  if (!LapPg.pel) LapPg.pel = D.defaultPel();
  el.innerHTML =
    '<div class="lap fill"><div class="lap-l">' +
    '<div><h2 style="margin:0;font-size:22px;display:flex;justify-content:space-between;gap:8px;align-items:flex-start">Parameter Cetak Dokumen <span class="tag tag-blue">A4</span></h2>' +
    '<p class="muted" style="margin:6px 0 0">Atur jenis laporan &amp; filter. Data diambil langsung dari server sesuai hak akses Anda.</p></div>' +
    '<div class="field"><label>Jenis dokumen laporan</label><select class="select" data-k="jenis"><option value="nominatif">Daftar Nominatif Peserta</option>' + (admin ? '<option value="rekap">Rekapitulasi per Satker</option><option value="belum">Daftar Satker Belum Mengirim</option>' : '') + '</select></div>' +
    '<div class="field"><label>Program pelatihan</label><select class="select" data-k="pel"></select></div>' +
    (admin ? '<div class="field"><label>Yurisdiksi komando</label><select class="select" data-k="polda"></select></div><div class="field"><label>Filter kesatuan kerja (Satker)</label><select class="select" data-k="sat"></select></div>'
      : '<div class="field"><label>Kesatuan kerja ' + ic('lock', 'lock-ic') + '</label><input class="input" readonly value="' + esc(D.d.me.namaSatker) + '"></div>') +
    '<div class="field"><label>Nomor surat (opsional)</label><input class="input" data-k="nomor" placeholder="Contoh: B/123/XI/2026/ROSDM" value="' + esc(LapPg.nomor) + '"></div>' +
    '<div class="field"><label>Elemen dokumen</label><div class="lap-opts">' +
    '<label class="check" data-only="nominatif"><input type="checkbox" data-k="berkas"><span><b>Sertakan status berkas SPRIN &amp; SPPD</b><small>Kolom keterangan berkas administrasi</small></span></label>' +
    (admin ? '<label class="check" data-only="belum"><input type="checkbox" data-k="kontak"><span><b>Sertakan kontak PIC Satker</b><small>Nama penanggung jawab &amp; nomor telepon</small></span></label>' : '') +
    '<label class="check"><input type="checkbox" data-k="ttd"><span><b>Sertakan blok tanda tangan pejabat</b><small>Diatur Admin di Kelola Master → Pengaturan</small></span></label></div></div>' +
    '<div class="sp"></div>' +
    '<button class="btn btn-navy btn-lg btn-block" data-gen>' + ic('refresh') + 'Generate Pratinjau Dokumen</button>' +
    '<button class="btn btn-danger btn-lg btn-block" data-pdf>' + ic('download') + 'Unduh Berkas PDF Resmi</button>' +
    '<div class="hint" style="display:flex;justify-content:space-between"><span></span><span>F9 = pratinjau</span></div>' +
    '</div><div class="lap-r"><div class="lap-tb"><span class="tag tag-blue">A4 (210 × 297 MM)</span><span data-st class="tag tag-gray">BELUM DIBUAT</span><span style="flex:1"></span>' +
    '<button class="btn btn-sm" data-z="-1" aria-label="Perkecil">' + ic('zoom-out') + '</button><span class="btn btn-sm" style="cursor:default" data-zl>FIT</span><button class="btn btn-sm" data-z="1" aria-label="Perbesar">' + ic('zoom-in') + '</button>' +
    '<button class="btn btn-sm" data-fit>' + ic('maximize') + 'Fit</button><button class="btn btn-sm" data-print>' + ic('printer') + 'Cetak</button></div>' +
    '<div class="lap-stage" data-stage><div class="paper-empty">' + ic('file-text') + '<p><b>Pratinjau dokumen akan tampil di sini.</b><br>Atur parameter di kiri lalu tekan "Generate Pratinjau Dokumen".</p></div></div></div></div>';
  el._built = true;
  el.addEventListener('change', (e) => {
    const k = e.target.dataset.k; if (!k) return;
    LapPg[k] = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    if (k === 'polda') LapPg.sat = '';
    LapPg.dirty = true; lapSync(el); lapStatus(el);
    if (LapPg.html) lapGenerate(el);                      // pratinjau otomatis mengikuti filter
  });
  el.addEventListener('input', (e) => { if (e.target.dataset.k === 'nomor') { LapPg.nomor = e.target.value; LapPg.dirty = true; lapStatus(el); } });
  $('[data-gen]', el).addEventListener('click', () => lapGenerate(el, true));
  $('[data-pdf]', el).addEventListener('click', (e) => lapPdf(el, e.currentTarget));
  $$('[data-z]', el).forEach((b) => b.addEventListener('click', () => { LapPg.zoom = Math.max(0.4, Math.min(1.6, (LapPg.zoom || lapFit(el)) + 0.1 * +b.dataset.z)); lapZoom(el); }));
  $('[data-fit]', el).addEventListener('click', () => { LapPg.zoom = 0; lapZoom(el); });
  $('[data-print]', el).addEventListener('click', () => { const f = $('iframe', el); if (!f) return toast('Buat pratinjau terlebih dahulu.', 'warn'); f.contentWindow.focus(); f.contentWindow.print(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'F9' && Router.cur === 'laporan') { e.preventDefault(); lapGenerate(el, true); } });
  addEventListener('resize', debounce(() => { if (!LapPg.zoom) lapZoom(el); }, 150));
}

function lapSync(el) {
  const admin = isAdmin(), S = LapPg;
  const sel = (k, html) => { const s = $('[data-k="' + k + '"]', el); if (s) { s.innerHTML = html; s.value = S[k]; } };
  $('[data-k=jenis]', el).value = S.jenis;
  sel('pel', pelOptions(S.pel, S.jenis === 'belum' ? '' : 'Semua program pelatihan'));
  if (S.jenis === 'belum' && !S.pel) { S.pel = D.defaultPel(); $('[data-k=pel]', el).value = S.pel; }
  if (admin) { sel('polda', poldaOptions(S.polda, 'Semua wilayah (Polda PB & PBD)')); sel('sat', satOptions(S.sat, S.polda, 'Semua Satker terdaftar')); $('[data-k=sat]', el).disabled = S.jenis === 'belum'; }
  ['berkas', 'kontak', 'ttd'].forEach((k) => { const c = $('[data-k="' + k + '"]', el); if (c) c.checked = !!S[k]; });
  $$('[data-only]', el).forEach((x) => { x.hidden = x.dataset.only !== S.jenis; });
}
function lapParams() {
  const S = LapPg;
  return { jenis: S.jenis, idPelatihan: S.pel, polda: S.polda, idSatker: S.jenis === 'belum' ? '' : S.sat, nomor: S.nomor, opsi: { berkas: S.berkas, kontak: S.kontak, ttd: S.ttd } };
}
function lapStatus(el, txt, cls) { const s = $('[data-st]', el); s.className = 'tag ' + (cls || (LapPg.html && !LapPg.dirty ? 'tag-green' : 'tag-amber')); s.innerHTML = txt || (LapPg.html ? (LapPg.dirty ? 'PARAMETER BERUBAH' : '<span class="dot"></span>SIAP CETAK') : 'BELUM DIBUAT'); }
async function lapGenerate(el, manual) {
  const p = lapParams(), key = JSON.stringify(p);
  if (!manual && key === LapPg.key) return;
  LapPg.key = key;
  const btn = $('[data-gen]', el), done = busyBtn(btn, 'Menyusun dokumen…');
  lapStatus(el, '<span class="spin" style="width:10px;height:10px"></span> MENYUSUN', 'tag-blue');
  const res = await api('laporan', Object.assign({ format: 'html' }, p));
  done();
  if (LapPg.key !== key) return;                          // sudah ada permintaan lebih baru
  if (!res.success) { lapStatus(el, 'GAGAL', 'tag-red'); return toast(res.message, 'error'); }
  LapPg.html = res.data.html; LapPg.dirty = false;
  const stage = $('[data-stage]', el);
  stage.innerHTML = '<div class="paper-box"><div class="paper"><iframe title="Pratinjau laporan" sandbox="allow-same-origin allow-modals"></iframe></div></div>';
  const f = $('iframe', stage);
  f.addEventListener('load', () => {
    try { const doc = f.contentDocument; doc.body.style.padding = '56px 52px'; doc.body.style.boxSizing = 'border-box'; f.style.height = Math.max(1123, doc.documentElement.scrollHeight) + 'px'; } catch (e) { /* */ }
    lapZoom(el);
  });
  f.srcdoc = LapPg.html;
  lapStatus(el);
}
function lapFit(el) { const st = $('[data-stage]', el); return Math.min(1, Math.max(0.35, (st.clientWidth - 32) / 794)); }
function lapZoom(el) {
  const paper = $('.paper', el), box = $('.paper-box', el); if (!paper) return;
  const z = LapPg.zoom || lapFit(el), f = $('iframe', paper);
  paper.style.transform = 'scale(' + z + ')';
  box.style.width = 794 * z + 'px'; box.style.height = (f ? f.offsetHeight : 1123) * z + 'px';
  $('[data-zl]', el).textContent = 'ZOOM: ' + Math.round(z * 100) + '%';
}
async function lapPdf(el, btn) {
  const done = busyBtn(btn, 'Membuat PDF di server…');
  const res = await api('laporan', Object.assign({ format: 'pdf' }, lapParams()), { timeout: 90000 });
  done();
  if (!res.success) return toast(res.message, 'error', 'Gagal membuat PDF');
  downloadBlob(b64ToBlob(res.data.base64, 'application/pdf'), res.data.name);
  toast('PDF ' + res.data.name + ' diunduh.', 'success');
}
