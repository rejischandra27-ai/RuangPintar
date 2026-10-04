# RUANG PINTAR — COMPREHENSIVE ARCHITECTURE & SYSTEM AUDIT REPORT
## Full-Spectrum Forensic Audit Across Codebase, ADRs, Domain Models, Migrations, Security, UI Patterns & SaaS Multi-Tenant Architecture

| Attribute | Detail |
| :--- | :--- |
| **Project Identity** | Ruang Pintar — School Digital Operating Platform |
| **Architectural Model** | Modular Monolith Next.js (App Router) + Prisma ORM + SQLite 3 (WAL Mode) |
| **Audited Tenant** | SMK OTOMINDO (ID: `01M2XXYD227F9S3H985FH53GMF`) |
| **Audit Date** | 2026-09-25 |
| **Scope of Audit** | Codebase (21 Modules), 3 ADRs, 160+ Documents, 23 Migrations, 5 Base Roles, Authorization Matrix, UI System, Service Layer, Test Suite (597 tests) |
| **Current Quality Gates** | 100% PASS (Typecheck 0 error, Lint 0 error, Test 597/597, Build 28/28 routes) |
| **Audit Status** | **AUDIT COMPLETE — AWAITING HUMAN REVIEW & APPROVAL BEFORE CODE CHANGES** |

---

## DAFTAR ISI

1. [Executive Summary](#1-executive-summary)
2. [Audit 1: Codebase Structure & Architecture](#2-audit-1-codebase-structure--architecture)
3. [Audit 2: Architecture Decision Records (ADR)](#3-audit-2-architecture-decision-records-adr)
4. [Audit 3: Documentation & SSOT Inventory](#4-audit-3-documentation--ssot-inventory)
5. [Audit 4: Domain Model & Academic Invariants](#5-audit-4-domain-model--academic-invariants)
6. [Audit 5: Database Migrations & Persistence Engine](#6-audit-5-database-migrations--persistence-engine)
7. [Audit 6: Roles & Organizational Positions](#7-audit-6-roles--organizational-positions)
8. [Audit 7: Permissions & Server-Side Authorization](#8-audit-7-permissions--server-side-authorization)
9. [Audit 8: UI Patterns & Academic Glass UI Compliance](#9-audit-8-ui-patterns--academic-glass-ui-compliance)
10. [Audit 9: Service Layer & Module Boundaries](#10-audit-9-service-layer--module-boundaries)
11. [Audit 10: Testing Strategy & Verification Seams](#11-audit-10-testing-strategy--verification-seams)
12. [Matriks Temuan: Konflik Desain, Technical Debt, Duplikasi, Pelanggaran Arsitektur & SaaS Non-Conformance](#12-matriks-temuan-konflik-desain-technical-debt-duplikasi-pelanggaran-arsitektur--saas-non-conformance)
13. [Rekomendasi Roadmap Penyehatan Sistem](#13-rekomendasi-roadmap-penyehatan-sistem)

---

## 1. Executive Summary

Audit komprehensif ini dilakukan secara menyeluruh terhadap platform Ruang Pintar menyusul tuntasnya stabilisasi data kanonikal 700 siswa SMK OTOMINDO dan provisioning 700 akun siswa pada Stage 11.7 s/d 11.9. 

Platform saat ini berada dalam kondisi **berfungsi penuh (100% Quality Gates PASS)**, memiliki dataset sekolah nyata tanpa data sintetis, dan telah melayani 739 pengguna (700 siswa, 38 guru, 1 admin). Namun, ekspansi cepat dari fase monolitik sekolah tunggal menuju SaaS Multi-Tenant menyisakan sejumlah **konflik desain, technical debt migrasi, kebocoran batas modul (cross-module coupling), dan dualitas model peran/tenant** yang wajib dirapikan sebelum platform dibuka untuk multi-tenant onboarding massal.

---

## 2. Audit 1: Codebase Structure & Architecture

Platform dibangun menggunakan Next.js 16.3.3 (Turbopack, App Router) dengan paradigma **Modular Monolith**:
- `src/modules/`: Berisi 21 modul domain independen.
- `src/shared/`: Berisi infrastruktur bersama (database, auth, authorization, audit, tenant, shell, UI primitives).
- `src/app/`: Mengelola routing HTTP, layout, page render, dan 23 Server Action files.

### Evaluasi Arsitektural:
- **Kekuatan**: Separasi concern per modul sangat baik (masing-masing memiliki `domain/`, `application/`, `infrastructure/`, dan `presentation/`).
- **Kelemahan**: Terjadi inkonsistensi penempatan shared components; sebagian helper domain ditarik ke shared, sementara komponen presentasi antar modul saling melakukan direct import tanpa melalui contract interface.

---

## 3. Audit 2: Architecture Decision Records (ADR)

Di direktori `docs/adr/`, tercatat 3 dokumen arsitektur utama:
1. **ADR-001 (SaaS Multi-Tenant Foundation)**: Menetapkan arsitektur *shared database, shared schema*, tenant ownership, model `KeanggotaanSekolah`, dan pemisahan identitas global dari tenant.
2. **ADR-002 (Tenant Membership & Invitation Workflow)**: Menetapkan alur undangan, join request, approval, dan status lifecycle membership (`PENDING`, `ACTIVE`, `REJECTED`, `SUSPENDED`, `REMOVED`).
3. **ADR-003 (Trial, Subscription & Entitlement Tenant)**: Menetapkan trial 30 hari berbasis tenant, model paket flat per sekolah, dan billing provider-agnostic.

### Temuan Audit ADR:
- **Status Gantung**: Ketiga ADR masih berstatus `PROPOSED — READY FOR HUMAN REVIEW`. Secara formal, ketiga dokumen ini belum berstatus `APPROVED` atau `LOCKED`.
- **Implementasi Parsial**: Tabel `keanggotaan_sekolah` dan `langganan_tenant` sudah diwujudkan di skema Prisma, namun workflow undangan email dan persetujuan join request pada ADR-002 belum terhubung ke antarmuka aplikasi.

---

## 4. Audit 3: Documentation & SSOT Inventory

Repositori memiliki **161 dokumen Markdown** (28 di root dan 133 di `docs/`).

### Temuan Dokumentasi:
- **Polusi Root Repository**: Terdapat 20 dokumen laporan hasil eksekusi tahapan staging (misal `BUSINESS-REALITY-AUDIT.md`, `POST-REMEDIATION-FOUNDATION-AUDIT.md`, `STAGE-11.7-...`, `STAGE-11.8...`, `STAGE-11.9...`) yang berceceran di root repositori dan merupakan duplikat dari file di dalam `docs/`. Sesuai aturan Fikran Engineering, file-file laporan staging ini harus diorganisasikan ke `docs/specs/done/` dan `docs/plans/done/`.
- **Dualitas Dokumen Kanonikal**: Terdapat pasangan dokumen dengan tujuan serupa yang memicu ambiguitas Single Source of Truth:
  - `docs/00-PROJECT-BRIEF.md` vs `docs/BRD.md`
  - `docs/01-PRODUCT-REQUIREMENTS.md` vs `docs/PRD.md`
  - `docs/05-SYSTEM-ARCHITECTURE.md` vs `docs/APPLICATION-BLUEPRINT.md`

---

## 5. Audit 4: Domain Model & Academic Invariants

Pemeriksaan terhadap 6 Domain Invariants Akademik:

| Invariant | Status | Bukti Verifikasi Codebase |
| :--- | :---: | :--- |
| **1. Student ≠ Enrollment ≠ Placement** | **VALID** | Tabel `siswa`, `keikutsertaan_siswa`, dan `penempatan_rombel` terpisah secara normalisasi 3NF. 700 siswa memiliki 700 enrollment dan 700 penempatan aktif. |
| **2. Teacher ≠ Subject ≠ Assignment** | **VALID** | `guru` dihubungkan ke `mata_pelajaran` dan `rombel` melalui entitas `penugasan_mengajar`. 42 penugasan mengajar aktif dipertahankan. |
| **3. Calendar ≠ Schedule ≠ Actual Class Session**| **VALID** | 1,008 sel jadwal di `jadwal_pelajaran` dipisahkan dari sesi kelas nyata di `sesi_pembelajaran`. |
| **4. School Attendance ≠ Class Attendance** | **VALID** | Presensi harian sekolah dipisahkan dari `presensi_sesi_kelas`. |
| **5. Assessment ≠ Grade ≠ Publication** | **VALID** | Siklus asesmen di `definisi_asesmen` -> input di `nilai_siswa` -> publikasi melalui flag `is_published`. |
| **6. Missing Grade ≠ Zero Grade** | **VALID** | Kolom `nilai_siswa.nilai_angka` bertipe nullable `Float?`. Siswa yang belum dinilai bernilai `null` (bukan nol). |
| **7. Nullable NIS Invariant** | **VALID** | Kolom `siswa.nis` bersifat nullable `String?` untuk mendukung siswa tanpa NIS tanpa data sintetis. |
| **8. One Student = One Account Invariant** | **VALID** | Kolom `siswa.pengguna_id` memiliki constraint `@unique` di level mesin database. |

---

## 6. Audit 5: Database Migrations & Persistence Engine

Engine basis data menggunakan SQLite 3 dengan Prisma ORM.

### Temuan Migrasi:
1. **23 Migrasi Prisma Terdaftar**: Seluruh 23 migrasi berstatus diterapkan (`Database schema is up to date`).
2. **Technical Debt (Migration Drift)**: 
   - Pada Stage 11.7, modifikasi `nis String?` (nullable) dan penghapusan constraint NOT NULL pada tabel `siswa` diterapkan secara langsung via skrip transaksi SQLite (`apply_nullable_nis.py`), dan `npx prisma generate` telah dijalankan.
   - Namun, file migrasi formal baru di `prisma/migrations/` untuk mencatat perubahan ini belum dibuat. Hal ini menyebabkan drift potensial jika database di-redeploy menggunakan `prisma migrate deploy` di lingkungan kosong baru.

---

## 7. Audit 6: Roles & Organizational Positions

### Model Hierarki Otorisasi:
`Identity -> Base Role -> Position/Assignment/Relationship -> Permission -> Resource Scope -> Effective Access`

### Temuan Peran:
1. **Dualitas Penyimpanan Role (Major Design Conflict)**:
   - Di tabel `pengguna`, terdapat kolom `peran_dasar` (`SUPER_ADMIN | SCHOOL_STAFF | TEACHER | STUDENT | GUARDIAN`).
   - Di tabel `keanggotaan_sekolah`, terdapat kolom `peran_dasar_di_tenant`.
   - **Konflik**: ADR-001 secara eksplisit menyatakan bahwa pengguna dapat memiliki peran berbeda di tenant berbeda (misal: Guru di Sekolah A, Orang Tua di Sekolah B). Namun, di lebih dari 40 tempat di codebase, otorisasi masih memeriksa `user.peran_dasar` global dari tabel `pengguna` alih-alih membaca peran kontekstual dari membership aktif.
2. **Posisi Struktural Tidak Memiliki Akun Khusus**:
   - Kepala Sekolah (`HEADMASTER`) dan Wali Kelas (`HOMEROOM_TEACHER`) bukan base role, melainkan posisi penugasan dari personil guru/staff. Ini sudah selaras dengan invariant domain.

---

## 8. Audit 7: Permissions & Server-Side Authorization

Matriks permission dikelola secara sentral di `src/shared/infrastructure/authorization/role-permissions.ts`.

### Temuan Otorisasi:
1. **Server-Side Default Deny**: Berjalan sangat baik. Endpoint API dan Server Actions mengecek session melalui `requireAuth()` atau `requirePermission()`.
2. **Temuan D-01 Telah Diperbaiki**: Method `deleteStudent`, `deleteEnrollment`, dan `deletePlacement` di `StudentRepository` kini telah menyertakan parameter `sekolahId` dan filter `where: { id, sekolah_id }`.
3. **Inkonsistensi Pengecekan Sesi Tenant**:
   - Sebagian Server Actions memeriksa `if (!user.sekolah_id)` (berbasis kolom legacy pengguna), alih-alih memeriksa `session.sekolah_aktif_id` dari context multi-tenant.

---

## 9. Audit 8: UI Patterns & Academic Glass UI Compliance

Platform menggunakan sistem desain **Academic Glass UI v1.2**:
- Glassmorphism tokens: `backdrop-blur-md`, `border-slate-200/80`, `shadow-2xs`.
- Tipografi: Inter & Geist font, Slate-900 heading, Slate-500 secondary.
- Aksentuasi: Sapphire-600 untuk aksi primer, Emerald-600 untuk kehadiran, Amber-600 untuk perhatian.

### Temuan UI & Anti-Slop:
1. **Cockpit Khusus Per Role**:
   - Dashboard Guru, Siswa, Wali Kelas, Kepala Sekolah, dan Super Admin telah memiliki cockpit khusus masing-masing (anti generic dashboard).
2. **Reposisi Halaman Redundan**:
   - Pasca integrasi Stage 11.2 (Option B), presensi kelas telah dipusatkan di Workspace Kelas (`/kelas-saya/[id]?tab=PRESENSI`) dan tombol Presensi Cepat di dashboard. Halaman lama `/sesi-pembelajaran` dan `/presensi-kelas` telah direposisi menjadi audit/monitoring view.
3. **Peringatan Lint Image Tag**:
   - Ditemukan 4 peringatan ESLint `@next/next/no-img-element` pada `cbt-player-view.tsx` dan `question-bank-modal.tsx` karena menggunakan tag `<img>` murni alih-alih komponen Next.js `<Image />`.

---

## 10. Audit 9: Service Layer & Module Boundaries

Platform memiliki 21 modul domain di `src/modules/`.

### Temuan Batas Modul (Cross-Module Coupling):
Ditemukan **23 titik impor silang langsung (cross-module direct imports)** antar modul yang melanggar batas modular monolith:
1. `learning` -> mengimpor presentation view dan modal dari `cbt` (`CbtPlayerView`, `QuestionBankModal`) dan `attendance` (`SessionAttendanceModal`).
2. `schedule` -> mengimpor presentation view dari `attendance`.
3. `attendance` -> mengimpor komponen presentasi dari `assessment`.
4. `ai-assistant` -> mengimpor modal presentasi dari `billing` dan `school`.
5. `marketing` -> mengimpor modal dari `billing`.

**Dampak**: Perubahan internal pada UI modul CBT atau Attendance berpotensi merusak rendering di modul Learning. Interaksi ini seharusnya diabstraksikan melalui composition di layer aplikasi (`src/app/`) atau shared presentation shell, bukan import silang antar layer presentasi modul.

---

## 11. Audit 10: Testing Strategy & Verification Seams

Vitest test suite mencakup **102 test files dengan 597 tests (100% PASS)**:
- Durasi eksekusi: ~3-4 menit.
- Mencakup unit test, service test, authorization guard test, dan rendering presentation views.

### Temuan Test Suite:
1. **Console Warnings Selama Test Runner**:
   - `act(...)` warning pada `cbt-views.test.tsx`: Terjadi pembaruan state React yang tidak dibungkus `act(...)` saat memilih opsi jawaban.
   - `jsdom navigation error` pada `unified-academic-ledger-table.test.tsx`: Terjadi karena jsdom tidak mendukung simulasi klik navigasi browser penuh pada tag link download CSV.
2. **Ketergantungan Eksekusi Sekuensial**:
   - Beberapa test basis data bergantung pada kondisi database SQLite lokal. Database test yang bersih wajib diisolasi agar tidak mengotori database operasional `ruang-pintar.db`.

---

## 12. Matriks Temuan: Konflik Desain, Technical Debt, Duplikasi, Pelanggaran Arsitektur & SaaS Non-Conformance

| ID Temuan | Kategori | Komponen Terdampak | Deskripsi Temuan Forensik | Tingkat Keparahan |
| :---: | :--- | :--- | :--- | :---: |
| **F-01** | **Konflik Desain** | `Pengguna` vs `KeanggotaanSekolah` | Dualitas sumber kebenaran peran: `pengguna.peran_dasar` (global) vs `keanggotaan_sekolah.peran_dasar_di_tenant` (tenant-scoped). Route guard dan DTO masih dominan membaca `user.peran_dasar`. | **HIGH** |
| **F-02** | **Technical Debt** | `prisma/migrations/` | Perubahan `nis String?` (nullable) pada tabel `siswa` diterapkan langsung di database dan skema Prisma, namun belum memiliki file migrasi resmi di folder `prisma/migrations/`. | **HIGH** |
| **F-03** | **Pelanggaran Arsitektur** | `src/modules/` | Ditemukan 23 cross-module direct imports (khususnya layer presentasi modul mengimpor langsung view/modal modul lain). | **MEDIUM** |
| **F-04** | **Ketidaksesuaian SaaS** | Server Actions & Route Guards | 44 lokasi di codebase mengandalkan `user.sekolah_id` (kolom legacy pengguna), bukan `session.sekolah_aktif_id` atau `TenantContext`. | **HIGH** |
| **F-05** | **Duplikasi & Kebersihan** | Root Repository & `docs/` | 20 file laporan staging menumpuk di root folder dan menduplikasi isi `docs/`, melanggar prinsip kebersihan workspace dan Single Source of Truth. | **LOW** |
| **F-06** | **Technical Debt** | Test Suite (Vitest) | Peringatan `act(...)` pada `cbt-views.test.tsx` dan navigation error jsdom pada `unified-academic-ledger-table.test.tsx`. | **LOW** |
| **F-07** | **Technical Debt** | Next.js UI Optimization | 4 peringatan lint `@next/next/no-img-element` pada modul CBT. | **LOW** |

---

## 13. Rekomendasi Roadmap Penyehatan Sistem

Sebelum melanjutkan ke fase pengembangan fitur baru, kami merekomendasikan urutan remediation berikut:

1. **REMEDIATION 1: Konsolidasi Migrasi Prisma (Penyelesaian F-02)**
   - Buat migrasi resmi baseline/perubahan untuk `nis String?` agar skema Prisma dan folder `prisma/migrations/` sinkron 100%.
2. **REMEDIATION 2: Kebersihan Dokumentasi & Root Workspace (Penyelesaian F-05)**
   - Pindahkan laporan staging di root ke direktori arsip yang semestinya (`docs/specs/done/` dan `docs/plans/done/`).
   - Pertahankan hanya dokumen canonical di root (`AGENTS.md`, `TASKS.md`, `MEMORY.md`, `package.json`).
3. **REMEDIATION 3: Perapihan Batas Modul (Decoupling Cross-Module Imports, Penyelesaian F-03)**
   - Refactor pemanggilan modal/komponen antar modul (seperti `SessionAttendanceModal` di `learning`) menggunakan teknik composition di level halaman (`src/app/kelas-saya/[id]/page.tsx`), sehingga modul `learning` tidak lagi mengimpor langsung folder `presentation` milik modul `attendance` atau `cbt`.
4. **REMEDIATION 4: Transisi Bertahap Menuju TenantContext Otoritatif (Penyelesaian F-01 & F-04)**
   - Buat helper server-side `requireTenantContext()` yang membaca `sekolah_aktif_id` dari sesi dan memverifikasi `KeanggotaanSekolah`, menggantikan ketergantungan langsung pada kolom legacy `user.sekolah_id`.
5. **REMEDIATION 5: Pembersihan Test Warnings & Linter (Penyelesaian F-06 & F-07)**
   - Bungkus event state React di `cbt-views.test.tsx` dengan `act(...)`.
   - Ganti tag `<img>` pada komponen CBT dengan `<Image />` dari Next.js.

---

```text
================================================================================
STATUS: ARCHITECTURE & SYSTEM AUDIT COMPLETED — NO CODE MODIFIED
AWAITING HUMAN OWNER REVIEW AND APPROVAL OF REMEDIATION PLAN
================================================================================
```
