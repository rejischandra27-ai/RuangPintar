# SPEC: CBT Universal Exam Engine & School Assessment System
## Tahap Transformasi: Dari Prototipe CRUD ke Platform Ujian Sekolah Terpadu

| Metadata | Nilai |
| --- | --- |
| **Fitur** | CBT Universal Exam Engine (M14) |
| **Status** | `active` (In Progress) |
| **Versi** | 1.0 |
| **Aktor** | Guru Pengampu, Pengawas/Proktor Ujian, Siswa Peserta, Bagian Kurikulum |
| **Tujuan** | Menyatukan Kuis Harian Formatif & Ujian Sumatif Resmi Sekolah dengan editor multi-format kaya, live proctoring, dan integritas tinggi |

---

## 1. Latar Belakang & Masalah
Di sebagian besar aplikasi CBT sekolah (seperti e-ujian.id atau portal sekolah konvensional), alur kerja terpecah menjadi silo yang sangat kaku:
1. Guru harus membuat Bank Soal secara terpisah, mengisi butir pertanyaan secara manual yang melelahkan.
2. Guru harus membuat "Ruang Ujian" di halaman berbeda, mengatur jadwal dan token sebelum bisa dibagikan.
3. Alur yang panjang ini membuat guru enggan menggunakan CBT untuk pembelajaran sehari-hari (kuis kilat, latihan BAB, exit-ticket), sehingga CBT hanya dibuka saat ATS (PTS) atau AAS (PAS).
4. Ketiadaan dukungan terpadu untuk konten khusus: stimulus gambar berkualitas tinggi, tulisan Arab (RTL), rumus matematika/sains (KaTeX), dan audio listening berbatas putar.
5. Ketiadaan kontrol proktor waktu nyata (Live Proctoring Cockpit) untuk memantau status siswa, reset sesi perangkat mati, dan mengunci kecurangan.

---

## 2. Persyaratan Fungsional (Functional Requirements)

### 2.1. Dual-Engine Assessment Model
- **Engine A: Mode Kuis & Latihan Formatif (Low-Stakes):**
  - Pembuatan kilat langsung dari Konteks Kelas & Modul Ajar (BAB/TP).
  - Akses terbuka tanpa token rumit.
  - Pembahasan langsung muncul setelah siswa mengumpulkan.
  - Remedial instan.
- **Engine B: Mode Sumatif & Ujian Resmi Ketat (High-Stakes Strict):**
  - Fullscreen lock dan deteksi perpindahan tab (Anti-Cheat 3x Strike).
  - Token dinamis 6-karakter acak dengan auto-refresh setiap 15 menit.
  - Acak urutan soal dan acak opsi pilihan jawaban (A–E).
  - Skor mentah dirahasiakan di server boundary sampai dipublikasikan guru.

### 2.2. Rich Media & Special Content Engine
- **Stimulus Gambar:**
  - Dukungan gambar stimulus soal dan gambar opsi pilihan.
  - Lightbox modal saat gambar disentuh/diklik agar terbaca jelas di perangkat seluler.
  - Dukungan paste langsung dari clipboard (Ctrl+V) dan drag-and-drop file gambar.
- **Tulisan Arab & R-to-L (Right-to-Left):**
  - Mode RTL otomatis dengan tipografi font Amiri / Scheherazade berharakat rapi.
  - Kompatibel dengan teks dwibahasa (Arab-Indonesia).
- **Rumus Matematika & Sains (KaTeX / LaTeX):**
  - Rendering instan rumus matematika, fisika, dan kimia berbasis vektor tajam.
  - Toolbar visual simbol matematika untuk guru tanpa perlu mengetik kode LaTeX manual.
- **Audio Listening (Bahasa):**
  - Audio player terenkripsi dengan counter batas putar (misal: maks 2x putar).
  - Anti-scrubbing (pencegahan mempercepat rekaman audio).

### 2.3. Model Waktu & Pengumpulan Ujian (Server-Authoritative)
- **Model Waktu Sinkron (Strict Window):** Sesi dimulai dan diakhiri serentak sesuai rentang waktu resmi (misal: 08.00–09.30). Jika siswa terlambat masuk, sisa waktu berkurang secara proporsional.
- **Model Waktu Fleksibel (Dynamic Timer):** Timer berjalan mandiri saat siswa mengklik "Mulai Ujian".
- **Hard Timeout Auto-Submit:** Server memaksa pengumpulan saat batas waktu habis tanpa bergantung pada jam lokal perangkat siswa.
- **Konfirmasi Pengumpulan Akhir:** Modal verifikasi menampilkan jumlah soal yang sudah/belum dijawab sebelum sesi dikunci permanen.

### 2.4. Live Proctor Cockpit
- Layar pengawas real-time:
  - Indikator status setiap peserta (Belum Masuk, Mengerjakan No. X, Terkunci Pelanggaran, Selesai).
  - Kontrol proktor: Buka Kunci Siswa, Reset Sesi Login (jika HP mati/ganti perangkat), Paksa Kumpul Seluruh Kelas.

---

## 3. Kriteria Penerimaan (Acceptance Criteria)
1. Guru dapat membuat butir soal dengan gambar, formula matematika KaTeX, teks Arab RTL, dan audio listening tanpa error kompilasi.
2. Siswa yang membuka soal CBT melihat rumus matematika ter-render dengan KaTeX dan teks Arab tersusun rapi dari kanan ke kiri.
3. Saat mode ujian ketat aktif, perpindahan tab atau keluar layar penuh memicu pencatatan strike pelanggaran di database (`EventIntegritasUjian`).
4. Saat waktu ujian habis di server, sesi siswa otomatis beralih ke status `DIKUMPULKAN` atau `WAKTU_HABIS`.
5. Siswa yang telah menyelesaikan ujian tidak dapat masuk kembali ke dalam sesi pengerjaan.
