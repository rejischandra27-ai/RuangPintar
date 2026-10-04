# INVALID-UI-DATA-INVENTORY.md
## Inventaris Forensik Data UI Tidak Valid (Invalid UI Data Eradication)
### Ruang Pintar — School Digital Operating Platform

| Field | Nilai |
| --- | --- |
| **Tahap Audit** | STAGE 11.1B — Forensic Invalid UI Data Eradication |
| **Dasar Penyelidikan** | Audit Keterlacakan Data Provenance STAGE 11.1A |
| **Tujuan** | Menginventarisasi seluruh data UI fiktif, angka statis, persentase palsu, deadline rekayasa, dan beban kerja tanpa dasar database untuk dieliminasi total pada STAGE 11.2 |
| **Cakupan** | 10 Menu Sidebar Workspace Guru |
| **Status Gate** | `AUDIT & FORENSIC ONLY` — Tanpa Perubahan Kode Produksi, Tanpa Migrasi Database (**STOP**) |
| **Versi Dokumen** | 1.0 (Canonical Eradication Master Inventory) |

---

# 1. Ringkasan Eksekutif

Penyelidikan forensik terhadap 10 menu antarmuka pengajar membuktikan bahwa dari **42 titik data metrik aktif**:
- **31 Titik Data (73.8%):** Berasal dari database riil (`VALID_REAL_DATA` dan `DERIVED_REAL_DATA`).
- **11 Titik Data (26.2%):** Merupakan data tidak valid (`SYNTHETIC_FAKE_DATA` dan `HARDCODED`) yang tidak memiliki dasar operasional riil dari aktivitas pengguna.

Seluruh 11 titik data tidak valid ini terkonsentrasi pada modul harian guru (**Dashboard Cockpit Guru** dan **Direktori & Workspace Kelas Saya**), memalsukan capaian belajar siswa, mengaburkan absensi fisik siswa, dan menciptakan klaim jam kerja mengajar yang tidak pernah disahkan oleh kurikulum sekolah.

---

# 2. Katalog Lengkap Seluruh Metrik INVALID

Berikut adalah rincian forensik terhadap seluruh metrik tidak valid:

---

### METRIK INVALID 1: Fallback Skor Ketuntasan Penilaian (85.0 / 88.0)
- **Nama Metrik:** Skor Rata-rata Kelas Tertinggi / Ketuntasan Penilaian
- **Halaman:** `/dashboard`
- **Komponen:** `PerformanceBarChart` (dipanggil di `TeacherDashboard`)
- **File:** [`src/shared/components/dashboard/role-views/teacher-dashboard.tsx`](file:///C:/laragon/www/Ruang-Pintar/src/shared/components/dashboard/role-views/teacher-dashboard.tsx)
- **Nomor Baris:** Baris 119
- **Nilai Yang Ditampilkan:** `85.0` (atau `88.0` jika terdapat asesmen terbit)
- **Sumber Nilai Saat Ini:** Ekspresi ternary fallback inline:  
  `score: o.rata_rata_kelas ?? (o.total_published > 0 ? 88.0 : 85.0)`
- **Mengapa Tidak Valid:** Akun guru (`guru_chandra`) pada rombel binaan (`X TO 3`) belum pernah membuat asesmen dan belum pernah menilai tugas siswa (`o.rata_rata_kelas === null`). Angka 85.0 adalah nilai sintetis buatan sistem.
- **Data Riil Yang Seharusnya Digunakan:** Nilai murni `o.rata_rata_kelas` dari tabel `nilai_siswa` melalui `assessmentService.getTeacherOverview`. Jika bernilai `null`, wajib mempertahankan nilai `null`.
- **Rekomendasi Perbaikan:** Hapus nilai fallback angka 85.0/88.0. Ganti dengan *empty state* faktual: *"Belum Ada Nilai Masuk — Buku nilai semester aktif belum memiliki asesmen yang dinilai."*

---

### METRIK INVALID 2: Kehadiran Kumulatif Siswa Binaan (100.0%)
- **Nama Metrik:** Kehadiran Kumulatif Siswa Binaan
- **Halaman:** `/dashboard`
- **Komponen:** Rekap Presensi Rombel (`TeacherDashboard`)
- **File:** [`src/shared/components/dashboard/role-views/teacher-dashboard.tsx`](file:///C:/laragon/www/Ruang-Pintar/src/shared/components/dashboard/role-views/teacher-dashboard.tsx)
- **Nomor Baris:** Baris 166–168 & 255–277
- **Nilai Yang Ditampilkan:** `100.0%` (saat 1 sesi selesai) / `0%`
- **Sumber Nilai Saat Ini:** Rumus rasio KBM guru:  
  `const attendanceRate = hasSessionsToday ? ((completedSessionsToday / totalSessionsToday) * 100).toFixed(1) : "0";`
- **Mengapa Tidak Valid:** Menghitung rasio jam mengajar guru yang telah diselesaikan, tetapi disajikan di bawah label kehadiran fisik siswa. Guru yang menutup sesi tanpa memanggil absensi murid otomatis mengklaim siswa hadir 100%. Melanggar domain invariant: `School Attendance ≠ Class Session Attendance`.
- **Data Riil Yang Seharusnya Digunakan:** Jumlah siswa berstatus `HADIR` dari tabel `presensi_sesi_kelas` dibagi total 38 siswa terdaftar pada rombel.
- **Rekomendasi Perbaikan:** Pisahkan secara tegas menjadi 2 metrik berbeda: (a) Progres KBM Guru (`completedSessions / totalSessions`), (b) Rekap Kehadiran Siswa Riil dari tabel `presensi_sesi_kelas`.

---

### METRIK INVALID 3: Donut Gauge "Siswa Hadir" (100%)
- **Nama Metrik:** Donut Gauge Persentase Siswa Hadir Hari Ini
- **Halaman:** `/dashboard`
- **Komponen:** `DonutGauge` (`TeacherDashboard`)
- **File:** [`src/shared/components/dashboard/role-views/teacher-dashboard.tsx`](file:///C:/laragon/www/Ruang-Pintar/src/shared/components/dashboard/role-views/teacher-dashboard.tsx)
- **Nomor Baris:** Baris 283
- **Nilai Yang Ditampilkan:** `100%` (saat ada sesi mengajar hari ini)
- **Sumber Nilai Saat Ini:** Hardcoded prop ternary:  
  `<DonutGauge percentage={hasSessionsToday ? 100 : 0} label="Siswa Hadir" color="emerald" size={62} />`
- **Mengapa Tidak Valid:** Pengembang mengasumsikan bahwa apabila hari ini terdapat sesi mengajar, maka seluruh siswa (100%) otomatis hadir di kelas tanpa memverifikasi data presensi aktual.
- **Data Riil Yang Seharusnya Digunakan:** Persentase riil kehadiran siswa dari lembar absensi sesi KBM hari berjalan.
- **Rekomendasi Perbaikan:** Hubungkan prop `percentage` ke agregasi riil record `presensi_sesi_kelas` hari ini. Tampilkan `-` atau `0%` jika presensi belum diambil.

---

### METRIK INVALID 4: Donut Gauge "Sakit/Izin" (0%)
- **Nama Metrik:** Donut Gauge Persentase Siswa Sakit/Izin
- **Halaman:** `/dashboard`
- **Komponen:** `DonutGauge` (`TeacherDashboard`)
- **File:** [`src/shared/components/dashboard/role-views/teacher-dashboard.tsx`](file:///C:/laragon/www/Ruang-Pintar/src/shared/components/dashboard/role-views/teacher-dashboard.tsx)
- **Nomor Baris:** Baris 298
- **Nilai Yang Ditampilkan:** `0%` permanen
- **Sumber Nilai Saat Ini:** Hardcoded prop statis:  
  `<DonutGauge percentage={0} label="Sakit/Izin" color="amber" size={62} />`
- **Mengapa Tidak Valid:** Nilai 0% dipatok secara permanen di kode JSX tanpa pernah memeriksa apakah ada siswa yang berhalangan sakit atau izin pada hari berjalan.
- **Data Riil Yang Seharusnya Digunakan:** Persentase riil siswa berstatus `SAKIT` atau `IZIN` dari tabel `presensi_sesi_kelas`.
- **Rekomendasi Perbaikan:** Sambungkan ke kalkulasi persentase siswa berstatus `SAKIT` atau `IZIN` dari lembar presensi kelas hari ini.

---

### METRIK INVALID 5: Donut Gauge "Jurnal Diisi" (100%)
- **Nama Metrik:** Donut Gauge Persentase Pengisian Jurnal Mengajar
- **Halaman:** `/dashboard`
- **Komponen:** `DonutGauge` (`TeacherDashboard`)
- **File:** [`src/shared/components/dashboard/role-views/teacher-dashboard.tsx`](file:///C:/laragon/www/Ruang-Pintar/src/shared/components/dashboard/role-views/teacher-dashboard.tsx)
- **Nomor Baris:** Baris 300–304
- **Nilai Yang Ditampilkan:** `100%` (saat ada sesi mengajar hari ini)
- **Sumber Nilai Saat Ini:** Hardcoded prop ternary:  
  `<DonutGauge percentage={hasSessionsToday ? 100 : 0} label="Jurnal Diisi" color="indigo" size={62} />`
- **Mengapa Tidak Valid:** Pengembang mengasumsikan jika ada sesi kelas hari ini, jurnal KBM pasti sudah selesai diisi 100% oleh guru tanpa mengecek tabel `jurnal_guru` atau `catatan_kbm`.
- **Data Riil Yang Seharusnya Digunakan:** Verifikasi keterisian catatan KBM pada tabel `jurnal_guru` untuk sesi yang telah diselesaikan.
- **Rekomendasi Perbaikan:** Hubungkan gauge ke verifikasi pengisian jurnal riil pada tabel `jurnal_guru` untuk sesi yang telah berstatus `SELESAI`.

---

### METRIK INVALID 6: Status Siswa Perlu Perhatian ("Semua Siswa Terpantau Optimal")
- **Nama Metrik:** Antrean Penanganan Siswa Berisiko Akademik / Absensi
- **Halaman:** `/dashboard`
- **Komponen:** `AttentionQueueCard` (dipanggil di `TeacherDashboard`)
- **File:** [`src/shared/components/dashboard/cockpit/attention-queue-card.tsx`](file:///C:/laragon/www/Ruang-Pintar/src/shared/components/dashboard/cockpit/attention-queue-card.tsx) & [`teacher-dashboard.tsx`](file:///C:/laragon/www/Ruang-Pintar/src/shared/components/dashboard/role-views/teacher-dashboard.tsx)
- **Nomor Baris:** Baris 131–145 (`attention-queue-card.tsx`) & Baris 310 (`teacher-dashboard.tsx`)
- **Nilai Yang Ditampilkan:** Pesan banner status *"Semua Siswa Terpantau Optimal"*
- **Sumber Nilai Saat Ini:** Default empty state komponen tanpa passing props data:  
  `<AttentionQueueCard />`
- **Mengapa Tidak Valid:** Sistem menyatakan seluruh siswa berada dalam kondisi "optimal" bukan karena telah memverifikasi data 38 siswa, melainkan karena query pendeteksi siswa bermasalah belum dihubungkan ke backend.
- **Data Riil Yang Seharusnya Digunakan:** Query evaluasi riil terhadap siswa berisiko (alpa berturut-turut pada `presensi_sesi_kelas`, tugas belum diserahkan pada `tugas_siswa`, atau nilai di bawah KKTP pada `nilai_siswa`).
- **Rekomendasi Perbaikan:** Jika KBM belum berjalan, ganti pesan menjadi status edukatif: *"Menunggu Aktivitas Pembelajaran — Data tindak lanjut akan otomatis terakumulasi setelah KBM berjalan."*

---

### METRIK INVALID 7: Agenda Batas Penginputan Nilai PTS Gasal
- **Nama Metrik:** Agenda Batas Penginputan Nilai PTS Gasal
- **Halaman:** `/dashboard`
- **Komponen:** `TeachingTimelineRail` (Timeline Cockpit Guru)
- **File:** [`src/shared/components/dashboard/cockpit/teaching-timeline-rail.tsx`](file:///C:/laragon/www/Ruang-Pintar/src/shared/components/dashboard/cockpit/teaching-timeline-rail.tsx)
- **Nomor Baris:** Baris 211–215
- **Nilai Yang Ditampilkan:** `"Batas Penginputan Nilai PTS Gasal • 24 Sep 2026 • 23:59 WIB"`
- **Sumber Nilai Saat Ini:** Elemen teks JSX statis tanpa query database
- **Mengapa Tidak Valid:** Agenda PTS fiktif disematkan langsung di dalam template visual agar layar terlihat ramai, padahal sekolah belum menjadwalkan PTS dan tabel `kalender_akademik` bersih dari agenda ini.
- **Data Riil Yang Seharusnya Digunakan:** Query agenda akademik mendatang dari tabel `kalender_akademik` (`tanggal_mulai >= hari_ini`).
- **Rekomendasi Perbaikan:** Hapus teks JSX statis. Ganti dengan pembacaan riil event dari tabel `kalender_akademik`. Jika kosong, tampilkan *empty state* bersih.

---

### METRIK INVALID 8: Agenda Rapat Koordinasi Evaluasi Kurikulum
- **Nama Metrik:** Agenda Rapat Koordinasi Evaluasi Kurikulum
- **Halaman:** `/dashboard`
- **Komponen:** `TeachingTimelineRail` (Timeline Cockpit Guru)
- **File:** [`src/shared/components/dashboard/cockpit/teaching-timeline-rail.tsx`](file:///C:/laragon/www/Ruang-Pintar/src/shared/components/dashboard/cockpit/teaching-timeline-rail.tsx)
- **Nomor Baris:** Baris 236–240
- **Nilai Yang Ditampilkan:** `"Rapat Koordinasi Evaluasi Kurikulum • 28 Sep 2026 • 13:00 WIB"`
- **Sumber Nilai Saat Ini:** Elemen teks JSX statis tanpa query database
- **Mengapa Tidak Valid:** Agenda rapat dinas fiktif yang tidak pernah dibuat oleh kepala sekolah maupun bagian kurikulum.
- **Data Riil Yang Seharusnya Digunakan:** Query kegiatan kedinasan resmi dari tabel `kalender_akademik` atau tabel `pengumuman`.
- **Rekomendasi Perbaikan:** Hapus teks JSX statis. Jika agenda sekolah kosong, tampilkan *empty state* bersih.

---

### METRIK INVALID 9: Beban KBM (Summary Card Kelas)
- **Nama Metrik:** Beban KBM Jam Pelajaran Mingguan
- **Halaman:** `/kelas-saya`
- **Komponen:** `TeacherClassesView` (Top Summary Card)
- **File:** [`src/modules/learning/presentation/teacher-classes-view.tsx`](file:///C:/laragon/www/Ruang-Pintar/src/modules/learning/presentation/teacher-classes-view.tsx) & [`smart-onboarding-service.ts`](file:///C:/laragon/www/Ruang-Pintar/src/modules/ai-assistant/application/smart-onboarding-service.ts)
- **Nomor Baris:** Baris 278–283 (`teacher-classes-view.tsx`) & Baris 384 (`smart-onboarding-service.ts`)
- **Nilai Yang Ditampilkan:** `3 JP per minggu`
- **Sumber Nilai Saat Ini:** Agregasi dari kolom `jumlah_jam_minggu` yang diinjeksi secara hardcode oleh backend onboarding service (`jumlah_jam_minggu: 3`).
- **Mengapa Tidak Valid:** Guru mandiri saat membuat kelas tidak pernah menginput beban JP dan kurikulum sekolah belum menetapkan SK Beban Mengajar. Nilai 3 JP disuntikkan secara sepihak.
- **Data Riil Yang Seharusnya Digunakan:** Alokasi jam pelajaran resmi dari SK Pembagian Tugas Mengajar Kurikulum. Jika belum ada SK, nilai harus bernilai `null` atau `0`.
- **Rekomendasi Perbaikan:** Sembunyikan kartu Beban KBM pada kelas mandiri, atau ubah menjadi "Belum Ditentukan Kurikulum" hingga kurikulum menerbitkan jadwal resmi.

---

### METRIK INVALID 10: Badge JP pada Kartu Rombel Belajar
- **Nama Metrik:** Badge Alokasi JP per Minggu pada Kartu Rombel
- **Halaman:** `/kelas-saya`
- **Komponen:** `TeacherClassesView` (Rombel Grid Card)
- **File:** [`src/modules/learning/presentation/teacher-classes-view.tsx`](file:///C:/laragon/www/Ruang-Pintar/src/modules/learning/presentation/teacher-classes-view.tsx)
- **Nomor Baris:** Baris 794
- **Nilai Yang Ditampilkan:** `3 JP / mgg`
- **Sumber Nilai Saat Ini:** Kolom `c.jumlah_jam_minggu` hasil injeksi onboarding service
- **Mengapa Tidak Valid:** Menampilkan beban 3 JP fiktif hasil injeksi otomatis service onboarding pada setiap kartu rombel.
- **Data Riil Yang Seharusnya Digunakan:** Nilai jadwal resmi kurikulum sekolah.
- **Rekomendasi Perbaikan:** Sembunyikan badge atau tampilkan tanda `"- JP"` jika alokasi kurikulum belum ditentukan.

---

### METRIK INVALID 11: Badge JP di Header Ruang Kerja Kelas
- **Nama Metrik:** Alokasi Beban Jam Mengajar di Ruang Kerja Kelas
- **Halaman:** `/kelas-saya/[id]`
- **Komponen:** `ClassWorkspaceView` (Header Workspace Kelas)
- **File:** [`src/modules/learning/presentation/class-workspace-view.tsx`](file:///C:/laragon/www/Ruang-Pintar/src/modules/learning/presentation/class-workspace-view.tsx)
- **Nomor Baris:** Baris 301
- **Nilai Yang Ditampilkan:** `3 JP / Minggu`
- **Sumber Nilai Saat Ini:** Kolom `penugasan.jumlah_jam_minggu` hasil injeksi onboarding service
- **Mengapa Tidak Valid:** Menampilkan alokasi JP fiktif hasil injeksi otomatis di ruang kerja utama persiapan ajar guru.
- **Data Riil Yang Seharusnya Digunakan:** Alokasi jam pelajaran resmi kurikulum atau disembunyikan jika jadwal belum ditetapkan.
- **Rekomendasi Perbaikan:** Bersihkan badge JP dari header atau sembunyikan jika bernilai 0 / null.

---

# 3. Pengelompokan Berdasarkan Tingkat Risiko

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                   PENGELOMPOKAN RISIKO DATA INVALID                                    │
├───────────────┬────────────────────────────────────────────────────────────────────────────────────────┤
│ TINGKAT       │ DAFTAR TEMUAN                                                                          │
├───────────────┼────────────────────────────────────────────────────────────────────────────────────────┤
│ CRITICAL      │ 1. Fallback Skor Nilai Siswa 85.0/88.0 (teacher-dashboard.tsx:119)                     │
│               │ 2. Kehadiran Siswa 100.0% dari Rasio Sesi Guru (teacher-dashboard.tsx:166)             │
│               │ 3. Donut Gauge Siswa Hadir Otomatis 100% (teacher-dashboard.tsx:283)                   │
│               │ 4. Donut Gauge Sakit/Izin Dipatok 0% (teacher-dashboard.tsx:298)                       │
│               │ 5. Donut Gauge Jurnal Diisi Otomatis 100% (teacher-dashboard.tsx:300)                  │
│               │ 6. Agenda Fiktif Batas Input PTS Gasal 24 Sep (teaching-timeline-rail.tsx:215)         │
│               │ 7. Agenda Fiktif Rapat Evaluasi Kurikulum 28 Sep (teaching-timeline-rail.tsx:239)      │
│               │ 8. Summary Card Beban KBM 3 JP Injeksi Onboarding (teacher-classes-view.tsx:278)       │
│               │ 9. Badge Kartu Kelas 3 JP / mgg (teacher-classes-view.tsx:794)                         │
│               │ 10. Badge Header Workspace 3 JP / Minggu (class-workspace-view.tsx:301)                │
├───────────────┼────────────────────────────────────────────────────────────────────────────────────────┤
│ HIGH          │ 11. Status Optimal Attention Queue Tanpa Query (attention-queue-card.tsx:131)          │
│               │ 12. Siswa Binaan Label "terlayani" Prematur (teacher-classes-view.tsx:305)             │
│               │ 13. Sesi KBM: Rombel Terlayani Scope Seluruh Sekolah (sesi-pembelajaran/page.tsx:150)  │
├───────────────┼────────────────────────────────────────────────────────────────────────────────────────┤
│ MEDIUM        │ 14. Presensi Kelas Rata-rata 0% Dingin (class-attendance-overview.tsx:187)             │
│               │ 15. Jadwal Mengajar Total Sesi "0 Jam" (jadwal-saya/page.tsx:155)                      │
│               │ 16. Viewport Jadwal Asumsi 1 Slot = 1 JP "0 JP / Minggu" (my-schedule-view.tsx:180)    │
│               │ 17. Soal Ujian Fallback Statis Sejarah Saat Offline (gemini-cbt-ai-service.ts:173)     │
│               │ 18. Status API Key Masking Offline "Fallback Siap" (ai-teacher-studio-view.tsx:348)    │
├───────────────┼────────────────────────────────────────────────────────────────────────────────────────┤
│ LOW           │ 19. Default form state (durasi ujian 60 menit di create-exam-modal.tsx:55)             │
└───────────────┴────────────────────────────────────────────────────────────────────────────────────────┘
```

---

# 4. Tabel Prioritas Implementasi Bergelombang

Pembersihan pada STAGE 11.2 disusun ke dalam 3 gelombang terstruktur:

| Gelombang | Target Pekerjaan | Kategori Temuan | Lokasi File Target |
|:---|:---|:---|:---|
| **WAVE 1**<br>*(Fake Data Dihapus Segera)* | **Menghapus seluruh nilai angka dan agenda fiktif yang memalsukan data:**<br>1. Fallback Skor 85.0 / 88.0<br>2. Agenda Batas Input PTS Gasal 24 Sep<br>3. Agenda Rapat Koordinasi Kurikulum 28 Sep<br>4. Injeksi beban hardcode `jumlah_jam_minggu: 3`<br>5. Badge 3 JP pada kartu kelas dan header workspace | Fake Data / Hardcode / Seed | `teacher-dashboard.tsx:119`<br>`teaching-timeline-rail.tsx:211-240`<br>`smart-onboarding-service.ts:384`<br>`teacher-classes-view.tsx:794`<br>`class-workspace-view.tsx:301` |
| **WAVE 2**<br>*(Placeholder Diganti Data Riil)* | **Menghubungkan komponen visual ke query agregasi riil:**<br>1. Donut Gauge Siswa Hadir &rarr; riil dari `presensi_sesi_kelas`<br>2. Donut Gauge Sakit/Izin &rarr; riil dari `presensi_sesi_kelas`<br>3. Donut Gauge Jurnal Diisi &rarr; riil dari `jurnal_guru`<br>4. Status Attention Queue &rarr; ganti status edukatif | Placeholder Visual / Hardcoded Props | `teacher-dashboard.tsx:283, 298, 300`<br>`attention-queue-card.tsx:131-145` |
| **WAVE 3**<br>*(Metrik Dihitung Ulang dari DB)* | **Koreksi formula perhitungan dan penyesuaian label semantik:**<br>1. Kehadiran Kumulatif Siswa dipisahkan dari KBM guru<br>2. Label Siswa Binaan "terlayani" diselaraskan menjadi "terdaftar"<br>3. Rombel Terlayani diisolasi ke rombel pengampu guru<br>4. Rata-rata Kehadiran 0% dingin diganti status netral `"-"`<br>5. Satuan "0 Jam" pada jadwal diselaraskan ke JP | Derivasi Salah / Misleading Semantics | `teacher-dashboard.tsx:166-168`<br>`teacher-classes-view.tsx:298, 305`<br>`sesi-pembelajaran/page.tsx:148-150`<br>`class-attendance-overview.tsx:83-87, 187`<br>`jadwal-saya/page.tsx:155` |

---

# 5. Inventaris Seluruh Hardcoded Value pada Workspace Guru

Hasil penelusuran forensik terhadap seluruh tipe nilai statis/hardcoded di ruang kerja guru:

1. **Angka Statis:**  
   - `85.0` dan `88.0` pada fallback skor ketuntasan siswa (`teacher-dashboard.tsx:119`).
   - `3` pada alokasi jam mengajar mingguan (`smart-onboarding-service.ts:384`).
   - `60` pada durasi menit default modal ujian (`create-exam-modal.tsx:55`).
   - `75` pada nilai KKTP default modal ujian (`create-exam-modal.tsx:56`).
2. **Persentase Statis:**  
   - `percentage={hasSessionsToday ? 100 : 0}` pada Donut Gauge Siswa Hadir (`teacher-dashboard.tsx:283`).
   - `percentage={0}` pada Donut Gauge Sakit/Izin (`teacher-dashboard.tsx:298`).
   - `percentage={hasSessionsToday ? 100 : 0}` pada Donut Gauge Jurnal Diisi (`teacher-dashboard.tsx:300`).
3. **Skor Statis:**  
   - `85.0` (skor terendah fallback) & `88.0` (skor tertinggi fallback) (`teacher-dashboard.tsx:119`).
4. **JP Default:**  
   - `jumlah_jam_minggu: 3` (`smart-onboarding-service.ts:384`).
   - `@default(2)` pada skema Prisma (`prisma/schema.prisma:698`).
5. **Badge Default:**  
   - `"3 JP / mgg"` pada kartu direktori kelas (`teacher-classes-view.tsx:794`).
   - `"3 JP / Minggu"` pada header workspace kelas (`class-workspace-view.tsx:301`).
   - `"Total Sesi: 0 Jam"` pada header jadwal (`jadwal-saya/page.tsx:155`).
6. **Status Default:**  
   - `"Semua Siswa Terpantau Optimal"` pada Attention Queue Card (`attention-queue-card.tsx:131`).
   - `"Mesin Cerdas Fallback Siap"` saat API key kosong (`ai-teacher-studio-view.tsx:348`).
7. **Progress Default:**  
   - Jurnal diisi 100% otomatis saat ada sesi (`teacher-dashboard.tsx:300`).
8. **Tanggal Default:**  
   - `"24 Sep 2026"` pada deadline PTS Gasal (`teaching-timeline-rail.tsx:215`).
   - `"28 Sep 2026"` pada rapat evaluasi kurikulum (`teaching-timeline-rail.tsx:239`).
9. **Deadline Palsu:**  
   - `"Batas Penginputan Nilai PTS Gasal - 24 Sep 2026 • 23:59 WIB"` (`teaching-timeline-rail.tsx:211-215`).
10. **Statistik Sintetis:**  
    - `attendanceRate = hasSessionsToday ? ((completed / total) * 100) : "0"` (`teacher-dashboard.tsx:166-168`).
    - `Rombel Terlayani: {rombelsData.length}` (`sesi-pembelajaran/page.tsx:148-150`).

---

# 6. Audit Forensik pada Seluruh 10 Menu Sidebar

Penyelidikan forensik status data per menu navigasi sidebar guru:

### 1. Dashboard (`/dashboard`)
- **Status:** **CRITICAL** (Terdapat 8 titik data tidak valid).
- **Temuan:** Skor fallback 85.0/88.0, kehadiran siswa dihitung dari KBM, 3 donut gauge hardcoded (100%, 0%, 100%), status optimal prematur, deadline PTS fiktif, rapat dinas fiktif.

### 2. Kelas Saya (`/kelas-saya` & `/kelas-saya/[id]`)
- **Status:** **CRITICAL** (Terdapat 3 titik data tidak valid).
- **Temuan:** Kartu Beban KBM 3 JP hasil injeksi, badge 3 JP/mgg kartu kelas, badge 3 JP di header workspace kelas. (Data siswa 38 dan matriks 4 kolom: BAB 0, Materi 0, Tugas 0, Jurnal 0 berstatus REAL).

### 3. Jadwal Mengajar (`/jadwal-saya`)
- **Status:** **MEDIUM** (Terdapat 2 ketidaksesuaian semantik).
- **Temuan:** Satuan "0 Jam" membingungkan guru; perhitungan beban mengasumsikan 1 baris jadwal = 1 JP.

### 4. Sesi Pembelajaran (`/sesi-pembelajaran`)
- **Status:** **HIGH** (Terdapat 1 ketidaksesuaian semantik dan scope).
- **Temuan:** Rombel terlayani menghitung seluruh rombel sekolah bukan rombel pengampu, serta melabeli "terlayani" saat sesi selesai masih 0.

### 5. Presensi (`/presensi-kelas`)
- **Status:** **MEDIUM** (Terdapat 1 ketidaksesuaian visual).
- **Temuan:** Rata-rata kehadiran menampilkan "0%" dingin saat belum ada presensi diambil (seharusnya status netral `"-"`).

### 6. Penilaian (`/penilaian`)
- **Status:** **CLEAN / VALID** (Buku nilai di rute ini 100% jujur menampilkan tanda `"-"` saat rata-rata kelas kosong).

### 7. CBT (`/cbt-ujian`)
- **Status:** **MEDIUM** (Terdapat 1 fallback mock package).
- **Temuan:** Naskah soal cadangan offline menyajikan soal sejarah/umum statis saat API key kosong.

### 8. Kalender Akademik (`/kalender-akademik`)
- **Status:** **CLEAN / VALID** (Data kalender riil bersih 0 agenda; namun timeline dashboard memunculkan deadline PTS fiktif).

### 9. Pengumuman (`/pengumuman`)
- **Status:** **CLEAN / VALID** (Direktori pengumuman terhubung 100% ke tabel `pengumuman`).

### 10. Asisten AI (`/asisten-ai`)
- **Status:** **MEDIUM** (Terdapat 1 masking status offline).
- **Temuan:** Label "Mesin Cerdas Fallback Siap" menyamarkan ketiadaan API key.

---

# 7. Status Kepatuhan & Konfirmasi

- **KODE PRODUKSI TIDAK DIUBAH**
- **DATABASE TIDAK DIUBAH**
- **COMMIT TIDAK DIBUAT**
- **DOKUMEN INVENTARIS TELAH TERSIMPAN: `docs/INVALID-UI-DATA-INVENTORY.md`**

---
**READY FOR HUMAN REVIEW**  
**STOP**
