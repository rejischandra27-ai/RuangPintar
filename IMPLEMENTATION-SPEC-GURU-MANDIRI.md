# SPESIFIKASI IMPLEMENTASI: KEDAULATAN DATA GURU MANDIRI (STAGE UX-02)
## Ruang Pintar — School Digital Operating Platform (SaaS Multi-Tenant)

> **Dokumen Spesifikasi:** `IMPLEMENTATION-SPEC-GURU-MANDIRI.md`  
> **Status:** PROPOSED — READY FOR ARCHITECT REVIEW  
> **Tanggal:** 28 September 2026  
> **Prioritas Implementasi:** P0 (Kritis) $\rightarrow$ P1 (Fungsional KBM) $\rightarrow$ P2 (Akuisisi & Onboarding)  
> **Fokus Utama:** Kedaulatan Hak Akses, Manajemen Siswa, dan Pengelolaan Kelas Guru Mandiri  
> **Dokumen Audit Rujukan:** `STAGE-UX-02-GURU-MANDIRI-DATA-OWNERSHIP-AUDIT.md`, `ONBOARDING-FLOW-AUDIT.md`  
> **Aturan Arsitektur:** `AGENTS.md`, `ADR-001`, `ADR-002`, `ADR-003`, `docs/WORKSPACE-ARCHITECTURE-RECOMMENDATION.md`

---

## 1. Root Cause Analysis (Akar Masalah)

Platform Ruang Pintar awalnya dibangun dengan arsitektur peran flat (*Flat Role Model*) yang mengasumsikan seluruh pengguna berada di bawah payung sekolah formal:
1. **Tenant Ownership Blindness pada Engine Otorisasi:**
   Objek `ActorContext` pada [`src/shared/infrastructure/authorization/access-control.ts`](file:///c:/laragon/www/Ruang-Pintar/src/shared/infrastructure/authorization/access-control.ts) hanya mengevaluasi `peran_dasar` (`TEACHER`). Properti `is_owner_tenant` dari sesi aktif diabaikan. Akibatnya, Guru Mandiri yang merupakan pemilik tunggal workspace-nya diperlakukan sama persis dengan guru biasa di sekolah besar yang tidak memiliki wewenang tata usaha kesiswaan.
2. **Ketiadaan Hak Akses Siswa pada Base Role TEACHER:**
   Pada [`role-permissions.ts`](file:///c:/laragon/www/Ruang-Pintar/src/shared/infrastructure/authorization/role-permissions.ts), role `TEACHER` tidak memiliki permission `academic.students.view` maupun `academic.students.manage`. Akibatnya, server guard di [`src/app/data-siswa/page.tsx:78`](file:///c:/laragon/www/Ruang-Pintar/src/app/data-siswa/page.tsx#L78) melempar redirect paksa ke `/dashboard`, dan seluruh server action kesiswaan melempar galat 403.
3. **Hard-coded Navigation Rules:**
   Menu Data Siswa di [`navigation-config.ts`](file:///c:/laragon/www/Ruang-Pintar/src/shared/components/shell/navigation-config.ts) dikunci hanya untuk `SUPER_ADMIN` dan `SCHOOL_STAFF` dengan capability `STUDENT_DATA_OPERATOR`.
4. **Isolasi Rombel Formal:**
   Mutasi kelas (`updateRombelAction`, `deleteRombelAction`) mewajibkan `academic.structure.manage` yang hanya dimiliki operator sekolah, sehingga Guru Mandiri tidak dapat mengubah nama atau menghapus kelasnya sendiri.

---

## 2. Files Affected (Daftar Berkas Terdampak)

### 2.1 Lapisan Otorisasi & Navigasi (P0)
- `src/shared/infrastructure/authorization/types.ts`: Perluas `ActorContext` untuk memuat `is_owner?: boolean` dan `tipe_sekolah?: string`.
- `src/shared/infrastructure/authorization/authz-guard.ts`: Teruskan `user.is_owner_tenant` ke dalam `ActorContext`.
- `src/shared/infrastructure/authorization/access-control.ts`: Perluas evaluasi permission agar memberikan hak kelola kesiswaan dan kelas kepada Tenant Owner di tenant miliknya.
- `src/shared/components/shell/navigation-config.ts`: Tambahkan menu Data Siswa untuk `TEACHER` yang memiliki konteks `isOwner` atau tenant `MANDIRI`.
- `src/shared/components/shell/sidebar.tsx`: Teruskan `user.is_owner_tenant` ke `getFilteredNavigation`.
- `src/shared/components/shell/mobile-bottom-nav.tsx`: Teruskan konteks owner ke mobile nav.
- `src/app/data-siswa/page.tsx`: Sesuaikan guard agar membuka akses bagi Tenant Owner (`canViewStudents = true`, `canManageStudents = true`).

### 2.2 Lapisan Aksi Siswa & Kelas (P0 & P1)
- `src/app/actions/student-actions.ts`: Aksi `createStudentAction`, `updateStudentAction`, `deleteStudentAction`, `bulkDeleteStudentsAction` dapat dieksekusi oleh Tenant Owner.
- `src/app/actions/academic-actions.ts`: Aksi `createRombelAction`, `updateRombelAction`, `deleteRombelAction` dapat dieksekusi oleh Tenant Owner.
- `src/modules/academic/application/rombel-service.ts`: Tambahkan auto-assignment atomik (buat `PenugasanMengajar` otomatis) saat rombel dibuat di tenant `MANDIRI`.
- `src/modules/learning/presentation/teacher-classes-view.tsx`: Tambahkan tombol aksi Edit dan Hapus pada kartu rombel Guru Mandiri.
- `src/modules/teacher/application/teacher-facade.ts`: Perbaiki perhitungan `totalSiswaBinaan` dan `totalRombel` agar membaca seluruh data siswa/rombel di tenant mandiri.

### 2.3 Lapisan Registrasi & Onboarding (P2)
- `prisma/schema.prisma`: Schema expansion (`Pengguna.password_hash` nullable, `google_id`, `onboarding_selesai`, `Sekolah.tipe_sekolah`, `nama_normalisasi`).
- `src/app/api/auth/google/`: Endpoint integrasi Google OAuth.
- `src/app/register/register-form.tsx`: Pemangkasan form registrasi (hapus tab Wali Murid, username, konfirmasi password, nama sekolah teks bebas).
- `src/modules/marketing/presentation/modern-landing-view.tsx`: Tombol Hero Google 1-Klik.
- `src/shared/components/dashboard/onboarding/onboarding-wizard-modal.tsx`: Modal Onboarding Wizard interaktif di atas background dashboard.

---

## 3. Permission Changes (Perubahan Hak Akses)

### 3.1 Resolusi Otoritas Tenant Owner
Sesuai invariant `ADR-001 §1` (*School Owner adalah otoritas tenancy*), kepemilikan tenant aktif memberikan izin administratif terisolasi:

```typescript
// src/shared/infrastructure/authorization/access-control.ts
if (actor.is_owner) {
  // Berikan hak penuh pengelolaan kesiswaan dan kelas dalam lingkup tenant aktif
  grantedPermissions.add("academic.students.view");
  grantedPermissions.add("academic.students.manage");
  grantedPermissions.add("academic.classes.view");
  grantedPermissions.add("academic.classes.manage");
  grantedPermissions.add("academic.structure.view");
  grantedPermissions.add("academic.structure.manage");
}
```

### 3.2 Strict Tenant Boundary (Anti-Kebocoran)
Hak tambahan di atas **HANYA** berlaku apabila:
```typescript
resource.sekolah_id === actor.sekolah_id
```
Jika seorang Guru Mandiri mencoba mengakses ID siswa dari sekolah lain (`resource.sekolah_id !== actor.sekolah_id`), mesin evaluasi tetap melempar **DENY** (`AUTHZ_CROSS_TENANT_DENIED`). Tidak ada kebocoran hak lintas sekolah!

---

## 4. Navigation Changes (Perubahan Bilah Navigasi)

### 4.1 Modifikasi `CANONICAL_NAVIGATION_CONFIG`
Tambahkan entri Data Siswa pada kelompok `teacher-ops`:
```typescript
{
  id: "teacher-students",
  title: "Data Siswa",
  href: "/data-siswa",
  iconName: "UserSquare2",
  roles: ["TEACHER"],
  requiredOwnerOrCapability: true, // Hanya muncul jika is_owner === true atau memiliki STUDENT_DATA_OPERATOR
  isPhaseDeferred: false,
}
```

### 4.2 Pembaruan `getFilteredNavigation`
```typescript
export function getFilteredNavigation(
  userRole: BaseRole,
  userCapabilities: CapabilityBundle[] = [],
  isOwner: boolean = false
): NavGroup[] { ... }
```
- Jika `userRole === "TEACHER"` dan `isOwner === true` (atau workspace mandiri), menu **Data Siswa** otomatis muncul tepat di bawah menu **Kelas Saya**.

---

## 5. Tenant Ownership Changes (Perubahan Tenancy)

### 5.1 Definisi Personal Workspace Guru Mandiri
- Tenant `Sekolah` baru diciptakan dengan atribut:
  - `tipe_sekolah = "MANDIRI"`
  - `nama = "Ruang Mengajar Mandiri — " + user.nama_lengkap`
  - `tipe_lisensi = "FREEMIUM"`
  - `trial_berakhir_pada = now() + 30 hari`
- Record `KeanggotaanSekolah`:
  - `status_keanggotaan = "ACTIVE"`
  - `is_owner = true`
  - `sumber_pendaftaran = "OWNER_CREATE"`
- Record `SesiPengguna`:
  - `sekolah_aktif_id = sekolah.id`

---

## 6. Data Integrity Considerations (Integritas Relasi)

1. **Auto-Assignment Invariant:**
   Setiap kali kelas dibuat di ruang mandiri:
   ```text
   Rombel Terbuat
     ↓
   MataPelajaran Default Terbuat (jika belum ada)
     ↓
   PenugasanMengajar Otomatis (Guru = Owner, Status = AKTIF)
     ↓
   PenempatanRombel Siswa Terkait
   ```
   *Hasil:* Data siswa dan kelas dijamin 100% langsung terhubung ke buku nilai, presensi sesi, dan ujian CBT.
2. **Pencegahan Siswa Tanpa Rombel (Orphan Student Prevention):**
   Form pendaftaran siswa di ruang mandiri mewajibkan atau secara default memilih kelas aktif yang sedang dikelola.
3. **Immutability Data Akademik:**
   Penghapusan siswa atau kelas menerapkan validasi integritas: tidak dapat menghapus siswa/kelas yang sudah memiliki riwayat nilai resmi atau log presensi KBM yang terkunci.

---

## 7. Test Strategy (Strategi Pengujian)

Patuhi siklus gerbang verifikasi Vitest:
1. **Unit Test AccessControlEngine (`src/test/authorization/tenant-owner-access.test.ts`):**
   - Guru biasa di sekolah formal $\rightarrow$ DITOLAK saat akses `academic.students.manage`.
   - Guru Mandiri (`is_owner = true`) $\rightarrow$ DIIZINKAN saat akses `academic.students.manage` pada tenant miliknya.
   - Guru Mandiri (`is_owner = true`) $\rightarrow$ DITOLAK saat akses resource tenant sekolah lain.
2. **Integration Test Data Siswa (`src/test/student/guru-mandiri-student-lifecycle.test.ts`):**
   - Guru Mandiri membuka `/data-siswa` tanpa redirect 403.
   - Guru Mandiri berhasil menjalankan `createStudentAction`, `updateStudentAction`, dan `deleteStudentAction`.
3. **Integration Test Kelas Saya (`src/test/learning/guru-mandiri-class-lifecycle.test.ts`):**
   - Guru Mandiri berhasil membuat, mengedit, dan menghapus kelas di ruang kerjanya.
   - Pembuatan kelas otomatis memicu pembuatan `PenugasanMengajar`.
4. **Regresi Test Suite Global:**
   - Menjalankan seluruh test suite (686+ tests) wajib tetap **100% PASS**.

---

## 8. Rollback Strategy (Strategi Pemulihan)

1. **Rollback Otorisasi:**
   Karena perubahan izin owner dilakukan pada lapisan logika `access-control.ts` (tanpa mengubah skema database pada P0), rollback dapat dilakukan seketika dengan mengembalikan evaluasi `if (actor.is_owner)` ke status default deny.
2. **Rollback Navigasi:**
   Menu Data Siswa pada `navigation-config.ts` dapat di-toggle kembali ke `roles: ["SCHOOL_STAFF", "SUPER_ADMIN"]` tanpa memengaruhi data database.
3. **Database Immuntability:**
   Perubahan skema Prisma pada P2 menggunakan pola `expand` (menambahkan kolom opsional/default). Data lama tidak akan terpengaruh jika terjadi rollback aplikasi.

---

## 9. Ringkasan Kriteria Penerimaan (Definition of Done)

- [ ] Guru Mandiri dapat membuka halaman `/data-siswa` dan melihat daftar siswanya.
- [ ] Guru Mandiri dapat mendaftarkan siswa baru tanpa pesan galat 403.
- [ ] Guru Mandiri dapat mengedit profil siswa dan menghapus siswa dari databasenya.
- [ ] Guru Mandiri dapat membuat kelas baru, mengedit nama kelas, dan menghapus kelas.
- [ ] Menu "Data Siswa" tampil di sidebar navigasi saat masuk sebagai Guru Mandiri.
- [ ] Guru biasa di sekolah formal tetap berstatus *Read-Only* pada data siswa sekolah (tidak terjadi eskalasi hak).
- [ ] Isolasi multi-tenant tetap berjalan 100% aman (tidak bisa akses data sekolah lain).
- [ ] Seluruh test suite Vitest lulus 100% clean.
