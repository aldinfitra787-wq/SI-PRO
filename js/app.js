/* =========================================================================
   SI-PRO — Kerangka aplikasi (sidebar, topbar) & inisialisasi
   ========================================================================= */
'use strict';
const NAV = [
  { p: 'beranda', t: 'Beranda', i: 'layout-grid' },
  { p: 'pengumuman', t: 'Pengumuman', i: 'megaphone' },
  { p: 'input', t: 'Input Peserta', i: 'user-plus', petugas: true },
  { p: 'peserta', t: 'Data Peserta', i: 'folder-open' },
  { p: 'rekap', t: 'Rekapitulasi', i: 'chart', admin: true },
  { p: 'belum', t: 'Belum Mengirim', i: 'clipboard-x', admin: true },
  { p: 'laporan', t: 'Cetak Laporan', i: 'printer' },
  { div: true },
  { p: 'pangkalan', t: 'Pangkalan Data Diklat', i: 'library', admin: true },
  { p: 'master', t: 'Kelola Master', i: 'database', admin: true }
];

const Layout = {
  render() {
    const me = AppState.data.me, admin = isAdmin();
    $('#root').innerHTML =
      '<div class="app" id="app">' +
      '<aside class="sb" aria-label="Menu utama">' +
      '<div class="sb-brand"><div class="sb-logo img"><img src="img/logo-96.png" alt="Logo"></div><div><b>SI-PRO</b></div></div>' +
      '<div class="sb-sec">MODUL UTAMA<span class="tag">' + (admin ? 'ADMIN' : 'SATKER') + '</span></div>' +
      '<nav class="sb-nav">' + NAV.filter((n) => (!n.admin || admin) && (!n.petugas || !admin)).map((n) => n.div ? '<div class="sb-div"></div>' :
        '<a href="#/' + n.p + '" data-nav="' + n.p + '" title="' + n.t + '">' + ic(n.i) + '<span>' + n.t + '</span>' + (n.p === 'belum' ? '<span class="cnt" id="navBelum" hidden></span><span class="adm" id="navBelumAdm">ADM</span>' : '') + (n.p === 'pengumuman' ? '<span class="cnt" id="navPgm" hidden></span>' : '') + (n.admin && n.p !== 'belum' ? '<span class="adm">ADM</span>' : '') + '</a>').join('') + '</nav>' +
      '</aside><div class="sb-backdrop" data-close-nav></div>' +
      '<div class="main">' +
      '<header class="top"><button class="btn btn-ghost btn-icon burger" id="burger" aria-label="Buka menu">' + ic('menu') + '</button>' +
      '<div class="top-r">' +
      '<div class="who"><div class="nm"><b>' + esc(me.nama) + '</b><small>' + esc(me.nrp ? 'NRP. ' + me.nrp : (admin ? 'Admin Induk' : me.namaSatker)) + '</small></div>' +
      '<span class="role ' + (admin ? '' : 'petugas') + '">ROLE: ' + (admin ? 'ADMIN INDUK' : 'PETUGAS SATKER') + '</span>' +
      '<button class="avatar" id="avatarBtn" aria-label="Menu akun"></button></div></div></header>' +
      '<div id="netBanner"></div>' +
      '<main class="content" id="pages"></main></div></div><div class="toasts" id="toasts"></div>';
    $('#burger').addEventListener('click', () => $('#app').classList.toggle('nav-open'));
    $('[data-close-nav]').addEventListener('click', () => this.closeNav());
    $('#avatarBtn').addEventListener('click', (e) => { e.stopPropagation(); this.userMenu(); });
    this.avatar(); this.update(); this.syncPill(); Motion.boot();
  },
  /** Avatar = foto profil (bila ada) atau inisial nama. */
  avatar() {
    const b = $('#avatarBtn'); if (!b || !AppState.data) return;
    const me = AppState.data.me;
    b.innerHTML = me.foto ? '<img src="' + me.foto + '" alt="Foto profil">' : esc(initials(me.nama));
  },
  userMenu() {
    if ($('.menu-pop')) { $('.menu-pop').remove(); return; }
    const me = AppState.data.me;
    const el = document.createElement('div');
    el.className = 'menu-pop';
    el.innerHTML = '<div class="hd"><b>' + esc(me.nama) + '</b><small class="mono">@' + esc(me.username) + '</small><small>' + esc(me.peran + (me.namaSatker ? ' · ' + me.namaSatker : '')) + '</small></div>' +
      '<button data-a="foto">' + ic('users') + 'Foto profil</button><button data-a="sync">' + ic('refresh') + 'Sinkronkan data</button><button data-a="pwd">' + ic('lock') + 'Ganti password</button><button data-a="out">' + ic('log-out') + 'Keluar</button>';
    document.body.appendChild(el);
    const off = (e) => { if (!el.contains(e.target)) { el.remove(); document.removeEventListener('click', off); } };
    setTimeout(() => document.addEventListener('click', off), 0);
    el.addEventListener('click', async (e) => {
      const a = e.target.closest('[data-a]'); if (!a) return;
      el.remove();
      if (a.dataset.a === 'out') { if (await confirmDlg({ title: 'Keluar dari SI-PRO?', message: 'Salinan data di perangkat ini akan dihapus. Anda perlu masuk kembali dengan username &amp; password.', okText: 'Keluar' })) Auth.logout(); }
      else if (a.dataset.a === 'pwd') Auth.changeModal();
      else if (a.dataset.a === 'foto') fotoProfilModal(null);
      else { const r = await Data.sync(true); toast(r.success ? 'Data tersinkron dengan server.' : r.message, r.success ? 'info' : 'error'); }
    });
  },
  setActive(name, def) {
    $$('.sb-nav a').forEach((a) => a.classList.toggle('on', a.dataset.nav === name));
    document.title = (def.title || 'SI-PRO') + ' — SI-PRO';
  },
  closeNav() { const a = $('#app'); if (a) a.classList.remove('nav-open'); },
  update() {
    if (!$('#app') || !AppState.data) return;
    this.avatar();
    if (isAdmin()) {
      const pid = D.defaultPel(), pl = D.pel(pid);
      const n = pl && pl.Status === 'Aktif' ? D.belum(pid).length : 0;
      const b = $('#navBelum'), ba = $('#navBelumAdm'); if (ba) ba.hidden = !!n; if (b) { b.hidden = !n; b.textContent = n; b.title = n + ' Satker belum mengirim (' + D.pelNama(D.defaultPel()) + ')'; }
    }
    const np = $('#navPgm'); if (np && window.PgmSeen) { const n = isAdmin() ? 0 : PgmSeen.baru().length; np.hidden = !n; np.textContent = n; np.title = n + ' pengumuman baru'; }
    const s = $('#dbSync'); if (s) s.textContent = AppState.lastSync ? 'SYNC ' + fmtWaktu(new Date(AppState.lastSync).toISOString()).split(' ').pop() : '—';
  },
  syncPill() {
    const p = $('#syncPill'); if (!p) return;
    const st = $('#dbSt');
    if (AppState.syncing) { p.className = 'sync busy'; p.innerHTML = '<span class="spin"></span><span class="t">SINKRONISASI…</span>'; }
    else if (!AppState.online) { p.className = 'sync off'; p.innerHTML = ic('wifi-off') + '<span class="t">OFFLINE · DATA LOKAL</span>'; }
    else { p.className = 'sync'; p.innerHTML = '<span class="dot"></span><span class="t">SYS.ACT: TERSINKRON</span>'; }
    if (st) { st.className = AppState.online ? 'on' : 'off'; st.innerHTML = '<span class="dot"></span>' + (AppState.online ? 'ONLINE' : 'OFFLINE'); }
    const nb = $('#netBanner');
    if (nb) nb.innerHTML = AppState.online ? '' : '<div class="net-banner">' + ic('wifi-off') + 'Koneksi ke server terputus. Anda melihat data terakhir yang tersimpan di perangkat. Perubahan akan dikirim setelah koneksi pulih.</div>';
    this.update();
  }
};
window.Layout = Layout;

const App = {
  pollMs: 90000, pollTimer: null, hiddenAt: 0,
  start() {
    Layout.render();
    if (!location.hash || location.hash === '#' || location.hash === '#/') history.replaceState(null, '', '#/beranda');
    Router.cur = ''; Router.route();
    this.schedulePoll();
  },
  /** Sinkron latar: hanya saat tab terlihat; jeda memanjang bila tidak ada perubahan (Prinsip 10). */
  schedulePoll() {
    clearTimeout(this.pollTimer);
    this.pollTimer = setTimeout(async () => {
      if (AppState.token && document.visibilityState === 'visible') {
        const before = AppState.rev; await Data.sync(false);
        this.pollMs = AppState.rev === before ? Math.min(this.pollMs * 1.5, 300000) : 90000;
      }
      this.schedulePoll();
    }, this.pollMs);
  },
  async boot() {
    warmUpServer();
    if (!Auth.restore()) return Auth.renderLogin();
    if (Data.loadCache()) {                       // tampil instan dari cache perangkat
      this.start();
      Data.sync(false);
      return;
    }
    $('#root').innerHTML = '<div class="boot-err"><span class="spin" style="width:28px;height:28px;color:var(--blue)"></span><p class="lbl" style="margin-top:14px">MEMUAT DATA SI-PRO…</p></div><div class="toasts" id="toasts"></div>';
    const res = await Data.sync(true);
    if (res.success) return this.start();
    if (!AppState.token) return;                  // sudah dialihkan ke login (sesi berakhir)
    $('#root').innerHTML = '<div class="boot-err">' + ic('wifi-off') + '<h2>Tidak dapat memuat data</h2><p class="muted">' + esc(res.message) + '</p>' +
      '<p><button class="btn btn-navy" id="retryBoot">' + ic('refresh') + 'Coba lagi</button> <button class="btn" id="outBoot">Keluar</button></p></div><div class="toasts" id="toasts"></div>';
    $('#retryBoot').onclick = () => this.boot();
    $('#outBoot').onclick = () => Auth.logout();
  }
};

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') App.hiddenAt = Date.now();
  else if (AppState.token && App.hiddenAt && Date.now() - App.hiddenAt > 120000) { warmUpServer(); Data.sync(false); }
});
addEventListener('online', () => { setOnline(true); if (AppState.token) Data.sync(true); });
addEventListener('offline', () => setOnline(false));
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k' && AppState.data) { e.preventDefault(); Router.go('peserta'); setTimeout(() => { const s = $('#pSearch'); if (s) s.focus(); }, 30); }
});
document.addEventListener('DOMContentLoaded', () => App.boot());
