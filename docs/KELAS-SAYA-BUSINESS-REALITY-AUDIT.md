# KELAS-SAYA-BUSINESS-REALITY-AUDIT.md
## Audit Realitas Bisnis & Penyelarasan Workspace Pembelajaran (/kelas-saya)
### Ruang Pintar — School Digital Operating Platform

| Field | Nilai |
| --- | --- |
| **Tahap Audit** | STAGE 11.1 — Business Reality Remediation (Kelas Saya) |
| **Fokus Halaman** | `/kelas-saya` (Teacher Classes Directory) & `/kelas-saya/[rombel_id]` (Class Workspace) |
| **Konteks Bisnis** | SaaS Guru Mandiri / Freemium (SMK OTOMINDO: Eri Chandra, X TO 3, KKA) |
| **Status Gate** | `AUDIT ONLY` — Kode Tidak Diubah (**STOP**) |
| **Versi Dokumen** | 1.0 (Canonical Reality Audit for Class Directory) |

---

# 1. Ringkasan Eksekutif & Fakta Bisnis Guru Mandiri

Ruang Pintar dirancang dengan proposisi nilai utama: **memberdayakan guru dalam mengelola pembelajaran secara modern, cepat, dan bermartabat tanpa beban birokrasi rumit.**

Pada model bisnis **SaaS Guru Mandiri / Freemium**:
1. **Guru tidak pernah menginput alokasi Jam Pelajaran (JP).**
2. **Guru tidak memiliki Surat Keputusan (SK) Beban Mengajar Formal** yang tersinkronisasi otomatis dari sistem kurikulum yayasan/dinas.
3. **Guru belum tentu memiliki jadwal mingguan formal** saat pertama kali menggunakan platform.
4. **Fokus utama guru adalah ruang interaksi nyata:** rombel kelas, murid, materi/modul ajar, tugas/LKPD, kuis CBT, dan presensi harian.

### Kontradiksi Utama pada Halaman `/kelas-saya` Saat Ini:
Meskipun database development telah bersih dari data dummy, antarmuka `/kelas-saya` saat ini masih memaksakan atribut birokrasi kurikulum formal:
- Memunculkan angka fiktif **"3 JP / Minggu"** dan metrik **"Beban KBM: 3 JP"** yang tidak pernah diinput oleh guru.
- Menampilkan tombol **"+ Foto Absen AI"** yang secara teknis merupakan **tombol mati (dead button)** dan salah penempatan fungsi.
- Menampilkan angka nol mentah tanpa konteks kesiapan pembelajaran (*readiness state*).
- Menampilkan tata kelola berbasis *Struktur Akademik Sekolah* (perspektif jam mengajar pengawas), bukan sebagai *Workspace Pembelajaran Guru*.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        PARADIGMA HALAMAN KELAS SAYA SAAT INI                           │
├───────────────────────────────────────────┬────────────────────────────────────────────┤
│     PARADIGMA FORMAL ENTERPRISE (LAMA)    │       PARADIGMA WORKSPACE GURU (BARU)      │
├───────────────────────────────────────────┼────────────────────────────────────────────┤
│ • Beban KBM (Alokasi JP per minggu)       │ • Kesiapan Perangkat Ajar (BAB & Modul)    │
│ • Distribusi Jam Kurikulum                │ • Manajemen Aktivitas Siswa & Tugas        │
│ • Penugasan Mengajar Formal               │ • Pelaksanaan KBM, CBT, dan Presensi       │
│ • "Siswa Terlayani" (Klaim Historis)      │ • "Siswa Terdaftar" (Faktual Akademik)     │
│ • Tombol Onboarding Tercecer di Toolbar   │ • Aksi Kerja Langsung (Presensi & Workspace│
└───────────────────────────────────────────┴────────────────────────────────────────────┘
```

---

# 2. Klasifikasi Temuan Berdasarkan Tingkat Keparahan

---

## 2.1. Temuan CRITICAL (Kritis)

### C-01: Munculnya Metrik Fiktif "Beban KBM: 3 JP" pada Summary Cards
- **Lokasi Kode:**  
  [`src/modules/learning/presentation/teacher-classes-view.tsx` (Baris 267–285)](file:///C:/laragon/www/Ruang-Pintar/src/modules/learning/presentation/teacher-classes-view.tsx#L267-L285)
- **Data yang Ditampilkan:**  
  Kotak Metrik ke-2: Judul `"Beban KBM"`, Nilai `"{totalJP} JP"`, Subtitle `"per minggu"`.
- **Sumber Data Sebenarnya:**  
  Dihitung dari akumulasi `c.jumlah_jam_minggu` seluruh kelas yang terfilter. Pada akun `guru_chandra`, nilai `jumlah_jam_minggu` bernilai `3` karena disuntikkan secara hardcoded oleh backend saat *confirm and create class* di [`smart-onboarding-service.ts` baris 384](file:///C:/laragon/www/Ruang-Pintar/src/modules/ai-assistant/application/smart-onboarding-service.ts#L384).
- **Risiko Bisnis:**  
  Menciptakan data palsu seolah-olah guru telah diberikan beban mengajar 3 JP per minggu oleh institusi. Pada guru mandiri yang mengajar beberapa kelas les atau kelas ekstrakurikuler, konsep "Beban JP Kurikulum" adalah konsep asing yang membingungkan.
- **Rekomendasi Perbaikan:**  
  Hapus kartu "Beban KBM" dari jajaran kartu ringkasan guru. Ganti dengan metrik operasional guru yang sebenarnya: **"Perangkat Ajar Siap"** (Total Materi & Tugas yang sudah dipublikasi) atau **"Aktivitas Evaluasi"** (Total Asesmen & Ujian CBT).

---

### C-02: Badge Sintetis "3 JP / mgg" pada Class Card Grid & Table View
- **Lokasi Kode:**  
  - Grid Card: [`teacher-classes-view.tsx` (Baris 793–795)](file:///C:/laragon/www/Ruang-Pintar/src/modules/learning/presentation/teacher-classes-view.tsx#L793-L795)
  - Mode Rombel: [`teacher-classes-view.tsx` (Baris 601–605)](file:///C:/laragon/www/Ruang-Pintar/src/modules/learning/presentation/teacher-classes-view.tsx#L601-L605)
  - Mode Guru: [`teacher-classes-view.tsx` (Baris 681–686)](file:///C:/laragon/www/Ruang-Pintar/src/modules/learning/presentation/teacher-classes-view.tsx#L681-L686)
  - Mode Tabel: [`teacher-classes-view.tsx` (Baris 924–926)](file:///C:/laragon/www/Ruang-Pintar/src/modules/learning/presentation/teacher-classes-view.tsx#L924-L926)
  - Workspace Detail: [`class-workspace-view.tsx` (Baris 300–302)](file:///C:/laragon/www/Ruang-Pintar/src/modules/learning/presentation/class-workspace-view.tsx#L300-L302)
- **Data yang Ditampilkan:**  
  Badge berwarna indigo: `"{c.jumlah_jam_minggu} JP / mgg"` atau `"3 JP / Minggu"`.
- **Sumber Data Sebenarnya:**  
  Kolom `penugasan_mengajar.jumlah_jam_minggu` di database yang berasal dari default schema Prisma atau hardcoded onboarding service.
- **Risiko Bisnis:**  
  Guru melihat badge yang menempel di setiap kelas tanpa mengetahui siapa yang menentukan angka tersebut dan bagaimana cara mengubahnya. Hal ini menimbulkan persepsi bahwa sistem "mengarang" data jam kerja guru.
- **Rekomendasi Perbaikan:**  
  - Hapus badge JP dari kartu kelas.
  - Ganti badge tersebut dengan **Indikator Kesiapan Modul / Status Kelas**:  
    Misal badge amber: `"Perangkat Belum Lengkap"` jika BAB/Materi masih 0, atau badge emerald: `"Siap KBM"` jika materi sudah tersedia.

---

### C-03: Tombol Mati (Dead Button) & Salah Tempat: "+ Foto Absen AI"
- **Lokasi Kode:**  
  [`teacher-classes-view.tsx` (Baris 72–74 & 512–521)](file:///C:/laragon/www/Ruang-Pintar/src/modules/learning/presentation/teacher-classes-view.tsx#L512-L521)
- **Data & Aksi yang Ditampilkan:**  
  Tombol di toolbar: `"+ Foto Absen AI"` dengan ikon kamera. Memanggil fungsi:  
  `window.dispatchEvent(new CustomEvent("open-ai-photo-modal"))`.
- **Fakta Faktual Kode (Investigasi Audit):**  
  1. **Tombol Mati Total di Halaman Ini:** Event `open-ai-photo-modal` hanya didengarkan oleh komponen [`trial-banner.tsx`](file:///C:/laragon/www/Ruang-Pintar/src/modules/ai-assistant/presentation/trial-banner.tsx#L55). Komponen `TrialBanner` **hanya di-mount di Dashboard Guru**, dan **TIDAK DI-MOUNT di halaman `/kelas-saya`**! Akibatnya, saat guru mengklik tombol "+ Foto Absen AI" di halaman `/kelas-saya`, **TIDAK TERJADI APA-APA (DEAD BUTTON)**.
  2. **Salah Kaprah Konsep Bisnis:** Tombol tersebut sebenarnya memicu *AI Photo Onboarding* (ekstraksi nama siswa dari foto lembar kertas presensi untuk membuat kelas baru). Namun labelnya berbunyi "Foto Absen AI", sehingga guru mengira ini adalah fitur untuk *mengambil foto absensi siswa di kelas hari ini*.
- **Risiko Bisnis:**  
  Pengguna merasa aplikasi rusak karena tombol tidak merespons klik, serta terjadi disorientasi fungsi antara fitur *Pembuatan Kelas* dan fitur *Presensi Harian*.
- **Rekomendasi Perbaikan:**  
  - Hapus tombol standalone "+ Foto Absen AI" dari toolbar utama `/kelas-saya`.
  - Satukan opsi scan foto absensi kertas ke dalam modal **"+ Tambah Kelas Manual"** sebagai tab pilihan metode pembuatan rombel (Metode A: Input Formulir, Metode B: Scan Foto Kertas Siswa).

---

## 2.2. Temuan HIGH (Tinggi)

### H-01: Klaim Historis Palsu "Siswa Terlayani" pada Kartu Ringkasan
- **Lokasi Kode:**  
  [`teacher-classes-view.tsx` (Baris 287–307)](file:///C:/laragon/www/Ruang-Pintar/src/modules/learning/presentation/teacher-classes-view.tsx#L287-L307)
- **Data yang Ditampilkan:**  
  `38 Siswa` dengan subtitle label `"terlayani"`.
- **Sumber Data Sebenarnya:**  
  Penjumlahan `c.total_siswa` seluruh kelas ampu.
- **Mengapa Kurang Tepat Secara Bisnis:**  
  Kata "Terlayani" adalah klaim proses pembelajaran yang telah selesai. Pada semester aktif di mana KBM belum dimulai dan presensi belum pernah dibuka, 38 siswa tersebut baru berstatus **terdaftar** dalam rombel, belum "terlayani".
- **Rekomendasi Perbaikan:**  
  Ganti subtitle menjadi `"terdaftar"` atau `"total siswa binaan"`.

---

### H-02: Ketiadaan Metrik Evaluasi & CBT pada Ringkasan Kelas
- **Lokasi Kode:**  
  [`teacher-classes-view.tsx` (Baris 824–858)](file:///C:/laragon/www/Ruang-Pintar/src/modules/learning/presentation/teacher-classes-view.tsx#L824-L858)
- **Data yang Ditampilkan:**  
  Grid 4 kolom: `BAB`, `Materi`, `Tugas`, `Jurnal`.
- **Kekurangan Bisnis:**  
  Modul CBT (Ujian Daring) yang merupakan fitur unggulan utama guru mandiri sama sekali tidak memiliki indikator pada kartu kelas. Guru tidak mengetahui apakah kelas tersebut memiliki ujian aktif yang sedang berlangsung atau belum memiliki evaluasi sama sekali.
- **Rekomendasi Perbaikan:**  
  Perluas ringkasan aset pembelajaran menjadi 5 pilar atau gantikan salah satu kolom dengan indikator **CBT Ujian**.

---

## 2.3. Temuan MEDIUM (Sedang)

### M-01: Angka Nol Mentah Tanpa Konteks Kesiapan (*Readiness Context*)
- **Lokasi Kode:**  
  [`teacher-classes-view.tsx` (Baris 826–858)](file:///C:/laragon/www/Ruang-Pintar/src/modules/learning/presentation/teacher-classes-view.tsx#L826-L858)
- **Data yang Ditampilkan:**  
  `BAB: 0`, `Materi: 0`, `Tugas: 0`, `Jurnal: 0` dirender sebagai angka 0 polos berwarna abu-abu.
- **Risiko Bisnis:**  
  Secara teknis angka 0 ini akurat, namun secara interaksi pengguna, angka 0 polos tidak memandu guru baru mengenai langkah pertama yang harus dilakukan (*what to do next*).
- **Rekomendasi Perbaikan:**  
  Jika seluruh konten bernilai 0, berikan penanda visual kontekstual:  
  Banner ringkas di dalam kartu: *"Perangkat Belum Disusun — Mulai buat Modul & LKPD pertama Anda."*

---

### M-02: Perspektif Supervisi Admin Muncul pada Guru Mandiri
- **Lokasi Kode:**  
  [`teacher-classes-view.tsx` (Baris 336–386)](file:///C:/laragon/www/Ruang-Pintar/src/modules/learning/presentation/teacher-classes-view.tsx#L336-L386)
- **Data yang Ditampilkan:**  
  Tab pilihan: `Semua Penugasan` dan `Per Rombel`.
- **Kekurangan Bisnis:**  
  Bagi guru mandiri yang hanya mengampu 1 rombel (misal Pak Eri Chandra di kelas X TO 3), keberadaan tab "Semua Penugasan" dan "Per Rombel" terasa mubazir dan membingungkan karena isinya identik.
- **Rekomendasi Perbaikan:**  
  Jika guru hanya mengampu 1 kelas, sembunyikan bilah tab perspektif tersebut secara otomatis agar antarmuka bersih dan terfokus pada rombel tunggalnya.

---

## 2.4. Temuan LOW (Rendah)

### L-01: Keterbatasan Aksi Cepat (*Quick Actions*) pada Kartu Kelas
- **Lokasi Kode:**  
  [`teacher-classes-view.tsx` (Baris 862–875)](file:///C:/laragon/www/Ruang-Pintar/src/modules/learning/presentation/teacher-classes-view.tsx#L862-L875)
- **Data yang Ditampilkan:**  
  Hanya ada 1 tombol: `"Buka Workspace ->"`.
- **Kekurangan Bisnis:**  
  Guru yang ingin segera melakukan presensi harian atau ingin segera membuka modul CBT harus masuk ke dalam workspace kelas terlebih dahulu, kemudian mencari tab terkait.
- **Rekomendasi Perbaikan:**  
  Sediakan 2 tombol aksi pada kartu kelas:  
  1. Tombol sekunder: `"Presensi Kilat"` (ikon ceklis).  
  2. Tombol primer: `"Buka Workspace"` (ikon arrow).

---

# 3. Audit Menyeluruh 10 Komponen Antarmuka `/kelas-saya`

| No | Nama Komponen | Data yang Ditampilkan | Sumber Data Riil | Status Data | Risiko Bisnis | Rekomendasi Perbaikan |
|:---:|:---|:---|:---|:---:|:---|:---|
| 1 | **Hero Section** | Judul, Badge "Workspace Guru", Deskripsi | Peran pengguna (`TEACHER`) | Valid | Desain flat putih belum mengikuti standar Dark Academic Glass UI v2.0. | Upgrade ke Academic Hero Section dengan ambient glow & 3D mascot pop-out. |
| 2 | **Summary Cards** | Total Rombel, Beban KBM (JP), Siswa, BAB | `classes` + hardcoded JP | **Sintetis (Beban KBM)** | Mengklaim beban JP kurikulum formal yang tidak pernah dibuat guru. | Hapus metrik JP; ganti dengan "Perangkat Ajar" & "Aktivitas Evaluasi". |
| 3 | **Filter Section** | Tab Perspektif (Semua, Rombel, Guru) | Dikelompokkan dari `classes` | Valid | Memunculkan kolom "Beban JP" di dalam kartu rombel & guru. | Hapus kolom JP pada pengelompokan rombel. Sembunyikan tab jika guru hanya punya 1 kelas. |
| 4 | **Search Section** | Input pencarian rombel, mapel, kode | State React lokal | Valid | Tidak ada risiko bisnis. | Pertahankan fungsi search instan. |
| 5 | **Class Card** | Kode, Tingkat, Tahun, Badge JP, Judul Rombel, Mapel, 4-Grid Metrik, Siswa | Database `penugasan_mengajar` & counts | **Sintetis (Badge JP)** | Menampilkan "3 JP/mgg" fiktif dan 4 kotak metrik angka 0 dingin. | Hapus badge JP; ganti dengan status kesiapan modul; tambahkan indikator CBT. |
| 6 | **Empty State** | Icon buku, teks ajakan, 2 tombol aksi | Kondisi `filtered.length === 0` | Valid | Tombol "+ Foto Absen AI" di empty state tidak merespons (dead button). | Sambungkan listener modal atau satukan ke dalam dialog modal buat kelas. |
| 7 | **Action Buttons** | `+ Tambah Kelas Manual` & `+ Foto Absen AI` | Trigger event kustom | **Bermasalah (Dead Button)** | "+ Foto Absen AI" tidak berfungsi dan membingungkan makna absensi harian. | Hapus tombol foto dari toolbar; satukan ke dalam dialog modal Tambah Kelas. |
| 8 | **Statistic Badges** | Badge JP pada tabel compact dan grid | Kolom `jumlah_jam_minggu` | **Sintetis** | Merusak kredibilitas sistem saat didemokan kepada guru riil. | Hapus seluruh badge JP di tabel compact dan grid view. |
| 9 | **Metadata Kelas** | Header di dalam `/kelas-saya/[rombel_id]` | DTO `penugasan` | **Sintetis (Badge JP)** | Muncul lagi "3 JP / Minggu" di dalam workspace detail kelas. | Ganti dengan label Kurikulum Merdeka (Fase E/F) atau hilangkan badge JP. |
| 10 | **Quick Actions** | Tombol navigasi footer kartu | Link `/kelas-saya/[id]` | Valid | Terlalu minim aksi; alur presensi harian guru terhambat. | Tambahkan shortcut "Presensi Kilat" langsung dari kartu kelas. |

---

# 4. Evaluasi Paradigma Halaman: Dari "Struktur Akademik" Menuju "Workspace Pembelajaran"

### 4.1. Mengapa Paradigma Struktur Akademik Sekolah Harus Ditinggalkan pada Halaman Ini?
Paradigma lama memandang kelas sebagai **Unit Penugasan Birokrasi**:
- Guru dilihat sebagai pegawai yang "dibebani jam mengajar" (misal: "Beban KBM Anda adalah 3 JP").
- Tampilan didominasi oleh kode mapel, alokasi jam, dan struktur rombel dinas.
- Hal ini relevan bagi Operator Sekolah atau Kepala Sekolah yang menyusun laporan Dapodik/Simpatika, namun **sangat tidak relevan bagi guru yang sedang bersiap mengajar di depan kelas.**

### 4.2. Paradigma Baru: Teaching & Learning Workspace (Ruang Kerja Mengajar)
Guru mandiri membutuhkan antarmuka yang menjawab 3 pertanyaan esensial setiap hari:
1. **Kelas mana yang saya ajar hari ini?**
2. **Apakah materi dan tugas untuk kelas tersebut sudah siap dibagikan?**
3. **Bagaimana saya bisa langsung mencatat kehadiran dan nilai murid saya tanpa klik berbelit-belit?**

Oleh karena itu, halaman `/kelas-saya` harus bertransformasi menjadi **Direktori Ruang Belajar Guru**, di mana setiap kartu kelas adalah pintu gerbang operasional pembelajaran aktif.

---

# 5. Desain Ulang Konsep Kartu Kelas (Class Card Evolution)

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│  KARTU KELAS SAAT INI (TERKONTAMINASI DATA SINTETIS)                                                   │
├────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│  [ KKA ] [ Tingkat 10 ]  2026/2027 Gasal                                    [ 3 JP / mgg ]  <-- PALSU  │
│  X TO 3                                                                                                │
│  Koding dan Kecerdasan Artifisial                                                                      │
│  ┌──────────────┬──────────────┬──────────────┬──────────────┐                                         │
│  │   BAB : 0    │  Materi : 0  │  Tugas : 0   │  Jurnal : 0  │  <-- NOL POLOS TANPA STATUS            │
│  └──────────────┴──────────────┴──────────────┴──────────────┘                                         │
│  [ 38 Siswa ]                                                               [ Buka Workspace -> ]     │
└────────────────────────────────────────────────────────────────────────────────────────────────────────┘

                                                    ▼ DIUBAH MENJADI

┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│  KARTU KELAS BARU (TEACHING WORKSPACE CARD — ACADEMIC GLASS UI v2.0)                                   │
├────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│  [ X TO 3 ]  Koding & Kecerdasan Artifisial             [ Belum Ada Modul • Perlu Disiapkan ] (Amber)   │
│  Tingkat 10 • Kurikulum Merdeka (Fase E) • 38 Siswa                                                    │
├────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│  STATUS PERANGKAT & AKTIVITAS PEMBELAJARAN:                                                            │
│  ┌──────────────┬──────────────┬──────────────┬──────────────┬──────────────┐                          │
│  │  0 Lingkup   │   0 Bahan    │   0 Tugas    │    0 Ujian   │   0 Catatan  │                          │
│  │  Materi (TP) │    Ajar      │    LKPD      │      CBT     │   Jurnal KBM │                          │
│  └──────────────┴──────────────┴──────────────┴──────────────┴──────────────┘                          │
│  Aktivitas: Sesi KBM belum pernah dibuka • Presensi belum ada data                                     │
├────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│  [ ⚡ Presensi Kilat ]                                                     [ Masuk Ruang Kelas -> ]    │
└────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### Peningkatan Kunci pada Kartu Kelas Baru:
1. **Hilangnya Data Fiktif:** Beban "3 JP / mgg" dihapus 100%.
2. **Status Kesiapan Jelas:** Guru langsung melihat badge status: *"Belum Ada Modul • Perlu Disiapkan"* (jika konten masih 0) atau *"Siap KBM (3 Modul Aktif)"* (jika materi sudah diunggah).
3. **Pilar Pembelajaran Lengkap (5 Item):** Lingkup Materi (TP), Bahan Ajar, Tugas LKPD, CBT Ujian Daring, dan Jurnal KBM.
4. **Contextual Action:** Tombol cepat *"Presensi Kilat"* langsung membuka modal presensi pertemuan hari ini tanpa harus masuk ke dalam tab workspace.

---

# 6. Audit & Rekomendasi Pemindahan Tombol "+ Foto Absen AI"

### 6.1. Fakta Masalah:
- Tombol `+ Foto Absen AI` di toolbar `/kelas-saya` adalah **dead button** karena tidak ada event listener yang terpasang di rute ini.
- Judul tombol menimbulkan salah tafsir berat antara "Presensi Kamera AI Harian" vs "Ekstraksi Lembar Kertas Siswa Baru".

### 6.2. Rekomendasi Relokasi:
1. **Hapus Tombol Standalone dari Toolbar `/kelas-saya`:**  
   Bilah toolbar atas hanya menyisakan tombol primer yang jelas: **`+ Tambah Kelas Baru`**.
2. **Integrasikan ke Dalam Modal Dialog `Tambah Kelas Baru`:**  
   Ketika guru mengklik `+ Tambah Kelas Baru`, modal menyajikan 2 pilihan metode onboarding yang ramah:
   - **Metode 1 (Formulir Cepat):** Mengisi nama kelas, tingkat, mapel, dan paste daftar nama siswa.
   - **Metode 2 (Scan Lembar Absensi Kertas dengan AI):** Membuka kamera/unggah foto lembar daftar siswa untuk diekstrak otomatis oleh Google Gemini.
3. **Untuk Fitur Presensi Kamera Harian (Jika Direncanakan):**  
   Harus ditempatkan di halaman **Sesi Pembelajaran Aktif** (`/sesi-pembelajaran`) atau modal **Presensi Pertemuan**, bukan di direktori daftar kelas.

---

# 7. Rencana Aksi Eksekusi STAGE 11.1 (Actionable Plan)

Setelah audit ini disetujui, langkah perbaikan yang akan dieksekusi adalah:

```
[EKSEKUSI STAGE 11.1]
  │
  ├── 1. BACKEND CLEANUP:
  │    └── Hapus hardcoded 'jumlah_jam_minggu: 3' pada smart-onboarding-service.ts
  │
  ├── 2. PRESENTATION / KELAS SAYA:
  │    ├── Hapus Kartu 'Beban KBM (JP)' dari Summary Cards
  │    ├── Ganti dengan Metrik 'Perangkat Ajar (BAB & Modul)'
  │    ├── Hapus badge '3 JP/mgg' pada Class Card Grid dan Compact Table
  │    ├── Tambahkan Status Kesiapan Kelas (Readiness Badge)
  │    └── Hapus tombol mati '+ Foto Absen AI' dari toolbar utama
  │
  ├── 3. MODAL TAMBAH KELAS:
  │    └── Satukan alur Scan Foto Lembar Kertas ke dalam ManualCreateClassModal
  │
  └── 4. WORKSPACE DETAIL (/kelas-saya/[id]):
       └── Hapus badge '3 JP / Minggu' pada Header Workspace Kelas
```

---

# 8. Kesimpulan & Penyerahan

Audit terhadap halaman `/kelas-saya` membuktikan bahwa:
- Angka **"3 JP / Minggu"** adalah **100% data sintetis** akibat default backend tanpa keterlibatan guru.
- Halaman saat ini masih mengusung paradigma formal kurikulum yang tidak relevan bagi guru mandiri.
- Tombol **"+ Foto Absen AI"** di toolbar saat ini tidak berfungsi dan salah penempatan.

Dokumen ini merumuskan perbaikan konkret untuk menjadikan `/kelas-saya` sebagai **Teaching & Learning Workspace sejati**.

Sesuai instruksi:
**KODE SAMA SEKALI TIDAK DIUBAH.**
**DATABASE SAMA SEKALI TIDAK DIUBAH.**
**MIGRASI TIDAK DIBUAT.**

**READY FOR HUMAN REVIEW**  
**STOP**
