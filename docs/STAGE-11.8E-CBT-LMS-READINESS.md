# STAGE 11.8E — CBT & LMS READINESS ASSESSMENT
## Comprehensive Operational Readiness Review for Core Student Modules

| Attribute | Detail |
| :--- | :--- |
| **Project Identity** | Ruang Pintar — School Digital Operating Platform |
| **Evaluated Modules** | LMS (M11), CBT (M14), Assignment (M11), Attendance (M09), Gradebook (M13) |
| **Target Dataset** | 700 Siswa Kanonikal SMK OTOMINDO (Kelas X, XI, XII) |
| **Status Kesiapan** | **ENGINEERING & UI READY — AWAITING ACCOUNT PROVISIONING** |

---

## 1. Executive Summary Kesiapan Modul

Audit kesiapan teknis ini mengevaluasi apakah subsistem pembelajaran dan evaluasi telah siap melayani 700 siswa begitu akun digital diterbitkan. Hasil audit membuktikan bahwa seluruh pipeline backend (Service & Repository), database schema, DTO, data fetching, serta antarmuka visual (Academic Glass UI) telah berada pada status **100% PRODUCTION-READY**.

Satu-satunya faktor penghambat operasional (*single blocking dependency*) saat ini adalah **ketiadaan akun pengguna untuk 700 siswa** (`coverage = 0.00%`). Begitu akun dibuat sesuai rekomendasi Phase C, kelima modul dapat langsung beroperasi tanpa membutuhkan refactoring kode tambahan.

---

## 2. Matriks Evaluasi Kesiapan per Modul

| Modul | Status Kesiapan | Apa yang Sudah Siap (Engineered) | Apa yang Belum Siap / Keterbatasan | Sisa Blocker |
| :--- | :---: | :--- | :--- | :--- |
| **1. LMS (Materi KBM)** | **READY** | - Route `/tugas-siswa` aktif<br>- `StudentLearningView` terimplementasi<br>- Rendering dokumen, teks, link, dan video | - Guru belum mengunggah materi pelajaran riil untuk semester berjalan | **Akun Siswa Belum Dibuat** |
| **2. CBT (Ujian Online)** | **READY** | - Route `/cbt-ujian`, `/cbt/[attemptId]`, `/cbt/start`<br>- Dukungan ujian ber-token & timer server<br>- Autosave jawaban siswa & scoring engine<br>- Mendukung siswa ber-NIS maupun null-NIS | - Bank soal ujian aktif belum dipublikasikan oleh guru SMK Otomindo | **Akun Siswa Belum Dibuat** |
| **3. Assignment (Tugas)** | **READY** | - Fitur pengumpulan file/teks di `/tugas-siswa`<br>- Validasi batas waktu & terlambat<br>- Tracking status: Belum / Sudah Dikumpulkan | - Guru belum membuat penugasan kelas riil | **Akun Siswa Belum Dibuat** |
| **4. Attendance (Presensi)** | **READY** | - Stat card kehadiran di `StudentDashboard`<br>- Tab riwayat presensi di portal siswa<br>- Sinkronisasi real-time dengan sesi KBM guru | - Menunggu sesi KBM harian dibuka oleh guru | **Akun Siswa Belum Dibuat** |
| **5. Gradebook (e-Rapor)** | **READY** | - Route `/rapor-siswa`<br>- `StudentReportCardView` Kurikulum Merdeka<br>- Null-safe guard pada nama siswa & NIS<br>- Missing Grade != Zero Grade invariant | - Nilai akhir rapor semester berjalan belum terbit | **Akun Siswa Belum Dibuat** |

---

## 3. Detail Kesiapan Alur Kerja Siswa

### 3.1. Alur CBT (Computer-Based Test)
- **Akses Siswa**: Siswa login -> klik menu **"CBT Ujian"** di sidebar.
- **Daftar Ujian Rombel**: Sistem mengambil ujian CBT yang dipublikasikan oleh guru pengajar yang mengajar rombel penempatan aktif siswa (`penempatan_rombel.rombel_id`).
- **Verifikasi Token**: Jika ujian mewajibkan token, siswa memasukkan token pengawas ruang.
- **Pengerjaan Soal**: Menampilkan soal berurutan (atau acak jika diset guru), navigasi soal dengan palet nomor soal, indikator terjawab/ragu-ragu, dan autosave per butir soal.
- **Proteksi Integritas**: Mendeteksi upaya pindah tab (*blur event*), fullscreen breach, dan mencatat log kejadian integritas.
- **Submit & Scoring**: Begitu waktu habis atau siswa menekan submit, jawaban dinilai otomatis oleh server untuk soal pilihan ganda, dan skor langsung tersimpan di `HasilUjianCbt`.

### 3.2. Alur LMS & Penugasan
- **Akses Siswa**: Siswa login -> klik menu **"Materi & Tugas"** (`/tugas-siswa`).
- **Tab Materi**: Menampilkan materi pembelajaran yang dipublikasikan oleh guru di rombel siswa, lengkap dengan deskripsi, badge mata pelajaran, dan link unduhan berkas lampiran.
- **Tab Tugas**: Menampilkan daftar tugas dengan status pengerjaan yang jelas (Belum Dikumpulkan, Menunggu Penilaian, Selesai). Siswa dapat mengunggah file jawaban atau mengetik esai langsung di portal.

### 3.3. Alur Rekapitulasi Presensi Pribadi
- **Dashboard Ringkasan**: Siswa dapat melihat persentase kehadiran, jumlah hadir, izin, sakit, dan alpha secara transparan pada widget kartu statistik beranimasi (*CountUp Motion*).
- **Riwayat Pertemuan**: Tab Presensi di portal tugas menampilkan tanggal, nama guru, mata pelajaran, dan status kehadiran pada setiap sesi pembelajaran.

### 3.4. Alur Transkrip & e-Rapor Siswa
- **Akses Siswa**: Siswa login -> klik menu **"Buku Nilai & Rapor"** (`/rapor-siswa`).
- **Transkrip Asesmen**: Menampilkan daftar capaian asesmen formatif dan sumatif yang telah dipublikasikan guru beserta KKTP.
- **Lembaran Rapor**: Memuat header resmi sekolah SMK OTOMINDO, data siswa (nama, rombel, NIS/NISN aman terhadap null), tabel nilai capaian tertinggi/terendah, catatan wali kelas, dan rekap ketidakhadiran.

---

## 4. Evaluasi Kesiapan Antarmuka (Academic Glass UI)

Seluruh antarmuka siswa telah lolos visual audit:
1. **Academic Glass UI Tokens**: Menggunakan palet konsisten slate-900 typography, sapphire-600 primary accents, dan glassmorphism border (`border-slate-200/80 shadow-2xs`).
2. **Mobile Cockpit Readiness**:
   - Navigasi responsif via `MobileBottomNav` untuk perangkat ponsel siswa.
   - Layout grid adaptif (1 kolom di mobile, 2 kolom di tablet, 4 kolom di desktop).
3. **Null-Safe Hardening**:
   - Badge NIS di dashboard siswa terbungkus kondisi `{profile?.nis && ...}` sehingga siswa kelas XI & XII yang belum ber-NIS tidak mengalami glitch visual.
   - Tabel rapor menangani `nis: null` dengan menampilkan tanda strip `-` elegan tanpa merusak tata letak cetak.

---

## 5. Kesimpulan & Rekomendasi Eksekusi
Infrastruktur modul siswa telah berada pada tingkat kematangan penuh (*mature and resilient*). Sistem siap melangkah ke tahap pembuatan akun siswa massal (**STAGE 11.9 — STUDENT ACCOUNT GENERATION EXECUTION**) begitu rencana strategi pada STAGE 11.8C disetujui.
