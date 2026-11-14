/* =========================================================================
   SI-PRO — Data turunan (dihitung di perangkat dari hasil bootstrap)
   Rekap, status pengiriman, kuota, dan daftar "belum mengirim" tidak perlu ke server
   → pindah menu instan. Server tetap memeriksa hak akses & kuota pada setiap penulisan.
   ========================================================================= */
'use strict';
const POLDA = ['Polda Papua Barat', 'Polda Papua Barat Daya'];
const JENIS_SATKER = ['Satker Polda', 'Polres'];
const STATUS_PEL = { Draft: 'DRAFT', Aktif: 'DIBAGIKAN', Selesai: 'SELESAI' };
const D = {
  _rev: -1, _m: {},
  memo(key, fn) { if (this._rev !== AppState.rev) { this._m = {}; this._rev = AppState.rev; } return key in this._m ? this._m[key] : (this._m[key] = fn()); },
  get d() { return AppState.data || { satker: [], pelatihan: [], peserta: [], pengguna: [], alokasi: [], me: {}, settings: {} }; },
  satMap() { return this.memo('satMap', () => Object.fromEntries(this.d.satker.map((s) => [s.ID_Satker, s]))); },
  pelMap() { return this.memo('pelMap', () => Object.fromEntries(this.d.pelatihan.map((p) => [p.ID_Pelatihan, p]))); },
  sat(id) { return this.satMap()[id] || null; },
  pel(id) { return this.pelMap()[id] || null; },
  satNama(id) { const s = this.sat(id); return s ? s.Nama_Satker : id || '-'; },
  pelNama(id) { const p = this.pel(id); return p ? p.Nama_Pelatihan : id || '-'; },
  sortSat(a, b) { return a.Polda.localeCompare(b.Polda) || (a.Jenis === b.Jenis ? 0 : a.Jenis === 'Satker Polda' ? -1 : 1) || a.Nama_Satker.localeCompare(b.Nama_Satker); },
  satAktif(polda) { return this.d.satker.filter((s) => s.Status !== 'Nonaktif' && (!polda || s.Polda === polda)).sort(this.sortSat); },
  // Aktif (dibagikan) dulu — paling dekat batas kirim; lalu Draft; Selesai terbaru terakhir
  pelSorted() {
    const rank = { Aktif: 0, Draft: 1, Selesai: 2 };
    return this.memo('pelSorted', () => this.d.pelatihan.slice().sort((a, b) => {
      if (a.Status !== b.Status) return (rank[a.Status] ?? 3) - (rank[b.Status] ?? 3);
      if (a.Status === 'Selesai') return String(b.Tanggal_Mulai).localeCompare(String(a.Tanggal_Mulai));
      return String(a.Batas_Kirim || a.Tanggal_Mulai).localeCompare(String(b.Batas_Kirim || b.Tanggal_Mulai));
    }));
  },
  pelAktif() { return this.pelSorted().filter((p) => p.Status === 'Aktif'); },
  /** Default: pelatihan dibagikan yang batasnya belum lewat & paling dekat. */
  defaultPel() {
    if (AppState.selPel && this.pel(AppState.selPel)) return AppState.selPel;
    const p = this.pelAktif().find((x) => !this.lewat(x)) || this.pelAktif()[0] || this.pelSorted()[0];
    return (AppState.selPel = p ? p.ID_Pelatihan : '');
  },
  poldaShort(p) { return p === POLDA[1] ? 'PBD' : p === POLDA[0] ? 'PB' : '-'; },
  poldaChip(p, full) { return '<span class="chip-polda ' + (p === POLDA[1] ? 'chip-pbd' : 'chip-pb') + '" title="' + esc(p) + '">' + esc(full ? (p || '-') : 'POLDA ' + this.poldaShort(p)) + '</span>'; },
  statusTag(p) { const s = p.Status; return '<span class="tag ' + (s === 'Aktif' ? 'tag-blue' : s === 'Draft' ? 'tag-amber' : 'tag-gray') + ' pill">' + (STATUS_PEL[s] || s) + '</span>'; },
  /** Berkas lengkap = SPRIN + SPPD. */
  lengkap(p) { return !!(p.Link_SPRIN && p.Link_SPPD); },
  fileId(link) { const m = String(link || '').match(/\/d\/([A-Za-z0-9_-]{10,})/); return m ? m[1] : ''; },
  pesertaOf(pelId, polda, satId) {
    return this.d.peserta.filter((p) => (!pelId || p.ID_Pelatihan === pelId) && (!polda || p.Polda_Asal === polda) && (!satId || p.ID_Satker === satId));
  },
  // ── Kuota ──
  alokMap() {
    return this.memo('alok', () => { const m = {}; (this.d.alokasi || []).forEach((a) => { (m[a.ID_Pelatihan] = m[a.ID_Pelatihan] || {})[a.ID_Satker] = +a.Kuota; }); return m; });
  },
  alok(pelId) { return this.alokMap()[pelId] || {}; },
  hasAlok(pelId) { return Object.keys(this.alok(pelId)).length > 0; },
  totalKuota(pelId, polda) { const a = this.alok(pelId); return Object.keys(a).filter((id) => !polda || (this.sat(id) || {}).Polda === polda).reduce((s, id) => s + a[id], 0); },
  /** Satker sasaran: yang ditunjuk (berkuota). Pelatihan lama tanpa kuota → semua Satker aktif. */
  targets(pelId, polda) {
    if (!this.hasAlok(pelId)) return this.satAktif(polda);
    const a = this.alok(pelId);
    return this.d.satker.filter((s) => a[s.ID_Satker] > 0 && (!polda || s.Polda === polda)).sort(this.sortSat);
  },
  kuotaInfo(pelId, satId, exceptId) {
    const has = this.hasAlok(pelId), kuota = has ? (this.alok(pelId)[satId] || 0) : 0;
    const terisi = this.d.peserta.filter((p) => p.ID_Pelatihan === pelId && p.ID_Satker === satId && p.ID_Peserta !== exceptId).length;
    return { has, kuota, terisi, sisa: has ? Math.max(0, kuota - terisi) : Infinity, penuh: has && terisi >= kuota };
  },
  /** Status Satker untuk satu pelatihan: belum / kurang (di bawah kuota) / draft (berkas belum lengkap) / lengkap. */
  statusSatker(pelId, polda) {
    return this.memo('st|' + pelId + '|' + polda, () => {
      const agg = {}, al = this.alok(pelId);
      this.pesertaOf(pelId, polda).forEach((p) => {
        const a = agg[p.ID_Satker] || (agg[p.ID_Satker] = { n: 0, sprin: 0, sppd: 0, foto: 0, full: 0, last: '' });
        a.n++; if (p.Link_SPRIN) a.sprin++; if (p.Link_SPPD) a.sppd++; if (p.Link_Foto) a.foto++; if (this.lengkap(p)) a.full++;
        const t = p.Tanggal_Ubah || p.Tanggal_Input; if (t > a.last) a.last = t;
      });
      return this.targets(pelId, polda).map((s) => {
        const a = agg[s.ID_Satker] || { n: 0, sprin: 0, sppd: 0, foto: 0, full: 0, last: '' };
        const kuota = al[s.ID_Satker] || 0;
        const status = !a.n ? 'belum' : (kuota && a.n < kuota ? 'kurang' : (a.full === a.n ? 'lengkap' : 'draft'));
        return Object.assign({ sat: s, kuota, status }, a);
      });
    });
  },
  belum(pelId, polda) { return this.statusSatker(pelId, polda).filter((x) => x.status === 'belum'); },
  kurang(pelId, polda) { return this.statusSatker(pelId, polda).filter((x) => x.status === 'kurang'); },
  pic(idSatker) { return this.d.pengguna.filter((u) => u.ID_Satker === idSatker && u.Peran === 'Petugas' && u.Status === 'Aktif'); },
  /** Batas kirim berlaku sampai 23:59:59 WIT. */
  deadline(pel) { return pel && pel.Batas_Kirim ? new Date(pel.Batas_Kirim + 'T23:59:59+09:00') : null; },
  lewat(pel) { const d = this.deadline(pel); return !!d && Date.now() > d.getTime(); },
  sisaHari(pel) { const d = this.deadline(pel); return d ? Math.ceil((d.getTime() - Date.now()) / 864e5) : null; },
  /** Bolehkah mendaftarkan peserta ke pelatihan ini untuk Satker tsb? */
  canSubmit(pel, satId) {
    if (!pel) return false;
    const kuotaOk = !this.hasAlok(pel.ID_Pelatihan) || !satId || (this.alok(pel.ID_Pelatihan)[satId] || 0) > 0;
    if (isAdmin()) return pel.Status !== 'Selesai' && kuotaOk;
    return pel.Status === 'Aktif' && !this.lewat(pel) && kuotaOk;
  },
  waLink(hp, text) { let n = String(hp || '').replace(/\D/g, ''); if (!n) return ''; if (n[0] === '0') n = '62' + n.slice(1); return 'https://wa.me/' + n + '?text=' + encodeURIComponent(text); },
  pesanPengingat(sat, pel) {
    const dl = pel && pel.Batas_Kirim ? ' paling lambat ' + fmtTgl(pel.Batas_Kirim, true) + ' pukul 23:59 WIT' : '';
    const k = pel ? this.alok(pel.ID_Pelatihan)[sat.ID_Satker] : 0;
    return 'Yth. Petugas ' + sat.Nama_Satker + ',\nMohon segera mendaftarkan peserta ' + (pel ? pel.Nama_Pelatihan : 'pelatihan') + (k ? ' (kuota ' + k + ' orang)' : '') +
      ' beserta SPRIN & SPPD melalui aplikasi SI-PRO' + dl + '.\nTerima kasih.\n— Admin Induk SI-PRO';
  },
  pesanBagikan(sat, pel) {
    const k = this.alok(pel.ID_Pelatihan)[sat.ID_Satker] || 0;
    return 'Yth. Kasatker/Kapolres ' + sat.Nama_Satker + ' u.p. Petugas SI-PRO,\n\n' +
      'Diberitahukan bahwa ' + sat.Nama_Satker + ' ditunjuk mengirimkan peserta:\n' +
      '• Pelatihan: ' + pel.Nama_Pelatihan + '\n• Tempat: ' + (pel.Lokasi || 'SPN Polda Papua Barat') + '\n' +
      '• Pelaksanaan: ' + fmtTgl(pel.Tanggal_Mulai, true) + ' s.d. ' + fmtTgl(pel.Tanggal_Selesai, true) + '\n• Kuota: ' + k + ' orang\n' +
      (pel.Batas_Kirim ? '• Batas pendaftaran: ' + fmtTgl(pel.Batas_Kirim, true) + ' pukul 23:59 WIT\n' : '') +
      '\nSilakan daftarkan peserta beserta SPRIN & SPPD (PDF) melalui aplikasi SI-PRO: ' + location.origin + location.pathname +
      '\n\n— Admin Induk SI-PRO';
  }
};

/** Opsi <select> pelatihan. */
function pelOptions(sel, withAll, onlyAktif) {
  const list = onlyAktif ? D.pelAktif() : D.pelSorted();
  return (withAll ? '<option value="">' + esc(withAll) + '</option>' : '') + list.map((p) =>
    '<option value="' + esc(p.ID_Pelatihan) + '"' + (p.ID_Pelatihan === sel ? ' selected' : '') + '>' + esc(p.Nama_Pelatihan) + (p.Status === 'Selesai' ? ' (Selesai)' : p.Status === 'Draft' ? ' (Draft)' : '') + '</option>').join('');
}
function poldaOptions(sel, allLabel) {
  return '<option value="">' + esc(allLabel || 'Semua Wilayah (Polda PB & PBD)') + '</option>' + POLDA.map((p) => '<option value="' + p + '"' + (p === sel ? ' selected' : '') + '>' + p + '</option>').join('');
}
function satOptions(sel, polda, allLabel, includeInactive, filterFn) {
  const list = (includeInactive ? D.d.satker.slice().sort(D.sortSat) : D.satAktif()).filter((s) => (!polda || s.Polda === polda) && (!filterFn || filterFn(s)));
  let html = allLabel ? '<option value="">' + esc(allLabel) + '</option>' : '';
  POLDA.forEach((pd) => JENIS_SATKER.forEach((jn) => {
    const g = list.filter((s) => s.Polda === pd && s.Jenis === jn); if (!g.length) return;
    html += '<optgroup label="' + pd + ' — ' + jn + '">' + g.map((s) => '<option value="' + esc(s.ID_Satker) + '"' + (s.ID_Satker === sel ? ' selected' : '') + '>' + esc(s.Nama_Satker) + '</option>').join('') + '</optgroup>';
  }));
  return html;
}

/** Donut SVG sederhana. parts = [{v, color}] */
function donutSvg(parts, size, stroke, center) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r, tot = parts.reduce((a, p) => a + p.v, 0);
  let off = 0;
  const arcs = tot ? parts.map((p) => {
    const len = (p.v / tot) * c;
    const s = '<circle cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" fill="none" stroke="' + p.color + '" stroke-width="' + stroke + '" stroke-dasharray="' + len + ' ' + (c - len) + '" stroke-dashoffset="' + (-off) + '" transform="rotate(-90 ' + size / 2 + ' ' + size / 2 + ')"/>';
    off += len; return s;
  }).join('') : '';
  return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '" role="img">' +
    '<circle cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" fill="none" stroke="#edf1f6" stroke-width="' + stroke + '"/>' + arcs +
    (center || '') + '</svg>';
}
function ringSvg(p, color, label) {
  const size = 104, stroke = 9;
  return donutSvg([{ v: p, color }, { v: Math.max(0, 100 - p), color: 'transparent' }], size, stroke,
    '<text x="52" y="52" text-anchor="middle" font-family="Arial, sans-serif" font-size="19" font-weight="700" fill="' + color + '">' + Math.round(p) + '%</text>' +
    '<text x="52" y="68" text-anchor="middle" font-family="Arial, sans-serif" font-size="8.5" letter-spacing="1" fill="#64748b">' + label + '</text>');
}
function setPel(v) { AppState.selPel = v; if (window.Layout) Layout.update(); }
