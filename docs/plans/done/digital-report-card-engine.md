# Implementation Plan: Digital Report Card Engine (Stage 18)

| Field | Detail |
| --- | --- |
| **Plan Slug** | `digital-report-card-engine` |
| **Stage** | Stage 18 — Digital Report Card Engine & Kurikulum Merdeka Foundation |
| **Lifecycle Gate** | `PLAN` |
| **Status** | `active` |

---

## 1. Sequence of Work

### Phase 1: Domain Audit & Persistence Model (Fitur 01 & Database Layer)
- [ ] Audit seluruh query penilaian, rombel, semester, dan presensi.
- [ ] Tambahkan model `RaporSiswa` ke `prisma/schema.prisma` yang menampung status (`DRAFT`, `VALIDATED`, `PUBLISHED`), `catatan_wali_kelas`, `saran_tindak_lanjut`, `ekstrakurikuler_json`, `tanggal_validasi`, dan `tanggal_publikasi`.
- [ ] Terapkan migrasi database lokal via Prisma migration (`add_rapor_siswa_foundation`).

### Phase 2: Core Report Card Engine & Aggregation Service (Fitur 02, 03, 04, 05)
- [ ] Buat `src/modules/reporting/domain/report-card-types.ts`: Definisi DTO agregasi rapor, input validasi, dan ekstrakurikuler.
- [ ] Buat `src/modules/reporting/infrastructure/report-card-repository.ts`: Query data akademik siswa, rombel, guru, presensi (S/I/A), nilai, dan persistensi record `RaporSiswa`.
- [ ] Buat `src/modules/reporting/application/report-card-aggregation-service.ts`:
  - Kalkulasi nilai formatif & sumatif (bobot 40:60).
  - Skala predikat A/B/C/D & ketuntasan KKTP.
  - Formulasi narasi capaian kompetensi otomatis dari TP / Lingkup Materi.
  - Integrasi catatan wali kelas & ekstrakurikuler.

### Phase 3: Validation Engine & State Workflow (Fitur 06 & 09)
- [ ] Buat `src/modules/reporting/application/report-card-validation-service.ts`:
  - Memeriksa mata pelajaran yang belum memiliki nilai (`missing grades`).
  - Mendeteksi duplikasi mata pelajaran.
  - Validasi kelayakan transisi status (`DRAFT` → `VALIDATED` → `PUBLISHED`).
- [ ] Buat Server Actions Next.js di `src/app/actions/report-card-actions.ts`:
  - `getStudentReportCardAction`
  - `getRombelReportCardsOverviewAction`
  - `saveReportCardNotesAction`
  - `validateReportCardAction`
  - `publishReportCardAction`

### Phase 4: UI & PDF Preview Foundation (Fitur 07 & 08)
- [ ] Buat `src/modules/reporting/presentation/report-card-document-view.tsx`:
  - Format dokumen cetak A4 resmi Kurikulum Merdeka (Kop sekolah, biodata siswa, tabel nilai capaian, absensi, ekstrakurikuler, kolom tanda tangan kepala sekolah/wali/orang tua).
  - Print stylesheet teroptimasi (`@media print`).
- [ ] Buat halaman pratinjau cetak `/rapor-siswa/cetak/[siswaId]` atau modal cetak e-Rapor.

### Phase 5: Wali Kelas Cockpit Enhancement (Fitur 10)
- [ ] Perkaya portal `/wali-kelas`:
  - Tambahkan tab **e-Rapor Rombel** di `HomeroomDashboardView`.
  - Tampilkan KPI: Total Siswa, Rapor Draft, Rapor Valid, Rapor Published (Academic Glass UI).
  - Tambahkan tabel roster rapor dengan tombol aksi validasi massal/individual dan tombol preview cetak.

### Phase 6: Automated Integration Tests & Quality Gates
- [ ] Buat test suite di `src/test/reporting/report-card-engine.test.ts`:
  - Test report generation
  - Test report validation (missing grade detection & duplicate subject detection)
  - Test workflow state transitions (Draft → Validated → Published)
  - Test attendance summary aggregation
- [ ] Jalankan Quality Gate: `typecheck`, `lint`, `test`, `build`.

### Phase 7: Reporting & Documentation
- [ ] Buat `docs/features/DIGITAL-REPORT-CARD-ENGINE-REPORT.md`.
- [ ] Pindahkan spec & plan ke folder `done/`.
- [ ] STOP untuk Human Review.
