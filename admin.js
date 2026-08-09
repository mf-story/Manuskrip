/* Panel Redaksi — Manuskrip */
(function () {
  'use strict';

  var TOKEN_KEY = 'manuskrip_token';
  var token = localStorage.getItem(TOKEN_KEY) || '';
  var me = null;
  var categories = [];
  var editingId = null; // null = berita baru
  var allArticles = [];

  // ---------- Util ----------
  function $(sel) { return document.querySelector(sel); }
  function el(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  // Ubah body lama (teks polos dgn baris kosong) menjadi HTML paragraf agar bisa disunting di editor.
  function bodyToHtml(body) {
    var s = String(body || '');
    if (/<[a-z][\s\S]*>/i.test(s)) return s;
    return s.split(/\n{2,}/).map(function (p) {
      return '<p>' + esc(p.trim()).replace(/\n/g, '<br>') + '</p>';
    }).join('');
  }
  function fmtDate(iso) {
    if (!iso) return '-';
    var d = new Date(iso);
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  }
  function fmtViews(n) {
    n = n || 0;
    if (n >= 1000) return (n / 1000).toFixed(1).replace('.0', '') + 'rb';
    return String(n);
  }

  var toastTimer;
  function toast(msg, isError) {
    var t = el('toast');
    t.textContent = msg;
    t.className = 'toast' + (isError ? ' error' : '');
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.hidden = true; }, 2600);
  }

  // ---------- API ----------
  function api(path, opts) {
    opts = opts || {};
    var headers = opts.headers || {};
    if (opts.body && typeof opts.body !== 'string') {
      headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(opts.body);
    }
    if (token) headers['Authorization'] = 'Bearer ' + token;
    return fetch('/api/' + path, {
      method: opts.method || 'GET',
      headers: headers,
      body: opts.body,
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (data) {
        if (!r.ok) {
          if (r.status === 401) doLogout(true);
          throw new Error(data.error || ('HTTP ' + r.status));
        }
        return data;
      });
    });
  }

  // ---------- Login ----------
  function showLogin() {
    el('loginScreen').hidden = false;
    el('app').hidden = true;
  }
  function showApp() {
    el('loginScreen').hidden = true;
    el('app').hidden = false;
  }

  function doLogout(silent) {
    token = '';
    me = null;
    localStorage.removeItem(TOKEN_KEY);
    showLogin();
    if (!silent) toast('Anda telah keluar.');
  }

  el('loginForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var errEl = el('loginError');
    errEl.hidden = true;
    api('login', {
      method: 'POST',
      body: { username: el('loginUser').value.trim(), password: el('loginPass').value },
    }).then(function (data) {
      token = data.token;
      me = data.user;
      localStorage.setItem(TOKEN_KEY, token);
      el('loginPass').value = '';
      enterApp();
    }).catch(function (err) {
      errEl.textContent = err.message;
      errEl.hidden = false;
    });
  });

  // ---------- App init ----------
  function enterApp() {
    showApp();
    el('userName').textContent = me ? me.name : '';
    el('usersTabBtn').hidden = !(me && me.role === 'admin');
    loadCategories().then(function () {
      loadDashboard();
      loadArticles();
    });
  }

  function loadCategories() {
    return api('categories').then(function (data) {
      categories = data.categories || [];
      // Filter kategori di daftar berita
      var filter = el('artCatFilter');
      filter.innerHTML = '<option value="">Semua kategori</option>' +
        categories.map(function (c) { return '<option value="' + esc(c) + '">' + esc(c) + '</option>'; }).join('');
      // Daftar centang kategori di editor (bisa pilih lebih dari satu)
      el('fCategories').innerHTML = categories.map(function (c) {
        return '<label><input type="checkbox" value="' + esc(c) + '" /> ' + esc(c) + '</label>';
      }).join('');
      el('fCategories').addEventListener('change', function (e) {
        var lab = e.target.closest('label');
        if (lab) lab.classList.toggle('on', e.target.checked);
      });
    });
  }

  function setCategories(cats) {
    cats = cats || [];
    Array.prototype.forEach.call(el('fCategories').querySelectorAll('label'), function (lab) {
      var cb = lab.querySelector('input');
      cb.checked = cats.indexOf(cb.value) !== -1;
      lab.classList.toggle('on', cb.checked);
    });
  }
  function getCategories() {
    return Array.prototype.map.call(
      el('fCategories').querySelectorAll('input:checked'), function (cb) { return cb.value; });
  }

  // ---------- Tabs ----------
  var tabs = document.querySelectorAll('.atab');
  Array.prototype.forEach.call(tabs, function (btn) {
    btn.addEventListener('click', function () { switchTab(btn.getAttribute('data-tab')); });
  });
  function switchTab(name) {
    Array.prototype.forEach.call(tabs, function (b) {
      b.classList.toggle('active', b.getAttribute('data-tab') === name);
    });
    ['dashboard', 'articles', 'editor', 'users'].forEach(function (t) {
      el('tab-' + t).hidden = t !== name;
    });
    if (name === 'dashboard') loadDashboard();
    if (name === 'articles') loadArticles();
    if (name === 'users') loadUsers();
  }

  // ---------- Dashboard ----------
  function loadDashboard() {
    api('stats').then(function (s) {
      el('statCards').innerHTML = [
        card(s.total, 'Total Berita'),
        card(s.published, 'Terbit'),
        card(s.draft, 'Draf'),
        card(s.breaking, 'Terkini'),
        card(fmtViews(s.totalViews), 'Total Dibaca'),
      ].join('');
      renderCatChart(s.byCategory);
    }).catch(function (e) { toast(e.message, true); });

    api('articles?scope=all&sort=newest&limit=6').then(function (data) {
      var arts = data.articles || [];
      el('recentList').innerHTML = arts.map(function (a) {
        return '<li><span class="rl-title">' + esc(a.title) + '</span>' +
          '<span class="rl-meta">' + esc(a.category) + ' · ' + fmtDate(a.createdAt) + '</span></li>';
      }).join('') || '<li class="muted">Belum ada berita.</li>';
    });
  }
  function card(value, label) {
    return '<div class="stat-card"><div class="sc-value">' + esc(value) + '</div>' +
      '<div class="sc-label">' + esc(label) + '</div></div>';
  }
  function renderCatChart(byCat) {
    byCat = byCat || {};
    var entries = Object.keys(byCat).map(function (k) { return [k, byCat[k]]; });
    var max = entries.reduce(function (m, e) { return Math.max(m, e[1]); }, 0) || 1;
    entries.sort(function (a, b) { return b[1] - a[1]; });
    el('catChart').innerHTML = entries.map(function (e) {
      var pct = Math.round((e[1] / max) * 100);
      return '<div class="cat-row"><span>' + esc(e[0]) + '</span>' +
        '<span class="cat-bar-track"><span class="cat-bar-fill" style="width:' + pct + '%"></span></span>' +
        '<span class="cat-count">' + e[1] + '</span></div>';
    }).join('');
  }

  // ---------- Daftar berita ----------
  function loadArticles() {
    return api('articles?scope=all&sort=newest').then(function (data) {
      allArticles = data.articles || [];
      renderArticles();
    }).catch(function (e) { toast(e.message, true); });
  }

  function renderArticles() {
    var q = (el('artSearch').value || '').toLowerCase().trim();
    var cat = el('artCatFilter').value;
    var status = el('artStatusFilter').value;
    var list = allArticles.filter(function (a) {
      var acats = (a.categories && a.categories.length) ? a.categories : [a.category];
      if (cat && acats.indexOf(cat) === -1) return false;
      if (status === 'published' && !a.published) return false;
      if (status === 'draft' && a.published) return false;
      if (q && a.title.toLowerCase().indexOf(q) === -1) return false;
      return true;
    });
    var body = el('artTableBody');
    el('artEmpty').hidden = list.length !== 0;
    body.innerHTML = list.map(function (a) {
      var tags = (a.tags || []).length ? '<div class="t-tags">#' + a.tags.map(esc).join(' #') + '</div>' : '';
      var acats = (a.categories && a.categories.length) ? a.categories : [a.category];
      var catBadges = acats.map(function (c) { return '<span class="badge badge-cat">' + esc(c) + '</span>'; }).join(' ');
      return '<tr>' +
        '<td class="td-title">' + esc(a.title) +
          (a.featured ? ' <span class="badge badge-cat">Utama</span>' : '') +
          (a.breaking ? ' <span class="badge badge-cat">Terkini</span>' : '') + tags + '</td>' +
        '<td>' + catBadges + '</td>' +
        '<td>' + (a.published
          ? '<span class="badge badge-pub">Terbit</span>'
          : '<span class="badge badge-draft">Draf</span>') + '</td>' +
        '<td>' + fmtViews(a.views) + '</td>' +
        '<td>' + fmtDate(a.createdAt) + '</td>' +
        '<td><div class="row-actions">' +
          '<button class="btn btn-ghost btn-sm" data-edit="' + esc(a.id) + '">Ubah</button>' +
          '<button class="btn btn-danger btn-sm" data-del="' + esc(a.id) + '">Hapus</button>' +
        '</div></td>' +
      '</tr>';
    }).join('');
  }

  ['artSearch', 'artCatFilter', 'artStatusFilter'].forEach(function (id) {
    el(id).addEventListener('input', renderArticles);
  });

  el('artTableBody').addEventListener('click', function (e) {
    var editId = e.target.getAttribute('data-edit');
    var delId = e.target.getAttribute('data-del');
    if (editId) openEditor(editId);
    if (delId) deleteArticle(delId);
  });

  function deleteArticle(id) {
    var a = allArticles.filter(function (x) { return x.id === id; })[0];
    if (!confirm('Hapus berita "' + (a ? a.title : '') + '"? Tindakan ini tidak dapat dibatalkan.')) return;
    api('articles/' + id, { method: 'DELETE' }).then(function () {
      toast('Berita dihapus.');
      loadArticles();
      loadDashboard();
    }).catch(function (e) { toast(e.message, true); });
  }

  el('newArtBtn').addEventListener('click', function () { openEditor(null); });

  // ---------- Kelola Pengguna ----------
  function loadUsers() {
    api('users').then(function (data) {
      var users = data.users || [];
      el('userTableBody').innerHTML = users.map(function (u) {
        var self = me && u.id === me.id;
        var roleBadge = '<span class="badge badge-role' + (u.role === 'admin' ? ' admin' : '') + '">' +
          (u.role === 'admin' ? 'Admin' : 'Penulis') + '</span>';
        return '<tr>' +
          '<td class="td-title">' + esc(u.name) + (self ? ' <span class="muted">(Anda)</span>' : '') + '</td>' +
          '<td>' + esc(u.username) + '</td>' +
          '<td>' + roleBadge + '</td>' +
          '<td><div class="row-actions">' +
            '<button class="btn btn-ghost btn-sm" data-pw="' + esc(u.id) + '">Reset Sandi</button>' +
            (self ? '' : '<button class="btn btn-danger btn-sm" data-deluser="' + esc(u.id) + '">Hapus</button>') +
          '</div></td>' +
        '</tr>';
      }).join('') || '<tr><td colspan="4" class="muted">Belum ada pengguna.</td></tr>';
    }).catch(function (e) { toast(e.message, true); });
  }

  el('userForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var errEl = el('userError');
    errEl.hidden = true;
    var payload = {
      name: el('uName').value.trim(),
      username: el('uUsername').value.trim().toLowerCase(),
      role: el('uRole').value,
      password: el('uPassword').value,
    };
    api('users', { method: 'POST', body: payload }).then(function () {
      toast('Pengguna ditambahkan.');
      el('userForm').reset();
      loadUsers();
    }).catch(function (err) {
      errEl.textContent = err.message;
      errEl.hidden = false;
    });
  });

  el('userTableBody').addEventListener('click', function (e) {
    var delId = e.target.getAttribute('data-deluser');
    var pwId = e.target.getAttribute('data-pw');
    if (delId) {
      if (!confirm('Hapus pengguna ini? Tindakan tidak dapat dibatalkan.')) return;
      api('users/' + delId, { method: 'DELETE' }).then(function () {
        toast('Pengguna dihapus.');
        loadUsers();
      }).catch(function (err) { toast(err.message, true); });
    }
    if (pwId) {
      var next = prompt('Kata sandi baru (minimal 6 karakter):');
      if (next === null) return;
      api('users/' + pwId + '/password', { method: 'POST', body: { next: next } }).then(function () {
        toast('Kata sandi diperbarui.');
      }).catch(function (err) { toast(err.message, true); });
    }
  });

  // ---------- Editor ----------
  var currentImage = '';

  function resetEditor() {
    editingId = null;
    currentImage = '';
    el('editorTitle').textContent = 'Tulis Berita Baru';
    el('saveBtn').textContent = 'Terbitkan';
    el('fTitle').value = '';
    el('fExcerpt').value = '';
    el('fBody').innerHTML = '';
    el('fAuthor').value = me ? me.name : '';
    el('fTags').value = '';
    setCategories([categories[0] || '']);
    el('fPublished').checked = true;
    el('fFeatured').checked = false;
    el('fBreaking').checked = false;
    el('fImageUrl').value = '';
    el('editorError').hidden = true;
    renderImgPreview();
  }

  function openEditor(id) {
    if (!id) {
      resetEditor();
      switchTab('editor');
      return;
    }
    api('articles/' + id).then(function (data) {
      var a = data.article;
      editingId = a.id;
      currentImage = a.image || '';
      el('editorTitle').textContent = 'Ubah Berita';
      el('saveBtn').textContent = 'Simpan Perubahan';
      el('fTitle').value = a.title || '';
      el('fExcerpt').value = a.excerpt || '';
      el('fBody').innerHTML = bodyToHtml(a.body || '');
      el('fAuthor').value = a.author || '';
      el('fTags').value = (a.tags || []).join(', ');
      setCategories(a.categories && a.categories.length ? a.categories : [a.category || categories[0]]);
      el('fPublished').checked = !!a.published;
      el('fFeatured').checked = !!a.featured;
      el('fBreaking').checked = !!a.breaking;
      el('fImageUrl').value = /^https?:/.test(currentImage) ? currentImage : '';
      el('editorError').hidden = true;
      renderImgPreview();
      switchTab('editor');
    }).catch(function (e) { toast(e.message, true); });
  }

  function renderImgPreview() {
    var box = el('imgPreview');
    if (currentImage) {
      box.className = 'img-preview';
      box.innerHTML = '<img src="' + esc(currentImage) + '" alt="pratinjau" />';
      el('clearImg').hidden = false;
    } else {
      box.className = 'img-preview empty';
      box.textContent = 'Belum ada gambar';
      el('clearImg').hidden = true;
    }
  }

  el('pickImg').addEventListener('click', function () { el('fImageFile').click(); });
  el('clearImg').addEventListener('click', function () {
    currentImage = '';
    el('fImageUrl').value = '';
    renderImgPreview();
  });
  el('fImageUrl').addEventListener('input', function () {
    var v = el('fImageUrl').value.trim();
    if (v) { currentImage = v; renderImgPreview(); }
  });

  el('fImageFile').addEventListener('change', function () {
    var file = el('fImageFile').files[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) { toast('Ukuran gambar maksimal 8 MB.', true); return; }
    var reader = new FileReader();
    reader.onload = function () {
      api('upload', { method: 'POST', body: { dataUrl: reader.result } }).then(function (data) {
        currentImage = data.path;
        el('fImageUrl').value = '';
        renderImgPreview();
        toast('Gambar diunggah.');
      }).catch(function (e) { toast(e.message, true); });
    };
    reader.readAsDataURL(file);
    el('fImageFile').value = '';
  });

  el('cancelEdit').addEventListener('click', function () { switchTab('articles'); });

  // ---------- Toolbar editor teks kaya ----------
  (function initRte() {
    var tb = el('rteToolbar');
    var ed = el('fBody');
    if (!tb || !ed) return;
    try { document.execCommand('defaultParagraphSeparator', false, 'p'); } catch (e) {}
    // Jaga agar seleksi teks tidak hilang saat menekan tombol toolbar.
    tb.addEventListener('mousedown', function (e) {
      if (e.target.closest('.rte-btn')) e.preventDefault();
    });
    tb.addEventListener('click', function (e) {
      var btn = e.target.closest('.rte-btn');
      if (!btn) return;
      ed.focus();
      if (btn.dataset.block) {
        document.execCommand('formatBlock', false, btn.dataset.block);
      } else if (btn.dataset.cmd === 'createLink') {
        var url = prompt('Masukkan URL tautan:', 'https://');
        if (url) document.execCommand('createLink', false, url);
      } else if (btn.dataset.cmd) {
        document.execCommand(btn.dataset.cmd, false, null);
      }
      updateRteState();
    });
    ['keyup', 'mouseup', 'focus'].forEach(function (ev) {
      ed.addEventListener(ev, updateRteState);
    });
    function updateRteState() {
      tb.querySelectorAll('.rte-btn[data-cmd]').forEach(function (b) {
        var cmd = b.dataset.cmd;
        var on = false;
        try { on = document.queryCommandState(cmd); } catch (e) {}
        b.classList.toggle('active', !!on);
      });
    }
  })();

  el('editorForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var errEl = el('editorError');
    errEl.hidden = true;
    var title = el('fTitle').value.trim();
    if (!title) { errEl.textContent = 'Judul wajib diisi.'; errEl.hidden = false; return; }
    var cats = getCategories();
    if (!cats.length) { errEl.textContent = 'Pilih minimal satu kategori.'; errEl.hidden = false; return; }
    var payload = {
      title: title,
      excerpt: el('fExcerpt').value.trim(),
      body: el('fBody').innerHTML.trim(),
      author: el('fAuthor').value.trim(),
      categories: cats,
      tags: el('fTags').value,
      image: currentImage,
      published: el('fPublished').checked,
      featured: el('fFeatured').checked,
      breaking: el('fBreaking').checked,
    };
    var req = editingId
      ? api('articles/' + editingId, { method: 'PUT', body: payload })
      : api('articles', { method: 'POST', body: payload });
    el('saveBtn').disabled = true;
    req.then(function () {
      el('saveBtn').disabled = false;
      toast(editingId ? 'Perubahan disimpan.' : 'Berita diterbitkan.');
      resetEditor();
      loadArticles();
      loadDashboard();
      switchTab('articles');
    }).catch(function (err) {
      el('saveBtn').disabled = false;
      errEl.textContent = err.message;
      errEl.hidden = false;
    });
  });

  // ---------- Ubah kata sandi ----------
  el('pwBtn').addEventListener('click', function () {
    el('pwCurrent').value = '';
    el('pwNext').value = '';
    el('pwError').hidden = true;
    el('pwModal').hidden = false;
  });
  el('pwCancel').addEventListener('click', function () { el('pwModal').hidden = true; });
  el('pwModal').addEventListener('click', function (e) {
    if (e.target === el('pwModal')) el('pwModal').hidden = true;
  });
  el('pwForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var errEl = el('pwError');
    errEl.hidden = true;
    api('password', {
      method: 'POST',
      body: { current: el('pwCurrent').value, next: el('pwNext').value },
    }).then(function () {
      el('pwModal').hidden = true;
      toast('Kata sandi berhasil diubah.');
    }).catch(function (err) {
      errEl.textContent = err.message;
      errEl.hidden = false;
    });
  });

  el('logoutBtn').addEventListener('click', function () { doLogout(false); });

  // ---------- Bootstrap ----------
  function boot() {
    if (!token) { showLogin(); return; }
    api('me').then(function (data) {
      me = data.user;
      enterApp();
    }).catch(function () { doLogout(true); });
  }
  boot();
})();
