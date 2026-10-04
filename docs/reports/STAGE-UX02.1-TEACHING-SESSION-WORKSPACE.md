# RUANG PINTAR SAAS — STAGE UX-02.1 MASTER DESIGN
# TEACHING SESSION WORKSPACE SPECIFICATION
## Desain Ruang Kerja Sesi Mengajar Real-Time (The Real-Time Classroom Cockpit)

| Metadata | Nilai |
| :--- | :--- |
| **Stage** | STAGE UX-02.1 — TEACHING SESSION WORKSPACE DESIGN |
| **Status** | `PROPOSAL & MASTER WORKSPACE DESIGN (READY FOR REVIEW)` |
| **Prinsip Utama** | Teacher-First • Session-Centric • Real-Time Awareness • Minimal Cognitive Load • Academic Glass UI v1.2 |
| **Mandat** | JANGAN MENULIS KODE • JANGAN MEMBUAT KOMPONEN • HANYA ANALISIS PRODUK & DESAIN WORKSPACE |

---

## 1. Definisi Resmi Teaching Session Workspace

### 1.1. Konseptualisasi Unit Kerja Guru
Dalam realitas operasional sekolah, guru tidak bekerja dalam isolasi modul (misal: "Saya membuka modul presensi, lalu menutupnya dan membuka modul tugas"). Unit kerja nyata guru adalah **Sesi Pertemuan Mengajar Terjadwal**.

> **Definisi:**  
> **Teaching Session Workspace** adalah ruang kerja terpadu waktu-nyata (*real-time execution cockpit*) yang mengonsolidasikan seluruh aktivitas satu pertemuan KBM spesifik (identitas sesi, waktu berjalan, presensi kilat, pemaparan materi, penugasan, dan pencatatan jurnal) ke dalam **satu layar kerja utuh** tanpa perpindahan tab atau rute halaman.

```text
[HIERARKI ARSITEKTUR KONSEPTUAL]

Level 1: DASHBOARD GURU (Daily Awareness Hub)
         "Hari ini saya ada 3 sesi mengajar. Sesi jam 08.00 XII RPL sedang aktif."
                          │
                          ▼ [Klik 1 Tombol: MULAI MENGAJAR]
Level 2: TEACHING SESSION WORKSPACE (Real-Time Execution Cockpit)  <-- THE CORE WORKSPACE
         "Saya sedang mengajar Pertemuan 7. Presensi kilat selesai, materi ditampilkan,
          tugas dibuka, dan jurnal terisi otomatis dalam satu layar."
                          │
                          ▼ [Sesi Selesai / Arsip Jangka Panjang]
Level 3: RUANG KELAS INDUK (Parent Academic Container)
         Silabus semester, bank modul seluruh bab, rekap absensi kumulatif,
         buku nilai ledger semester, dan bank soal CBT.
```

---

## 2. Pemicu Kemunculan Workspace (Trigger & Entry Points)

Teaching Session Workspace muncul melalui **3 Jalur Masuk yang Sangat Cepat**:

1. **Jalur Utama (1-Click Primary CTA dari Dashboard):**
   - Guru membuka `/dashboard`, melihat banner sesi aktif jam ini:  
     `08:00 - 09:30 | XII RPL — Pemrograman Web | Lab Komputer 2`
   - Guru mengklik tombol utama: **`[ >>> MULAI MENGAJAR SEKARANG <<< ]`**.
   - Sistem **langsung membuka Teaching Session Workspace** sesi tersebut. Guru tidak perlu melewati daftar kelas atau memilih tab.
2. **Jalur Halaman Kelas:**
   - Dari `/kelas-saya/[id]`, pada tab Cockpit Kelas, terdapat kartu sesi hari ini dengan tombol `[Masuk Sesi Mengajar]`.
3. **Jalur Riwayat / Susulan:**
   - Guru dapat membuka workspace sesi pertemuan sebelumnya jika ingin melengkapi jurnal atau mengoreksi presensi susulan yang belum dikunci.

---

## 3. Matriks Informasi Wajib Tampil (Information Hierarchy)

Informasi diorganisasi dengan prioritas ketat dari atas ke bawah untuk meminimalkan beban kognitif:

| Prioritas | Komponen Informasi | Nilai & Makna Operasional |
| :---: | :--- | :--- |
| **P0** | **Identitas Sesi & Kelas** | Rombel (`XII RPL`), Mapel (`Pemrograman Web`), Ruang (`Lab Komputer 2`), Nomor Pertemuan (`Pertemuan ke-7`). |
| **P0** | **Time Horizon Indicator** | Jam mulai-selesai (`08:00 - 09:30`), Progress Bar Waktu Berjalan, dan countdown menit tersisa (`35 Menit Tersisa`). |
| **P0** | **Status Alur 4 Pilar** | Status 4 pekerjaan wajib: Presensi (`Belum/Selesai`), Materi (`Siap`), Tugas (`Aktif`), Jurnal (`Belum/Selesai`). |
| **P1** | **Active Dynamic Panel** | Area kerja utama untuk menyelesaikan aksi yang dipilih (Presensi Kilat, Modul Ajar, Tugas, atau Jurnal). |
| **P1** | **Quick Roster & Avatar Stack** | Jumlah siswa (`👥 15 Siswa`), avatar mini dengan indikator warna status kehadiran (hijau=hadir, kuning=sakit/izin). |
| **P2** | **Session Completion Bar** | Tombol primer sticky: **`[ Kunci & Selesaikan Pertemuan KBM ]`** dengan persentase progres sesi (0% s/d 100%). |

---

## 4. Evaluasi & Rekomendasi: Progress Bar Waktu Berjalan

```text
08:00 ───────────────────────────────────────── 09:30
████████████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                    62%  •  35 Menit Tersisa
```

### Rekomendasi Produk: SANGAT LAYAK & KRUSIAL (REKOMENDASI: ADOPSI)
Di ruang kelas nyata, guru sering kehilangan kesadaran waktu (*time blindness*) saat asyik menjelaskan materi di papan tulis atau mendampingi siswa di komputer. Tiba-tiba bel berbunyi padahal absensi belum dikunci dan jurnal belum dicatat.

### Desain Sistem Adaptif Waktu:
1. **Fase Awal (0% – 50% Waktu Berjalan | > 45 Menit):**
   - Warna progress bar: **Biru Lembut / Emerald** (`bg-emerald-500`).
   - Indikator: *"Fase Pemaparan Materi & Diskusi"*.
2. **Fase Kerja Mandiri (50% – 80% Waktu Berjalan | 20 – 45 Menit Tersisa):**
   - Warna progress bar: **Kuning Emas** (`bg-amber-500`).
   - Indikator: *"Fase Latihan / Tugas Praktik Siswa"*.
3. **Fase Penutupan (80% – 100% Waktu Berjalan | < 15 Menit Tersisa):**
   - Warna progress bar: **Oranye Tegas / Merah Halus** (`bg-rose-500 animate-pulse`).
   - Indikator peringatan mengambang: *"10 Menit Tersisa: Kunci Presensi & Simpan Jurnal KBM"*.

---

## 5. Standar Visual Status Sesi (Academic Glass UI v1.2)

Menggunakan standar Academic Glass UI dengan kode visual yang tegas:

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│ 1. SEDANG BERLANGSUNG (LIVE ACTIVE SESSION)                                 │
│ • Permukaan: Glassmorphism beraksen biru lembut (bg-blue-50/50 dark:900/60) │
│ • Border: Glowing border biru (border-blue-500/80 shadow-[0_0_20px_blue])   │
│ • Badge: Hijau berdenyut (Live Dot: bg-emerald-500 animate-pulse)           │
│ • Ikon: PlayCircle dengan rotasi aksen halus                                │
├─────────────────────────────────────────────────────────────────────────────┤
│ 2. AKAN DATANG (UPCOMING SESSION)                                           │
│ • Permukaan: Kartu kaca netral (bg-white/70 dark:bg-slate-900/50)            │
│ • Border: Border tipis slate (border-slate-200/80 dark:border-slate-800)    │
│ • Badge: Abu-abu kebiruan (bg-slate-100 text-slate-700: "Menunggu Waktu")   │
│ • Ikon: Clock statis                                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│ 3. SELESAI (COMPLETED SESSION)                                              │
│ • Permukaan: Kartu kaca redup elegan (bg-emerald-50/30 dark:bg-slate-900/40) │
│ • Border: Hijau lembut (border-emerald-200/70 dark:border-emerald-900/40)   │
│ • Badge: Hijau centang (bg-emerald-100 text-emerald-800: "Tuntas 100%")     │
│ • Ikon: CheckCircle2                                                        │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 6. Evaluasi Avatar Stack Siswa (`👥 15 Siswa | ○ ○ ○ ○ ○ +10`)

### Rekomendasi: LAYAK DENGAN FUNGSI INTERAKTIF (BUKAN HIASAN KOSONG)
Jika avatar stack hanya gambar mati, itu melanggar *Anti-Slop Directive*. Namun jika diberi fungsi kecerdasan visual, avatar stack menjadi alat bantu berdaya guna tinggi bagi guru.

### Implementasi UX Fungsional:
1. **Live Presence Border:**
   - Lingkaran avatar siswa diberi ring warna status:
     - 🟢 Ring Hijau: Siswa Hadir
     - 🟡 Ring Kuning: Siswa Izin / Sakit
     - 🔴 Ring Merah: Siswa Alpha
     - ⚪ Ring Putih/Abu: Belum Ditandai
2. **1-Tap Quick Trigger:**
   - Mengetuk kelompok avatar stack secara otomatis membuka/mengalihkan panel kerja ke **Presensi Kilat**.
3. **Tooltip Siswa Absen:**
   - Mengarahkan kursor atau mengetuk badge ringkasan langsung memunculkan popover nama-nama siswa yang berhalangan hadir (misal: *"Ardiansyah (Sakit)"*).

---

## 7. Arsitektur "Single-Screen Unified Deck" (Tanpa Tab Switching)

Tantangan terbesar: *Bagaimana menyatukan Presensi, Materi, Tugas, dan Jurnal dalam satu layar tanpa membingungkan guru?*

### Solusi Desain: "The Master Session Deck"
Alih-alih menggunakan 4 tab halaman yang terisolasi, workspace menggunakan model **Panel Aksi Terpadu (Accordion / Contextual Deck)**:

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                    HEADER SESI: IDENTITAS & TIME REMAINING                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                    WORKFLOW BAR: 4 PILAR UTAMA KBM                          │
│   [✓ 1. Presensi]   [✓ 2. Materi]   [● 3. Tugas Aktif]   [○ 4. Jurnal KBM]  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│                    DYNAMIC ACTION WORKSPACE (PANEL AKTIF)                   │
│                                                                             │
│   Area ini menampilkan konten dari pilar yang sedang dipilih guru:          │
│   • Saat klik "Presensi": Menampilkan Grid Presensi Kilat (<15 Detik).       │
│   • Saat klik "Materi": Menampilkan Slide/PDF/Ringkasan Topik Hari Ini.     │
│   • Saat klik "Tugas": Menampilkan Status Latihan & Pengumpulan Siswa.      │
│   • Saat klik "Jurnal": Menampilkan Form 2 Baris Catatan KBM Guru.          │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                    STICKY BOTTOM BAR: PROGRESS & FINALIZE                   │
│   Progress Pertemuan: [ ████████████████░░░░ ] 75%                          │
│   [ Simpan Draft Sementara ]             [ >>> SELESAIKAN & KUNCI SESI <<< ] │
└─────────────────────────────────────────────────────────────────────────────┘
```

Dengan pola ini:
- Guru selalu tahu berada di sesi mana.
- Sisa waktu selalu terlihat.
- Berpindah antar pilar hanya membutuhkan **1 ketukan**, tanpa memuat ulang halaman (*zero page reload*).
- Setiap langkah yang selesai langsung memberi tanda centang hijau `[✓]`, memicu rasa kepuasan (*sense of accomplishment*).

---

## 8. Wireframe Teks Lengkap Teaching Session Workspace

```text
+--------------------------------------------------------------------------------------------------+
| <- Dashboard Guru                         SMK OTOMINDO                    Rabu, 24 September 2026|
+--------------------------------------------------------------------------------------------------+
| [!] SESI KBM AKTIF DETIK INI                                                                     |
|                                                                                                  |
| KELAS: XII RPL   •   MAPEL: Pemrograman Berbasis Objek   •   RUANG: Lab Komputer 2               |
| Pertemuan ke-7 dari 14: Pembuatan REST API Controller & Routing Express.js                       |
|                                                                                                  |
| WAKTU SESI: 08:00 - 09:30 WIB                                                                    |
| 08:00 ─────────────────────────────────────────────────────────────── 09:30                      |
| ████████████████████████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  62%                        |
|                                                                                                  |
| Status Waktu: 35 Menit Tersisa (Fase Latihan Praktik Siswa)                                      |
| Rombel Siswa: 👥 15 Siswa  [ 🟢 14 Hadir  |  🟡 1 Sakit: Ardiansyah ]                            |
+--------------------------------------------------------------------------------------------------+
|                                                                                                  |
| ALUR KERJA SESI PERTEMUAN (WORKFLOW CHECKLIST)                                                   |
| +------------------------+ +------------------------+ +------------------+ +-------------------+ |
| | [✓] 1. PRESENSI KILAT  | | [✓] 2. MODUL MATERI    | | [*] 3. TUGAS     | | [ ] 4. JURNAL KBM | |
| | 14 Hadir, 1 Sakit      | | Bab 3: REST API Slide  | | Latihan Praktik  | | Belum Dicatat     | |
| | (Status: TERKUNCI)     | | (Status: TAMPIL)       | | (12/15 Submit)   | | (Ketuk Buat)      | |
| +------------------------+ +------------------------+ +------------------+ +-------------------+ |
|                                                                                                  |
| ============================== AREA KERJA AKTIF: TUGAS PRAKTIK ================================= |
|                                                                                                  |
| Topik Tugas: Latihan Endpoint GET & POST Controller (Express.js)                                 |
| Batas Pengumpulan: Hari Ini, 09.30 WIB (Saat jam KBM berakhir)                                   |
|                                                                                                  |
| STATUS PENGUMPULAN SISWA KELAS XII RPL (12 / 15 Siswa):                                          |
| +----+---------------------------+------------------------+------------------+-----------------+ |
| | No | Nama Siswa                | Waktu Submit           | File Lampiran    | Status Nilai    | |
| +----+---------------------------+------------------------+------------------+-----------------+ |
| | 1  | A. Rizki Fadilah          | 08:42 WIB              | controller.js    | [ 88 ✎ ]        | |
| | 2  | Abdillah Darma Bhakti     | 08:45 WIB              | api_routes.zip   | [ 85 ✎ ]        | |
| | 3  | Arya Fayyaz Reyhan W.     | 08:50 WIB              | server.js        | [ 90 ✎ ]        | |
| | 4  | Ardiansyah                | - (Sakit)              | -                | [ Izin Sakit ]  | |
| | 5  | Dhefa Hartono             | Belum Mengumpulkan     | -                | [ Ingatkan ]    | |
| +----+---------------------------+------------------------+------------------+-----------------+ |
| [ + Berikan Perpanjangan Waktu ]        [ Unduh Semua Berkas (ZIP) ]        [ Nilai Otomatis ]   |
|                                                                                                  |
| ================================================================================================ |
|                                                                                                  |
| RINGKASAN JURNAL OTOMATIS (TERISI DARI SILABUS PERTEMUAN 7):                                     |
| "Guru memaparkan struktur modular routing Express. Siswa mempraktikkan controller CRUD."         |
| [ Edit Ringkasan Jurnal ]                                                                        |
|                                                                                                  |
| +----------------------------------------------------------------------------------------------+ |
| | Progres Sesi: [ ██████████████████████████████░░░░░░░░░░ ] 75% Selesai                       | |
| | [ Simpan Draft Sementara ]                       [ >>> KUNCI & SELESAIKAN SESI KBM <<< ]    | |
| +----------------------------------------------------------------------------------------------+ |
+--------------------------------------------------------------------------------------------------+
```

---

## 9. Analisis Risiko UX (UX Risks)

1. **Risiko Overcrowding (Kepadatan Layar):**
   - Jika 4 panel (Presensi, Materi, Tugas, Jurnal) dibuka bersamaan, layar menjadi sempit.
   - *Mitigasi:* Gunakan pola **Active Focus Panel** (hanya satu pilar yang aktif dibuka di tengah, sementara 3 pilar lainnya berwujud kartu ringkasan status di atas).
2. **Risiko Disorientasi Waktu (Time Sync Issue):**
   - Jam lokal di laptop guru berbeda beberapa menit dengan server sekolah.
   - *Mitigasi:* Hitung progress bar berbasis waktu server yang disinkronkan saat sesi dibuka (*server-synced time remaining*).
3. **Risiko Aksidental Kunci Sesi:**
   - Guru tidak sengaja menekan tombol selesai saat sesi baru berjalan 10 menit.
   - *Mitigasi:* Tampilkan konfirmasi modal elegan: *"Anda akan mengunci sesi Pertemuan 7. Presensi (14/15) dan Jurnal KBM akan diterbitkan ke sekolah. Lanjutkan?"*.

---

## 10. Keuntungan UX (UX Benefits)

1. **Zero Context Switching:** Guru tidak lagi melompat antar 4 halaman berbeda selama 90 menit mengajar.
2. **Kecepatan Tindakan 3x Lipat:** Presensi selesai < 15 detik, tugas dipantau langsung, dan jurnal tersimpan dengan 1 klik.
3. **Ketenangan Mental Guru (Mental Peace):** Progress bar waktu dan checklist 0–100% memberi kepastian psikologis bahwa seluruh tugas operasional kelas telah tuntas dengan sempurna.
4. **Pimpinan Sekolah Puas:** Pimpinan langsung menerima log sesi, absensi, dan jurnal resmi tepat waktu begitu guru menekan tombol selesai.

---

## 11. Dampak Terhadap Struktur STAGE UX-02

Konsep **Teaching Session Workspace** ini menyempurnakan dan memperkuat struktur STAGE UX-02:
- **Dashboard Guru:** Menjadi peluncur utama (*launcher*) yang mengarahkan tombol `[MULAI MENGAJAR]` langsung ke Teaching Session Workspace ini.
- **Ruang Kelas Saya:** Menjadi wadah arsip dan persiapan silabus jangka panjang, sementara Teaching Session Workspace menjadi panggung eksekusi waktu-nyata hari ini.
- **Pilar Triad Tetap Terpelihara:** LMS (Materi/Tugas), SIAKAD (Presensi/Jurnal), dan CBT dapat ditarik langsung ke dalam sesi aktif kapan saja.

---

## 12. Rekomendasi Akhir Produk

> [!IMPORTANT]
> **REKOMENDASI FINAL: SANGAT LAYAK MENJADI PUSAT PENGALAMAN GURU (CORE EXPERIENCE).**  
> Teaching Session Workspace adalah mata rantai yang hilang (*the missing link*) yang mengubah Ruang Pintar dari "aplikasi pendataan sekolah yang pasif" menjadi **"asisten mengajar aktif yang sangat dicintai guru di ruang kelas"**.
