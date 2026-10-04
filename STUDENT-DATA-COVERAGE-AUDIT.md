# STUDENT-DATA-COVERAGE-AUDIT.md
## Audit Kelengkapan Data Siswa Tenant SMK OTOMINDO
### Investigasi Ketersediaan Data Riil Siswa Kelas X, XI, dan XII

| Atribut Audit | Nilai Faktual |
| :--- | :--- |
| **Tenant Target** | SMK OTOMINDO (`01M2XXYD227F9S3H985FH53GMF`) |
| **Tahun Ajaran** | 2026/2027 (`01M2XXYD2CYPCWZ0RM9TAN6BW0`) |
| **Semester Aktif** | Semester Ganjil (`01M2XXYD2F5JRXRTR4ECMRNG4J`) |
| **Status Database Saat Ini** | **341 Siswa** (311 Siswa Kelas X + 30 Siswa Sheet2) |
| **Kondisi Sumber Data** | **TERSEDIA LENGKAP** (Roster Kelas XI & XII ditemukan pada Master File Excel) |
| **Total Siswa Riil Master** | **670 Siswa Reguler** (+ 30 Siswa Sheet2 = **700 Siswa Faktual**) |
| **Gap Belum Diimpor** | **359 Siswa** (205 Kelas XI + 153 Kelas XII + 1 Kelas X) |
| **Tanggal Audit** | 25 September 2026 |
| **Status Laporan** | `READY FOR HUMAN REVIEW` |

---

## 1. Ringkasan Eksekutif & Temuan Forensik

Berdasarkan investigasi forensik terhadap berkas-berkas sumber dan database lokal:

1. **Database Saat Ini (341 Siswa):**
   - 311 siswa terdaftar di 10 rombongan belajar Kelas X (Fase E).
   - 30 siswa terdaftar di rombel `XI TJKT` (berasal dari `Sheet2`, asesmen khusus Praktik Sistem Operasi).
   - 10 dari 21 rombel sekolah (seluruh rombel XI lainnya dan seluruh rombel XII) saat ini berstatus **0 siswa (kosong)** di database.

2. **Temuan Berkas Master Excel Baru:**
   - Ditemukan berkas master resmi:
     `C:\Users\vitam\Downloads\FORM NILAI ATS GANJIL.xlsx` (Ukuran: **153.365 bytes**, tanggal pembaruan: **25 September 2026**).
   - Berkas ini berukuran dua kali lipat lebih lengkap dibandingkan berkas kerja awal di Documents (`76.775 bytes`).
   - Berkas memuat sheet lengkap seluruh tingkatan:
     - **Sheet `X`:** Roster resmi 10 Rombel Kelas X (**312 Siswa**).
     - **Sheet `XI`:** Roster resmi 6 Rombel Kelas XI (**205 Siswa**).
     - **Sheet `XII`:** Roster resmi 5 Rombel Kelas XII (**153 Siswa**).
     - **Sheet `Sheet2`:** Roster khusus Praktik Sistem Operasi (**30 Siswa** unik).

3. **Status Roster Siswa Kelas XI dan XII:**
   - **STATUS: TERSEDIA 100% RIIL PADA DOKUMEN SUMBER.**
   - Tidak diperlukan pembuatan data dummy, data sintetis, maupun mock student.
   - Seluruh siswa memiliki nomor urut absen faktual, nama lengkap riil, status siswa reguler/pindahan baru (PB), dan data capaian nilai ATS.

---

## 2. Cakupan Data Siswa per Tingkat & Rombel

### 2.1. Tingkat X / Fase E (10 Rombel — 312 Siswa Master vs 311 Siswa di DB)

| No | Nama Rombel | Program Keahlian | Wali Kelas Faktual | Jml Siswa Master | Jml Siswa di DB | Status & Gap |
| :-: | :--- | :--- | :--- | :-: | :-: | :--- |
| 1 | **X TO 1** | Teknik Otomotif (TO) | Febriana Buana Supa, S.Pd | 38 | 38 | Sinkron (100%) |
| 2 | **X TO 2** | Teknik Otomotif (TO) | Novita Ardiyanti, S.Pd | 41 | 41 | Sinkron (100%) |
| 3 | **X TO 3** | Teknik Otomotif (TO) | Marhanih, S.Sos.I | 37 | 37 | Sinkron (100%) |
| 4 | **X TO 4** | Teknik Otomotif (TO) | Nengsih, S.Pd | 36 | 36 | Sinkron (100%) |
| 5 | **X TO 5** | Teknik Otomotif (TO) | Nevada Hasibuan, S.Pd | 38 | 38 | Sinkron (100%) |
| 6 | **X TJKT 1** | Teknik Jaringan Komputer & Telko | Elanda Widyastuti, M.Pd | 29 | 28 | **Gap 1 siswa** (No. 29 belum terimpor) |
| 7 | **X TJKT 2** | Teknik Jaringan Komputer & Telko | Agung Septian, S.Kom, M.Pd | 27 | 27 | Sinkron (100%) |
| 8 | **X DKV 1** | Desain Komunikasi Visual (DKV) | Andina Try Nurcahyani, S.Pd | 23 | 23 | Sinkron (100%) |
| 9 | **X DKV 2** | Desain Komunikasi Visual (DKV) | Rita Yusnita, SE, M.Pd | 22 | 22 | Sinkron (100%) |
| 10 | **X RPL** | Rekayasa Perangkat Lunak (RPL) | Parlindungan S, S.Kom | 21 | 21 | Sinkron (100%) |
| | **SUBTOTAL KELAS X** | | | **312** | **311** | **Gap: 1 Siswa** |

---

### 2.2. Tingkat XI / Fase F (6 Rombel — 205 Siswa Master vs 30 Siswa Sheet2 di DB)

| No | Nama Rombel di Excel | Nama Rombel di DB & Jadwal | Wali Kelas Faktual (Sheet XI) | Jml Siswa Master | Jml Siswa di DB | Status & Gap |
| :-: | :--- | :--- | :--- | :-: | :-: | :--- |
| 1 | **XI TO 1** | `XI TO 1` | Shafara Salsabila, S.Pd | 36 | 0 | **Gap 36 siswa riil** |
| 2 | **XI TO 2** | `XI TO 2` | Shabrina A Mubiina AL-H, S.Pd | 37 | 0 | **Gap 37 siswa riil** |
| 3 | **XI TO 3** | `XI TO 3` | Nurhayati, S.Pd | 36 | 0 | **Gap 36 siswa riil** |
| 4 | **XI TJKT 1** | `XI TJKT` | Aprilla Hayati, S.Pd | 37 | 30* | **Gap 37 siswa reguler** (*isi saat ini: Sheet2) |
| 5 | **XI DKV 1** | `XI DKV` | Wayan Budi Ismawati, M.Pd | 31 | 0 | **Gap 31 siswa riil** |
| 6 | **XI RPL** | `XI RPL` | Fransina Tresia A, SP, MM | 28 | 0 | **Gap 28 siswa riil** |
| | **SUBTOTAL KELAS XI** | | | **205** | **30** | **Gap: 205 Siswa Reguler** |

---

### 2.3. Tingkat XII / Fase F (5 Rombel — 153 Siswa Master vs 0 Siswa di DB)

| No | Nama Rombel di Excel | Nama Rombel di DB & Jadwal | Wali Kelas Faktual (Sheet XII) | Jml Siswa Master | Jml Siswa di DB | Status & Gap |
| :-: | :--- | :--- | :--- | :-: | :-: | :--- |
| 1 | **XII TO 1** | `XII TKRO 1` | Drs. Rekson Pangaribuan | 38 | 0 | **Gap 38 siswa riil** |
| 2 | **XII TO 2** | `XII TKRO 2` | Arnah Fajarwati, SE | 38 | 0 | **Gap 38 siswa riil** |
| 3 | **XII TJKT 1** | `XII TKJ 1` | Meta Pradi Wijayanti, S.Pd | 37 | 0 | **Gap 37 siswa riil** |
| 4 | **XII DKV** | `XII DKV 1` | Suryani, S.Ds | 25 | 0 | **Gap 25 siswa riil** |
| 5 | **XII RPL** | `XII RPL` | Sri Siswati, M.Pd | 15 | 0 | **Gap 15 siswa riil** |
| | **SUBTOTAL KELAS XII** | | | **153** | **0** | **Gap: 153 Siswa Riil** |

---

### 2.4. Kelompok Khusus Sheet2 (Asesmen Praktik Sistem Operasi)
- **Sumber:** Sheet `Sheet2` pada `FORM NILAI ATS GANJIL.xlsx`.
- **Jumlah Siswa:** 30 orang unik.
- **Hasil Uji Silang:** Tidak ditemukan satupun siswa Sheet2 yang tumpang tindih nama dengan 670 siswa di Sheet X, XI, ataupun XII (100% siswa unik).
- **Kondisi Database Saat Ini:** 30 siswa ini sebelumnya ditempatkan pada rombel `XI TJKT`. Dengan ditemukannya 37 siswa reguler `XI TJKT 1`, penempatan 30 siswa Sheet2 ini perlu diklarifikasi (apakah merupakan rombel/kelompok paralel `XI TJKT 2` atau kelompok remedi/praktik khusus).

---

## 3. Sumber Dokumen Setiap Data

```text
1. Berkas Utama Roster Lengkap (X, XI, XII):
   Lokasi : C:\Users\vitam\Downloads\FORM NILAI ATS GANJIL.xlsx
   Ukuran : 153.365 bytes
   Hash/Waktu : 25 September 2026, 08:37:24 WIB
   Cakupan: Sheet 'X' (312 siswa), Sheet 'XI' (205 siswa), Sheet 'XII' (153 siswa), Sheet2 (30 siswa)

2. Berkas Jadwal & Direktori Guru:
   Lokasi : C:\Users\vitam\Downloads\JADWAL PELAJARAN YES 2026.2027 (19 AGUSTUS 2026) (Recovered) (Recovered).pdf
   Ukuran : 301.309 bytes
   Cakupan: 21 Rombel, 38 Guru (Kode 1-38), 806 Slot Waktu KBM Mingguan

3. Berkas Kerja Spesifik Guru Sebelumnya:
   Lokasi : C:\Users\vitam\Documents\FORM NILAI ATS GANJIL.xlsx
   Ukuran : 76.775 bytes
   Cakupan: Terbatas pada Sheet 'KKA Kelas X' (311 siswa) dan 'Sheet2' (30 siswa)
```

---

## 4. Analisis Gap Menuju 100% Kondisi Sekolah Riil

| Dimensi Data | Kondisi di Database Saat Ini | Target Kondisi Riil Faktual | Gap / Kekurangan |
| :--- | :---: | :---: | :---: |
| **Siswa Terdaftar** | 341 Siswa | **670 Siswa Reguler** (+ 30 Sheet2) | **359 Siswa Belum Diimpor** |
| **Rombel Aktif Terisi** | 11 Rombel (10 X + 1 XI) | **21 Rombel** | **10 Rombel Masih Kosong** |
| **Penempatan Rombel** | 341 Penempatan | **670 Penempatan** | **359 Penempatan Belum Dibuat** |
| **Wali Kelas Resmi** | 10 Guru (Fase E saja) | **21 Guru** (Fase E + Fase F) | **11 Wali Kelas Belum Di-assign** |
| **Kelengkapan Profil** | NIS Lokal, Nama, Gender | NIS Lokal, Nama, Gender | NISN & NIK masih TBD dari Dapodik |

---

## 5. Rencana Impor Data Siswa Kelas XI dan XII

Untuk melengkapi 100% populasi siswa SMK OTOMINDO tanpa melanggar aturan baku sistem (`AGENTS.md`):

### 5.1. Pemetaan Rombel Excel ke Entitas Database

| Sheet Excel | Nama di Excel | Rombel Target di Database | Tingkat | Program Keahlian |
| :--- | :--- | :--- | :---: | :--- |
| **XI** | XI TO 1 | `XI TO 1` | 11 | Teknik Otomotif |
| **XI** | XI TO 2 | `XI TO 2` | 11 | Teknik Otomotif |
| **XI** | XI TO 3 | `XI TO 3` | 11 | Teknik Otomotif |
| **XI** | XI TJKT 1 | `XI TJKT` | 11 | Teknik Jaringan Komputer & Telko |
| **XI** | XI DKV 1 | `XI DKV` | 11 | Desain Komunikasi Visual |
| **XI** | XI RPL | `XI RPL` | 11 | Rekayasa Perangkat Lunak |
| **XII** | XII TO 1 | `XII TKRO 1` | 12 | Teknik Kendaraan Ringan Otomotif |
| **XII** | XII TO 2 | `XII TKRO 2` | 12 | Teknik Kendaraan Ringan Otomotif |
| **XII** | XII TJKT 1 | `XII TKJ 1` | 12 | Teknik Komputer dan Jaringan |
| **XII** | XII DKV | `XII DKV 1` | 12 | Desain Komunikasi Visual |
| **XII** | XII RPL | `XII RPL` | 12 | Rekayasa Perangkat Lunak |

### 5.2. Format Penomoran NIS Baru untuk Kelas XI dan XII
Untuk menjaga invariant keunikan NIS di lingkup sekolah:
- **Tingkat X:** Prefix `2601` s/d `2610` (Tahun masuk 2026/2027)
- **Tingkat XI:** Prefix `2501` s/d `2506` (Tahun masuk 2025/2026)
  - `XI TO 1`: `250101` s/d `250136`
  - `XI TO 2`: `250201` s/d `250237`
  - `XI TO 3`: `250301` s/d `250336`
  - `XI TJKT`: `250401` s/d `250437`
  - `XI DKV`: `250501` s/d `250531`
  - `XI RPL`: `250601` s/d `250628`
- **Tingkat XII:** Prefix `2401` s/d `2405` (Tahun masuk 2024/2025)
  - `XII TKRO 1`: `240101` s/d `240138`
  - `XII TKRO 2`: `240201` s/d `240238`
  - `XII TKJ 1`: `240301` s/d `240337`
  - `XII DKV 1`: `240401` s/d `240425`
  - `XII RPL`: `240501` s/d `240515`

### 5.3. Pembaruan Penugasan Wali Kelas Resmi
Menetapkan 11 wali kelas Fase F yang terbukti faktual di header Excel:
1. `XI TO 1`: Shafara Salsabila, S.Pd (Guru 5)
2. `XI TO 2`: Shabrina A Mubiina AL-H, S.Pd (Guru 31)
3. `XI TO 3`: Nurhayati, S.Pd (Guru 28)
4. `XI TJKT`: Aprilla Hayati, S.Pd (Guru 22)
5. `XI DKV`: Wayan Budi Ismawati, M.Pd (Guru 3)
6. `XI RPL`: Fransina Tresia A, SP, MM (Guru 25)
7. `XII TKRO 1`: Drs. Rekson Pangaribuan (Guru 2)
8. `XII TKRO 2`: Arnah Fajarwati, SE (Guru 23)
9. `XII TKJ 1`: Meta Pradi Wijayanti, S.Pd (Guru 15)
10. `XII DKV 1`: Suryani, S.Ds (Guru 4)
11. `XII RPL`: Sri Siswati, M.Pd (Guru 10)

### 5.4. Siklus Eksekusi Impor (Setelah Approval Manusia)
1. **Penyusunan Script:** `scripts/seeds/seeder-siswa-lengkap.mjs` yang membaca berkas master Downloads.
2. **Dry-Run & Validasi:** Uji integritas relasi foreign key, validasi ULID, dan pencegahan duplikasi.
3. **Eksekusi Seeding Idempoten:** Menggunakan `upsert` pada `Siswa`, `KeikutsertaanSiswa`, dan `PenempatanRombel`.
4. **Verifikasi Quality Gates:** Menjalankan `typecheck`, `lint`, dan seluruh 102 test suite Vitest.

---

## 6. Kepatuhan Instruksi & Status

Sesuai instruksi pengguna:
- [x] Tidak ada seeding yang dijalankan.
- [x] Tidak ada database yang dimodifikasi.
- [x] Tidak ada kode aplikasi yang diubah.
- [x] Tidak ada data sintetis atau mock student yang dibuat.
- [x] Laporan selesai disusun berdasarkan fakta riil.

**STOP — MENUNGGU PERSETUJUAN (HUMAN APPROVAL).**
