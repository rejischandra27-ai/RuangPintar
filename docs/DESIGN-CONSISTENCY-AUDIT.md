# DESIGN-CONSISTENCY-AUDIT.md
## Audit Konsistensi Desain & Standardisasi Academic Glass UI
### Ruang Pintar — School Digital Operating Platform

| Field | Nilai |
| --- | --- |
| **Tahap Audit** | STAGE 10.7 — UX Consistency Audit |
| **Benchmark Emas** | **Dashboard Guru** (`Dark Academic Glass UI v2.0`) |
| **Ruang Lingkup** | 10 Menu Sidebar Guru (`/dashboard`, `/pengumuman`, `/kelas-saya`, `/jadwal-saya`, `/sesi-pembelajaran`, `/kalender-akademik`, `/presensi-kelas`, `/penilaian`, `/cbt-ujian`, `/asisten-ai`) |
| **Status Gate** | `AUDIT ONLY` — Kode Tidak Diubah (**STOP**) |
| **Versi Dokumen** | 1.0 (UX Consistency Master Report) |

---

# 1. Pernyataan Masalah & Latar Belakang

Dashboard Guru saat ini menjadi **standar pengalaman terbaik (Golden Standard)** di seluruh ekosistem Ruang Pintar:
- Mengadopsi bahasa desain **Academic Glass UI (Dark Academic)**.
- Dilengkapi **3D Pop-Out Mascot Hero** (Astronot Ruang Pintar), ambient glow blur radial, serta aksi cepat terpadu.
- **Tipografi Premium:** Perpaduan harmonis antara *font-mono font-extrabold* untuk angka metrik dan judul command center, dipadu sans-serif modern berbobot tinggi.
- **Hierarki Visual Kuat:** Cockpit 12 kolom (8 kolom Workspace interaktif, 4 kolom Timeline Rail operasional).
- **Komponen Khas:** Kartu dengan radius `rounded-[28px]`, glass backdrop blur (`dark:bg-slate-900/75 dark:backdrop-blur-xl`), shadow biru presisi, dan animated counter.

**Namun, ketika pengguna bernavigasi ke menu sidebar lainnya, kualitas visual merosot drastis:**
Halaman seperti Jadwal Mengajar, Sesi KBM, Presensi, Buku Nilai, dan CBT terasa seperti **kumpulan template yang berbeda**. Sebagian menggunakan kartu putih datar (*flat white*), sebagian menggunakan hero ilustrasi 3D yang posisinya tidak simetris, sebagian menggunakan banner gradien biru-gelap tanpa glassmorphism, dan sebagian lainnya tidak mendukung Dark Mode secara komprehensif.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                 SPEKTRUM KONSISTENSI DESAIN                             │
├───────────────────────────────┬───────────────────────────────┬────────────────────────┤
│     GOLDEN STANDARD (10/10)   │    TRANSITIONAL (6-7/10)      │     LEGACY/FLAT (4-5/10)│
├───────────────────────────────┼───────────────────────────────┼────────────────────────┤
│ • Dashboard Guru              │ • Pengumuman Sekolah          │ • Buku Nilai & Rapor   │
│   (Academic Glass v2.0,       │ • Sesi Pembelajaran (KBM)     │ • Presensi Kehadiran   │
│    Cockpit 12-Kolom,          │ • Kalender Akademik           │ • CBT Hub Overview     │
│    Glow & 3D Pop-Out)         │ • Asisten AI Guru (Unik)      │ • Jadwal Mengajar      │
│                               │ • Kelas Saya (Sebagian)       │                        │
└───────────────────────────────┴───────────────────────────────┴────────────────────────┘
```

---

# 2. Matriks Evaluasi 10 Menu Sidebar

Evaluasi dinilai dalam skala **1 – 10** berdasarkan kepatuhan terhadap 5 pilar desain:
1. **Typography (T):** Konsistensi font family (Mono vs Sans), ukuran, weight, tracking, dan hierarki heading.
2. **Visual Hierarchy (VH):** Ketegasan fokus visual, kontras warna status (Emerald, Blue, Amber, Rose), dan kedalaman layer.
3. **Layout & Grid (L):** Kerapian grid, simetri margin/padding, baseline alignment, dan perlakuan Hero section.
4. **Information Density (ID):** Keseimbangan antara data fungsional, ruang negatif (*whitespace*), dan keterbacaan kartu.
5. **Dashboard Consistency (DC):** Kemiripan *look & feel* dengan Dashboard Guru (Dark Academic Glass UI tokens).

---

| No | Menu Sidebar | Rute URL | T | VH | L | ID | DC | Skor Total | Status Visual |
|:---:|:---|:---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| 1 | **Dashboard Guru** | `/dashboard` | 10 | 10 | 10 | 9 | 10 | **9.8 / 10** | **Golden Standard** |
| 2 | **Pengumuman** | `/pengumuman` | 8 | 7 | 8 | 8 | 7 | **7.6 / 10** | Butuh Refinement |
| 3 | **Kelas Saya** | `/kelas-saya` | 7 | 6 | 7 | 6 | 6 | **6.4 / 10** | Kesenjangan Sedang |
| 4 | **Jadwal Mengajar** | `/jadwal-saya` | 6 | 5 | 6 | 6 | 5 | **5.6 / 10** | Kesenjangan Tinggi |
| 5 | **Sesi KBM** | `/sesi-pembelajaran` | 7 | 7 | 7 | 7 | 6 | **6.8 / 10** | Kesenjangan Sedang |
| 6 | **Kalender Akademik** | `/kalender-akademik` | 7 | 7 | 7 | 7 | 6 | **6.8 / 10** | Kesenjangan Sedang |
| 7 | **Presensi Kehadiran** | `/presensi-kelas` | 6 | 5 | 6 | 6 | 5 | **5.6 / 10** | Kesenjangan Tinggi |
| 8 | **Buku Nilai & Rapor** | `/penilaian` | 5 | 5 | 5 | 6 | 4 | **5.0 / 10** | Kritis (Template Berbeda) |
| 9 | **CBT Ujian Online** | `/cbt-ujian` | 5 | 5 | 5 | 5 | 4 | **4.8 / 10** | Kritis (Template Berbeda) |
| 10 | **Asisten AI Guru** | `/asisten-ai` | 8 | 7 | 7 | 8 | 6 | **7.2 / 10** | Gaya Berbeda Sendiri |

---

# 3. Audit Mendalam per Menu Sidebar

---

### 3.1. Menu 1: Dashboard Guru (`/dashboard`) — *Benchmark*
* **Komponen:** [`teacher-dashboard.tsx`](file:///C:/laragon/www/Ruang-Pintar/src/shared/components/dashboard/role-views/teacher-dashboard.tsx), [`teaching-timeline-rail.tsx`](file:///C:/laragon/www/Ruang-Pintar/src/shared/components/dashboard/cockpit/teaching-timeline-rail.tsx), [`performance-bar-chart.tsx`](file:///C:/laragon/www/Ruang-Pintar/src/shared/components/dashboard/cockpit/performance-bar-chart.tsx)
* **Karakteristik Visual:**
  - **Hero:** Kotak kaca raksasa `rounded-[28px]` berlatar `bg-white dark:bg-slate-900/75 dark:backdrop-blur-xl border-slate-200/80 dark:border-blue-500/25` dengan ambient glow radial blur. Maskot 3D Astronot melompat keluar (*pop-out*) melintasi batas atas kartu.
  - **Typography:** `font-mono text-2xl sm:text-3xl font-extrabold tracking-tight` pada salam pembuka dan heading utama.
  - **Cockpit Grid:** Rasio 12 kolom (8 Col Workspace kiri, 4 Col Timeline Rail kanan) yang berorientasi tugas.
* **Kelemahan:** Masih memuat data sintetis C-01 hingga C-03 (akan diperbaiki di Wave 1).

---

### 3.2. Menu 2: Pengumuman Sekolah (`/pengumuman`)
* **Komponen:** [`announcement-directory-view.tsx`](file:///C:/laragon/www/Ruang-Pintar/src/modules/communication/presentation/announcement-directory-view.tsx)
* **Analisis Visual:**
  - **Typography:** Menggunakan font Sans reguler. Tidak menggunakan `font-mono` pada judul, sehingga terasa terpisah dari ritme tipografi Dashboard.
  - **Layout:** Tidak memiliki Hero banner dengan ilustrasi 3D pop-out. Langsung masuk ke toolbar filter dan daftar pengumuman.
  - **Konsistensi Glass:** Bagian filter sudah memiliki `backdrop-blur-xl`, namun kartu pengumuman pinned menggunakan border standar tanpa aksen glow.

---

### 3.3. Menu 3: Kelas Saya (`/kelas-saya` & `/kelas-saya/[rombel_id]`)
* **Komponen:** [`teacher-classes-view.tsx`](file:///C:/laragon/www/Ruang-Pintar/src/modules/learning/presentation/teacher-classes-view.tsx), [`class-workspace-view.tsx`](file:///C:/laragon/www/Ruang-Pintar/src/modules/learning/presentation/class-workspace-view.tsx)
* **Analisis Visual:**
  - **Kesenjangan Hero:** Kartu hero menggunakan ilustrasi `student-lifecycle-3d.png` datar di sebelah kanan dalam kartu putih standar tanpa pop-out effect.
  - **Kerapatan Informasi (Density):** Kotak 4 kolom (BAB, Materi, Tugas, Jurnal) pada kartu kelas terasa terlalu padat (*cramped*) dengan font kecil `text-[10px]`.
  - **Workspace Detail Kelas:** Halaman `/kelas-saya/[rombel_id]` menggunakan tab navigasi konvensional, kehilangan nuansa Command Center interaktif yang ada di Dashboard.

---

### 3.4. Menu 4: Jadwal Mengajar (`/jadwal-saya`)
* **Komponen:** [`src/app/jadwal-saya/page.tsx`](file:///C:/laragon/www/Ruang-Pintar/src/app/jadwal-saya/page.tsx), [`my-schedule-view.tsx`](file:///C:/laragon/www/Ruang-Pintar/src/modules/schedule/presentation/my-schedule-view.tsx)
* **Analisis Visual:**
  - **Hero:** Menggunakan kartu putih standar dengan ilustrasi `school-hero-3d.png` flat.
  - **Visual Hierarchy:** Tabel jadwal mingguan menggunakan warna pastel yang terlalu pudar di mode terang dan belum memiliki dark mode styling yang seimbang dengan Dashboard.
  - **Ketiadaan Nuansa Glass:** Tidak ada efek glassmorphism, border gradient, ataupun glow ambient pada card slot jadwal.

---

### 3.5. Menu 5: Sesi Pembelajaran KBM (`/sesi-pembelajaran`)
* **Komponen:** [`src/app/sesi-pembelajaran/page.tsx`](file:///C:/laragon/www/Ruang-Pintar/src/app/sesi-pembelajaran/page.tsx), [`class-sessions-view.tsx`](file:///C:/laragon/www/Ruang-Pintar/src/modules/schedule/presentation/class-sessions-view.tsx)
* **Analisis Visual:**
  - **Hero Section:** Menggunakan banner putih `rounded-3xl` dengan ilustrasi `student-lifecycle-3d.png`. Bersih, namun kontras teksnya rendah.
  - **Table Layout:** Riwayat sesi KBM disajikan dalam tabel administratif datar (*flat table*). Tombol aksi "Buka Sesi", "Presensi", dan "Jurnal" berdesain standar SaaS tanpa kartu cockpit.

---

### 3.6. Menu 6: Kalender Akademik (`/kalender-akademik`)
* **Komponen:** [`src/app/kalender-akademik/page.tsx`](file:///C:/laragon/www/Ruang-Pintar/src/app/kalender-akademik/page.tsx), [`academic-calendar-view.tsx`](file:///C:/laragon/www/Ruang-Pintar/src/modules/calendar/presentation/academic-calendar-view.tsx)
* **Analisis Visual:**
  - **KPI Cards:** 4 kartu metrik kalender (Total Agenda, Libur & Cuti, Periode Ujian, Kegiatan MPLS) menggunakan kotak putih kecil dengan ikon berwarna. Cukup rapi, namun kurang kedalaman layer (*depth*).
  - **Tabel Kalender:** Tabel administratif panjang tanpa tampilan kalender visual (*grid calendar view / month view*). Guru lebih membutuhkan visualisasi timeline bulanan daripada tabel baris.

---

### 3.7. Menu 7: Presensi Kehadiran (`/presensi-kelas`)
* **Komponen:** [`src/app/presensi-kelas/page.tsx`](file:///C:/laragon/www/Ruang-Pintar/src/app/presensi-kelas/page.tsx), [`class-attendance-overview.tsx`](file:///C:/laragon/www/Ruang-Pintar/src/modules/attendance/presentation/class-attendance-overview.tsx)
* **Analisis Visual:**
  - **Hero Section:** Banner putih flat dengan 3 quick badges di bawah teks.
  - **Card Presensi:** Kartu rombel di tab "Rombel Belajar" berdesain minimalis tanpa indikator visual yang kuat mengenai persentase kehadiran (tidak ada progress bar warna atau mini donut gauge seperti di Dashboard).
  - **Tombol Aksi:** Tombol "Presensi Kilat" dan "Rekapitulasi" berukuran kecil dan tidak menonjol sebagai CTA utama.

---

### 3.8. Menu 8: Buku Nilai & Rapor (`/penilaian`)
* **Komponen:** [`src/app/penilaian/page.tsx`](file:///C:/laragon/www/Ruang-Pintar/src/app/penilaian/page.tsx), [`teacher-gradebook-overview-view.tsx`](file:///C:/laragon/www/Ruang-Pintar/src/modules/assessment/presentation/teacher-gradebook-overview-view.tsx)
* **Analisis Visual:**
  - **Tingkat Kesenjangan Paling Tinggi:** Halaman ini paling terasa seperti modul terpisah yang belum pernah disentuh redesain Academic Glass UI.
  - **Hero:** Kotak putih polos dengan badge teks sederhana.
  - **Grid Card Kelas:** Kartu kelas menggunakan background putih datar dengan border abu-abu tipis `border-slate-200/80`. Nilai rata-rata kelas ditampilkan menggunakan font sans-serif kecil. Tidak ada grafik sebaran nilai atau visualisasi ketercapaian KKTP.

---

### 3.9. Menu 9: CBT Ujian Online (`/cbt-ujian`)
* **Komponen:** [`src/app/cbt-ujian/page.tsx`](file:///C:/laragon/www/Ruang-Pintar/src/app/cbt-ujian/page.tsx), [`cbt-hub-overview-view.tsx`](file:///C:/laragon/www/Ruang-Pintar/src/modules/cbt/presentation/cbt-hub-overview-view.tsx)
* **Analisis Visual:**
  - **Tampilan CRUD:** Halaman ini sangat kental dengan kesan "form CRUD database": direktori kelas accordion, tombol "Buat Ujian Baru" biru standar, dan daftar ujian sederhana.
  - **Modal Monitoring:** Monitoring ujian dibuka di dalam modal popup sempit ([`exam-results-modal.tsx`](file:///C:/laragon/www/Ruang-Pintar/src/modules/cbt/presentation/exam-results-modal.tsx)) alih-alih menjadi Command Center Ujian Daring layar penuh yang imersif.
  - **Ketiadaan Tokens Glass:** Tidak ada shadow biru bercahaya, tidak ada visualisasi radar atau lonceng nilai, dan tidak ada live indicator animasi.

---

### 3.10. Menu 10: Asisten AI Guru (`/asisten-ai`)
* **Komponen:** [`src/app/asisten-ai/page.tsx`](file:///C:/laragon/www/Ruang-Pintar/src/app/asisten-ai/page.tsx), [`ai-teacher-studio-view.tsx`](file:///C:/laragon/www/Ruang-Pintar/src/modules/ai/presentation/ai-teacher-studio-view.tsx)
* **Analisis Visual:**
  - **Gaya Unik Namun Terisolasi:** Menggunakan hero gradien gelap pekat (`bg-gradient-to-br from-indigo-900 via-blue-900 to-slate-900`) yang sangat berbeda dengan Hero Dashboard Guru (yang berbasis Glassmorphism putih transparan di light mode dan dark glass biru di dark mode).
  - **Komponen Tab:** Tab navigasi (SOAL, RPP, MATERI, SETTINGS) menggunakan style pill solid yang tidak serasi dengan tab navigasi di halaman lain.
  - **Meskipun secara mandiri terlihat modern**, halaman ini terasa seperti aplikasi eksternal yang di-embed ke dalam Ruang Pintar.

---

# 4. Standar Baru: Design Language "Academic Glass UI v2.0"

Untuk menyatukan seluruh antarmuka Teacher Workspace ke standar Dashboard Guru, ditetapkan **Design System Contract** berikut:

```css
/* DESIGN SYSTEM TOKENS ACADEMIC GLASS UI v2.0 */
--glass-card-bg: rgba(255, 255, 255, 0.95);
--glass-card-bg-dark: rgba(15, 23, 42, 0.75);
--glass-card-border: rgba(226, 232, 240, 0.85);
--glass-card-border-dark: rgba(59, 130, 246, 0.25);
--glass-card-radius: 28px;
--glass-card-shadow: 0 4px 25px -4px rgba(15, 23, 42, 0.04);
--glass-card-shadow-dark: 0 0 35px -5px rgba(37, 99, 235, 0.18), 0 10px 25px -5px rgba(0, 0, 0, 0.5);

/* TYPOGRAPHY */
--font-header: var(--font-mono); /* font-mono font-extrabold tracking-tight */
--font-metric: var(--font-mono); /* font-mono font-black */
--font-body: var(--font-sans);   /* font-medium / font-bold */
```

### Aturan Wajib Penerapan (Non-Negotiables):
1. **Hero Section Universal:** Setiap halaman wajib memiliki Hero Section dengan ketinggian seragam, breadcrumb terintegrasi, badge identitas sekolah, dan ilustrasi bertema 3D pop-out.
2. **Radius Konsisten:** Seluruh kartu penampung utama (*major container*) wajib menggunakan `rounded-[28px]`. Kartu aksi kecil menggunakan `rounded-2xl`.
3. **Tipografi Angka:** Seluruh angka metrik, persentase, kode kelas, dan skor wajib menggunakan kelas `font-mono font-black` atau `font-mono font-extrabold`.
4. **Dark Mode Terpadu:** Seluruh kartu wajib memiliki perlakuan `dark:bg-slate-900/75 dark:backdrop-blur-xl dark:border-blue-500/25` dengan ambient glow halus pada kartu utama.
