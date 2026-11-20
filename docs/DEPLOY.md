# Panduan Deployment & Runbook Operasional
## Ruang Pintar — School Digital Operating Platform

| Field | Nilai |
| --- | --- |
| **Title / Type** | Deployment Guide & Operational Runbook |
| **Project / Scope** | Ruang Pintar — Prosedur Rilis Produksi, Migrasi Data, dan Kontingensi |
| **Owner** | DevOps & Platform Release Team |
| **Status** | `active` |
| **Last Updated / Version** | 2026-09-24 / v1.0 |
| **Source Responsibility** | Menetapkan prasyarat lingkungan, tahapan rilis produksi, gate otorisasi manusia, smoke check, dan prosedur rollback |
| **Related Docs** | `package.json`, `.env.example`, `docs/SECURITY.md`, `docs/TEST_PLAN.md`, `AGENTS.md` |
| **Reviewer / Approver** | Human Project Owner / System Administrator |

---

## 1. Target Lingkungan & Prasyarat Sistem

Ruang Pintar menggunakan arsitektur **Modular Monolith Next.js**. SQLite menjadi database pengembangan lokal; deployment Vercel menggunakan PostgreSQL Supabase. File upload masih memakai local storage dan harus dipindahkan ke storage persisten sebelum fitur upload digunakan di Vercel.

- **Runtime:** Node.js v20.x atau v22.x LTS.
- **Package Manager:** `npm` v10+ (atau kompatibel).
- **Database lokal:** SQLite (`DATABASE_URL=file:./data/ruang-pintar.db`).
- **Database production:** Supabase PostgreSQL. Runtime Vercel memakai connection string pooler di `DATABASE_URL`; migrasi Prisma memakai koneksi direct/session pooler di `DIRECT_URL`.
- **Prasyarat Konfigurasi `.env`:**
  - `DATABASE_URL`: SQLite lokal atau Supabase pooler saat production.
  - `DIRECT_URL`: Supabase direct/session pooler untuk perintah migrasi Prisma.
  - `AUTH_SECRET`: Kunci rahasia enkripsi token sesi (minimal 32 karakter acak).
  - `NODE_ENV`: Diset ke `production` saat rilis.
  - `MIDTRANS_SERVER_KEY` / `MIDTRANS_CLIENT_KEY`: Kunci integrasi gateway pembayaran (opsional pada mode simulasi).

---

## 2. Deploy Gate & Aturan Otorisasi Eksplisit

> [!CRITICAL]
> **Aturan Fikran Engineering:** Status dokumentasi yang lengkap, passing test suite, atau pesan build sukses **BUKAN izin untuk melakukan deployment**. Deployment ke server produksi **MUTLAK membutuhkan persetujuan dan otorisasi manusia eksplisit** (*Human Explicit Authorization*).

Sebelum deployment diizinkan:
1. Seluruh Quality Gate di `docs/TEST_PLAN.md` wajib berstatus PASS.
2. Snapshot backup database saat ini telah diamankan ke storage terpisah.
3. Jendela waktu rilis (*maintenance window*) telah disepakati untuk meminimalkan dampak pada aktivitas belajar siswa.

---

## 3. Langkah Rilis & Prosedur Deployment Bertahap

Lakukan rilis dengan urutan langkah kanonikal berikut:

```bash
# Langkah 1: Persiapan Repository
git fetch origin
git status # Pastikan working tree bersih

# Langkah 2: Instalasi Dependensi Terkunci
npm ci --prefer-offline

# Langkah 3: Eksekusi Migrasi Database (Prisma Migrate Deploy)
# Perintah ini menerapkan migrasi baru tanpa merusak skema yang sudah ada
npx prisma migrate deploy

# Langkah 4: Validasi Integritas Tipe & Linting
npm run typecheck
npm run lint

# Langkah 5: Kompilasi Binary Produksi Next.js
npm run build

# Langkah 6: Restart Layanan Aplikasi (contoh menggunakan PM2 atau Node service)
# pm2 reload ruang-pintar --update-env
```

---

## 4. Smoke Checks & Monitoring Pasca-Deploy

Setelah layanan berhasil di-restart, lakukan verifikasi cepat (*smoke test*):

1. **Pemeriksaan Responsivitas HTTP:**
   - Akses URL utama `/` dan pastikan mengembalikan status `200 OK`.
2. **Pemeriksaan Autentikasi:**
   - Lakukan uji login pada endpoint `/login` menggunakan akun staf pengujian.
   - Verifikasi bahwa session cookie disematkan dengan flag `HttpOnly`.
3. **Pemeriksaan Isolasi Tenant:**
   - Masuk ke dashboard dan pastikan data sekolah yang ditampilkan sesuai dengan `sekolah_aktif_id` pengguna.
4. **Pemeriksaan Health Log:**
   - Periksa log aplikasi untuk memastikan tidak ada unhandled exception atau kegagalan koneksi PostgreSQL.

---

## 5. Prosedur Rollback & Rencana Kontingensi

### Kondisi Pemicu Rollback (*Rollback Triggers*):
- Layanan aplikasi mengalami crash berulang (*crash loop*) pasca-start.
- Terjadi kegagalan query kritis atau database corruption pada PostgreSQL.
- Ditemukan kebocoran data antar-tenant (*data leakage*) atau kegagalan otorisasi fatal.

### Langkah Eksekusi Rollback:
1. **Hentikan Layanan Sementara:**
   Aktifkan halaman pemeliharaan sementara (*maintenance page*).
2. **Pulihkan Database Snapshot:**
   Pulihkan backup Supabase ke project PostgreSQL baru atau titik pemulihan yang sesuai. Jangan arahkan aplikasi sesudah cutover ke file SQLite lama karena perubahan setelah cutover tidak tercatat di SQLite.
3. **Kembalikan Versi Build Sebelumnya:**
   Checkout commit rilis stabil sebelumnya atau pulihkan build artifact `.next` sebelumnya.
4. **Restart Layanan & Verifikasi Ulang:**
   Nyalakan kembali aplikasi dan jalankan smoke check untuk memastikan platform kembali stabil.
5. **Dokumentasikan Insiden:**
   Catat penyebab kegagalan dan eskalasikan ke tim pengembang untuk remediasi sebelum jadwal rilis berikutnya.

---

## 6. Persiapan Database Supabase

1. Buat project Supabase PostgreSQL dan simpan connection strings sebagai secret server-side di Vercel. Gunakan pooled URL untuk `DATABASE_URL` aplikasi dan direct/session pooler untuk `DIRECT_URL` migrasi.
2. Siapkan salinan backup file SQLite sumber. Biarkan `DATABASE_URL` lokal tetap menunjuk ke SQLite dan tambahkan `DIRECT_URL` Supabase di `.env`. Jalankan baseline untuk membuat skema PostgreSQL kosong:
   ```powershell
   $env:DIRECT_URL = '<Supabase direct/session pooler URL>'
   npm run db:migrate:supabase
   ```
3. Setelah baseline diterapkan ke skema kosong, transfer data:
   ```powershell
   # Tambahkan TARGET_DATABASE_URL='<Supabase direct/session pooler URL>' ke .env.
   # DATABASE_URL SQLite yang sudah ada otomatis dipakai sebagai sumber.
   npm run db:transfer:supabase
   ```
   Skrip menolak target yang berisi data, menyalin model menurut dependensi, lalu mencocokkan jumlah baris dan SHA-256 isi setiap tabel. Jika gagal di tengah proses, jangan gunakan target itu; siapkan database kosong baru sebelum mencoba ulang.
4. Atur Vercel untuk memakai pooled `DATABASE_URL` Supabase dan `DIRECT_URL`. `vercel.json` menjalankan Prisma Client PostgreSQL sebelum build dan mengunci region function ke `hnd1` (Tokyo) agar berada di region yang sama dengan database Supabase (`ap-northeast-1`). Jika database dipindahkan ke region lain, ubah `regions` di `vercel.json` ke region Vercel terdekat dengan database tersebut.
5. Sebelum cutover data aktif, hentikan sementara penulisan ke aplikasi SQLite, ambil backup terakhir, transfer, cocokkan ringkasan data, lalu arahkan Vercel ke Supabase. Jangan hapus SQLite sampai pemilik memverifikasi hasil.

### Pemindahan file ke Supabase Storage

1. Buat bucket bernama `ruang-pintar-private` dengan akses publik **nonaktif** di Supabase Storage.
2. Siapkan `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, dan `SUPABASE_STORAGE_BUCKET` hanya sebagai secret server-side. Kunci service role melewati RLS dan tidak boleh masuk ke kode browser atau Git.
3. Sebelum cutover database, jalankan `npm run storage:transfer:supabase` saat `.env` masih menunjuk ke SQLite lokal. Skrip membaca file aktif, memeriksa checksum lokal, mengunggah lalu mengunduh ulang untuk memverifikasi checksum, dan baru kemudian mengubah `storage_provider`. File lokal dipertahankan untuk rollback.
4. Pastikan ringkasan menunjukkan seluruh file aktif berhasil dipindahkan. Set `STORAGE_PROVIDER=SUPABASE` pada Vercel agar upload baru masuk ke bucket privat.
5. Endpoint aplikasi tetap memeriksa autentikasi dan sekolah sebelum membaca berkas. Jangan menyajikan URL publik untuk berkas sekolah.

Penyimpanan lokal tetap didukung untuk development. Vercel memakai filesystem ephemeral sehingga produksi wajib menggunakan provider persisten.
