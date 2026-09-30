# PHASE 03 — SCHOOL DISCOVERY & REGISTRATION REFACTOR SPECIFICATION
## Ruang Pintar — School Digital Operating Platform

| Metadata | Nilai |
| --- | --- |
| **Phase** | PHASE 03 |
| **Feature Slug** | `school-discovery-and-registration-refactor` |
| **Status** | APPROVED — IMPLEMENTATION PHASE |
| **Dokumen Induk** | `docs/BRD.md`, `docs/PRD.md`, `docs/05-SYSTEM-ARCHITECTURE.md`, `docs/AUDIT-REGISTRATION-ONBOARDING-WORKFLOW.md` |
| **Owner** | Fikran Engineering / Antigravity |

---

# 1. Ringkasan Eksekutif & Tujuan

Tujuan dari Phase 03 adalah merefaktor alur registrasi guru mandiri dari:
```text
Daftar
  → Auto membuat tenant dummy "Ruang Mengajar Mandiri - [Nama]" (Jenjang SMA)
  → Pilih Avatar
  → Dashboard
```
Menjadi alur multi-tenant institusi sekolah yang sebenarnya:
```text
Cari Sekolah (School Discovery)
  ├─ Jika Sekolah Ditemukan:
  │    → Klik [Gabung Sekolah]
  │    → Keanggotaan Sekolah dibuat (is_owner: false)
  │    → Tanpa membuat tenant baru & tanpa membuat trial baru
  │
  └─ Jika Sekolah Tidak Ditemukan:
       → Form Buat Sekolah Baru:
            - Nama Sekolah (input)
            - Jenjang (SD | SMP | SMA | SMK | UMUM)
       → Tenant Sekolah Baru dibuat
       → Keanggotaan Sekolah dibuat (is_owner: true)
       → Trial 30 Hari diaktifkan untuk tenant baru
  ↓
Pilih Avatar Astronot
  ↓
Dashboard (Auto-Login)
  ↓
Teacher Onboarding Wizard (Cockpit 5-Step)
```

---

# 2. Arsitektur & Prinsip yang Dipertahankan (Non-Negotiables)

1. **Authentication Engine**: Sesi server-authoritative (`SesiPengguna`), token hash SHA-256, rotasi cookie HTTP-only (`ruang_pintar_session`).
2. **Authorization Engine**: Hierarki Effective Access (`Identity -> Base Role -> Position/Assignment -> Permission -> Effective Access`).
3. **Tenant Ownership**:
   - Pendaftar sekolah baru mendapatkan `is_owner: true` pada `KeanggotaanSekolah`, yang menginjeksi kapabilitas `academic.classes.manage` dan `academic.students.manage`.
   - Pendaftar yang bergabung ke sekolah yang sudah ada mendapatkan `is_owner: false` (hanya hak `TEACHER` standar).
4. **Auto-Login**: Pengguna yang selesai mendaftar langsung mendapatkan sesi aktif tanpa perlu login ulang di `/login`.
5. **Avatar Picker**: Mempertahankan 6 karakter astronot (`kapten-kosmik`, `insinyur-orbit`, `profesor-nebula`, `pionir-surya`, `navigator-bintang`, `kadet-galaksi`) dan opsi lewati default.
6. **Teacher Onboarding Wizard**: Modal 5-langkah di Dashboard (`TeacherOnboardingWizard`) tetap berjalan dan membaca progres dari tabel `preferensi_onboarding_guru`.
7. **Academic Glass UI**: Seluruh antarmuka mempertahankan gaya visual Academic Glass (border halus, backdrop blur, palet warna slate & biru safir, tipografi responsif).
8. **Backward Compatibility & Non-Destructive Migration**: Tidak ada data guru mandiri lama atau sekolah lama yang diubah/dihapus. Semua tenant lama tetap berjalan normal.

---

# 3. Spesifikasi Fungsional & Komponen

## 3.1 Komponen School Discovery (`SchoolSearchInput`)
- **Fitur**:
  - Input pencarian teks dengan debounce 300ms.
  - Mencari berdasarkan nama sekolah (`nama`) dan/atau NPSN (`npsn`).
  - Minimum 2 karakter untuk memicu pencarian server.
- **Tampilan Hasil (Jika Ditemukan)**:
  - Kartu sekolah yang menampilkan:
    - Nama Sekolah (font tebal)
    - Badge Jenjang (`SD` / `SMP` / `SMA` / `SMK` / `UMUM`)
    - Kota/Kabupaten atau Alamat Sekolah
    - NPSN (jika tersedia)
    - Tombol aksi: `[ Gabung Sekolah ]`
- **Tampilan State Kosong (Empty State)**:
  - Pesan ramah: *"Sekolah tidak ditemukan atau belum terdaftar di Ruang Pintar."*
  - Tombol aksi: `[ Daftarkan Sekolah Baru ]` yang membuka form buat sekolah baru.

## 3.2 Alur Registrasi Sekolah Baru (`Create School Flow`)
- **Field yang Ditampilkan**:
  1. `nama_sekolah`: Input teks nama resmi sekolah (wajib, min. 3 karakter).
  2. `jenjang`: Pilihan dropdown atau pill radio selector:
     - `SD`
     - `SMP`
     - `SMA`
     - `SMK`
     - `UMUM`
- **Batasan**: Tidak meminta NPSN, telepon, atau alamat lengkap pada tahap onboarding awal ini demi meminimalkan friksi pengguna ( filosofi *"Zero Setup < 3 Menit"*).

## 3.3 Refactor Service Registrasi Guru (`smartOnboardingService.registerTeacher`)
Mendukung dua cabang logika di dalam transaksi database:

### Cabang A: Sekolah Baru
- **Input**: `nama_sekolah`, `jenjang`, `nama_lengkap`, `email`, `password`.
- **Eksekusi Database**:
  1. Buat record `Sekolah` baru dengan nama dan jenjang sesuai input, lisensi `FREEMIUM`.
  2. Buat `TahunAjaran` aktif (2026/2027) dan `Semester` Ganjil aktif.
  3. Buat `TingkatKelas` sesuai jenjang yang dipilih.
  4. Buat `Pengguna` (`peran_dasar: "TEACHER"`, `status_akun: "AKTIF"`).
  5. Buat profil `Guru`.
  6. Buat `KeanggotaanSekolah` dengan **`is_owner: true`**, `status_keanggotaan: "ACTIVE"`, `sumber_pendaftaran: "OWNER_CREATE"`.
  7. Buat `LanggananTenant` dengan **`paket: "TRIAL"`**, `status: "TRIAL_ACTIVE"`, durasi 30 hari.
  8. Buat `PreferensiOnboardingGuru` (`onboarding_eligible: true`, `onboarding_completed: false`).
  9. Buat `SesiPengguna` yang mengikat `sekolah_aktif_id` ke sekolah baru tersebut.

### Cabang B: Sekolah Ditemukan (Gabung Sekolah Eksisting)
- **Input**: `sekolah_id`, `nama_lengkap`, `email`, `password`.
- **Eksekusi Database**:
  1. Validasi `sekolah_id` ada dan aktif di database.
  2. Buat `Pengguna` (`peran_dasar: "TEACHER"`, `status_akun: "AKTIF"`).
  3. Buat profil `Guru` yang terhubung ke `sekolah_id` tersebut.
  4. Buat `KeanggotaanSekolah` dengan **`is_owner: false`**, `status_keanggotaan: "ACTIVE"`, `sumber_pendaftaran: "JOIN_REQUEST"`.
  5. **DILARANG** membuat `Sekolah` baru.
  6. **DILARANG** membuat `LanggananTenant` baru (trial mengikuti langganan tenant sekolah yang sudah ada).
  7. Buat `PreferensiOnboardingGuru` untuk guru pada sekolah tersebut (`onboarding_eligible: true`, `onboarding_completed: false`).
  8. Buat `SesiPengguna` yang mengikat `sekolah_aktif_id` ke `sekolah_id` yang dipilih.

## 3.4 Google OAuth Refactor
- Pengguna baru Google OAuth **TIDAK BOLEH** langsung membuat tenant dummy `"Ruang Mengajar Mandiri"`.
- Jika Google identity belum terdaftar di `identitas_provider`:
  1. Route callback menyimpan data identitas Google yang terverifikasi (email, nama, sub) ke dalam cookie bertanda tangan sementara `ruang_pintar_google_pending`.
  2. Mengarahkan browser ke `/register?oauth=google`.
  3. Halaman `/register` membaca status pending Google, menampilkan sapaan pendaftaran Google, lalu memandu pengguna:
     - Cari Sekolah atau Isi Nama Sekolah & Jenjang baru
     - Tombol konfirmasi pendaftaran (tanpa perlu mengisi password manual).
  4. Server Action menyelesaikan pendaftaran, mencatat `identitas_provider`, menghapus cookie pending, dan me-redirect ke `/onboarding/pilih-avatar`.

---

# 4. Acceptance Criteria & Quality Gate

1. **Pencarian Sekolah**:
   - Query pencarian sekolah mereturn data sekolah aktif yang cocok (nama atau NPSN).
   - Menghasilkan daftar kartu dengan tombol [Gabung Sekolah].
2. **Pendaftaran Sekolah Baru**:
   - Jika sekolah tidak ada, form nama sekolah dan jenjang tampil.
   - Pendaftaran berhasil menciptakan tenant baru dengan nama dan jenjang yang dimasukkan.
   - Pendaftar tercatat sebagai `is_owner: true`.
   - `LanggananTenant` berstatus `TRIAL_ACTIVE` tercipta untuk tenant baru.
3. **Gabung Sekolah Eksisting**:
   - Pendaftaran ke sekolah yang ada berhasil mengaitkan guru ke tenant tersebut.
   - Guru tercatat sebagai `is_owner: false`.
   - Tidak ada duplikasi record `Sekolah` maupun `LanggananTenant`.
4. **Google OAuth Flow Baru**:
   - Akun Google baru diarahkan memilih/mendaftarkan sekolah terlebih dahulu.
   - Tidak ada tenant dummy yang terbuat secara liar.
5. **Onboarding & Avatar**:
   - Alur tetap mengarahkan ke `/onboarding/pilih-avatar`.
   - Dashboard tetap menampilkan `TeacherOnboardingWizard`.
6. **Regresi & Verification**:
   - 0 error pada `npm run typecheck`
   - 0 error pada `npm run lint`
   - 100% PASS pada seluruh unit/integration tests (`npm run test`)
   - 100% PASS pada `npm run build`
