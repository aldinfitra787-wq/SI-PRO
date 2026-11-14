/* =========================================================================
   SI-PRO — Login dengan USERNAME + PASSWORD
   Alur: username & password → server cek hash (HMAC-SHA256 + salt) di sheet Pengguna
         → token sesi HMAC + data layar pertama (1 panggilan).
   Login pertama / setelah di-reset Admin → wajib membuat password baru.
   ========================================================================= */
'use strict';
const Auth = {
  pending: null,               // { token, username, nama, oldPassword } saat wajib ganti password
  restore() {
    const s = Store.get('session', null);
    if (s && s.token && s.user) { Object.assign(AppState, { token: s.token, user: s.user }); return true; }
    return false;
  },
  shell(inner) {
    // Kiri: gambar SPN utuh (tidak tertutup) · Kanan: formulir masuk
    return '<main class="login-wrap split">' +
      '<section class="login-hero" aria-label="SI-PRO SPN Polda Papua Barat — Sistem Informasi Pendidikan dan Pelatihan">' +
      '<img src="img/login-hero.jpg" alt="SI-PRO SPN Polda Papua Barat — Sistem Informasi Pendidikan dan Pelatihan" fetchpriority="high" decoding="async"></section>' +
      '<section class="login-side"><div class="login-box"><div class="login-card"><div class="login-in">' + inner + '</div></div></div></section></main><div class="toasts" id="toasts"></div>';
  },
  head() {
    return '<div class="login-head"><span class="lbl">Portal Otentikasi</span><span class="tag tag-navy">Terbatas</span></div>' +
      '<img class="login-logo" src="img/logo.png" alt="Logo SI-PRO">' +
      '<div class="login-title">SI-PRO</div><div class="login-sub">SISTEM INFORMASI PENDIDIKAN DAN PELATIHAN</div>' +
      '<div class="login-sep"></div>';
  },
  pwdField(name, label, ph, auto) {
    return '<div class="field"><label for="f_' + name + '">' + label + '</label><div class="with-ic pwd">' + ic('lock') +
      '<input class="input" id="f_' + name + '" name="' + name + '" type="password" autocomplete="' + auto + '" placeholder="' + esc(ph) + '" required>' +
      '<button type="button" class="eye" data-eye aria-label="Tampilkan password">' + ic('eye') + '</button></div></div>';
  },
  bindEyes(root) {
    $$('[data-eye]', root).forEach((b) => b.addEventListener('click', () => {
      const i = b.parentNode.querySelector('input'); const show = i.type === 'password';
      i.type = show ? 'text' : 'password'; b.setAttribute('aria-label', show ? 'Sembunyikan password' : 'Tampilkan password'); b.classList.toggle('on', show);
    }));
  },
  renderLogin(err) {
    document.title = 'Masuk — SI-PRO';
    this.pending = null;
    const last = Store.get('lastUser', '');
    $('#root').innerHTML = this.shell(this.head() +
      '<p class="login-desc">Masuk menggunakan <b>username</b> dan <b>password</b> yang diberikan oleh Admin Induk.</p>' +
      '<div id="loginErr">' + (err ? this.errBox(err) : '') + '</div>' +
      '<form id="fLogin" class="grid" style="gap:14px;margin-bottom:16px" novalidate>' +
      '<div class="field"><label for="f_username">Username</label><div class="with-ic">' + ic('users') +
      '<input class="input" id="f_username" name="username" autocomplete="username" autocapitalize="none" spellcheck="false" placeholder="mis. polres.manokwari" value="' + esc(last) + '" required></div></div>' +
      this.pwdField('password', 'Password', 'Masukkan password', 'current-password') +
      '<button class="btn btn-navy btn-lg btn-block" type="submit" data-go>Masuk ke SI-PRO' + ic('arrow-right') + '</button></form>');
    this.bindEyes($('#root'));
    // Di HP jangan fokus otomatis (keyboard tidak muncul sendiri & layar tidak bergeser)
    if (matchMedia('(min-width: 901px)').matches) $(last ? '#f_password' : '#f_username').focus();
    $('#fLogin').addEventListener('submit', (e) => { e.preventDefault(); this.login(); });
  },
  errBox(msg) { return '<div class="alert alert-red">' + ic('alert-circle') + '<div><b>[!] OTENTIKASI DITOLAK</b><span class="m">' + esc(msg) + '</span></div></div>'; },
  checkGateway() {
    const gw = () => $('#gw');
    fetch(GAS_URL + '?ping=' + Date.now(), { cache: 'no-store' }).then((r) => r.json()).then((j) => {
      if (!gw()) return;
      if (j && j.success && j.data && j.data.ready) { gw().className = 'on'; gw().innerHTML = '<span class="dot"></span>GATEWAY ONLINE'; }
      else { gw().className = 'off'; gw().innerHTML = '<span class="dot"></span>SERVER BELUM DISETUP'; }
    }).catch(() => { if (gw()) { gw().className = 'off'; gw().innerHTML = '<span class="dot"></span>GATEWAY TIDAK TERJANGKAU'; } });
  },
  async login() {
    const u = $('#f_username').value.trim().toLowerCase(), p = $('#f_password').value;
    if (!u || !p) { $('#loginErr').innerHTML = this.errBox('Isi username dan password.'); (u ? $('#f_password') : $('#f_username')).focus(); return; }
    const done = busyBtn($('[data-go]'), 'Memverifikasi…');
    $('#loginErr').innerHTML = '';
    const res = await api('login', { username: u, password: p });
    done();
    if (!res.success) { $('#loginErr').innerHTML = this.errBox(res.message); $('#f_password').value = ''; $('#f_password').focus(); return; }
    Store.set('lastUser', res.data.username);
    if (res.data.mustChange) { this.pending = { token: res.data.token, username: res.data.username, nama: res.data.nama, oldPassword: p }; return this.renderChange(); }
    this.enter(res.data.token, res.data.username, res.data.boot);
  },
  enter(token, user, boot) {
    Object.assign(AppState, { token, user });
    Store.set('session', { token, user });
    Data.apply(boot);
    App.start();
    toast('Selamat datang, ' + boot.me.nama + '.', 'success');
  },
  rulesHtml() {
    return '<ul class="pwd-rules" id="pwdRules"><li data-r="len">Minimal 8 karakter</li><li data-r="mix">Mengandung huruf dan angka</li><li data-r="usr">Tidak memuat username</li><li data-r="same">Konfirmasi sama</li></ul>';
  },
  checkRules(root, user) {
    const n = $('[name=newPassword]', root).value, c = $('[name=confirm]', root).value;
    const ok = { len: n.length >= 8 && n.length <= 64, mix: /[A-Za-z]/.test(n) && /\d/.test(n), usr: !user || !n.toLowerCase().includes(user.toLowerCase()), same: !!n && n === c };
    Object.keys(ok).forEach((k) => { const li = $('[data-r="' + k + '"]', root); if (li) li.classList.toggle('ok', ok[k]); });
    return Object.values(ok).every(Boolean);
  },
  /** Halaman wajib ganti password (login pertama / setelah reset Admin). */
  renderChange(err) {
    const P = this.pending;
    $('#root').innerHTML = this.shell(this.head() +
      '<div class="alert alert-amber">' + ic('lock') + '<div><b>BUAT PASSWORD BARU</b>Halo <b style="display:inline;font-family:var(--sans);letter-spacing:0">' + esc(P.nama || P.username) + '</b>, ini login pertama Anda (atau password baru di-reset Admin). Buat password pribadi yang hanya Anda ketahui.</div></div>' +
      '<div id="loginErr">' + (err ? this.errBox(err) : '') + '</div>' +
      '<form id="fChange" class="grid" style="gap:14px;margin-bottom:16px" novalidate>' +
      '<div class="field"><label>Username</label><input class="input mono" value="' + esc(P.username) + '" readonly autocomplete="username"></div>' +
      this.pwdField('newPassword', 'Password baru', 'Minimal 8 karakter, huruf & angka', 'new-password') +
      this.pwdField('confirm', 'Ulangi password baru', 'Ketik ulang password baru', 'new-password') + this.rulesHtml() +
      '<button class="btn btn-success btn-lg btn-block" type="submit" data-go>' + ic('save') + 'Simpan Password &amp; Masuk</button>' +
      '<button class="btn btn-ghost btn-block" type="button" data-back>Kembali ke halaman masuk</button></form>');
    const root = $('#fChange');
    this.bindEyes(root); $('#f_newPassword').focus();
    root.addEventListener('input', () => this.checkRules(root, P.username));
    $('[data-back]').addEventListener('click', () => this.renderLogin());
    root.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!this.checkRules(root, P.username)) { $('#loginErr').innerHTML = this.errBox('Password baru belum memenuhi semua syarat di bawah.'); return; }
      const done = busyBtn($('[data-go]'), 'Menyimpan…');
      AppState.token = P.token;
      const res = await api('changePassword', { oldPassword: P.oldPassword, newPassword: $('[name=newPassword]', root).value });
      done();
      if (!res.success) { $('#loginErr').innerHTML = this.errBox(res.message); return; }
      this.pending = null;
      this.enter(res.data.token, res.data.username, res.data.boot);
      toast('Password baru tersimpan. Gunakan password ini untuk login berikutnya.', 'info');
    });
  },
  /** Ganti password dari menu akun (saat sudah masuk). */
  changeModal() {
    const user = AppState.user;
    const m = modal({ title: 'Ganti Password', icon: 'lock', cls: 'sm',
      body: '<form data-f class="grid" style="gap:14px" novalidate>' + this.pwdField('oldPassword', 'Password saat ini', 'Password lama', 'current-password') +
        this.pwdField('newPassword', 'Password baru', 'Minimal 8 karakter, huruf & angka', 'new-password') +
        this.pwdField('confirm', 'Ulangi password baru', 'Ketik ulang password baru', 'new-password') + this.rulesHtml() +
        '<p class="hint" style="margin:0">Setelah diganti, sesi di perangkat lain otomatis keluar.</p></form>',
      foot: '<button class="btn" data-x>Batal</button><button class="btn btn-navy" data-save>' + ic('save') + 'Simpan Password</button>' });
    const f = $('[data-f]', m.el);
    this.bindEyes(f);
    f.addEventListener('input', () => this.checkRules(f, user));
    const save = async () => {
      if (!$('[name=oldPassword]', f).value) return toast('Isi password saat ini.', 'error');
      if (!this.checkRules(f, user)) return toast('Password baru belum memenuhi semua syarat.', 'error');
      const done = busyBtn($('[data-save]', m.el), 'Menyimpan…'); m.busy(true);
      const res = await api('changePassword', { oldPassword: $('[name=oldPassword]', f).value, newPassword: $('[name=newPassword]', f).value });
      done(); m.busy(false);
      if (!res.success) return toast(res.message, 'error');
      AppState.token = res.data.token; Store.set('session', { token: res.data.token, user: AppState.user });
      m.close(); toast(res.message, 'success');
    };
    $('[data-save]', m.el).addEventListener('click', save);
    f.addEventListener('submit', (e) => { e.preventDefault(); save(); });
  },
  logout() {
    Store.del('session');
    Store.clearUser(AppState.user);                     // perangkat bersama: hapus salinan data lokal
    Object.assign(AppState, { token: '', user: '', data: null });
    history.replaceState(null, '', location.pathname);
    this.renderLogin();
  },
  expired(msg) {
    if (!AppState.token) return;
    Store.del('session');
    Object.assign(AppState, { token: '', data: null });
    this.renderLogin(msg || 'Sesi berakhir. Silakan masuk kembali.');
  }
};
