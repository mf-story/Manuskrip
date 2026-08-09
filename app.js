/* Manuskrip — logika portal publik */
(function () {
  'use strict';

  var API = '/api';
  var state = {
    category: 'Semua',
    search: '',
    sort: 'newest',
    categories: [],
  };

  // ---------- Util ----------
  function el(id) { return document.getElementById(id); }
  function api(path) {
    return fetch(API + path).then(function (r) {
      if (!r.ok) return r.json().then(function (e) { throw new Error(e.error || 'Gagal'); });
      return r.json();
    });
  }
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
  function fmtDate(iso) {
    try {
      return new Date(iso).toLocaleDateString('id-ID', {
        day: 'numeric', month: 'long', year: 'numeric',
      });
    } catch (e) { return ''; }
  }
  function timeAgo(iso) {
    var diff = Date.now() - new Date(iso).getTime();
    var m = Math.floor(diff / 60000);
    if (m < 1) return 'baru saja';
    if (m < 60) return m + ' menit lalu';
    var h = Math.floor(m / 60);
    if (h < 24) return h + ' jam lalu';
    var d = Math.floor(h / 24);
    if (d < 7) return d + ' hari lalu';
    return fmtDate(iso);
  }
  function fmtViews(n) {
    if (n >= 1000) return (n / 1000).toFixed(1).replace('.0', '') + 'rb';
    return String(n);
  }
  function thumb(a, big) {
    if (a.image) return '<img src="' + esc(a.image) + '" alt="' + esc(a.title) + '" loading="lazy" />';
    var letter = (a.category || 'W').charAt(0).toUpperCase();
    return '<div class="thumb-fallback">' + esc(letter) + '</div>';
  }

  // ---------- Tanggal & tema ----------
  function initChrome() {
    var now = new Date();
    el('todayDate').textContent = now.toLocaleDateString('id-ID', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    });
    el('year').textContent = now.getFullYear();

    var saved = localStorage.getItem('manuskrip_theme');
    if (saved === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
    updateThemeIcon();
    el('themeToggle').addEventListener('click', function () {
      var isDark = document.documentElement.getAttribute('data-theme') === 'dark';
      if (isDark) {
        document.documentElement.removeAttribute('data-theme');
        localStorage.setItem('manuskrip_theme', 'light');
      } else {
        document.documentElement.setAttribute('data-theme', 'dark');
        localStorage.setItem('manuskrip_theme', 'dark');
      }
      updateThemeIcon();
    });

    el('menuToggle').addEventListener('click', function () {
      document.querySelector('.catnav').classList.toggle('collapsed');
    });

    // Ke atas
    var toTop = el('toTop');
    window.addEventListener('scroll', function () {
      toTop.hidden = window.scrollY < 400;
    });
    toTop.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    // Pencarian
    el('searchBtn').addEventListener('click', doSearch);
    el('searchInput').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') doSearch();
    });

    el('brandHome').addEventListener('click', function (e) {
      e.preventDefault();
      state.category = 'Semua'; state.search = ''; el('searchInput').value = '';
      showHome(); loadArticles(); setActiveCat();
    });

    // Sort tabs
    Array.prototype.forEach.call(document.querySelectorAll('.sort-tab'), function (t) {
      t.addEventListener('click', function () {
        document.querySelectorAll('.sort-tab').forEach(function (x) { x.classList.remove('active'); });
        t.classList.add('active');
        state.sort = t.getAttribute('data-sort');
        loadArticles();
      });
    });

    // Newsletter
    el('newsletterForm').addEventListener('submit', function (e) {
      e.preventDefault();
      el('newsletterNote').hidden = false;
      e.target.reset();
    });
  }
  function updateThemeIcon() {
    var isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    el('themeToggle').textContent = isDark ? '☀️' : '🌙';
  }

  function doSearch() {
    state.search = el('searchInput').value.trim();
    state.category = 'Semua';
    setActiveCat();
    showHome();
    loadArticles();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ---------- Kategori ----------
  function loadCategories() {
    return api('/categories').then(function (d) {
      state.categories = d.categories || [];
      var nav = el('catNav');
      var cats = ['Semua'].concat(state.categories);
      nav.innerHTML = cats.map(function (c) {
        return '<button class="cat-link" data-cat="' + esc(c) + '">' + esc(c) + '</button>';
      }).join('');
      Array.prototype.forEach.call(nav.querySelectorAll('.cat-link'), function (b) {
        b.addEventListener('click', function () {
          state.category = b.getAttribute('data-cat');
          state.search = ''; el('searchInput').value = '';
          setActiveCat();
          showHome();
          loadArticles();
          window.scrollTo({ top: 0, behavior: 'smooth' });
        });
      });
      setActiveCat();

      // Footer categories
      el('footerCats').innerHTML = state.categories.map(function (c) {
        return '<a href="#" data-cat="' + esc(c) + '">' + esc(c) + '</a>';
      }).join('');
      Array.prototype.forEach.call(el('footerCats').querySelectorAll('a'), function (a) {
        a.addEventListener('click', function (e) {
          e.preventDefault();
          state.category = a.getAttribute('data-cat');
          state.search = ''; el('searchInput').value = '';
          setActiveCat(); showHome(); loadArticles();
          window.scrollTo({ top: 0, behavior: 'smooth' });
        });
      });
    });
  }
  function setActiveCat() {
    Array.prototype.forEach.call(document.querySelectorAll('.cat-link'), function (b) {
      b.classList.toggle('active', b.getAttribute('data-cat') === state.category);
    });
    var title = el('listTitle');
    if (state.search) title.textContent = 'Hasil pencarian: "' + state.search + '"';
    else if (state.category === 'Semua') title.textContent = 'Berita Terbaru';
    else title.textContent = 'Kategori: ' + state.category;
  }

  // ---------- Hero (hanya beranda tanpa filter) ----------
  function loadHero() {
    var heroArea = el('heroArea');
    if (state.category !== 'Semua' || state.search) {
      heroArea.style.display = 'none';
      return Promise.resolve();
    }
    heroArea.style.display = 'grid';
    return api('/articles?featured=1&limit=3').then(function (d) {
      var arts = d.articles || [];
      if (arts.length === 0) {
        // fallback: berita terbaru
        return api('/articles?limit=3').then(renderHero);
      }
      renderHero({ articles: arts });
    });
  }
  function renderHero(d) {
    var arts = d.articles || [];
    var heroArea = el('heroArea');
    if (arts.length === 0) { heroArea.style.display = 'none'; return; }
    var main = arts[0];
    var sides = arts.slice(1, 3);
    var html = '<div class="hero-main" data-id="' + main.id + '">';
    html += main.image
      ? '<img class="hero-img" src="' + esc(main.image) + '" alt="" />'
      : '<div class="hero-fallback"></div>';
    html += '<div class="hero-overlay"></div>';
    html += '<div class="hero-body">';
    html += '<span class="hero-cat">' + esc(main.category) + '</span>';
    html += '<h1>' + esc(main.title) + '</h1>';
    html += '<p class="hero-excerpt">' + esc(main.excerpt) + '</p>';
    html += '<div class="hero-meta">' + esc(main.author) + ' • ' + timeAgo(main.createdAt) +
      ' • ' + main.readingTime + ' mnt baca</div>';
    html += '</div></div>';

    html += '<div class="hero-side">';
    sides.forEach(function (a) {
      html += '<div class="hs" data-id="' + a.id + '">';
      html += a.image
        ? '<img class="hs-img" src="' + esc(a.image) + '" alt="" />'
        : '<div class="hero-fallback"></div>';
      html += '<div class="hs-overlay"></div>';
      html += '<div class="hs-body"><span class="hero-cat">' + esc(a.category) + '</span>';
      html += '<h3>' + esc(a.title) + '</h3></div></div>';
    });
    html += '</div>';
    heroArea.innerHTML = html;
    Array.prototype.forEach.call(heroArea.querySelectorAll('[data-id]'), function (n) {
      n.addEventListener('click', function () { openArticle(n.getAttribute('data-id')); });
    });
  }

  // ---------- Ticker ----------
  function loadTicker() {
    return Promise.all([
      api('/articles?breaking=1&limit=12'),
      api('/articles?sort=newest&limit=15'),
    ]).then(function (res) {
      var seen = {};
      var arts = [];
      [].concat(res[0].articles || [], res[1].articles || []).forEach(function (a) {
        if (!seen[a.id]) { seen[a.id] = true; arts.push(a); }
      });
      arts = arts.slice(0, 15);
      if (arts.length === 0) { el('ticker').hidden = true; return; }
      el('ticker').hidden = false;
      var items = arts.map(function (a) {
        return '<span class="ticker-item" data-id="' + a.id + '">' + esc(a.title) + '</span>';
      }).join('');
      // gandakan untuk animasi mulus
      el('tickerTrack').innerHTML = items + items;
      Array.prototype.forEach.call(el('tickerTrack').querySelectorAll('.ticker-item'), function (n) {
        n.addEventListener('click', function () { openArticle(n.getAttribute('data-id')); });
      });
    });
  }

  // ---------- Daftar artikel ----------
  function loadArticles() {
    loadHero();
    var q = '/articles?sort=' + state.sort;
    if (state.category && state.category !== 'Semua') q += '&category=' + encodeURIComponent(state.category);
    if (state.search) q += '&search=' + encodeURIComponent(state.search);
    return api(q).then(function (d) {
      renderGrid(d.articles || []);
    });
  }
  function renderGrid(arts) {
    var grid = el('articleGrid');
    el('emptyMsg').hidden = arts.length > 0;
    grid.innerHTML = arts.map(cardHtml).join('');
    Array.prototype.forEach.call(grid.querySelectorAll('.card'), function (c) {
      c.addEventListener('click', function () { openArticle(c.getAttribute('data-id')); });
    });
  }
  function cardHtml(a) {
    var h = '<article class="card" data-id="' + a.id + '">';
    h += '<div class="card-thumb">' + thumb(a) + '<span class="card-cat">' + esc(a.category) + '</span></div>';
    h += '<div class="card-body">';
    h += '<h3>' + esc(a.title) + '</h3>';
    h += '<p class="card-excerpt">' + esc(a.excerpt) + '</p>';
    h += '<div class="card-meta"><span>' + esc(a.author) + '</span>';
    h += '<span>' + timeAgo(a.createdAt) + '<span class="dot">•</span>' + fmtViews(a.views) + ' dibaca</span>';
    h += '</div></div></article>';
    return h;
  }

  // ---------- Sidebar ----------
  function loadSidebar() {
    api('/articles?sort=popular&limit=5').then(function (d) {
      var arts = d.articles || [];
      el('popularList').innerHTML = arts.map(function (a) {
        return '<li class="popular-item" data-id="' + a.id + '">' +
          '<div class="pop-body"><h4>' + esc(a.title) + '</h4>' +
          '<div class="pop-meta">' + esc(a.category) + ' • ' + fmtViews(a.views) + ' dibaca</div></div></li>';
      }).join('');
      Array.prototype.forEach.call(el('popularList').querySelectorAll('.popular-item'), function (n) {
        n.addEventListener('click', function () { openArticle(n.getAttribute('data-id')); });
      });
    });

    api('/articles?limit=40').then(function (d) {
      var arts = d.articles || [];
      var tags = {};
      arts.forEach(function (a) {
        (a.tags || []).forEach(function (t) { tags[t] = (tags[t] || 0) + 1; });
      });
      var top = Object.keys(tags).sort(function (x, y) { return tags[y] - tags[x]; }).slice(0, 12);
      el('tagCloud').innerHTML = top.map(function (t) {
        return '<span class="tag-chip" data-tag="' + esc(t) + '">#' + esc(t) + '</span>';
      }).join('');
      Array.prototype.forEach.call(el('tagCloud').querySelectorAll('.tag-chip'), function (n) {
        n.addEventListener('click', function () {
          state.search = n.getAttribute('data-tag');
          el('searchInput').value = state.search;
          state.category = 'Semua'; setActiveCat(); showHome(); loadArticles();
          window.scrollTo({ top: 0, behavior: 'smooth' });
        });
      });
    });
  }

  // ---------- Tampilan ----------
  function showHome() {
    el('homeView').hidden = false;
    el('articleView').hidden = true;
  }
  function showArticle() {
    el('homeView').hidden = true;
    el('articleView').hidden = false;
  }

  function openArticle(id) {
    api('/articles/' + id + '?read=1').then(function (d) {
      var a = d.article;
      renderArticle(a);
      showArticle();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      if (history.pushState) history.pushState({ article: id }, '', '#/' + a.slug);
    }).catch(function () {
      alert('Artikel tidak dapat dibuka.');
    });
  }

  function renderArticle(a) {
    var v = el('articleView');
    var raw = String(a.body || '');
    var bodyHtml = /<[a-z][\s\S]*>/i.test(raw)
      ? raw
      : raw.split(/\n{2,}/).map(function (p) {
          return '<p>' + esc(p.trim()).replace(/\n/g, '<br>') + '</p>';
        }).join('');

    var h = '<button class="back-btn" id="backBtn">← Kembali ke beranda</button>';
    var cats = (a.categories && a.categories.length) ? a.categories : [a.category];
    h += cats.map(function (c) { return '<span class="av-cat">' + esc(c) + '</span>'; }).join('');
    h += '<h1>' + esc(a.title) + '</h1>';
    if (a.excerpt) h += '<p class="av-excerpt">' + esc(a.excerpt) + '</p>';
    h += '<div class="av-meta">';
    h += '<span class="av-author">✍️ ' + esc(a.author) + '</span>';
    h += '<span>🕒 ' + fmtDate(a.createdAt) + '</span>';
    h += '<span>⏱️ ' + a.readingTime + ' menit baca</span>';
    h += '<span>👁️ ' + fmtViews(a.views) + ' dibaca</span>';
    h += '</div>';
    if (a.image) {
      h += '<img class="av-img" src="' + esc(a.image) + '" alt="' + esc(a.title) + '" />';
    }
    h += '<div class="article-body spacing-' + esc(a.spacing || 'normal') + '">' + bodyHtml + '</div>';

    if (a.tags && a.tags.length) {
      h += '<div class="av-tags">' + a.tags.map(function (t) {
        return '<span class="tag-chip" data-tag="' + esc(t) + '">#' + esc(t) + '</span>';
      }).join('') + '</div>';
    }

    h += '<div class="av-share"><span>Bagikan:</span>';
    var shareUrl = encodeURIComponent(location.href);
    var shareText = encodeURIComponent(a.title);
    h += '<button class="share-btn" data-share="wa">WhatsApp</button>';
    h += '<button class="share-btn" data-share="fb">Facebook</button>';
    h += '<button class="share-btn" data-share="x">X/Twitter</button>';
    h += '<button class="share-btn" data-share="copy">Salin Tautan</button>';
    h += '</div>';

    h += '<div id="relatedArea"></div>';

    v.innerHTML = h;

    el('backBtn').addEventListener('click', function () {
      showHome();
      if (history.pushState) history.pushState({}, '', '#/');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    Array.prototype.forEach.call(v.querySelectorAll('.tag-chip'), function (n) {
      n.addEventListener('click', function () {
        state.search = n.getAttribute('data-tag');
        el('searchInput').value = state.search;
        state.category = 'Semua'; setActiveCat(); showHome(); loadArticles();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    });

    Array.prototype.forEach.call(v.querySelectorAll('.share-btn'), function (n) {
      n.addEventListener('click', function () {
        var type = n.getAttribute('data-share');
        var url = location.href;
        if (type === 'copy') {
          if (navigator.clipboard) navigator.clipboard.writeText(url);
          n.textContent = 'Tersalin!';
          setTimeout(function () { n.textContent = 'Salin Tautan'; }, 1500);
          return;
        }
        var target = '';
        if (type === 'wa') target = 'https://wa.me/?text=' + shareText + '%20' + shareUrl;
        if (type === 'fb') target = 'https://www.facebook.com/sharer/sharer.php?u=' + shareUrl;
        if (type === 'x') target = 'https://twitter.com/intent/tweet?text=' + shareText + '&url=' + shareUrl;
        window.open(target, '_blank', 'noopener');
      });
    });

    // Rekomendasi bacaan: prioritas kategori sama, lalu dilengkapi berita terpopuler.
    Promise.all([
      api('/articles?category=' + encodeURIComponent(a.category) + '&sort=newest&limit=7'),
      api('/articles?sort=popular&limit=10'),
    ]).then(function (res) {
      var seen = {};
      seen[a.id] = true;
      var recs = [];
      function add(list) {
        (list || []).forEach(function (x) {
          if (!seen[x.id] && recs.length < 6) {
            seen[x.id] = true;
            recs.push(x);
          }
        });
      }
      add(res[0].articles); // kategori sama dulu
      add(res[1].articles); // dilengkapi yang terpopuler
      if (recs.length === 0) return;
      var rh = '<h3 class="related-head">Rekomendasi Bacaan</h3>';
      rh += '<p class="related-sub">Berita lain yang mungkin Anda suka</p>';
      rh += '<div class="related-grid">' + recs.map(cardHtml).join('') + '</div>';
      el('relatedArea').innerHTML = rh;
      Array.prototype.forEach.call(el('relatedArea').querySelectorAll('.card'), function (c) {
        c.addEventListener('click', function () { openArticle(c.getAttribute('data-id')); });
      });
    });
  }

  window.addEventListener('popstate', function () {
    var m = location.hash.match(/^#\/(.+)$/);
    if (m && m[1] !== '') openArticle(m[1]);
    else showHome();
  });

  // ---------- Init ----------
  function init() {
    initChrome();
    loadCategories();
    loadTicker();
    loadArticles();
    loadSidebar();

    // buka artikel langsung dari hash
    var m = location.hash.match(/^#\/(.+)$/);
    if (m && m[1] !== '') openArticle(m[1]);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else init();
})();
