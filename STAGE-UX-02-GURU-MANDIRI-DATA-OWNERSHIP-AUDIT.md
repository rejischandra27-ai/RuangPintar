# STAGE UX-02: GURU MANDIRI DATA OWNERSHIP AUDIT
## Ruang Pintar — School Digital Operating Platform (SaaS Multi-Tenant)

> **Dokumen Audit Teknis:** `STAGE-UX-02-GURU-MANDIRI-DATA-OWNERSHIP-AUDIT.md`  
> **Status:** PROPOSED — READY FOR HUMAN REVIEW  
> **Tanggal:** 28 September 2026  
> **Ruang Lingkup:** Hak Kepemilikan Data, Otorisasi, Akses CRUD, dan Integritas Ruang Kerja Guru Mandiri  
> **Fokus Persona:** `Guru Mandiri` (*Personal Workspace Tenant*) vs `Guru Sekolah` (*School Tenant*)  
> **Referensi Arsitektur:** `AGENTS.md`, `ADR-001`, `ADR-002`, `ADR-003`, `docs/WORKSPACE-ARCHITECTURE-RECOMMENDATION.md`

---

## DAFTAR ISI
1. [Executive Summary](#1-executive-summary)
2. [Current Reality (Fakta Lapangan Kode Saat Ini)](#2-current-reality-fakta-lapangan-kode-saat-ini)
3. [Expected Behaviour (Perilaku yang Diharapkan)](#3-expected-behaviour-perilaku-yang-diharapkan)
4. [Gap Analysis Mendalam](#4-gap-analysis-mendalam)
5. [Permission Matrix (CRUD Guru Mandiri vs Guru Sekolah)](#5-permission-matrix-crud-guru-mandiri-vs-guru-sekolah)
6. [Navigation Matrix (Audit Bilah Samping)](#6-navigation-matrix-audit-bilah-samping)
7. [Tenant Ownership Verification (Otoritas Tenant Owner)](#7-tenant-ownership-verification-otoritas-tenant-owner)
8. [Data Integrity Findings (Integritas Relasi Akademik)](#8-data-integrity-findings-integritas-relasi-akademik)
9. [Critical Bugs Teridentifikasi](#9-critical-bugs-teridentifikasi)
10. [Analisis Dampak Pemindahan Alur Wali Murid](#10-analisis-dampak-pemindahan-alur-wali-murid)
11. [Recommended Fixes (Solusi Teknis Tanpa Regresi)](#11-recommended-fixes-solusi-teknis-tanpa-regresi)
12. [Implementation Risk & Residual Impact](#12-implementation-risk--residual-impact)

---

## 1. Executive Summary

Audit teknis **STAGE UX-02** ini dilakukan secara menyeluruh untuk memverifikasi kesiapan platform Ruang Pintar dalam memberikan **kedaulatan penuh (Data Ownership)** kepada **Guru Mandiri**. 

### Temuan Kritis Utama:
Platform saat ini dibangun dengan asumsi institusional sekolah formal (`Single-School` atau `School Tenant` konvensional), di mana hak pengelolaan data master siswa dan kelas dimonopoli oleh staf tata usaha (`SCHOOL_STAFF` dengan capability `STUDENT_DATA_OPERATOR` dan `ACADEMIC_OPERATOR`). Akibatnya, saat seorang guru mendaftar sebagai **Guru Mandiri**:
1. Guru Mandiri **DIBLOKIR TOTAL** saat membuka halaman `/data-siswa` (di-redirect paksa ke `/dashboard`).
2. Guru Mandiri **DIBLOKIR** saat mencoba menambah, mengedit, atau menghapus data siswa melalui Server Actions.
3. Guru Mandiri **TIDAK BISA** mengedit atau menghapus kelas (`Rombel`) karena aksi tersebut mewajibkan permission `academic.structure.manage`.
4. Menu **Data Siswa** sama sekali **TIDAK MUNCUL** pada sidebar navigasi guru.
5. Mesin otorisasi (`AccessControlEngine`) saat ini **mengabaikan status `is_owner` tenant**, sehingga seorang pemilik sah ruang kerja mandiri tetap diperlakukan hanya sebagai guru tamu biasa yang tidak punya kuasa administratif atas datanya sendiri.

---

## 2. Current Reality (Fakta Lapangan Kode Saat Ini)

### 2.1 Dashboard Guru Mandiri
Berdasarkan inspeksi terhadap `src/modules/teacher/application/teacher-facade.ts` dan `src/shared/components/dashboard/role-views/teacher-dashboard.tsx`:
- **Statistik Siswa (`totalSiswaBinaan`):** Dihitung semata-mata dari relasi `PenugasanMengajar` $\rightarrow$ `Rombel` $\rightarrow$ `PenempatanRombel`. Jika Guru Mandiri memiliki siswa di ruang kerjanya yang belum dialokasikan ke rombel/jadwal mengajar, siswa tersebut **hilang dari statistik dashboard** (`count = 0`).
- **Statistik Kelas (`totalRombel`):** Dihitung dari jumlah penugasan mengajar aktif. Jika ada rombel yang dibuat tetapi penugasan mengajarnya belum terbuat secara atomik, rombel tersebut tidak terhitung.
- **Statistik Presensi:** Dihitung strictly dari `SesiKelasAktual` hari ini (`tanggal: new Date()`). Jika tidak ada jadwal jam pelajaran resmi hari ini, presensi bernilai 0 tanpa indikator alternatif untuk sesi mandiri.
- **Statistik Asesmen:** Bergantung pada `DefinisiAsesmen` yang terikat ke penugasan mengajar guru. Jika penugasan mengajar tidak terbentuk, metrik nilai kosong.

### 2.2 Data Kelas (Rombel)
- **Lihat Kelas:** Guru dapat melihat kelasnya pada `/kelas-saya`, tetapi terbatas pada rombel di mana ia memiliki `PenugasanMengajar`. Halaman `/struktur-akademik` diblokir (403).
- **Tambah Kelas:** Di `/kelas-saya`, penambahan kelas hanya bisa lewat modal `ManualCreateClassModal` (`createManualClassAction`). Action resmi `createRombelAction` di `academic-actions.ts` **diblokir 403** karena mewajibkan permission `academic.structure.manage`.
- **Edit Kelas:** Action `updateRombelAction` di `src/app/actions/academic-actions.ts` mewajibkan `academic.structure.manage`. **Guru Mandiri diblokir 403 Forbidden!** Tidak ada antarmuka bagi Guru Mandiri untuk mengubah nama kelas atau tingkat rombel.
- **Hapus Kelas:** Action `deleteRombelAction` di `src/app/actions/academic-actions.ts` mewajibkan `academic.structure.manage`. **Guru Mandiri diblokir 403 Forbidden!**

### 2.3 Data Siswa (Kesiswaan)
- **Halaman `/data-siswa`:**
  Pada `src/app/data-siswa/page.tsx` baris 65–80:
  ```typescript
  const canViewStudents = isSuperAdmin || (await checkPermission("academic.students.view", { sekolah_id }));
  const canManageStudents = isSuperAdmin || (await checkPermission("academic.students.manage", { sekolah_id }));
  if (!canViewStudents && !canManageStudents) {
    redirect("/dashboard"); // <-- GURU MANDIRI DITENDANG KE DASHBOARD!
  }
  ```
- **Aksi Siswa (`student-actions.ts`):**
  - `createStudentAction` $\rightarrow$ mewajibkan `academic.students.manage` (403 Forbidden).
  - `updateStudentAction` $\rightarrow$ mewajibkan `academic.students.manage` (403 Forbidden).
  - `deleteStudentAction` $\rightarrow$ mewajibkan `academic.students.manage` (403 Forbidden).
  - `bulkDeleteStudentsAction` $\rightarrow$ mewajibkan `academic.students.manage` (403 Forbidden).
- **Import Siswa:** Tidak tersedia jalur impor mandiri CSV yang ramah untuk guru di `/data-siswa`.

---

## 3. Expected Behaviour (Perilaku yang Diharapkan)

### 3.1 Model Guru Sekolah vs Guru Mandiri
```text
+-----------------------------------+-----------------------------------+
|            GURU SEKOLAH           |            GURU MANDIRI           |
+-----------------------------------+-----------------------------------+
| Tipe Tenant: FORMAL (Sekolah)     | Tipe Tenant: MANDIRI (Personal)   |
| Kepemilikan: Anggota Institusi    | Kepemilikan: OWNER RUANG KERJA    |
| Hak Kelas: Terbatas Penugasan SK  | Hak Kelas: FULL CRUD              |
| Hak Siswa: Read-only Siswa Binaan | Hak Siswa: FULL CRUD + Import     |
| Tata Usaha: Dikelola Staf TU      | Tata Usaha: Dikelola Mandiri      |
+-----------------------------------+-----------------------------------+
```

### 3.2 Kebutuhan Perilaku Guru Mandiri
1. **Otoritas Owner Mutlak:** Guru Mandiri adalah *School/Workspace Owner* di tenant pribadinya. Ia berhak penuh mengelola seluruh kelas dan siswanya.
2. **Akses Data Siswa:** Menu **Data Siswa** wajib tampil di sidebar bilah samping. Halaman `/data-siswa` wajib terbuka penuh tanpa redirect 403.
3. **Siklus Hidup Siswa Mandiri:** Guru Mandiri dapat mendaftarkan siswa baru, mengedit data siswa, menghapus siswa, serta mengimpor daftar siswa dari berkas CSV/Excel dengan 1-klik.
4. **Siklus Hidup Kelas Mandiri:** Guru Mandiri dapat membuat kelas baru kapan saja, mengedit identitas kelas, dan menghapus kelas beserta penempatan siswanya tanpa memerlukan izin operator lain.
5. **Auto-Assignment Invariant:** Setiap kali Guru Mandiri membuat kelas di ruang mandirinya, sistem wajib **secara otomatis dan atomik** menugaskan guru tersebut sebagai pengampu mata pelajaran kelas tersebut (`PenugasanMengajar` otomatis). Dengan demikian, data siswa langsung mengalir ke buku nilai, presensi, dan CBT.

---

## 4. Gap Analysis Mendalam

| Area Fungsional | Kondisi Aktual (As Is) | Ekspektasi Bisnis (To Be) | Tingkat Keparahan | Akar Masalah Arsitektur |
| :--- | :--- | :--- | :---: | :--- |
| **Akses Halaman `/data-siswa`** | Redirect paksa ke `/dashboard`. | Halaman terbuka penuh dengan tab direktori siswa dan penempatan kelas. | **BLOCKER** | Guard hanya memeriksa permission `academic.students.view`, tidak mengecek status `is_owner`. |
| **Pendaftaran Siswa Baru** | Error 403: Kurang permission `academic.students.manage`. | Berhasil mendaftarkan siswa ke dalam ruang kerja mandiri. | **BLOCKER** | Base role `TEACHER` tidak dibekali permission kesiswaan di `role-permissions.ts`. |
| **Edit & Hapus Siswa** | Error 403 Forbidden. | Guru Mandiri dapat mengubah NIS/Nama dan menghapus siswa dari databasenya. | **BLOCKER** | Tidak ada evaluasi konteks tenant owner pada mutasi siswa. |
| **Edit & Hapus Kelas** | Error 403 Forbidden (`academic.structure.manage`). | Guru Mandiri dapat mengubah nama rombel dan menghapus rombel. | **HIGH** | Operasi rombel dikunci untuk peran operator akademik institusi. |
| **Sidebar Menu Kesiswaan** | Menu Data Siswa disembunyikan dari guru. | Menu Data Siswa tampil di bawah menu Kelas Saya. | **HIGH** | `navigation-config.ts` membatasi menu hanya untuk `SUPER_ADMIN` dan `SCHOOL_STAFF`. |
| **Dukungan Owner Tenant** | `AccessControlEngine` mengabaikan `is_owner_tenant`. | `is_owner_tenant = true` memberikan hak kelola administratif pada tenant aktif. | **ARCHITECTURAL** | Otorisasi berbasis peran flat tanpa resolusi hak kepemilikan tenant (*Tenant Ownership Blindness*). |
| **Dashboard Metrik Siswa** | Siswa tanpa `PenugasanMengajar` tidak terhitung. | Menghitung seluruh siswa aktif di dalam tenant mandiri. | **MEDIUM** | Query dashboard terikat mati pada tabel pivot penugasan mengajar formal. |

---

## 5. Permission Matrix (CRUD Guru Mandiri vs Guru Sekolah)

Berikut adalah matriks izin efektif yang wajib diterapkan pada mesin otorisasi:

| Entitas | Operasi | Guru Sekolah (Biasa) | Guru Mandiri (Owner Tenant) | Permission String yang Digunakan | Mekanisme Resolusi |
| :--- | :---: | :---: | :---: | :--- | :--- |
| **Kelas (Rombel)** | CREATE | ❌ (SK Kepsek) | ✅ ALLOWED | `academic.classes.manage` | Tenant Owner Bypass / Grant |
| | READ | ✅ (Kelas Sendiri) | ✅ ALLOWED (Semua) | `academic.classes.view` | Base Role Permission |
| | UPDATE | ❌ (Staf TU) | ✅ ALLOWED | `academic.classes.manage` | Tenant Owner Bypass / Grant |
| | DELETE | ❌ (Staf TU) | ✅ ALLOWED | `academic.classes.manage` | Tenant Owner Bypass / Grant |
| **Siswa** | CREATE | ❌ (Staf TU) | ✅ ALLOWED | `academic.students.manage` | Tenant Owner Bypass / Grant |
| | READ | ⚠️ (Binaan Saja) | ✅ ALLOWED (Semua) | `academic.students.view` | Tenant Owner Bypass / Grant |
| | UPDATE | ❌ (Staf TU) | ✅ ALLOWED | `academic.students.manage` | Tenant Owner Bypass / Grant |
| | DELETE | ❌ (Staf TU) | ✅ ALLOWED | `academic.students.manage` | Tenant Owner Bypass / Grant |
| | IMPORT | ❌ (Staf TU) | ✅ ALLOWED | `academic.students.manage` | Tenant Owner Bypass / Grant |
| **Presensi Sesi** | CREATE | ✅ ALLOWED | ✅ ALLOWED | `attendance.session.record` | Base Role Permission |
| | READ | ✅ ALLOWED | ✅ ALLOWED | `attendance.session.view` | Base Role Permission |
| | UPDATE | ✅ ALLOWED | ✅ ALLOWED | `attendance.session.correct`| Base Role Permission |
| | DELETE | ❌ (Terkunci) | ❌ (Terkunci) | - | Invariant Audit Presensi |
| **Buku Nilai** | CREATE | ✅ ALLOWED | ✅ ALLOWED | `assessment.grades.manage` | Base Role Permission |
| | READ | ✅ ALLOWED | ✅ ALLOWED | `assessment.grades.view` | Base Role Permission |
| | UPDATE | ✅ ALLOWED | ✅ ALLOWED | `assessment.grades.manage` | Base Role Permission |
| | PUBLISH | ✅ ALLOWED | ✅ ALLOWED | `assessment.grades.publish`| Base Role Permission |
| **Ujian CBT** | CREATE | ✅ ALLOWED | ✅ ALLOWED | `cbt.exam.manage` | Base Role Permission |
| | READ | ✅ ALLOWED | ✅ ALLOWED | `cbt.exam.view` | Base Role Permission |
| | UPDATE | ✅ ALLOWED | ✅ ALLOWED | `cbt.exam.manage` | Base Role Permission |
| | MONITOR | ✅ ALLOWED | ✅ ALLOWED | `cbt.attempt.monitor` | Base Role Permission |

---

## 6. Navigation Matrix (Audit Bilah Samping)

Audit menu navigasi sidebar (`src/shared/components/shell/navigation-config.ts`):

| Menu Item | Path Halaman | Guru Sekolah | Guru Mandiri | Status Perbaikan yang Dibutuhkan |
| :--- | :--- | :---: | :---: | :--- |
| **Dashboard** | `/dashboard` | ✅ Tampil | ✅ Tampil | Tidak ada perubahan (Sudah Sesuai). |
| **Kelas Saya** | `/kelas-saya` | ✅ Tampil | ✅ Tampil | Tidak ada perubahan (Sudah Sesuai). |
| **Data Siswa** | `/data-siswa` | ❌ Tersembunyi | **✅ WAJIB TAMPIL** | **PERBAIKAN:** Tambahkan evaluasi: tampilkan jika `is_owner_tenant === true` atau tenant bertipe `MANDIRI`. |
| **Jadwal Mengajar** | `/jadwal-saya` | ✅ Tampil | ✅ Tampil | Dapat disesuaikan atau disederhanakan pada ruang mandiri. |
| **Log Sesi KBM** | `/sesi-pembelajaran`| ✅ Tampil | ✅ Tampil | Sesuai. |
| **Rekap Presensi** | `/presensi-kelas` | ✅ Tampil | ✅ Tampil | Sesuai. |
| **Buku Nilai & Rapor** | `/penilaian` | ✅ Tampil | ✅ Tampil | Sesuai. |
| **CBT Ujian Online**| `/cbt-ujian` | ✅ Tampil | ✅ Tampil | Sesuai. |
| **Wali Kelas** | `/wali-kelas` | ⚠️ Jika ditugaskan | ❌ Tersembunyi | Sembunyikan untuk Guru Mandiri (tidak relevan). |
| **Portal Pimpinan** | `/pimpinan` | ⚠️ Jika Kepsek | ❌ Tersembunyi | Sembunyikan untuk Guru Mandiri (tidak relevan). |

---

## 7. Tenant Ownership Verification (Otoritas Tenant Owner)

Dalam `ADR-001` Section 1 disebutkan:
> *"School Owner adalah otoritas tenancy pada membership... Owner memiliki kewenangan tata kelola tenant."*

### Kondisi Nyata di Kode:
Di berkas `src/shared/infrastructure/authorization/access-control.ts`:
Objek `ActorContext` menerima `id`, `username`, `peran_dasar`, `status_akun`, `sekolah_id`, dan `capabilities`. **Properti `is_owner` TIDAK DITERUSKAN ke AccessControlEngine!**

### Rekomendasi Solusi Arsitektural:
1. Perbarui `ActorContext` di `types.ts` agar menyertakan:
   ```typescript
   is_owner?: boolean;
   tipe_sekolah?: "FORMAL" | "MANDIRI";
   ```
2. Pada `accessControlEngine.evaluate`:
   Jika `actor.is_owner === true` (atau jika `actor.tipe_sekolah === "MANDIRI"`), berikan hak administratif tenant scope:
   ```typescript
   // Tenant Owner memiliki hak kelola struktur kelas & kesiswaan di tenant miliknya
   if (actor.is_owner) {
     grantedPermissions.add("academic.classes.manage");
     grantedPermissions.add("academic.classes.view");
     grantedPermissions.add("academic.students.manage");
     grantedPermissions.add("academic.students.view");
     grantedPermissions.add("academic.structure.manage");
     grantedPermissions.add("academic.structure.view");
   }
   ```
   *Invariant Keamanan Tetap Terjaga:* Tenant Owner **TETAP TIDAK BISA** mengakses tenant sekolah lain karena filter `resource.sekolah_id !== actor.sekolah_id` tetap menolaknya (*Strict Tenant Isolation*).

---

## 8. Data Integrity Findings (Integritas Relasi Akademik)

Berdasarkan audit constraint skema database SQLite + Prisma:
```text
Sekolah (Tenant)
  └── TahunAjaran (TA-2026-2027)
        └── Semester (Ganjil)
              └── Rombel (Kelas)
                    ├── PenempatanRombel ──> Siswa
                    └── PenugasanMengajar ──> Guru & MataPelajaran
```

### 3 Titik Kritis Kehilangan Relasi (Relational Breakdown):
1. **Siswa Terdaftar Tanpa Penempatan Rombel:**
   Jika Guru Mandiri membuat siswa via form pendaftaran siswa tanpa mengisi `initial_rombel_id`, siswa tersebut berstatus aktif di tabel `siswa`, tetapi tidak berada di rombel mana pun. Akibatnya, siswa tersebut **tidak akan muncul di lembar absensi kelas** maupun buku nilai mana pun.
   *Solusi:* Di ruang kerja mandiri, UI pendaftaran siswa wajib mewajibkan pemilihan kelas atau otomatis memasukkan siswa ke kelas aktif yang sedang dibuka.
2. **Rombel Dibuat Tanpa Penugasan Mengajar:**
   Jika rombel dibuat tanpa membuat baris `PenugasanMengajar` untuk guru tersebut, query `TeacherFacade` tidak akan mendeteksi kelas tersebut sebagai kelas ajar guru.
   *Solusi:* Pada `rombelService.createRombel`, jika tenant bertipe `MANDIRI`, sistem secara otomatis membuatkan `PenugasanMengajar` untuk guru pemilik workspace.
3. **Mata Pelajaran Bawaan Mandiri:**
   Guru Mandiri sering mengajar mata pelajaran spesifik. Saat workspace mandiri dibuat, wajib disiapkan sedikitnya satu mata pelajaran default (misal: sesuai input wizard atau *"Mata Pelajaran Utama"*) agar relasi KBM langsung siap pakai tanpa setup kurikulum berbelit.

---

## 9. Critical Bugs Teridentifikasi

### BUG-GURU-01: Hard Redirect 403 pada `/data-siswa`
- **Lokasi:** `src/app/data-siswa/page.tsx:78`
- **Pemicu:** Guru Mandiri mengklik atau membuka URL `/data-siswa`.
- **Dampak:** Server langsung me-redirect pengguna ke `/dashboard` karena `TEACHER` tidak memiliki `academic.students.view`.
- **Status:** **BLOCKER (P0)**.

### BUG-GURU-02: Mutasi Siswa Ditolak Server Guard
- **Lokasi:** `src/app/actions/student-actions.ts:52` (`createStudentAction`, `updateStudentAction`, `deleteStudentAction`).
- **Pemicu:** Guru Mandiri mencoba menyimpan data siswa baru atau mengedit siswa.
- **Dampak:** Muncul pesan galat *"Akses ditolak: Anda tidak memiliki izin untuk tindakan ini"*.
- **Status:** **BLOCKER (P0)**.

### BUG-GURU-03: Rombel Mandiri Tidak Bisa Diedit / Dihapus
- **Lokasi:** `src/app/actions/academic-actions.ts:724, 768, 814`.
- **Pemicu:** Guru Mandiri ingin memperbaiki nama kelas atau menghapus kelas percobaan.
- **Dampak:** Aksi ditolak oleh `requirePermission("academic.structure.manage")`.
- **Status:** **HIGH (P1)**.

### BUG-GURU-04: Menu Kesiswaan Hilang dari Navigasi
- **Lokasi:** `src/shared/components/shell/navigation-config.ts:351`.
- **Pemicu:** Akun dengan peran `TEACHER` login ke aplikasi.
- **Dampak:** Menu Data Siswa tidak ditampilkan di sidebar, sehingga guru mandiri tidak memiliki pintu masuk untuk mengelola siswanya.
- **Status:** **HIGH (P1)**.

---

## 10. Analisis Dampak Pemindahan Alur Wali Murid

Sesuai Revisi Wajib #2, opsi pendaftaran `Wali Murid` dikeluarkan secara permanen dari halaman registrasi publik `/register`.

### 10.1 Analisis Dampak Bisnis & Konversi
- **Fokus Corong Pemasaran (Marketing Funnel Clarity):**
  Halaman depan dan form registrasi menjadi 100% didedikasikan untuk pendidik (Guru Sekolah & Guru Mandiri). Tingkat konversi (*signup conversion rate*) diproyeksikan meningkat signifikan karena calon guru tidak lagi bingung memilih role.
- **Pencegahan Akun Zombi (Zero Orphan Accounts):**
  Sebelumnya, orang tua murid yang mendaftar secara mandiri di `/register` sering kali berakhir dengan akun kosong tanpa tautan ke anak mana pun karena mereka belum memiliki kode verifikasi sekolah.

### 10.2 Pemindahan Saluran Masuk Wali Murid (New Entry Points)
Alur wali murid dialihkan menjadi 3 saluran kontekstual yang jauh lebih aman:
1. **Saluran 1: Klaim Mandiri via Kode Verifikasi Siswa (`/guardian/klaim-anak`):**
   Sekolah atau Guru Mandiri membagikan lembar berisi *Kode Klaim Unik* (misal: kombinasi NIS + Tanggal Lahir + 6 Digit Kode Acak). Orang tua membuka tautan klaim, memasukkan kode, lalu membuat akun yang langsung terhubung ke profil anaknya.
2. **Saluran 2: Undangan Tautan Khusus Sekolah (`/join/[code]`):**
   Operator sekolah atau guru mengirimkan tautan undangan unik satu kali pakai (*single-use invitation link*) ke nomor WhatsApp/Email wali murid. Membuka tautan ini langsung mengaktifkan akun wali dengan relasi anak yang sudah terverifikasi.
3. **Saluran 3: Registrasi Tertutup oleh Pihak Sekolah:**
   Data kontak wali murid dimasukkan oleh staf administrasi pada menu Data Siswa, yang memicu email aktivasi instan kepada wali murid terkait.

### 10.3 Dampak Teknis terhadap Berkas Kode
- Berkas `src/app/register/register-form.tsx`:
  - Tab switcher `Guru Mandiri` vs `Wali Murid` dihapus.
  - Dropdown sekolah untuk wali murid dihapus.
  - Aksi `registerGuardianAction` dilepaskan dari `/register`.
- Berkas `src/app/actions/guardian-actions.ts`:
  - `registerGuardianAction` dipertahankan khusus untuk alur klaim kode atau undangan (`/guardian/klaim-anak`).
- Tidak ada tabel atau relasi database yang dihapus (`WaliMurid`, `HubunganWaliSiswa`, `PengajuanWali` tetap aman dan utuh).

---

## 11. Recommended Fixes (Solusi Teknis Tanpa Regresi)

Penyelesaian audit ini dirancang dengan prinsip bedah presisi (*clean architecture*):

```text
1. ACCESS CONTROL ENGINE ENHANCEMENT
   ├── Perluas ActorContext dengan is_owner dan tipe_sekolah
   └── Jika is_owner === true pada tenant aktif:
         Grant: academic.students.manage, academic.students.view,
                academic.classes.manage, academic.classes.view,
                academic.structure.manage, academic.structure.view.

2. NAVIGATION CONFIG UPDATE
   └── Di navigation-config.ts:
         Izinkan menu "Data Siswa" tampil bagi TEACHER jika is_owner_tenant === true
         atau jika workspace aktif bertipe MANDIRI.

3. PAGE GUARD ADJUSTMENT (/data-siswa)
   └── Di src/app/data-siswa/page.tsx:
         Periksa user.is_owner_tenant atau tipe_sekolah === "MANDIRI".
         Beri hak canView = true dan canManage = true untuk Owner Workspace.

4. AUTOMATIC RELATION PROVISIONING (ATOMIC AUTO-ASSIGN)
   └── Di service pembuatan kelas mandiri:
         Secara atomik buat Rombel + MataPelajaran + PenugasanMengajar (Guru = Owner).
         Jamin siswa yang dimasukkan langsung terhubung ke KBM guru.

5. SIMPLIFIED CSV STUDENT IMPORTER FOR TEACHERS
   └── Sediakan komponen modal impor CSV sederhana di halaman /data-siswa
         yang dapat digunakan langsung oleh Guru Mandiri tanpa menu TU yang rumit.
```

---

## 12. Implementation Risk & Residual Impact

| Risiko Potensial | Probabilitas | Dampak | Mitigasi yang Ditetapkan |
| :--- | :---: | :---: | :--- |
| **Privilege Escalation Guru Sekolah:** Guru sekolah biasa tiba-tiba bisa mengedit data seluruh siswa di sekolah resmi. | Sangat Rendah | Kritis | Hak kelola kesiswaan **HANYA** diberikan jika `is_owner === true` ATAU `tipe_sekolah === "MANDIRI"`. Guru biasa di sekolah formal tetap berstatus *Read-Only* pada data siswa non-binaannya. |
| **Kebocoran Data Lintas Tenant:** Guru Mandiri dapat melihat siswa dari sekolah formal lain. | Nol | Kritis | Pengecekan `sekolah_id` tervalidasi pada tingkat SQL query (`where: { sekolah_id: actor.sekolah_id }`) tetap berjalan 100%. Isolasi data mutlak dipertahankan. |
| **Perubahan Perilaku Pengujian Eksisting (Regression):** Test suite authorization gagal karena perubahan hak akses. | Rendah | Sedang | Seluruh unit test existing menguji guru sekolah biasa tanpa flag owner; test-test tersebut akan tetap hijau. Test baru akan ditambahkan khusus memverifikasi hak owner Guru Mandiri. |

---

## 13. Kesimpulan

Audit **STAGE UX-02** membuktikan bahwa kedaulatan data Guru Mandiri saat ini **belum terpenuhi** karena adanya blokade pada mesin otorisasi dan navigasi yang masih berorientasi institusi formal. 

Dengan rekomendasi perbaikan berbasis `Tenant Ownership Authorization` di atas, Guru Mandiri akan memperoleh hak penuh mengelola kelas, siswa, presensi, nilai, dan CBT secara independen tanpa melanggar prinsip isolasi multi-tenant Ruang Pintar.
