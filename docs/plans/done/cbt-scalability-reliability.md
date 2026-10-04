# Implementation Plan: CBT Scalability & Exam Reliability Foundation (Stage 17)

| Field | Detail |
| --- | --- |
| **Plan Slug** | `cbt-scalability-reliability` |
| **Stage** | Stage 17 — Production Readiness |
| **Lifecycle Gate** | `PLAN` |
| **Status** | `active` |

---

## 1. Sequence of Work

### Phase 1: Concurrency Utilities & Database Retry Layer (Fitur 01 & 05)
- [ ] Buat utilitas `src/shared/infrastructure/database/sqlite-retry.ts` (`withSqliteRetry`) yang menangani retry otomatis dengan exponential backoff dan random jitter saat menghadapi SQLite busy lock.
- [ ] Audit dan modifikasi `src/modules/cbt/infrastructure/cbt-repository.ts` untuk membungkus operasi write kritis (`saveAnswer`, `submitAttempt`, `startOrResumeAttempt`) dengan `withSqliteRetry`.

### Phase 2: In-Memory Write Buffer & Concurrency Queue (Fitur 02 & 03)
- [ ] Buat `src/modules/cbt/infrastructure/cbt-write-queue.ts` untuk mengantrekan dan membatasi konkurensi penulisan ke SQLite (Serialized Queue / Mutex Per Sesi).
- [ ] Implementasikan In-Flight Promise Locking pada `submitAttempt` untuk menjamin idempoten murni saat multiple concurrent submits terjadi pada attempt yang sama.

### Phase 3: Client-Side Resilience & Offline Recovery (Fitur 04)
- [ ] Perkaya `src/modules/cbt/presentation/cbt-player-view.tsx`:
  - Simpan segera ke `localStorage` (Local Cache Buffer) dengan timestamp.
  - Tambahkan indikator status koneksi & sinkronisasi (`Tersimpan di Cloud`, `Menyimpan...`, `Offline - Disimpan di Perangkat`).
  - Mekanisme auto-recovery saat komponen dimuat atau koneksi pulih (event `online`).
  - Cegah submit ganda pada tombol UI (`isSubmitting` disable).

### Phase 4: Teacher Monitoring Indicator (Fitur 06)
- [ ] Tambahkan metrik agregasi sesi pada `cbt-service.ts` / `cbt-repository.ts`.
- [ ] Perkaya tampilan `src/modules/cbt/presentation/class-cbt-tab-view.tsx` atau modal pemantauan pengawas dengan kartu metrik Academic Glass UI:
  - Peserta Aktif
  - Autosave Berhasil
  - Peserta Selesai / Terkunci

### Phase 5: Load Test Simulation & Architecture Validation (Fitur 07)
- [ ] Buat skrip simulasi beban `scripts/simulate-cbt-load.ts` yang mensimulasikan 100, 300, dan 500 peserta mengirimkan autosave dan submit secara konkuren.
- [ ] Jalankan simulasi, catat throughput, error rate (harus 0%), p95 latency, dan validasi data integrity.

### Phase 6: Automated Integration Tests & Quality Gates
- [ ] Buat test suite komprehensif di `src/test/cbt/cbt-scalability-reliability.test.ts`:
  - Test duplicate submit
  - Test concurrent save
  - Test autosave recovery
  - Test reconnect recovery
  - Test idempotent finish
- [ ] Jalankan Quality Gate: `typecheck`, `lint`, `test`, `build`.

### Phase 7: Reporting & Documentation
- [ ] Susun `docs/features/CBT-SCALABILITY-AND-RELIABILITY-REPORT.md`.
- [ ] Pindahkan spec & plan ke folder `done/`.
- [ ] STOP untuk Human Review.
