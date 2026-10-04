# Feature Specification: Guardian Claim & Student Linkage Flow (Stage 16)

| Field | Detail |
| --- | --- |
| **Feature Slug** | `guardian-claim-student-linkage` |
| **Stage** | Stage 16 — SaaS Multi-Tenant Foundation |
| **Lifecycle Gate** | `SPEC` |
| **Domain** | M15 Guardian & Family / Identity & Access / Student Lifecycle |
| **Status** | `active` |

---

## 1. Problem Statement & Executive Summary
Sebelum Stage 16, akun orang tua/wali murid (`WaliMurid`) hanya dapat dihubungkan ke data siswa (`Siswa`) melalui intervensi manual oleh staf Tata Usaha/Operator Sekolah via database seed atau manipulasi data backend. Hal ini menimbulkan bottleneck operasional saat tahun ajaran baru atau onboarding sekolah massal, serta memperlambat adopsi portal pemantauan akademik oleh orang tua.

Stage 16 mengaktifkan ekosistem mandiri (self-service) bagi Orang Tua / Wali Murid:
1. Pendaftaran akun wali murid mandiri (*Guardian Self-Registration*).
2. Verifikasi identitas siswa yang aman, mudah, dan sesuai realitas sekolah Indonesia (*Student Identity Verification*).
3. Pratinjau data siswa aman tanpa kebocoran data akademik (*Safe Student Preview*).
4. Konfirmasi dan pembentukan relasi sah multi-anak (*Multi-Child Student Linkage*).
5. Proteksi klaim duplikat (*Duplicate Claim Protection*) dan isolasi tenant ketat (*Tenant Boundary Enforcement*).
6. Pencatatan log audit menyeluruh (*Append-only Audit Log*).
7. Penyempurnaan dashboard wali dengan kartu profil anak dan ringkasan akademik (*Academic Glass UI*).

---

## 2. Invariants & Domain Rules
Sesuai aturan baku sistem:
1. **Student ≠ User**: `Siswa` adalah entitas akademik individu; `Pengguna` adalah akun autentikasi login.
2. **Guardian ≠ Student**: Orang tua memiliki akun dan peran sendiri (`peran_dasar: "GUARDIAN"`), bukan login menggunakan akun siswa.
3. **Multi-Child Support**: Satu akun wali dapat terhubung ke lebih dari 1 siswa (Anak 1, Anak 2, dst).
4. **Multi-Guardian Support**: Satu siswa dapat terhubung ke Ayah, Ibu, dan/atau Wali secara terpisah (`HubunganWaliSiswa`).
5. **Zero Data Leakage on Preview**: Sebelum klaim terkonfirmasi, data sensitif (nilai ujian, riwayat presensi harian, catatan konseling) **DILARANG KERAS** ditampilkan. Hanya Nama Siswa, Kelas/Rombel, dan Nama Sekolah yang ditampilkan untuk konfirmasi kebenaran.
6. **Strict Tenant Isolation**: Wali hanya dapat memverifikasi dan mengklaim siswa yang berada pada institusi sekolah (`sekolah_id`) yang sama. Percobaan lintas tenant wajib ditolak secara server-side.

---

## 3. Student Identity Verification Strategy (Fitur 02 Audit)

### 3.1. Hasil Audit Master Data Siswa
Audit pada 700 record siswa aktif di database:
- **NIS**: 341 siswa memiliki NIS (nomor induk lokal 4 digit, e.g. "1001"). 359 siswa rekonsiliasi belum memiliki NIS (`nis: null`).
- **NISN**: 0 siswa terisi di database lokal saat ini.
- **Tanggal Lahir**: Belum terisi (null) pada dataset sheet hasil migrasi.
- **Nama Lengkap**: 100% siswa memiliki nama lengkap resmi.
- **Rombel / Penempatan**: 100% siswa memiliki penempatan rombel aktif (`PenempatanRombel`).

### 3.2. Rekomendasi Kombinasi Verifikasi Terpilih
Kombinasi yang dipilih untuk memadukan **Keamanan**, **Kemudahan Penggunaan**, dan **Kesesuaian Realitas Sekolah Indonesia**:
1. **Jalur Utama (Siswa Ber-NIS / NISN)**:
   - **Nomor Induk**: Input NIS atau NISN siswa.
   - **Faktor Verifikasi Rahasia (Secondary Factor)**: Input Nama Lengkap Siswa (dicocokkan insensitif terhadap spasi ganda dan kapitalisasi).
   - **Verifikasi Rombel**: Konfirmasi tingkat / nama rombel.
   *Alasan Keamanan*: Mengetikkan NIS 4 digit saja sangat rentan terhadap tebakan/typo. Dengan mewajibkan pencocokan nama lengkap siswa, pihak ketiga yang hanya mengetahui angka NIS tidak dapat membobol profil siswa lain.
2. **Jalur Fleksibel (Siswa Baru / Belum Ber-NIS)**:
   - **Nama Lengkap Siswa** + **Pilihan Rombel Kelas Aktif**.
   - Sistem mencocokkan siswa yang tepat dalam rombel tersebut di sekolah aktif.

---

## 4. User Journey & Functional Flows

```
[ Registrasi Akun Wali ]
        ↓
[ Login ke Ruang Pintar ]
        ↓
[ Dashboard Wali / Halaman Klaim ]
        ↓
[ Step 1: Form Verifikasi Identitas ]
  • Masukkan NIS / NISN atau Nama Siswa + Rombel
  • Pilih Hubungan (AYAH / IBU / WALI)
  • Centang Wali Utama (Ya/Tidak)
        ↓
[ Step 2: Validasi Server & Preview ]
  • Validasi kecocokan server-side & cek isolasi tenant
  • Cek apakah relasi sudah pernah dibuat (duplikat)
  • Tampilkan: Nama Siswa, Kelas/Rombel, Nama Sekolah
  • Catat Audit Log: GUARDIAN_CLAIM_INITIATED
        ↓
[ Step 3: Konfirmasi Klaim oleh Wali ]
  • Klik "Konfirmasi & Hubungkan Siswa"
        ↓
[ Step 4: Pembentukan Relasi Resmi ]
  • HubunganWaliSiswa terbuat (status: TERVERIFIKASI)
  • Cookie sesi anak aktif di-set
  • Catat Audit Log: GUARDIAN_LINKED_TO_STUDENT
        ↓
[ Dashboard Wali Aktif ]
  • Menampilkan Kartu Profil Anak Terhubung
  • Cockpit Akademik, Presensi, dan Nilai Terbuka
  • Tombol "Klaim Anak Lain" tersedia untuk Multi-Child
```

---

## 5. Security & Tenant Boundary Specifications
- **Authorization Guard**: Endpoint dan Server Action mutasi klaim hanya dapat dieksekusi oleh pengguna dengan `peran_dasar === "GUARDIAN"`.
- **Tenant Scope Enforcer**: `prisma.siswa.findFirst({ where: { id: studentId, sekolah_id: actor.sekolah_id } })`. Dilarang membaca data siswa sekolah lain.
- **Rate Limiting / Abuse Protection**: Mencegah serangan brute-force tebakan nama/NIS dengan rate-limiter atau batasan percobaan login/klaim.
- **Audit Logging**: Setiap aksi inisiasi, penolakan (gagal nama/tidak ditemukan/lintas tenant/duplikat), dan keberhasilan klaim dicatat ke tabel `LogAudit` append-only.

---

## 6. Acceptance Criteria
- [ ] Wali murid dapat mendaftar akun secara mandiri dan langsung mendapatkan profil `WaliMurid` aktif.
- [ ] Form verifikasi siswa berhasil mencocokkan siswa berdasarkan kombinasi NIS/NISN + Nama Lengkap, atau Nama Lengkap + Rombel.
- [ ] Pratinjau siswa hanya menampilkan Nama, Kelas, dan Sekolah (tidak membocorkan nilai/absensi).
- [ ] Konfirmasi klaim menghasilkan relasi `HubunganWaliSiswa` terverifikasi.
- [ ] Percobaan klaim ganda oleh akun yang sama menghasilkan error yang ramah dan jelas.
- [ ] Percobaan klaim siswa dari tenant sekolah berbeda ditolak tegas (403/Forbidden / Tenant Mismatch).
- [ ] Wali murid dapat menghubungkan lebih dari 1 anak dan berpindah konteks anak dengan lancar.
- [ ] Seluruh aktivitas tercatat di `LogAudit`.
- [ ] Tampilan UI memenuhi standar Academic Glass UI dan responsif di mobile.
- [ ] Seluruh Quality Gate lolos: `typecheck`, `lint`, `test`, `build`.
