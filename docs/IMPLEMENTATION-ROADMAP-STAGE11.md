# IMPLEMENTATION-ROADMAP-STAGE11.md
## Roadmap Implementasi Pasca-Audit (STAGE 11)
### Transformasi Realitas Bisnis, Penyatuan Desain, CBT 2.0 & Produktivitas Guru

| Field | Nilai |
| --- | --- |
| **Tahap Rilis** | STAGE 11 — Engineering Implementation Roadmap |
| **Dasar Analisis** | `docs/PRODUCT-REALITY-AUDIT.md`, `docs/DESIGN-CONSISTENCY-AUDIT.md`, `docs/CBT-PLATFORM-GAP-ANALYSIS.md` |
| **Arsitektur Eksekusi** | 4 Gelombang Berurutan (**Wave 1 → Wave 2 → Wave 3 → Wave 4**) |
| **Status Gate** | `ROADMAP SPECIFICATION` — Menunggu Persetujuan Manusia (**STOP**) |
| **Versi Dokumen** | 1.0 (Canonical Implementation Plan) |

---

# 1. Gambaran Strategis 4 Gelombang Implementasi

Roadmap ini dirancang untuk dieksekusi secara vertikal dan bertahap setelah audit STAGE 10.7 / 10.8 mendapatkan persetujuan manusia (*Human Approval*). Tidak ada lompatan fase, dan setiap Wave wajib memenuhi seluruh *Quality Gates* sebelum melangkah ke Wave berikutnya.

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                               STAGE 11 EXECUTION ARCHITECTURE                                    │
├───────────────────┬───────────────────┬───────────────────┬──────────────────────────────────────┤
│      WAVE 1       │      WAVE 2       │      WAVE 3       │                WAVE 4                │
│  BUSINESS REALITY │ DESIGN UNIFICATION│      CBT 2.0      │         TEACHER PRODUCTIVITY         │
├───────────────────┼───────────────────┼───────────────────┼──────────────────────────────────────┤
│ • Hapus Fake Score│ • Standardisasi   │ • Live Proctoring │ • AI Question Bank → CBT Sync        │
│   (85.0/88.0)     │   Hero 10 Menu    │   Cockpit Grid    │ • 1-Click CBT Transfer to Gradebook  │
│ • Koreksi Presensi│ • Tokens Academic │ • Real-Time       │ • Presensi Kilat 1-Tap & Auto-Jurnal │
│   vs KBM Guru     │   Glass UI v2.0   │   Participant     │ • Export Rapor KBM Kurikulum         │
│ • Bersihkan 3 JP  │ • Tipografi Mono  │ • Dynamic Token   │   Merdeka Resmi                      │
│   Hardcoded       │   & Hierarchy     │ • Hard-Enforced   │                                      │
│ • Hapus Agenda PTS│ • Unified Dark    │   Exam Windows    │                                      │
│   Mock & Fallbacks│   Mode Experience │ • Item Psychometr.│                                      │
└───────────────────┴───────────────────┴───────────────────┴──────────────────────────────────────┘
```

---

# 2. Rincian Pekerjaan per Gelombang (Wave Details)

---

## 🌊 WAVE 1: Business Reality Remediation (Perbaikan Integritas Data)
> **Fokus Utama:** Menghilangkan seluruh nilai fiktif, angka sintetis, hardcoded fallback, dan asumsi proses bisnis pada seluruh antarmuka Teacher Workspace.

### Task List & Target File:
1. **Task 1.1 — Eliminasi Fallback Nilai Siswa Palsu:**
   - **Target File:** [`src/shared/components/dashboard/role-views/teacher-dashboard.tsx` (Baris 119)](file:///C:/laragon/www/Ruang-Pintar/src/shared/components/dashboard/role-views/teacher-dashboard.tsx#L119) dan [`src/shared/components/dashboard/cockpit/performance-bar-chart.tsx`](file:///C:/laragon/www/Ruang-Pintar/src/shared/components/dashboard/cockpit/performance-bar-chart.tsx)
   - **Aksi:** Hapus fallback `88.0 : 85.0`. Jika `rata_rata_kelas === null`, teruskan `score: null`. Pada komponen bar chart, tampilkan *empty state* faktual: `"Belum Ada Nilai Masuk"`.
2. **Task 1.2 — Pemisahan Rasio Progres KBM dari Tingkat Kehadiran Siswa:**
   - **Target File:** [`src/shared/components/dashboard/role-views/teacher-dashboard.tsx` (Baris 166–168 & 255–277)](file:///C:/laragon/www/Ruang-Pintar/src/shared/components/dashboard/role-views/teacher-dashboard.tsx#L166-L168)
   - **Aksi:** Hitung kehadiran siswa riil dari tabel `presensi_sesi_kelas` untuk sesi hari ini. Pisahkan metrik progres sesi mengajar guru ke kartu terpisah dengan label transparan.
3. **Task 1.3 — Pengkabelan Donut Gauges ke Data Riil Hari Ini:**
   - **Target File:** [`src/shared/components/dashboard/role-views/teacher-dashboard.tsx` (Baris 283–305)](file:///C:/laragon/www/Ruang-Pintar/src/shared/components/dashboard/role-views/teacher-dashboard.tsx#L283-L305)
   - **Aksi:** Ganti asumsi `hasSessionsToday ? 100 : 0` dengan persentase kehadiran riil, sakit/izin riil, dan status verifikasi pengisian jurnal KBM aktual di database.
4. **Task 1.4 — Penghapusan Default Hardcoded "3 JP / Minggu":**
   - **Target File:** [`src/modules/ai-assistant/application/smart-onboarding-service.ts` (Baris 384)](file:///C:/laragon/www/Ruang-Pintar/src/modules/ai-assistant/application/smart-onboarding-service.ts#L384), [`src/modules/learning/presentation/class-workspace-view.tsx` (Baris 301)](file:///C:/laragon/www/Ruang-Pintar/src/modules/learning/presentation/class-workspace-view.tsx#L301), [`src/modules/learning/presentation/teacher-classes-view.tsx` (Baris 794)](file:///C:/laragon/www/Ruang-Pintar/src/modules/learning/presentation/teacher-classes-view.tsx#L794)
   - **Aksi:** Jadikan `jumlah_jam_minggu` bernilai nullable / 0 pada proses pembuatan kelas mandiri freemium. Pada antarmuka, tampilkan `"JP: Belum Ditentukan Kurikulum"` jika belum ada SK penetapan beban mengajar.
5. **Task 1.5 — Pembersihan Agenda Kalender Fiktif pada Timeline Rail:**
   - **Target File:** [`src/shared/components/dashboard/cockpit/teaching-timeline-rail.tsx` (Baris 204–251)](file:///C:/laragon/www/Ruang-Pintar/src/shared/components/dashboard/cockpit/teaching-timeline-rail.tsx#L204-L251)
   - **Aksi:** Hapus teks hardcoded PTS dan Rapat Koordinasi. Ambil dari database `kalender_akademik` (`tanggal_mulai >= hari_ini`). Jika kosong, tampilkan *empty state* jujur.
6. **Task 1.6 — Koreksi Metrik Dingin & Label:**
   - Ganti `Total Sesi: {entries.length} Jam` pada `/jadwal-saya` dengan badge `"Jadwal Belum Diterbitkan Kurikulum"` jika kosong.
   - Ganti `Rombel Terlayani: {rombelsData.length}` pada `/sesi-pembelajaran` dengan `"Rombel Diampu"` atau hitung dari riwayat sesi selesai.
   - Ganti `Rata-rata Kehadiran: 0%` pada `/presensi-kelas` dengan `"- (Belum Ada Data)"` saat belum ada presensi yang diambil.

---

## 🌊 WAVE 2: Design Unification (Standardisasi Academic Glass UI v2.0)
> **Fokus Utama:** Menyelaraskan seluruh 10 halaman menu sidebar guru ke standar estetika dan keunggulan visual Dashboard Guru.

### Task List & Target File:
1. **Task 2.1 — Refactoring Unified Hero Section Component:**
   - **Target File:** Buat `src/shared/components/layout/academic-hero-section.tsx`
   - **Spesifikasi:** Mendukung container kaca `rounded-[28px]`, ambient glow blur radial, badge sub-header monospace, judul `font-mono text-2xl sm:text-3xl font-extrabold`, breadcrumb terpadu, dan slot ilustrasi 3D pop-out yang presisi.
2. **Task 2.2 — Redesain Halaman Buku Nilai & Rapor (`/penilaian`):**
   - **Target File:** [`src/modules/assessment/presentation/teacher-gradebook-overview-view.tsx`](file:///C:/laragon/www/Ruang-Pintar/src/modules/assessment/presentation/teacher-gradebook-overview-view.tsx)
   - **Spesifikasi:** Terapkan Academic Hero Section, ganti kartu kelas dengan glass cards `rounded-2xl`, tambahkan visual progress bar ketuntasan KKTP, dan gunakan angka `font-mono font-black`.
3. **Task 2.3 — Redesain Halaman Presensi Kehadiran (`/presensi-kelas`):**
   - **Target File:** [`src/modules/attendance/presentation/class-attendance-overview.tsx`](file:///C:/laragon/www/Ruang-Pintar/src/modules/attendance/presentation/class-attendance-overview.tsx)
   - **Spesifikasi:** Integrasikan mini donut gauge kehadiran pada setiap kartu rombel, terapkan tombol aksi cepat "Presensi Kilat" dengan gradient blue, dan selaraskan layout tab.
4. **Task 2.4 — Redesain Halaman Jadwal Mengajar (`/jadwal-saya`):**
   - **Target File:** [`src/modules/schedule/presentation/my-schedule-view.tsx`](file:///C:/laragon/www/Ruang-Pintar/src/modules/schedule/presentation/my-schedule-view.tsx)
   - **Spesifikasi:** Buat kartu slot jadwal bernuansa glassmorphism, perbaiki kontras dark mode pada baris jam pelajaran, dan hadirkan timeline harian modern.
5. **Task 2.5 — Penyelarasan Halaman Kelas Saya, Sesi KBM, dan Kalender Akademik:**
   - **Target Files:** `teacher-classes-view.tsx`, `class-sessions-view.tsx`, `academic-calendar-view.tsx`
   - **Spesifikasi:** Perbaiki *information density* kotak materi/tugas, selaraskan radius `rounded-[28px]`, dan hilangkan segala inkonsistensi styling.
6. **Task 2.6 — Harmonisasi Studio Asisten AI Guru (`/asisten-ai`):**
   - **Target File:** [`src/modules/ai/presentation/ai-teacher-studio-view.tsx`](file:///C:/laragon/www/Ruang-Pintar/src/modules/ai/presentation/ai-teacher-studio-view.tsx)
   - **Spesifikasi:** Selaraskan tema warna hero dan tab navigasi agar menyatu dengan palet Academic Glass UI (bukan bernuansa aplikasi pihak ketiga yang terisolasi).

---

## 🌊 WAVE 3: CBT 2.0 (From CRUD to Modern Assessment Platform)
> **Fokus Utama:** Mentransformasi modul ujian daring dari sekadar form input soal menjadi Assessment Cockpit berkemampuan Live Proctoring setara standar ANBK.

### Task List & Target File:
1. **Task 3.1 — Dedicated Live Proctoring Cockpit Grid (MH-01 & MH-02):**
   - **Target File:** Buat `src/modules/cbt/presentation/cbt-live-proctoring-view.tsx`
   - **Spesifikasi:** Layar penuh pemantauan ujian ruang kelas (Live Grid 38 siswa). Menampilkan status real-time (`Belum Masuk`, `Mengerjakan`, `Terkunci Integritas`, `Selesai`) dengan indikator animasi pulse dan polling sinkronisasi tanpa reload halaman.
2. **Task 3.2 — Live Progress Tracker Peserta (MH-03):**
   - **Spesifikasi:** Kartu setiap siswa menampilkan jumlah soal yang telah dijawab (`24 / 30 Soal Terjawab`), persentase keterisian bar, serta penanda jawaban ragu-ragu.
3. **Task 3.3 — Dynamic Token Generator & Session Refresher (MH-04):**
   - **Target File:** Perbarui `cbt-service.ts` dan `cbt-token-entry-card.tsx`
   - **Spesifikasi:** Token alfanumerik 6 karakter yang dapat di-refresh sewaktu-waktu oleh guru/pengawas dengan tombol *Generate New Token*, otomatis membatalkan token lama.
4. **Task 3.4 — Hard-Enforced Exam Windows & Auto-Submit (MH-05):**
   - **Spesifikasi:** Sisi server memverifikasi jam buka dan jam tutup ujian secara ketat. Siswa tidak dapat memulai sebelum waktu tiba, dan timer di pemutar ujian otomatis melakukan submit paksa saat durasi habis.
5. **Task 3.5 — Kontrol Pengawas Langsung / Proctor Actions (SH-02):**
   - **Spesifikasi:** Pengawas dapat menekan tombol aksi langsung dari kartu siswa: *Buka Kunci*, *Tambah Waktu (+10 Menit)*, atau *Paksa Kumpulkan Lembar Jawaban*.
6. **Task 3.6 — Analisis Butir Soal & Distribusi Nilai (SH-03 & SH-04):**
   - **Target File:** Buat `src/modules/cbt/presentation/cbt-exam-analytics-view.tsx`
   - **Spesifikasi:** Grafik lonceng sebaran nilai kelas, tingkat kesukaran per butir soal, daya pembeda, efektivitas pengecoh, serta daftar otomatis siswa yang wajib remedial nilai.

---

## 🌊 WAVE 4: Teacher Productivity & Classroom Copilot (Integrasi KBM Terpadu)
> **Fokus Utama:** Menyambungkan seluruh mata rantai KBM guru agar efisien, otomatis, dan minim beban administratif.

### Task List & Target File:
1. **Task 4.1 — Integrasi Instan Bank Soal Asisten AI ke Paket Ujian CBT:**
   - **Spesifikasi:** Tombol 1-klik di Studio AI Guru: *"Jadikan Paket Ujian CBT Resmi"*, langsung membuat record ujian, mengaitkan butir soal, dan mengarahkan ke Live Proctoring Cockpit.
2. **Task 4.2 — 1-Click Nilai Transfer dari CBT ke Buku Nilai Kurikulum Merdeka:**
   - **Spesifikasi:** Nilai hasil ujian CBT otomatis dipetakan ke Tujuan Pembelajaran (TP) formatif atau sumatif di modul penilaian M13 tanpa input manual satu per satu.
3. **Task 4.3 — Quick Presensi 1-Tap & Auto-Journal dari Cockpit Dashboard:**
   - **Spesifikasi:** Tombol aksi pada kartu "Sesi Terdekat" di Dashboard Guru: guru dapat membuka sesi, menandai semua hadir dalam 1-klik, dan mengisi catatan KBM tanpa harus berpindah halaman.
4. **Task 4.4 — Export Dokumen Administrasi KBM Resmi:**
   - **Spesifikasi:** Fitur cetak/export PDF & Excel untuk Jurnal Pembelajaran, Daftar Nilai Siswa, dan Lembar Analisis Asesmen siap tanda tangan Kepala Sekolah.

---

# 3. Kriteria Keberhasilan & Quality Gates (Definition of Done)

Setiap Wave yang dieksekusi pada STAGE 11 wajib membuktikan kelulusan quality gate berikut sebelum dianggap selesai:

```bash
npm run typecheck    # 0 errors (TypeScript 5.8 strict)
npm run lint         # 0 errors (ESLint 9 clean)
npm run format:check # 100% formatted (Prettier)
npm run test         # 100% PASS seluruh test suite Vitest
npm run build        # Production Next.js build sukses
```

---

# 4. Kesimpulan & Penyerahan ke Pengguna

Empat dokumen hasil audit telah selesai disusun secara komprehensif:
1. [`docs/PRODUCT-REALITY-AUDIT.md`](file:///C:/laragon/www/Ruang-Pintar/docs/PRODUCT-REALITY-AUDIT.md) — Seluruh mismatch data sintetis, fallback, dan asumsi bisnis.
2. [`docs/DESIGN-CONSISTENCY-AUDIT.md`](file:///C:/laragon/www/Ruang-Pintar/docs/DESIGN-CONSISTENCY-AUDIT.md) — Audit konsistensi visual 10 menu terhadap standar Academic Glass UI.
3. [`docs/CBT-PLATFORM-GAP-ANALYSIS.md`](file:///C:/laragon/www/Ruang-Pintar/docs/CBT-PLATFORM-GAP-ANALYSIS.md) — Analisis kesenjangan CBT menuju Modern Assessment Cockpit.
4. [`docs/IMPLEMENTATION-ROADMAP-STAGE11.md`](file:///C:/laragon/www/Ruang-Pintar/docs/IMPLEMENTATION-ROADMAP-STAGE11.md) — Rencana kerja eksekusi terstruktur dalam 4 gelombang.

Sesuai instruksi baku:
**KODE SAMA SEKALI TIDAK DIUBAH.**
**DATABASE SAMA SEKALI TIDAK DIUBAH.**
**MIGRASI TIDAK DIBUAT.**

**READY FOR HUMAN REVIEW**  
**STOP**
