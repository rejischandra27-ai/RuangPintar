# PRODUCT-REALITY-AUDIT.md
## Audit Ketidaksesuaian Bisnis vs Antarmuka (Business Reality Remediation)
### Ruang Pintar — School Digital Operating Platform

| Field | Nilai |
| --- | --- |
| **Tahap Audit** | STAGE 10.7 — Product Reality Audit |
| **Konteks Data Aktif** | Database Development Bersih (1 Sekolah: SMK OTOMINDO, 1 Guru: Eri Chandra, 38 Siswa, 1 Rombel: X TO 3, 1 Mapel: KKA) |
| **Tujuan** | Mengidentifikasi seluruh data sintetik, fallback palsu, asumsi hardcoded, dan ketidaksesuaian proses bisnis pada antarmuka |
| **Status Gate** | `AUDIT ONLY` — Kode Tidak Diubah (**STOP**) |
| **Versi Dokumen** | 1.0 (Canonical Reality Report) |

---

# 1. Ringkasan Eksekutif

Setelah pembersihan kontaminasi data dummy pada database development, sistem saat ini beroperasi dengan **100% data riil**:
- **Sekolah:** SMK OTOMINDO (`01M2XXYD227F9S3H985FH53GMF`)
- **Guru:** Eri Chandra A, S.Kom (`guru_chandra`)
- **Rombel:** X TO 3
- **Mata Pelajaran:** Koding dan Kecerdasan Artifisial (KKA)
- **Siswa:** 38 Siswa terdaftar pada rombel X TO 3

Namun, audit menyeluruh terhadap lapisan presentasi (UI) dan logika derivasi data mengungkapkan adanya **mismatch serius**: antarmuka menampilkan angka, metrik, badge, durasi JP, dan deadline yang **tidak pernah diinput atau diproses oleh pengguna**.

Audit ini mengelompokkan temuan berdasarkan tingkat keparahan dampak bisnis:
- **CRITICAL (4 Temuan):** Data fiktif yang memalsukan capaian akademik atau mengasumsikan data kurikulum secara sepihak.
- **HIGH (3 Temuan):** Agenda, event, atau klaim operasional fiktif yang ditampilkan sebagai kenyataan institusi.
- **MEDIUM (3 Temuan):** Angka nol dingin, salah satuan jam kerja guru, atau masking template statis sebagai kecerdasan buatan.
- **LOW (2 Temuan):** Ketiadaan indikator status kesiapan (*readiness badge*) pada direktori kerja guru.

---

# 2. Katalog Temuan Ketidaksesuaian Bisnis vs UI

```
                                 [LEVEL KEPARAHAN]
         CRITICAL                      HIGH                     MEDIUM                  LOW
  ┌─────────────────────┐    ┌─────────────────────┐    ┌─────────────────────┐    ┌──────────────┐
  │ • Nilai Siswa Palsu │    │ • Deadline PTS Mock │    │ • 0 Jam vs Jam JP   │    │ • Nol Mentah │
  │ • Presensi vs KBM   │    │ • Rombel Terlayani  │    │ • 0% Presensi Dingin│    │   BAB/Materi │
  │ • Gauge Asumsi 100% │    │ • Attention Prematur│    │ • AI Offline Masking│    │ • Pill Status│
  │ • Hardcoded 3 JP    │    │                     │    │                     │    │   Kesiapan   │
  └─────────────────────┘    └─────────────────────┘    └─────────────────────┘    └──────────────┘
```

---

## 2.1. Tingkat Keparahan: CRITICAL (Kritis)

### C-01: Nilai Rata-rata Kelas Sintetis / Fallback Nilai Siswa (`85.0` / `88.0`)
- **Lokasi Kode:**  
  [`src/shared/components/dashboard/role-views/teacher-dashboard.tsx` (Baris 119)](file:///C:/laragon/www/Ruang-Pintar/src/shared/components/dashboard/role-views/teacher-dashboard.tsx#L119)
- **Nilai Saat Ini:**  
  ```typescript
  score: o.rata_rata_kelas ?? (o.total_published > 0 ? 88.0 : 85.0)
  ```
- **Mengapa Salah Secara Bisnis:**  
  Akun `guru_chandra` pada rombel `X TO 3` belum pernah membuat asesmen dan belum pernah menginput nilai apa pun (`o.rata_rata_kelas === null`). Kode secara sepihak menyuntikkan angka fiktif `85.0` (atau `88.0` jika ada asesmen dipublikasikan). Akibatnya, komponen [`PerformanceBarChart`](file:///C:/laragon/www/Ruang-Pintar/src/shared/components/dashboard/cockpit/performance-bar-chart.tsx#L47-L65) menampilkan:  
  `"Kelas dengan Ketuntasan Tertinggi: 85.0 (X TO 3)"`.  
  Ini merupakan **kebohongan data akademik faktual**. Pengguna/kepala sekolah akan mengira kelas tersebut sudah tuntas belajar dengan nilai rata-rata 85.
- **Perilaku Baru yang Diusulkan:**  
  Hapus seluruh angka fallback. Jika `rata_rata_kelas === null`, tetapkan `score: null`. Pada komponen bar chart, tampilkan *empty state* faktual:  
  `"Belum Ada Nilai Masuk — Buku nilai semester aktif belum memiliki asesmen yang dinilai."`

---

### C-02: Pencampuradukan Semantik Rasio Sesi Mengajar vs Kehadiran Siswa
- **Lokasi Kode:**  
  [`src/shared/components/dashboard/role-views/teacher-dashboard.tsx` (Baris 166–168 & 255–277)](file:///C:/laragon/www/Ruang-Pintar/src/shared/components/dashboard/role-views/teacher-dashboard.tsx#L166-L168)
- **Nilai Saat Ini:**  
  ```typescript
  const attendanceRate = hasSessionsToday
    ? ((completedSessionsToday / totalSessionsToday) * 100).toFixed(1)
    : "0";
  ```
  Dirender di bawah label: `"Kehadiran Kumulatif Siswa Binaan: {attendanceRate}%"`.
- **Mengapa Salah Secara Bisnis:**  
  Sistem menghitung rasio sesi mengajar guru yang telah diselesaikan (`completedSessionsToday / totalSessionsToday`), lalu menampilkannya sebagai persentase **kehadiran siswa**. Jika hari ini ada 1 sesi KBM dan guru menyelesaikannya, dashboard mengklaim `100.0% Kehadiran Siswa Binaan`, meskipun pada kenyataannya presensi siswa belum pernah diisi atau separuh siswa tidak hadir.
- **Perilaku Baru yang Diusulkan:**  
  Pisahkan kedua metrik secara tegas:
  - **Kehadiran Siswa:** Dihitung dari record `presensi_sesi_kelas` (`HADIR` / total siswa rombel). Jika belum ada sesi dibuka hari ini, tampilkan `"-"` dengan label `"Presensi Belum Diambil"`.
  - **Progres Sesi Mengajar:** Tampilkan di kartu tersendiri dengan label `"Progres KBM Hari Ini: {completed} / {total} Sesi"`.

---

### C-03: Asumsi Otomatis 100% Gauge Siswa Hadir & Jurnal Terisi Saat Sesi Terbuka
- **Lokasi Kode:**  
  [`src/shared/components/dashboard/role-views/teacher-dashboard.tsx` (Baris 283–305)](file:///C:/laragon/www/Ruang-Pintar/src/shared/components/dashboard/role-views/teacher-dashboard.tsx#L283-L305)
- **Nilai Saat Ini:**  
  ```tsx
  <DonutGauge percentage={hasSessionsToday ? 100 : 0} label="Siswa Hadir" color="emerald" size={62} />
  <DonutGauge percentage={0} label="Sakit/Izin" color="amber" size={62} />
  <DonutGauge percentage={hasSessionsToday ? 100 : 0} label="Jurnal Diisi" color="indigo" size={62} />
  ```
- **Mengapa Salah Secara Bisnis:**  
  Saat ada sesi mengajar hari ini (`hasSessionsToday === true`), antarmuka langsung memaksa gauge `"Siswa Hadir"` menjadi 100% dan `"Jurnal Diisi"` menjadi 100%, sementara `"Sakit/Izin"` dipatok permanen 0%. Sistem berasumsi tanpa membaca record presensi maupun catatan administrasi KBM guru.
- **Perilaku Baru yang Diusulkan:**  
  Hubungkan gauge langsung ke agregasi riil database:
  - `Siswa Hadir`: Persentase riil kehadiran dari sesi hari ini.
  - `Sakit/Izin`: Persentase riil siswa berstatus sakit/izin hari ini.
  - `Jurnal Diisi`: 100% hanya jika tabel `catatan_kbm` / `jurnal_guru` telah terisi untuk sesi yang telah berstatus `SELESAI`, selain itu 0%.

---

### C-04: Beban Jam Mengajar Hardcoded "3 JP / Minggu" Tanpa Proses Bisnis Guru
- **Lokasi Kode:**  
  1. [`src/modules/ai-assistant/application/smart-onboarding-service.ts` (Baris 384)](file:///C:/laragon/www/Ruang-Pintar/src/modules/ai-assistant/application/smart-onboarding-service.ts#L384):  
     `jumlah_jam_minggu: 3,`
  2. [`src/modules/learning/presentation/class-workspace-view.tsx` (Baris 301)](file:///C:/laragon/www/Ruang-Pintar/src/modules/learning/presentation/class-workspace-view.tsx#L301):  
     `{penugasan.jumlah_jam_minggu} JP / Minggu`
  3. [`src/modules/learning/presentation/teacher-classes-view.tsx` (Baris 794)](file:///C:/laragon/www/Ruang-Pintar/src/modules/learning/presentation/teacher-classes-view.tsx#L794):  
     `{c.jumlah_jam_minggu} JP / mgg`
  4. [`prisma/schema.prisma` (Baris 698)](file:///C:/laragon/www/Ruang-Pintar/prisma/schema.prisma#L698):  
     `jumlah_jam_minggu Int @default(2)`
- **Mengapa Salah Secara Bisnis:**  
  Guru mandiri/freemium (`guru_chandra`) saat melakukan *quick class setup* / onboarding manual **tidak pernah diminta menginput alokasi JP**, tidak pernah menyusun slot jam pelajaran, dan kurikulum sekolah belum menerbitkan SK Beban Mengajar. Nilai `3 JP` disuntikkan secara statis oleh service backend. Hal ini menimbulkan asumsi palsu bahwa guru telah memiliki beban resmi 3 JP/minggu.
- **Perilaku Baru yang Diusulkan:**  
  - Pada skenario mandiri/freemium di mana jadwal belum ditetapkan oleh kurikulum resmi, kolom `jumlah_jam_minggu` harus bernilai `null` atau `0` (atau ditandai status `"Belum Ditetapkan Kurikulum"`).
  - Tampilkan label antarmuka: `"JP: Belum Ditentukan"` alih-alih `"3 JP / Minggu"`.

---

## 2.2. Tingkat Keparahan: HIGH (Tinggi)

### H-01: Agenda & Batas Penginputan PTS Fiktif pada Timeline Cockpit Guru
- **Lokasi Kode:**  
  [`src/shared/components/dashboard/cockpit/teaching-timeline-rail.tsx` (Baris 204–251)](file:///C:/laragon/www/Ruang-Pintar/src/shared/components/dashboard/cockpit/teaching-timeline-rail.tsx#L204-L251)
- **Nilai Saat Ini:**  
  Elemen JSX statis:
  - Event 1: `"Batas Penginputan Nilai PTS Gasal - 24 Sep 2026 • 23:59 WIB"`
  - Event 2: `"Rapat Koordinasi Evaluasi Kurikulum - 28 Sep 2026 • 13:00 WIB"`
- **Mengapa Salah Secara Bisnis:**  
  Kedua agenda ini tidak berasal dari tabel `kalender_akademik` maupun `pengumuman`. Meskipun kalender akademik SMK OTOMINDO bersih dan belum memiliki agenda masa ujian (0 agenda), dashboard guru tetap memunculkan deadline PTS fiktif. Hal ini menciptakan kepanikan palsu bagi pengajar.
- **Perilaku Baru yang Diusulkan:**  
  Ambil event dari database `kalender_akademik` (`tanggal_mulai >= hari_ini`). Jika kosong, tampilkan *empty state* informatif:  
  `"Belum Ada Agenda Terdekat — Kalender akademik sekolah belum memiliki jadwal kegiatan mendatang."`

---

### H-02: Klaim Palsu "Rombel Terlayani" pada Halaman Sesi Pembelajaran
- **Lokasi Kode:**  
  [`src/app/sesi-pembelajaran/page.tsx` (Baris 145–150)](file:///C:/laragon/www/Ruang-Pintar/src/app/sesi-pembelajaran/page.tsx#L145-L150)
- **Nilai Saat Ini:**  
  ```tsx
  <span>Rombel Terlayani: <strong>{rombelsData.length}</strong></span>
  ```
  Di mana `rombelsData` mengambil seluruh rombel di sekolah (`prisma.rombel.findMany({ where: { sekolah_id } })`).
- **Mengapa Salah Secara Bisnis:**  
  - `rombelsData.length` menghitung semua rombel sekolah, bukan rombel yang diampu oleh guru yang sedang aktif.
  - Frasa **"Terlayani"** mengindikasikan proses KBM telah terlaksana. Ketika `sessions.length === 0` (belum pernah ada satu pun sesi KBM dibuka), menyatakan bahwa rombel sudah "terlayani" adalah klaim palsu.
- **Perilaku Baru yang Diusulkan:**  
  Ganti metrik menjadi:
  - Jika mengukur penugasan: `"Rombel Diampu: {assignments.length}"`.
  - Jika mengukur realisasi KBM: Hitung rombel unik dari sesi berstatus `SELESAI`. Jika 0, tampilkan `"Rombel Terlayani: 0 (KBM Belum Berjalan)"`.

---

### H-03: Klaim Prematur "Semua Siswa Terpantau Optimal" pada Kartu Perhatian Siswa
- **Lokasi Kode:**  
  [`src/shared/components/dashboard/cockpit/attention-queue-card.tsx` (Baris 131–145)](file:///C:/laragon/www/Ruang-Pintar/src/shared/components/dashboard/cockpit/attention-queue-card.tsx#L131-L145)
- **Nilai Saat Ini:**  
  `<AttentionQueueCard />` dipanggil tanpa props di dashboard, memicu tampilan default:  
  `"Semua Siswa Terpantau Optimal. Belum ada siswa yang memerlukan perhatian khusus (absensi berturut-turut, kendala tugas, atau nilai di bawah KKTP)."`
- **Mengapa Salah Secara Bisnis:**  
  Sistem menyatakan status "optimal" bukan karena telah memverifikasi data 38 siswa, melainkan karena *query deteksi remedial/absensi belum pernah dipasang*. Menampilkan status hijau sebelum KBM dimulai memberi ilusi keamanan palsu (*false sense of security*).
- **Perilaku Baru yang Diusulkan:**  
  Jika KBM dan penilaian belum pernah berjalan, tampilkan status kontekstual edukatif:  
  `"Menunggu Aktivitas Pembelajaran — Data tindak lanjut siswa (remedial nilai atau absensi berturut-turut) akan otomatis terakumulasi setelah KBM berjalan."`

---

## 2.3. Tingkat Keparahan: MEDIUM (Sedang)

### M-01: Kerancuan Satuan "0 Jam" vs Jam Pelajaran (JP) pada Jadwal Mengajar
- **Lokasi Kode:**  
  [`src/app/jadwal-saya/page.tsx` (Baris 155)](file:///C:/laragon/www/Ruang-Pintar/src/app/jadwal-saya/page.tsx#L155) dan [`src/modules/schedule/presentation/my-schedule-view.tsx` (Baris 180)](file:///C:/laragon/www/Ruang-Pintar/src/modules/schedule/presentation/my-schedule-view.tsx#L180)
- **Nilai Saat Ini:**  
  `Total Sesi: {entries.length} Jam` dan `{entries.length} JP / Minggu`
- **Mengapa Salah Secara Bisnis:**  
  - `entries.length` adalah jumlah slot jadwal, bukan "Jam". Dalam sistem sekolah Indonesia, 1 slot jadwal umumnya bernilai 2 JP (90 menit) atau 3 JP (135 menit).
  - Ketika kurikulum sekolah belum menerbitkan jadwal (`entries.length === 0`), badge menampilkan `0 Jam`, seolah-olah guru tidak memiliki beban kerja mengajar.
- **Perilaku Baru yang Diusulkan:**  
  Ketika `entries.length === 0`, tampilkan badge status netral:  
  `"Jadwal Belum Diterbitkan Kurikulum"`, bukan angka dingin `0 Jam`.

---

### M-02: Rata-rata Kehadiran Menampilkan 0% Saat Presensi Belum Pernah Dimulai
- **Lokasi Kode:**  
  [`src/modules/attendance/presentation/class-attendance-overview.tsx` (Baris 84–87 & 184–189)](file:///C:/laragon/www/Ruang-Pintar/src/modules/attendance/presentation/class-attendance-overview.tsx#L184-L189)
- **Nilai Saat Ini:**  
  `Rata-rata Kehadiran: 0%`
- **Mengapa Salah Secara Bisnis:**  
  Persentase `0%` mengindikasikan seluruh siswa membolos/absen total. Ketika semester baru dimulai dan guru belum pernah membuka presensi kelas, menampilkan "0%" menimbulkan salah tafsir bahwa kelas mengalami kegagalan absensi darurat.
- **Perilaku Baru yang Diusulkan:**  
  Jika belum ada presensi yang diambil (`total_presensi_diambil === 0`), tampilkan:  
  `"Rata-rata Kehadiran: - (Belum Ada Presensi)"` dengan ikon jam netral.

---

### M-03: Masking Template Cadangan Offline sebagai Output AI pada Asisten AI
- **Lokasi Kode:**  
  [`src/modules/ai/presentation/ai-teacher-studio-view.tsx` (Baris 348)](file:///C:/laragon/www/Ruang-Pintar/src/modules/ai/presentation/ai-teacher-studio-view.tsx#L348) dan [`src/modules/cbt/infrastructure/gemini-cbt-ai-service.ts` (Baris 173–177)](file:///C:/laragon/www/Ruang-Pintar/src/modules/cbt/infrastructure/gemini-cbt-ai-service.ts#L173-L177)
- **Nilai Saat Ini:**  
  Teks badge: `"Mesin Cerdas Fallback Siap"` ketika API key kosong, dan memanggil `generateFallbackMixedExam()` yang menghasilkan soal statis geografi/sejarah.
- **Mengapa Salah Secara Bisnis:**  
  Menyamarkan kumpulan soal statis hardcoded sebagai "Mesin Cerdas Fallback" menyesatkan pengguna. Saat guru memasukkan prompt mata pelajaran khusus (misal "Koding & AI"), template yang keluar adalah soal template umum tanpa relevansi.
- **Perilaku Baru yang Diusulkan:**  
  Tampilkan status transparan: `"Mode Template Bawaan (Offline)"` dan beri catatan jelas bahwa untuk generasi adaptif Kurikulum Merdeka diperlukan Kunci Google Gemini API.

---

## 2.4. Tingkat Keparahan: LOW (Rendah)

### L-01: Angka Nol Mentah Tanpa Indikator Kesiapan Modul Ajar di Kelas Saya
- **Lokasi Kode:**  
  [`src/modules/learning/presentation/teacher-classes-view.tsx` (Baris 826–858)](file:///C:/laragon/www/Ruang-Pintar/src/modules/learning/presentation/teacher-classes-view.tsx#L826-L858)
- **Nilai Saat Ini:**  
  Kotak metrik: `BAB: 0`, `Materi: 0`, `Tugas: 0`, `Jurnal: 0` dirender sebagai angka nol polos.
- **Mengapa Kurang Tepat Secara Bisnis:**  
  Angka 0 ini faktual dari database, namun tidak memberikan panduan aksi (*actionable context*) bagi guru mengenai status kesiapan perangkat ajar kelas tersebut.
- **Perilaku Baru yang Diusulkan:**  
  Tambahkan badge kesiapan perangkat ajar di kartu kelas:  
  `"Perangkat Ajar Belum Disusun"` dengan tombol pintas *"Susun BAB & Modul Ajar"*.

---

### L-02: Indikator Durasi Default 60 Menit pada Pembuatan Ujian Baru
- **Lokasi Kode:**  
  [`src/modules/cbt/presentation/create-exam-modal.tsx` (Baris 54)](file:///C:/laragon/www/Ruang-Pintar/src/modules/cbt/presentation/create-exam-modal.tsx#L54)
- **Nilai Saat Ini:**  
  `durasi_menit: 60` secara default tanpa membaca bobot waktu JP mata pelajaran terkait.
- **Mengapa Kurang Tepat Secara Bisnis:**  
  Di SMK, durasi asesmen sumatif praktik sering kali memakan waktu 2–3 JP (90–135 menit). Durasi default 60 menit terkadang luput diganti oleh guru.
- **Perilaku Baru yang Diusulkan:**  
  Sediakan opsi rekomendasi durasi berdasarkan tipe asesmen (Formatif Kilat: 30 Menit, Kuis Harian: 45 Menit, Sumatif/PTS: 90 Menit).

---

# 3. Rekomendasi Tindakan Remediasi

1. **Hapus Seluruh Nilai Sintetis:** Bersihkan baris 119 `teacher-dashboard.tsx` dan baris 384 `smart-onboarding-service.ts`.
2. **Koreksi Semantik Metrik:** Pisahkan metrik progres sesi mengajar guru dari persentase kehadiran siswa.
3. **Empty State Berbasis Realitas Bisnis:** Pastikan ketika data bernilai `0` atau `null`, sistem menjelaskan konteks bisnisnya (*"Belum Dijadwalkan Kurikulum"*, *"Belum Ada Nilai Masuk"*, *"Presensi Belum Diambil"*).
