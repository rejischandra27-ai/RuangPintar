# CBT-PLATFORM-GAP-ANALYSIS.md
## Analisis Kesenjangan CBT: Dari CRUD Soal Menuju Modern Assessment Platform
### Ruang Pintar — School Digital Operating Platform

| Field | Nilai |
| --- | --- |
| **Tahap Audit** | STAGE 10.7 — CBT Platform Gap Analysis |
| **Kondisi Modul Saat Ini** | M14 CBT Engine v1.2 (CRUD Soal & Pelaksanaan Ujian Daring) |
| **Target Platform** | **Modern Digital Assessment Cockpit** (Setara Standar ANBK & Platform Asesmen Institusi Modern) |
| **Status Gate** | `AUDIT ONLY` — Kode Tidak Diubah (**STOP**) |
| **Versi Dokumen** | 1.0 (CBT Modernization Gap Report) |

---

# 1. Ringkasan Diagnosa CBT Saat Ini

Saat ini modul CBT Ruang Pintar berada pada fase fungsional dasar:
- Guru dapat membuat ujian, memilih mata pelajaran, memasukkan butir soal (Pilihan Ganda, Menjodohkan, Esai).
- Siswa dapat mengerjakan ujian melalui antarmuka pemutar ujian ([`cbt-player-view.tsx`](file:///C:/laragon/www/Ruang-Pintar/src/modules/cbt/presentation/cbt-player-view.tsx)) dengan deteksi integritas dasar (pindah tab browser).
- Nilai dapat dihitung dan ditransfer ke Buku Nilai M13.

**Namun, secara pengalaman produk dan operasional institusi sekolah, CBT saat ini masih terasa seperti "CRUD Database Soal", bukan sebuah "Assessment Platform":**
1. **Ketiadaan Live Proctoring Cockpit:** Guru tidak memiliki layar pantauan real-time untuk melihat siswa mana yang sedang aktif mengetik, siswa yang koneksinya terputus, atau siswa yang baru menjawab 5 dari 30 soal.
2. **Monitoring Terkungkung dalam Modal:** Pemantauan hasil hanya berupa modal popup kecil ([`exam-results-modal.tsx`](file:///C:/laragon/www/Ruang-Pintar/src/modules/cbt/presentation/exam-results-modal.tsx)) yang harus di-refresh secara manual.
3. **Token Ujian Statis:** Token ujian tersimpan permanen di database tanpa siklus kedaluwarsa dinamis atau kemampuan regenerasi berkala oleh pengawas ruang.
4. **Ketiadaan Analisis Butir Soal (Psychometrics):** Tidak ada analisis tingkat kesukaran soal, daya pembeda, maupun efektivitas distraktor/pengecoh.
5. **Bank Soal Belum Terpisah:** Soal masih terikat erat langsung pada paket ujian tertentu, bukan sebagai bank soal aset kurikulum sekolah yang modular.

---

# 2. Matriks Perbandingan: CBT Saat Ini vs CBT Modern

```
┌─────────────────────────────────┬─────────────────────────────────┬─────────────────────────────────┐
│ DIMENSI OPERASIONAL             │ CBT SAAT INI (RUANG PINTAR)     │ CBT PLATFORM MODERN (TARGET)    │
├─────────────────────────────────┼─────────────────────────────────┼─────────────────────────────────┤
│ 1. Antarmuka Utama              │ Accordion per kelas di Hub      │ Dedicated Assessment Dashboard  │
│ 2. Live Monitoring Peserta      │ Tidak Ada (Modal manual reload) │ Real-Time Live Proctoring Grid  │
│ 3. Status Pengerjaan Siswa      │ Hanya status akhir sesi         │ Live Progress (Soal X/Y, Ragu)  │
│ 4. Sistem Token Ujian           │ Token statis database           │ Dynamic Rolling Token per Sesi  │
│ 5. Penjadwalan Jendela Ujian    │ Tanggal input form dasar        │ Hard-Enforced Exam Windows      │
│ 6. Manajemen Bank Soal          │ Terikat paket ujian             │ Institutional Question Bank Hub │
│ 7. Pembobotan & Scoring         │ Bobot manual sederhana          │ Weighted Scoring + Penalti      │
│ 8. Analisis Hasil Asesmen       │ Rata-rata & KKTP sederhana      │ Analisis Butir, Distraktor, Kurva│
│ 9. Aksi Kontrol Pengawas        │ Hanya unlock attempt modal      │ Force Submit, Pause, Ext. Time │
│ 10. Desain & Kepatuhan Glass    │ Form putih datar (Skor 4.8/10)  │ Academic Glass UI Cockpit       │
└─────────────────────────────────┴─────────────────────────────────┴─────────────────────────────────┘
```

---

# 3. Klasifikasi Kebutuhan Modernisasi CBT 2.0

Fitur-fitur yang wajib dibangun untuk menaikkan kelas CBT menjadi **Assessment Platform** dikelompokkan ke dalam 3 tier:
- **MUST HAVE:** Fondasi mutlak agar CBT layak dipakai pada asesmen resmi sekolah (PTS/PAS/Asesmen Sumatif).
- **SHOULD HAVE:** Fitur analitik dan kontrol pengawas yang meningkatkan profesionalitas operasional guru.
- **NICE TO HAVE:** Kemampuan tingkat lanjut berbasis AI dan pengamanan perangkat tingkat tinggi.

---

## 3.1. MUST HAVE (Kebutuhan Mutlak — Prioritas Wave 3)

| Kode | Fitur | Deskripsi Fungsional | Dampak Bisnis |
|:---:|:---|:---|:---|
| **MH-01** | **Live Proctoring Cockpit (Layar Pengawas Real-Time)** | Halaman pemantauan layar penuh (bukan modal sempit) yang menampilkan kartu status seluruh siswa secara langsung (Live Grid). | Pengawas ujian dapat memantau 38+ siswa dalam satu layar secara langsung tanpa reload. |
| **MH-02** | **Indikator Status Peserta Real-Time** | Visualisasi status per siswa: `Belum Masuk` (Abu-abu), `Mengerjakan` (Biru), `Terkunci Integritas` (Merah/Pulse), `Selesai` (Hijau). | Mengetahui secara instan siswa yang mengalami kendala teknis atau mencoba membuka tab lain. |
| **MH-03** | **Live Progress Tracker (Progres Butir Soal)** | Indikator progres per siswa: `24 / 30 Soal Terjawab` disertai persentase keterisian dan jumlah jawaban ragu-ragu. | Guru dapat melihat laju pengerjaan siswa dan mengidentifikasi siswa yang macet di soal tertentu. |
| **MH-04** | **Dynamic Token Lifecycle & Refresher** | Generator token 6 karakter alfanumerik yang dapat digenerate ulang sewaktu-waktu oleh guru/pengawas dan memiliki masa aktif per sesi. | Mencegah kebocoran token ujian ke siswa yang tidak hadir di ruang kelas fisik. |
| **MH-05** | **Hard-Enforced Exam Schedule Windows** | Penjadwalan ketat: Ujian hanya dapat diakses saat rentang waktu aktif (`tanggal_mulai` s/d `tanggal_selesai`). Tombol "Mulai" terkunci otomatis sebelum jam mulai dan sesi ter-submit otomatis saat jam selesai. | Menegakkan disiplin waktu ujian resmi sekolah tanpa manipulasi sisi klien. |
| **MH-06** | **Bobot Butir Soal Fleksibel & KKTP Evaluator** | Penentuan bobot nilai individual per soal (misal PG: 2 poin, Menjodohkan: 3 poin, Esai: 5 poin) dengan total kalkulasi skala 100 otomatis. | Memenuhi standar penilaian Kurikulum Merdeka untuk asesmen formatif dan sumatif. |

---

## 3.2. SHOULD HAVE (Sangat Penting — Wave 3 & Wave 4)

| Kode | Fitur | Deskripsi Fungsional | Dampak Bisnis |
|:---:|:---|:---|:---|
| **SH-01** | **Bank Soal Institusi Modern (Question Repository)** | Pemisahan arsitektur antara Bank Soal Sekolah/Guru dengan Paket Ujian. Guru dapat membuat ribuan soal per topik/TP, lalu merakit ujian dengan mengambil soal dari bank. | Guru tidak perlu mengetik ulang soal dari awal setiap kali membuat ujian baru; aset bank soal sekolah terkelola rapi. |
| **SH-02** | **Aksi Pengawas Terpadu (Live Proctor Actions)** | Tindakan interaktif dari layar pengawas:  <br>• *Tambah Waktu* (+5 / +10 Menit per siswa atau per rombel)  <br>• *Buka Kunci Massal* (Unlock Siswa Terkunci)  <br>• *Paksa Kumpulkan* (Force Submit Sesi Tertentu) | Pengawas memiliki kontrol kendali penuh atas dinamika ruang ujian jika terjadi kendala laptop/listrik. |
| **SH-03** | **Analisis Butir Soal & Pengecoh (Item Psychometrics)** | Statistik pasca-ujian per butir soal:  <br>• Tingkat Kesukaran (Mudah, Sedang, Sukar)  <br>• Daya Pembeda (Korelasi kelompok atas vs kelompok bawah)  <br>• Efektivitas Distraktor (Sebaran pilihan A, B, C, D, E) | Guru dapat mengidentifikasi soal yang cacat logika atau soal yang terlalu membingungkan siswa. |
| **SH-04** | **Kurva Distribusi Nilai & Analisis Remedial** | Visualisasi kurva nilai (lonceng sebaran nilai) dan daftar otomatis rekomendasi siswa yang wajib remedial nilai (di bawah KKTP). | Menghubungkan hasil ujian langsung dengan tindakan tindak lanjut akademik guru. |
| **SH-05** | **Import & Export Bank Soal Fleksibel** | Fitur import soal dari file Excel (format kisi-kisi resmi Kemendikbud) dan Word (.docx) serta export naskah ujian siap cetak. | Memudahkan guru memindahkan naskah soal yang telah diketik di Microsoft Word ke dalam platform. |

---

## 3.3. NICE TO HAVE (Penyempurnaan Lanjutan — Future Waves)

| Kode | Fitur | Deskripsi Fungsional | Dampak Bisnis |
|:---:|:---|:---|:---|
| **NH-01** | **AI Question Quality & Alignment Checker** | Pemeriksaan otomatis butir soal menggunakan Google Gemini untuk mengecek kesesuaian soal dengan Capaian Pembelajaran (CP) dan Tujuan Pembelajaran (TP). | Memastikan soal ujian berkualitas tinggi dan bebas dari bias atau kesalahan ketik kunci jawaban. |
| **NH-02** | **Kiosk Browser / Safe Exam Lock** | Mode fullscreen eksklusif yang mencegah tombol keyboard shortcut (Alt+Tab, Windows Key, PrintScreen, Split Screen). | Pengamanan ujian skala tinggi untuk Ujian Akhir Sekolah atau sertifikasi kejuruan SMK. |
| **NH-03** | **Distribusi Soal Adaptif (CAT — Computerized Adaptive Testing)** | Sistem yang secara cerdas memberikan tingkat kesulitan soal berikutnya berdasarkan benar/salah jawaban siswa sebelumnya. | Asesmen presisi untuk pemetaan bakat dan kompetensi siswa secara individual. |
| **NH-04** | **Audio & Visual Integrity Snapshot** | Pengambilan snapshot webcam secara acak pada interval berkala saat siswa mengerjakan ujian daring dari rumah. | Pengamanan asesmen jarak jauh (PJJ) atau ujian remedial mandiri. |

---

# 4. Blueprint Arsitektur CBT 2.0 (Layar Proctoring)

Berikut adalah konsep tata letak antarmuka **Live Proctoring Cockpit CBT 2.0** yang akan diintegrasikan dengan Academic Glass UI:

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│  LIVE PROCTORING COCKPIT — UJIAN TENGAH SEMESTER (KODING & AI - X TO 3)                 [AKSI PENGAWAS]  │
│  Sisa Waktu: 00:42:15 • Token Aktif: [ X K 9 P 2 L ] (Refresh) • Peserta: 38/38        [ + Waktu ] [ Kunci ]│
├──────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│  RINGKASAN STATUS KELAS                                                                                  │
│  [  32 Mengerjakan  ]   [  4 Selesai / Dikumpulkan  ]   [  2 Terkunci Integritas  ]   [  0 Belum Masuk  ]│
├──────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│  GRID STATUS PESERTA REAL-TIME (38 SISWA)                                                                │
│  ┌───────────────────────┐  ┌───────────────────────┐  ┌───────────────────────┐  ┌───────────────────────┐  │
│  │ 01. Ahmad Fauzi       │  │ 02. Budi Santoso      │  │ 03. Cindy Permata     │  │ 04. Doni Pratama      │  │
│  │ Progres: 24/30 (80%)  │  │ Progres: 30/30 (100%) │  │ Progres: 12/30 (40%)  │  │ Progres: 18/30 (60%)  │  │
│  │ Status: MENGERJAKAN   │  │ Status: SELESAI       │  │ Status: TERKUNCI (!)  │  │ Status: MENGERJAKAN   │  │
│  │ Nilai: [Tertutup]     │  │ Nilai: 88.5 (Tuntas)  │  │ Pindah Tab (2x)       │  │ Ragu-ragu: 2 Soal     │  │
│  │ [ Detail ] [ Kirim ]  │  │ [ Lihat Lembar ]      │  │ [ BUKA KUNCI ]        │  │ [ Detail ] [ Kirim ]  │  │
│  └───────────────────────┘  └───────────────────────┘  └───────────────────────┘  └───────────────────────┘  │
│                                                                                                          │
│  ... (34 Siswa lainnya dalam kartu grid berlatar Academic Glass dengan indikator pulse visual)            │
└──────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

# 5. Kesimpulan & Rekomendasi untuk STAGE 11

Transformasi CBT dari sekadar tabel CRUD menjadi **Modern Assessment Platform** akan menjadi fokus utama pada **Wave 3 Roadmap Implementasi**. Prioritas utama adalah membangun **Live Proctoring Cockpit**, **Dynamic Token**, dan **Analisis Butir Soal** agar Ruang Pintar memiliki keunggulan kompetitif yang kuat dibanding Google Forms atau CBT konvensional.
