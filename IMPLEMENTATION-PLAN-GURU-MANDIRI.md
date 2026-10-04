# RENCANA IMPLEMENTASI: KEDAULATAN DATA GURU MANDIRI (STAGE UX-02)
## Ruang Pintar — School Digital Operating Platform (SaaS Multi-Tenant)

> **Dokumen Rencana:** `IMPLEMENTATION-PLAN-GURU-MANDIRI.md`  
> **Status:** PROPOSED — READY FOR ARCHITECT REVIEW  
> **Tanggal:** 28 September 2026  
> **Target Eksekusi:** Bertahap Berdasarkan Prioritas (P0 $\rightarrow$ P1 $\rightarrow$ P2)  
> **Spesifikasi Acuan:** `IMPLEMENTATION-SPEC-GURU-MANDIRI.md`  
> **Prinsip:** Tidak ada refactor besar, perubahan berfokus pada dampak langsung bagi pengguna (*User-Impact First*)

---

## DAFTAR ISI
1. [Struktur Prioritas Roadmap (P0, P1, P2)](#1-struktur-prioritas-roadmap-p0-p1-p2)
2. [Root Cause & Arsitektur Singkat](#2-root-cause--arsitektur-singkat)
3. [Files Affected Summary](#3-files-affected-summary)
4. [Rencana Detail Fase P0: Data Siswa, Hak Akses & Navigasi](#4-rencana-detail-fase-p0-data-siswa-hak-akses--navigasi)
5. [Rencana Detail Fase P1: Data Kelas & Statistik Dashboard](#5-rencana-detail-fase-p1-data-kelas--statistik-dashboard)
6. [Rencana Detail Fase P2: Onboarding Baru, Google Login & School Discovery](#6-rencana-detail-fase-p2-onboarding-baru-google-login--school-discovery)
7. [Data Integrity & Invariant Safeguards](#7-data-integrity--invariant-safeguards)
8. [Test Strategy & Verification Seams](#8-test-strategy--verification-seams)
9. [Rollback Strategy per Fase](#9-rollback-strategy-per-fase)
10. [Granular Task Breakdown & Checklist Eksekusi](#10-granular-task-breakdown--checklist-eksekusi)

---

## 1. Struktur Prioritas Roadmap (P0, P1, P2)

Sesuai arahan Architect Decision, roadmap pengerjaan diurutkan berdasarkan dampak fungsional langsung kepada guru:

```text
+-------------------------------------------------------------------------------+
| PRIORITAS P0 — HAK AKSES, DATA SISWA & NAVIGASI (IMMEDIATE VALUE)             |
| 1. Perluas AccessControlEngine agar mengenali is_owner_tenant.               |
| 2. Beri hak kelola kesiswaan (academic.students.*) untuk Guru Mandiri.        |
| 3. Buka halaman /data-siswa (hilangkan redirect 403 untuk owner).            |
| 4. Aktifkan menu "Data Siswa" di sidebar navigasi Guru Mandiri.               |
| 5. Buka izin aksi tambah, ubah, dan hapus siswa (student-actions.ts).         |
+-------------------------------------------------------------------------------+
                                      ↓
+-------------------------------------------------------------------------------+
| PRIORITAS P1 — DATA KELAS & STATISTIK DASHBOARD (CLASSROOM WORKFLOW)          |
| 1. Buka aksi edit dan hapus kelas (academic-actions.ts) untuk Tenant Owner.   |
| 2. Pasang kontrol UI Edit & Hapus pada kartu kelas di /kelas-saya.            |
| 3. Terapkan auto-assignment atomik saat rombel dibuat di tenant mandiri.      |
| 4. Perbaiki query metrik siswa & kelas di dashboard guru mandiri.             |
+-------------------------------------------------------------------------------+
                                      ↓
+-------------------------------------------------------------------------------+
| PRIORITAS P2 — ONBOARDING BARU, GOOGLE LOGIN & DISCOVERY (GROWTH & FUNNEL)    |
| 1. Update schema Prisma (password_hash nullable, google_id, onboarding_flag). |
| 2. Route Handler Google OAuth (/api/auth/google/callback).                    |
| 3. Redesign /register: hapus Wali Murid, username, konfirmasi password.       |
| 4. Modal Onboarding Wizard interaktif di atas background dashboard.           |
| 5. Alur percabangan Step 1 (Pilih Tipe) → Guru Mandiri lewati Cari Sekolah.   |
| 6. Hero CTA Google 1-Klik pada Landing Page.                                  |
+-------------------------------------------------------------------------------+
```

---

## 2. Root Cause & Arsitektur Singkat

Guru Mandiri saat ini tidak bisa mengelola siswa dan kelas karena sistem otorisasi mengabaikan kepemilikan tenant (*Tenant Ownership Blindness*). Dengan menambahkan hak berbasis kepemilikan (`is_owner === true` pada tenant aktif), Guru Mandiri langsung memperoleh kuasa penuh atas siswanya tanpa merusak hak guru biasa di sekolah formal dan tanpa perlu refactor skema database yang berisiko.

---

## 3. Files Affected Summary

| File | Kategori | Prioritas | Perubahan Utama |
| :--- | :---: | :---: | :--- |
| `src/shared/infrastructure/authorization/types.ts` | Backend Authz | **P0** | Tambah `is_owner?: boolean` ke `ActorContext`. |
| `src/shared/infrastructure/authorization/authz-guard.ts` | Backend Authz | **P0** | Kirim `user.is_owner_tenant` ke `ActorContext`. |
| `src/shared/infrastructure/authorization/access-control.ts` | Backend Authz | **P0** | Grant hak `academic.students.*` dan `academic.classes.*` ke owner. |
| `src/app/data-siswa/page.tsx` | UI & Page Guard | **P0** | Izinkan akses untuk owner tanpa redirect 403. |
| `src/app/actions/student-actions.ts` | Server Actions | **P0** | Buka create, update, delete siswa untuk owner. |
| `src/shared/components/shell/navigation-config.ts` | Navigation | **P0** | Tampilkan menu Data Siswa untuk Teacher Owner. |
| `src/shared/components/shell/sidebar.tsx` | Navigation UI | **P0** | Teruskan parameter owner ke navigasi filter. |
| `src/app/actions/academic-actions.ts` | Server Actions | **P1** | Buka update & delete rombel untuk owner. |
| `src/modules/academic/application/rombel-service.ts` | Backend Domain | **P1** | Auto-assign guru saat rombel dibuat di ruang mandiri. |
| `src/modules/learning/presentation/teacher-classes-view.tsx` | UI Komponen | **P1** | Tombol Edit & Hapus kelas pada kartu kelas. |
| `src/modules/teacher/application/teacher-facade.ts` | Backend Facade | **P1** | Fallback hitung seluruh siswa aktif tenant mandiri. |
| `prisma/schema.prisma` | Database | **P2** | Kolom Google OAuth, tipe sekolah, onboarding flag. |
| `src/app/register/register-form.tsx` | UI Auth | **P2** | Pemangkasan form registrasi (tanpa Wali Murid). |
| `src/modules/marketing/presentation/modern-landing-view.tsx` | UI Landing | **P2** | Tombol CTA Google 1-Klik. |
| `src/shared/components/dashboard/onboarding/` | UI Wizard | **P2** | Komponen Modal Wizard di atas background dashboard. |

---

## 4. Rencana Detail Fase P0: Data Siswa, Hak Akses & Navigasi

### Tujuan:
Guru Mandiri dapat langsung membuka `/data-siswa`, melihat menu Data Siswa di sidebar, serta mendaftarkan, mengedit, dan menghapus siswa tanpa galat 403.

### Langkah Kerja:
1. **Task P0-1: Otorisasi Tenant Owner pada Access Control Engine**
   - Edit `src/shared/infrastructure/authorization/types.ts`:
     Tambahkan `is_owner?: boolean;` pada `ActorContext`.
   - Edit `src/shared/infrastructure/authorization/authz-guard.ts`:
     Pada baris pembangunan `ActorContext`, sertakan `is_owner: user.is_owner_tenant`.
   - Edit `src/shared/infrastructure/authorization/access-control.ts`:
     Dalam method `evaluate()`, setelah verifikasi akun aktif dan isolasi tenant:
     ```typescript
     if (actor.is_owner) {
       grantedPermissions.add("academic.students.view");
       grantedPermissions.add("academic.students.manage");
       grantedPermissions.add("academic.classes.view");
       grantedPermissions.add("academic.classes.manage");
       grantedPermissions.add("academic.structure.view");
       grantedPermissions.add("academic.structure.manage");
     }
     ```
2. **Task P0-2: Pelepasan Blokade pada Halaman `/data-siswa`**
   - Edit `src/app/data-siswa/page.tsx`:
     Perbarui evaluasi hak akses agar memperhitungkan `user.is_owner_tenant`.
     Pastikan `canViewStudents` dan `canManageStudents` bernilai `true` untuk Tenant Owner.
     Hilangkan redirect paksa ke `/dashboard` bagi akun Guru Mandiri.
3. **Task P0-3: Integrasi Menu "Data Siswa" pada Sidebar Bilah Samping**
   - Edit `src/shared/components/shell/navigation-config.ts`:
     Perbarui `getFilteredNavigation(userRole, userCapabilities, isOwner)`.
     Sertakan item menu Data Siswa untuk role `TEACHER` bila `isOwner === true`.
   - Edit `src/shared/components/shell/sidebar.tsx` dan `mobile-bottom-nav.tsx`:
     Teruskan properti `user.is_owner_tenant` ke pemanggilan `getFilteredNavigation`.
4. **Task P0-4: Verifikasi Server Action Mutasi Siswa**
   - Uji aksi `createStudentAction`, `updateStudentAction`, `deleteStudentAction`, dan `bulkDeleteStudentsAction` menggunakan sesi Guru Mandiri.
   - Pastikan seluruh operasi berhasil dieksekusi dan tersimpan rapi di database.

---

## 5. Rencana Detail Fase P1: Data Kelas & Statistik Dashboard

### Tujuan:
Guru Mandiri memiliki kontrol penuh atas kelasnya (bisa membuat, mengubah nama, dan menghapus kelas), dengan jaminan bahwa setiap kelas otomatis terhubung ke KBM guru dan tercatat di statistik dashboard.

### Langkah Kerja:
1. **Task P1-1: Hak Mutasi Kelas (Rombel) untuk Owner**
   - Verifikasi bahwa `updateRombelAction` dan `deleteRombelAction` di `academic-actions.ts` berhasil dieksekusi oleh Guru Mandiri berkat penambahan permission `academic.structure.manage` pada P0.
2. **Task P1-2: Tombol Edit & Hapus Kelas pada UI `/kelas-saya`**
   - Edit `src/modules/learning/presentation/teacher-classes-view.tsx`:
     Pada kartu kelas (*Rombel Card*), tambahkan dropdown menu/tombol aksi:
     - **Ubah Nama/Tingkat Kelas:** Membuka modal ringkas ubah nama rombel.
     - **Hapus Kelas:** Membuka konfirmasi hapus kelas (memanggil `deleteRombelAction`).
3. **Task P1-3: Auto-Assignment Atomik saat Kelas Dibuat**
   - Edit `src/modules/academic/application/rombel-service.ts` atau action pembuatan kelas:
     Saat rombel berhasil dibuat pada tenant mandiri, secara atomik buat baris `PenugasanMengajar` yang mengikat rombel tersebut ke `guru.id` pemilik tenant.
4. **Task P1-4: Perbaikan Metrik Dashboard Guru Mandiri**
   - Edit `src/modules/teacher/application/teacher-facade.ts`:
     Pada `getTeacherDashboardData`, jika pengguna adalah owner tenant, hitung `totalSiswaBinaan` dari total seluruh siswa aktif di tenant tersebut jika penugasan mengajar belum terpetakan menyeluruh.

---

## 6. Rencana Detail Fase P2: Onboarding Baru, Google Login & School Discovery

### Tujuan:
Menghilangkan friksi pendaftaran, menjadikan Google sebagai jalur utama, mengeluarkan Wali Murid dari form publik, dan menghadirkan pengalaman onboarding modal wizard di atas dashboard sesuai alur bisnis Source of Truth.

### Langkah Kerja:
1. **Task P2-1: Database Schema Expansion (Non-Destructive)**
   - Perbarui `prisma/schema.prisma`:
     - `Pengguna.password_hash` menjadi nullable (`String?`).
     - Tambah `auth_provider String @default("LOCAL")`.
     - Tambah `google_id String? @unique`.
     - Tambah `onboarding_selesai Boolean @default(false)`.
     - Tambah `Sekolah.tipe_sekolah String @default("FORMAL")`.
     - Tambah `Sekolah.nama_normalisasi String?`.
     - Tambah `Sekolah.kota_kabupaten String?`.
   - Jalankan `npx prisma migrate dev` dan buat skrip backfill untuk akun lama (`onboarding_selesai = true`).
2. **Task P2-2: Handler Google OAuth**
   - Buat `src/app/api/auth/google/login/route.ts` dan `src/app/api/auth/google/callback/route.ts`.
   - Ekstrak nama, email, dan foto profil. Buat sesi dan redirect ke `/dashboard`.
3. **Task P2-3: Redesign Form Registrasi Publik (`/register`)**
   - Hapus tab selector Wali Murid.
   - Hapus input username, konfirmasi password, dan asal sekolah teks bebas.
   - Tambah tombol pintas Google di bagian atas.
   - Sederhanakan input email menjadi 3 kolom: Nama, Email, Password.
4. **Task P2-4: Komponen Modal Onboarding Wizard di Atas Dashboard**
   - Buat `src/shared/components/dashboard/onboarding/onboarding-wizard-modal.tsx`.
   - Terapkan urutan:
     - **Slide 1:** Pilih Tipe Pendidik (Guru Sekolah vs Guru Mandiri).
     - **Slide 2:** Jika Guru Sekolah $\rightarrow$ Searchable School Discovery; Jika Guru Mandiri $\rightarrow$ **Lewati pencarian sekolah**, langsung siapkan Ruang Mengajar Mandiri.
     - **Slide 3:** Pilih Avatar (Foto Google atau Astronaut Avatar) $\rightarrow$ simpan ke database `Pengguna.foto_url`.
     - **Slide 4:** Ringkasan & Tombol "Mulai Mengajar 🚀".
5. **Task P2-5: Redesign Landing Page Hero CTA**
   - Tombol Utama: *"Coba Gratis 30 Hari dengan Google"*.
   - Tombol Sekunder: *"Daftar dengan Email"*.

---

## 7. Data Integrity & Invariant Safeguards

1. **Prinsip Anti-Kebocoran Data:**
   Otoritas Owner **dibatasi secara mutlak pada tenant aktif**. Request ke entitas sekolah lain selalu memicu error 403 Forbidden.
2. **Prinsip Hubungan KBM:**
   Siswa tidak boleh mengambang tanpa kelas di ruang mandiri. Pembuatan kelas wajib atomik dengan penugasan guru.
3. **Prinsip Immutability Migrasi:**
   Seluruh perubahan skema Prisma di P2 hanya berupa penambahan kolom opsional/default (*expand pattern*). Tidak ada kolom lama yang diubah atau dihapus.

---

## 8. Test Strategy & Verification Seams

Verifikasi dilakukan pada setiap tahapan sebelum dinyatakan selesai:

```bash
# 1. Pengecekan Integritas Tipe Data
npm run typecheck    # Wajib 0 error (TypeScript 5.8)

# 2. Pengecekan Standar Kode
npm run lint         # Wajib 0 error (ESLint 9)
npm run format:check # Wajib 100% rapi (Prettier)

# 3. Pengecekan Test Suite Vitest
npm run test         # Wajib 100% PASS (686+ tests baseline + test baru)

# 4. Kompilasi Produksi
npm run build        # Wajib lolos Next.js production build
```

### Test Files Baru yang Akan Ditambahkan:
1. `src/test/authorization/tenant-owner-access.test.ts` (Menguji izin CRUD owner vs guru biasa).
2. `src/test/student/guru-mandiri-student-lifecycle.test.ts` (Menguji alur kesiswaan Guru Mandiri).
3. `src/test/learning/guru-mandiri-class-lifecycle.test.ts` (Menguji alur kelas Guru Mandiri).

---

## 9. Rollback Strategy per Fase

- **Rollback P0:** Cukup revert logika `actor.is_owner` pada `access-control.ts` dan rute navigasi. Tidak ada dampak database.
- **Rollback P1:** Revert perubahan komponen UI `/kelas-saya`.
- **Rollback P2:** Jika integrasi Google OAuth terkendala kredensial eksternal, form registrasi email 3-kolom tetap berfungsi mandiri sebagai fallback.

---

## 10. Granular Task Breakdown & Checklist Eksekusi

### FASE P0 — DATA SISWA, HAK AKSES & NAVIGASI GURU MANDIRI
- [ ] **TASK P0-1:** Tambahkan properti `is_owner?: boolean` pada `ActorContext` di `types.ts`.
- [ ] **TASK P0-2:** Teruskan `user.is_owner_tenant` dari session ke `ActorContext` di `authz-guard.ts`.
- [ ] **TASK P0-3:** Perbarui `access-control.ts` agar memberikan hak `academic.students.*` dan `academic.classes.*` kepada Tenant Owner.
- [ ] **TASK P0-4:** Buat unit test otorisasi `tenant-owner-access.test.ts` untuk memverifikasi hak owner vs guru sekolah biasa.
- [ ] **TASK P0-5:** Sesuaikan guard halaman `src/app/data-siswa/page.tsx` agar mengizinkan Guru Mandiri masuk tanpa redirect.
- [ ] **TASK P0-6:** Perbarui `navigation-config.ts` dan `sidebar.tsx` agar menu "Data Siswa" tampil pada sidebar Guru Mandiri.
- [ ] **TASK P0-7:** Verifikasi aksi tambah, ubah, dan hapus siswa di `student-actions.ts` menggunakan akun Guru Mandiri.
- [ ] **TASK P0-8:** Jalankan quality gate P0 (`npm run typecheck`, `npm run test`).

### FASE P1 — DATA KELAS & STATISTIK DASHBOARD GURU MANDIRI
- [ ] **TASK P1-1:** Verifikasi `updateRombelAction` dan `deleteRombelAction` dapat dijalankan oleh Guru Mandiri.
- [ ] **TASK P1-2:** Tambahkan modal/tombol Ubah dan Hapus Kelas pada antarmuka `/kelas-saya` (`teacher-classes-view.tsx`).
- [ ] **TASK P1-3:** Terapkan pembuatan otomatis `PenugasanMengajar` saat rombel dibuat di ruang mandiri.
- [ ] **TASK P1-4:** Perbaiki agregasi statistik siswa dan kelas pada `teacher-facade.ts` untuk ruang mandiri.
- [ ] **TASK P1-5:** Buat integration test `guru-mandiri-class-lifecycle.test.ts`.
- [ ] **TASK P1-6:** Jalankan quality gate P1 (`npm run typecheck`, `npm run test`).

### FASE P2 — ONBOARDING BARU, GOOGLE LOGIN & SCHOOL DISCOVERY
- [ ] **TASK P2-1:** Update `prisma/schema.prisma` dan jalankan migrasi lokal non-destruktif.
- [ ] **TASK P2-2:** Buat Route Handler Google OAuth (`/api/auth/google/callback`).
- [ ] **TASK P2-3:** Bersihkan form `/register` (keluarkan Wali Murid, username, konfirmasi password, nama sekolah teks bebas).
- [ ] **TASK P2-4:** Bangun komponen In-Dashboard Modal Onboarding Wizard (`onboarding-wizard-modal.tsx`) dengan alur Step 1 Tipe $\rightarrow$ Guru Mandiri lewati Cari Sekolah.
- [ ] **TASK P2-5:** Simpan pilihan avatar ke kolom `foto_url` database `Pengguna`.
- [ ] **TASK P2-6:** Perbarui Hero CTA Landing Page dengan tombol "Coba Gratis 30 Hari dengan Google".
- [ ] **TASK P2-7:** Jalankan verifikasi menyeluruh (`typecheck`, `lint`, `format:check`, `test`, `build`).

---

Kedua dokumen perancangan di atas telah selesai disusun dan siap ditinjau oleh Architect Owner sebelum eksekusi Task P0 dimulai.
