/* =========================================================================
   SI-PRO — Kelola Master: Pengguna, Satker, Pelatihan, Pengaturan,
   Migrasi Data (modul gas-migrasi-database), Log Aktivitas
   ========================================================================= */
'use strict';
const MasterPg = window.MasterPg = { tab: 'pelatihan', thumbs: null, q: { pengguna: '', satker: '', pelatihan: '' }, f: { peran: '', polda: '' }, logs: null };
const TABS = [['pelatihan', 'Pelatihan & Kuota', 'graduation'], ['satker', 'Satker / Polres', 'building'], ['pengguna', 'Pengguna Sistem', 'users'],
  ['pengaturan', 'Pengaturan Laporan', 'settings'], ['migrasi', 'Migrasi Data', 'database'], ['log', 'Log Aktivitas', 'history']];

registerPage('master', {
  title: 'Kelola Master', admin: true,
  render(el, param) {
    const tab = TABS.some((t) => t[0] === param) ? param : MasterPg.tab;
    MasterPg.tab = tab;
    if (!el._built) {
      el.innerHTML = '<div class="ph"><div><h1>Pengelolaan Master Data SI-PRO</h1>' +
        '<p class="desc mono">Administrasi pengguna, Satker, program pelatihan, pengaturan laporan &amp; migrasi data</p></div>' +
        '</div>' +
        '<div class="tabs" role="tablist" data-tabs></div><div data-tab class="fcol fill"></div>';
      el._built = true;
      $('[data-tabs]', el).addEventListener('click', (e) => { const b = e.target.closest('[data-t]'); if (b) Router.go('master', b.dataset.t); });
    }
    const d = D.d;
    const counts = { pengguna: d.pengguna.length, satker: d.satker.length, pelatihan: d.pelatihan.length };
    $('[data-tabs]', el).innerHTML = TABS.map((t) => '<button role="tab" data-t="' + t[0] + '" class="' + (t[0] === tab ? 'on' : '') + '">' + ic(t[2]) + t[1] + (counts[t[0]] != null ? '<span class="n">' + counts[t[0]] + '</span>' : '') + '</button>').join('');
    let host = $('[data-tab]', el);
    // Ganti tab → wadah baru (listener tab sebelumnya ikut terbuang, tidak menumpuk)
    if (host._tab !== tab) { const nh = host.cloneNode(false); host.replaceWith(nh); host = nh; host._tab = tab; host._built = false; }
    host.classList.toggle('scroll', tab === 'pengaturan');
    host.classList.toggle('migr', tab === 'migrasi');
    MASTER_TABS[tab](host);
    AutoPager.attach($('.card.fill[data-apc]', host));
  }
});

const MASTER_TABS = {
  /* ── Pengguna ── */
  pengguna(host) {
    if (!host._built) {
      host.innerHTML = '<div class="card fill" data-apc><div class="toolbar"><div class="with-ic">' + ic('search') + '<input class="input mono" data-q placeholder="[CARI NAMA / USERNAME / SATKER]" value="' + esc(MasterPg.q.pengguna) + '"></div>' +
        '<select class="select" data-peran><option value="">Filter: semua peran</option><option>Admin Induk</option><option>Petugas</option></select>' +
        '<button class="btn" data-hint>' + ic('info') + 'Petunjuk</button><button class="btn btn-navy" data-add>' + ic('user-plus') + 'Tambah Pengguna Baru</button></div>' +
        '<div class="tbl-wrap"><table class="tbl rtable fx tbl-users"><thead><tr><th>No</th><th>Foto</th><th>Nama Petugas</th><th>Username</th><th>Peran</th><th>Penugasan Satker</th><th>Kontak</th><th>Status Akun</th><th class="r">Aksi</th></tr></thead><tbody data-rows></tbody></table></div>' +
        '<div class="card-f info-f"><span class="foot-info" data-info></span></div></div>' +
        '<div class="hint-box fit-hide"><div class="ico">' + ic('info') + '</div><div><b>PETUNJUK REGISTRASI &amp; PENGELOLAAN AKSES:</b><p>Buat satu akun per petugas (mis. username <code>polres.manokwari</code>). Sistem membuat <b>password sementara</b> yang ditampilkan sekali untuk diserahkan — bisa langsung dikirim lewat WhatsApp. Petugas wajib menggantinya saat login pertama. Admin tidak dapat melihat password; bila petugas lupa, gunakan <b>Reset</b>. Akun Nonaktif langsung terputus dari semua perangkat.</p></div></div>';
      host._built = true;
      $('[data-q]', host).addEventListener('input', debounce((e) => { MasterPg.q.pengguna = e.target.value; MASTER_TABS.pengguna(host); }, 200));
      $('[data-peran]', host).addEventListener('change', (e) => { MasterPg.f.peran = e.target.value; MASTER_TABS.pengguna(host); });
      $('[data-add]', host).addEventListener('click', () => userModal(null));
      $('[data-hint]', host).addEventListener('click', () => modal({ title: 'Petunjuk Registrasi & Akses', icon: 'info', body: '<div class="hint-box" style="margin:0;display:flex">' + $('.hint-box', host).innerHTML + '</div>' }));
      host.addEventListener('click', async (e) => {
        const b = e.target.closest('[data-u]'); if (!b) return;
        const u = D.d.pengguna.find((x) => x.ID_Pengguna === b.dataset.id); if (!u) return;
        if (b.dataset.u === 'edit') userModal(u);
        if (b.dataset.u === 'reset') resetPwdModal(u);
        if (b.dataset.u === 'foto') fotoProfilModal(u);
        if (b.dataset.u === 'del') {
          const nPes = D.d.peserta.filter((p) => p.Dibuat_Oleh === u.Username).length;
          if (!(await confirmDlg({ danger: true, title: 'Hapus akun petugas?', okText: 'Ya, hapus akun',
            message: 'Akun <b>' + esc(u.Nama) + '</b> (' + esc(u.Username) + ') akan dihapus permanen dan sesinya langsung terputus.' +
              (nPes ? '<br><br>' + nPes + ' data peserta yang pernah diinput akun ini <b>tetap tersimpan</b> di Satker-nya.' : '') }))) return;
          const idx = D.d.pengguna.indexOf(u);
          if (MasterPg.thumbs) delete MasterPg.thumbs[u.ID_Pengguna];
          Data.quick({ action: 'deletePengguna', data: { ID_Pengguna: u.ID_Pengguna }, ok: 'Akun ' + u.Username + ' dihapus.', hide: ['pengguna', 'ID_Pengguna', u.ID_Pengguna],
            apply: (d) => { d.pengguna = d.pengguna.filter((x) => x.ID_Pengguna !== u.ID_Pengguna); },
            undo: (d) => { d.pengguna.splice(Math.min(idx, d.pengguna.length), 0, u); } });
        }
        if (b.dataset.u === 'toggle') {
          const to = u.Status === 'Aktif' ? 'Nonaktif' : 'Aktif';
          if (to === 'Nonaktif' && !(await confirmDlg({ danger: true, title: 'Nonaktifkan akun?', message: '<b>' + esc(u.Nama) + '</b> (' + esc(u.Username) + ') tidak akan bisa masuk dan sesi aktifnya langsung terputus.', okText: 'Nonaktifkan' }))) return;
          const prev = u.Status;
          Data.quick({ action: 'savePengguna', data: Object.assign({}, u, { Status: to }), ok: 'Akun ' + u.Username + (to === 'Aktif' ? ' diaktifkan.' : ' dinonaktifkan.'),
            apply: (d) => { const x = d.pengguna.find((y) => y.ID_Pengguna === u.ID_Pengguna); if (x) x.Status = to; },
            undo: (d) => { const x = d.pengguna.find((y) => y.ID_Pengguna === u.ID_Pengguna); if (x) x.Status = prev; } });
        }
      });
    }
    const q = MasterPg.q.pengguna.toLowerCase(), pf = MasterPg.f.peran;
    $('[data-peran]', host).value = pf;
    const list = D.d.pengguna.filter((u) => (!pf || u.Peran === pf) && (!q || (u.Nama + ' ' + u.Username + ' ' + D.satNama(u.ID_Satker)).toLowerCase().includes(q)))
      .sort((a, b) => (a.Peran === b.Peran ? 0 : a.Peran === 'Admin Induk' ? -1 : 1) || a.Nama.localeCompare(b.Nama));
    const self = D.d.me.username;
    $('[data-rows]', host).innerHTML = list.length ? list.map((u, i) =>
      '<tr><td class="no no-m">' + String(i + 1).padStart(2, '0') + '</td><td class="no-m"><button class="u-ava" data-u="foto" data-id="' + esc(u.ID_Pengguna) + '" title="Foto profil">' +
      (MasterPg.thumbs && MasterPg.thumbs[u.ID_Pengguna] ? '<img src="' + MasterPg.thumbs[u.ID_Pengguna] + '" alt="">' : esc(initials(u.Nama))) + '</button></td><td class="main"><div class="nm">' + esc(u.Nama) + '</div><div class="sub">' + (u.NRP ? 'NRP. ' + esc(u.NRP) : esc(u.ID_Pengguna)) + (u.Jabatan ? ' · ' + esc(u.Jabatan) : '') + '</div></td>' +
      '<td data-l="Username"><span class="mono-n" style="font-size:13px;font-weight:600">' + esc(u.Username || '—') + '</span>' + (!u.Ada_Password ? '<div class="sub red">BELUM ADA PASSWORD</div>' : u.Wajib_Ganti ? '<div class="sub amber">MENUNGGU GANTI PASSWORD</div>' : '') + '</td>' +
      '<td data-l="Peran">' + (u.Peran === 'Admin Induk' ? '<span class="tag tag-navy" style="color:#fbbf24">ADMIN INDUK</span>' : '<span class="tag tag-blue">PETUGAS SATKER</span>') + '</td>' +
      '<td data-l="Satker">' + (u.ID_Satker ? esc(D.satNama(u.ID_Satker)) : '<span class="muted">— Seluruh Satker</span>') + '</td>' +
      '<td data-l="Kontak" class="mono-n" style="font-size:12.5px">' + (esc(u.No_HP) || '—') + '</td>' +
      '<td data-l="Status">' + (u.Status === 'Aktif' ? '<span class="tag tag-green pill"><span class="dot"></span>AKTIF</span>' : '<span class="tag tag-gray pill"><span class="dot"></span>NONAKTIF</span>') + '</td>' +
      '<td class="acts-td"><div class="acts"><button class="btn btn-xs act-view" data-u="edit" data-id="' + esc(u.ID_Pengguna) + '">Edit</button>' +
      (u.Username !== self ? '<button class="btn btn-xs act-edit" data-u="reset" data-id="' + esc(u.ID_Pengguna) + '">Reset</button>' : '') +
      (u.Username === self ? '<span class="tag tag-gray">ANDA</span>' : u.Status === 'Aktif' ? '<button class="btn btn-xs act-del" data-u="toggle" data-id="' + esc(u.ID_Pengguna) + '">Nonaktifkan</button>' : '<button class="btn btn-xs act-wa" data-u="toggle" data-id="' + esc(u.ID_Pengguna) + '">Aktifkan</button>') +
      (u.Username !== self ? '<button class="btn btn-xs act-del btn-trash" data-u="del" data-id="' + esc(u.ID_Pengguna) + '" title="Hapus akun" aria-label="Hapus akun ' + esc(u.Username) + '">' + ic('trash') + '<span class="fit-no">Hapus</span></button>' : '') +
      '</div></td></tr>').join('') : '<tr><td colspan="9"><div class="empty">' + ic('users') + '<b>Tidak ada pengguna</b></div></td></tr>';
    if (!MasterPg.thumbs && !MasterPg._loadingThumbs && D.d.pengguna.some((u) => u.Ada_Foto)) {
      MasterPg._loadingThumbs = true;
      api('fotoThumbs', {}).then((r) => { MasterPg._loadingThumbs = false; if (r.success) { MasterPg.thumbs = r.data; if (host.isConnected) MASTER_TABS.pengguna(host); } });
    }
    const aktif = D.d.pengguna.filter((u) => u.Status === 'Aktif').length;
    $('[data-info]', host).innerHTML = 'Menampilkan <b>' + list.length + '</b> dari ' + D.d.pengguna.length + ' pengguna · ' + aktif + ' aktif';
  },

  /* ── Satker ── */
  satker(host) {
    if (!host._built) {
      host.innerHTML = '<div class="card fill" data-apc><div class="toolbar"><div class="with-ic">' + ic('search') + '<input class="input mono" data-q placeholder="[CARI NAMA / ID SATKER]" value="' + esc(MasterPg.q.satker) + '"></div>' +
        '<select class="select" data-polda></select><button class="btn btn-navy" data-add>' + ic('plus') + 'Tambah Satker</button></div>' +
        '<div class="tbl-wrap"><table class="tbl rtable fx tbl-satker"><thead><tr><th>ID Satker</th><th>Nama Satker / Polres</th><th>Jenis</th><th>Polda</th><th>Petugas PIC</th><th class="c">Total Peserta</th><th>Status</th><th class="r">Aksi</th></tr></thead><tbody data-rows></tbody></table></div>' +
        '<div class="card-f info-f"><span class="foot-info" data-info></span></div></div>';
      host._built = true;
      $('[data-q]', host).addEventListener('input', debounce((e) => { MasterPg.q.satker = e.target.value; MASTER_TABS.satker(host); }, 200));
      $('[data-polda]', host).addEventListener('change', (e) => { MasterPg.f.polda = e.target.value; MASTER_TABS.satker(host); });
      $('[data-add]', host).addEventListener('click', () => satkerModal(null));
      host.addEventListener('click', async (e) => {
        const b = e.target.closest('[data-s]'); if (!b) return;
        const s = D.d.satker.find((x) => x.ID_Satker === b.dataset.id); if (!s) return;
        if (b.dataset.s === 'edit') satkerModal(s);
        if (b.dataset.s === 'del') {
          if (!(await confirmDlg({ danger: true, title: 'Hapus Satker?', message: 'Satker <b>' + esc(s.Nama_Satker) + '</b> akan dihapus permanen. Satker yang sudah punya peserta/petugas tidak dapat dihapus — gunakan status Nonaktif.', okText: 'Hapus' }))) return;
          // Aturan yang sama dengan server dicek di perangkat → penolakan pun seketika
          if (D.d.peserta.some((p) => p.ID_Satker === s.ID_Satker)) return toast('Satker masih memiliki data peserta. Nonaktifkan saja.', 'error');
          if (D.d.pengguna.some((u) => u.ID_Satker === s.ID_Satker)) return toast('Satker masih memiliki akun petugas. Pindahkan/hapus akunnya dulu, atau nonaktifkan Satker.', 'error');
          const idx = D.d.satker.indexOf(s), alok = (D.d.alokasi || []).filter((a) => a.ID_Satker === s.ID_Satker);
          Data.quick({ action: 'deleteSatker', data: { ID_Satker: s.ID_Satker }, ok: 'Satker ' + s.Nama_Satker + ' dihapus.', hide: ['satker', 'ID_Satker', s.ID_Satker],
            apply: (d) => { d.satker = d.satker.filter((x) => x.ID_Satker !== s.ID_Satker); if (d.alokasi) d.alokasi = d.alokasi.filter((a) => a.ID_Satker !== s.ID_Satker); },
            undo: (d) => { d.satker.splice(Math.min(idx, d.satker.length), 0, s); if (d.alokasi) d.alokasi = d.alokasi.concat(alok); } });
        }
      });
    }
    $('[data-polda]', host).innerHTML = poldaOptions(MasterPg.f.polda, 'Filter: semua Polda');
    const q = MasterPg.q.satker.toLowerCase(), pf = MasterPg.f.polda;
    const cnt = {}; D.d.peserta.forEach((p) => { cnt[p.ID_Satker] = (cnt[p.ID_Satker] || 0) + 1; });
    const list = D.d.satker.filter((s) => (!pf || s.Polda === pf) && (!q || (s.Nama_Satker + ' ' + s.ID_Satker).toLowerCase().includes(q)))
      .sort((a, b) => a.Polda.localeCompare(b.Polda) || a.ID_Satker.localeCompare(b.ID_Satker));
    $('[data-rows]', host).innerHTML = list.length ? list.map((s) => {
      const pics = D.pic(s.ID_Satker);
      return '<tr><td data-l="ID" class="mono-n">' + esc(s.ID_Satker) + '</td><td class="main"><div class="nm">' + esc(s.Nama_Satker) + '</div></td><td data-l="Jenis">' + (s.Jenis === 'Polres' ? '<span class="tag tag-blue">POLRES</span>' : '<span class="tag tag-violet">SATKER POLDA</span>') + '</td><td data-l="Polda">' + D.poldaChip(s.Polda) + '</td>' +
        '<td data-l="PIC">' + (pics.length ? esc(pics.map((u) => u.Nama).join(', ')) : '<span class="tag tag-amber">BELUM ADA</span>') + '</td><td data-l="Peserta" class="c mono-n">' + (cnt[s.ID_Satker] || 0) + '</td>' +
        '<td data-l="Status">' + (s.Status === 'Nonaktif' ? '<span class="tag tag-gray">NONAKTIF</span>' : '<span class="tag tag-green">AKTIF</span>') + '</td>' +
        '<td class="acts-td"><div class="acts"><button class="btn btn-xs act-view" data-s="edit" data-id="' + esc(s.ID_Satker) + '">Edit</button><button class="btn btn-xs act-del" data-s="del" data-id="' + esc(s.ID_Satker) + '">Hapus</button></div></td></tr>';
    }).join('') : '<tr><td colspan="8"><div class="empty">' + ic('building') + '<b>Tidak ada Satker</b></div></td></tr>';
    $('[data-info]', host).innerHTML = 'Menampilkan <b>' + list.length + '</b> dari ' + D.d.satker.length + ' Satker · Satker Nonaktif tidak dihitung dalam daftar "Belum Mengirim"';
  },

  /* ── Pelatihan: Buat (Draft) → Atur Kuota → Bagikan ── */
  pelatihan(host) {
    if (!host._built) {
      host.innerHTML = '<div class="flow"><div><span class="n">1</span><div><b>Buat pelatihan</b><small>Nama, tempat, tanggal pelaksanaan &amp; batas daftar</small></div></div>' +
        '<div><span class="n">2</span><div><b>Atur kuota</b><small>Tunjuk Satker Polda &amp; Polres + jumlah peserta</small></div></div>' +
        '<div><span class="n">3</span><div><b>Bagikan</b><small>Satker yang ditunjuk mulai mendaftarkan peserta</small></div></div></div>' +
        '<div class="card fill" data-apc><div class="toolbar"><div class="with-ic">' + ic('search') + '<input class="input" data-q placeholder="Cari nama pelatihan…" value="' + esc(MasterPg.q.pelatihan) + '"></div>' +
        '<button class="btn btn-navy" data-add>' + ic('plus') + 'Pelatihan Baru</button></div>' +
        '<div class="tbl-wrap"><table class="tbl rtable fx tbl-pel"><thead><tr><th>Program Pelatihan</th><th>Pelaksanaan</th><th>Batas Daftar</th><th class="c">Satker Ditunjuk</th><th class="c">Terisi / Kuota</th><th>Status</th><th class="r">Aksi</th></tr></thead><tbody data-rows></tbody></table></div></div>';
      host._built = true;
      $('[data-q]', host).addEventListener('input', debounce((e) => { MasterPg.q.pelatihan = e.target.value; MASTER_TABS.pelatihan(host); }, 200));
      $('[data-add]', host).addEventListener('click', () => pelatihanModal(null));
      host.addEventListener('click', async (e) => {
        const b = e.target.closest('[data-p]'); if (!b) return;
        const p = D.d.pelatihan.find((x) => x.ID_Pelatihan === b.dataset.id); if (!p) return;
        const act = b.dataset.p;
        if (act === 'edit') pelatihanModal(p);
        if (act === 'kuota') alokasiModal(p);
        if (act === 'bagikan') bagikanFlow(p);
        if (act === 'kirim') distribusiModal(p);
        if (act === 'selesai' || act === 'aktif') {
          const to = act === 'selesai' ? 'Selesai' : 'Aktif';
          if (to === 'Selesai' && !(await confirmDlg({ title: 'Tandai pelatihan Selesai?', message: 'Petugas Satker tidak dapat lagi menambah/mengubah peserta <b>' + esc(p.Nama_Pelatihan) + '</b>. Status dapat dikembalikan kapan saja.', okText: 'Tandai Selesai' }))) return;
          const prev = p.Status;
          Data.quick({ action: 'savePelatihan', data: Object.assign({}, p, { Status: to }), ok: 'Status pelatihan: ' + (to === 'Aktif' ? 'dibuka kembali' : 'Selesai') + '.',
            apply: (d) => { const x = d.pelatihan.find((y) => y.ID_Pelatihan === p.ID_Pelatihan); if (x) x.Status = to; },
            undo: (d) => { const x = d.pelatihan.find((y) => y.ID_Pelatihan === p.ID_Pelatihan); if (x) x.Status = prev; } });
        }
        if (act === 'del') {
          if (!(await confirmDlg({ danger: true, title: 'Hapus pelatihan?', message: '<b>' + esc(p.Nama_Pelatihan) + '</b> beserta pengaturan kuotanya akan dihapus. Hanya bisa bila belum ada peserta.', okText: 'Hapus' }))) return;
          if (D.d.peserta.some((x) => x.ID_Pelatihan === p.ID_Pelatihan)) return toast('Pelatihan sudah memiliki peserta. Tandai Selesai saja.', 'error');
          const idx = D.d.pelatihan.indexOf(p), alok = (D.d.alokasi || []).filter((a) => a.ID_Pelatihan === p.ID_Pelatihan);
          Data.quick({ action: 'deletePelatihan', data: { ID_Pelatihan: p.ID_Pelatihan }, ok: 'Pelatihan ' + p.Nama_Pelatihan + ' dihapus.', hide: ['pelatihan', 'ID_Pelatihan', p.ID_Pelatihan],
            apply: (d) => { d.pelatihan = d.pelatihan.filter((x) => x.ID_Pelatihan !== p.ID_Pelatihan); if (d.alokasi) d.alokasi = d.alokasi.filter((a) => a.ID_Pelatihan !== p.ID_Pelatihan); },
            undo: (d) => { d.pelatihan.splice(Math.min(idx, d.pelatihan.length), 0, p); if (d.alokasi) d.alokasi = d.alokasi.concat(alok); } });
        }
      });
    }
    const q = MasterPg.q.pelatihan.toLowerCase();
    const cnt = {}; D.d.peserta.forEach((p) => { cnt[p.ID_Pelatihan] = (cnt[p.ID_Pelatihan] || 0) + 1; });
    const list = D.pelSorted().filter((p) => !q || p.Nama_Pelatihan.toLowerCase().includes(q));
    const btn = (act, id, cls, label, icon) => '<button class="btn btn-xs ' + cls + '" data-p="' + act + '" data-id="' + esc(id) + '">' + (icon ? ic(icon) : '') + label + '</button>';
    $('[data-rows]', host).innerHTML = list.length ? list.map((p) => {
      const lewat = D.lewat(p), al = D.alok(p.ID_Pelatihan), ns = Object.keys(al).length, kq = D.totalKuota(p.ID_Pelatihan), n = cnt[p.ID_Pelatihan] || 0;
      const acts = p.Status === 'Draft'
        ? btn('kuota', p.ID_Pelatihan, 'act-edit', 'Atur Kuota', 'users') + btn('bagikan', p.ID_Pelatihan, 'btn-primary', 'Bagikan', 'send') + btn('edit', p.ID_Pelatihan, 'act-view', 'Edit') + (n ? '' : btn('del', p.ID_Pelatihan, 'act-del', 'Hapus'))
        : p.Status === 'Aktif'
          ? btn('kuota', p.ID_Pelatihan, 'act-edit', 'Kuota', 'users') + (ns ? btn('kirim', p.ID_Pelatihan, 'act-wa', 'Kirim Info', 'message') : '') + btn('edit', p.ID_Pelatihan, 'act-view', 'Edit') + btn('selesai', p.ID_Pelatihan, 'act-del', 'Selesai')
          : btn('edit', p.ID_Pelatihan, 'act-view', 'Edit') + btn('aktif', p.ID_Pelatihan, 'act-wa', 'Buka Lagi');
      return '<tr><td class="main"><div class="nm">' + esc(p.Nama_Pelatihan) + '</div><div class="sub">' + esc(p.ID_Pelatihan) + ' · ' + esc(p.Lokasi || 'SPN Polda Papua Barat') + (p.Keterangan ? ' · ' + esc(p.Keterangan) : '') + '</div></td>' +
        '<td data-l="Pelaksanaan" class="mono-n" style="font-size:13px;white-space:nowrap">' + fmtTgl(p.Tanggal_Mulai) + ' –<br>' + fmtTgl(p.Tanggal_Selesai) + '</td>' +
        '<td data-l="Batas daftar" class="mono-n" style="font-size:13px">' + (p.Batas_Kirim ? fmtTgl(p.Batas_Kirim) + (lewat && p.Status === 'Aktif' ? ' <span class="tag tag-gray">LEWAT</span>' : '') : '<span class="c-red">Belum diisi</span>') + '</td>' +
        '<td data-l="Satker ditunjuk" class="c mono-n">' + (ns || '<span class="c-red">0</span>') + '</td>' +
        '<td data-l="Terisi / kuota" class="c mono-n" style="font-weight:700">' + n + ' / ' + (kq || '—') + '</td>' +
        '<td data-l="Status">' + D.statusTag(p) + (p.Dibagikan_Pada && p.Status !== 'Draft' ? '<div class="sub" style="margin-top:4px">' + fmtTgl(p.Dibagikan_Pada) + '</div>' : '') + '</td>' +
        '<td class="acts-td"><div class="acts" style="flex-wrap:wrap;max-width:300px;margin-left:auto">' + acts + '</div></td></tr>';
    }).join('') : '<tr><td colspan="7"><div class="empty">' + ic('graduation') + '<b>Belum ada pelatihan</b>Tekan "Pelatihan Baru" untuk membuat.</div></td></tr>';
  },

  /* ── Pengaturan laporan ── */
  pengaturan(host) {
    if (host._built) return;
    const s = D.d.settings || {};
    const f = (k, label, ph, hint, wide) => '<div class="field' + (wide ? ' span2' : '') + '"><label>' + label + '</label><input class="input" name="' + k + '" value="' + esc(s[k] || '') + '" placeholder="' + esc(ph || '') + '">' + (hint ? '<span class="hint">' + hint + '</span>' : '') + '</div>';
    host.innerHTML = '<form class="card" data-form><div class="card-h"><h3><span class="ico">' + ic('printer') + '</span>Kop Surat &amp; Tanda Tangan Laporan PDF</h3></div><div class="card-b"><div class="grid g2">' +
      f('KOP_1', 'Kop baris 1', 'KEPOLISIAN NEGARA REPUBLIK INDONESIA') + f('KOP_2', 'Kop baris 2', 'DAERAH PAPUA BARAT') + f('KOP_3', 'Kop baris 3', 'BIRO SUMBER DAYA MANUSIA') +
      f('KOP_ALAMAT', 'Alamat (opsional)', 'Jalan …, Manokwari') + f('KOTA_TTD', 'Kota penerbitan', 'Manokwari') + f('JABATAN_TTD', 'Jabatan penanda tangan', 'KEPALA BIRO SUMBER DAYA MANUSIA') +
      f('NAMA_TTD', 'Nama penanda tangan', 'Nama lengkap & gelar', 'Kosongkan bila ditulis tangan') + f('PANGKAT_NRP_TTD', 'Pangkat & NRP penanda tangan', 'KOMISARIS BESAR POLISI NRP …') +
      '<div class="field span2"><label>Catatan di bawah tabel (opsional)</label><textarea class="input" name="CATATAN_LAPORAN" rows="3" placeholder="Mis. ketentuan lapor diri peserta">' + esc(s.CATATAN_LAPORAN || '') + '</textarea></div>' +
      '</div></div><div class="card-f"><span class="hint">Perubahan berlaku untuk laporan berikutnya.</span><button class="btn btn-navy" type="submit">' + ic('save') + 'Simpan Pengaturan</button></div></form>';
    host._built = true;
    $('[data-form]', host).addEventListener('submit', async (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(e.target).entries());
      const done = busyBtn($('[type=submit]', host), 'Menyimpan…');
      const res = await api('saveSettings', data);
      done(); if (!res.success) return toast(res.message, 'error');
      Data.mutate((d) => { d.settings = res.data.settings; });
      toast(res.message);
    });
  },

  /* ── Migrasi data (gas-migrasi-database) ── */
  migrasi(host) {
    if (host._built) return;
    host.innerHTML =
      '<div class="split"><div class="card"><div class="card-h"><h3><span class="ico">' + ic('database') + '</span>Import dari Spreadsheet Lama</h3><span class="tag tag-green">SUMBER HANYA DIBACA</span></div><div class="card-b">' +
      '<div class="field"><label>URL atau ID spreadsheet lama</label><input class="input mono" data-src placeholder="https://docs.google.com/spreadsheets/d/…/edit"><span class="hint">Spreadsheet harus dapat dibuka oleh akun Google pemilik Apps Script SI-PRO.</span></div>' +
      '<div class="field" style="margin-top:16px"><label>Data yang diimpor (urutan otomatis: master dulu, baru relasi)</label><div class="sheet-checks">' +
      ['Satker', 'Pelatihan', 'Pengguna', 'Peserta'].map((s) => '<label class="check"><input type="checkbox" data-sh value="' + s + '" checked><span>' + s + '</span></label>').join('') + '</div></div>' +
      '<div class="grid g2" style="margin-top:16px"><label class="check"><input type="checkbox" data-ow><span><b>Timpa data yang sudah ada</b><br><small class="muted">Default: hanya menambah & mengisi kolom kosong</small></span></label>' +
      '<label class="check"><input type="checkbox" data-adm><span><b>Ikutkan akun Admin lama</b><br><small class="muted">Default: akun Admin tidak diimpor</small></span></label></div>' +
      '<div class="field" style="margin-top:16px"><label>Password awal akun impor <span class="lbl-sm" style="margin-left:auto">Opsional</span></label><input class="input mono" data-defpwd placeholder="mis. Diklat2026" autocomplete="off"><span class="hint">Dipakai untuk akun Pengguna baru yang tidak punya kolom Password. Wajib diganti saat login pertama.</span></div>' +
      '<div style="display:flex;gap:10px;margin-top:18px;flex-wrap:wrap"><button class="btn" data-run="dry">' + ic('scan') + 'Pindai (Dry-run)</button><button class="btn btn-navy" data-run="real">' + ic('play') + 'Jalankan Import</button></div>' +
      '<div data-res="sheet"></div></div></div>' +
      '<div class="card"><div class="card-h"><h3><span class="ico">' + ic('list-checks') + '</span>Alur Migrasi Aman</h3></div><div class="card-b"><ol class="steps">' +
      '<li><span>Tempel URL spreadsheet lama, tekan <b>Pindai</b>. Tidak ada data yang ditulis.</span></li><li>Periksa angka Ditambah/Diperbarui/Dilewati dan semua peringatan.</li>' +
      '<li><span>Tekan <b>Jalankan Import</b>. Aman diulang: data yang sama tidak menjadi ganda.</span></li><li>Cek Data Peserta, Satker &amp; Pengguna. Uji masuk dengan 1 akun petugas.</li>' +
      '<li><span>Tepat sebelum pindah penuh: <b>Jalankan Import sekali lagi</b> (delta sync) untuk menangkap data terbaru.</span></li></ol>' +
      '<div class="alert alert-blue" style="margin:16px 0 0">' + ic('info') + '<div>Kolom dibaca berdasarkan <strong>nama header</strong>, bukan urutan. Nama umum seperti "NRP", "Nama Satker", "Jenis Pelatihan", "No WA" dikenali otomatis. Satker &amp; Pelatihan boleh berupa nama. NRP yang kehilangan angka 0 di depan dipulihkan otomatis.</div></div></div></div></div>' +
      '<div class="card"><div class="card-h"><h3><span class="ico">' + ic('sheet') + '</span>Import dari Berkas CSV</h3><span class="lbl">Ekspor Excel/Sheets → CSV</span></div><div class="card-b"><div class="grid g3">' +
      '<div class="field"><label>Data tujuan</label><select class="select" data-csvsheet><option>Peserta</option><option>Satker</option><option>Pelatihan</option><option>Pengguna</option></select></div>' +
      '<div class="field"><label>Berkas CSV</label><input type="file" class="input" accept=".csv,text/csv" data-csvfile style="padding-top:8px"></div>' +
      '<div class="field"><label>Templat</label><button class="btn" data-tpl>' + ic('download') + 'Unduh templat CSV</button></div></div>' +
      '<div style="display:flex;gap:10px;margin-top:16px;flex-wrap:wrap"><button class="btn" data-csvrun="dry">' + ic('scan') + 'Pindai CSV</button><button class="btn btn-navy" data-csvrun="real">' + ic('play') + 'Import CSV</button><span class="hint" data-csvinfo style="align-self:center"></span></div>' +
      '<div data-res="csv"></div></div></div>';
    host._built = true;
    let csvRows = null;
    const opts = () => ({ overwrite: $('[data-ow]', host).checked, includeAdmin: $('[data-adm]', host).checked, defaultPassword: $('[data-defpwd]', host).value.trim() });
    host.addEventListener('click', async (e) => {
      const b = e.target.closest('[data-run]');
      if (b) {
        const src = $('[data-src]', host).value.trim(); if (!src) return toast('Tempel URL / ID spreadsheet lama.', 'warn');
        const sheets = $$('[data-sh]:checked', host).map((x) => x.value); if (!sheets.length) return toast('Pilih minimal satu data.', 'warn');
        const real = b.dataset.run === 'real';
        if (real && !(await confirmDlg({ title: 'Jalankan import?', message: 'Data dari spreadsheet lama akan ditulis ke database SI-PRO. Spreadsheet lama tidak diubah. Proses aman diulang.', okText: 'Jalankan' }))) return;
        const done = busyBtn(b, real ? 'Mengimpor…' : 'Memindai…');
        const res = await api('importData', Object.assign({ source: src, sheets, dryRun: !real }, opts()), { read: !real, timeout: 330000 });
        done(); migrasiResult($('[data-res=sheet]', host), res, real);
      }
      if (e.target.closest('[data-tpl]')) {
        const t = { Peserta: ['Nama', 'NRP_NIP', 'Pangkat', 'Jabatan', 'Nama_Satker', 'Nama_Pelatihan'], Satker: ['ID_Satker', 'Nama_Satker', 'Polda', 'Jenis'],
          Pelatihan: ['Nama_Pelatihan', 'Lokasi', 'Tanggal_Mulai', 'Tanggal_Selesai', 'Batas_Kirim'], Pengguna: ['Username', 'Nama', 'Peran', 'Nama_Satker', 'NRP', 'No_HP', 'Jabatan', 'Password'] };
        const ex = { Peserta: ['Herman Sawaki S.H.', "'86041290", 'BRIPKA', 'BA Satreskrim', 'Polres Manokwari', 'Diklat Fungsi Teknis Reserse TA 2026'], Satker: ['SAT-PB-08', 'Ditreskrimum Polda PB', 'Polda Papua Barat', 'Satker Polda'],
          Pelatihan: ['Diklat Fungsi Teknis Reserse TA 2026', 'SPN Polda Papua Barat', '24/11/2026', '05/12/2026', '22/11/2026'], Pengguna: ['polres.telukwondama', 'Bripka Daniel Wanggai', 'Petugas', 'Polres Teluk Wondama', "'89030114", "'081248221234", 'Bag SDM', 'Wondama2026'] };
        const sh = $('[data-csvsheet]', host).value;
        downloadBlob(new Blob(['﻿' + t[sh].join(',') + '\r\n' + ex[sh].map((v) => /,/.test(v) ? '"' + v + '"' : v).join(',') + '\r\n'], { type: 'text/csv' }), 'templat-' + sh.toLowerCase() + '.csv');
      }
      const c = e.target.closest('[data-csvrun]');
      if (c) {
        if (!csvRows) return toast('Pilih berkas CSV terlebih dahulu.', 'warn');
        const real = c.dataset.csvrun === 'real';
        if (real && !(await confirmDlg({ title: 'Import CSV?', message: csvRows.length + ' baris akan diproses ke data ' + $('[data-csvsheet]', host).value + '.', okText: 'Import' }))) return;
        const done = busyBtn(c, real ? 'Mengimpor…' : 'Memindai…');
        const rows = csvRows.map((r) => { const o = {}; Object.keys(r).forEach((k) => { o[k] = String(r[k]).replace(/^'/, ''); }); return o; });
        const res = await api('importData', Object.assign({ csv: { sheet: $('[data-csvsheet]', host).value, rows }, dryRun: !real }, opts()), { read: !real, timeout: 330000 });
        done(); migrasiResult($('[data-res=csv]', host), res, real);
      }
    });
    $('[data-csvfile]', host).addEventListener('change', async (e) => {
      const f = e.target.files[0]; csvRows = null; if (!f) return;
      csvRows = parseCsv(await f.text());
      $('[data-csvinfo]', host).textContent = csvRows.length + ' baris terbaca' + (csvRows[0] ? ' · kolom: ' + Object.keys(csvRows[0]).join(', ') : '');
    });
  },

  /* ── Log ── */
  log(host) {
    if (!host._built) {
      host.innerHTML = '<div class="card fill" data-apc><div class="toolbar"><span class="lbl" style="flex:1">150 aktivitas terakhir (login, input, ubah, hapus, cetak, import)</span><button class="btn" data-ref>' + ic('refresh') + 'Muat ulang</button></div>' +
        '<div class="tbl-wrap"><table class="tbl rtable"><thead><tr><th>Waktu (WIT)</th><th>Pengguna</th><th>Peran</th><th>Aksi</th><th>Detail</th></tr></thead><tbody data-rows><tr><td colspan="5"><div class="empty"><span class="spin"></span></div></td></tr></tbody></table></div></div>';
      host._built = true;
      $('[data-ref]', host).addEventListener('click', () => loadLogs(host, true));
      loadLogs(host, false);
    }
  }
};

async function loadLogs(host, force) {
  if (MasterPg.logs && !force) return renderLogs(host);
  const btn = $('[data-ref]', host), done = busyBtn(btn);
  const res = await api('logs', { limit: 150 });
  done();
  if (!res.success) { $('[data-rows]', host).innerHTML = '<tr><td colspan="5"><div class="empty">' + esc(res.message) + '</div></td></tr>'; return; }
  MasterPg.logs = res.data; renderLogs(host);
}
function renderLogs(host) {
  const col = (a) => /HAPUS|DITOLAK|SLOW/.test(a) ? 'tag-red' : /TAMBAH|LOGIN$|IMPORT/.test(a) ? 'tag-green' : /UBAH|UNGGAH/.test(a) ? 'tag-amber' : 'tag-blue';
  $('[data-rows]', host).innerHTML = MasterPg.logs.length ? MasterPg.logs.map((l) =>
    '<tr><td data-l="Waktu" class="mono-n" style="font-size:12.5px;white-space:nowrap">' + fmtWaktu(l.waktu) + '</td><td class="main" style="word-break:break-all">' + esc(l.user) + '</td>' +
    '<td data-l="Peran">' + esc(l.peran) + '</td><td data-l="Aksi"><span class="tag ' + col(l.aksi) + '">' + esc(l.aksi) + '</span></td><td data-l="Detail" style="font-size:12.5px;color:var(--ink-2);word-break:break-word">' + esc(l.detail) + '</td></tr>').join('')
    : '<tr><td colspan="5"><div class="empty">Belum ada aktivitas tercatat.</div></td></tr>';
}

function migrasiResult(box, res, real) {
  if (!res.success) { box.innerHTML = '<div class="alert alert-red" style="margin-top:16px">' + ic('alert-circle') + '<div><b>GAGAL</b>' + esc(res.message) + '</div></div>'; return; }
  const r = res.data, rows = Object.keys(r.report).map((k) => { const x = r.report[k]; return '<tr><td class="main"><b>' + k + '</b></td><td data-l="Di sumber" class="c mono-n">' + x.source + '</td><td data-l="Ditambah" class="c mono-n c-green" style="font-weight:700">' + x.inserted + '</td><td data-l="Diperbarui" class="c mono-n c-amber">' + x.updated + '</td><td data-l="Dilewati" class="c mono-n">' + x.skipped + '</td></tr>'; }).join('');
  box.innerHTML = '<div class="alert ' + (real ? 'alert-green' : 'alert-blue') + '" style="margin-top:16px">' + ic(real ? 'check-circle' : 'scan') + '<div><b>' + (real ? 'IMPORT SELESAI' : 'HASIL PEMINDAIAN (BELUM DITULIS)') + '</b>Sumber: ' + esc(r.source.name) + '</div></div>' +
    '<div class="tbl-wrap" style="border:1px solid var(--line);border-radius:8px"><table class="tbl rtable"><thead><tr><th>Data</th><th class="c">Di sumber</th><th class="c">Ditambah</th><th class="c">Diperbarui</th><th class="c">Dilewati</th></tr></thead><tbody>' + rows + '</tbody></table></div>' +
    (r.warnings.length ? '<ul class="warn-list">' + r.warnings.map((w) => '<li>' + ic('alert-triangle') + '<span>' + esc(w) + '</span></li>').join('') + (r.moreWarnings ? '<li>' + ic('info') + '<span>+' + r.moreWarnings + ' peringatan lainnya</span></li>' : '') + '</ul>' : '');
  if (real) { toast('Import selesai. Data diperbarui.', 'success'); Data.sync(true); }
}

/* ── Modal formulir master ── */
function genPassword() {
  const ch = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz', dg = '23456789', a = new Uint32Array(10);
  crypto.getRandomValues(a);
  let s = ''; for (let i = 0; i < 8; i++) s += (i === 4 || i === 6 ? dg[a[i] % dg.length] : ch[a[i] % ch.length]);
  return s + dg[a[8] % dg.length];
}
function suggestUsername(nama, idSatker) {
  const s = D.sat(idSatker);
  if (s) return s.Nama_Satker.toLowerCase().replace(/^polresta\s+/, 'polresta.').replace(/^polres\s+/, 'polres.').replace(/\s+/g, '').replace(/[^a-z0-9._-]/g, '').slice(0, 30);
  return String(nama || '').toLowerCase().replace(/,.*$/, '').split(/\s+/).filter(Boolean).slice(-2).join('.').replace(/[^a-z0-9._-]/g, '').slice(0, 30);
}
/** Slip akun: tampilkan username & password sekali untuk diserahkan ke petugas. */
function credentialSlip(u, pwd, title) {
  const txt = 'Akun SI-PRO\nAlamat: ' + location.origin + location.pathname + '\nUsername: ' + u.Username + '\nPassword sementara: ' + pwd +
    '\n\nSaat login pertama Anda akan diminta membuat password baru. Jangan bagikan password kepada orang lain.';
  const wa = u.No_HP ? D.waLink(u.No_HP, txt) : '';
  const m = modal({ title: title || 'Akun Siap Diserahkan', icon: 'shield-check', cls: 'sm', noFocus: true, sticky: true,
    body: '<div class="alert alert-green" style="margin-bottom:14px">' + ic('check-circle') + '<div>Catat atau kirim sekarang — password ini <b style="display:inline;font-family:var(--sans);letter-spacing:0">tidak dapat dilihat lagi</b> setelah jendela ini ditutup.</div></div>' +
      '<dl class="detail-grid" style="grid-template-columns:130px 1fr"><dt>Nama</dt><dd>' + esc(u.Nama) + '</dd><dt>Username</dt><dd class="mono" style="font-size:16px;font-weight:700">' + esc(u.Username) + '</dd>' +
      '<dt>Password sementara</dt><dd class="mono" style="font-size:16px;font-weight:700;color:var(--blue)">' + esc(pwd) + '</dd></dl>' +
      '<p class="hint" style="margin:14px 0 0">Petugas wajib membuat password baru saat login pertama.</p>',
    foot: (wa ? '<a class="btn act-wa" href="' + wa + '" target="_blank" rel="noopener">' + ic('message') + 'Kirim via WhatsApp</a>' : '') +
      '<button class="btn" data-copy>' + ic('copy') + 'Salin</button><button class="btn btn-navy" data-x>Selesai</button>' });
  $('[data-copy]', m.el).addEventListener('click', () => { (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).then(() => toast('Detail akun disalin.', 'info')).catch(() => toast('Salin manual dari layar.', 'warn')); });
}
function resetPwdModal(u) {
  const pwd = genPassword();
  const m = modal({ title: 'Reset Password', icon: 'lock', cls: 'sm',
    body: '<p style="margin:0 0 14px">Buat password sementara baru untuk <b>' + esc(u.Nama) + '</b> (<span class="mono">' + esc(u.Username) + '</span>). Sesi aktifnya akan langsung keluar dan ia wajib membuat password baru saat login.</p>' +
      '<div class="field"><label>Password sementara</label><div class="pwd-gen"><input class="input mono" data-p value="' + esc(pwd) + '" autocomplete="off"><button type="button" class="btn" data-gen title="Buat acak">' + ic('refresh') + '</button></div><span class="hint">Min. 8 karakter, berisi huruf &amp; angka</span></div>',
    foot: '<button class="btn" data-x>Batal</button><button class="btn btn-danger" data-save>' + ic('lock') + 'Reset Password</button>' });
  $('[data-gen]', m.el).addEventListener('click', () => { $('[data-p]', m.el).value = genPassword(); });
  $('[data-save]', m.el).addEventListener('click', async (e) => {
    const p = $('[data-p]', m.el).value.trim();
    const done = busyBtn(e.currentTarget, 'Memproses…'); m.busy(true);
    const res = await api('savePengguna', Object.assign({}, u, { Password: p, WajibGanti: true }));
    done(); m.busy(false);
    if (!res.success) return toast(res.message, 'error');
    m.close(); Data.sync(true); credentialSlip(u, p, 'Password Berhasil Di-reset');
  });
}

function userModal(u) {
  const edit = !!u; u = u || { Nama: '', Username: '', Email: '', Peran: 'Petugas', ID_Satker: '', NRP: '', No_HP: '', Jabatan: '', Status: 'Aktif' };
  let peran = u.Peran, status = u.Status, unameTouched = edit;
  const pwd0 = edit ? '' : genPassword();
  const m = modal({ title: edit ? 'Ubah Akun Pengguna' : 'Registrasi Akun Petugas Baru', icon: 'user-plus',
    body: '<form data-f class="grid" novalidate autocomplete="off">' +
      '<div class="field"><label>NAMA LENGKAP &amp; GELAR<span class="req">*</span><span class="lbl-sm" style="margin-left:auto">Format resmi</span></label><input class="input mono" name="Nama" value="' + esc(u.Nama) + '" placeholder="Bripka Nama Lengkap, S.H."></div>' +
      '<div class="field"><label>PERAN PENGGUNA<span class="req">*</span></label><div class="seg" data-seg="peran"><button type="button" data-v="Admin Induk">Admin Induk</button><button type="button" data-v="Petugas">Petugas Satker</button></div></div>' +
      '<div class="field" data-satf><label>PENUGASAN SATKER<span class="req">*</span></label><select class="select" name="ID_Satker">' + satOptions(u.ID_Satker, '', '— Pilih Satker / Polres —', true) + '</select></div>' +
      '<div class="grid g2"><div class="field"><label>USERNAME<span class="req">*</span></label><input class="input mono" name="Username" value="' + esc(u.Username) + '" placeholder="mis. polres.manokwari" autocapitalize="none" spellcheck="false" maxlength="30"><span class="hint">Huruf kecil/angka/titik, tanpa spasi</span></div>' +
      (edit ? '<div class="field"><label>PASSWORD &amp; FOTO</label><div style="display:flex;gap:8px"><button type="button" class="btn" data-reset style="height:42px;flex:1">' + ic('lock') + 'Reset password…</button><button type="button" class="btn" data-foto style="height:42px">' + ic('users') + 'Foto</button></div><span class="hint">' + (u.Ada_Password ? (u.Wajib_Ganti ? 'Menunggu petugas membuat password baru' : 'Password sudah dibuat petugas') : 'Belum ada password') + '</span></div>'
        : '<div class="field"><label>PASSWORD AWAL<span class="req">*</span></label><div class="pwd-gen"><input class="input mono" name="Password" value="' + esc(pwd0) + '" autocomplete="new-password"><button type="button" class="btn" data-gen title="Buat acak">' + ic('refresh') + '</button></div><span class="hint">Wajib diganti petugas saat login pertama</span></div>') + '</div>' +
      '<div class="grid g2"><div class="field"><label>NRP</label><input class="input mono" name="NRP" value="' + esc(u.NRP) + '" inputmode="numeric" maxlength="18"></div>' +
      '<div class="field"><label>NO. HP / WHATSAPP</label><input class="input mono" name="No_HP" value="' + esc(u.No_HP) + '" inputmode="tel" placeholder="08xxxxxxxxxx"></div></div>' +
      '<div class="grid g2"><div class="field"><label>JABATAN</label><input class="input" name="Jabatan" value="' + esc(u.Jabatan) + '" placeholder="Mis. Bag SDM / Operator"></div>' +
      '<div class="field"><label>EMAIL <span class="lbl-sm" style="margin-left:auto">Opsional</span></label><input class="input mono" name="Email" type="email" value="' + esc(u.Email) + '" placeholder="untuk kontak saja"></div></div>' +
      '<div class="field"><label>STATUS AKUN</label><div class="seg" data-seg="status"><button type="button" data-v="Aktif">Aktif</button><button type="button" data-v="Nonaktif">Nonaktif</button></div></div>' +
      '<div class="alert alert-blue" style="margin:0">' + ic('lock') + '<div class="mono" style="font-size:12px">Password disimpan terenkripsi (hash). Admin tidak dapat melihat password petugas — hanya dapat me-reset.</div></div></form>',
    foot: '<button class="btn btn-lg" data-x>Batal</button><button class="btn btn-navy btn-lg" data-save>' + ic('save') + 'Simpan Akun</button>' });
  const f = $('[data-f]', m.el), un = $('[name=Username]', f);
  const segs = () => {
    $$('[data-seg=peran] button', m.el).forEach((b) => { b.classList.toggle('on', b.dataset.v === peran); b.innerHTML = (b.dataset.v === peran ? ic('check') : '') + (b.dataset.v === 'Petugas' ? 'Petugas Satker' : 'Admin Induk'); });
    $$('[data-seg=status] button', m.el).forEach((b) => b.classList.toggle('on', b.dataset.v === status));
    $('[data-satf]', m.el).hidden = peran !== 'Petugas';
  };
  const autoName = () => { if (!unameTouched) un.value = suggestUsername($('[name=Nama]', f).value, peran === 'Petugas' ? $('[name=ID_Satker]', f).value : ''); };
  segs();
  un.addEventListener('input', () => { unameTouched = true; un.value = un.value.toLowerCase().replace(/\s+/g, ''); });
  $('[name=ID_Satker]', f).addEventListener('change', autoName);
  $('[name=Nama]', f).addEventListener('input', autoName);
  const g = $('[data-gen]', m.el); if (g) g.addEventListener('click', () => { $('[name=Password]', f).value = genPassword(); });
  const rs = $('[data-reset]', m.el); if (rs) rs.addEventListener('click', () => { m.close(); resetPwdModal(u); });
  const fo = $('[data-foto]', m.el); if (fo) fo.addEventListener('click', () => { m.close(); fotoProfilModal(u); });
  m.el.addEventListener('click', (e) => { const b = e.target.closest('[data-seg] button'); if (!b) return; if (b.parentNode.dataset.seg === 'peran') peran = b.dataset.v; else status = b.dataset.v; segs(); autoName(); });
  const save = async () => {
    const data = Object.fromEntries(new FormData(f).entries());
    Object.assign(data, { Peran: peran, Status: status, ID_Pengguna: u.ID_Pengguna || '', Username: (data.Username || '').trim().toLowerCase() });
    if (!data.Nama.trim() || !data.Username) return toast('Nama dan username wajib diisi.', 'error');
    if (peran === 'Petugas' && !data.ID_Satker) return toast('Pilih Satker penugasan petugas.', 'error');
    const done = busyBtn($('[data-save]', m.el), 'Menyimpan…'); m.busy(true);
    const res = await api('savePengguna', data);
    done(); m.busy(false);
    if (!res.success) return toast(res.message, 'error');
    m.close(); Data.sync(true);
    if (!edit) credentialSlip(data, data.Password, 'Akun Berhasil Dibuat'); else toast(res.message);
  };
  $('[data-save]', m.el).addEventListener('click', save);
  f.addEventListener('submit', (e) => { e.preventDefault(); save(); });
}

function satkerModal(s) {
  const edit = !!s; s = s || { ID_Satker: '', Nama_Satker: '', Polda: MasterPg.f.polda || POLDA[0], Status: 'Aktif' };
  const m = modal({ title: edit ? 'Ubah Satker' : 'Tambah Satker / Polres', icon: 'building', cls: 'sm',
    body: '<form data-f class="grid" novalidate><div class="field"><label>Nama Satker / Polres<span class="req">*</span></label><input class="input" name="Nama_Satker" value="' + esc(s.Nama_Satker) + '" placeholder="Mis. Ditreskrimum Polda PB"></div>' +
      '<div class="grid g2"><div class="field"><label>Polda<span class="req">*</span></label><select class="select" name="Polda">' + POLDA.map((p) => '<option' + (p === s.Polda ? ' selected' : '') + '>' + p + '</option>').join('') + '</select></div>' +
      '<div class="field"><label>Jenis<span class="req">*</span></label><select class="select" name="Jenis">' + JENIS_SATKER.map((j) => '<option' + (j === (s.Jenis || 'Satker Polda') ? ' selected' : '') + '>' + j + '</option>').join('') + '</select></div></div>' +
      '<div class="field"><label>ID Satker ' + (edit ? ic('lock', 'lock-ic') : '<span class="lbl-sm" style="margin-left:auto">Opsional</span>') + '</label><input class="input mono" name="ID_Satker" value="' + esc(s.ID_Satker) + '"' + (edit ? ' readonly' : ' placeholder="Kosongkan = otomatis (SAT-PB-xx)"') + ' style="text-transform:uppercase"></div>' +
      '<div class="field"><label>Status</label><select class="select" name="Status"><option' + (s.Status !== 'Nonaktif' ? ' selected' : '') + '>Aktif</option><option' + (s.Status === 'Nonaktif' ? ' selected' : '') + '>Nonaktif</option></select><span class="hint">Satker Nonaktif tidak dihitung dalam "Belum Mengirim"</span></div></form>',
    foot: '<button class="btn" data-x>Batal</button><button class="btn btn-navy" data-save>' + ic('save') + 'Simpan</button>' });
  const save = async () => {
    const data = Object.fromEntries(new FormData($('[data-f]', m.el)).entries()); data._edit = edit;
    const done = busyBtn($('[data-save]', m.el), 'Menyimpan…'); m.busy(true);
    const res = await api('saveSatker', data); done(); m.busy(false);
    if (!res.success) return toast(res.message, 'error');
    m.close(); toast(res.message); Data.sync(true);
  };
  $('[data-save]', m.el).addEventListener('click', save);
  $('[data-f]', m.el).addEventListener('submit', (e) => { e.preventDefault(); save(); });
}

function pelatihanModal(p) {
  const edit = !!p; p = p || { Nama_Pelatihan: '', Lokasi: 'SPN Polda Papua Barat', Tanggal_Mulai: '', Tanggal_Selesai: '', Batas_Kirim: '', Keterangan: '', Status: 'Draft' };
  const m = modal({ title: edit ? 'Ubah Pelatihan' : 'Pelatihan Baru (Langkah 1 dari 3)', icon: 'graduation',
    body: '<form data-f class="grid" novalidate><div class="field"><label>Jenis / nama pelatihan<span class="req">*</span></label><input class="input" name="Nama_Pelatihan" value="' + esc(p.Nama_Pelatihan) + '" placeholder="Mis. Diklat Fungsi Teknis Reserse TA 2026"></div>' +
      '<div class="field"><label>Tempat pelaksanaan<span class="req">*</span></label><input class="input" name="Lokasi" value="' + esc(p.Lokasi || 'SPN Polda Papua Barat') + '"></div>' +
      '<div class="grid g3"><div class="field"><label>Tanggal mulai<span class="req">*</span></label><input class="input mono" type="date" name="Tanggal_Mulai" value="' + esc(p.Tanggal_Mulai) + '"></div>' +
      '<div class="field"><label>Tanggal selesai<span class="req">*</span></label><input class="input mono" type="date" name="Tanggal_Selesai" value="' + esc(p.Tanggal_Selesai) + '"></div>' +
      '<div class="field"><label>Batas pendaftaran<span class="req">*</span></label><input class="input mono" type="date" name="Batas_Kirim" value="' + esc(p.Batas_Kirim) + '"><span class="hint">Terkunci pukul 23:59 WIT</span></div></div>' +
      '<div class="field"><label>Keterangan</label><input class="input" name="Keterangan" value="' + esc(p.Keterangan) + '" placeholder="Opsional, mis. Angkatan II / syarat khusus"></div>' +
      (edit ? '' : '<div class="alert alert-blue" style="margin:0">' + ic('info') + '<div>Pelatihan disimpan sebagai <b style="display:inline;letter-spacing:0">Draft</b>. Langkah berikutnya: atur kuota Satker, lalu Bagikan.</div></div>') + '</form>',
    foot: '<button class="btn" data-x>Batal</button><button class="btn btn-navy" data-save>' + ic('save') + (edit ? 'Simpan' : 'Simpan &amp; Atur Kuota') + '</button>' });
  const save = async () => {
    const data = Object.fromEntries(new FormData($('[data-f]', m.el)).entries()); data.ID_Pelatihan = p.ID_Pelatihan || ''; data.Status = p.Status;
    if (!data.Nama_Pelatihan.trim() || !data.Tanggal_Mulai || !data.Tanggal_Selesai || !data.Batas_Kirim) return toast('Nama, tanggal pelaksanaan, dan batas pendaftaran wajib diisi.', 'error');
    const done = busyBtn($('[data-save]', m.el), 'Menyimpan…'); m.busy(true);
    const res = await api('savePelatihan', data); done(); m.busy(false);
    if (!res.success) return toast(res.message, 'error');
    m.close(); toast(res.message);
    const r = await Data.sync(true);
    if (!edit && r.success) { const np = D.pel(res.data.ID_Pelatihan); if (np) alokasiModal(np); }
  };
  $('[data-save]', m.el).addEventListener('click', save);
  $('[data-f]', m.el).addEventListener('submit', (e) => { e.preventDefault(); save(); });
}

/** Langkah 2: tunjuk Satker Polda & Polres dan tentukan kuota masing-masing. */
function alokasiModal(p) {
  const al = Object.assign({}, D.alok(p.ID_Pelatihan));
  const terisi = {}; D.pesertaOf(p.ID_Pelatihan).forEach((x) => { terisi[x.ID_Satker] = (terisi[x.ID_Satker] || 0) + 1; });
  const sats = D.d.satker.filter((s) => s.Status !== 'Nonaktif' || al[s.ID_Satker]).sort(D.sortSat);
  let q = '';
  const m = modal({ title: 'Atur Kuota — ' + p.Nama_Pelatihan, icon: 'users', cls: 'wide', noFocus: true, sticky: true,
    body: '<div class="quick" style="margin-bottom:12px"><b style="font-size:13px">Isi cepat:</b>' +
      '<span>Semua Polres</span><input class="input" type="number" min="0" data-qv="Polres" value="2"><button class="btn btn-sm" data-qa="Polres">Terapkan</button>' +
      '<span style="margin-left:8px">Semua Satker Polda</span><input class="input" type="number" min="0" data-qv="Satker Polda" value="1"><button class="btn btn-sm" data-qa="Satker Polda">Terapkan</button>' +
      '<button class="btn btn-sm act-del" data-clear style="margin-left:auto">Kosongkan semua</button></div>' +
      '<div class="with-ic" style="margin-bottom:10px">' + ic('search') + '<input class="input" data-s placeholder="Cari Satker…"></div>' +
      '<div class="tbl-wrap" style="border:1px solid var(--line);border-radius:8px;max-height:52vh;overflow:auto"><table class="tbl"><thead><tr><th>Satker / Polres</th><th>Jenis</th><th>Petugas PIC</th><th class="c">Terdaftar</th><th class="c">Kuota</th></tr></thead><tbody data-rows></tbody></table></div>',
    foot: '<div class="alok-sum" style="margin-right:auto" data-sum></div><button class="btn" data-x>Batal</button><button class="btn btn-navy" data-save>' + ic('save') + 'Simpan Kuota</button>' +
      (p.Status === 'Draft' ? '<button class="btn btn-primary" data-save-share>' + ic('send') + 'Simpan &amp; Bagikan</button>' : '') });
  const sum = () => {
    const ids = Object.keys(al).filter((k) => al[k] > 0), tot = ids.reduce((s, k) => s + al[k], 0);
    const pb = ids.filter((k) => (D.sat(k) || {}).Polda === POLDA[0]).length;
    $('[data-sum]', m.el).innerHTML = '<span>Satker ditunjuk: <b>' + ids.length + '</b> <small class="muted">(PB ' + pb + ' · PBD ' + (ids.length - pb) + ')</small></span><span>Total kuota: <b>' + tot + '</b> orang</span>';
  };
  const rows = () => {
    const ql = q.toLowerCase();
    $('[data-rows]', m.el).innerHTML = POLDA.map((pd) => {
      const g = sats.filter((s) => s.Polda === pd && (!ql || s.Nama_Satker.toLowerCase().includes(ql))); if (!g.length) return '';
      return '<tr class="grp ' + (pd === POLDA[1] ? 'pbd' : '') + '"><td colspan="5">' + esc(pd) + '</td></tr>' + g.map((s) => {
        const k = al[s.ID_Satker] || 0, t = terisi[s.ID_Satker] || 0, pic = D.pic(s.ID_Satker);
        return '<tr><td><div class="nm">' + esc(s.Nama_Satker) + '</div><div class="sub">' + esc(s.ID_Satker) + '</div></td><td>' + esc(s.Jenis) + '</td>' +
          '<td>' + (pic.length ? esc(pic[0].Nama) : '<span class="tag tag-amber">BELUM ADA AKUN</span>') + '</td><td class="c mono-n">' + t + '</td>' +
          '<td class="c"><input class="input kuota-in ' + (k ? 'on' : '') + '" type="number" min="' + t + '" max="999" data-k="' + esc(s.ID_Satker) + '" value="' + (k || '') + '" placeholder="0" aria-label="Kuota ' + esc(s.Nama_Satker) + '"></td></tr>';
      }).join('');
    }).join('');
    sum();
  };
  rows();
  m.el.addEventListener('input', (e) => {
    const k = e.target.dataset.k;
    if (k) { const v = Math.max(0, parseInt(e.target.value, 10) || 0); al[k] = v; e.target.classList.toggle('on', v > 0); sum(); }
    if (e.target.matches('[data-s]')) { q = e.target.value; rows(); }
  });
  m.el.addEventListener('click', (e) => {
    const qa = e.target.closest('[data-qa]');
    if (qa) { const jn = qa.dataset.qa, v = Math.max(0, parseInt($('[data-qv="' + jn + '"]', m.el).value, 10) || 0); sats.filter((s) => s.Jenis === jn && s.Status !== 'Nonaktif').forEach((s) => { al[s.ID_Satker] = Math.max(v, terisi[s.ID_Satker] || 0); }); rows(); }
    if (e.target.closest('[data-clear]')) { Object.keys(al).forEach((k) => { al[k] = terisi[k] || 0; }); rows(); }
  });
  const save = async (share, btn) => {
    const items = Object.keys(al).map((k) => ({ ID_Satker: k, Kuota: al[k] || 0 }));
    if (!items.some((i) => i.Kuota > 0)) return toast('Tunjuk minimal satu Satker dengan kuota lebih dari 0.', 'error');
    const done = busyBtn(btn, 'Menyimpan…'); m.busy(true);
    const res = await api('saveAlokasi', { ID_Pelatihan: p.ID_Pelatihan, items });
    done(); m.busy(false);
    if (!res.success) return toast(res.message, 'error');
    m.close(); toast(res.message);
    await Data.sync(true);
    if (share) bagikanFlow(D.pel(p.ID_Pelatihan) || p);
  };
  $('[data-save]', m.el).addEventListener('click', (e) => save(false, e.currentTarget));
  const ss = $('[data-save-share]', m.el); if (ss) ss.addEventListener('click', (e) => save(true, e.currentTarget));
}

/** Langkah 3: bagikan ke Satker yang ditunjuk, lalu kirim pemberitahuan. */
async function bagikanFlow(p) {
  const al = D.alok(p.ID_Pelatihan), ids = Object.keys(al);
  if (!ids.length) { toast('Atur kuota Satker terlebih dahulu.', 'warn'); return alokasiModal(p); }
  const tot = ids.reduce((s, k) => s + al[k], 0), tanpaPic = ids.filter((k) => !D.pic(k).length).length;
  const ok = await confirmDlg({ title: 'Bagikan ke ' + ids.length + ' Satker?', okText: 'Bagikan Sekarang',
    message: '<b>' + esc(p.Nama_Pelatihan) + '</b><br>' + esc(p.Lokasi || 'SPN Polda Papua Barat') + ' · ' + fmtTgl(p.Tanggal_Mulai, true) + ' – ' + fmtTgl(p.Tanggal_Selesai, true) +
      '<br><br>Kuota total <b>' + tot + ' orang</b> untuk <b>' + ids.length + ' Satker</b>. Batas pendaftaran: <b>' + (p.Batas_Kirim ? fmtTgl(p.Batas_Kirim, true) + ' 23:59 WIT' : '—') + '</b>.' +
      (tanpaPic ? '<br><br><span class="c-amber">' + tanpaPic + ' Satker belum punya akun petugas — buatkan di tab Pengguna agar bisa mendaftar.</span>' : '') +
      '<br><br>Setelah dibagikan, petugas Satker langsung melihat pelatihan ini dan dapat mendaftarkan peserta.' });
  if (!ok) return;
  const res = await api('bagikan', { ID_Pelatihan: p.ID_Pelatihan });
  if (!res.success) return toast(res.message, 'error');
  toast(res.message, 'success');
  await Data.sync(true);
  distribusiModal(D.pel(p.ID_Pelatihan) || p);
}

/** Kirim pemberitahuan kuota ke setiap Satker (WhatsApp / salin massal). */
function distribusiModal(p) {
  const al = D.alok(p.ID_Pelatihan), sats = Object.keys(al).map((k) => D.sat(k)).filter(Boolean).sort(D.sortSat);
  const massal = 'PEMBERITAHUAN PELATIHAN — ' + p.Nama_Pelatihan + '\nTempat: ' + (p.Lokasi || 'SPN Polda Papua Barat') + '\nPelaksanaan: ' + fmtTgl(p.Tanggal_Mulai, true) + ' s.d. ' + fmtTgl(p.Tanggal_Selesai, true) +
    (p.Batas_Kirim ? '\nBatas pendaftaran: ' + fmtTgl(p.Batas_Kirim, true) + ' pukul 23:59 WIT' : '') + '\n\nKuota peserta per Satker:\n' +
    sats.map((s, i) => (i + 1) + '. ' + s.Nama_Satker + ' — ' + al[s.ID_Satker] + ' orang').join('\n') +
    '\n\nPendaftaran peserta (beserta SPRIN & SPPD) melalui aplikasi SI-PRO: ' + location.origin + location.pathname;
  const m = modal({ title: 'Kirim Pemberitahuan ke Satker', icon: 'send', cls: 'wide', noFocus: true,
    body: '<div class="alert alert-green">' + ic('check-circle') + '<div><b>' + esc(p.Nama_Pelatihan) + ' sudah dibagikan.</b> Kirim pemberitahuan kuota ke petugas setiap Satker (opsional).</div></div>' +
      '<div class="tbl-wrap" style="border:1px solid var(--line);border-radius:8px;max-height:48vh;overflow:auto"><table class="tbl"><thead><tr><th>Satker</th><th class="c">Kuota</th><th>Petugas PIC</th><th class="r">Kirim</th></tr></thead><tbody>' +
      sats.map((s) => {
        const u = D.pic(s.ID_Satker)[0], wa = u && u.No_HP ? D.waLink(u.No_HP, D.pesanBagikan(s, p)) : '';
        return '<tr><td><div class="nm">' + esc(s.Nama_Satker) + '</div><div class="sub">' + esc(s.Polda) + ' · ' + esc(s.Jenis) + '</div></td><td class="c mono-n" style="font-weight:700">' + al[s.ID_Satker] + '</td>' +
          '<td>' + (u ? esc(u.Nama) + (u.No_HP ? '<div class="sub">' + esc(u.No_HP) + '</div>' : '') : '<span class="tag tag-amber">BELUM ADA AKUN</span>') + '</td>' +
          '<td class="r">' + (wa ? '<a class="btn btn-xs act-wa" href="' + wa + '" target="_blank" rel="noopener">' + ic('message') + 'WhatsApp</a>' : '<span class="tag tag-gray">TANPA NO. HP</span>') + '</td></tr>';
      }).join('') + '</tbody></table></div>',
    foot: '<button class="btn" data-copy>' + ic('copy') + 'Salin Pesan Massal</button><button class="btn btn-navy" data-x>Selesai</button>' });
  $('[data-copy]', m.el).addEventListener('click', () => (navigator.clipboard ? navigator.clipboard.writeText(massal) : Promise.reject()).then(() => toast('Pesan disalin. Tempel di grup WhatsApp/Telegram jajaran.', 'success')).catch(() => modal({ title: 'Salin pesan', icon: 'copy', body: '<textarea class="input" rows="14" readonly>' + esc(massal) + '</textarea>' })));
}
