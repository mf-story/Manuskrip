# Manuskrip — Portal Berita

Portal berita ringan dengan tema editorial/koran (surat kabar), lengkap dengan **panel redaksi** untuk mengelola berita dan **backend Node.js** sehingga data tersimpan di server dan bisa diakses banyak orang.

Berbeda dari proyek dashboard sebelumnya: tema koran klasik (font serif *Playfair Display*, aksen merah, latar krem), tata letak masthead + kolom berita, mode gelap, dan alur baca artikel dengan *drop cap*.

## Fitur

**Portal publik** (`index.html`)
- Halaman utama dengan berita utama (hero), kartu berita, dan sidebar (terpopuler + tagar).
- Navigasi kategori (Nasional, Internasional, Politik, Ekonomi, Teknologi, Olahraga, Hiburan, Kesehatan, Pendidikan, Gaya Hidup).
- Ticker "berita terkini" yang berjalan.
- Pencarian, urutkan (terbaru / terpopuler), mode terang/gelap.
- Halaman baca artikel dengan perhitungan waktu baca, tombol bagikan (WhatsApp/Facebook/X/salin), dan berita terkait.
- Perhitungan jumlah pembaca otomatis.

**Panel redaksi** (`admin.html`)
- Login redaksi (token aman, kedaluwarsa 12 jam).
- Dasbor: statistik total/terbit/draf/terkini/total dibaca + grafik per kategori.
- Kelola berita: cari, filter kategori & status, tulis, ubah, hapus.
- Editor lengkap: judul, ringkasan, isi, kategori, penulis, tagar, unggah gambar sampul (atau tempel URL), tandai berita utama / terkini / draf.
- Ubah kata sandi sendiri.

## Menjalankan

Butuh **Node.js** (tanpa perlu `npm install` — hanya memakai modul bawaan Node).

1. Klik dua kali **`Jalankan Server.bat`** (atau jalankan `node server.js`).
2. Buka di browser:
   - Portal  : http://localhost:5530
   - Redaksi : http://localhost:5530/admin.html

### Login default
- Nama pengguna: **admin**
- Kata sandi: **admin123**

> Segera ubah kata sandi lewat tombol 🔑 di panel redaksi.

## Akses dari HP (satu jaringan Wi-Fi)

Klik dua kali **`Buka Akses HP.bat`** lalu pilih **Yes** pada jendela izin (UAC). Skrip akan membuka port 5530 di firewall, menampilkan alamat IP untuk dibuka di HP, dan menjalankan server. Pastikan HP dan komputer berada di Wi-Fi yang sama.

## Struktur

```
PortalBerita/
├─ server.js            Backend Node.js (HTTP + REST API + file statis)
├─ index.html           Portal publik
├─ style.css            Tema editorial portal
├─ app.js               Logika portal publik
├─ admin.html           Panel redaksi
├─ admin.css            Tema panel redaksi
├─ admin.js             Logika panel redaksi
├─ favicon.svg          Ikon situs
├─ Jalankan Server.bat  Menjalankan server
├─ Buka Akses HP.bat    Membuka akses dari HP (firewall)
├─ data/db.json         Basis data (dibuat otomatis)
└─ uploads/             Gambar terunggah (dibuat otomatis)
```

## Catatan teknis

- Port: **5530**, server mengikat `0.0.0.0`.
- Kata sandi di-*hash* dengan `scrypt`; token ditandatangani `HMAC-SHA256`.
- Untuk produksi, atur variabel lingkungan `MANUSKRIP_SECRET` dengan nilai acak yang kuat.
- Data disimpan di `data/db.json` (ditulis atomik). Cadangkan berkala bila perlu.
