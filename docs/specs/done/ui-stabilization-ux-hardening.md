# SPEC-19: UI STABILIZATION, NAVIGATION REPAIR & UX HARDENING
## Production Readiness, Unified Academic Glass UI & Navigation Integrity

| Metadata | Nilai |
| :--- | :--- |
| **Stage** | STAGE 19 — UI STABILIZATION, NAVIGATION REPAIR & UX HARDENING |
| **Status** | `completed` (Ready for Human Review) |
| **Karakteristik** | Critical Quality Hardening • No New Domain • No New Migration |
| **Target Pengguna** | Super Admin, Kepala Sekolah, Operator Sekolah, Guru, Wali Kelas, Wali Murid |
| **Prinsip UI** | Academic Glass UI Design System & Anti-Slop Directive |

---

## 1. Problem Statement & Background

Pasca penyelesaian Stage 18 (Digital Report Card Engine), platform Ruang Pintar telah memiliki fungsionalitas domain inti yang lengkap (Akademik, Jadwal, LMS, Presensi, CBT, Billing SaaS, Guardian Claim, e-Rapor). Namun demikian, audit operasional komprehensif mengidentifikasi celah UX dan inkonsistensi antarmuka:
1. **Dead Navigation & False 403s:**
   - Menu *Struktur Kurikulum & Rombel* (`/struktur-akademik`) dan *Data Kesiswaan Global* (`/data-siswa`) mengabaikan Super Admin yang belum memiliki asosiasi tenant tunggal (`sekolah_id = null`), menyebabkan redirect balik ke `/dashboard`.
   - Menu *Laporan & Analitik* (`/pimpinan`) melempar exception 403 "Akses Kepemimpinan Ditolak: Pengguna tidak terasosiasi dengan sekolah" saat dibuka oleh Super Admin.
2. **Ketiadaan Standar DataTable Global:**
   - Beragam tabel memanjang tanpa pagination atau batas baris data.
   - Toolbar tidak seragam (beberapa tabel hanya memiliki search sederhana tanpa export, filter, atau column visibility).
   - Empty state tabel tidak profesional atau hanya teks polos.
3. **Kesenjangan Kualitas Antar Dashboard:**
   - Dashboard Guru (Teacher Cockpit) telah mencapai standar Academic Glass UI yang sangat tinggi, sedangkan Dashboard Super Admin, Operator, dan Pimpinan masih menggunakan layout lama yang belum selaras.
4. **Inkonsistensi Design Tokens & Motion:**
   - Variasi radius kartu (12px, 16px, 24px) dan padding yang tidak beraturan.
   - Ketiadaan motion system yang terstandarisasi (fade-in, hover elevation, KPI count-up).

---

## 2. Functional & Architectural Requirements

### 2.1. Navigation & Route Repair (Workstream 01 & 06)
- **Super Admin Multi-Tenant Resolver:**
  - Route `/struktur-akademik`, `/data-siswa`, dan `/pimpinan` secara otomatis mendeteksi peran `SUPER_ADMIN`.
  - Jika `user.sekolah_id` bernilai `null`, sistem menyediakan fallback cerdas: mengambil sekolah pertama dari database dan menyertakan **School Switcher Bar** di bagian atas, memungkinkan Super Admin berpindah konteks sekolah secara mulus melalui parameter `?sekolahId=...`.
  - Route guard mengizinkan `SUPER_ADMIN` melihat dan mengelola data tanpa melempar 403 atau me-redirect kembali ke dashboard.
- **Navigation Menu Filtering:**
  - Sidebar hanya menampilkan menu yang valid dan dapat diakses oleh peran aktif pengguna.
  - Setiap menu yang muncul di sidebar dijamin 100% dapat dibuka.

### 2.2. Global DataTable Standard (Workstream 02)
Komponen `AcademicDataTable` memenuhi standar:
1. **Toolbar Seragam:**
   - Input pencarian (Search) dengan clear icon.
   - Dropdown Filter dinamis.
   - Tombol Refresh dengan animasi loading.
   - Tombol Export CSV otomatis.
   - Dropdown Column Visibility untuk menyembunyikan/menampilkan kolom tertentu.
2. **Pagination:**
   - Pilihan baris per halaman: 10 (default), 25, 50, 100.
   - Footer informatif: `"Menampilkan {start}–{end} dari {total} data"`.
   - Tombol navigasi halaman (Prev, Next, Page Numbers).
3. **Interactive Sorting:**
   - Kolom yang ditandai sortable dapat diklik untuk toggle Ascending / Descending dengan indikator ikon panah.
4. **Academic Glass Empty State:**
   - Tampilan kosong yang elegan saat tidak ada data atau hasil filter nihil, dilengkapi ikon domain, judul, dan saran tindakan.
5. **Mobile View:**
   - Tabel responsif: beralih ke format daftar kartu (card list) pada resolusi mobile (`sm:hidden`).

### 2.3. Dashboard Hardening (Workstream 03 & 04)
Menyelaraskan seluruh dashboard dengan struktur standar:
1. **Hero Header:** Judul modul, deskripsi operasional, badge status sistem, dan filter tenant/sekolah.
2. **KPI Metrics Cards:** Card Radius 24px, Card Padding 24px, animasi Count-Up (`AnimatedCounter`), indikator tren, dan status dot riil.
3. **Operational Widgets:** Gap antar kartu 24px (`gap-6`), gap antar elemen 16px (`gap-4`).
4. **Recent Activity & Insights:** Log audit dan visualisasi rasio sistem yang bersih dengan modal preview snapshot JSON.

### 2.4. Motion System & Design Tokens (Workstream 05)
- Standard Token:
  - Radius: `rounded-3xl` (24px) untuk kartu utama.
  - Padding: `p-6` (24px) untuk container kartu.
  - Background: Glassmorphism halus dengan border tipis `border-slate-200/80` (light) atau `border-slate-800/80` (dark).
- Motion:
  - Page Fade In: `animate-in fade-in duration-300`.
  - Hover Elevation: `hover:-translate-y-0.5 hover:shadow-md transition-all duration-200`.
  - Button click tactile feedback: `active:scale-[0.98]`.

---

## 3. Acceptance Criteria

- [x] Super Admin dapat membuka menu *Struktur Kurikulum & Rombel* (`/struktur-akademik`) tanpa redirect ke `/dashboard`.
- [x] Super Admin dapat membuka menu *Data Kesiswaan Global* (`/data-siswa`) tanpa redirect ke `/dashboard`.
- [x] Super Admin dapat membuka menu *Laporan & Analitik* (`/pimpinan`) tanpa error 403 Forbidden.
- [x] Komponen `AcademicDataTable` terpasang pada direktori Guru, Direktori Sekolah, dan Audit Trail Explorer.
- [x] Pagination berfungsi default 10 baris dengan footer `"Menampilkan 1–10 dari ... data"`.
- [x] Toolbar memiliki fitur Search, Filter, Refresh, Export CSV, dan Column Visibility.
- [x] Dashboard Super Admin memiliki struktur hero header, KPI cards kaca 24px, widgets, and recent activity yang setara kualitasnya dengan Dashboard Guru.
- [x] Seluruh Quality Gate lulus 100%: `npm run typecheck`, `npm run lint`, `npm run test` (110 files / 675 tests), `npm run build`.
