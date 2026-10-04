# RUANG PINTAR SAAS — STAGE 19 DELIVERABLE
# NAVIGATION REPAIR REPORT

| Metadata | Nilai |
| :--- | :--- |
| **Stage** | STAGE 19 — UI STABILIZATION, NAVIGATION REPAIR & UX HARDENING |
| **Workstream** | WS 01 (Navigation Repair) & WS 06 (Dead Menu Elimination) |
| **Status** | `COMPLETED` |

---

## 1. Analisis Akar Masalah

Pada arsitektur SaaS Multi-Tenant Ruang Pintar:
1. Akun dengan peran `SUPER_ADMIN` bertindak sebagai administrator platform level sistem dan dapat memiliki kolom `sekolah_id = null`.
2. Beberapa halaman operasional seperti `/struktur-akademik`, `/data-siswa`, dan `/pimpinan` sebelumnya mengasumsikan setiap pengguna yang masuk selalu memiliki `user.sekolah_id` statis.
3. Dampaknya:
   - Super Admin ditolak dengan exception `UnauthorizedLeadershipAccessError (403)` pada `/pimpinan`.
   - Super Admin di-redirect secara sepihak ke `/dashboard` pada `/struktur-akademik` dan `/data-siswa`.

---

## 2. Solusi & Perbaikan Arsitektur

### 2.1. Leadership Analytics Service (`src/modules/reporting/application/leadership-analytics-service.ts`)
- Menambahkan penanganan khusus untuk peran `SUPER_ADMIN`:
  ```typescript
  if (user.peran_dasar === "SUPER_ADMIN") {
    let targetSekolahId = sekolahIdOverride || user.sekolah_id;
    if (!targetSekolahId) {
      const firstSchool = await prisma.sekolah.findFirst({
        orderBy: { created_at: "asc" },
        select: { id: true, nama: true },
      });
      targetSekolahId = firstSchool?.id ?? null;
    }
    // Mengembalikan konteks kepemimpinan HEADMASTER dengan can_switch_roles: true
  }
  ```
- Menerapkan Dependency Injection pada constructor `LeadershipAnalyticsService(private readonly repo: any = reportingRepository)` agar dapat diuji secara independen tanpa ketergantungan database.

### 2.2. Halaman `/pimpinan` (`src/app/pimpinan/page.tsx`)
- Mendukung pemindaian daftar seluruh sekolah di sistem ketika diakses oleh `SUPER_ADMIN`.
- Menampilkan **School Switcher Bar** interaktif yang memungkinkan Super Admin melihat metrik kepemimpinan sekolah mana pun secara instan via `?sekolahId=...`.
- Mengganti pesan error 403 generik dengan Academic Glass Empty State dan panduan pemilihan sekolah.

### 2.3. Halaman `/struktur-akademik` (`src/app/struktur-akademik/page.tsx`)
- Mengizinkan peran `SUPER_ADMIN` untuk melihat struktur kurikulum (`canViewStructure = true`) dan mengelola (`canManageStructure = true`).
- Menambahkan **School Switcher Bar** multi-tenant jika Super Admin sedang mengakses platform.

### 2.4. Halaman `/data-siswa` (`src/app/data-siswa/page.tsx`)
- Mengizinkan peran `SUPER_ADMIN` untuk melihat data siswa (`canViewStudents = true`) dan mengelola (`canManageStudents = true`).
- Menambahkan dropdown pemilihan sekolah untuk Super Admin.

### 2.5. Sidebar Menu Integrity Check (`src/shared/components/shell/navigation-config.ts`)
- Seluruh 14 tautan menu pada sidebar Super Admin, Pimpinan, Guru, dan Wali Kelas telah diverifikasi terikat ke page handler aktif:
  - `/dashboard` ✓
  - `/sekolah` ✓
  - `/guru-pengajaran` ✓
  - `/struktur-akademik` ✓
  - `/data-siswa` ✓
  - `/pimpinan` ✓
  - `/penilaian` ✓
  - `/jadwal-sekolah` ✓
  - `/kalender-akademik` ✓
  - `/sesi-pembelajaran` ✓
  - `/cbt-ujian` ✓
  - `/rapor-siswa` ✓
  - `/integrasi` ✓
  - `/profil` ✓

---

## 3. Bukti Verifikasi Pengujian

Unit test terisolasi `src/test/ui/navigation-repair.test.ts` membuktikan:
1. `SUPER_ADMIN` dengan `sekolah_id = null` secara sukses memperoleh konteks kepemimpinan fallback (`PASS`).
2. Peran non-kepemimpinan tanpa jabatan tetap ditolak dengan `UnauthorizedLeadershipAccessError` sesuai invariant keamanan (`PASS`).
