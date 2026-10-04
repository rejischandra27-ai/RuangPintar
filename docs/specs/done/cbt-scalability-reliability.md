# Feature Specification: CBT Scalability & Exam Reliability Foundation (Stage 17)

| Field | Detail |
| --- | --- |
| **Feature Slug** | `cbt-scalability-reliability` |
| **Stage** | Stage 17 — SaaS Multi-Tenant Foundation & Production Readiness |
| **Lifecycle Gate** | `SPEC` |
| **Domain** | M14 Computer-Based Test (CBT) / Database Concurrency / Reliability Engineering |
| **Status** | `active` |

---

## 1. Problem Statement & Background
Production Readiness Assessment Ruang Pintar mengidentifikasi potensi blocker kritis:
> **PB-01: SQLite Single Writer Boundary pada Beban Ujian CBT Massal.**

Pada pelaksanaan ujian serentak di sekolah (500–1000 siswa aktif bersamaan):
- **Autosave Serentak**: Siswa mengklik jawaban pada interval yang berdekatan, menghasilkan lonjakan request write ke SQLite.
- **Submit Serentak**: Ketika bel berbunyi atau timer hitung mundur server menyentuh 00:00, ratusan siswa melakukan submission bersamaan, memicu transaksi komputasi penilaian dan insert/update beruntun.
- **Risiko Database**: Tanpa buffering dan penanganan konkurensi terkontrol, operasi write yang saling berebut memicu `SQLITE_BUSY: database is locked` atau kegagalan simpan jawaban.

Stage 17 berfokus memperkuat keandalan dan skalabilitas engine CBT **tanpa memigrasikan database ke PostgreSQL** dan **tanpa mengubah skema besar**, mempertahankan prinsip efisiensi, zero data loss, dan kepatuhan multi-tenant.

---

## 2. Invariants & Reliability Guarantees
1. **Zero Answer Loss Invariant**: Jawaban siswa tidak boleh hilang akibat gangguan jaringan, browser crash, refresh tiba-tiba, maupun kegagalan koneksi sementara.
2. **One Active Attempt & Idempotent Submission**: Submit berulang (double click, network retry, page refresh) tidak boleh menghasilkan duplikasi attempt, skor ganda, atau status corrupt.
3. **Controlled Concurrency for SQLite Single Writer**: Seluruh operasi write CBT wajib dilindungi oleh mekanisme antrean (write-behind / concurrency queue) dan exponential backoff retry untuk mencegah SQLite contention.
4. **Client-Side Write-Ahead Cache**: Browser menyimpan jawaban seketika di `localStorage` dengan penanda timestamp sebelum dan selama proses transmisi ke server.
5. **Server-Authoritative Timer & Integrity Enforcement**: Timer dan kunci jawaban tetap 100% authoritative di server; klien tidak dapat memanipulasi sisa waktu atau membaca kunci penilaian.

---

## 3. Scope of Features

### 3.1. Fitur 01: CBT Write Path Audit
- Audit menyeluruh alur `startOrResumeAttempt`, `autosaveAnswer`, `recordIntegrityEvent`, dan `submitAttempt`.
- Identifikasi titik rawan lock contention dan optimasi query (menghilangkan transaksi ganda yang tidak esensial).

### 3.2. Fitur 02: Attempt Buffer Strategy (Write Queue & Controlled Concurrency)
- Implementasi `CbtWriteQueue` / `CbtBufferManager` di layer aplikasi untuk menstabilkan write burst ke SQLite.
- Batching dan serialisasi penulisan jawaban berlatar belakang (write-behind buffer) dengan penjaminan konsistensi data.

### 3.3. Fitur 03: Idempotent Submission & In-Flight Lock
- Mekanisme deduplikasi submission di server: jika ada submission yang sedang berjalan untuk attempt yang sama, request konkuren berikutnya membagi *in-flight promise* yang sama.
- Pengembalian instan hasil ujian jika status attempt telah `DIKUMPULKAN`.

### 3.4. Fitur 04: Exam Recovery & Offline Resilience
- Sinkronisasi dwiarah antara `localStorage` browser dan server saat load player.
- Deteksi status jaringan (`online`/`offline`) dan auto-sync pending answers ketika koneksi pulih.
- Umpan balik visual real-time di UI CBT Player (`Tersimpan di Cloud`, `Menyimpan...`, `Offline (Tersimpan di Perangkat)`).

### 3.5. Fitur 05: Concurrency Protection & SQLite Retry Backoff
- Utilitas `withSqliteRetry` dengan randomized exponential backoff dan jitter untuk mengatasi error busy lock (`P2034`, `SQLITE_BUSY`).
- Perlindungan race condition saat auto-submit timer server bertemu dengan manual submit siswa.

### 3.6. Fitur 06: Teacher Monitoring Cockpit (Academic Glass UI)
- Komponen monitoring real-time untuk guru/pengawas:
  - Jumlah Peserta Aktif
  - Jumlah Autosave Berhasil
  - Jumlah Peserta Selesai / Terkunci
- Visual indicator kecepatan autosave & keandalan sesi.

### 3.7. Fitur 07: Load Test Simulation & Architecture Validation
- Simulasi konkurensi terukur (100, 300, 500 peserta) untuk memvalidasi zero error rate dan integritas data pada beban puncak.

---

## 4. Acceptance Criteria
- [ ] 0 jawaban hilang saat disimulasikan 500 peserta autosave bersamaan.
- [ ] Submit 2x atau 3x berturut-turut mengembalikan hasil yang sama tanpa error atau duplikasi row hasil.
- [ ] Siswa me-refresh browser atau memutus koneksi sementara dapat melanjutkan ujian tanpa kehilangan jawaban yang telah diisi.
- [ ] Monitoring guru menampilkan metrik sesi aktif, autosave sukses, dan selesai secara real-time.
- [ ] Seluruh Quality Gate lulus: `typecheck`, `lint`, `test`, `build`.
