# RUANG PINTAR SAAS — STAGE UX-02 MASTER REDESIGN
# IMPLEMENTATION PLAN & WORKFLOW ARCHITECTURE SPECIFICATION
## Transformasi dari Aplikasi Administrasi Sekolah Menjadi Teacher Daily Workspace

| Metadata | Nilai |
| :--- | :--- |
| **Stage** | STAGE UX-02 — MASTER WORKSPACE REDESIGN |
| **Status** | `ACTIVE (BUILD PHASE — P0 IMPLEMENTATION)` |
| **Active Spec** | [docs/specs/active/stage-ux02-master-redesign.md](file:///c:/laragon/www/Ruang-Pintar/docs/specs/active/stage-ux02-master-redesign.md) |
| **Product Triad** | LMS (Pilar 1) + CBT (Pilar 2) + SIAKAD (Pilar 3) |
| **Mandat Produk** | Stop thinking like a developer. Start organizing based on teacher daily workflow. |
| **Audit Baseline** | STAGE 20 Teacher Workflow Reality Audit (Verdict: PASS WITH IMPROVEMENT) |

---

## 1. Audit Forensik Halaman Guru Saat Ini (Current Workspace Audit)

Berikut adalah hasil audit menyeluruh terhadap 8 halaman guru di repositori saat ini:

| Halaman & Rute | Duplicate Navigation / Action | Workflow Interruptions & Unnecessary Clicks | Empty State Issue | Dead Page / Friction |
| :--- | :--- | :--- | :--- | :--- |
| **Dashboard** (`/dashboard`) | Mengulang grafik dan donut gauges yang pasif. Tombol aksi tersebar di sub-komponen tanpa prioritas jelas. | Guru tidak dapat langsung tahu: *"Kelas apa yang sedang saya ajar detik ini?"*. Tidak ada Live Session Banner berukuran besar dengan tombol `[MULAI MENGAJAR]`. | Menampilkan kartu kosong atau teks "Tidak ada jadwal" tanpa CTA pemicu aksi. | Beban kognitif tinggi: guru dihadapkan pada 5 kartu metrik, 1 bar chart, dan 4 gauge. |
| **Ruang Kelas Saya** (`/kelas-saya`) | Menampilkan daftar kartu kelas. Cukup baik, tetapi tidak mengindikasikan kelas mana yang aktif *hari ini*. | Guru harus mengeklik kartu kelas, lalu mencari-cari tab mana yang relevan di antara 9 tab. | Kartu kelas tidak menampilkan progres pertemuan atau tugas tertunda. | Kurang panduan: tidak menonjolkan kelas jam pertama hari ini. |
| **Workspace Kelas** (`/kelas-saya/[id]`) | **9 TAB TERPISAH:** Ringkasan, Jadwal, BAB_TP, Materi, Jurnal, Tugas, Presensi, Penilaian, CBT. Tumpang tindih dengan menu global. | Guru harus berpindah 4 tab berbeda dalam satu jam pelajaran: buka materi (tab 4) -> beri tugas (tab 6) -> presensi (tab 7) -> jurnal (tab 5). | Tab Materi, Tugas, dan Jurnal menampilkan teks polos *"Belum Ada Data"* tanpa CTA langsung. | **FRUSTASI UTAMA:** Guru terpaksa berpikir dalam struktur entitas database, bukan alur mengajar. |
| **Jadwal Mengajar** (`/jadwal-saya`) | Duplikasi 100% dengan Tab Jadwal di ruang kelas dan jadwal mingguan sekolah. | Rute mandiri yang memakan tempat di sidebar. Guru jarang membutuhkan jadwal mingguan statis saat mengajar harian. | Menampilkan tabel kosong jika kurikulum belum menerbitkan jadwal. | Redundan di sidebar utama. |
| **Log Sesi KBM** (`/sesi-pembelajaran`) | Duplikasi dengan jurnal pembelajaran di kelas. Pengisian log sesi KBM terpisah dari ruang kelas. | Guru harus keluar dari kelas, membuka menu Sesi KBM, memilih rombel dan tanggal, baru mengisi jurnal. | Menampilkan daftar sesi kosong jika belum digenerate. | Menginterupsi alur mengajar guru. |
| **Rekap Presensi** (`/presensi-kelas`) | Duplikasi dengan Tab Presensi di dalam kelas. | Guru diminta memilih rombel dan tanggal di halaman terpisah, padahal presensi selalu dilakukan di ruang kelas. | Tabel rekapitulasi membingungkan jika sesi belum dimulai. | Redundan di sidebar utama. |
| **Buku Nilai & Rapor** (`/penilaian`) | Sangat kompleks. Menampilkan akronim Kurikulum Merdeka (TP, LM, SAS, R.For, R.Sum) untuk input nilai sederhana. | Guru baru merasa takut salah saat ingin memasukkan nilai tugas harian sederhana. | Tabel matriks kosong jika TP belum didefinisikan. | Membutuhkan pemisahan Mode Sederhana vs Mode Detail. |
| **CBT Ujian Online** (`/cbt-ujian`) | Pilar yang sangat kuat, tetapi integrasi tarik nilai ke buku nilai kelas belum 1-klik instan. | Guru harus menyalin nilai manual dari hasil CBT ke buku nilai jika tidak menggunakan sinkronisasi. | Kartu ujian kosong jika belum ada paket soal terbit. | Perlu dipertahankan sebagai **Pilar Utama (Pilar 2)**. |

---

## 2. Final Teacher Workspace Architecture

### 2.1. Tiga Pilar Utama Produk (Product Triad)
```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                         RUANG PINTAR SAAS WORKSPACE                         │
├──────────────────────┬──────────────────────┬───────────────────────────────┤
│ PILAR 1: LMS         │ PILAR 2: CBT         │ PILAR 3: SIAKAD               │
│ Learning Management  │ Computer Based Test  │ Sistem Informasi Akademik     │
├──────────────────────┼──────────────────────┼───────────────────────────────┤
│ • Modul Ajar         │ • Bank Soal Kelas    │ • Presensi Sesi & Harian      │
│ • Materi Pembelajaran│ • Paket Ujian Online │ • Buku Nilai & Ledger         │
│ • Penugasan Siswa    │ • Live Exam Monitor  │ • Rekapitulasi Kehadiran      │
│ • Jurnal KBM Guru    │ • Token & Anti-Cheat │ • Validasi Rapor Digital      │
│ • Aktivitas Belajar  │ • Sinkronisasi Nilai │ • Riwayat Status Siswa        │
└──────────────────────┴──────────────────────┴───────────────────────────────┘
```

### 2.2. Struktur Navigasi Sidebar Baru (Eliminasi Redundansi)

```text
[SEBELUM: 11 MENU DI SIDEBAR GURU]
├── Dashboard
├── Kelas Saya
├── Jadwal Mengajar       <-- Redundan
├── Log Sesi KBM          <-- Redundan
├── Kalender Akademik
├── Rekap Presensi        <-- Redundan
├── Buku Nilai & Rapor
├── CBT Ujian Online
├── Wali Kelas            <-- Kontekstual
├── Portal Pimpinan       <-- Kontekstual
└── Asisten AI Guru       <-- Redundan sebagai menu utama

                     ▼ DISEDERHANAKAN MENJADI ▼

[SESUDAH: 5 MENU UTAMA KERJA GURU + 2 MENU KONTEKSTUAL]
Sidebar Guru:
├── 1. Beranda Mengajar (Command Center)  (/dashboard)
│      └── Sesi Hari Ini, Timeline Mengajar, Attention Queue (Tugas/Presensi/Jurnal)
├── 2. Ruang Kelas Saya                   (/kelas-saya)
│      └── Pintu masuk ke seluruh kelas yang diampu (LMS + SIAKAD + CBT Kelas)
├── 3. CBT & Bank Soal                    (/cbt-ujian)
│      └── Pilar evaluasi mandiri: Bank Soal, Pembuatan Ujian, Live Exam Monitor
├── 4. Buku Nilai & Ledger                (/penilaian)
│      └── Rekapitulasi nilai akhir semester, leger kelas, dan validasi e-rapor
└── 5. Kalender Akademik                  (/kalender-akademik)
       └── Agenda sekolah, hari libur, jadwal ujian semester

Menu Kontekstual (Hanya muncul jika guru memiliki SK penugasan resmi):
├── [*] Cockpit Wali Kelas                (/wali-kelas)  -> Khusus Guru Wali Kelas
└── [*] Portal Kepemimpinan               (/pimpinan)    -> Khusus Kepala Sekolah / Waka
```

---

## 3. Teacher Command Center (Dashboard Baru)

Dashboard guru ditransformasikan menjadi **Operational Command Center** dengan 3 seksi utama yang berorientasi tindakan:

```text
+--------------------------------------------------------------------------------------------------+
| RUANG PINTAR SAAS                         [SMK OTOMINDO]  [2026/2027 GANJIL]  [Natalia, S.Kom v] |
+--------------------------------------------------------------------------------------------------+
|                                                                                                  |
| SEKSI 1: LIVE SESSION BANNER (SEKARANG BERJALAN)                                                 |
| +----------------------------------------------------------------------------------------------+ |
| | [*] SESI SEDANG BERLANGSUNG DETIK INI (08.00 - 09.30 WIB)                                   | |
| |                                                                                              | |
| | KELAS: XII RPL   •   MAPEL: Pemrograman Web   •   RUANG: Lab Komputer 2                      | |
| | Topik Silabus: Bab 3 - Membuat API Controller & Routing Express.js                           | |
| |                                                                                              | |
| | Status Alur:  [Presensi: BELUM]  |  [Materi: SIAP]  |  [Tugas: AKTIF]  |  [Jurnal: BELUM]    | |
| |                                                                                              | |
| | [ >>> MULAI MENGAJAR SEKARANG <<< ] (Primary CTA)            [Buka Modul]  [Salin Kode Siswa]| |
| +----------------------------------------------------------------------------------------------+ |
|                                                                                                  |
| SEKSI 2: TODAY TEACHING TIMELINE (KRONOLOGIS HARI INI)                                           |
| +-----------------------------+  +-----------------------------+  +----------------------------+ |
| | 08:00 - 09:30 (Jam Ke 1-3)  |  | 09:45 - 11:15 (Jam Ke 4-5)  |  | 13:00 - 14:30 (Jam Ke 7-8) | |
| | XII RPL — Pemrograman Web   |  | XI RPL — Basis Data SQL     |  | X RPL — Dasar Pemrograman  | |
| | Status: [SEDANG BERLANGSUNG]|  | Status: [MENUNGGU WAKTU]    |  | Status: [BELUM DIMULAI]    | |
| +-----------------------------+  +-----------------------------+  +----------------------------+ |
|                                                                                                  |
| SEKSI 3: ATTENTION QUEUE (KOTAK TINDAKAN TERTUNDA - 1 KLIK RESOLUSI)                             |
| +----------------------------------------------------------------------------------------------+ |
| | [!] 1 Presensi Sesi Belum Ditutup:                                                           | |
| |     • XI RPL - Pertemuan 3 (Kemarin) .................................... [Tutup Presensi]   | |
| | [!] 12 Tugas Siswa Menunggu Penilaian:                                                       | |
| |     • Tugas 2: Pembuatan ERD Toko Online (Batas: Kemarin) ............... [Periksa & Nilai]  | |
| | [!] 1 Jurnal KBM Belum Dibuat:                                                               | |
| |     • X RPL - Pertemuan 4 (Senin) ....................................... [Tulis Jurnal]     | |
| | [i] 1 Ujian CBT Dijadwalkan Besok:                                                           | |
| |     • Kuis Harian Bab 2: SQL DDL & DML (Token: RP-882) .................. [Cek Kesiapan]     | |
| +----------------------------------------------------------------------------------------------+ |
|                                                                                                  |
| SEKSI 4: KELAS SAYA SEMESTER INI                                                                 |
| [XII RPL • 15 Siswa • 4/14 Sesi]   [XI RPL • 28 Siswa • 3/14 Sesi]   [X RPL • 21 Siswa • 5/14]  |
+--------------------------------------------------------------------------------------------------+
```

---

## 4. Class Workspace Redesign (5 Tab Berbasis Pilar)

Halaman `/kelas-saya/[id]` disederhanakan dari **9 tab menjadi 5 tab berfokus pada alur kerja nyata**:

```text
[TAB NAVIGASI RUANG KELAS]
┌───────────────────┬───────────────────┬───────────────────┬───────────────────┬───────────────────┐
│ 1. COCKPIT KELAS  │ 2. PEMBELAJARAN   │ 3. PRESENSI       │ 4. PENILAIAN      │ 5. CBT UJIAN      │
│    (Alur Hari Ini)│    (LMS & Tugas)  │    (Kehadiran)    │    (Buku Nilai)   │    (Online Exam)  │
└───────────────────┴───────────────────┴───────────────────┴───────────────────┴───────────────────┘
```

### Tab 1: Cockpit Kelas (Default Tab)
- Membuka ruang kerja aktif guru hari ini:
  - **Teaching Checklist (0% s/d 100%):**
    - `[✓] Sesi Dibuka (08.00 WIB)`
    - `[ ] 1. Catat Presensi Siswa` → *Tombol Cepat [Ambil Presensi]*
    - `[ ] 2. Sajikan Modul Ajar` → *Tombol Cepat [Tampilkan Materi]*
    - `[ ] 3. Aktifkan Tugas Latihan Siswa` → *Tombol Cepat [Terbitkan Tugas]*
    - `[ ] 4. Tulis Jurnal Pertemuan KBM` → *Tombol Cepat [Isi Jurnal]*
    - `[ ] 5. Selesaikan & Kunci Sesi` → *Tombol Cepat [Tutup Sesi]*
  - **Class Attention Alerts:** Siswa yang tidak hadir berturut-turut atau tugas yang belum dinilai pada rombel ini.

### Tab 2: Pembelajaran (LMS Terpadu)
- Guru berpikir dalam **Pelajaran / Bab**, bukan entitas terpisah.
- Tampilan berbasis Bab:
  - **Bab 1: Dasar Pemrograman Web**
    - 📄 Modul 1.1: Pengenalan HTML & CSS
    - 📄 Modul 1.2: Layouting Flexbox & Grid
    - 📝 Tugas Praktik 1: Membuat Halaman Profil (15/15 Siswa Mengumpulkan)
  - **Bab 2: JavaScript & DOM Manipulation**
    - 📄 Modul 2.1: Event Handling
    - 📝 Tugas Praktik 2: Kalkulator Interaktif (12/15 Siswa Mengumpulkan)

### Tab 3: Presensi (Kehadiran Siswa)
- Presensi Kilat (<15 Detik) untuk pertemuan berjalan.
- Tabel kalender rekapitulasi kehadiran per siswa untuk seluruh semester (H/S/I/A/T).

### Tab 4: Penilaian (Buku Nilai Dua Mode)
- **Toggle Instan:** `[ Mode Guru Harian (Simple) | Mode Detail Kurikulum ]`.
- **Mode Guru Harian:** No, Nama, Kehadiran %, Rata-rata Tugas, Nilai CBT, Sikap, Nilai Akhir Sementara.
- **Mode Detail:** Matriks lengkap TP, Lingkup Materi, Sumatif, SAS, dan Capaian Rapor.

### Tab 5: CBT Ujian Online (Pilar CBT Mandiri)
- Manajemen paket soal yang ditugaskan ke kelas ini.
- Live Exam Monitor (memantau siswa yang sedang ujian, durasi tersisa, indikator kecurangan).
- Tombol 1-klik: **`[ Tarik Hasil Nilai CBT ke Buku Nilai ]`**.

---

## 5. Attendance Workflow Redesign (< 15 Detik & Aman Audit)

```text
[ALUR PRESENSI CEPAT AMAN AUDIT]

Langkah 1: Guru klik tombol [Buka Presensi] pada sesi pertemuan aktif.
           Status awal: Belum ditandai.

Langkah 2: Guru klik 1 tombol preset:
           [ ✓ TANDAI SEMUA HADIR ]
           -> 100% siswa instan menjadi HADIR (Badge Hijau).

Langkah 3: Guru mengetuk (1-tap) nama siswa yang absen (jika ada):
           Contoh: Ketuk nama "Ardiansyah" -> Pilih [Sakit].
           Kartu Ardiansyah berubah menjadi warna kuning (Sakit).

Langkah 4: Guru klik:
           [ >>> SIMPAN & KUNCI PRESENSI <<< ]
           -> Data presensi tersimpan ke basis data.
           -> Log audit legal mencatat aksi eksplisit guru.
           -> Waktu total: 8 hingga 14 detik!
```

---

## 6. Empty State Action Policy

Setiap tampilan yang belum memiliki data **DILARANG** menampilkan teks pasif tanpa solusi. Seluruh empty state diganti menjadi **Action Card**:

| Modul | Teks Lama (Mati) | Desain Baru (Actionable CTA) |
| :--- | :--- | :--- |
| **Materi Pembelajaran** | "Belum ada materi pembelajaran" | Ikon Buku + *"Siapkan modul ajar pertama untuk kelas ini."* + **`[+ Terbitkan Materi Pertama]`** |
| **Tugas Siswa** | "Belum ada tugas aktif" | Ikon Tugas + *"Uji pemahaman siswa dengan latihan praktik."* + **`[+ Buat Tugas Pertama]`** |
| **Jurnal KBM** | "Belum ada riwayat jurnal" | Ikon Jurnal + *"Catat ringkasan topik yang telah diajarkan hari ini."* + **`[+ Tulis Jurnal Sesi]`** |
| **CBT Ujian** | "Belum ada ujian CBT" | Ikon Shield + *"Laksanakan ulangan harian online dengan bank soal."* + **`[+ Buat Ujian CBT Baru]`** |
| **Buku Nilai** | "Data penilaian belum tersedia" | Ikon Trophy + *"Mulai input nilai tugas atau tarik dari hasil ujian CBT."* + **`[+ Input Nilai Tugas]`** |

---

## 7. Wireframe Teks Versi Academic Glass UI

### 7.1. Wireframe Dashboard (Teacher Command Center)
```text
+--------------------------------------------------------------------------------------------------+
| RUANG PINTAR SAAS                      SMK OTOMINDO  |  TA 2026/2027 GANJIL   [Natalia, S.Kom v] |
+--------------------------------------------------------------------------------------------------+
| [ Beranda ]  [ Ruang Kelas ]  [ CBT & Bank Soal ]  [ Buku Nilai ]  [ Kalender ]  [Wali Kelas]    |
+--------------------------------------------------------------------------------------------------+
|                                                                                                  |
| LIVE SESSION BANNER (SEKSI 1)                                                                    |
| +----------------------------------------------------------------------------------------------+ |
| | [!] SESI SEDANG BERLANGSUNG SEKARANG (08.00 - 09.30 WIB)                                     | |
| | XII RPL  •  Pemrograman Web  •  Lab Komputer 2                                               | |
| | Bab 3: Pembuatan REST API Controller                                                         | |
| |                                                                                              | |
| | Alur Sesi: [ Presensi: BELUM ] [ Materi: SIAP ] [ Tugas: AKTIF ] [ Jurnal: BELUM ]           | |
| |                                                                                              | |
| | [ >>> MULAI MENGAJAR SEKARANG <<< ]                [Buka Modul Ajar]   [Salin Kode Siswa]    | |
| +----------------------------------------------------------------------------------------------+ |
|                                                                                                  |
| TIMELINE MENGAJAR HARI INI (SEKSI 2)                                                             |
| +-----------------------------+  +-----------------------------+  +----------------------------+ |
| | 08:00 - 09:30               |  | 09:45 - 11:15               |  | 13:00 - 14:30              | |
| | XII RPL                     |  | XI RPL                      |  | X RPL                      | |
| | Pemrograman Web             |  | Basis Data SQL              |  | Dasar Pemrograman          | |
| | Status: [SEDANG BERLANGSUNG]|  | Status: [MENUNGGU WAKTU]    |  | Status: [BELUM DIMULAI]    | |
| +-----------------------------+  +-----------------------------+  +----------------------------+ |
|                                                                                                  |
| KOTAK PERHATIAN GURU (SEKSI 3)                                                                   |
| +----------------------------------------------------------------------------------------------+ |
| | [!] 1 Presensi Sesi belum ditutup: XI RPL (Selasa kemarin) ............... [Tutup Presensi]  | |
| | [!] 12 Tugas Siswa menunggu penilaian: Tugas 2 ERD Database .............. [Periksa & Nilai] | |
| | [i] 1 Ujian CBT dijadwalkan besok: Kuis Bab 2 Basis Data ................. [Cek Kesiapan]    | |
| +----------------------------------------------------------------------------------------------+ |
|                                                                                                  |
| KELAS YANG DIAMPU SEMESTER INI                                                                   |
| [XII RPL • 15 Siswa • 4/14 Sesi]   [XI RPL • 28 Siswa • 3/14 Sesi]   [X RPL • 21 Siswa • 5/14]  |
+--------------------------------------------------------------------------------------------------+
```

### 7.2. Wireframe Ruang Kelas Guru (Cockpit Kelas)
```text
+--------------------------------------------------------------------------------------------------+
| <- Kembali ke Daftar Kelas                                                                       |
| RUANG KELAS: XII RPL — Pemrograman Web (Lab Komputer 2)                                          |
| Kode Kelas: RP-7782  [Salin Kode]                                     Status: Sesi Hari Ini Aktif|
+--------------------------------------------------------------------------------------------------+
| [ COCKPIT KELAS ]  [ PEMBELAJARAN (LMS) ]  [ PRESENSI ]  [ PENILAIAN ]  [ CBT UJIAN ONLINE ]     |
+--------------------------------------------------------------------------------------------------+
|                                                                                                  |
| CHECKLIST WORKFLOW PERTEMUAN 5 (HARI INI)                                Progress: [ 40% ]       |
| +----------------------------------------------------------------------------------------------+ |
| | [✓] Langkah 1: Buka Sesi Kelas (08.00 WIB) ........................................ SELESAI  | |
| | [✓] Langkah 2: Catat Presensi Siswa (14 Hadir, 1 Sakit) .......................... SELESAI  | |
| | [ ] Langkah 3: Sajikan Modul Ajar Hari Ini .................. [ Tampilkan Materi di Layar ]  | |
| | [ ] Langkah 4: Aktifkan Tugas Praktik Siswa ................. [ Terbitkan Tugas Latihan ]    | |
| | [ ] Langkah 5: Tulis Catatan KBM & Jurnal Guru .............. [ Tulis Jurnal Sesi ]         | |
| | [ ] Langkah 6: Kunci & Selesaikan Pertemuan ................. [ Tutup Kelas Selesai ]        | |
| +----------------------------------------------------------------------------------------------+ |
|                                                                                                  |
| RINGKASAN CEPAT KELAS HARI INI                                                                   |
| • Kehadiran: 14 dari 15 Siswa (93%) — 1 Sakit: Ardiansyah                                        |
| • Tugas Berjalan: Praktik REST API Controller (Batas Pengumpulan: 14.00 WIB)                     |
+--------------------------------------------------------------------------------------------------+
```

### 7.3. Wireframe Presensi Kilat (< 15 Detik)
```text
+--------------------------------------------------------------------------------------------------+
| PRESENSI KELAS — PERTEMUAN 5 (XII RPL)                                             [ X Tutup ]   |
| Waktu: Rabu, 24 Sep 2026 | Jam Ke 1-3                                                            |
+--------------------------------------------------------------------------------------------------+
|                                                                                                  |
| [ ✓ TANDAI SEMUA HADIR (1 KLIK) ]                  Ringkasan: 14 Hadir, 1 Sakit, 0 Izin, 0 Alpha |
|                                                                                                  |
| Cukup ketuk nama siswa jika berhalangan hadir:                                                   |
| +-------------------------------+   +-------------------------------+                            |
| | A. Rizki Fadilah              |   | Abdillah Darma Bhakti         |                            |
| | NIS: 261001   [ HADIR (v) ]   |   | NIS: 261002   [ HADIR (v) ]   |                            |
| +-------------------------------+   +-------------------------------+                            |
| | Ardiansyah                    |   | Arya Fayyaz Reyhan W.         |                            |
| | NIS: 261003   [ SAKIT (✎) ]   |   | NIS: 261004   [ HADIR (v) ]   |                            |
| +-------------------------------+   +-------------------------------+                            |
| ... (15 Siswa)                                                                                   |
|                                                                                                  |
| [ Batal ]                                           [ >>> SIMPAN & KUNCI PRESENSI <<< ]          |
+--------------------------------------------------------------------------------------------------+
```

---

## 8. Implementation Priority Matrix (P0 – P3) & Verification Roadmap

Rencana eksekusi implementasi dibagi menjadi 4 paket kerja bertahap:

```text
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                PRIORITAS IMPLEMENTASI WORKFLOW GURU                             │
├───────────┬─────────────────────────────────────────────────────────────────────────────────────┤
│ Level     │ Rincian Pekerjaan & Berkas Sasaran                                                  │
├───────────┼─────────────────────────────────────────────────────────────────────────────────────┤
│ **P0**    │ **Teacher Command Center Dashboard (/dashboard)**                                   │
│ (Kritis)  │ • Berkas: `src/shared/components/dashboard/role-views/teacher-dashboard.tsx`        │
│           │ • Live Session Banner dengan CTA berukuran besar `[MULAI MENGAJAR SEKARANG]`.       │
│           │ • Today Teaching Timeline berurutan secara kronologis.                              │
│           │ • Attention Queue interaktif (1-klik tutup presensi, nilai tugas, tulis jurnal).    │
├───────────┼─────────────────────────────────────────────────────────────────────────────────────┤
│ **P1**    │ **Presensi Kilat Aman Audit (< 15 Detik)**                                          │
│ (Tinggi)  │ • Berkas: `src/modules/attendance/presentation/session-attendance-modal.tsx`        │
│           │ • Tombol preset instan `[✓ Tandai Semua Hadir]`.                                    │
│           │ • Quick Tap untuk memilih Sakit/Izin/Alpha/Terlambat pada siswa yang absen.         │
│           │ • Tombol konfirmasi `[Simpan & Kunci Presensi]` dengan audit logger server-side.    │
├───────────┼─────────────────────────────────────────────────────────────────────────────────────┤
│ **P1**    │ **Restrukturisasi 5 Tab Ruang Kelas (/kelas-saya/[id])**                            │
│ (Tinggi)  │ • Berkas: `src/modules/learning/presentation/class-workspace-view.tsx`              │
│           │ • Konsolidasi 9 tab menjadi 5 tab: Cockpit, Pembelajaran, Presensi, Penilaian, CBT. │
│           │ • Interactive Teaching Checklist (0% s/d 100%) pada Cockpit Kelas.                  │
│           │ • Seluruh empty state diganti dengan Action Card (CTA).                             │
├───────────┼─────────────────────────────────────────────────────────────────────────────────────┤
│ **P2**    │ **Buku Nilai Dua Mode (Mode Sederhana vs Mode Detail Kurikulum)**                   │
│ (Sedang)  │ • Berkas: `src/modules/assessment/presentation/unified-academic-ledger-table.tsx`   │
│           │ • Toggle instan Mode Guru Harian (Tugas + Kuis CBT + Nilai Akhir) vs Detail TP/LM.  │
│           │ • 1-klik aksi "Tarik Nilai dari CBT" langsung ke kolom penilaian.                   │
├───────────┼─────────────────────────────────────────────────────────────────────────────────────┤
│ **P3**    │ **Penyederhanaan Navigasi Sidebar Shell**                                           │
│ (Polesan) │ • Berkas: `src/shared/components/shell/navigation-config.ts`                        │
│           │ • Konsolidasi menu sidebar guru menjadi 5 menu utama + 2 menu kontekstual.          │
│           │ • Verifikasi Quality Gates: `typecheck`, `lint`, `format`, `test`, `build`.         │
└───────────┴─────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 9. Verification & Quality Gates Baseline

Setelah rencana arsitektur ini disetujui, setiap implementasi kode wajib mematuhi Definition of Done:
1. `npm run typecheck` (Wajib 0 error, TypeScript 5.8)
2. `npm run lint` (Wajib 0 error, ESLint 9)
3. `npm run format:check` (100% clean, Prettier)
4. `npm run test` (Seluruh test Vitest lolos 100%)
5. `npm run build` (Next.js 16.3.3 Turbopack lolos 100%)
6. Usability Test Checklist: Guru dapat menyelesaikan alur mengajar tanpa membaca manual dokumentasi.
