/* =========================================================================
   SI-PRO — Inti aplikasi: state, penyimpanan lokal, API (fetch PRO), router,
   komponen UI (toast, modal, konfirmasi), utilitas format.
   ========================================================================= */
'use strict';
/* Anti-clickjacking: SI-PRO tidak boleh ditampilkan di dalam iframe situs lain (mencegah pengguna tertipu mengeklik tombol tersembunyi). */
(function () {
  try {
    if (window.top !== window.self) {
      document.documentElement.style.display = 'none';
      window.top.location = window.self.location.href;
    }
  } catch (e) { document.documentElement.style.display = 'none'; }
})();
const CFG = window.SIPROLAT_CONFIG || {};
const GAS_URL = (CFG.GAS_URL || '').trim();
const $ = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));

const AppState = {
  token: '', user: '',              // user = username yang sedang masuk
  data: null,            // hasil bootstrap (me, satker, pelatihan, peserta, pengguna, settings)
  rev: 0,                // naik setiap data berubah → halaman tahu kapan perlu render ulang
  lastSync: 0, syncing: false, online: navigator.onLine !== false,
  selPel: ''             // pelatihan terpilih (dipakai bersama Beranda/Rekap/Belum Mengirim)
};

// ─── Penyimpanan lokal (namespace per user + versi skema) ────────────────────
const LS_PREFIX = 'siprolat:v1:';
const Store = {
  get(k, d) { try { const v = localStorage.getItem(LS_PREFIX + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
  set(k, v) {
    const s = JSON.stringify(v);
    try { localStorage.setItem(LS_PREFIX + k, s); }
    catch (e) {   // kuota penuh → buang cache user lain lalu coba sekali lagi
      try {
        Object.keys(localStorage).filter((x) => x.indexOf(LS_PREFIX + 'u:') === 0 && x.indexOf(LS_PREFIX + userKey('')) !== 0).forEach((x) => localStorage.removeItem(x));
        localStorage.setItem(LS_PREFIX + k, s);
      } catch (e2) { /* tetap jalan tanpa cache */ }
    }
  },
  del(k) { try { localStorage.removeItem(LS_PREFIX + k); } catch (e) { /* */ } },
  clearUser(email) { try { Object.keys(localStorage).filter((x) => x.indexOf(LS_PREFIX + 'u:' + email + ':') === 0).forEach((x) => localStorage.removeItem(x)); } catch (e) { /* */ } }
};
function userKey(k) { return 'u:' + (AppState.user || 'anon') + ':' + k; }
function hashStr(s) { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return h + ':' + s.length; }

// ─── Pengukur kinerja (Prinsip 0) — panggil Perf.table() di console ─────────
const Perf = {
  rows: [],
  add(action, total, server) {
    this.rows.push({ action, total, server: server == null ? null : server, net: server != null ? total - server : null, at: new Date().toLocaleTimeString('id-ID') });
    if (this.rows.length > 200) this.rows.shift();
  },
  table() { console.table(this.rows.slice(-30)); }
};
window.Perf = Perf;

// ─── API: timeout, retry baca, reqId idempoten untuk tulis (Prinsip 6 & 8) ───
const READ_ACTIONS = /^(login|bootstrap|getBerkas|laporan|logs|pangkalan|pengumumanPublik)$/;
async function apiOnce(action, data, timeout, reqId) {
  const ctrl = new AbortController(), timer = setTimeout(() => ctrl.abort(), timeout), t0 = performance.now();
  try {
    const res = await fetch(GAS_URL, {
      method: 'POST', redirect: 'follow', cache: 'no-store', signal: ctrl.signal,
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },          // hindari CORS preflight
      body: JSON.stringify({ action, token: AppState.token || '', reqId, data: data || {} })
    });
    const text = await res.text();
    try { const j = JSON.parse(text); Perf.add(action, Math.round(performance.now() - t0), j.ms); return j; }
    catch (e) { return { success: false, network: true, retryable: res.status >= 500 || res.status === 429 || res.status === 200, message: 'Server membalas dalam format tidak dikenal (HTTP ' + res.status + '). Periksa URL Web App.' }; }
  } catch (err) {
    return { success: false, network: true, retryable: true, message: err.name === 'AbortError' ? 'Server terlalu lama merespons. Periksa koneksi lalu coba lagi.' : 'Koneksi ke server terputus. Periksa jaringan internet Anda.' };
  } finally { clearTimeout(timer); }
}
function newReqId() { return (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + '-' + Math.random().toString(36).slice(2)); }
async function api(action, data, opt) {
  opt = opt || {};
  if (!GAS_URL) return { success: false, message: 'Aplikasi belum terhubung ke server: isi GAS_URL di js/config.js.' };
  const isRead = opt.read != null ? opt.read : READ_ACTIONS.test(action);
  const reqId = isRead ? '' : (opt.reqId || newReqId());
  const tries = isRead ? 3 : 2;                       // tulis aman di-retry karena reqId sama
  let res;
  for (let i = 0; i < tries; i++) {
    if (i) { await new Promise((r) => setTimeout(r, 1200 * i)); if (navigator.onLine === false) await waitOnline(15000); }
    res = await apiOnce(action, data, opt.timeout || (isRead ? (i ? 40000 : 25000) : 120000), reqId);
    if (res.success || !res.retryable) break;
  }
  setOnline(!res.network);
  if (!res.success && res.data && (res.data.code === 'AUTH' || res.data.code === 'MUST_CHANGE') && action !== 'login' && !Auth.pending) Auth.expired(res.message);
  return res;
}
function waitOnline(ms) {
  return new Promise((r) => {
    if (navigator.onLine !== false) return r();
    const t = setTimeout(done, ms);
    function done() { clearTimeout(t); removeEventListener('online', done); r(); }
    addEventListener('online', done);
  });
}
function warmUpServer() { if (GAS_URL) fetch(GAS_URL + '?ping=' + Date.now(), { cache: 'no-store' }).then((r) => r.json()).then(() => setOnline(true)).catch(() => {}); }
function setOnline(v) { if (AppState.online !== v) { AppState.online = v; if (window.Layout) Layout.syncPill(); } }

// ─── Sinkronisasi data (SWR: tampilkan cache dulu, segarkan di latar) ────────
const Data = {
  FRESH: 60000,
  /** Perubahan yang sedang dikirim ke server: tetap tampil walau data server datang lebih dulu. */
  pending: {},          // ID_Peserta → baris (baru: ID sementara 'TMP-…'; ubah: ID asli)
  gone: new Set(),      // ID_Peserta yang sedang dihapus
  overlay(b) {
    if (!b) return b;
    Object.keys(this.hidden).forEach((k) => { const m = this.hidden[k]; if (m.size && Array.isArray(b[k])) b[k] = b[k].filter((x) => !Array.from(m).some(([id, col]) => String(x[col]) === String(id))); });
    if (!b.peserta) return b;
    const P = this.pending, G = this.gone, ids = Object.keys(P);
    if (!ids.length && !G.size) return b;
    b.peserta = b.peserta.filter((p) => !P[p.ID_Peserta] && !G.has(p.ID_Peserta)).concat(ids.map((id) => P[id]));
    return b;
  },
  loadCache() {
    const c = Store.get(userKey('boot'), null);
    if (c && c.data) {
      if (c.data.peserta) c.data.peserta = c.data.peserta.filter((p) => !p._pending);   // sisa kiriman yang terputus
      AppState.data = c.data; AppState.lastSync = c.t; AppState.rev++; return true;
    }
    return false;
  },
  apply(boot) {
    const h = hashStr(JSON.stringify(boot));
    const prev = Store.get(userKey('boot'), null);
    Store.set(userKey('boot'), { t: Date.now(), h, data: boot });
    AppState.lastSync = Date.now();
    if (!prev || prev.h !== h || !AppState.data) { AppState.data = this.overlay(boot); AppState.rev++; Router.refresh(); }
    if (window.Layout) Layout.update();
    return true;
  },
  /** Ubah data lokal seketika (optimistic) lalu simpan ke cache perangkat. */
  mutate(fn) {
    fn(AppState.data);
    AppState.rev++;
    Router.refresh(); if (window.Layout) Layout.update();        // tampilan diperbarui lebih dulu…
    this.persist();                                              // …penyimpanan ke perangkat menyusul saat senggang
  },
  persist() {
    clearTimeout(this._pt);
    this._pt = setTimeout(() => {
      const run = () => Store.set(userKey('boot'), { t: AppState.lastSync, h: 'local', data: AppState.data });
      window.requestIdleCallback ? requestIdleCallback(run, { timeout: 1500 }) : run();
    }, 0);
  },
  /**
   * Perubahan instan (optimistic): layar berubah seketika, server dikonfirmasi di latar.
   * o = { apply(d), undo(d), action, data, ok: 'pesan sukses', hide: [koleksi, kolomKunci, id] }
   */
  async quick(o) {
    const h = o.hide;
    if (h) (this.hidden[h[0]] = this.hidden[h[0]] || new Map()).set(h[2], h[1]);
    this.mutate(o.apply);
    if (o.ok) toast(o.ok, 'success');
    const res = await api(o.action, o.data);
    if (h) this.hidden[h[0]].delete(h[2]);
    if (!res.success) { this.mutate(o.undo); toast(res.message, 'error', 'Perubahan dibatalkan'); }
    return res;
  },
  hidden: {},           // koleksi → Map(id → kolom kunci): data yang sedang dihapus (master)
  async sync(force) {
    if (AppState.syncing) return { success: true, busy: true };
    if (!force && AppState.data && Date.now() - AppState.lastSync < this.FRESH) return { success: true, cached: true };
    AppState.syncing = true; if (window.Layout) Layout.syncPill();
    const res = await api('bootstrap', {});
    AppState.syncing = false;
    if (res.success) this.apply(res.data);
    if (window.Layout) Layout.syncPill();
    return res;
  }
};

// ─── Router hash SPA — halaman dibuat sekali & disembunyikan, tidak dibuang ──
const Pages = {};
function registerPage(name, def) { Pages[name] = Object.assign({ admin: false, live: true }, def); }
const Router = {
  cur: '', param: '',
  go(name, param) { const h = '#/' + name + (param ? '/' + encodeURIComponent(param) : ''); if (location.hash === h) this.route(); else location.hash = h; },
  parse() { const p = location.hash.replace(/^#\/?/, '').split('/'); return { name: p[0] || '', param: p[1] ? decodeURIComponent(p[1]) : '' }; },
  route() {
    if (!AppState.data) return;
    let { name, param } = this.parse();
    const admin = isAdmin();
    if (!Pages[name] || (Pages[name].admin && !admin) || (Pages[name].petugas && admin)) { name = 'beranda'; param = ''; if (location.hash !== '#/beranda') history.replaceState(null, '', '#/beranda'); }
    const def = Pages[name];
    const host = $('#pages');
    let el = $('.page[data-page="' + name + '"]', host);
    const fresh = !el;
    if (!el) { el = document.createElement('section'); el.className = 'page'; el.dataset.page = name; host.appendChild(el); }
    $$('.page', host).forEach((p) => { p.hidden = p !== el; });
    const changed = this.cur !== name || this.param !== param;
    this.cur = name; this.param = param;
    if (fresh || changed || el._rev !== AppState.rev) { def.render(el, param, { fresh, changed }); el._rev = AppState.rev; }
    if (changed) { window.scrollTo(0, 0); if (def.onShow) def.onShow(el, param); }
    if (changed || fresh) Motion.enter(el);
    Layout.setActive(name, def); Layout.update();
    Layout.closeNav();
  },
  /** Data berubah → render ulang halaman aktif (kecuali halaman form yang sedang diisi). */
  refresh() {
    const def = Pages[this.cur]; const el = this.cur && $('.page[data-page="' + this.cur + '"]');
    if (!def || !el) return;
    if (def.live) { def.render(el, this.param, { fresh: false, changed: false }); el._rev = AppState.rev; }
    else if (def.onData) def.onData(el);
  }
};
addEventListener('hashchange', () => Router.route());

// ─── Animasi halus (elegan, singkat, tidak menahan interaksi) ───────────────
const Motion = {
  reduce: matchMedia('(prefers-reduced-motion: reduce)'),
  off() { return this.reduce.matches; },
  /** Halaman tampil: elemen masuk bertahap + angka statistik menghitung naik. Hanya saat pindah menu. */
  enter(el) {
    if (this.off() || !el) return;
    el.classList.remove('pg-in'); void el.offsetWidth; el.classList.add('pg-in');
    clearTimeout(el._pgT); el._pgT = setTimeout(() => el.classList.remove('pg-in'), 1100);
    requestAnimationFrame(() => this.count(el));
  },
  /** Hitung naik untuk angka di kartu statistik (mis. 128, 12 / 31, 85%). */
  count(root) {
    $$('.stat .big, .def-card .n', root).forEach((b) => {
      const node = Array.from(b.childNodes).find((n) => n.nodeType === 3 && /\d/.test(n.nodeValue));
      if (!node || node._counting) return;
      const m = node.nodeValue.match(/^(\D*)(\d[\d.]*)(.*)$/s); if (!m) return;
      const target = parseInt(m[2].replace(/\./g, ''), 10); if (!target || target > 1e7) return;
      const t0 = performance.now(), dur = Math.min(900, 380 + target * 6);
      node._counting = true;
      const step = (t) => {
        const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3);
        node.nodeValue = m[1] + Math.round(target * e).toLocaleString('id-ID') + m[3];
        if (k < 1 && node.isConnected) requestAnimationFrame(step); else { node.nodeValue = m[1] + m[2] + m[3]; node._counting = false; }
      };
      requestAnimationFrame(step);
    });
  },
  /** Masuk aplikasi pertama kali setelah login. */
  boot() {
    if (this.off()) return;
    const app = $('.app'); if (!app) return;
    app.classList.add('app-in'); setTimeout(() => app.classList.remove('app-in'), 1200);
  }
};

// ─── UI: toast, modal, konfirmasi ────────────────────────────────────────────
function toast(message, type, title) {
  type = type || 'success';
  const icon = { success: 'check-circle', error: 'alert-circle', warn: 'alert-triangle', info: 'info' }[type];
  const host = $('#toasts');
  const el = document.createElement('div');
  el.className = 'toast ' + type; el.setAttribute('role', type === 'error' ? 'alert' : 'status');
  el.innerHTML = ic(icon) + '<div>' + (title ? '<b>' + esc(title) + '</b>' : '') + esc(message) + '</div>';
  host.appendChild(el);
  setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 320); }, type === 'error' ? 6500 : 3800);
}
function modal(o) {
  const bg = document.createElement('div');
  bg.className = 'modal-bg';
  bg.innerHTML = '<div class="modal ' + (o.cls || '') + '" role="dialog" aria-modal="true">' +
    '<div class="modal-h">' + (o.icon ? '<div class="ico ' + (o.iconCls || '') + '">' + ic(o.icon) + '</div>' : '') + '<h3>' + esc(o.title || '') + '</h3>' +
    '<button class="btn btn-ghost btn-icon" data-x aria-label="Tutup">' + ic('x') + '</button></div>' +
    '<div class="modal-b ' + (o.bodyCls || '') + '">' + (o.body || '') + '</div>' + (o.foot ? '<div class="modal-f">' + o.foot + '</div>' : '') + '</div>';
  const close = () => { bg.remove(); document.removeEventListener('keydown', onKey); if (o.onClose) o.onClose(); };
  const onKey = (e) => { if (e.key === 'Escape' && !bg._busy) close(); };
  bg.addEventListener('mousedown', (e) => { if (e.target === bg && !bg._busy && !o.sticky) close(); });
  $$('[data-x]', bg).forEach((b) => b.addEventListener('click', () => { if (!bg._busy) close(); }));
  document.addEventListener('keydown', onKey);
  document.body.appendChild(bg);
  const m = { el: bg, close, busy(v) { bg._busy = v; } };
  if (o.onMount) o.onMount(bg, m);
  const f = $('input:not([type=hidden]):not([readonly]), select, textarea', $('.modal-b', bg));
  if (f && !o.noFocus) setTimeout(() => f.focus(), 30);
  return m;
}
function confirmDlg(o) {
  return new Promise((resolve) => {
    let done = false;
    const m = modal({
      title: o.title || 'Konfirmasi', icon: o.danger ? 'alert-triangle' : 'info', iconCls: o.danger ? 'red' : '', cls: 'sm' + (o.danger ? ' danger' : ''),
      body: '<div style="font-size:14.5px;color:var(--ink-2)">' + o.message + '</div>', noFocus: true,
      foot: '<button class="btn" data-x>Batal</button><button class="btn ' + (o.danger ? 'btn-danger' : 'btn-navy') + '" data-ok>' + esc(o.okText || 'Ya, lanjutkan') + '</button>',
      onClose: () => { if (!done) resolve(false); }
    });
    const ok = $('[data-ok]', m.el); ok.focus();
    ok.addEventListener('click', () => { done = true; m.close(); resolve(true); });
  });
}
/** Tombol dengan status proses; mengembalikan fungsi untuk memulihkan. */
function busyBtn(btn, text) {
  if (!btn) return () => {};
  const html = btn.innerHTML, w = btn.offsetWidth;
  btn.disabled = true; btn.style.minWidth = w + 'px';
  btn.innerHTML = '<span class="spin"></span>' + (text ? '<span>' + esc(text) + '</span>' : '');
  return () => { btn.disabled = false; btn.innerHTML = html; btn.style.minWidth = ''; };
}

// ─── Utilitas ────────────────────────────────────────────────────────────────
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function isAdmin() { return !!(AppState.data && AppState.data.me.peran === 'Admin Induk'); }
function debounce(fn, ms) { let t; return function () { const a = arguments; clearTimeout(t); t = setTimeout(() => fn.apply(this, a), ms); }; }
const BLN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const BLN_L = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
/** Tanggal (yyyy-MM-dd atau ISO) → bagian tanggal di zona WIT. */
function witParts(v) {
  if (!v) return null;
  let d;
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) { const p = v.split('-'); return { y: +p[0], m: +p[1], d: +p[2], H: 0, M: 0 }; }
  d = new Date(v); if (isNaN(d)) return null;
  const w = new Date(d.getTime() + 9 * 3600e3);                       // WIT = UTC+9
  return { y: w.getUTCFullYear(), m: w.getUTCMonth() + 1, d: w.getUTCDate(), H: w.getUTCHours(), M: w.getUTCMinutes() };
}
function fmtTgl(v, long) { const p = witParts(v); return p ? p.d + ' ' + (long ? BLN_L : BLN)[p.m - 1] + ' ' + p.y : '-'; }
function fmtWaktu(v) { const p = witParts(v); return p ? p.d + ' ' + BLN[p.m - 1] + ' ' + String(p.H).padStart(2, '0') + ':' + String(p.M).padStart(2, '0') : '-'; }
function fmtSize(b) { return b > 1048576 ? (b / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB'; }
function initials(n) { return String(n || '?').replace(/,.*$/, '').split(/\s+/).filter((w) => /^[A-Za-z]/.test(w)).slice(-2).map((w) => w[0]).join('').toUpperCase() || '?'; }
function pct(a, b) { return b ? Math.round((a / b) * 1000) / 10 : 0; }
function plural(n, s) { return n + ' ' + s; }
function b64ToBlob(b64, mime) {
  const bin = atob(b64), arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type: mime });
}
function downloadBlob(blob, name) {
  const url = URL.createObjectURL(blob), a = document.createElement('a');
  a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
function toCsv(rows, headers) {
  // Anti "CSV injection": teks diawali = + - @ (atau tab/CR) tidak boleh dijalankan Excel sebagai rumus saat CSV dibuka
  const q = (v) => { let s = String(v == null ? '' : v); if (typeof v === 'string' && /^[=+\-@\t\r]/.test(s)) s = "'" + s; return /[",\n;]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  return '﻿' + [headers.map((h) => q(h.label)).join(',')].concat(rows.map((r) => headers.map((h) => q(typeof h.get === 'function' ? h.get(r) : r[h.get])).join(','))).join('\r\n');
}
function downloadCsv(rows, headers, name) { downloadBlob(new Blob([toCsv(rows, headers)], { type: 'text/csv;charset=utf-8' }), name); }
/** Parser CSV sederhana (mendukung kutip, koma/titik koma). */
function parseCsv(text) {
  text = text.replace(/^﻿/, '');
  const first = text.split(/\r?\n/)[0] || '';
  const sep = (first.match(/;/g) || []).length > (first.match(/,/g) || []).length ? ';' : ',';
  const rows = []; let row = [], cur = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; }
    else if (c === '"') q = true;
    else if (c === sep) { row.push(cur); cur = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cur); rows.push(row); row = []; cur = ''; }
    else cur += c;
  }
  if (cur || row.length) { row.push(cur); rows.push(row); }
  const clean = rows.filter((r) => r.join('').trim() !== '');
  if (!clean.length) return [];
  const h = clean[0].map((x) => x.trim());
  return clean.slice(1).map((r) => { const o = {}; h.forEach((k, i) => { if (k) o[k] = (r[i] || '').trim(); }); return o; });
}
function readFileB64(file) {
  return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1]); r.onerror = () => rej(r.error); r.readAsDataURL(file); });
}
/** Pager sederhana → HTML tombol halaman. */
// ─── Tampilan pas layar (tanpa gulir) ────────────────────────────────────────
/** Mode "pas layar" aktif di laptop/desktop/tablet mendatar; di HP halaman tetap bergulir normal. */
const Fit = {
  mq: matchMedia('(min-width: 1024px) and (min-height: 560px)'),
  on() { return this.mq.matches; },
  /** Jumlah baris tabel yang muat di area .tbl-wrap tanpa digulir (diukur dari baris yang sedang tampil). */
  rows(wrap, fallback) {
    if (!this.on() || !wrap || !wrap.clientHeight) return fallback || 10;
    const H = wrap.clientHeight, top = wrap.getBoundingClientRect().top;
    const trs = $$('tbody tr', wrap).filter((r) => !r.hidden && !(r.querySelector('td[colspan]') && !r.classList.contains('grp')));
    const thH = ($('thead', wrap) || { getBoundingClientRect: () => ({ height: 0 }) }).getBoundingClientRect().height;
    if (!trs.length) return Math.max(3, Math.floor((H - thH - 2) / (wrap._rh || 46)));
    let fit = 0, maxH = 0;
    for (const tr of trs) { const r = tr.getBoundingClientRect(); maxH = Math.max(maxH, r.height); if (r.bottom - top <= H + 0.5) fit++; else break; }
    wrap._rh = Math.max(30, maxH);
    if (fit < trs.length) return Math.max(3, fit);
    const used = trs[trs.length - 1].getBoundingClientRect().bottom - top;
    return Math.max(3, fit + Math.floor((H - used - 1) / wrap._rh));
  },
  /** Panggil cb setiap kali tinggi elemen berubah (ubah ukuran jendela, filter bertambah, dsb.). */
  watch(el, cb) {
    if (!el || el._fitObs || !window.ResizeObserver) return;
    let h = -1, t = 0;
    el._fitObs = new ResizeObserver((en) => {
      const nh = Math.round(en[0].contentRect.height); if (Math.abs(nh - h) < 4) return; h = nh;
      cancelAnimationFrame(t); t = requestAnimationFrame(() => { if (el.isConnected && el.offsetParent) cb(); });
    });
    el._fitObs.observe(el);
  }
};
if (Fit.mq.addEventListener) Fit.mq.addEventListener('change', () => { AppState.rev++; Router.refresh(); });

/**
 * Pager otomatis untuk tabel yang barisnya sudah dirender lengkap: menampilkan baris sebanyak yang muat
 * di layar, sisanya lewat tombol halaman. Dipasang sekali per kartu; mengikuti perubahan isi & ukuran.
 */
const AutoPager = {
  /** opt.box: wadah yang dibatasi tingginya (default .tbl-wrap) · opt.items: butir yang dipaginasi (default baris tbody) */
  attach(card, opt) {
    if (!card) return;
    if (card._ap) { this.apply(card); return; }
    opt = opt || {};
    const box = $(opt.box || '.tbl-wrap', card); if (!box) return;
    const list = opt.items ? box : $('tbody', box); if (!list) return;
    card._ap = { page: 1, per: opt.per || 10, box, list, sel: opt.items || '', min: opt.items ? 1 : 3 };
    let foot = $('.card-f[data-apf]', card);
    if (!foot) { foot = document.createElement('div'); foot.className = 'card-f'; foot.dataset.apf = '1'; foot.innerHTML = '<span class="foot-info" data-api></span><div class="pager" data-app></div>'; box.after(foot); }
    foot.addEventListener('click', (e) => { const b = e.target.closest('[data-pg]'); if (b && !b.disabled) { card._ap.page = +b.dataset.pg; this.apply(card); } });
    // Isi berubah: jumlah butir berbeda (filter/cari) → kembali ke halaman 1; sinkron biasa → tetap di halaman yang sama
    card._ap.n = this.items(card).length;
    new MutationObserver(() => { const n = this.items(card).length; if (n !== card._ap.n) { card._ap.page = 1; card._ap.n = n; } this.apply(card); }).observe(list, { childList: true, subtree: !!opt.items });
    Fit.watch(box, () => this.apply(card));
    this.apply(card);
  },
  items(card) {
    const st = card._ap;
    if (st.sel) return $$(st.sel, st.box);
    return Array.from(st.list.rows).filter((r) => !r.querySelector('td[colspan]') || r.classList.contains('grp'));
  },
  apply(card) {
    const st = card._ap; if (!st || !st.box.isConnected) return;
    const box = st.box, data = this.items(card);
    if (!st.sel) Array.from(st.list.rows).forEach((r) => { r.hidden = false; });
    let per = st.per;
    if (Fit.on() && box.clientHeight) {
      // ukur dari awal halaman yang sedang dibuka: berapa butir yang muat tanpa gulir
      const start = Math.min((st.page - 1) * (st.fitPer || st.per), Math.max(0, data.length - 1));
      data.forEach((r, i) => { r.hidden = i < start; });
      if (st.sel) {
        const top = box.getBoundingClientRect().top, H = box.clientHeight;
        let fit = 0, maxH = 0;
        for (const it of data.slice(start)) { const r = it.getBoundingClientRect(); maxH = Math.max(maxH, r.height); if (r.bottom - top <= H + 0.5) fit++; else break; }
        per = Math.max(st.min, fit);
      } else per = Fit.rows(box, st.per);
      st.fitPer = per;
    }
    let pages;
    const slice = () => { pages = Math.max(1, Math.ceil(data.length / per)); st.page = Math.min(st.page, pages); data.forEach((r, i) => { r.hidden = !(i >= (st.page - 1) * per && i < st.page * per); }); };
    slice();
    // pengaman: butir setinggi tak biasa → kurangi jumlah per halaman sampai benar-benar pas
    while (Fit.on() && per > st.min && box.scrollHeight > box.clientHeight + 1) { per--; st.fitPer = per; slice(); }
    const info = $('[data-api]', card), pg = $('[data-app]', card);
    if (info) info.innerHTML = data.length ? 'Menampilkan <b>' + ((st.page - 1) * per + 1) + '–' + Math.min(data.length, st.page * per) + '</b> dari <b>' + data.length + '</b>' : '';
    if (pg) pg.innerHTML = pagerHtml(st.page, pages);
    const f = $('.card-f[data-apf]', card); if (f) f.hidden = pages <= 1;
  }
};

function pagerHtml(page, pages) {
  if (pages <= 1) return '';
  const btn = (p, label, dis, on) => '<button data-pg="' + p + '"' + (dis ? ' disabled' : '') + (on ? ' class="on"' : '') + '>' + label + '</button>';
  let h = btn(page - 1, '‹', page <= 1);
  const show = new Set([1, pages, page - 1, page, page + 1].filter((p) => p >= 1 && p <= pages));
  let last = 0;
  Array.from(show).sort((a, b) => a - b).forEach((p) => { if (p - last > 1) h += '<span class="gap">…</span>'; h += btn(p, p, false, p === page); last = p; });
  return h + btn(page + 1, '›', page >= pages);
}
/** Lihat PDF (berkas pribadi di Drive) — hanya lewat aplikasi, setelah server cek hak akses. */
const PdfCache = {};
/** Ambil berkas pribadi (PDF/JPG) dari server sekali, lalu simpan sebagai URL blob di memori. */
async function fetchFile(fileId) {
  if (PdfCache[fileId]) return PdfCache[fileId];
  const res = await api('getBerkas', { fileId });
  if (!res.success) return { ok: false, message: res.message };
  const mime = res.data.mime || 'application/pdf';
  return (PdfCache[fileId] = { ok: true, url: URL.createObjectURL(b64ToBlob(res.data.base64, mime)), name: res.data.name, isImg: /^image\//.test(mime) });
}
async function viewPdf(fileId, title, localFile) {
  const m = modal({ title: title || 'Pratinjau Berkas', icon: 'file-text', cls: 'pdf', bodyCls: 'np', noFocus: true,
    body: '<div style="display:grid;place-items:center;height:100%;color:var(--muted);gap:10px"><div style="display:flex;gap:10px;align-items:center"><span class="spin"></span> Memuat berkas aman dari server…</div></div>',
    foot: '<span class="hint" style="margin-right:auto">Berkas hanya dapat dibuka melalui SI-PRO</span><button class="btn" data-dl disabled>' + ic('download') + 'Unduh</button><button class="btn btn-navy" data-x>Tutup</button>' });
  let url, name, isImg;
  if (localFile) { url = URL.createObjectURL(localFile); name = localFile.name || 'foto.jpg'; isImg = /^image\//.test(localFile.type); }
  else {
    const r = await fetchFile(fileId);
    if (!document.body.contains(m.el)) return;
    if (!r.ok) { $('.modal-b', m.el).innerHTML = '<div class="empty">' + ic('file-x') + '<b>Berkas tidak dapat dibuka</b>' + esc(r.message) + '</div>'; return; }
    url = r.url; name = r.name; isImg = r.isImg;
  }
  $('.modal-b', m.el).innerHTML = isImg ? '<div class="img-view"><img src="' + url + '" alt="Foto"></div>' : '<iframe title="Pratinjau PDF" src="' + url + '#view=FitH"></iframe>';
  const dl = $('[data-dl]', m.el); dl.disabled = false;
  dl.addEventListener('click', () => { const a = document.createElement('a'); a.href = url; a.download = name || (isImg ? 'foto.jpg' : 'berkas.pdf'); a.click(); });
}

/* ─── Foto profil 4×6 (JPG/JPEG) — Admin & Petugas ───────────────────────── */
/** Validasi JPG, potong tengah ke rasio 4×6 (2:3), buat versi penuh (±472×709 px) + thumbnail kecil untuk avatar. */
async function prosesFoto4x6(file) {
  if (!/\.jpe?g$/i.test(file.name) || (file.type && file.type !== 'image/jpeg')) throw new Error('Foto harus berformat JPG atau JPEG.');
  if (file.size > 10 * 1024 * 1024) throw new Error('Ukuran foto melebihi 10 MB.');
  const head = new Uint8Array(await file.slice(0, 3).arrayBuffer());
  if (!(head[0] === 0xFF && head[1] === 0xD8 && head[2] === 0xFF)) throw new Error('Isi berkas bukan foto JPG yang valid.');
  const img = await new Promise((res, rej) => { const u = URL.createObjectURL(file), i = new Image(); i.onload = () => { URL.revokeObjectURL(u); res(i); }; i.onerror = () => { URL.revokeObjectURL(u); rej(new Error('Foto tidak dapat dibaca.')); }; i.src = u; });
  const W = img.naturalWidth, H = img.naturalHeight, target = 2 / 3;
  if (Math.min(W, H) < 200) throw new Error('Resolusi foto terlalu kecil (' + W + '×' + H + ' px).');
  let sw = W, sh = H, sx = 0, sy = 0;
  if (W / H > target) { sw = Math.round(H * target); sx = Math.round((W - sw) / 2); } else { sh = Math.round(W / target); sy = Math.round((H - sh) / 2); }
  const draw = (ow) => { const oh = Math.round(ow / target), c = document.createElement('canvas'); c.width = ow; c.height = oh; const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, ow, oh); g.imageSmoothingQuality = 'high'; g.drawImage(img, sx, sy, sw, sh, 0, 0, ow, oh); return c; };
  const full = draw(Math.min(472, sw));
  const blob = await new Promise((res) => full.toBlob(res, 'image/jpeg', 0.9));
  const thumb = draw(96).toDataURL('image/jpeg', 0.8);
  return { blob, thumb, cropped: Math.abs(W / H - target) > 0.03 };
}

/** Modal foto profil. u = null → akun sendiri; objek pengguna → (Admin) akun petugas lain. */
function fotoProfilModal(u) {
  const me = AppState.data.me, self = !u || u.ID_Pengguna === me.id;
  const id = self ? me.id : u.ID_Pengguna, nama = self ? me.nama : u.Nama;
  let cur = self ? me.foto : (window.MasterPg && MasterPg.thumbs ? MasterPg.thumbs[id] || '' : '');
  const m = modal({ title: 'Foto Profil' + (self ? '' : ' — ' + nama), icon: 'users', cls: 'sm', noFocus: true,
    body: '<div class="foto-slot"><div class="foto-box" data-box></div><div class="hint" style="margin-top:10px">JPG / JPEG · ukuran 4×6 (otomatis dipotong)<br>Disarankan latar merah/biru, wajah menghadap depan</div></div>' +
      '<input type="file" accept="image/jpeg,.jpg,.jpeg" hidden data-file>',
    foot: '<button class="btn act-del" data-del>' + ic('trash') + 'Hapus</button><button class="btn btn-navy" data-pick>' + ic('upload') + 'Pilih Foto JPG</button><button class="btn" data-x>Tutup</button>' });
  const box = $('[data-box]', m.el), inp = $('[data-file]', m.el);
  const show = (busy) => {
    box.className = 'foto-box' + (cur ? ' has' : '');
    box.innerHTML = (cur ? '<img src="' + cur + '" alt="Foto profil">' : '<div>' + ic('users') + '<div><b style="color:var(--ink-2)">Belum ada foto</b></div></div>') + (busy ? '<div class="busy"><span class="spin" style="color:var(--blue)"></span></div>' : '');
    $('[data-del]', m.el).hidden = !cur;
  };
  show();
  const apply = (thumb) => {
    if (window.MasterPg && MasterPg.thumbs) { if (thumb) MasterPg.thumbs[id] = thumb; else delete MasterPg.thumbs[id]; }
    Data.mutate((d) => {
      if (self) d.me.foto = thumb;
      const pu = (d.pengguna || []).find((x) => x.ID_Pengguna === id); if (pu) pu.Ada_Foto = !!thumb;
    });
  };
  $('[data-pick]', m.el).addEventListener('click', () => inp.click());
  box.addEventListener('click', () => { if (!cur) inp.click(); });
  inp.addEventListener('change', async () => {
    const f = inp.files[0]; inp.value = ''; if (!f) return;
    let out;
    try { out = await prosesFoto4x6(f); } catch (e) { return toast(e.message, 'error', 'Foto ditolak'); }
    const prev = cur; cur = out.thumb; show(true); m.busy(true);
    const res = await api('uploadFotoProfil', { ID_Pengguna: self ? '' : id, base64: await readFileB64(out.blob), thumb: out.thumb });
    m.busy(false);
    if (!res.success) { cur = prev; show(); return toast(res.message, 'error'); }
    show(); apply(out.thumb);
    toast(res.message + (out.cropped ? ' Foto dipotong otomatis ke rasio 4×6.' : ''), 'success');
  });
  $('[data-del]', m.el).addEventListener('click', async (e) => {
    if (!(await confirmDlg({ title: 'Hapus foto profil?', message: 'Foto profil ' + esc(nama) + ' akan dihapus.', okText: 'Hapus', danger: true }))) return;
    const res = await api('hapusFotoProfil', { ID_Pengguna: self ? '' : id });
    if (!res.success) return toast(res.message, 'error');
    cur = ''; show(); apply(''); toast(res.message);
  });
}
