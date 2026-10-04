# STUDENT-DATA-RECONCILIATION-REPORT.md
## Laporan Rekonsiliasi Data Siswa & Wali Kelas SMK OTOMINDO
### Audit Verifikasi Faktual Dokumen Master Excel vs Database Produksi

| Parameter Rekonsiliasi | Hasil Audit Faktual |
| :--- | :--- |
| **Tenant Sekolah** | SMK OTOMINDO (`01M2XXYD227F9S3H985FH53GMF`) |
| **Tahun Ajaran / Semester** | 2026/2027 (`01M2XXYD2CYPCWZ0RM9TAN6BW0`) / Ganjil |
| **Dokumen Sumber Master** | `C:\Users\vitam\Downloads\FORM NILAI ATS GANJIL.xlsx` (153.365 bytes) |
| **Dokumen Sumber Jadwal** | `JADWAL PELAJARAN YES 2026.2027.pdf` (Recovered) |
| **Status Database Saat Ini** | **341 Siswa** (311 Siswa Kelas X + 30 Siswa Sheet2) |
| **Total Siswa Master Excel** | **670 Siswa Reguler** (312 X + 205 XI + 153 XII) + **30 Siswa Sheet2** = **700 Siswa** |
| **Gap Siswa Belum Masuk DB** | **359 Siswa Belum Diimpor** |
| **Status NIS / NISN Sumber** | **TIDAK TERSEDIA** (Sumber hanya memuat No Absen & Nama Lengkap) |
| **Status Wali Kelas XI & XII** | **11 dari 11 Guru VALID 100%** (Guru ID & User Account aktif) |
| **Tanggal Rekonsiliasi** | 25 September 2026 |
| **Status Laporan** | `READY FOR HUMAN REVIEW` |

---

## 1. Verifikasi Ulang Perhitungan Jumlah Siswa

Berdasarkan pembacaan komputasional sel per sel (*cell-by-cell inspection*) pada master berkas `FORM NILAI ATS GANJIL.xlsx`:

```text
========================================================================================
REKAPITULASI POPULASI SISWA BERDASARKAN DOKUMEN MASTER EXCEL RESMI
========================================================================================
Tingkat / Fase        Jumlah Rombel       Jumlah Siswa Riil       Keterangan Roster
----------------------------------------------------------------------------------------
Tingkat X (Fase E)      10 Rombel             312 Siswa           Sheet 'X' Baris 14 s/d 543
Tingkat XI (Fase F)      6 Rombel             205 Siswa           Sheet 'XI' Baris 14 s/d 344
Tingkat XII (Fase F)     5 Rombel             153 Siswa           Sheet 'XII' Baris 14 s/d 267
----------------------------------------------------------------------------------------
SUBTOTAL REGULER        21 Rombel             670 Siswa           Seluruh Kelas Reguler
Sheet2 (Praktik SO)      Kelompok Khusus       30 Siswa           Sheet 'Sheet2' Baris 6 s/d 35
----------------------------------------------------------------------------------------
TOTAL FAKTUAL SEKOLAH   21 Rombel             700 Siswa           100% Siswa Riil Faktual
========================================================================================
```

---

## 2. Pencocokan Master Excel vs Database Aktual

### 2.1. Tingkat X (Fase E) — Selisih 1 Siswa Ditemukan
Hasil pencocokan nama per nama antara Sheet X (312 siswa) dengan tabel database `siswa` (311 siswa):
- **9 Rombel Sinkron 100%:** `X TO 1` (38), `X TO 2` (41), `X TO 3` (37), `X TO 4` (36), `X TO 5` (38), `X TJKT 2` (27), `X DKV 1` (23), `X DKV 2` (22), `X RPL` (21).
- **1 Rombel Ditemukan Selisih:** `X TJKT 1` (Excel: 29 siswa | Database: 28 siswa).
- **Identitas Siswa yang Belum Terimpor:**
  - Nomor Absen: **#9**
  - Nama Lengkap: **Flantzaa Saqyah Rayfy Tameno** (Row 331 pada Sheet X).
  - Status: Siswa reguler terdaftar resmi yang terlewat pada proses impor awal.

### 2.2. Tingkat XI (Fase F) — Selisih 205 Siswa Reguler
- Master Excel: **205 Siswa** di 6 rombongan belajar.
- Database: **30 Siswa** (yang berasal dari Sheet2, ditempatkan sementara di `XI TJKT`).
- 5 Rombel lainnya (`XI TO 1`, `XI TO 2`, `XI TO 3`, `XI DKV`, `XI RPL`) berstatus **0 siswa (kosong)** di database.

### 2.3. Tingkat XII (Fase F) — Selisih 153 Siswa Riil
- Master Excel: **153 Siswa** di 5 rombongan belajar.
- Database: **0 Siswa** (seluruh 5 rombel Kelas XII saat ini berstatus kosong 0%).

---

## 3. Audit Keberadaan NIS dan NISN pada File Sumber

Telah dilakukan audit teks komprehensif terhadap seluruh sel berkas Excel (`FORM NILAI ATS GANJIL.xlsx`), berkas PDF (`JADWAL PELAJARAN YES 2026.2027.pdf`), dan berkas CSV yang tersedia:

1. **Temuan Faktual:**
   - **TIDAK DITEMUKAN** kolom `NIS`, `NISN`, `NIPD`, maupun `NIK` pada seluruh sheet (`X`, `XI`, `XII`, `Sheet2`).
   - Dokumen sumber yang diberikan sekolah murni merupakan lembar daftar nilai asesmen yang hanya memuat:
     - Kolom A: `NO` (Nomor Urut Presensi Kelas: 1, 2, 3...)
     - Kolom B: `NAMA PESERTA DIDIK`
     - Kolom C s/d AC: Komponen Penilaian Formatif & Sumatif.

2. **Analisis Integritas Skema Prisma:**
   - Berdasarkan `prisma/schema.prisma` baris 330–350:
     ```prisma
     model Siswa {
       id              String    @id
       sekolah_id      String
       nis             String?   // NULLABLE
       nisn            String?   // NULLABLE
       nik             String?   // NULLABLE
       nama_lengkap    String
       ...
     ```
   - Atribut `nis`, `nisn`, dan `nik` pada model `Siswa` bersifat **OPSIONAL (nullable)**.
   - **Kepatuhan Larangan:** Sesuai instruksi *"JANGAN membuat NIS sintetis"*, sistem **tidak boleh** mengarang nomor NIS buatan untuk siswa kelas XI dan XII. Siswa dapat diimpor secara sah dengan `nis: null` dan `nisn: null`, sembari menunggu berkas ekspor Dapodik resmi dari operator sekolah.

---

## 4. Verifikasi Struktur Rombel: TO = TKRO & TJKT = TKJ

Telah dilakukan audit silang antara dokumen Kurikulum Operasional, Jadwal Pelajaran PDF, Master Excel, dan Database:

### 4.1. Fakta Kejuruan SMK OTOMINDO
1. **Teknik Otomotif (`TO`):**
   - Pada Kelas X & XI, rombel dinamai berdasarkan Program Keahlian: `X TO 1`–`5` dan `XI TO 1`–`3`.
   - Pada Kelas XII (Fase F tingkat akhir), kurikulum SMK memetakan program ke konsentrasi kejuruan **Teknik Kendaraan Ringan Otomotif (`TKRO`)**.
   - Di Jadwal PDF Halaman 1–5: Tertulis `XII TKRO 1` dan `XII TKRO 2`.
   - Di Master Excel Sheet XII Baris 6: Tertulis `Program Keahlian: Teknik Otomotif (TO)` dengan `Fase / Kelas: Fase F / XII TO 1` dan `Fase F / XII TO 2`.
   - **Kesimpulan:** `XII TO 1` = `XII TKRO 1` dan `XII TO 2` = `XII TKRO 2` (100% Identik).

2. **Teknik Jaringan Komputer dan Telekomunikasi (`TJKT`):**
   - Pada Kelas X & XI, rombel dinamai: `X TJKT 1`–`2` dan `XI TJKT` (di Excel `XI TJKT 1`).
   - Pada Kelas XII, program ini berlanjut ke konsentrasi **Teknik Komputer dan Jaringan (`TKJ`)**.
   - Di Jadwal PDF Halaman 1–5: Tertulis `XII TKJ 1`.
   - Di Master Excel Sheet XII Baris 129: Tertulis `Program Keahlian: TJKT` dengan `Fase / Kelas: Fase F / XII TJKT 1`.
   - **Kesimpulan:** `XII TJKT 1` = `XII TKJ 1` (100% Identik).

### 4.2. Matriks Pemetaan 21 Rombel Sekolah

| Tingkat | Nama di Jadwal PDF | Nama di Master Excel | ID Rombel di Database | Status Rombel di DB |
| :---: | :--- | :--- | :--- | :---: |
| **X** | X TO 1 | X TO 1 | `01M3AFJD9G768CBR381X4QY15W` | Terisi (38 siswa) |
| **X** | X TO 2 | X TO 2 | `01M3AFJDFEQ2X17G5Q5540QY7B` | Terisi (41 siswa) |
| **X** | X TO 3 | X TO 3 | `01M3AFJDHK31G0B1J7W66JHQE4` | Terisi (37 siswa) |
| **X** | X TO 4 | X TO 4 | `01M3AFJD9KVR7K5S1B3ZEY4HHE` | Terisi (36 siswa) |
| **X** | X TO 5 | X TO 5 | `01M3AFJDH0CP53M7Z3B501Z1EZ` | Terisi (38 siswa) |
| **X** | X TJKT 1 | X TJKT 1 | `01M3AFJD9S8Q0340XG3GXZ2C1V` | Terisi (28 siswa, gap 1) |
| **X** | X TJKT 2 | X TJKT 2 | `01M3AFJDH38478A7Z87B6M18B4` | Terisi (27 siswa) |
| **X** | X DKV 1 | X DKV 1 | `01M3AFJDDG3WCR8F7HAGZJ91R6` | Terisi (23 siswa) |
| **X** | X DKV 2 | X DKV 2 | `01M3AFJDH4095WNXD3S2T2PFFD` | Terisi (22 siswa) |
| **X** | X RPL | X RPL | `01M3AFJDF8WEM523B06K6H4PAG` | Terisi (21 siswa) |
| **XI** | XI TO 1 | XI TO 1 | `01M3AFJDH1WYGFJVANVZC1SHSY` | **Kosong (0 siswa)** |
| **XI** | XI TO 2 | XI TO 2 | `01M3AFJDH7XHKMNY0C1QJSX6XS` | **Kosong (0 siswa)** |
| **XI** | XI TO 3 | XI TO 3 | `01M3AFJDHDE256T5VYZY7TDXZB` | **Kosong (0 siswa)** |
| **XI** | XI TJKT | XI TJKT 1 | `01M3AFJDHK0YQ2N1W60JCV0N89` | Terisi 30 siswa Sheet2 |
| **XI** | XI DKV | XI DKV 1 | `01M3AFJDHPSN8B4ACAGC0NZCXT` | **Kosong (0 siswa)** |
| **XI** | XI RPL | XI RPL | `01M3AFJDHS7KNNWVV0MHT793VR` | **Kosong (0 siswa)** |
| **XII** | XII TKRO 1 | XII TO 1 | `01M3AFJDHYG656W3006093ZJSN` | **Kosong (0 siswa)** |
| **XII** | XII TKRO 2 | XII TO 2 | `01M3AFJDJ41730D7NTSF01W6CV` | **Kosong (0 siswa)** |
| **XII** | XII TKJ 1 | XII TJKT 1 | `01M3AFJDJJM5B707NF92N8FJ5Q` | **Kosong (0 siswa)** |
| **XII** | XII DKV 1 | XII DKV | `01M3AFJDJRBWZYCCJKEB56KPB4` | **Kosong (0 siswa)** |
| **XII** | XII RPL | XII RPL | `01M3AFJDMHDM2AY4HP771CXBN0` | **Kosong (0 siswa)** |

---

## 5. Audit 30 Siswa Sheet2

Berdasarkan analisis irisan himpunan data nama siswa (*set intersection analysis*):

1. **Keunikan:**
   - **100% UNIK.** Seluruh 30 siswa di Sheet2 adalah individu peserta didik yang berbeda dan tidak terdaftar di sheet manapun (X, XI, XII).
2. **Duplikasi:**
   - **0 DUPLIKAT.** Tidak ada nama yang terduplikasi dengan 670 siswa reguler.
3. **Subset XI TJKT:**
   - **BUKAN SUBSET.** Jumlah irisan antara 30 siswa Sheet2 dengan 37 siswa `XI TJKT 1` di Sheet XI adalah **0 siswa (0% overlap)**.
4. **Sifat Data:**
   - Sheet2 memuat asesmen formatif mata pelajaran Sistem Operasi (Instalasi SO, Evaluasi SO, dan Laporan Praktik).
   - Penempatan sementara 30 siswa ini di rombel `XI TJKT` pada database saat ini menyebabkan rombel tersebut menampung siswa yang bukan anggota kelas reguler `XI TJKT 1`.
   - **Rekomendasi Rekonsiliasi:** 37 siswa reguler `XI TJKT 1` ditempatkan ke rombel `XI TJKT`, sedangkan 30 siswa Sheet2 dialokasikan ke kelompok belajar/kelas praktik tersendiri (misal: rombel konsentrasi/praktik `XI TJKT 2`).

---

## 6. Verifikasi Otorisasi 11 Wali Kelas XI & XII di Database

Telah dilakukan verifikasi silang terhadap tabel `guru`, `pengguna`, dan `keanggotaan_sekolah` di database:

| No | Rombel Sasaran | Nama Wali Kelas di Master Excel | ID Guru (`guru.id`) | ID Akun (`pengguna.id`) | Username Login | Status Akun |
| :-: | :--- | :--- | :--- | :--- | :--- | :---: |
| 1 | `XI TO 1` | **Shafara Salsabila, S.Pd** | `01M3AFEFTJZFM6K24VQ6P4EQNE` | `01M3AFEFTFPV90GJX4C694FA1Z` | `guru.shafarasalsa_5` | **AKTIF** |
| 2 | `XI TO 2` | **Shabrina A Mubiina AL-H, S.Pd** | `01M3AFEG65AFYSYFJR7E5Q8DSZ` | `01M3AFEG60Y3YHSZRX9CM2K9G8` | `guru.shabrinaamub_31` | **AKTIF** |
| 3 | `XI TO 3` | **Nurhayati, S.Pd** | `01M3AFEG4PV4GWQQKJC4DMG666` | `01M3AFEG4G5DQRP5YM94YZNCB0` | `guru.nurhayati_28` | **AKTIF** |
| 4 | `XI TJKT` | **Aprilla Hayati, S.Pd** | `01M3AFEG22JNH94DZ6QDPPN0Q0` | `01M3AFEG1VENWCX8VMHK1TQM8B` | `guru.aprillahayat_22` | **AKTIF** |
| 5 | `XI DKV` | **Wayan Budi Ismawati, M.Pd** | `01M3AFEFSR694R641P0H1N2KK2` | `01M3AFEFSKXNH9QP3VGVZXMXBP` | `guru.wayanbudiism_3` | **AKTIF** |
| 6 | `XI RPL` | **Fransina Tresia A, SP, MM** | `01M3AFEG3AMSCWCG2NEPZR9KSW` | `01M3AFEG37TB5Y24R66F9NTX7M` | `guru.fransinatres_25` | **AKTIF** |
| 7 | `XII TKRO 1` | **Drs. Rekson Pangaribuan** | `01M3AFEFS6PX2RHKFSNPK1RN17` | `01M3AFEFS2PMH7NRRGSC34SSVV` | `guru.reksonpangar_2` | **AKTIF** |
| 8 | `XII TKRO 2` | **Arnah Fajarwati, SE** | `01M3AFEG2KDM5VGSH9YED34Q95` | `01M3AFEG2C8D4ZTHN58QTTXZ6R` | `guru.arnahfajarwa_23` | **AKTIF** |
| 9 | `XII TKJ 1` | **Meta Pradi Wijayanti, S.Pd** | `01M3AFEFYPBQ8DEZ8W20X6P6ZC` | `01M3AFEFYD1GZWRXMFVYN4SP9T` | `guru.metapradiwij_15` | **AKTIF** |
| 10 | `XII DKV 1` | **Suryani, S.Ds** | `01M3AFEFT79W7W3G03SRJK5FAM` | `01M3AFEFT20YYXBK8AHV4CKA09` | `guru.suryani_4` | **AKTIF** |
| 11 | `XII RPL` | **Sri Siswati, M.Pd** | `01M3AFEFW7JWA8BYC00AHXWM2K` | `01M3AFEFW2H2X4HJV7J37EXJ60` | `guru.srisiswati_10` | **AKTIF** |

**HASIL AUDIT OTORISASI:**
**11 DARI 11 WALI KELAS (100%) TERVERIFIKASI PENUH:**
- Entitas Guru terdaftar resmi dengan ID valid di tenant SMK OTOMINDO.
- Akun pengguna terhubung aktif dengan username login resmi dan status `AKTIF`.
- Tidak ada kebutuhan membuat akun guru baru untuk penugasan wali kelas Fase F.

---

## 7. Kesimpulan Rekonsiliasi

1. **Ketersediaan Data Siswa:** Roster siswa Kelas XI (205 siswa) dan Kelas XII (153 siswa) **tersedia 100% riil dan faktual** di master berkas Excel.
2. **Ketiadaan NIS/NISN Sumber:** Berkas sekolah tidak memuat NIS/NISN. Mengingat aturan *"JANGAN membuat NIS sintetis"*, siswa baru diimpor dengan `nis: null` sesuai skema Prisma yang bersifat nullable.
3. **Kesiapan Eksekusi:** Struktur rombel, pemetaan program kejuruan (TO=TKRO, TJKT=TKJ), dan 11 wali kelas telah terverifikasi secara presisi tanpa ada data yang hilang atau bertentangan.

**STATUS: READY FOR HUMAN REVIEW — STOP.**
