# PRODUCT-REALITY-REMEDIATION-BACKLOG.md
## Backlog Implementasi Remediasi Realitas Bisnis (Product Reality Remediation Backlog)
### Ruang Pintar — School Digital Operating Platform

| Field | Nilai |
| --- | --- |
| **Tahap Remediasi** | STAGE 11.1B — Business Reality Remediation Backlog |
| **Dasar Penyelidikan** | `docs/UI-DATA-PROVENANCE-AUDIT.md` & `docs/INVALID-UI-DATA-INVENTORY.md` |
| **Prinsip Utama** | **Product Reality First** — Tidak ada angka, badge, indikator, atau progres fiktif di hadapan guru |
| **Status Gate** | `BACKLOG ONLY` — Tanpa Perubahan Kode Produksi, Tanpa Migrasi Database (**STOP**) |
| **Versi Dokumen** | 1.0 (Canonical Implementation Backlog) |

---

# 1. Definisi & Rekapitulasi 3 Kategori Data

Seluruh 42 titik metrik aktif pada antarmuka guru diklasifikasikan ke dalam 3 kategori baku:

1. **`VALID` (11 Titik):** Data bersumber langsung dari database riil hasil input nyata pengguna (*User Generated*). Tidak perlu diubah.
2. **`DERIVED` (20 Titik):** Data hasil kalkulasi matematis (count, sum, filter) dari data riil database. Tetap dipertahankan dengan rumus yang terverifikasi.
3. **`SYNTHETIC / FAKE` (11 Titik):** Data hardcode, asumsi sistem, placeholder, atau data estimasi tanpa sumber database. Wajib dibersihkan secara tuntas.

```text
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                               DISTRIBUSI DATA PROVENANCE UI                                      │
├───────────────────────────────┬───────────────────────────────┬──────────────────────────────────┤
│    KATEGORI STATUS            │          JUMLAH TITIK         │           STATUS TINDAKAN        │
├───────────────────────────────┼───────────────────────────────┼──────────────────────────────────┤
│ A. VALID (Data Riil)          │            11 Titik           │ AMAN (Dipertahankan 100%)        │
│ B. DERIVED (Kalkulasi Riil)   │            20 Titik           │ AMAN (Dipertahankan 100%)        │
│ C. SYNTHETIC / FAKE (Palsu)   │            11 Titik           │ WAJIB DIBERSIHKAN (Zero Fake)    │
├───────────────────────────────┼───────────────────────────────┼──────────────────────────────────┤
│ TOTAL TITIK METRIK DIAUDIT    │            42 Titik           │ 11 Titik Diremediasi (26.2%)     │
└───────────────────────────────┴───────────────────────────────┴──────────────────────────────────┘
```

---

# 2. Tabel Audit Lengkap 42 Titik Data Metrik UI

| Menu | Komponen | Label UI | Nilai Saat Ini | Sumber Data | File | Baris Kode | Status | Action |
|:---|:---|:---|:---:|:---|:---|:---:|:---:|:---|
| Dashboard | `TeacherDashboard` | Sesi Hari Ini (Greeting) | `0 sesi` | `jadwal_pelajaran` (`mergedTodayBlocks.length`) | `teacher-dashboard.tsx` | 202-204 | `DERIVED` | Pertahankan (Rumus: hitung blok jam hari ini) |
| Dashboard | `TeacherDashboard` | Total Rombel (Greeting) | `1 rombel` | `rombel` (`uniqueRombelsCount`) | `teacher-dashboard.tsx` | 204-206 | `DERIVED` | Pertahankan (Rumus: distinct `rombel_id`) |
| Dashboard | `PerformanceBarChart` | Skor Kelas Tertinggi | `85.0` / `88.0` | Injeksi fallback ternary inline | `teacher-dashboard.tsx` | 119 | **`FAKE`** | Hapus fallback, pasang Empty State |
| Dashboard | `TeacherDashboard` | Kehadiran Kumulatif Siswa | `100.0%` / `0%` | Rasio KBM guru (`completed / total * 100`) | `teacher-dashboard.tsx` | 166-168 | **`FAKE`** | Hapus rasio KBM, sambungkan presensi riil |
| Dashboard | `DonutGauge` | Gauge Siswa Hadir | `100%` | Hardcode ternary `hasSessionsToday ? 100 : 0` | `teacher-dashboard.tsx` | 283 | **`FAKE`** | Hapus hardcode, sambungkan presensi riil |
| Dashboard | `DonutGauge` | Gauge Tuntas KBM | `0%` - `100%` | `sesi_kelas` (`completed / total * 100`) | `teacher-dashboard.tsx` | 288-297 | `DERIVED` | Pertahankan (Rumus: rasio sesi KBM selesai) |
| Dashboard | `DonutGauge` | Gauge Sakit/Izin | `0%` | Hardcode statis `percentage={0}` | `teacher-dashboard.tsx` | 298 | **`FAKE`** | Hapus hardcode, sambungkan presensi riil |
| Dashboard | `DonutGauge` | Gauge Jurnal Diisi | `100%` | Hardcode ternary `hasSessionsToday ? 100 : 0` | `teacher-dashboard.tsx` | 300-304 | **`FAKE`** | Hapus hardcode, verifikasi tabel jurnal riil |
| Dashboard | `AttentionQueueCard` | Status Siswa Perlu Perhatian | Status "Optimal" | Default props `items=[]` tanpa query DB | `attention-queue-card.tsx` | 131-145 | **`FAKE`** | Ganti pesan status menjadi Empty State |
| Dashboard | `TeachingTimelineRail` | Batas Input PTS Gasal | `24 Sep • 23:59` | Teks JSX statis tanpa query DB | `teaching-timeline-rail.tsx` | 211-215 | **`FAKE`** | Hapus teks JSX statis, query kalender |
| Dashboard | `TeachingTimelineRail` | Rapat Evaluasi Kurikulum | `28 Sep • 13:00` | Teks JSX statis tanpa query DB | `teaching-timeline-rail.tsx` | 236-240 | **`FAKE`** | Hapus teks JSX statis, query kalender |
| Kelas Saya | `TeacherClassesView` | Total Rombel / Kelas (Card) | `1 Kelas` | `rombel` (`uniqueRombelsCount`) | `teacher-classes-view.tsx` | 258-260 | `DERIVED` | Pertahankan (Rumus: distinct `rombel_id`) |
| Kelas Saya | `TeacherClassesView` | Total Mapel & Penugasan | `1 Mapel • 1 Penugasan` | `penugasan_mengajar` | `teacher-classes-view.tsx` | 263 | `DERIVED` | Pertahankan (Rumus: distinct mapel & length) |
| Kelas Saya | `TeacherClassesView` | Beban KBM (Summary Card) | `3 JP per minggu` | Injeksi kolom service onboarding | `teacher-classes-view.tsx` | 278-283 | **`FAKE`** | Sembunyikan kartu jika belum ada SK jadwal |
| Kelas Saya | `TeacherClassesView` | Siswa Binaan (Summary Card) | `38 Siswa` | `penempatan_rombel` (`total_siswa`) | `teacher-classes-view.tsx` | 298, 305 | `VALID` | Pertahankan angka 38, sesuaikan label |
| Kelas Saya | `TeacherClassesView` | Lingkup Materi (Summary Card) | `0 BAB kurikulum` | `tujuan_pembelajaran` (`total_bab`) | `teacher-classes-view.tsx` | 324-331 | `DERIVED` | Pertahankan (Rumus: sum `total_bab`) |
| Kelas Saya | `TeacherClassesView` | Badge JP pada Kartu Rombel | `3 JP / mgg` | Injeksi kolom service onboarding | `teacher-classes-view.tsx` | 794 | **`FAKE`** | Sembunyikan badge jika belum ada SK jadwal |
| Kelas Saya | `TeacherClassesView` | Matriks 4 Kolom: BAB | `0` | `tujuan_pembelajaran` (`lingkup_materi`) | `teacher-classes-view.tsx` | 831 | `VALID` | Pertahankan (Data riil modul kosong) |
| Kelas Saya | `TeacherClassesView` | Matriks 4 Kolom: Materi | `0` | `materi_pembelajaran` (`publikasi_materi`)| `teacher-classes-view.tsx` | 839 | `VALID` | Pertahankan (Data riil materi kosong) |
| Kelas Saya | `TeacherClassesView` | Matriks 4 Kolom: Tugas | `0` | `tugas_pembelajaran` (`publikasi_tugas`) | `teacher-classes-view.tsx` | 847 | `VALID` | Pertahankan (Data riil tugas kosong) |
| Kelas Saya | `TeacherClassesView` | Matriks 4 Kolom: Jurnal | `0` | `jurnal_guru` (`administrasi`) | `teacher-classes-view.tsx` | 855 | `VALID` | Pertahankan (Data riil jurnal kosong) |
| Kelas Saya | `TeacherClassesView` | Jumlah Siswa Kartu Kelas | `38 Siswa` | `penempatan_rombel` | `teacher-classes-view.tsx` | 865 | `VALID` | Pertahankan (Data riil 38 murid) |
| Workspace | `ClassWorkspaceView` | Badge JP di Workspace Header | `3 JP / Minggu` | Injeksi kolom service onboarding | `class-workspace-view.tsx` | 301 | **`FAKE`** | Bersihkan badge JP dari header workspace |
| Jadwal | `MySchedulePage` | Total Sesi (Hero Badge) | `0 Jam` | `jadwal_pelajaran` (`entries.length`) | `jadwal-saya/page.tsx` | 155 | `DERIVED` | Pertahankan, selaraskan label satuan |
| Jadwal | `MySchedulePage` | Mata Pelajaran (Hero Badge) | `0` | `jadwal_pelajaran` (distinct `mapel_id`) | `jadwal-saya/page.tsx` | 162-164 | `DERIVED` | Pertahankan (Rumus: distinct `mapel_id`) |
| Jadwal | `MySchedulePage` | Rombel (Hero Badge) | `0` | `jadwal_pelajaran` (distinct `rombel_id`) | `jadwal-saya/page.tsx` | 169-171 | `DERIVED` | Pertahankan (Rumus: distinct `rombel_id`) |
| Jadwal | `MyScheduleView` | Total Mengajar di Viewport | `0 JP / Minggu` | `jadwal_pelajaran` (`entries.length`) | `my-schedule-view.tsx` | 180 | `DERIVED` | Pertahankan (Rumus: akumulasi durasi slot) |
| Sesi KBM | `ClassSessionsPage` | Kelas Berlangsung | `0` | `sesi_kelas` (filter `DIMULAI`) | `sesi-pembelajaran/page.tsx`| 127-129 | `DERIVED` | Pertahankan (Rumus: filter status `DIMULAI`) |
| Sesi KBM | `ClassSessionsPage` | Sesi Selesai | `0` | `sesi_kelas` (filter `SELESAI`) | `sesi-pembelajaran/page.tsx`| 134-136 | `DERIVED` | Pertahankan (Rumus: filter status `SELESAI`) |
| Sesi KBM | `ClassSessionsPage` | Total Riwayat Sesi | `0` | `sesi_kelas` (`sessions.length`) | `sesi-pembelajaran/page.tsx`| 141-143 | `DERIVED` | Pertahankan (Rumus: total baris riwayat) |
| Sesi KBM | `ClassSessionsPage` | Rombel Terlayani | `1` | `rombel` (`sekolah_id`) | `sesi-pembelajaran/page.tsx`| 148-150 | `DERIVED` | Filter scope ke rombel pengampu guru aktif |
| Presensi | `ClassAttendanceOverview` | Rata-rata Kehadiran Kumulatif| `0%` | `sesi_kelas` (`averageAttendance`) | `class-attendance-overview.tsx` | 83-87, 187 | `DERIVED` | Tampilkan `-` jika belum ada presensi |
| Presensi | `ClassAttendanceOverview` | Presensi Terekam per Rombel | `0 Sesi` | `sesi_kelas` (`total_presensi_diambil`)| `class-attendance-overview.tsx` | 484-490 | `VALID` | Pertahankan (Data riil 0 presensi) |
| Penilaian | `TeacherGradebookOverviewView`| Total Kelas Diampu | `1` | `penugasan_mengajar` (`overviewList`) | `teacher-gradebook-overview-view.tsx` | 84-85 | `VALID` | Pertahankan (Data riil 1 kelas diampu) |
| Penilaian | `TeacherGradebookOverviewView`| Rekap Asesmen & Rata-rata | `0 Asesmen • -` | `asesmen` & `nilai_siswa` | `teacher-gradebook-overview-view.tsx` | 162, 167 | `VALID` | Pertahankan (Data riil buku nilai kosong) |
| CBT Ujian | `CbtHubOverviewView` | Total Ujian & Peserta | `0 Ujian • 0` | `ujian_cbt` & `sesi_ujian_siswa` | `cbt-hub-overview-view.tsx` | 131-135 | `DERIVED` | Pertahankan (Rumus: sum ujian & peserta) |
| CBT Ujian | `gemini-cbt-ai-service.ts` | Naskah Soal AI Fallback | 10 Soal Sejarah | Generator offline deterministik | `gemini-cbt-ai-service.ts` | 173, 280 | `DERIVED` | Beri penanda status template offline |
| Kalender | `AcademicCalendarPage` | Total Agenda & Hari Libur | `0 Agenda • 0` | `kalender_akademik` | `kalender-akademik/page.tsx`| 107, 114 | `DERIVED` | Pertahankan (Rumus: filter agenda libur) |
| Kalender | `AcademicCalendarPage` | Periode Ujian & Kegiatan | `0 Periode • 0`| `kalender_akademik` | `kalender-akademik/page.tsx`| 121, 128 | `DERIVED` | Pertahankan (Rumus: filter ujian & kegiatan) |
| Pengumuman | `AnnouncementDirectoryView` | Tab Kategori Pengumuman | 5 Tab Kategori | `pengumuman` | `announcement-directory-view.tsx` | 154-159 | `VALID` | Pertahankan (Data riil pengumuman) |
| Asisten AI | `AiTeacherStudioView` | Model AI Aktif | `GEMINI-3.6-FLASH`| Client LocalStorage | `ai-teacher-studio-view.tsx` | 61, 345 | `VALID` | Pertahankan (Pilihan engine aktif) |
| Asisten AI | `AiTeacherStudioView` | Status Kunci API | "Mesin Cerdas..." | Ternary inline API key state | `ai-teacher-studio-view.tsx` | 348 | `DERIVED` | Sesuaikan label menjadi template offline |

---

# 3. Analisis Pelanggaran Product Reality pada Seluruh Item FAKE

Berikut investigasi mendalam terhadap 11 item berstatus **`FAKE`**:

### 1. Fallback Skor Nilai Siswa (85.0 / 88.0)
- **File:** [`src/shared/components/dashboard/role-views/teacher-dashboard.tsx`](file:///C:/laragon/www/Ruang-Pintar/src/shared/components/dashboard/role-views/teacher-dashboard.tsx)
- **Baris Kode:** Baris 119
- **Sumber Hardcode:** `score: o.rata_rata_kelas ?? (o.total_published > 0 ? 88.0 : 85.0)`
- **Mengapa Melanggar Product Reality:** Guru belum pernah membuat asesmen dan belum pernah menilai pekerjaan murid. Menyuntikkan angka 85.0 adalah **pemalsuan prestasi akademik**. Kepala sekolah dan pengawas yang melihat diagram mengira murid sudah tuntas belajar.

### 2. Kehadiran Kumulatif Siswa Binaan (100.0%)
- **File:** [`src/shared/components/dashboard/role-views/teacher-dashboard.tsx`](file:///C:/laragon/www/Ruang-Pintar/src/shared/components/dashboard/role-views/teacher-dashboard.tsx)
- **Baris Kode:** Baris 166–168 & 255–277
- **Sumber Hardcode:** `hasSessionsToday ? ((completedSessionsToday / totalSessionsToday) * 100).toFixed(1) : "0"`
- **Mengapa Melanggar Product Reality:** Mengukur rasio jam mengajar guru, tetapi disajikan di bawah label kehadiran fisik siswa. Guru yang menyelesaikan sesi tanpa memanggil absensi murid otomatis mengklaim siswa hadir 100%.

### 3. Donut Gauge "Siswa Hadir" (100%)
- **File:** [`src/shared/components/dashboard/role-views/teacher-dashboard.tsx`](file:///C:/laragon/www/Ruang-Pintar/src/shared/components/dashboard/role-views/teacher-dashboard.tsx)
- **Baris Kode:** Baris 283
- **Sumber Hardcode:** `<DonutGauge percentage={hasSessionsToday ? 100 : 0} label="Siswa Hadir" ... />`
- **Mengapa Melanggar Product Reality:** Mengasumsikan seluruh siswa pasti hadir 100% saat ada sesi mengajar, tanpa memverifikasi data presensi aktual di database.

### 4. Donut Gauge "Sakit/Izin" (0%)
- **File:** [`src/shared/components/dashboard/role-views/teacher-dashboard.tsx`](file:///C:/laragon/www/Ruang-Pintar/src/shared/components/dashboard/role-views/teacher-dashboard.tsx)
- **Baris Kode:** Baris 298
- **Sumber Hardcode:** `<DonutGauge percentage={0} label="Sakit/Izin" color="amber" size={62} />`
- **Mengapa Melanggar Product Reality:** Mematok angka 0% secara permanen di kode JSX sehingga menyembunyikan kondisi siswa yang sakit atau berizin.

### 5. Donut Gauge "Jurnal Diisi" (100%)
- **File:** [`src/shared/components/dashboard/role-views/teacher-dashboard.tsx`](file:///C:/laragon/www/Ruang-Pintar/src/shared/components/dashboard/role-views/teacher-dashboard.tsx)
- **Baris Kode:** Baris 300–304
- **Sumber Hardcode:** `<DonutGauge percentage={hasSessionsToday ? 100 : 0} label="Jurnal Diisi" ... />`
- **Mengapa Melanggar Product Reality:** Mengasumsikan jika ada sesi kelas, jurnal mengajar otomatis sudah selesai 100% tanpa mengecek tabel `jurnal_guru`.

### 6. Status Siswa Perlu Perhatian ("Semua Siswa Terpantau Optimal")
- **File:** [`src/shared/components/dashboard/cockpit/attention-queue-card.tsx`](file:///C:/laragon/www/Ruang-Pintar/src/shared/components/dashboard/cockpit/attention-queue-card.tsx) & [`teacher-dashboard.tsx`](file:///C:/laragon/www/Ruang-Pintar/src/shared/components/dashboard/role-views/teacher-dashboard.tsx)
- **Baris Kode:** Baris 131–145 (`attention-queue-card.tsx`) & Baris 310 (`teacher-dashboard.tsx`)
- **Sumber Hardcode:** Props default komponen `items=[]`
- **Mengapa Melanggar Product Reality:** Memberi ilusi rasa aman (*false sense of security*) bahwa 38 murid aman dari risiko remedial, padahal sistem sama sekali belum memeriksa database nilai dan absensi.

### 7. Agenda Batas Penginputan Nilai PTS Gasal
- **File:** [`src/shared/components/dashboard/cockpit/teaching-timeline-rail.tsx`](file:///C:/laragon/www/Ruang-Pintar/src/shared/components/dashboard/cockpit/teaching-timeline-rail.tsx)
- **Baris Kode:** Baris 211–215
- **Sumber Hardcode:** Teks JSX statis: `"Batas Penginputan Nilai PTS Gasal • 24 Sep 2026 • 23:59 WIB"`
- **Mengapa Melanggar Product Reality:** Menampilkan tenggat waktu tengah semester fiktif yang menimbulkan kepanikan guru, padahal sekolah belum menjadwalkan PTS pada kalender akademik.

### 8. Agenda Rapat Koordinasi Evaluasi Kurikulum
- **File:** [`src/shared/components/dashboard/cockpit/teaching-timeline-rail.tsx`](file:///C:/laragon/www/Ruang-Pintar/src/shared/components/dashboard/cockpit/teaching-timeline-rail.tsx)
- **Baris Kode:** Baris 236–240
- **Sumber Hardcode:** Teks JSX statis: `"Rapat Koordinasi Evaluasi Kurikulum • 28 Sep 2026 • 13:00 WIB"`
- **Mengapa Melanggar Product Reality:** Menampilkan agenda dinas sekolah fiktif pada tanggal 28 September yang tidak pernah diterbitkan oleh pimpinan sekolah.

### 9. Beban KBM (Summary Card Kelas)
- **File:** [`src/modules/learning/presentation/teacher-classes-view.tsx`](file:///C:/laragon/www/Ruang-Pintar/src/modules/learning/presentation/teacher-classes-view.tsx) & [`smart-onboarding-service.ts`](file:///C:/laragon/www/Ruang-Pintar/src/modules/ai-assistant/application/smart-onboarding-service.ts)
- **Baris Kode:** Baris 278–283 (`teacher-classes-view.tsx`) & Baris 384 (`smart-onboarding-service.ts`)
- **Sumber Hardcode:** `jumlah_jam_minggu: 3` pada payload service onboarding
- **Mengapa Melanggar Product Reality:** Mengklaim pemenuhan beban kerja guru (3 JP/minggu) secara sepihak tanpa SK pembagian tugas mengajar resmi dari kurikulum sekolah.

### 10. Badge JP pada Kartu Rombel Belajar
- **File:** [`src/modules/learning/presentation/teacher-classes-view.tsx`](file:///C:/laragon/www/Ruang-Pintar/src/modules/learning/presentation/teacher-classes-view.tsx)
- **Baris Kode:** Baris 794
- **Sumber Hardcode:** `{c.jumlah_jam_minggu} JP / mgg`
- **Mengapa Melanggar Product Reality:** Menampilkan beban jam fiktif hasil injeksi otomatis service onboarding pada setiap kartu rombel di direktori kelas.

### 11. Badge JP di Header Ruang Kerja Kelas
- **File:** [`src/modules/learning/presentation/class-workspace-view.tsx`](file:///C:/laragon/www/Ruang-Pintar/src/modules/learning/presentation/class-workspace-view.tsx)
- **Baris Kode:** Baris 301
- **Sumber Hardcode:** `{penugasan.jumlah_jam_minggu} JP / Minggu`
- **Mengapa Melanggar Product Reality:** Menampilkan alokasi JP fiktif hasil injeksi otomatis di ruang kerja utama persiapan ajar guru.

---

# 4. Matriks Prioritas Temuan

```text
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                       MATRIKS PRIORITAS TEMUAN                                         │
├───────────────┬────────────────────────────────────────────────────────────────────────────────────────┤
│ PRIORITAS     │ DAFTAR TEMUAN                                                                          │
├───────────────┼────────────────────────────────────────────────────────────────────────────────────────┤
│ CRITICAL      │ 1. Fallback Skor Nilai Siswa 85.0/88.0 (teacher-dashboard.tsx:119)                     │
│ (Menyesatkan  │ 2. Kehadiran Siswa 100.0% dari Rasio Sesi Guru (teacher-dashboard.tsx:166)             │
│ Guru)         │ 3. Donut Gauge Siswa Hadir Otomatis 100% (teacher-dashboard.tsx:283)                   │
│               │ 4. Donut Gauge Sakit/Izin Dipatok 0% (teacher-dashboard.tsx:298)                       │
│               │ 5. Donut Gauge Jurnal Diisi Otomatis 100% (teacher-dashboard.tsx:300)                  │
│               │ 6. Agenda Fiktif Batas Input PTS Gasal 24 Sep (teaching-timeline-rail.tsx:215)         │
│               │ 7. Agenda Fiktif Rapat Evaluasi Kurikulum 28 Sep (teaching-timeline-rail.tsx:239)      │
│               │ 8. Summary Card Beban KBM 3 JP Injeksi Onboarding (teacher-classes-view.tsx:278)       │
│               │ 9. Badge Kartu Kelas 3 JP / mgg (teacher-classes-view.tsx:794)                         │
│               │ 10. Badge Header Workspace 3 JP / Minggu (class-workspace-view.tsx:301)                │
├───────────────┼────────────────────────────────────────────────────────────────────────────────────────┤
│ HIGH          │ 11. Status Optimal Attention Queue Tanpa Query (attention-queue-card.tsx:131)          │
│ (Asumsi Fakta)│ 12. Siswa Binaan Label "terlayani" Prematur (teacher-classes-view.tsx:305)             │
│               │ 13. Sesi KBM: Rombel Terlayani Scope Seluruh Sekolah (sesi-pembelajaran/page.tsx:150)  │
├───────────────┼────────────────────────────────────────────────────────────────────────────────────────┤
│ MEDIUM        │ 14. Presensi Kelas Rata-rata 0% Dingin (class-attendance-overview.tsx:187)             │
│ (Placeholder  │ 15. Jadwal Mengajar Total Sesi "0 Jam" (jadwal-saya/page.tsx:155)                      │
│ Terlihat)     │ 16. Viewport Jadwal Asumsi 1 Slot = 1 JP "0 JP / Minggu" (my-schedule-view.tsx:180)    │
│               │ 17. Soal Ujian Fallback Statis Sejarah Saat Offline (gemini-cbt-ai-service.ts:173)     │
│               │ 18. Status API Key Masking Offline "Fallback Siap" (ai-teacher-studio-view.tsx:348)    │
├───────────────┼────────────────────────────────────────────────────────────────────────────────────────┤
│ LOW (Kosmetik)│ 19. Default durasi modal ujian 60 menit (create-exam-modal.tsx:55)                     │
└───────────────┴────────────────────────────────────────────────────────────────────────────────────────┘
```

---

# 5. Rencana Kerja Implementasi Nyata (4 Gelombang)

---

### WAVE 1: Penghapusan Seluruh Data Sintetis
*Fokus:* Mengeliminasi total seluruh angka buatan, agenda fiktif, dan beban injeksi dari basis kode.

- [ ] **Task 1.1:** Hapus fallback skor `85.0` dan `88.0` di [`teacher-dashboard.tsx:119`](file:///C:/laragon/www/Ruang-Pintar/src/shared/components/dashboard/role-views/teacher-dashboard.tsx#L119). Tetapkan `score: null` jika `o.rata_rata_kelas === null`.
- [ ] **Task 1.2:** Hapus elemen JSX statis Batas Input PTS Gasal (24 Sep 23:59 WIB) di [`teaching-timeline-rail.tsx:211-215`](file:///C:/laragon/www/Ruang-Pintar/src/shared/components/dashboard/cockpit/teaching-timeline-rail.tsx#L211-L215).
- [ ] **Task 1.3:** Hapus elemen JSX statis Rapat Evaluasi Kurikulum (28 Sep 13:00 WIB) di [`teaching-timeline-rail.tsx:236-240`](file:///C:/laragon/www/Ruang-Pintar/src/shared/components/dashboard/cockpit/teaching-timeline-rail.tsx#L236-L240).
- [ ] **Task 1.4:** Hapus nilai default statis `jumlah_jam_minggu: 3` pada [`smart-onboarding-service.ts:384`](file:///C:/laragon/www/Ruang-Pintar/src/modules/ai-assistant/application/smart-onboarding-service.ts#L384). Ubah menjadi `null` atau `0`.
- [ ] **Task 1.5:** Bersihkan badge statis `3 JP / mgg` pada [`teacher-classes-view.tsx:794`](file:///C:/laragon/www/Ruang-Pintar/src/modules/learning/presentation/teacher-classes-view.tsx#L794) dan badge `3 JP / Minggu` pada [`class-workspace-view.tsx:301`](file:///C:/laragon/www/Ruang-Pintar/src/modules/learning/presentation/class-workspace-view.tsx#L301).

---

### WAVE 2: Penggantian dengan Data Riil dari Database
*Fokus:* Menyambungkan komponen visual langsung ke query agregasi riil Prisma ORM.

- [ ] **Task 2.1:** Pisahkan formula rasio KBM guru dari rekap kehadiran siswa di [`teacher-dashboard.tsx:166-168`](file:///C:/laragon/www/Ruang-Pintar/src/shared/components/dashboard/role-views/teacher-dashboard.tsx#L166-L168). Sambungkan kehadiran siswa ke hitungan riil tabel `presensi_sesi_kelas` (`HADIR / total_siswa`).
- [ ] **Task 2.2:** Hubungkan Donut Gauge Siswa Hadir dan Sakit/Izin di [`teacher-dashboard.tsx:283, 298`](file:///C:/laragon/www/Ruang-Pintar/src/shared/components/dashboard/role-views/teacher-dashboard.tsx#L283) ke agregasi riil record `presensi_sesi_kelas` hari berjalan.
- [ ] **Task 2.3:** Hubungkan Donut Gauge Jurnal Diisi di [`teacher-dashboard.tsx:300`](file:///C:/laragon/www/Ruang-Pintar/src/shared/components/dashboard/role-views/teacher-dashboard.tsx#L300) ke verifikasi keberadaan catatan KBM pada tabel `jurnal_guru` untuk sesi yang berstatus `SELESAI`.
- [ ] **Task 2.4:** Sambungkan timeline kegiatan sekolah di [`teaching-timeline-rail.tsx`](file:///C:/laragon/www/Ruang-Pintar/src/shared/components/dashboard/cockpit/teaching-timeline-rail.tsx) ke query dinamis tabel `kalender_akademik` (`sekolah_id`, `tanggal_mulai >= hari_ini`).
- [ ] **Task 2.5:** Perbaiki query metrik Rombel Terlayani di [`sesi-pembelajaran/page.tsx:148-150`](file:///C:/laragon/www/Ruang-Pintar/src/app/sesi-pembelajaran/page.tsx#L148-L150) agar hanya menghitung rombel binaan guru yang telah menyelesaikan KBM (`SELESAI`).

---

### WAVE 3: Empty State Design Apabila Data Belum Tersedia
*Fokus:* Memasang antarmuka status netral yang transparan, jujur, dan edukatif saat data masih kosong.

- [ ] **Task 3.1:** Pasang *empty state* faktual pada [`PerformanceBarChart`](file:///C:/laragon/www/Ruang-Pintar/src/shared/components/dashboard/cockpit/performance-bar-chart.tsx) saat `score === null`:  
  *"Belum Ada Nilai Masuk — Buku nilai semester aktif belum memiliki asesmen yang dinilai."* (Garis datar tanpa diagram batang skor palsu).
- [ ] **Task 3.2:** Pasang status netral `"-"` pada Rekap Presensi Rombel di [`teacher-dashboard.tsx`](file:///C:/laragon/www/Ruang-Pintar/src/shared/components/dashboard/role-views/teacher-dashboard.tsx) saat KBM belum dimulai hari ini (label: *"Presensi Belum Diambil"*).
- [ ] **Task 3.3:** Ubah pesan default [`AttentionQueueCard`](file:///C:/laragon/www/Ruang-Pintar/src/shared/components/dashboard/cockpit/attention-queue-card.tsx#L131) menjadi status edukatif:  
  *"Menunggu Aktivitas Pembelajaran — Data tindak lanjut siswa (remedial nilai atau absensi berturut-turut) akan otomatis terakumulasi setelah KBM berjalan."*
- [ ] **Task 3.4:** Pasang *empty state* bersih pada timeline agenda sekolah di [`teaching-timeline-rail.tsx`](file:///C:/laragon/www/Ruang-Pintar/src/shared/components/dashboard/cockpit/teaching-timeline-rail.tsx):  
  *"Belum Ada Agenda Terdekat — Kalender akademik sekolah belum memiliki jadwal kegiatan mendatang."*
- [ ] **Task 3.5:** Pasang status `"- (Belum Ada Data)"` pada [`class-attendance-overview.tsx:187`](file:///C:/laragon/www/Ruang-Pintar/src/modules/attendance/presentation/class-attendance-overview.tsx#L187) saat belum ada presensi diambil, menghindari angka `0%` dingin yang mengesankan alpa massal.
- [ ] **Task 3.6:** Sembunyikan kartu Beban KBM di [`teacher-classes-view.tsx:278`](file:///C:/laragon/www/Ruang-Pintar/src/modules/learning/presentation/teacher-classes-view.tsx#L278) atau tampilkan status *"Belum Ditetapkan Kurikulum"* hingga SK jadwal resmi diterbitkan.

---

### WAVE 4: Dashboard Intelligence Berbasis Data Nyata
*Fokus:* Meningkatkan kapabilitas intelijen dashboard pengajar dengan analitik akurat dan lolos seluruh quality gate.

- [ ] **Task 4.1:** Hubungkan query deteksi otomatis siswa berisiko akademik pada `AttentionQueueCard` (alpa > 2 berturut-turut dari `presensi_sesi_kelas` atau nilai di bawah KKTP dari `nilai_siswa`).
- [ ] **Task 4.2:** Tampilkan kartu progres KBM guru yang transparan dan dapat diaudit oleh kepala sekolah (rasio sesi selesai vs target mingguan).
- [ ] **Task 4.3:** Jalankan seluruh Quality Gate & Regression Tests:
  ```bash
  npm run typecheck    # Wajib 0 errors
  npm run lint         # Wajib 0 errors
  npm run format:check # Wajib clean
  npm run test         # Seluruh Vitest suite wajib 100% PASS
  npm run build        # Next.js production build wajib PASS
  ```

---

# 6. Status Kepatuhan & Konfirmasi

- **KODE PRODUKSI SAMA SEKALI TIDAK DIUBAH**
- **DATABASE SAMA SEKALI TIDAK DIUBAH**
- **MIGRASI TIDAK DIBUAT**
- **COMMIT TIDAK DIBUAT**
- **DOKUMEN BACKLOG TELAH TERSIMPAN:** [`docs/PRODUCT-REALITY-REMEDIATION-BACKLOG.md`](file:///C:/laragon/www/Ruang-Pintar/docs/PRODUCT-REALITY-REMEDIATION-BACKLOG.md)

---
**READY FOR HUMAN REVIEW**  
**STOP**
