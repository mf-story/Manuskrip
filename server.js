// Manuskrip - Portal Berita
// Server Node.js (hanya modul bawaan, tanpa npm). Static serve + REST API.
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = process.env.PORT || 5530;
const ROOT = __dirname;
// DATA_ROOT bisa diarahkan ke Volume (mis. Railway) agar data tak hilang saat redeploy.
const DATA_ROOT = process.env.DATA_ROOT || ROOT;
const DATA_DIR = path.join(DATA_ROOT, 'data');
const UPLOAD_DIR = path.join(DATA_ROOT, 'uploads');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const MAX_BODY = 15 * 1024 * 1024; // 15 MB (untuk unggah gambar base64)
const SECRET = process.env.MANUSKRIP_SECRET || 'manuskrip-dev-secret';

// ---------- Util penyimpanan ----------
function ensureDirs() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const CATEGORIES = [
  'Nasional', 'Internasional', 'Politik', 'Ekonomi', 'Teknologi',
  'Olahraga', 'Hiburan', 'Kesehatan', 'Pendidikan', 'Gaya Hidup',
];

function hashPassword(password, salt) {
  const s = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(String(password), s, 64).toString('hex');
  return { salt: s, hash };
}

function slugify(text) {
  return String(text)
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 80) || 'artikel';
}

const COVER_BY_CATEGORY = {
  Nasional: '/assets/covers/nasional.svg?v=3',
  Internasional: '/assets/covers/internasional.svg?v=3',
  Politik: '/assets/covers/politik.svg?v=3',
  Ekonomi: '/assets/covers/ekonomi.svg?v=3',
  Teknologi: '/assets/covers/teknologi.svg?v=3',
  Olahraga: '/assets/covers/olahraga.svg?v=3',
  Hiburan: '/assets/covers/hiburan.svg?v=3',
  Kesehatan: '/assets/covers/kesehatan.svg?v=3',
  Pendidikan: '/assets/covers/pendidikan.svg?v=3',
  'Gaya Hidup': '/assets/covers/gaya-hidup.svg?v=3',
};
function coverFor(category) {
  return COVER_BY_CATEGORY[category] || '/assets/covers/nasional.svg?v=3';
}

function seedArticles() {
  const now = Date.now();
  const day = 86400000;
  const raw = [
    {
      title: 'Pemerintah Luncurkan Program Digitalisasi Desa di 500 Wilayah',
      category: 'Nasional',
      author: 'Rangga Mahardika',
      excerpt: 'Program menyasar peningkatan akses internet dan literasi digital di desa-desa terpencil sepanjang tahun ini.',
      featured: true, breaking: true,
      tags: ['pemerintah', 'digital', 'desa'],
      body: 'Program digitalisasi desa resmi diluncurkan dengan target menjangkau 500 wilayah pada tahap pertama. Fokus utama adalah pembangunan infrastruktur jaringan, pelatihan warga, serta penyediaan layanan administrasi berbasis daring.\n\nMenurut penyelenggara, langkah ini diharapkan mempersempit kesenjangan digital antara kota dan desa. Warga akan memperoleh pendampingan untuk memanfaatkan teknologi bagi usaha kecil, pendidikan, hingga layanan kesehatan.\n\nEvaluasi berkala akan dilakukan setiap tiga bulan untuk memastikan program berjalan tepat sasaran.',
    },
    {
      title: 'Timnas Raih Kemenangan Dramatis di Menit Akhir',
      category: 'Olahraga',
      author: 'Bayu Saputra',
      excerpt: 'Gol pada masa tambahan waktu membawa tim nasional melaju ke babak berikutnya dengan penuh drama.',
      featured: true, breaking: false,
      tags: ['sepak bola', 'timnas'],
      body: 'Pertandingan berlangsung ketat sejak menit awal. Kedua tim saling jual beli serangan, namun kebuntuan baru pecah pada masa tambahan waktu babak kedua.\n\nGol kemenangan disambut euforia pendukung yang memadati stadion. Pelatih memuji mentalitas pemain yang tidak menyerah hingga peluit akhir.\n\nKemenangan ini memastikan langkah tim ke fase gugur dengan modal kepercayaan diri tinggi.',
    },
    {
      title: 'Kecerdasan Buatan Mulai Diterapkan di Layanan Publik',
      category: 'Teknologi',
      author: 'Dinda Larasati',
      excerpt: 'Sejumlah instansi mengadopsi asisten virtual untuk mempercepat pelayanan dan mengurangi antrean.',
      featured: false, breaking: false,
      tags: ['AI', 'inovasi', 'layanan'],
      body: 'Penerapan kecerdasan buatan pada layanan publik ditujukan untuk memangkas waktu tunggu dan meningkatkan akurasi pemrosesan dokumen.\n\nAsisten virtual mampu menjawab pertanyaan umum warga selama 24 jam. Data yang terkumpul juga membantu instansi memahami kebutuhan masyarakat.\n\nMeski demikian, pengelola menegaskan pentingnya perlindungan data pribadi dan pengawasan manusia dalam setiap keputusan penting.',
    },
    {
      title: 'Nilai Tukar Stabil, Pasar Modal Menguat Tipis',
      category: 'Ekonomi',
      author: 'Farhan Nugroho',
      excerpt: 'Sentimen positif dari data ekonomi global mendorong indeks bergerak di zona hijau.',
      featured: false, breaking: false,
      tags: ['ekonomi', 'pasar modal'],
      body: 'Indeks harga saham gabungan ditutup menguat tipis seiring stabilnya nilai tukar. Investor merespons positif rilis data pertumbuhan yang lebih baik dari perkiraan.\n\nAnalis menyarankan pelaku pasar tetap mencermati perkembangan suku bunga global. Diversifikasi portofolio dinilai penting untuk mengelola risiko.',
    },
    {
      title: 'Festival Film Nasional Kembali Digelar Akhir Tahun',
      category: 'Hiburan',
      author: 'Salma Ayudia',
      excerpt: 'Puluhan karya sineas muda bersaing memperebutkan penghargaan bergengsi tahun ini.',
      featured: false, breaking: false,
      tags: ['film', 'festival', 'budaya'],
      body: 'Festival film nasional menghadirkan beragam genre, mulai dari drama, dokumenter, hingga animasi. Ajang ini menjadi panggung bagi talenta baru untuk unjuk karya.\n\nPanitia menekankan pentingnya apresiasi terhadap keberagaman cerita lokal. Sesi diskusi dan lokakarya juga disiapkan untuk publik.',
    },
    {
      title: 'Pola Hidup Sehat Turunkan Risiko Penyakit Kronis',
      category: 'Kesehatan',
      author: 'Anindya Puspita',
      excerpt: 'Aktivitas fisik rutin dan pola makan seimbang terbukti menjaga kualitas hidup jangka panjang.',
      featured: false, breaking: false,
      tags: ['kesehatan', 'gaya hidup'],
      body: 'Para ahli menekankan bahwa kebiasaan sederhana seperti berjalan kaki 30 menit sehari memberi manfaat besar bagi kesehatan jantung.\n\nKonsumsi sayur, buah, serta pengurangan gula dan garam turut membantu menjaga berat badan ideal. Tidur cukup dan pengelolaan stres juga menjadi kunci.',
    },
    {
      title: 'Kurikulum Baru Dorong Pembelajaran Berbasis Proyek',
      category: 'Pendidikan',
      author: 'Wahyu Prasetyo',
      excerpt: 'Siswa diajak lebih aktif memecahkan masalah nyata melalui kolaborasi dan eksplorasi.',
      featured: false, breaking: false,
      tags: ['pendidikan', 'kurikulum'],
      body: 'Pembelajaran berbasis proyek menempatkan siswa sebagai pusat proses belajar. Guru berperan sebagai fasilitator yang membimbing eksplorasi.\n\nMetode ini diyakini menumbuhkan kemampuan berpikir kritis, kreativitas, dan kerja sama. Sekolah didorong menyesuaikan sarana pendukung.',
    },
    {
      title: 'Kerja Sama Internasional Perkuat Ketahanan Pangan',
      category: 'Internasional',
      author: 'Kirana Melati',
      excerpt: 'Sejumlah negara sepakat berbagi teknologi pertanian untuk menghadapi perubahan iklim.',
      featured: false, breaking: false,
      tags: ['internasional', 'pangan'],
      body: 'Forum kerja sama internasional menyepakati pertukaran teknologi dan riset pertanian. Tujuannya menjaga pasokan pangan di tengah tantangan iklim.\n\nProgram ini mencakup pelatihan petani, pengembangan bibit unggul, serta sistem irigasi efisien.',
    },
  ];
  return raw.map((a, i) => {
    const created = now - (i * (day / 2)) - Math.floor(Math.random() * day);
    return {
      id: crypto.randomUUID(),
      title: a.title,
      slug: slugify(a.title),
      category: a.category,
      categories: [a.category],
      author: a.author,
      excerpt: a.excerpt,
      body: a.body,
      image: coverFor(a.category),
      tags: a.tags || [],
      featured: !!a.featured,
      breaking: !!a.breaking,
      published: true,
      views: Math.floor(Math.random() * 900) + 50,
      createdAt: new Date(created).toISOString(),
      updatedAt: new Date(created).toISOString(),
    };
  });
}

function defaultDb() {
  const admin = hashPassword('admin123');
  return {
    users: [
      {
        id: crypto.randomUUID(),
        username: 'admin',
        name: 'Redaktur',
        role: 'admin',
        salt: admin.salt,
        hash: admin.hash,
      },
    ],
    categories: CATEGORIES.slice(),
    articles: seedArticles(),
  };
}

let db = null;
function loadDb() {
  ensureDirs();
  if (fs.existsSync(DB_FILE)) {
    try {
      db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
      if (!db.categories) db.categories = CATEGORIES.slice();
      if (!db.articles) db.articles = [];
      if (!db.users) db.users = defaultDb().users;
      // Migrasi: pastikan tiap artikel punya array categories.
      for (const a of db.articles) {
        if (!Array.isArray(a.categories) || !a.categories.length) a.categories = [a.category];
        if (!a.category) a.category = a.categories[0];
      }
      return;
    } catch (e) {
      console.error('Gagal membaca db.json, membuat baru:', e.message);
    }
  }
  db = defaultDb();
  saveDb();
}

let saveTimer = null;
function saveDb() {
  // Tulis atomik: tulis ke .tmp lalu rename.
  const tmp = DB_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
  fs.renameSync(tmp, DB_FILE);
}
function saveDbDebounced() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(saveDb, 150);
}

// ---------- Token sederhana (HMAC, kadaluarsa 12 jam) ----------
function signToken(userId) {
  const exp = Date.now() + 12 * 3600 * 1000;
  const payload = `${userId}.${exp}`;
  const sig = crypto.createHmac('sha256', SECRET).update(payload).digest('hex');
  return Buffer.from(`${payload}.${sig}`).toString('base64');
}
function verifyToken(token) {
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf8');
    const [userId, exp, sig] = decoded.split('.');
    const payload = `${userId}.${exp}`;
    const expect = crypto.createHmac('sha256', SECRET).update(payload).digest('hex');
    if (sig !== expect) return null;
    if (Date.now() > Number(exp)) return null;
    return db.users.find((u) => u.id === userId) || null;
  } catch (e) {
    return null;
  }
}
function getAuthUser(req) {
  const h = req.headers['authorization'] || '';
  const m = h.match(/^Bearer\s+(.+)$/i);
  if (!m) return null;
  return verifyToken(m[1]);
}

// ---------- Helper HTTP ----------
function sendJson(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-cache',
  });
  res.end(body);
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > MAX_BODY) {
        reject(new Error('Body terlalu besar'));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch (e) {
        reject(new Error('JSON tidak valid'));
      }
    });
    req.on('error', reject);
  });
}

function publicUser(u) {
  return { id: u.id, username: u.username, name: u.name, role: u.role };
}

function readingTime(body) {
  const text = String(body || '').replace(/<[^>]+>/g, ' ');
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

// Bersihkan HTML dari editor: hanya izinkan tag aman, buang semua atribut kecuali href pada <a>.
const ALLOWED_TAGS = new Set([
  'p', 'br', 'div', 'span', 'strong', 'b', 'em', 'i', 'u', 's',
  'h2', 'h3', 'h4', 'ul', 'ol', 'li', 'blockquote', 'a',
]);
function sanitizeHtml(html) {
  let s = String(html || '');
  s = s.replace(/<\s*(script|style)[\s\S]*?<\s*\/\s*\1\s*>/gi, '');
  s = s.replace(/<!--[\s\S]*?-->/g, '');
  s = s.replace(/<\/?([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>/g, (tag, name) => {
    name = name.toLowerCase();
    if (!ALLOWED_TAGS.has(name)) return '';
    if (/^<\s*\//.test(tag)) return name === 'br' ? '' : `</${name}>`;
    if (name === 'br') return '<br>';
    if (name === 'a') {
      const m = tag.match(/\shref\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/i);
      let href = (m ? (m[2] || m[3] || m[4] || '') : '').trim();
      if (/^\s*(javascript|data|vbscript):/i.test(href)) href = '';
      if (href && !/^(https?:|mailto:|\/|#)/i.test(href)) href = '';
      href = href.replace(/"/g, '%22');
      return href ? `<a href="${href}" target="_blank" rel="noopener nofollow">` : '<a>';
    }
    return `<${name}>`;
  });
  return s.trim();
}

function publicArticle(a, full) {
  const out = {
    id: a.id,
    title: a.title,
    slug: a.slug,
    category: a.category,
    categories: (a.categories && a.categories.length) ? a.categories : [a.category],
    author: a.author,
    excerpt: a.excerpt,
    image: a.image,
    tags: a.tags || [],
    featured: !!a.featured,
    breaking: !!a.breaking,
    published: !!a.published,
    spacing: a.spacing || 'normal',
    views: a.views || 0,
    readingTime: readingTime(a.body),
    createdAt: a.createdAt,
    updatedAt: a.updatedAt,
  };
  if (full) out.body = a.body;
  return out;
}

// ---------- API ----------
async function handleApi(req, res, url) {
  const parts = url.pathname.split('/').filter(Boolean); // ['api', ...]
  const seg = parts.slice(1); // buang 'api'
  const method = req.method.toUpperCase();

  // POST /api/login
  if (seg[0] === 'login' && method === 'POST') {
    const b = await readBody(req);
    const user = db.users.find((u) => u.username === String(b.username || '').trim());
    if (!user) return sendJson(res, 401, { error: 'Username atau kata sandi salah' });
    const { hash } = hashPassword(b.password || '', user.salt);
    if (hash !== user.hash) return sendJson(res, 401, { error: 'Username atau kata sandi salah' });
    return sendJson(res, 200, { token: signToken(user.id), user: publicUser(user) });
  }

  // GET /api/me
  if (seg[0] === 'me' && method === 'GET') {
    const user = getAuthUser(req);
    if (!user) return sendJson(res, 401, { error: 'Belum masuk' });
    return sendJson(res, 200, { user: publicUser(user) });
  }

  // POST /api/password (ubah kata sandi sendiri)
  if (seg[0] === 'password' && method === 'POST') {
    const user = getAuthUser(req);
    if (!user) return sendJson(res, 401, { error: 'Belum masuk' });
    const b = await readBody(req);
    const { hash } = hashPassword(b.current || '', user.salt);
    if (hash !== user.hash) return sendJson(res, 400, { error: 'Kata sandi lama salah' });
    if (!b.next || String(b.next).length < 6)
      return sendJson(res, 400, { error: 'Kata sandi baru minimal 6 karakter' });
    const h = hashPassword(b.next);
    user.salt = h.salt;
    user.hash = h.hash;
    saveDbDebounced();
    return sendJson(res, 200, { ok: true });
  }

  // /api/users (khusus admin)
  if (seg[0] === 'users') {
    const user = getAuthUser(req);
    if (!user) return sendJson(res, 401, { error: 'Belum masuk' });
    if (user.role !== 'admin')
      return sendJson(res, 403, { error: 'Hanya admin yang dapat mengelola pengguna' });

    if (seg.length === 1 && method === 'GET') {
      return sendJson(res, 200, { users: db.users.map(publicUser) });
    }

    if (seg.length === 1 && method === 'POST') {
      const b = await readBody(req);
      const username = String(b.username || '').trim().toLowerCase();
      const name = String(b.name || '').trim();
      const role = b.role === 'author' ? 'author' : 'admin';
      if (!name) return sendJson(res, 400, { error: 'Nama wajib diisi' });
      if (!/^[a-z0-9_.]{3,20}$/.test(username))
        return sendJson(res, 400, { error: 'Username 3-20 karakter (huruf kecil/angka/titik/garis bawah)' });
      if (!b.password || String(b.password).length < 6)
        return sendJson(res, 400, { error: 'Kata sandi minimal 6 karakter' });
      if (db.users.some((u) => u.username === username))
        return sendJson(res, 409, { error: 'Username sudah dipakai' });
      const h = hashPassword(b.password);
      const nu = { id: crypto.randomUUID(), username, name, role, salt: h.salt, hash: h.hash };
      db.users.push(nu);
      saveDbDebounced();
      return sendJson(res, 201, { user: publicUser(nu) });
    }

    const uid = seg[1];
    const uidx = db.users.findIndex((u) => u.id === uid);

    if (seg.length === 2 && method === 'DELETE') {
      if (uidx === -1) return sendJson(res, 404, { error: 'Pengguna tidak ditemukan' });
      if (uid === user.id) return sendJson(res, 400, { error: 'Tidak dapat menghapus akun sendiri' });
      const admins = db.users.filter((u) => u.role === 'admin');
      if (db.users[uidx].role === 'admin' && admins.length <= 1)
        return sendJson(res, 400, { error: 'Minimal harus ada satu admin' });
      db.users.splice(uidx, 1);
      saveDbDebounced();
      return sendJson(res, 200, { ok: true });
    }

    if (seg.length === 3 && seg[2] === 'password' && method === 'POST') {
      if (uidx === -1) return sendJson(res, 404, { error: 'Pengguna tidak ditemukan' });
      const b = await readBody(req);
      if (!b.next || String(b.next).length < 6)
        return sendJson(res, 400, { error: 'Kata sandi baru minimal 6 karakter' });
      const h = hashPassword(b.next);
      db.users[uidx].salt = h.salt;
      db.users[uidx].hash = h.hash;
      saveDbDebounced();
      return sendJson(res, 200, { ok: true });
    }
  }

  // GET /api/categories
  if (seg[0] === 'categories' && method === 'GET') {
    return sendJson(res, 200, { categories: db.categories });
  }

  // GET /api/stats (admin)
  if (seg[0] === 'stats' && method === 'GET') {
    const user = getAuthUser(req);
    if (!user) return sendJson(res, 401, { error: 'Belum masuk' });
    const arts = db.articles;
    const byCat = {};
    for (const c of db.categories) byCat[c] = 0;
    for (const a of arts) {
      const cats = (a.categories && a.categories.length) ? a.categories : [a.category];
      for (const c of cats) byCat[c] = (byCat[c] || 0) + 1;
    }
    return sendJson(res, 200, {
      total: arts.length,
      published: arts.filter((a) => a.published).length,
      draft: arts.filter((a) => !a.published).length,
      breaking: arts.filter((a) => a.breaking).length,
      totalViews: arts.reduce((s, a) => s + (a.views || 0), 0),
      byCategory: byCat,
    });
  }

  // /api/articles
  if (seg[0] === 'articles') {
    // GET list
    if (seg.length === 1 && method === 'GET') {
      const user = getAuthUser(req);
      const isAdmin = !!user;
      const q = url.searchParams;
      let list = db.articles.slice();
      if (!isAdmin || q.get('scope') === 'public') {
        list = list.filter((a) => a.published);
      }
      const cat = q.get('category');
      if (cat && cat !== 'Semua') list = list.filter((a) => ((a.categories && a.categories.length) ? a.categories : [a.category]).includes(cat));
      const search = (q.get('search') || '').toLowerCase().trim();
      if (search) {
        list = list.filter(
          (a) =>
            a.title.toLowerCase().includes(search) ||
            a.excerpt.toLowerCase().includes(search) ||
            (a.tags || []).some((t) => t.toLowerCase().includes(search))
        );
      }
      if (q.get('featured') === '1') list = list.filter((a) => a.featured);
      if (q.get('breaking') === '1') list = list.filter((a) => a.breaking);

      const sort = q.get('sort') || 'newest';
      if (sort === 'popular') list.sort((a, b) => (b.views || 0) - (a.views || 0));
      else list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      const limit = parseInt(q.get('limit'), 10);
      if (limit > 0) list = list.slice(0, limit);
      return sendJson(res, 200, { articles: list.map((a) => publicArticle(a, false)) });
    }

    // POST create (admin)
    if (seg.length === 1 && method === 'POST') {
      const user = getAuthUser(req);
      if (!user) return sendJson(res, 401, { error: 'Belum masuk' });
      const b = await readBody(req);
      if (!b.title || !String(b.title).trim())
        return sendJson(res, 400, { error: 'Judul wajib diisi' });
      let cats = Array.isArray(b.categories) ? b.categories : (b.category ? [b.category] : []);
      cats = cats.map((c) => String(c)).filter((c) => db.categories.includes(c));
      if (!cats.length) cats = [db.categories[0]];
      const category = cats[0];
      const now = new Date().toISOString();
      const art = {
        id: crypto.randomUUID(),
        title: String(b.title).trim(),
        slug: slugify(b.title),
        category,
        categories: cats,
        author: String(b.author || user.name || 'Redaksi').trim(),
        excerpt: String(b.excerpt || '').trim(),
        body: sanitizeHtml(b.body || ''),
        image: String(b.image || '') || coverFor(category),
        tags: Array.isArray(b.tags)
          ? b.tags.map((t) => String(t).trim()).filter(Boolean)
          : String(b.tags || '').split(',').map((t) => t.trim()).filter(Boolean),
        featured: !!b.featured,
        breaking: !!b.breaking,
        published: b.published !== false,
        spacing: ['rapat', 'normal', 'longgar'].includes(b.spacing) ? b.spacing : 'normal',
        views: 0,
        createdAt: now,
        updatedAt: now,
      };
      db.articles.unshift(art);
      saveDbDebounced();
      return sendJson(res, 201, { article: publicArticle(art, true) });
    }

    // /api/articles/:id
    const id = seg[1];
    const idx = db.articles.findIndex((a) => a.id === id || a.slug === id);

    if (seg.length === 2 && method === 'GET') {
      if (idx === -1) return sendJson(res, 404, { error: 'Artikel tidak ditemukan' });
      const art = db.articles[idx];
      const user = getAuthUser(req);
      if (!user && !art.published)
        return sendJson(res, 404, { error: 'Artikel tidak ditemukan' });
      // Hitung views hanya untuk pembaca publik (bukan admin).
      if (!user && url.searchParams.get('read') === '1') {
        art.views = (art.views || 0) + 1;
        saveDbDebounced();
      }
      return sendJson(res, 200, { article: publicArticle(art, true) });
    }

    if (seg.length === 2 && method === 'PUT') {
      const user = getAuthUser(req);
      if (!user) return sendJson(res, 401, { error: 'Belum masuk' });
      if (idx === -1) return sendJson(res, 404, { error: 'Artikel tidak ditemukan' });
      const b = await readBody(req);
      const art = db.articles[idx];
      if (b.title !== undefined) {
        art.title = String(b.title).trim() || art.title;
        art.slug = slugify(art.title);
      }
      if (b.categories !== undefined) {
        let cats = (Array.isArray(b.categories) ? b.categories : [b.categories])
          .map((c) => String(c)).filter((c) => db.categories.includes(c));
        if (cats.length) { art.categories = cats; art.category = cats[0]; }
      } else if (b.category !== undefined && db.categories.includes(b.category)) {
        art.category = b.category;
        art.categories = [b.category];
      }
      if (b.author !== undefined) art.author = String(b.author).trim();
      if (b.excerpt !== undefined) art.excerpt = String(b.excerpt).trim();
      if (b.body !== undefined) art.body = sanitizeHtml(b.body);
      if (b.image !== undefined) art.image = String(b.image);
      if (b.tags !== undefined)
        art.tags = Array.isArray(b.tags)
          ? b.tags.map((t) => String(t).trim()).filter(Boolean)
          : String(b.tags).split(',').map((t) => t.trim()).filter(Boolean);
      if (b.featured !== undefined) art.featured = !!b.featured;
      if (b.breaking !== undefined) art.breaking = !!b.breaking;
      if (b.published !== undefined) art.published = !!b.published;
      if (['rapat', 'normal', 'longgar'].includes(b.spacing)) art.spacing = b.spacing;
      art.updatedAt = new Date().toISOString();
      saveDbDebounced();
      return sendJson(res, 200, { article: publicArticle(art, true) });
    }

    if (seg.length === 2 && method === 'DELETE') {
      const user = getAuthUser(req);
      if (!user) return sendJson(res, 401, { error: 'Belum masuk' });
      if (idx === -1) return sendJson(res, 404, { error: 'Artikel tidak ditemukan' });
      db.articles.splice(idx, 1);
      saveDbDebounced();
      return sendJson(res, 200, { ok: true });
    }
  }

  // POST /api/upload (admin, gambar base64 dataUrl)
  if (seg[0] === 'upload' && method === 'POST') {
    const user = getAuthUser(req);
    if (!user) return sendJson(res, 401, { error: 'Belum masuk' });
    const b = await readBody(req);
    const dataUrl = String(b.dataUrl || '');
    const m = dataUrl.match(/^data:image\/(png|jpe?g|webp|gif);base64,(.+)$/);
    if (!m) return sendJson(res, 400, { error: 'Format gambar tidak didukung' });
    const ext = m[1] === 'jpeg' ? 'jpg' : m[1];
    const buf = Buffer.from(m[2], 'base64');
    if (buf.length > 8 * 1024 * 1024)
      return sendJson(res, 400, { error: 'Ukuran gambar maksimal 8 MB' });
    const name = `img-${Date.now()}-${crypto.randomBytes(4).toString('hex')}.${ext}`;
    fs.writeFileSync(path.join(UPLOAD_DIR, name), buf);
    return sendJson(res, 201, { path: `/uploads/${name}` });
  }

  return sendJson(res, 404, { error: 'Endpoint tidak ditemukan' });
}

// ---------- Static ----------
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

function serveStatic(req, res, url) {
  let pathname = decodeURIComponent(url.pathname);
  if (pathname === '/') pathname = '/index.html';

  // Keamanan: cegah path traversal.
  const safe = path
    .normalize(pathname)
    .replace(/^(\.\.[/\\])+/, '')
    .replace(/^[/\\]+/, '');
  let filePath;
  let base;
  if (safe === 'uploads' || safe.startsWith('uploads/') || safe.startsWith('uploads\\')) {
    filePath = path.join(DATA_ROOT, safe);
    base = DATA_ROOT;
  } else {
    filePath = path.join(ROOT, safe);
    base = ROOT;
  }

  if (!filePath.startsWith(base)) {
    res.writeHead(403);
    return res.end('Terlarang');
  }

  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end('<h1>404</h1><p>Halaman tidak ditemukan.</p>');
    }
    const ext = path.extname(filePath).toLowerCase();
    const noCache = ext === '.html' || ext === '.css' || ext === '.js';
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Cache-Control': noCache ? 'no-cache' : 'public, max-age=3600',
    });
    fs.createReadStream(filePath).pipe(res);
  });
}

// ---------- Server ----------
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  try {
    if (url.pathname.startsWith('/api/')) {
      await handleApi(req, res, url);
    } else {
      serveStatic(req, res, url);
    }
  } catch (e) {
    console.error(e);
    if (!res.headersSent) sendJson(res, 500, { error: e.message || 'Kesalahan server' });
  }
});

loadDb();
server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n  Manuskrip berjalan di:`);
  console.log(`    Lokal   : http://localhost:${PORT}`);
  console.log(`    Editor  : http://localhost:${PORT}/admin.html`);
  console.log(`    (Login default: admin / admin123)\n`);
});
