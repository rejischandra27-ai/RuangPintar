# UI-DATA-PROVENANCE-AUDIT.md
## Audit Keterlacakan Sumber Data Antarmuka (Data Provenance & Traceability Master Audit)
### Ruang Pintar — School Digital Operating Platform

| Field | Nilai |
| --- | --- |
| **Tahap Audit** | STAGE 11.1A — UI Data Provenance Audit (FINAL) |
| **Tujuan** | Memverifikasi ketertelusuran (*traceability*) seluruh 42 titik data metrik antarmuka terhadap database riil |
| **Cakupan** | 10 Rute Guru (`/dashboard`, `/kelas-saya`, `/jadwal-saya`, `/sesi-pembelajaran`, `/presensi-kelas`, `/penilaian`, `/cbt-ujian`, `/kalender-akademik`, `/pengumuman`, `/asisten-ai`) |
| **Status Gate** | `AUDIT ONLY` — Kode Tidak Diubah, Database Tidak Diubah (**STOP**) |
| **Versi Dokumen** | 2.0 (Canonical Master Provenance Index) |

---

# 1. Definisi & Kriteria Klasifikasi Provenance

Seluruh 42 metrik UI diklasifikasikan ke dalam 3 kelompok utama:

1. **`VALID`:** Data bersumber langsung dari database riil (*user-generated*), query dapat ditelusuri secara presisi, dan tidak perlu diubah.
2. **`DERIVED`:** Data hasil perhitungan matematis (count, sum, filter, aggregate) dari data database riil. Rumus dan tabel sumber teridentifikasi jelas.
3. **`SYNTHETIC`:** Data yang tidak berasal dari aktivitas nyata pengguna, mencakup:
   - Data hardcode
   - Placeholder visual tanpa query
   - Mock / data tiruan
   - Data injeksi / seed
   - Nilai default sepihak
   - Dummy statistic
   - Fake timeline
   - Fake score
   - Fake progress
   - Fake JP
   - Fake attendance
   - Fake alert

---

# 2. Rekapitulasi Data Provenance UI (42 Titik Data)

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                               DISTRIBUSI DATA PROVENANCE UI                                      │
├───────────────────────────────┬───────────────────────────────┬──────────────────────────────────┤
│    KATEGORI STATUS            │          JUMLAH TITIK         │           STATUS OPERASIONAL     │
├───────────────────────────────┼───────────────────────────────┼──────────────────────────────────┤
│ A. VALID                      │            11 Titik           │ AMAN (Dipertahankan)             │
│ B. DERIVED                    │            20 Titik           │ AMAN (Dipertahankan)             │
│ C. SYNTHETIC                  │            11 Titik           │ BERMASALAH (Wajib Dibersihkan)   │
├───────────────────────────────┼───────────────────────────────┼──────────────────────────────────┤
│ TOTAL TITIK METRIK DIAUDIT    │            42 Titik           │ 11 Titik Perlu Dieliminasi (26%) │
└───────────────────────────────┴───────────────────────────────┴──────────────────────────────────┘
```

---

# 3. Audit Rinci Seluruh 42 Titik Data Metrik UI

---

## 3.1. RUTE 1: Dashboard Cockpit Guru (`/dashboard`)
*Komponen:* `TeacherDashboard`, `PerformanceBarChart`, `AttentionQueueCard`, `TeachingTimelineRail`

| No | Label UI | Nilai Saat Ini | File Sumber | Baris | Query / Service | Tabel Sumber | Status |
|:---:|:---|:---:|:---|:---:|:---|:---|:---:|
| 1 | Sesi Hari Ini (Greeting) | `0 sesi` | `teacher-dashboard.tsx` | 202-204 | `prisma.jadwalPelajaran.findMany` (`mergedTodayBlocks.length`) | `jadwal_pelajaran` | `DERIVED` |
| 2 | Total Rombel (Greeting) | `1 rombel` | `teacher-dashboard.tsx` | 204-206 | `new Set(teacherClasses.map(c => c.rombel_id)).size` | `rombel` | `DERIVED` |
| 3 | Ketuntasan Penilaian (Skor) | `85.0` | `teacher-dashboard.tsx` | 119 | Fallback: `o.rata_rata_kelas ?? (o.total_published > 0 ? 88.0 : 85.0)` | `asesmen` (null) | **`SYNTHETIC`** |
| 4 | Kehadiran Kumulatif Siswa | `100.0%` / `0%` | `teacher-dashboard.tsx` | 166-168 | `(completedSessionsToday / totalSessionsToday) * 100` | `sesi_kelas` | **`SYNTHETIC`** |
| 5 | Donut Gauge: Siswa Hadir | `100%` | `teacher-dashboard.tsx` | 283 | Prop hardcode: `percentage={hasSessionsToday ? 100 : 0}` | Tanpa DB | **`SYNTHETIC`** |
| 6 | Donut Gauge: Tuntas KBM | `0%` - `100%` | `teacher-dashboard.tsx` | 288-297 | `Math.round((completed / total) * 100)` | `sesi_kelas` | `DERIVED` |
| 7 | Donut Gauge: Sakit/Izin | `0%` | `teacher-dashboard.tsx` | 298 | Prop hardcode: `percentage={0}` | Tanpa DB | **`SYNTHETIC`** |
| 8 | Donut Gauge: Jurnal Diisi | `100%` | `teacher-dashboard.tsx` | 300-304 | Prop hardcode: `percentage={hasSessionsToday ? 100 : 0}` | Tanpa DB | **`SYNTHETIC`** |
| 9 | Siswa Perlu Perhatian | Status "Optimal" | `attention-queue-card.tsx` | 131-145 | Default props `items=[]` (tanpa query DB) | Tanpa DB | **`SYNTHETIC`** |
| 10 | Batas Input Nilai PTS Gasal | `24 Sep • 23:59` | `teaching-timeline-rail.tsx` | 211-215 | Elemen statis JSX tanpa query DB | Tanpa DB | **`SYNTHETIC`** |
| 11 | Rapat Koordinasi Kurikulum | `28 Sep • 13:00` | `teaching-timeline-rail.tsx` | 236-240 | Elemen statis JSX tanpa query DB | Tanpa DB | **`SYNTHETIC`** |

---

## 3.2. RUTE 2: Kelas Saya & Workspace (`/kelas-saya` & `/kelas-saya/[id]`)
*Komponen:* `TeacherClassesView`, `ClassWorkspaceView`

| No | Label UI | Nilai Saat Ini | File Sumber | Baris | Query / Service | Tabel Sumber | Status |
|:---:|:---|:---:|:---|:---:|:---|:---|:---:|
| 12 | Total Rombel / Kelas (Card) | `1 Kelas` | `teacher-classes-view.tsx` | 258-260 | `new Set(filtered.map(c => c.rombel_id)).size` | `rombel` | `DERIVED` |
| 13 | Total Mapel & Penugasan | `1 Mapel • 1 Penugasan` | `teacher-classes-view.tsx` | 263 | `new Set(mapel_id).size` & `penugasan.length` | `penugasan_mengajar` | `DERIVED` |
| 14 | Beban KBM (Summary Card) | `3 JP per minggu` | `teacher-classes-view.tsx` | 278-283 | `sum(c.jumlah_jam_minggu)` (injeksi service) | `penugasan_mengajar` | **`SYNTHETIC`** |
| 15 | Siswa Binaan (Summary Card) | `38 Siswa` | `teacher-classes-view.tsx` | 298, 305 | `sum(c.total_siswa)` dari `penempatan_rombel` | `penempatan_rombel` | `VALID` |
| 16 | Lingkup Materi (Summary Card)| `0 BAB kurikulum` | `teacher-classes-view.tsx` | 324-331 | `sum(c.total_bab)` dari `tujuan_pembelajaran` | `tujuan_pembelajaran`| `DERIVED` |
| 17 | Badge JP pada Kartu Rombel | `3 JP / mgg` | `teacher-classes-view.tsx` | 794 | `c.jumlah_jam_minggu` (injeksi service) | `penugasan_mengajar` | **`SYNTHETIC`** |
| 18 | Matriks 4 Kolom: BAB | `0` | `teacher-classes-view.tsx` | 831 | `c.total_bab` (count `lingkup_materi`) | `tujuan_pembelajaran`| `VALID` |
| 19 | Matriks 4 Kolom: Materi | `0` | `teacher-classes-view.tsx` | 839 | `c.total_materi` (count `publikasi_materi`) | `materi_pembelajaran`| `VALID` |
| 20 | Matriks 4 Kolom: Tugas | `0` | `teacher-classes-view.tsx` | 847 | `c.total_tugas` (count `publikasi_tugas`) | `tugas_pembelajaran` | `VALID` |
| 21 | Matriks 4 Kolom: Jurnal | `0` | `teacher-classes-view.tsx` | 855 | `c.total_jurnal` (count `administrasi_pembelajaran`) | `jurnal_guru` | `VALID` |
| 22 | Jumlah Siswa Kartu Rombel | `38 Siswa` | `teacher-classes-view.tsx` | 865 | `c.total_siswa` (count `penempatan_rombel`) | `penempatan_rombel` | `VALID` |
| 23 | Badge JP di Workspace Header | `3 JP / Minggu` | `class-workspace-view.tsx` | 301 | `penugasan.jumlah_jam_minggu` (injeksi service) | `penugasan_mengajar` | **`SYNTHETIC`** |

---

## 3.3. RUTE 3: Jadwal Mengajar Guru (`/jadwal-saya`)
*Komponen:* `MySchedulePage`, `MyScheduleView`

| No | Label UI | Nilai Saat Ini | File Sumber | Baris | Query / Service | Tabel Sumber | Status |
|:---:|:---|:---:|:---|:---:|:---|:---|:---:|
| 24 | Total Sesi (Hero Badge) | `0 Jam` | `jadwal-saya/page.tsx` | 155 | `entries.length` (jumlah entri jadwal) | `jadwal_pelajaran` | `DERIVED` |
| 25 | Mata Pelajaran (Hero Badge) | `0` | `jadwal-saya/page.tsx` | 162-164 | `new Set(entries.map(e => e.mapel_id)).size` | `jadwal_pelajaran` | `DERIVED` |
| 26 | Rombel (Hero Badge) | `0` | `jadwal-saya/page.tsx` | 169-171 | `new Set(entries.map(e => e.rombel_id)).size` | `jadwal_pelajaran` | `DERIVED` |
| 27 | Total Mengajar di Viewport | `0 JP / Minggu` | `my-schedule-view.tsx` | 180 | `{entries.length} JP / Minggu` | `jadwal_pelajaran` | `DERIVED` |

---

## 3.4. RUTE 4: Sesi Pembelajaran KBM (`/sesi-pembelajaran`)
*Komponen:* `ClassSessionsPage`

| No | Label UI | Nilai Saat Ini | File Sumber | Baris | Query / Service | Tabel Sumber | Status |
|:---:|:---|:---:|:---|:---|:---:|:---|:---|:---:|
| 28 | Kelas Berlangsung | `0` | `sesi-pembelajaran/page.tsx`| 127-129 | `sessions.filter(s => s.status === 'DIMULAI').length` | `sesi_kelas` | `DERIVED` |
| 29 | Sesi Selesai | `0` | `sesi-pembelajaran/page.tsx`| 134-136 | `sessions.filter(s => s.status === 'SELESAI').length` | `sesi_kelas` | `DERIVED` |
| 30 | Total Riwayat Sesi | `0` | `sesi-pembelajaran/page.tsx`| 141-143 | `sessions.length` | `sesi_kelas` | `DERIVED` |
| 31 | Rombel Terlayani | `1` | `sesi-pembelajaran/page.tsx`| 148-150 | `rombelsData.length` (`prisma.rombel.findMany`) | `rombel` | `DERIVED` |

---

## 3.5. RUTE 5: Presensi Kehadiran (`/presensi-kelas`)
*Komponen:* `ClassAttendanceOverview`

| No | Label UI | Nilai Saat Ini | File Sumber | Baris | Query / Service | Tabel Sumber | Status |
|:---:|:---|:---:|:---|:---:|:---|:---|:---:|
| 32 | Rata-rata Kehadiran Kumulatif| `0%` | `class-attendance-overview.tsx` | 83-87, 187 | `sum(c.stats.rata_rata_kehadiran) / classes.length` | `sesi_kelas` | `DERIVED` |
| 33 | Presensi Terekam per Rombel | `0 Sesi` | `class-attendance-overview.tsx` | 484-490 | `c.stats.total_presensi_diambil` | `sesi_kelas` | `VALID` |

---

## 3.6. RUTE 6: Penilaian & Rapor (`/penilaian`)
*Komponen:* `TeacherGradebookOverviewView`

| No | Label UI | Nilai Saat Ini | File Sumber | Baris | Query / Service | Tabel Sumber | Status |
|:---:|:---|:---:|:---|:---:|:---|:---|:---:|
| 34 | Total Kelas Diampu | `1` | `teacher-gradebook-overview-view.tsx` | 84-85 | `overviewList.length` (`penugasan_mengajar`) | `penugasan_mengajar` | `VALID` |
| 35 | Rekap Asesmen & Rata-rata | `0 Asesmen • -`| `teacher-gradebook-overview-view.tsx` | 162, 167 | `c.total_asesmen` & `c.rata_rata_kelas` (null) | `asesmen` / `nilai` | `VALID` |

---

## 3.7. RUTE 7: CBT Ujian Online (`/cbt-ujian`)
*Komponen:* `CbtHubOverviewView`, `gemini-cbt-ai-service.ts`

| No | Label UI | Nilai Saat Ini | File Sumber | Baris | Query / Service | Tabel Sumber | Status |
|:---:|:---|:---:|:---|:---:|:---|:---|:---:|
| 36 | Total Ujian & Peserta | `0 Ujian • 0` | `cbt-hub-overview-view.tsx` | 131-135 | `sum(c.total_ujian)` & `sum(total_peserta)` | `ujian_cbt` | `DERIVED` |
| 37 | Generator Naskah Ujian AI | 10 Soal Sejarah| `gemini-cbt-ai-service.ts` | 173, 280 | `generateFallbackMixedExam(params)` | Internal Engine | `DERIVED` |

---

## 3.8. RUTE 8: Kalender Akademik (`/kalender-akademik`)
*Komponen:* `AcademicCalendarPage`

| No | Label UI | Nilai Saat Ini | File Sumber | Baris | Query / Service | Tabel Sumber | Status |
|:---:|:---|:---:|:---|:---:|:---|:---|:---:|
| 38 | Total Agenda & Hari Libur | `0 Agenda • 0` | `kalender-akademik/page.tsx` | 107, 114 | `events.length` & `filter(tipe.includes('LIBUR'))` | `kalender_akademik` | `DERIVED` |
| 39 | Periode Ujian & Kegiatan | `0 Periode • 0`| `kalender-akademik/page.tsx` | 121, 128 | `filter(tipe === 'UJIAN')` & `filter(KEGIATAN)` | `kalender_akademik` | `DERIVED` |

---

## 3.9. RUTE 9: Pengumuman Sekolah (`/pengumuman`)
*Komponen:* `AnnouncementDirectoryView`

| No | Label UI | Nilai Saat Ini | File Sumber | Baris | Query / Service | Tabel Sumber | Status |
|:---:|:---|:---:|:---|:---:|:---|:---|:---:|
| 40 | Tab Kategori Pengumuman | 5 Tab Kategori | `announcement-directory-view.tsx` | 154-159 | `communicationService.getAnnouncementsForUser` | `pengumuman` | `VALID` |

---

## 3.10. RUTE 10: Asisten AI Guru (`/asisten-ai`)
*Komponen:* `AiTeacherStudioView`

| No | Label UI | Nilai Saat Ini | File Sumber | Baris | Query / Service | Tabel Sumber | Status |
|:---:|:---|:---:|:---|:---:|:---|:---|:---:|
| 41 | Model AI Aktif | `GEMINI-3.6-FLASH` | `ai-teacher-studio-view.tsx` | 61, 345 | `localStorage.getItem("rp_gemini_model")` | Client Storage | `VALID` |
| 42 | Status Kunci API | "Mesin Cerdas..." | `ai-teacher-studio-view.tsx` | 348 | Ternary `{apiKey ? ... : "Mesin Cerdas Fallback Siap"}` | Client State | `DERIVED` |

---

# 4. Daftar Lengkap Seluruh Komponen SYNTHETIC (11 Titik Data)

Berikut rincian ke-11 komponen/metrik berstatus `SYNTHETIC`:

### 1. Ketuntasan Penilaian (Skor Kelas Tertinggi)
- **Nama Komponen:** `PerformanceBarChart` (dipanggil di `TeacherDashboard`)
- **Route:** `/dashboard`
- **File:** `src/shared/components/dashboard/role-views/teacher-dashboard.tsx`
- **Baris Kode:** Baris 119
- **Nilai yang Tampil:** `85.0` (atau `88.0` jika ada asesmen terbit)
- **Alasan Mengapa Nilai Tersebut Muncul:** Developer menyuntikkan fallback angka statis agar grafik batang tidak terlihat kosong saat pertama kali dibuka.
- **Sumber Data Sebenarnya yang Seharusnya Digunakan:** Nilai riil `o.rata_rata_kelas` dari tabel `nilai_siswa` melalui `assessmentService.getTeacherOverview`. Jika bernilai `null`, sistem wajib menampilkan *empty state* faktual tanpa angka buatan.

### 2. Kehadiran Kumulatif Siswa Binaan
- **Nama Komponen:** Rekap Presensi Rombel (`TeacherDashboard`)
- **Route:** `/dashboard`
- **File:** `src/shared/components/dashboard/role-views/teacher-dashboard.tsx`
- **Baris Kode:** Baris 166–168 & 255–277
- **Nilai yang Tampil:** `100.0%` (saat ada sesi KBM selesai) / `0%`
- **Alasan Mengapa Nilai Tersebut Muncul:** Rumus menghitung rasio sesi guru (`completedSessions / totalSessions`), namun dilabeli sebagai kehadiran siswa. Jika guru menuntaskan sesi tanpa absensi, siswa otomatis diklaim 100% hadir.
- **Sumber Data Sebenarnya yang Seharusnya Digunakan:** Agregasi rekaman riil siswa berstatus `HADIR` dari tabel `presensi_sesi_kelas` dibagi total siswa terdaftar pada rombel.

### 3. Donut Gauge: Siswa Hadir
- **Nama Komponen:** Donut Gauge Presensi (`TeacherDashboard`)
- **Route:** `/dashboard`
- **File:** `src/shared/components/dashboard/role-views/teacher-dashboard.tsx`
- **Baris Kode:** Baris 283
- **Nilai yang Tampil:** `100%` (saat ada sesi)
- **Alasan Mengapa Nilai Tersebut Muncul:** Hardcoded prop ternary `percentage={hasSessionsToday ? 100 : 0}` yang mengasumsikan seluruh siswa hadir jika ada sesi.
- **Sumber Data Sebenarnya yang Seharusnya Digunakan:** Persentase riil kehadiran siswa dari rekaman `presensi_sesi_kelas` hari berjalan.

### 4. Donut Gauge: Sakit/Izin
- **Nama Komponen:** Donut Gauge Presensi (`TeacherDashboard`)
- **Route:** `/dashboard`
- **File:** `src/shared/components/dashboard/role-views/teacher-dashboard.tsx`
- **Baris Kode:** Baris 298
- **Nilai yang Tampil:** `0%` permanen
- **Alasan Mengapa Nilai Tersebut Muncul:** Hardcoded prop statis `percentage={0}` untuk melengkapi grid 4 kolom antarmuka.
- **Sumber Data Sebenarnya yang Seharusnya Digunakan:** Persentase riil siswa berstatus `SAKIT` atau `IZIN` dari tabel `presensi_sesi_kelas` hari ini.

### 5. Donut Gauge: Jurnal Diisi
- **Nama Komponen:** Donut Gauge Presensi (`TeacherDashboard`)
- **Route:** `/dashboard`
- **File:** `src/shared/components/dashboard/role-views/teacher-dashboard.tsx`
- **Baris Kode:** Baris 300–304
- **Nilai yang Tampil:** `100%` (saat ada sesi)
- **Alasan Mengapa Nilai Tersebut Muncul:** Hardcoded prop ternary `percentage={hasSessionsToday ? 100 : 0}` yang mengasumsikan jurnal otomatis terisi penuh saat sesi dimulai.
- **Sumber Data Sebenarnya yang Seharusnya Digunakan:** Verifikasi keterisian catatan KBM pada tabel `jurnal_guru` atau `catatan_kbm` untuk sesi yang telah diselesaikan.

### 6. Status Siswa Perlu Perhatian (Attention Queue)
- **Nama Komponen:** `AttentionQueueCard` (dipanggil di `TeacherDashboard`)
- **Route:** `/dashboard`
- **File:** `src/shared/components/dashboard/cockpit/attention-queue-card.tsx` & `teacher-dashboard.tsx`
- **Baris Kode:** Baris 131–145 (`attention-queue-card.tsx`) & Baris 310 (`teacher-dashboard.tsx`)
- **Nilai yang Tampil:** Pesan banner status *"Semua Siswa Terpantau Optimal"*
- **Alasan Mengapa Nilai Tersebut Muncul:** Komponen dipanggil dengan props kosong `items=[]` tanpa menyambungkan ke query pendeteksi data riil.
- **Sumber Data Sebenarnya yang Seharusnya Digunakan:** Query evaluasi riil terhadap siswa berisiko (alpa berturut-turut pada `presensi_sesi_kelas`, tugas belum dikumpulkan pada `tugas_siswa`, atau nilai di bawah KKTP pada `nilai_siswa`).

### 7. Agenda: Batas Penginputan Nilai PTS Gasal
- **Nama Komponen:** `TeachingTimelineRail` (Timeline Cockpit Guru)
- **Route:** `/dashboard`
- **File:** `src/shared/components/dashboard/cockpit/teaching-timeline-rail.tsx`
- **Baris Kode:** Baris 211–215
- **Nilai yang Tampil:** `"Batas Penginputan Nilai PTS Gasal • 24 Sep 2026 • 23:59 WIB"`
- **Alasan Mengapa Nilai Tersebut Muncul:** Teks statis JSX disematkan langsung untuk mockup visual kolom kanan dashboard.
- **Sumber Data Sebenarnya yang Seharusnya Digunakan:** Query agenda akademik mendatang dari tabel `kalender_akademik` (`tanggal_mulai >= hari_ini`).

### 8. Agenda: Rapat Koordinasi Evaluasi Kurikulum
- **Nama Komponen:** `TeachingTimelineRail` (Timeline Cockpit Guru)
- **Route:** `/dashboard`
- **File:** `src/shared/components/dashboard/cockpit/teaching-timeline-rail.tsx`
- **Baris Kode:** Baris 236–240
- **Nilai yang Tampil:** `"Rapat Koordinasi Evaluasi Kurikulum • 28 Sep 2026 • 13:00 WIB"`
- **Alasan Mengapa Nilai Tersebut Muncul:** Teks statis JSX disematkan langsung untuk mockup visual agenda sekolah.
- **Sumber Data Sebenarnya yang Seharusnya Digunakan:** Query kegiatan sekolah resmi dari tabel `kalender_akademik` atau tabel `pengumuman`.

### 9. Beban KBM (Summary Card Kelas)
- **Nama Komponen:** `TeacherClassesView` (Top Summary Cards)
- **Route:** `/kelas-saya`
- **File:** `src/modules/learning/presentation/teacher-classes-view.tsx` & `src/modules/ai-assistant/application/smart-onboarding-service.ts`
- **Baris Kode:** Baris 278–283 (`teacher-classes-view.tsx`) & Baris 384 (`smart-onboarding-service.ts`)
- **Nilai yang Tampil:** `3 JP per minggu`
- **Alasan Mengapa Nilai Tersebut Muncul:** Service onboarding mandiri menyuntikkan nilai hardcode `jumlah_jam_minggu: 3` ke dalam database tanpa input guru atau SK kurikulum.
- **Sumber Data Sebenarnya yang Seharusnya Digunakan:** Alokasi jam pelajaran resmi dari SK Pembagian Tugas Mengajar Kurikulum. Jika belum ada SK, nilai harus bernilai `null` atau `0`.

### 10. Badge JP pada Kartu Rombel Belajar
- **Nama Komponen:** `TeacherClassesView` (Rombel Grid Card)
- **Route:** `/kelas-saya`
- **File:** `src/modules/learning/presentation/teacher-classes-view.tsx`
- **Baris Kode:** Baris 794
- **Nilai yang Tampil:** `3 JP / mgg`
- **Alasan Mengapa Nilai Tersebut Muncul:** Menampilkan nilai kolom `jumlah_jam_minggu` hasil injeksi otomatis service onboarding pada setiap kartu rombel.
- **Sumber Data Sebenarnya yang Seharusnya Digunakan:** Nilai resmi jadwal kurikulum yang telah diverifikasi sekolah.

### 11. Badge JP di Header Ruang Kerja Kelas
- **Nama Komponen:** `ClassWorkspaceView` (Header Workspace)
- **Route:** `/kelas-saya/[id]`
- **File:** `src/modules/learning/presentation/class-workspace-view.tsx`
- **Baris Kode:** Baris 301
- **Nilai yang Tampil:** `3 JP / Minggu`
- **Alasan Mengapa Nilai Tersebut Muncul:** Menampilkan nilai kolom `penugasan.jumlah_jam_minggu` hasil injeksi otomatis service onboarding.
- **Sumber Data Sebenarnya yang Seharusnya Digunakan:** Alokasi jam pelajaran resmi institusi atau disembunyikan jika jadwal belum ditetapkan.

---

# 5. Audit Khusus Menu Kelas Saya (`/kelas-saya`)

Audit khusus terhadap arsitektur data pada modul Kelas Saya:

### 5.1. Asal Usul 5 Metrik Inti Kelas Saya
1. **Dari mana angka jumlah siswa berasal?**  
   Berasal dari query relasi `prisma.penugasanMengajar.findMany` dengan include `rombel.penempatan_rombel` (`where: { status: 'AKTIF' }`). Nilai dihitung via `a.rombel.penempatan_rombel.length` di `learning-repository.ts:107`. Angka 38 siswa adalah **REAL** dari tabel database `penempatan_rombel`.
2. **Dari mana angka JP/Minggu berasal?**  
   Berasal dari kolom `jumlah_jam_minggu` pada tabel `penugasan_mengajar`. Di database bernilai 3 karena diinjeksi secara hardcode oleh `smart-onboarding-service.ts:384` (`jumlah_jam_minggu: 3`). Data ini adalah **SYNTHETIC** (beban fiktif).
3. **Dari mana status kelas berasal?**  
   Berasal dari kolom `status` pada tabel `penugasan_mengajar` (`a.status = 'AKTIF'`). Data ini adalah **REAL**.
4. **Dari mana progress kelas berasal?**  
   Tidak ada persentase progres buatan; progres disajikan dalam bentuk 4 counter konten KBM pada `learning-repository.ts:108-111`:
   - `total_bab`: `a.lingkup_materi.length` (`tujuan_pembelajaran`) &rarr; bernilai `0`
   - `total_materi`: `a.publikasi_materi.length` (`materi_pembelajaran`) &rarr; bernilai `0`
   - `total_tugas`: `a.publikasi_tugas.length` (`tugas_pembelajaran`) &rarr; bernilai `0`
   - `total_jurnal`: `a.administrasi_pembelajaran.length` (`jurnal_guru`) &rarr; bernilai `0`  
   Seluruh counter ini adalah **REAL** (akurat bernilai 0 karena modul ajar belum dibuat).
5. **Dari mana statistik kelas berasal?**  
   Berasal dari perhitungan client-side `useMemo` di `teacher-classes-view.tsx:258-324` yang mengagregasikan array penugasan kelas (`uniqueRombelsCount`, `totalJP`, `totalSiswa`, `totalBAB`).

### 5.2. Klasifikasi Seluruh Card pada Menu Kelas Saya
1. **Summary Card 1: Total Rombel / Kelas (`1 Kelas`):** **`DERIVED`** (Agregasi distinct `rombel_id`).
2. **Summary Card 2: Beban KBM (`3 JP per minggu`):** **`SYNTHETIC`** (Agregasi dari kolom injeksi hardcode 3 JP).
3. **Summary Card 3: Siswa Binaan (`38 Siswa`):** **`REAL`** (Penjumlahan data riil siswa terdaftar).
4. **Summary Card 4: Lingkup Materi (`0 BAB kurikulum`):** **`DERIVED`** (Penjumlahan riil count tujuan pembelajaran).
5. **Card Rombel Belajar (Grid Item `X TO 3 - KKA`):**
   - Header Kelas & Mapel: **`REAL`**
   - Badge JP (`3 JP / mgg`): **`SYNTHETIC`**
   - Matriks 4 Kolom (BAB: 0, Materi: 0, Tugas: 0, Jurnal: 0): **`REAL`**
   - Footer Siswa (`38 Siswa`): **`REAL`**
6. **Card Workspace Header (`/kelas-saya/[id]`):**
   - Nama Rombel & Mapel: **`REAL`**
   - Badge JP (`3 JP / Minggu`): **`SYNTHETIC`**
   - Badge Siswa (`38 Siswa`): **`REAL`**

---

# 6. Tabel Matriks Prioritas

| Tingkat Prioritas | Kriteria Dampak | Titik Metrik Terdampak |
|:---|:---|:---|
| **PRIORITAS KRITIS** | **Menyesatkan Pengguna & Bertentangan dengan Kondisi Database:**<br>• Memalsukan ketuntasan siswa<br>• Memalsukan absensi 100%<br>• Menyembunyikan siswa sakit/izin<br>• Mengklaim administrasi selesai<br>• Deadline & rapat dinas fiktif<br>• Beban mengajar kurikulum fiktif | 1. Skor 85.0/88.0 (`teacher-dashboard.tsx:119`)<br>2. Kehadiran 100.0% dari KBM (`teacher-dashboard.tsx:166`)<br>3. Gauge Siswa Hadir 100% (`teacher-dashboard.tsx:283`)<br>4. Gauge Sakit/Izin 0% (`teacher-dashboard.tsx:298`)<br>5. Gauge Jurnal Diisi 100% (`teacher-dashboard.tsx:300`)<br>6. Agenda Batas Input PTS (`teaching-timeline-rail.tsx:215`)<br>7. Agenda Rapat Kurikulum (`teaching-timeline-rail.tsx:239`)<br>8. Beban KBM 3 JP (`teacher-classes-view.tsx:278`)<br>9. Badge 3 JP/mgg (`teacher-classes-view.tsx:794`)<br>10. Badge 3 JP Header (`class-workspace-view.tsx:301`) |
| **PRIORITAS TINGGI** | **Tidak Akurat Namun Tidak Berbahaya Langsung:**<br>• Status optimal prematur sebelum ada KBM<br>• Klaim "terlayani" sebelum ada sesi selesai<br>• Scope rombel sekolah vs rombel pengampu<br>• 0% presensi dingin di awal semester<br>• Kerancuan jam 60 menit vs Jam Pelajaran (JP) | 1. Status Optimal Attention Queue (`attention-queue-card.tsx:131`)<br>2. Siswa Binaan label "terlayani" (`teacher-classes-view.tsx:305`)<br>3. Rombel Terlayani scope sekolah (`sesi-pembelajaran/page.tsx:150`)<br>4. Rata-rata Kehadiran 0% dingin (`class-attendance-overview.tsx:187`)<br>5. Total Sesi 0 Jam vs JP (`jadwal-saya/page.tsx:155`)<br>6. Viewport Jadwal 0 JP (`my-schedule-view.tsx:180`) |
| **PRIORITAS MENENGAH** | **Placeholder Visual & Fallback Display:**<br>• Generator soal statis cadangan offline<br>• Masking status mesin offline sebagai fallback siap | 1. Naskah Soal Ujian Fallback (`gemini-cbt-ai-service.ts:173`)<br>2. Status Kunci API Fallback Siap (`ai-teacher-studio-view.tsx:348`) |

---

# 7. Daftar Komponen yang Harus Dibersihkan pada STAGE 11.2

Target utama eksekusi pembersihan pada STAGE 11.2 adalah **11 komponen/metrik SYNTHETIC**:

```
[TARGET PEMBERSIHAN STAGE 11.2]
  │
  ├── 1. teacher-dashboard.tsx:119
  │    └── score: o.rata_rata_kelas ?? (o.total_published > 0 ? 88.0 : 85.0)
  │
  ├── 2. teacher-dashboard.tsx:166-168
  │    └── attendanceRate = (completedSessionsToday / totalSessionsToday) * 100
  │
  ├── 3. teacher-dashboard.tsx:283
  │    └── <DonutGauge percentage={hasSessionsToday ? 100 : 0} label="Siswa Hadir" />
  │
  ├── 4. teacher-dashboard.tsx:298
  │    └── <DonutGauge percentage={0} label="Sakit/Izin" />
  │
  ├── 5. teacher-dashboard.tsx:300
  │    └── <DonutGauge percentage={hasSessionsToday ? 100 : 0} label="Jurnal Diisi" />
  │
  ├── 6. teacher-dashboard.tsx:310 & attention-queue-card.tsx:131-145
  │    └── <AttentionQueueCard /> (Pesan default: "Semua Siswa Terpantau Optimal")
  │
  ├── 7. teaching-timeline-rail.tsx:211-215
  │    └── Teks statis JSX: "Batas Penginputan Nilai PTS Gasal • 24 Sep 2026 • 23:59 WIB"
  │
  ├── 8. teaching-timeline-rail.tsx:236-240
  │    └── Teks statis JSX: "Rapat Koordinasi Evaluasi Kurikulum • 28 Sep 2026 • 13:00 WIB"
  │
  ├── 9. smart-onboarding-service.ts:384 & teacher-classes-view.tsx:278
  │    └── Injeksi hardcode jumlah_jam_minggu: 3 & Summary Card Beban KBM: 3 JP
  │
  ├── 10. teacher-classes-view.tsx:794
  │    └── Badge "3 JP / mgg" pada kartu direktori kelas
  │
  └── 11. class-workspace-view.tsx:301
       └── Badge "3 JP / Minggu" pada header detail workspace kelas
```

---

# 8. Kepatuhan Instruksi & Status Gate

Sesuai instruksi baku:
- **KODE PRODUKSI SAMA SEKALI TIDAK DIUBAH**
- **DATABASE SAMA SEKALI TIDAK DIUBAH**
- **FITUR BARU TIDAK DIBUAT**
- **SOLUSI IMPLEMENTASI TIDAK DIBERIKAN**

Audit STAGE 11.1A telah selesai 100% dengan dokumen canonical terbarui.

---
**READY FOR HUMAN REVIEW**  
**STOP**
