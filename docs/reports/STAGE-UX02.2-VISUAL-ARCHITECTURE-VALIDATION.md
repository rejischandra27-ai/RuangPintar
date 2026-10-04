# RUANG PINTAR SAAS — STAGE UX-02.2 MASTER SPECIFICATION
# VISUAL ARCHITECTURE & WIREFRAME VALIDATION
## Validasi Hierarki Visual, Kepadatan Informasi, Responsivitas Multi-Device, dan Academic Glass UI v1.2

| Metadata | Nilai |
| :--- | :--- |
| **Stage** | STAGE UX-02.2 — VISUAL ARCHITECTURE & WIREFRAME VALIDATION |
| **Status** | `PROPOSAL & VISUAL ARCHITECTURE VALIDATED (READY FOR REVIEW)` |
| **Fokus Utama** | 3-Second Scan Rule • Anti-Slop Directive • Touch-First Mobile • Information Density Control |
| **Batasan Baku** | JANGAN MENULIS KODE • JANGAN MEMBUAT FILE JSX/TSX • HANYA VALIDASI VISUAL & WIREFRAME |

---

## 1. Visual Architecture Audit (The 3-Second Scan Rule)

Dalam lingkungan ruang kelas nyata, perhatian guru terbagi antara mengawasi puluhan siswa, menyampaikan materi di depan kelas, dan mengoperasikan perangkat. Jika antarmuka membutuhkan waktu lebih dari 3 detik untuk dipahami, guru akan frustrasi dan mengabaikan sistem.

```text
[POLA PINDAI MATA GURU: ATURAN 3 DETIK (3-SECOND SCAN RULE)]

Detik 1: ORIENTASI KONTEKS & WAKTU (Where am I & How much time?)
         Mata guru langsung menangkap Header Sesi:
         "XII RPL • Pemrograman Web • 35 Menit Tersisa"
                          │
                          ▼
Detik 2: ORIENTASI ALUR KERJA (What is done & What is missing?)
         Mata guru memindai Checklist Status 4 Pilar:
         [✓ Presensi: Selesai]  [✓ Materi: Tampil]  [● Tugas: Aktif]  [○ Jurnal: Belum]
                          │
                          ▼
Detik 3: AKSI EKSEKUSI TUNGGAL (What should I do right now?)
         Mata guru tertuju pada Primary Action CTA di area kerja aktif:
         Tombol Aksi Utama: [ Isi Ringkasan Jurnal ] atau [ Kunci Sesi Mengajar ]
```

### Evaluasi Pertanyaan Kunci Audit:
1. **Apakah layout terlalu padat?**  
   *Tidak*, karena menggunakan pola **Active Focus Panel**. Hanya satu pilar kerja yang dibuka melebar di tengah, sedangkan pilar lainnya berwujud kartu status ringkas.
2. **Apakah terlalu banyak informasi?**  
   *Tidak*, seluruh statistik pasif (grafik, rata-rata nilai, histori semester lampau) dipangkas dari Teaching Session Workspace dan dikembalikan ke halaman arsip kelas.
3. **Apakah guru akan terdistraksi?**  
   *Tidak*, dengan adanya **Focus Mode (Mode Fokus Mengajar)**, guru dapat menayangkan materi ke proyektor tanpa memamerkan data personal siswa atau kontrol administratif.
4. **Apakah layout mudah dipindai dalam 3 detik?**  
   *Ya*, kontras tipografi monospaced untuk waktu dan kode warna status (Hijau/Kuning/Biru) memberikan kejelasan visual instan.
5. **Apakah mobile tetap nyaman?**  
   *Sangat nyaman*, seluruh tombol aksi berada di zona jangkauan jempol (*Thumb Zone*) pada bagian bawah layar.

---

## 2. Information Density Matrix (Matriks Kepadatan Informasi)

Kami mengaudit setiap elemen data dan menetapkan klasifikasi keberadaannya di layar:

| Elemen Data | Klasifikasi Tampilan | Alasan & Rasional UX |
| :--- | :---: | :--- |
| **Nama Rombel & Mapel** | **WAJIB TAMPIL** | Konteks dasar identitas ruang kelas (Huruf Besar, Tebal, Monospace). |
| **Progress Bar Waktu & Sisa Menit** | **WAJIB TAMPIL** | Menghilangkan *time blindness* guru saat KBM berlangsung. |
| **Checklist Alur 4 Pilar** | **WAJIB TAMPIL** | Menampilkan progres capaian pertemuan (0% s/d 100%). |
| **Panel Kerja Aktif (Dynamic Panel)** | **WAJIB TAMPIL** | Panggung eksekusi pilar yang sedang dibuka (Presensi / Materi / Tugas / Jurnal). |
| **Tombol Kunci & Selesaikan Sesi** | **WAJIB TAMPIL** | Tombol penutup yang menerbitkan log KBM resmi ke pimpinan. |
| **Avatar Siswa & Roster Ringkas** | **OPSIONAL (RINGKAS)** | Disederhanakan menjadi `👥 15 Siswa` + 3 avatar berbingkai status kehadiran. |
| **Detail Nilai Tugas Tiap Siswa** | **PINDAHKAN KE PANEL TUGAS** | Hanya muncul jika guru mengeklik pilar Tugas. Tidak boleh mengotori layar utama. |
| **Detail Teks Lengkap Jurnal KBM** | **PINDAHKAN KE PANEL JURNAL** | Di layar utama cukup status centang `[✓ Jurnal Tercatat]`. Teks diedit di dalam panel. |
| **Grafik Performa & Donut Gauges** | **SEMBUNYIKAN SEPENUHNYA** | **DILARANG MUNCUL** saat KBM berlangsung. Ini data analitik pasif untuk pimpinan/evaluasi akhir. |
| **Histori Presensi Pertemuan Lalu** | **SEMBUNYIKAN SEPENUHNYA** | Tidak relevan saat jam pelajaran berjalan. Tersedia di Tab Presensi Ruang Kelas. |

---

## 3. Focus Mode Specification (Mode Fokus Mengajar)

### 3.1. Kebutuhan Nyata di Ruang Kelas
Ketika guru menghubungkan laptop ke proyektor LCD atau Smart TV kelas:
- Data presensi siswa (siapa yang sakit/alpha) bersifat privat dan tidak boleh terlihat oleh seluruh siswa di kelas.
- Nilai tugas dan catatan siswa bermasalah tidak boleh terpampang di layar proyektor.
- Menu administratif mengganggu fokus pandang siswa terhadap materi pelajaran.

```text
[SAKLAR MODE FOKUS: TEACHER VS PROJECTOR]

┌─────────────────────────────────────────────────────────────────────────────┐
│ Mode Normal (Cockpit Guru)          │ Mode Fokus (Tampilan Proyektor / TV)  │
├─────────────────────────────────────┼───────────────────────────────────────┤
│ • Kontrol Presensi Kilat            │ • Materi Pelajaran Layar Penuh (Slide)│
│ • Checklist Workflow Sesi           │ • Timer Mengambang Bersih (Miniatur)  │
│ • Catatan Jurnal & Perhatian Siswa  │ • Tidak Ada Data Nilai / Absensi      │
│ • Status Pengumpulan Tugas Siswa    │ • Tidak Ada Menu Sidebar              │
└─────────────────────────────────────┴───────────────────────────────────────┘
```

### 3.2. Spesifikasi Interaksi Mode Fokus
- Pemicu: Tombol ikon `Maximize` / `[ Tayangkan ke Proyektor ]` di sebelah kanan materi.
- Pintasan Keyboard: Menekan tombol `F` atau `F11`.
- Pengaman: Menekan tombol `Escape` (`Esc`) langsung mengembalikan layar ke Cockpit Sesi Guru.

---

## 4. Desktop Wireframe (Viewport >= 1024px)

Pendekatan layout: **Header Sesi Terpadu + 2 Kolom Asimetris (66% Workspace Kiri + 33% Workflow Rail Kanan) + Sticky Footer**.

```text
+----------------------------------------------------------------------------------------------------------------+
| <- Dashboard Guru                              SMK OTOMINDO                           Rabu, 24 Sep 2026, 08:25 |
+----------------------------------------------------------------------------------------------------------------+
| [!] SESI SEDANG BERLANGSUNG                                                                                   |
| KELAS: XII RPL   •   MAPEL: Pemrograman Berbasis Objek   •   RUANG: Lab Komputer 2                             |
| Pertemuan ke-7: Pembuatan REST API Controller & Routing Express.js                                             |
|                                                                                                                |
| 08:00 ───────────────────────────────────────────────────────────────────────────────────────────── 09:30      |
| ██████████████████████████████████████████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  62% • 35 Mnt Tersisa   |
+----------------------------------------------------------------------------------------------------------------+
| AREA KERJA UTAMA (KOLOM KIRI: 66% LEBAR)                  | RAIL ALUR KERJA (KOLOM KANAN: 33% LEBAR)           |
|                                                           |                                                    |
| [ Pilihan Pilar: Presensi | Materi | [TUGAS] | Jurnal ]   | CHECKLIST WORKFLOW SESI (0% - 100%)                |
|                                                           | +------------------------------------------------+ |
| === PANEL AKTIF: TUGAS PRAKTIK CONTROLLER ===             | | [✓] 1. Buka Sesi Kelas (08.00 WIB) ...........OK| |
| Judul: Latihan Endpoint CRUD Controller Express.js        | | [✓] 2. Presensi Siswa (14 Hadir, 1 Sakit) ....OK| |
| Status Pengumpulan: 12 dari 15 Siswa Selesai              | | [✓] 3. Paparkan Materi Modul 3.1 .............OK| |
| Batas Waktu: 09.30 WIB (Akhir jam pelajaran)              | | [*] 4. Buka Tugas Praktik Mandiri ....[AKTIF]  | |
|                                                           | | [ ] 5. Tulis Ringkasan Jurnal KBM ....[BELUM]  | |
| TABEL MONITOR PENGUMPULAN:                                | | [ ] 6. Kunci & Tutup Sesi Pertemuan ..[BELUM]  | |
| +----+----------------------+------------+--------------+ | +------------------------------------------------+ |
| | No | Nama Siswa           | Waktu      | Status Nilai | |                                                    |
| +----+----------------------+------------+--------------+ | KOTAK PERHATIAN KELAS HARI INI                     |
| | 1  | A. Rizki Fadilah     | 08:42 WIB  | [ 88 ✎ ]     | | • 👥 Roster: 14 Hadir, 1 Sakit (Ardiansyah)        |
| | 2  | Abdillah Darma B.    | 08:45 WIB  | [ 85 ✎ ]     | | • Dhefa Hartono belum mengirim tugas latihan     |
| | 3  | Arya Fayyaz R. W.    | 08:50 WIB  | [ 90 ✎ ]     | |                                                    |
| | 4  | Dhefa Hartono        | Belum      | [Ingatkan]   | | [ Mode Fokus Proyektor (F) ]                       |
| +----+----------------------+------------+--------------+ | [ Salin Kode Gabung: RP-7782 ]                     |
| [ Unduh Berkas ZIP ]              [ Nilai Otomatis CBT ]  |                                                    |
+----------------------------------------------------------------------------------------------------------------+
| STICKY ACTION FOOTER:                                                                                          |
| Progres KBM Pertemuan: [ ██████████████████████████████░░░░░░░░░░ ] 75%                                        |
| [ Simpan Catatan Sementara ]                                       [ >>> KUNCI & SELESAIKAN SESI KBM (v) <<< ] |
+----------------------------------------------------------------------------------------------------------------+
```

---

## 5. Tablet Layout (Viewport 768px – 1023px)

Pada tablet atau laptop kecil (Chromebook), 2 kolom desktop diubah menjadi **1 Kolom Vertikal Terpadu**. Checklist alur kerja disajikan dalam bentuk **Horizontal Step Ribbon** di bawah header waktu.

```text
+-------------------------------------------------------------------------------+
| <- Dashboard              SMK OTOMINDO — XII RPL             35 Menit Tersisa |
+-------------------------------------------------------------------------------+
| KELAS: XII RPL • Pemrograman Berbasis Objek (Pertemuan 7)                     |
| 08:00 ████████████████████████████████░░░░░░░░░░░░░░░░ 09:30 (62%)            |
+-------------------------------------------------------------------------------+
| WORKFLOW STEP RIBBON (HORIZONTAL SWIPEABLE):                                  |
| [✓ 1. Presensi (14/15)] -> [✓ 2. Materi] -> [* 3. Tugas (12/15)] -> [○ 4. Jurnal] |
+-------------------------------------------------------------------------------+
|                                                                               |
| AREA KERJA AKTIF TABLET (100% LEBAR LAYAR):                                   |
| Status: Tugas Praktik Controller Express.js (12/15 Siswa)                     |
|                                                                               |
| [A. Rizki Fadilah - 08:42 - 88 ✎]      [Abdillah Darma - 08:45 - 85 ✎]        |
| [Arya Fayyaz R. - 08:50 - 90 ✎]        [Dhefa Hartono - Belum [Ingatkan]]     |
|                                                                               |
| (+ 11 Siswa Lainnya)                                                          |
|                                                                               |
| [ Unduh Semua ZIP ]                                [ Nilai Massal ]           |
|                                                                               |
+-------------------------------------------------------------------------------+
| STICKY FOOTER TABLET:                                                         |
| Progress: 75%                          [ >>> KUNCI & SELESAIKAN SESI <<< ]   |
+-------------------------------------------------------------------------------+
```

---

## 6. Mobile Layout (Viewport < 768px — The One-Thumb Experience)

Asumsi nyata: Guru membawa smartphone saat berkeliling memeriksa meja siswa. Semua interaksi utama wajib berada di **Zona Jangkauan Jempol (*Thumb Zone*)** pada paruh bawah layar.

```text
+------------------------------------+
| 08:25                 SMK OTOMINDO |
| <- Dashboard         [Pertemuan 7] |
+------------------------------------+
| XII RPL — Pemrograman Web          |
| 35 Menit Tersisa (08.00 - 09.30)   |
| ██████████████████░░░░░░░░░░ 62%   |
+------------------------------------+
| [✓ Presensi] [✓ Materi] [* Tugas]  |
+------------------------------------+
| TUGAS PRAKTIK BERJALAN:            |
| 12 dari 15 siswa sudah mengumpulkan|
|                                    |
| • A. Rizki Fadilah ...... [ Nilai ]|
| • Abdillah Darma ........ [ Nilai ]|
| • Arya Fayyaz ........... [ Nilai ]|
| • Dhefa Hartono ......... [ Belum ]|
|                                    |
| [ + Ingatkan Siswa Belum Kumpul ]  |
+------------------------------------+
| BOTTOM ACTION SHEET (THUMB ZONE):  |
|                                    |
| Progress Pertemuan: 75%            |
| [ >>> SELESAIKAN KELAS (v) <<< ]   |
+------------------------------------+
```

---

## 7. Active Session Card Refinement

Evaluasi kartu identitas sesi aktif:
- **Elemen yang Diperbesar:**
  - **Nama Rombel (`XII RPL`)**: Ukuran font `text-xl sm:text-2xl font-black font-mono` agar langsung terbaca dari jarak 1 meter.
  - **Countdown Waktu (`35 Menit Tersisa`)**: Dilengkapi badge status waktu.
- **Elemen yang Diperkecil / Disederhanakan:**
  - **Avatar Stack**: Cukup 3 lingkaran avatar inisial (`○ ○ ○ +12`) dengan ring status kehadiran. Jangan tampilkan foto ukuran besar yang memakan ruang.
  - **Nama Mapel & Ruang**: Teks pendukung `text-xs sm:text-sm font-semibold text-slate-600`.

---

## 8. Evaluasi Posisi Checklist Workflow

| Pola Posisi | Kesesuaian Perangkat | Kelebihan UX | Kekurangan | Status Keputusan |
| :--- | :---: | :--- | :--- | :---: |
| **Vertical Rail Kanan (Sticky)** | **Desktop (>=1024px)** | Mengikuti alur baca F-shape, mata guru selalu melihat daftar checklist tanpa tertutup panel kerja utama. | Memakan lebar layar pada layar sempit. | **DIPILIH UNTUK DESKTOP** |
| **Horizontal Step Ribbon** | **Tablet & Mobile** | Sangat ringkas, membagi layar atas-bawah secara bersih, mendukung geser jempol horizontal. | Ruang teks judul terbatas pada nama modul panjang. | **DIPILIH UNTUK TABLET/HP** |
| **Floating Bubble Menu** | Semua | Melayang di atas konten. | **DITOLAK**: Sering menutupi tombol penting dan teks materi ajar. | **DITOLAK** |

---

## 9. Academic Glass UI v1.2 Rules (Anti-Slop Directive)

Untuk menjamin antarmuka tetap elegan, jernih, dan tidak terlihat seperti template AI murahan:

```text
[ATURAN BAKU ANTI-SLOP ACADEMIC GLASS UI]

1. BLUR & TRANSPARENCY:
   • Gunakan moderat: backdrop-blur-md (8px - 12px). Dilarang over-blur 30px-40px.
   • Opasitas permukaan: 85% - 90% solid (bg-white/90 dark:bg-slate-900/90).
   • Alasan: Menjamin kontras teks memenuhi standar WCAG AAA di bawah lampu terang kelas.

2. BORDERS & ACCENTS:
   • Border tipis berdimensi: border border-slate-200/80 dark:border-blue-500/25.
   • Dilarang: Border tebal gradien neon pelangi yang mengalihkan fokus.

3. GLOW EFFECTS (DISIPLIN KETAT):
   • Glow hanya boleh digunakan pada TEPAT SATU ELEMEN: Live Active Session Indicator.
   • Menggunakan aksen bayangan biru lembut (shadow-[0_0_20px_-3px_rgba(37,99,235,0.25)]).
   • Kartu lain DILARANG menggunakan glow.

4. ANIMASI & MOTIONS:
   • Micro-transition durasi 150ms - 200ms ease-out.
   • Dilarang: Floating cards, spinning shapes, atau partikel dekoratif yang tidak fungsional.
```

---

## 10. Visual Status Design System

Standarisasi status sesi KBM yang seragam di seluruh modul Ruang Pintar:

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│ 1. SEDANG BERLANGSUNG (LIVE ACTIVE)                                         │
│ • Border: border-blue-500/80 shadow-[0_0_20px_rgba(37,99,235,0.25)]        │
│ • Badge: bg-emerald-50 text-emerald-700 border-emerald-200 (Live Dot Pulsa) │
│ • Arti: Sesi jam pelajaran sedang aktif detik ini.                          │
├─────────────────────────────────────────────────────────────────────────────┤
│ 2. AKAN DATANG (UPCOMING)                                                   │
│ • Border: border-slate-200/80 dark:border-slate-800                         │
│ • Badge: bg-slate-100 text-slate-700 (Ikon Clock Netral)                    │
│ • Arti: Sesi belum dimulai (jam pelajaran berikutnya).                      │
├─────────────────────────────────────────────────────────────────────────────┤
│ 3. SELESAI (COMPLETED)                                                      │
│ • Border: border-emerald-200/70 dark:border-emerald-900/40                  │
│ • Badge: bg-emerald-100 text-emerald-800 (Ikon CheckCircle2)                │
│ • Arti: Presensi, jurnal, dan KBM telah dikunci resmi.                      │
├─────────────────────────────────────────────────────────────────────────────┤
│ 4. TERLAMBAT / MELEWATI WAKTU (OVERDUE SCHEDULE)                            │
│ • Border: border-amber-300 dark:border-amber-700/60                         │
│ • Badge: bg-amber-50 text-amber-700 (Ikon AlertTriangle)                    │
│ • Arti: Jam KBM sudah masuk >15 menit tetapi guru belum membuka sesi.       │
├─────────────────────────────────────────────────────────────────────────────┤
│ 5. BELUM DITUTUP (UNRESOLVED ATTENDANCE / JOURNAL)                          │
│ • Border: border-rose-300 dark:border-rose-800                              │
│ • Badge: bg-rose-50 text-rose-700 (Ikon LockOpen / Belum Dikunci)           │
│ • Arti: Sesi pertemuan kemarin telah selesai tetapi presensi belum dikunci. │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 11. Analisis Risiko UX & Mitigasi

1. **Risiko Layar Sempit saat Membuka Materi dan Tugas Bersamaan:**  
   *Mitigasi:* Menggunakan aturan **Strict Single Active Panel**. Hanya 1 panel yang terbuka lebar di area kerja utama. Guru tidak dipaksa melihat 4 panel sekaligus.
2. **Risiko Font Terlalu Kecil di Mobile:**  
   *Mitigasi:* Standar ukuran teks interaktif mobile minimal `14px` (`text-sm`), tombol sentuh minimal `48px` tinggi x `48px` lebar.
3. **Risiko Ketergantungan Koneksi Internet saat Mengabsen di Lab/Kelas:**  
   *Mitigasi:* Sistem UI menyimpan draft presensi di memori lokal (*client optimistic state*) sehingga saat koneksi lambat, tombol `[✓ Tandai Semua Hadir]` langsung merespons seketika tanpa jeda loading.

---

## 12. Rekomendasi Final

> [!IMPORTANT]
> **REKOMENDASI FINAL: ARSITEKTUR VISUAL VALID & SIAP DIIMPLEMENTASIKAN.**  
> Desain visual ini memenuhi kriteria **3-Second Scan Rule**: dalam 3 detik pertama guru langsung tahu ruang kelasnya, sisa waktunya, dan tindakan selanjutnya. Seluruh dekorasi buatan (*AI Slop*) dieliminasi demi mengedepankan fungsionalitas murni Academic Glass UI v1.2.
