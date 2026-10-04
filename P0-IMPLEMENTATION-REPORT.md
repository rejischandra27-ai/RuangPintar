# LAPORAN IMPLEMENTASI FASE P0: DATA SISWA, HAK AKSES GURU MANDIRI & NAVIGASI
## Ruang Pintar — School Digital Operating Platform (SaaS Multi-Tenant)

> **Dokumen Laporan:** `P0-IMPLEMENTATION-REPORT.md`  
> **Status:** COMPLETED — READY FOR HUMAN REVIEW  
> **Tanggal Selesai:** 28 September 2026  
> **Fase:** PHASE P0 (Data Siswa, Hak Akses Guru Mandiri, Navigasi)  
> **Spesifikasi Acuan:** `IMPLEMENTATION-SPEC-GURU-MANDIRI.md` (APPROVED)  
> **Rencana Acuan:** `IMPLEMENTATION-PLAN-GURU-MANDIRI.md` (APPROVED)  
> **Batasan:** P1 dan P2 tidak disentuh; Tidak ada refactor besar; Tidak mengubah arsitektur multi-tenant.

---

## 1. File yang Diubah

Berikut adalah daftar berkas yang dimodifikasi pada Phase P0:

| No | Berkas | Layer / Kategori | Deskripsi Singkat |
| :---: | :--- | :--- | :--- |
| 1 | `src/shared/infrastructure/authorization/types.ts` | Backend Authz | Menambahkan field `is_owner?: boolean` dan `tipe_sekolah?: string` ke interface `ActorContext`. |
| 2 | `src/shared/infrastructure/authorization/authz-guard.ts` | Backend Authz Guard | Memetakan dan meneruskan `user.is_owner_tenant` dari session aktif ke dalam `ActorContext` pada fungsi `requirePermission` dan `checkPermission`. |
| 3 | `src/shared/infrastructure/authorization/access-control.ts` | Access Control Engine | Memberikan hak akses kesiswaan dan kelas (`academic.students.view`, `academic.students.manage`, `academic.classes.view`, `academic.classes.manage`, `academic.structure.view`, `academic.structure.manage`) kepada Tenant Owner (`actor.is_owner === true`). |
| 4 | `src/app/data-siswa/page.tsx` | UI & Page Guard | Membuka guard halaman `/data-siswa` untuk Tenant Owner (`isOwner = Boolean(user.is_owner_tenant)`) sehingga `canViewStudents` dan `canManageStudents` bernilai `true` tanpa memicu redirect 403 ke dashboard. |
| 5 | `src/shared/components/shell/navigation-config.ts` | Navigation Config | Menambahkan properti `requiredOwner?: boolean` pada `NavItem`, mendaftarkan item `teacher-students` ("Data Siswa") pada kelompok navigasi `teacher-ops` tepat di bawah "Kelas Saya", serta memperbarui fungsi `getFilteredNavigation` dengan parameter `isOwner`. |
| 6 | `src/shared/components/shell/sidebar.tsx` | Shell UI Component | Menambahkan properti `isOwner?: boolean` pada `SidebarProps` dan meneruskannya ke fungsi `getFilteredNavigation`. |
| 7 | `src/shared/components/shell/mobile-drawer.tsx` | Shell UI Component | Menambahkan properti `isOwner?: boolean` pada `MobileDrawerProps` dan meneruskannya ke fungsi `getFilteredNavigation`. |
| 8 | `src/shared/components/shell/mobile-bottom-nav.tsx` | Shell UI Component | Menambahkan item pintasan "Siswa" (`/data-siswa`) pada bottom navigation khusus Guru Mandiri (`TEACHER` dengan `isOwner: true`). |
| 9 | `src/shared/components/shell/academic-shell.tsx` | Shell Container | Meneruskan `isOwner={Boolean(user.is_owner_tenant)}` dari objek `user` ke `Sidebar`, `MobileDrawer`, dan `MobileBottomNav`. |

---

## 2. Perubahan yang Dilakukan

### 2.1 Engine Otorisasi Berbasis Kepemilikan Tenant (Tenant-Owner Entitlement)
- **Akar Masalah Terselesaikan:** Sebelumnya, `ActorContext` hanya membaca `peran_dasar: "TEACHER"`. Walaupun sesi pengguna memiliki atribut `is_owner_tenant: true`, engine otorisasi mengabaikannya sehingga Guru Mandiri disetarakan dengan guru biasa di sekolah besar yang tidak berhak mengelola data siswa.
- **Solusi Implementasi:**
  - `ActorContext` kini memuat `is_owner?: boolean`.
  - `authz-guard.ts` mengekstrak `user.is_owner_tenant` dari session pengguna dan memasukkannya ke `ActorContext`.
  - `access-control.ts` mengevaluasi kondisi `if (actor.is_owner)` dan memberikan hak `academic.students.view` serta `academic.students.manage` di tenant aktif miliknya.
- **Integritas Boundary Multi-Tenant:**
  - Evaluasi kepemilikan owner **tidak mengabaikan isolasi tenant**. Cek isolasi di baris 38–55 pada `access-control.ts` tetap berjalan ketat: jika resource menargetkan `sekolah_id` lain, sistem secara instan mengembalikan **DENY** (`Cross-school resource access prohibited`).

### 2.2 Pelepasan Blokade pada Halaman Data Siswa (`/data-siswa`)
- Evaluasi server guard pada `src/app/data-siswa/page.tsx` kini mengenali `user.is_owner_tenant`.
- Guru Mandiri diberikan wewenang penuh (`canViewStudents = true`, `canManageStudents = true`), membuka tombol **+ Tambah Siswa**, formulir edit siswa, aksi hapus siswa, dan pemilihan rombel/keikutsertaan.

### 2.3 Pembukaan Aksi Server Kesiswaan (`student-actions.ts`)
- Server Actions berikut terverifikasi dapat dieksekusi secara mulus oleh Guru Mandiri:
  1. `createStudentAction`: Berhasil membuat identitas siswa dan tersimpan di database.
  2. `updateStudentAction`: Berhasil memperbarui atribut siswa.
  3. `deleteStudentAction`: Berhasil menghapus data siswa non-riwayat.
  4. `bulkDeleteStudentsAction`: Berhasil melakukan penghapusan massal.
- Guru biasa di sekolah formal tetap ditolak secara server-side saat mencoba mengeksekusi aksi-aksi di atas.

### 2.4 Integrasi Navigasi Desktop & Mobile
- **Desktop Sidebar:** Item menu **Data Siswa** (`/data-siswa`) otomatis muncul di sidebar navigasi Guru Mandiri tepat di bawah menu **Kelas Saya**.
- **Mobile Bottom Nav:** Item **Siswa** otomatis disematkan pada bilah bawah navigasi mobile Guru Mandiri.
- **Guru Formal Isolation:** Guru biasa di sekolah formal yang bukan owner tenant (`is_owner: false`) **tidak melihat** menu Data Siswa di sidebar maupun di mobile bottom nav.

---

## 3. Test yang Ditambahkan

Dua test suite baru telah dibuat dan lulus 100% PASS:

### 3.1 Unit Test Otorisasi Tenant Owner: `src/test/authorization/tenant-owner-access.test.ts`
- **Total:** 9 tests (100% PASS)
- **Skenario Pengujian:**
  1. Guru biasa di sekolah formal **DITOLAK** saat melihat dan mengelola data siswa.
  2. Guru Mandiri (`is_owner = true`) **DIIZINKAN** melihat dan mengelola data siswa di tenant miliknya.
  3. Guru Mandiri (`is_owner = true`) **DIIZINKAN** mengelola struktur kelas dan rombel di tenant miliknya.
  4. **Strict Isolation:** Guru Mandiri **DITOLAK** secara mutlak saat mencoba mengakses data tenant sekolah lain (`Cross-school resource access prohibited`).
  5. Guru Mandiri dengan akun non-aktif (`SUSPENDED`) **DITOLAK** dari semua akses.
  6. Guru biasa di sekolah formal **TIDAK** melihat menu Data Siswa di sidebar.
  7. Guru Mandiri **MELIHAT** menu Data Siswa di sidebar tepat pada posisi setelah Kelas Saya.
  8. Navigasi Guru Mandiri bebas dari duplikasi tautan rute (*Unique Hrefs Invariant*).
  9. Mobile Bottom Navigation menampilkan pintasan Siswa khusus bagi Guru Mandiri.

### 3.2 Integration Test Siklus Kesiswaan: `src/test/student/guru-mandiri-student-lifecycle.test.ts`
- **Total:** 7 tests (100% PASS)
- **Skenario Pengujian:**
  1. Guru Mandiri lolos `checkPermission("academic.students.view")` dan `checkPermission("academic.students.manage")` pada halaman `/data-siswa`.
  2. Guru biasa di sekolah formal ditolak pada `checkPermission("academic.students.manage")`.
  3. Guru Mandiri berhasil menambah siswa baru via `createStudentAction` (terverifikasi langsung di SQLite via Prisma).
  4. Guru Mandiri berhasil mengubah profil siswa via `updateStudentAction`.
  5. Guru Mandiri berhasil menghapus siswa via `deleteStudentAction`.
  6. Guru Mandiri berhasil menghapus massal siswa via `bulkDeleteStudentsAction`.
  7. Guru biasa di sekolah formal ditolak dengan pesan otorisasi resmi saat mencoba menjalankan `createStudentAction`.

---

## 4. Hasil Quality Gate

Kelima Quality Gate yang disyaratkan oleh `AGENTS.md` dijalankan dan lulus 100%:

```text
================================================================================
QUALITY GATE VERIFICATION REPORT — PHASE P0
================================================================================
1. TypeScript Check (tsc --noEmit)
   Command: npm run typecheck
   Result : 0 Errors (TypeScript 5.8 Clean)

2. Linter (ESLint 9)
   Command: npm run lint
   Result : 0 Errors, 4 non-blocking legacy image warnings (Clean)

3. Code Formatting (Prettier)
   Command: npm run format:check
   Result : All matched files use Prettier code style! (100% Clean)

4. Test Suite (Vitest)
   Command: npm run test
   Result : 114 test files passed, 702 tests passed, 0 failed (100% PASS)

5. Production Build (Next.js 16.3.3 Turbopack)
   Command: npm run build
   Result : Compiled successfully in 20.7s, 27/27 routes generated (100% PASS)
================================================================================
```

---

## 5. Screenshot Evidence

Bukti tangkapan layar antarmuka nyata berhasil diambil menggunakan Playwright otomatis pada sesi Guru Mandiri vs Guru Formal:

### 5.1 Halaman Data Siswa Guru Mandiri (`/data-siswa`)
- **File Bukti:** `docs/phases/screenshots/guru-mandiri-p0-data-siswa.png`
- **Bukti yang Terlihat:**
  - Halaman `/data-siswa` berhasil dimuat tanpa redirect ke dashboard.
  - Menu sidebar "Data Siswa" menyala aktif (terang) di bawah "Kelas Saya".
  - Tombol **+ Tambah Siswa** tampil aktif dan siap digunakan.
  - Tabel siswa, badge status, aksi detail, edit, dan hapus dapat diakses sepenuhnya oleh Guru Mandiri.

### 5.2 Sidebar Navigasi Guru Mandiri (`/dashboard`)
- **File Bukti:** `docs/phases/screenshots/guru-mandiri-p0-sidebar.png`
- **Bukti yang Terlihat:**
  - Pada dashboard Guru Mandiri, grup navigasi "AKADEMIK & PENGAJARAN" memuat menu **Data Siswa** tepat di bawah "Kelas Saya".

### 5.3 Sidebar Navigasi Guru Sekolah Biasa (`/dashboard`) — Kontrol Negatif
- **File Bukti:** `docs/phases/screenshots/regular-teacher-p0-sidebar.png`
- **Bukti yang Terlihat:**
  - Pada dashboard Guru Sekolah Biasa (bukan owner), grup navigasi "AKADEMIK & PENGAJARAN" **hanya** menampilkan menu standar (*Kelas Saya, Jadwal Mengajar, Log Sesi KBM, dll.*).
  - Menu "Data Siswa" **tidak muncul**, membuktikan tidak terjadi eskalasi hak akses (*zero privilege creep*).

---

## 6. Risiko Regresi & Mitigasi

| Risiko Potensial | Analisis & Dampak | Bukti Mitigasi yang Diterapkan |
| :--- | :--- | :--- |
| **Privilege Escalation pada Guru Formal** | Guru biasa di sekolah formal berpotensi memperoleh wewenang TU jika pengecekan owner bocor. | Terbukti aman: `access-control.ts` mengevaluasi `actor.is_owner === true` yang hanya berasal dari field `KeanggotaanSekolah.is_owner`. Guru biasa tetap menghasilkan `false` dan seluruh tes regresi hak guru formal lulus 100%. |
| **Cross-Tenant Data Leakage** | Guru Mandiri mengakses data siswa sekolah lain menggunakan hak owner miliknya. | Terbukti aman: Rule 2 pada `access-control.ts` (`resource.sekolah_id !== actor.sekolah_id`) dan boundary check pada `authz-guard.ts` dievaluasi sebelum hak owner diproses. Test `STRICT ISOLATION` lulus mengonfirmasi penolakan mutlak. |
| **Navigasi Rusak / Duplicate Link** | Penambahan item "Data Siswa" memicu link duplikat pada sidebar atau drawer. | Terbukti aman: Algoritma `seenHrefs` pada `getFilteredNavigation` dan unit test `Unique Hrefs Invariant` menjamin tidak ada duplikasi tautan rute. |
| **Kerusakan Tenant Non-Owner / Staf TU** | Staf tata usaha kehilangan hak akses siswa. | Terbukti aman: Seluruh test suite staf (`studentDataStaff`, `capability-bundles.test.ts`) tetap lulus 100%. |

---

## 7. Kesimpulan & Stop Gate

Seluruh target fungsional untuk **PHASE P0** telah selesai diimplementasikan, diverifikasi dengan pengujian berlapis, lolos seluruh quality gate tanpa galat, dan didokumentasikan dengan bukti visual nyata:

- [x] Guru Mandiri dapat melihat Data Siswa (`/data-siswa`).
- [x] Guru Mandiri dapat menambah siswa baru (`createStudentAction`).
- [x] Guru Mandiri dapat mengubah profil siswa (`updateStudentAction`).
- [x] Guru Mandiri dapat menghapus data siswa (`deleteStudentAction`, `bulkDeleteStudentsAction`).
- [x] Menu "Data Siswa" tampil pada sidebar dan navigasi Guru Mandiri.
- [x] Hak guru biasa di sekolah formal tidak terganggu.
- [x] Batasan P1 dan P2 dipatuhi secara ketat.

**Sesuai aturan `AGENTS.md` (Stop Gate): Pekerjaan dihentikan di sini. Tidak melangkah ke PHASE P1 sebelum Laporan P0 ini direview dan disetujui oleh Pengguna.**
