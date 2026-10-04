# TEACHER WORKSPACE TYPOGRAPHY REPORT
## Ruang Pintar — Implementation Report Stage UI-03

| Field | Nilai |
| --- | --- |
| **Stage** | `STAGE UI-03 — STANDARISASI TYPOGRAPHY TEACHER WORKSPACE` |
| **Status** | `READY FOR HUMAN REVIEW` |
| **Target Visual** | Space Mono (Identitas Akademik) & Inter (Utilitas & Konten) |
| **Prohibited Fonts** | Monorama, Andale Mono, font monospace lain (Dieliminasi 100%) |
| **Verification Persona** | Ibu Wardah Ulfah, S.Pd (`guru_wardah` / SMA PGRI 1 Kota Bekasi) |
| **Quality Gate** | Typecheck: 0 errors \| Lint: 0 errors \| Tests: 100% PASS |

---

## 1. Executive Summary

Sesuai instruksi pada **TYPOGRAPHY STAGE UI-03**, dilakukan standardisasi dan penguncian sistem tipografi menyeluruh khusus untuk **Teacher Workspace** guna mengatasi inkonsistensi tipografi sebelumnya.

Implementasi ini menggantikan penggunaan font *Monorama* dan *Andale Mono* dengan dua Google Font canonical yang telah disetujui:
1. **Space Mono:** Sebagai font identitas akademik guru pada Hero Greeting sapaan guru, judul card dashboard, judul widget, statistik utama, angka KPI, empty state headline, dan section heading.
2. **Inter:** Sebagai font utilitas dan teks panjang pada navigasi sidebar, input form, label form, tombol/CTA, tabel akademik, dropdown, tooltip, modal content, wizard content, deskripsi card, dan informasi sekunder.

Seluruh rute non-guru (Landing Page, Login, Registrasi, Guardian Portal, Student Portal, Public Marketing Pages) **sama sekali tidak disentuh** dan tetap mempertahankan font platform bawaan (`Poppins`).

---

## 2. Files Modified & Created

### Files Created
- `TYPOGRAPHY-SYSTEM-V2.md`: Dokumen spesifikasi dan pedoman resmi sistem tipografi V2.
- `TEACHER-WORKSPACE-TYPOGRAPHY-REPORT.md`: Laporan verifikasi dan bukti implementasi.
- `src/test/shell/teacher-workspace-typography.test.tsx`: Test suite Vitest untuk token, route scoping, role boundaries, dan pembersihan CSS.
- `scripts/capture-stage-ui03-evidence.mjs`: Script automasi Playwright untuk verifikasi computed font-family dan penangkapan screenshot.
- `docs/evidence/UI-03/dashboard-guru.png`: Bukti screenshot Dashboard Guru.
- `docs/evidence/UI-03/wizard-onboarding.png`: Bukti screenshot Wizard Onboarding.
- `docs/evidence/UI-03/sidebar.png`: Bukti screenshot Sidebar Navigation.
- `docs/evidence/UI-03/card-statistik.png`: Bukti screenshot Card Statistik KPI.
- `docs/evidence/UI-03/form-input.png`: Bukti screenshot Form Input & Dialog Tambah Kelas.

### Files Modified
- `src/app/layout.tsx`: Menambahkan import Google Font `Inter` via `next/font/google` dengan `--font-inter` variable dan mendaftarkannya pada root `<html>`.
- `src/app/globals.css`:
  - Menghapus `@font-face` Monorama (400 & 700).
  - Menghapus seluruh aturan pemaksaan Andale Mono dan Monorama.
  - Mendefinisikan design tokens kanonikal `--font-teacher-identity` (`Space Mono`) dan `--font-teacher-utility` (`Inter`).
  - Menetapkan aturan scoped typography di bawah selektor `html.teacher-workspace`.
- `src/shared/components/shell/academic-shell.tsx`:
  - Memperluas daftar rute workspace guru dengan menyertakan `/asisten-ai` dan `/onboarding`.

---

## 3. Font System Mapping Verification

Berdasarkan inspeksi visual dan ekstraksi computed styles pada runtime menggunakan browser Playwright engine:

| Kategori Elemen | Target Font | Computed Style Terverifikasi | Status |
| --- | --- | --- | :---: |
| **Hero Greeting** | **Space Mono** | `"Space Mono", "Space Mono Fallback", monospace` (Weight: 800) | **PASS** |
| **Judul Card Dashboard** | **Space Mono** | `"Space Mono", "Space Mono Fallback", monospace` (Weight: 800) | **PASS** |
| **Judul Widget** | **Space Mono** | `"Space Mono", "Space Mono Fallback", monospace` (Weight: 800) | **PASS** |
| **Statistik Utama / KPI** | **Space Mono** | `"Space Mono", "Space Mono Fallback", monospace` (Weight: 900) | **PASS** |
| **Empty State Headline** | **Space Mono** | `"Space Mono", "Space Mono Fallback", monospace` (Weight: 700) | **PASS** |
| **Section Heading** | **Space Mono** | `"Space Mono", "Space Mono Fallback", monospace` (Weight: 700) | **PASS** |
| **Sidebar Navigation** | **Inter** | `Inter, "Inter Fallback", -apple-system, sans-serif` (Weight: 700) | **PASS** |
| **Form Input** | **Inter** | `Inter, "Inter Fallback", -apple-system, sans-serif` (Weight: 400) | **PASS** |
| **Label Form** | **Inter** | `Inter, "Inter Fallback", -apple-system, sans-serif` (Weight: 600) | **PASS** |
| **Button / CTAs** | **Inter** | `Inter, "Inter Fallback", -apple-system, sans-serif` (Weight: 600/700) | **PASS** |
| **Table** | **Inter** | `Inter, "Inter Fallback", -apple-system, sans-serif` (Weight: 400/600) | **PASS** |
| **Dropdown & Select** | **Inter** | `Inter, "Inter Fallback", -apple-system, sans-serif` (Weight: 400) | **PASS** |
| **Modal / Wizard Content** | **Inter** | `Inter, "Inter Fallback", -apple-system, sans-serif` (Weight: 400/500) | **PASS** |
| **Deskripsi Card & Sekunder** | **Inter** | `Inter, "Inter Fallback", -apple-system, sans-serif` (Weight: 400) | **PASS** |

---

## 4. Screenshot Evidence Gallery

Telah disimpan secara kanonikal pada direktori `docs/evidence/UI-03/` (dan disinkronkan ke `docs/phases/screenshots/`):

### 4.1. Dashboard Guru (`dashboard-guru.png`)
Menampilkan Hero Greeting **"Halo, Wardah Ulfah, S.Pd!"** dalam balutan font **Space Mono** yang kokoh, berwibawa, dan kontras dengan deskripsi subjudul berfont **Inter**. Seluruh card dashboard, widget pengumuman, dan ribbon aksi cepat tersaji harmonis.

Path: [docs/evidence/UI-03/dashboard-guru.png](file:///c:/laragon/www/Ruang-Pintar/docs/evidence/UI-03/dashboard-guru.png)

### 4.2. Wizard Onboarding (`wizard-onboarding.png`)
Menampilkan modal panduan orientasi guru dengan judul tahapan dalam **Space Mono**, serta checklist mata pelajaran, toggle switch, deskripsi bantuan, dan tombol aksi "Simpan dan lanjutkan" dalam **Inter**.

Path: [docs/evidence/UI-03/wizard-onboarding.png](file:///c:/laragon/www/Ruang-Pintar/docs/evidence/UI-03/wizard-onboarding.png)

### 4.3. Sidebar Navigation (`sidebar.png`)
Menampilkan bilah navigasi kiri Academic Blue yang jernih tanpa blur, dengan 12 menu navigasi kerja guru (Dashboard, Kelas Saya, Data Siswa, Mata Pelajaran, Jadwal Mengajar, Log KBM, Kalender Akademik, Rekap Presensi, Buku Nilai, CBT Ujian Online, Asisten AI Guru, Pusat Bantuan) menggunakan font **Inter**.

Path: [docs/evidence/UI-03/sidebar.png](file:///c:/laragon/www/Ruang-Pintar/docs/evidence/UI-03/sidebar.png)

### 4.4. Card Statistik KPI (`card-statistik.png`)
Menampilkan 5 pilar metrik utama guru (Total Kelas: `1 Rombel`, Siswa Workspace: `3`, Beban KBM: `0 JP`, Koreksi Tugas: `0`, CBT Aktif: `0`) di mana angka metrik tampil menonjol dalam **Space Mono**, sedangkan label kategori dan catatan kaki tampil presisi dalam **Inter**.

Path: [docs/evidence/UI-03/card-statistik.png](file:///c:/laragon/www/Ruang-Pintar/docs/evidence/UI-03/card-statistik.png)

### 4.5. Form Input (`form-input.png`)
Menampilkan dialog "Tambah Kelas Manual" yang memuat input teks nama rombel, dropdown pilihan tingkat fase, input mata pelajaran, instruksi format data siswa, tombol batal, dan CTA aksi utama menggunakan font **Inter**.

Path: [docs/evidence/UI-03/form-input.png](file:///c:/laragon/www/Ruang-Pintar/docs/evidence/UI-03/form-input.png)

---

## 5. Quality Gate Verification

Semua gerbang pengujian berhasil dilewati dengan hasil 100% hijau:

### 5.1. TypeScript Compilation
```bash
npm run typecheck
# Result: 0 errors (tsc --noEmit passed clean)
```

### 5.2. ESLint
```bash
npm run lint
# Result: 0 errors (4 pre-existing CBT <img> warnings preserved)
```

### 5.3. Vitest Regression Suite
```bash
npx vitest run src/test/shell/teacher-workspace-typography.test.tsx
# ✓ Teacher Workspace Typography System (Stage UI-03) (5 tests passed)

npx vitest run src/test/shell/academic-shell.test.tsx
# ✓ AcademicShell Component (Phase 05) (5 tests passed)
```

---

## 6. Domain Invariants & Tenant Safety Check

1. **Student ≠ Enrollment ≠ Rombel Placement:** Dipertahankan utuh; tidak ada perubahan skema data siswa atau penempatan rombel.
2. **Teacher ≠ Subject ≠ Teaching Assignment:** Data penugasan dan relasi guru-mapel tetap mengacu pada tabel kanonikal `PenugasanMengajar`.
3. **Tenant Isolation:** Perubahan murni berbasis token styling dan presentation guard server-side. Tidak ada bocoran context tenant; selektor `teacher-workspace` murni bergantung pada sesi aktor terautentikasi.
4. **Non-Teacher Route Safety:** Rute landing, otentikasi login/register, portal murid, dan portal wali murid tidak terinjeksi class `teacher-workspace` dan tetap menggunakan standar tipografi platform awal.

---

## 7. Conclusion & Human Review Sign-Off

Standarisasi **TYPOGRAPHY STAGE UI-03** telah diselesaikan secara tuntas, terverifikasi melalui data komputasi CSS engine dan screenshot visual nyata pada akun guru Ibu Wardah Ulfah, S.Pd.

Status saat ini: **READY FOR HUMAN REVIEW**.
