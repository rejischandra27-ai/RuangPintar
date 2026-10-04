# RUANG PINTAR SAAS — STAGE UX-02 MASTER SPECIFICATION
# TEACHER WORKSPACE & COMMAND CENTER SPECIFICATION

| Metadata | Nilai |
| :--- | :--- |
| **Feature Slug** | `stage-ux02-master-redesign` |
| **Tahap Lifecycle** | `BUILD` (Implementation & Verification) |
| **Dasar Audit** | STAGE 20 Teacher Workflow Reality Audit & STAGE UX-02.1/02.2 |
| **Pasangan Dokumen** | [docs/plans/active/stage-ux02-master-redesign-plan.md](file:///c:/laragon/www/Ruang-Pintar/docs/plans/active/stage-ux02-master-redesign-plan.md) |
| **Status** | `ACTIVE` |

---

## 1. Latar Belakang & Masalah Bisnis

Berdasarkan audit operasional di lapangan (SMK Otomindo, 700 siswa, 22 rombel, 75 guru):
1. **Fragmentasi Modul:** Guru harus berpindah 4-8 tab/halaman berbeda hanya untuk menjalankan 1 jam pelajaran (buka materi -> buka tugas -> presensi -> jurnal KBM).
2. **Ketiadaan Awareness Sesi Berjalan:** Dashboard guru saat ini menampilkan grafik pasif dan donut gauges tanpa Live Session Banner yang memberitahu kelas apa yang sedang berlangsung detik ini.
3. **Waktu Presensi Lambat:** Presensi tradisional memakan 5-7 menit panggil nama. Dibutuhkan Presensi Kilat (< 15 detik) dengan preset "Tandai Semua Hadir" dan audit trail legal.
4. **Resiko Kebocoran Data (Focus Mode):** Saat guru menghubungkan laptop ke proyektor kelas, data privat siswa (alpa/sakit, nilai individu) rentan terlihat seluruh kelas.

---

## 2. Kriteria Penerimaan & Perilaku Sistem (Behavioral Specifications)

### 2.1. P0 — Teacher Command Center Dashboard (`/dashboard`)
1. **Live Session Banner (Seksi 1):**
   - Mendeteksi sesi KBM hari ini yang sedang berlangsung sesuai waktu lokal server.
   - Menampilkan Nama Rombel, Mata Pelajaran, Lokasi Ruangan, dan Topik Silabus.
   - Status 4 Pilar Sesi: Presensi (`BELUM/SELESAI`), Materi (`SIAP`), Tugas (`AKTIF`), Jurnal (`BELUM/SELESAI`).
   - CTA Primer Berukuran Besar: `[ >>> MULAI MENGAJAR SEKARANG <<< ]` yang langsung membuka workspace kelas sesi tersebut.
   - Secondary CTA: `[Buka Modul Ajar]` dan `[Salin Kode Siswa]`.
   - Jika tidak ada sesi berjalan: menampilkan sesi berikutnya hari ini atau pesan informatif jika KBM hari ini tuntas/libur.

2. **Today Teaching Timeline (Seksi 2):**
   - Menampilkan seluruh sesi KBM hari ini secara kronologis dari jam pertama hingga akhir.
   - Setiap kartu menampilkan rentang jam, nama rombel, mapel, badge status (`SEDANG BERLANGSUNG`, `MENGUJI WAKTU`, `SELESAI`).
   - Shortcut 1-klik untuk "Presensi Cepat" dan "Masuk Kelas".

3. **Interactive Attention Queue (Seksi 3):**
   - Mengumpulkan item tertunda yang membutuhkan tindakan guru:
     - Presensi sesi yang belum ditutup / dikunci.
     - Tugas siswa yang menunggu penilaian / koreksi.
     - Jurnal KBM yang belum diisi.
     - Jadwal ujian CBT terdekat.
   - Tombol 1-klik resolusi langsung menuju konteks aksi tanpa navigasi manual.

### 2.2. P1 — Presensi Kilat Aman Audit (< 15 Detik)
1. Preset 1-klik `[✓ Tandai Semua Hadir]` menandai 100% siswa menjadi HADIR secara instan.
2. Quick Exception Tap: Guru hanya mengetuk nama siswa yang tidak hadir untuk memilih Sakit, Izin, atau Alpa.
3. Filter Cepat: Filter siswa "Hanya Absen" untuk memverifikasi bangku kosong pada rombel besar (> 35 siswa).
4. Auto-save lokal / optimistic state dengan konfirmasi `[Simpan & Kunci Presensi]` yang mencatat audit log server-side.

### 2.3. P1 — Restrukturisasi 5 Tab Ruang Kelas (`/kelas-saya/[id]`)
1. Mengonsolidasi 9 tab lama menjadi 5 tab berbasis alur nyata:
   - **Tab 1: Cockpit Kelas** (Checklist pertemuan hari ini 0%-100%, status 4 pilar).
   - **Tab 2: Pembelajaran** (LMS terpadu berbasis Bab/Topik: Modul Ajar + Tugas Praktik).
   - **Tab 3: Presensi** (Presensi kilat harian + rekapitulasi semester).
   - **Tab 4: Penilaian** (Buku nilai dua mode: Harian vs Kurikulum).
   - **Tab 5: CBT Ujian** (Bank soal, pelaksanaan ujian, live monitor, dan tarik nilai 1-klik).
2. Seluruh empty state pasif ("Belum ada data") diganti dengan Action Card interaktif.

### 2.4. P2 — Buku Nilai Dua Mode (`/penilaian` & Tab Penilaian)
1. Toggle instan: `[ Mode Guru Harian (Simple) | Mode Detail Kurikulum ]`.
2. Mode Sederhana: No, Nama, Kehadiran %, Rata-rata Tugas, Nilai CBT, Nilai Akhir Sementara.
3. Tombol 1-klik "Tarik Nilai dari CBT" langsung memperbarui ledger kelas.

### 2.5. P3 — Penyederhanaan Navigasi Sidebar Guru
1. Merampingkan 11 menu sidebar menjadi 5 menu utama:
   - Beranda Mengajar (`/dashboard`)
   - Ruang Kelas Saya (`/kelas-saya`)
   - CBT & Bank Soal (`/cbt-ujian`)
   - Buku Nilai & Ledger (`/penilaian`)
   - Kalender Akademik (`/kalender-akademik`)
2. Menu kontekstual khusus penugasan: Cockpit Wali Kelas (`/wali-kelas`) dan Portal Pimpinan (`/pimpinan`).

---

## 3. Invariant Domain & Batasan Multi-Tenant
1. Tidak ada perubahan skema database destruktif (`Student ≠ Enrollment ≠ Rombel Placement`).
2. Setiap query dan mutasi wajib terisolasi pada `sekolah_aktif_id` tenant aktor.
3. Nilai NIS yang null/kosong wajib ditangani secara null-safe (anti-crash).
4. Kepatuhan Academic Glass UI v1.2 dan pedoman anti-slop.

---

## 4. Quality Gates
1. TypeScript `tsc --noEmit`: 0 error
2. ESLint: 0 error
3. Prettier: 100% compliant
4. Vitest: 100% test pass
5. Next.js Turbopack build: 100% compilation pass
