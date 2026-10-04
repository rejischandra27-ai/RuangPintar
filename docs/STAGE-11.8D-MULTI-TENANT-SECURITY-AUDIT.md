# STAGE 11.8D — MULTI-TENANT SECURITY AUDIT REPORT
## Security Verification of Tenant Isolation, Query Scoping & Access Control for Student Identity

| Attribute | Detail |
| :--- | :--- |
| **Project Identity** | Ruang Pintar — School Digital Operating Platform |
| **Tenant** | SMK OTOMINDO (ID: `01M2XXYD227F9S3H985FH53GMF`) |
| **Security Framework** | STRIDE Threat Model + Server-Side Default Deny + Contextual Tenant Guard |
| **Audit Scope** | Repositories, Application Services, Server Actions, Auth & Session Guards |
| **Audit Status** | **PASSED WITH 2 DEFENSE-IN-DEPTH RECOMMENDATIONS** |

---

## 1. Audit Methodology & Scope

Audit keamanan multi-tenant ini mengevaluasi seluruh titik integrasi query identitas siswa terhadap kepatuhan batas tenant (`sekolah_id` / `sekolah_aktif_id`). Audit memeriksa potensi kebocoran data antar-sekolah (*cross-tenant data leakage*), akses tanpa otorisasi (*unauthorized privilege escalation*), dan penanganan sesi terisolasi.

### Area yang Diaudit:
1. `src/modules/student/infrastructure/student-repository.ts`
2. `src/modules/student/infrastructure/student-experience-repository.ts`
3. `src/modules/student/application/student-identity-service.ts`
4. `src/modules/student/application/student-experience-service.ts`
5. `src/modules/cbt/infrastructure/cbt-repository.ts`
6. `src/shared/infrastructure/auth/auth-service.ts`
7. Route guards di `src/app/cbt-ujian/`, `src/app/tugas-siswa/`, dan `src/app/rapor-siswa/`.

---

## 2. Hasil Audit Query Scoping per Komponen

| Komponen / File | Operasi / Method | Parameter `sekolah_id` | Status Isolasi | Catatan Evaluasi |
| :--- | :--- | :---: | :---: | :--- |
| `StudentRepository` | `findStudents()` | **ADA** | **SECURE** | `where: { sekolah_id: sekolahId, ... }` |
| `StudentRepository` | `findStudentById()` | **ADA** | **SECURE** | Disaring berdasarkan id dan `sekolah_id` |
| `StudentRepository` | `findStudentByNis()` | **ADA** | **SECURE** | Menggunakan indeks majemuk `[sekolah_id, nis]` |
| `StudentRepository` | `createStudent()` | **ADA** | **SECURE** | Wajib mengikat entitas ke `sekolahId` |
| `StudentRepository` | `deleteStudent()` | *TIDAK ADA* | **DEFENSE-IN-DEPTH FINDING** | Hanya `where: { id }` (lihat Temuan D-01) |
| `StudentExpRepo` | `getStudentProfileByUserId()` | **ADA** | **SECURE** | Memvalidasi `pengguna_id` dan `sekolah_id` |
| `StudentExpRepo` | `getMaterialsAndAssignments()` | **ADA** | **SECURE** | Memvalidasi kepemilikan rombel di dalam sekolah |
| `StudentExpRepo` | `getReportCard()` | **ADA** | **SECURE** | Memverifikasi enrollment aktif di tenant sekolah |
| `CbtRepository` | `startAttempt()` | **ADA** | **SECURE** | Mencocokkan `exam.sekolah_id` dan penempatan rombel |
| `AuthService` | `loginWithCredentials()` | **ADA** | **SECURE** | Memetakan `sekolah_aktif_id` via `keanggotaan_sekolah` |

---

## 3. Temuan Forensik & Rekomendasi Hardening

### Temuan D-01 (Defense-in-Depth): Mutasi Deletion Tanpa Tenant Context
- **Lokasi**: `src/modules/student/infrastructure/student-repository.ts` (Method `deleteStudent`, `deleteEnrollment`, `deletePlacement`).
- **Deskripsi**: Method ini mengeksekusi penghapusan menggunakan `where: { id }`. Meskipun ID menggunakan ULID yang unik secara global sehingga tidak dapat tertukar antar-record, ketiadaan filter tenant melanggar prinsip *defense-in-depth*.
- **Rekomendasi**: Ubah parameter method menjadi `deleteStudent(id: string, sekolahId: string)` dengan kueri `this.db.siswa.deleteMany({ where: { id, sekolah_id: sekolahId } })` untuk memastikan operasi penghapusan tidak pernah mengeksekusi data lintas tenant sekalipun terjadi manipulasi parameter ID.

### Temuan D-02 (Critical Architectural Dependency): Sesi Siswa Membutuhkan Keanggotaan Sekolah Aktif
- **Lokasi**: `src/shared/infrastructure/auth/auth-service.ts` (Line 169–174).
- **Deskripsi**: Sesi autentikasi menentukan `sekolah_aktif_id` dari tabel `keanggotaan_sekolah` dengan kriteria `status_keanggotaan: "ACTIVE"`. Jika akun siswa dibuat di tabel `pengguna` tanpa baris terkait di `keanggotaan_sekolah`, sesi siswa akan terbentuk dengan `sekolah_aktif_id = null`.
- **Dampak**: Halaman siswa (`/tugas-siswa`, `/cbt-ujian`, `/rapor-siswa`) yang memiliki guard `if (!user.sekolah_id) redirect("/dashboard")` akan menolak akses siswa secara sepihak.
- **Rekomendasi**: Pembuatan akun siswa pada batch generation wajib menerapkan transaksi atomik Prisma:
  ```typescript
  await prisma.$transaction([
    prisma.pengguna.create({ ... }),
    prisma.keanggotaanSekolah.create({
      data: {
        pengguna_id: user.id,
        sekolah_id: sekolahId,
        peran_dasar_di_tenant: "STUDENT",
        status_keanggotaan: "ACTIVE",
      },
    }),
    prisma.siswa.update({ where: { id: siswaId }, data: { pengguna_id: user.id } }),
  ]);
  ```

---

## 4. Evaluasi Hak Akses & Privilege Escalation

1. **Self-Scope Enforcement**:
   - Seluruh endpoint siswa membaca identitas siswa langsung dari sesi server (`requireAuth()`), bukan dari parameter input client (`req.body.studentId`).
   - Hal ini mencegah kerentanan IDOR (*Insecure Direct Object Reference*), di mana seorang siswa mencoba melihat tugas atau nilai siswa lain dengan mengubah ID di URL atau payload.
2. **Protection Against Impersonation**:
   - Peran `STUDENT` diisolasi dari seluruh rute administrasi sekolah (`/guru-pengajaran`, `/presensi-kelas`, `/sesi-pembelajaran`, `/wali-kelas`, `/sekolah`).
   - Setiap rute guru dan staff memeriksa `user.peran_dasar` dan me-redirect siswa ke `/dashboard` jika terjadi percobaan akses terlarang.

---

## 5. Kesimpulan Audit Keamanan
Sistem memiliki isolasi multi-tenant yang tangguh dan mematuhi prinsip *Default Deny*. Dengan mengimplementasikan transaksi pembuatan akun yang menyertakan `keanggotaan_sekolah` serta menerapkan hardening pada Temuan D-01, lingkungan siswa aman dari risiko kebocoran data (*zero tenant leakage*).
