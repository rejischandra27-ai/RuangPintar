# Feature Specification: Digital Report Card Engine (Kurikulum Merdeka Foundation) — Stage 18

| Field | Detail |
| --- | --- |
| **Feature Slug** | `digital-report-card-engine` |
| **Stage** | Stage 18 — Digital Report Card Engine & Kurikulum Merdeka Foundation |
| **Lifecycle Gate** | `SPEC` |
| **Domain** | M13 Assessment / M15 Student Experience / M18 Report Card & Academic Governance |
| **Status** | `active` |

---

## 1. Problem Statement & Executive Summary
Meskipun Ruang Pintar telah memiliki modul penilaian formatif/sumatif (`DefinisiAsesmen`, `NilaiSiswa`), buku nilai guru (`BukuNilai`), CBT scoring, dan monitoring siswa, platform belum memiliki **mesin penerbitan Rapor Digital resmi yang terstandar Kurikulum Merdeka**.

Akibatnya:
- Belum ada alur validasi resmi oleh Wali Kelas sebelum rapor dibagikan kepada siswa dan orang tua.
- Tidak ada rekapitulasi capaian kompetensi (deskripsi capaian tertinggi dan hal yang perlu ditingkatkan) yang teragregasi secara otomatis dari TP (Tujuan Pembelajaran).
- Ketiadaan dokumen cetak/PDF standar Kurikulum Merdeka yang memuat identitas lengkap siswa, nilai akhir mata pelajaran, presensi semesteran, kegiatan ekstrakurikuler, dan catatan tindak lanjut wali kelas.

Stage 18 membangun **Digital Report Card Engine (Kurikulum Merdeka Foundation)**:
1. **Rapor Domain Audit**: Menjamin kepatuhan seluruh domain akademik terhadap non-negotiable invariants.
2. **Rapor Aggregation Engine**: Menghitung rata-rata nilai formatif & sumatif, predikat, bobot, dan deskripsi capaian kompetensi secara otomatis.
3. **Rekapitulasi Presensi**: Mengagregasi Sakit (S), Izin (I), dan Alpa (A) secara real-time dari modul presensi kelas.
4. **Ekstrakurikuler**: Mendukung input nama kegiatan, predikat (*Sangat Baik*, *Baik*, *Cukup*), dan catatan capaian.
5. **Catatan & Rekomendasi Wali Kelas**: Mendukung catatan perkembangan siswa serta saran tindak lanjut terarah.
6. **Report Card Validation Engine**: Menolak penerbitan rapor jika ada nilai mata pelajaran yang hilang, mapel duplikat, atau semester tidak valid.
7. **Workflow Penerbitan Bertahap**: Transisi aman `DRAFT` → `VALIDATED` → `PUBLISHED`.
8. **Pratinjau e-Rapor & PDF Foundation**: Tampilan Academic Glass UI yang elegan dan tata letak cetak dokumen A4 resmi Kurikulum Merdeka.
9. **Dashboard Wali Kelas**: Menampilkan indikator real-time (Total Siswa, Rapor Draft, Rapor Valid, Rapor Publish) untuk memandu pengawasan kelas.

---

## 2. Invariants & Domain Rules
Patuhi aturan domain invariants baku sistem:
1. **Student ≠ Enrollment ≠ Rombel Placement**: Siswa terdaftar pada tahun ajaran melalui `KeikutsertaanTahunAjaran` dan ditempatkan di kelas melalui `PenempatanRombel`. Rapor terikat pada penempatan rombel siswa pada semester aktif.
2. **Teacher ≠ Subject ≠ Teaching Assignment**: Guru mengajar mata pelajaran tertentu di kelas tertentu melalui `PenugasanMengajar`. Nilai yang masuk ke rapor wajib berasal dari penugasan mengajar aktif.
3. **Assessment ≠ Grade ≠ Grade Publication**: Definisi asesmen terpisah dari nilai angka siswa, dan nilai angka terpisah dari status publikasi rapor.
4. **Missing Grade ≠ Zero Grade**: Butir asesmen yang belum dinilai tidak boleh diasumsikan bernilai 0. Service validasi rapor wajib menandai mata pelajaran yang belum lengkap sebagai peringatan bagi wali kelas.
5. **Kurikulum Merdeka Scoring Standard**:
   - Rerata Formatif (bobot default 40%) dan Rerata Sumatif (bobot default 60%) menghasilkan Nilai Akhir (0–100).
   - Skala Predikat: A (≥ 90), B (80–89), C (70–79), D (< 70).
   - Ketuntasan mengacu pada KKTP (Kriteria Ketercapaian Tujuan Pembelajaran) masing-masing mata pelajaran.
   - Narasi Capaian: Memuat capaian tertinggi ("Menunjukkan penguasaan optimal dalam...") dan capaian yang perlu ditingkatkan ("Perlu bimbingan dan peningkatan dalam...").

---

## 3. Scope of Features & Architecture

### 3.1. Fitur 01: Rapor Domain Audit
- Audit menyeluruh keterkaitan tabel `DefinisiAsesmen`, `NilaiSiswa`, `PenugasanMengajar`, `Rombel`, `Semester`, `TahunAjaran`, dan `PresensiKelas`.
- Memastikan isolasi multi-tenant (`sekolah_id`) terjaga di setiap relasi.

### 3.2. Fitur 02: Rapor Aggregation Engine (`ReportCardAggregationService`)
- Menghitung agregasi akademik per siswa:
  - Nilai rata-rata formatif, sumatif, dan nilai akhir per mata pelajaran.
  - Predikat dan status ketuntasan KKTP.
  - Deskripsi capaian kompetensi otomatis dari TP / Lingkup Materi.
  - Rata-rata nilai keseluruhan siswa dalam kelas.

### 3.3. Fitur 03: Absensi Rapor
- Agregasi presensi semesteran siswa:
  - Sakit (`SAKIT`)
  - Izin (`IZIN`)
  - Tanpa Keterangan (`ALPHA`)
  - Hadir (`HADIR`) dan Persentase Kehadiran

### 3.4. Fitur 04: Ekstrakurikuler Extensible Foundation
- Struktur data fleksibel untuk kegiatan ekstrakurikuler:
  - `nama_kegiatan`: misal "Pramuka", "PMR", "Futsal", "Rohis", "Coding Club".
  - `predikat`: "SANGAT_BAIK", "BAIK", "CUKUP".
  - `deskripsi`: Catatan keaktifan dan pencapaian siswa.

### 3.5. Fitur 05: Catatan Wali Kelas
- Catatan perkembangan karakter, etika, dan sosial siswa.
- Saran tindak lanjut akademis dan personal untuk orang tua / wali.

### 3.6. Fitur 06: Report Card Validation Service (`ReportCardValidationService`)
- Validasi prasyarat publikasi:
  - Memeriksa kelengkapan nilai seluruh mata pelajaran aktif di rombel.
  - Mendeteksi mata pelajaran duplikat.
  - Menolak status `PUBLISHED` jika masih terdapat nilai hilang tanpa dispensasi.

### 3.7. Fitur 07 & 08: Rapor Preview UI & PDF Foundation
- Antarmuka e-Rapor responsif berstandar Academic Glass UI.
- Layout dokumen resmi cetak A4 Kurikulum Merdeka:
  - Kop sekolah resmi (Logo, Nama Sekolah, NPSN, Alamat).
  - Biodata siswa & kelas.
  - Tabel Nilai Akhir & Capaian Pembelajaran.
  - Tabel Ekstrakurikuler & Presensi.
  - Kolom Tanda Tangan: Orang Tua/Wali, Wali Kelas, dan Kepala Sekolah (dilengkapi NIP).
  - Print-friendly CSS (`@media print`) yang optimal tanpa dependensi biner eksternal berat.

### 3.8. Fitur 09: Workflow Validasi & State Transition
- Siklus hidup status rapor:
  - `DRAFT`: Nilai sedang dihimpun dari para guru mata pelajaran.
  - `VALIDATED`: Wali kelas telah memeriksa dan memverifikasi kelengkapan rapor.
  - `PUBLISHED`: Rapor resmi dikunci dan dapat diakses siswa & orang tua.

### 3.9. Fitur 10: Wali Kelas Dashboard Enhancement
- Integrasi tab **e-Rapor** pada portal `/wali-kelas`:
  - Kartu Metrik: Total Siswa, Rapor Draft, Rapor Valid, Rapor Published.
  - Roster tabel siswa dengan indikator kelengkapan nilai, tombol preview, dan aksi validasi.

---

## 4. Acceptance Criteria
- [ ] Rapor berhasil di-generate untuk siswa dengan nilai formatif, sumatif, predikat, dan narasi capaian.
- [ ] Ringkasan presensi (S/I/A) terakumulasi akurat dari data absensi harian/sesi.
- [ ] Ekstrakurikuler dan catatan wali kelas tersimpan dan dirender pada rapor.
- [ ] Validation service menolak publikasi rapor yang memiliki mata pelajaran tanpa nilai.
- [ ] Transisi status `DRAFT` → `VALIDATED` → `PUBLISHED` tervalidasi server-side.
- [ ] Dashboard wali kelas menyajikan metrik rapor dan tabel siswa secara real-time.
- [ ] Tampilan preview e-Rapor dan mode cetak PDF A4 rapi, bersih, dan sesuai standar Kurikulum Merdeka.
- [ ] Seluruh Quality Gate lulus: `typecheck`, `lint`, `test`, `build`.
