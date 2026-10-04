# IMPLEMENTATION PLAN — KELAS SAYA UX REFACTOR
## Professional Teacher Workspace Redesign

| Metadata | Keterangan |
| --- | --- |
| **Spec Reference** | `docs/specs/active/kelas-saya-ux-refactor.md` |
| **Target Files** | `src/modules/learning/presentation/teacher-classes-view.tsx`<br>`src/app/kelas-saya/page.tsx` |
| **Quality Gate Target** | Typecheck 0 errors, Tests 100% PASS, Build 100% PASS |
| **Status** | `READY FOR HUMAN REVIEW` |

---

## Task Breakdown

### Task 1: Audit Alignment & User Approval Gate (SAAT INI)
- Sajikan laporan audit mendalam dan perbandingan Current State vs Target Architecture kepada Human.
- Dapatkan konfirmasi atau penyesuaian sebelum mengeksekusi modifikasi kode.

### Task 2: Pembersihan Visual Noise & Dekonstruksi Nested Containers
- Hapus Hero Banner raksasa (termasuk maskot kartun 3D dan greeting panjang yang memakan 400px pertama viewport).
- Hapus 4 Kartu KPI duplikat (Rombel Diajar, Beban KBM, Siswa Binaan, Lingkup Materi).
- Hapus tab redundan "Semua Penugasan" vs "Per Rombel".
- Hilangkan pembungkusan card bertingkat (card dalam card) dan rounded berlebihan (`rounded-[28px]`, `rounded-[24px]`).

### Task 3: Pembangunan Unified Workspace Toolbar
- Buat toolbar 1 baris yang menyatukan:
  1. Input Pencarian terintegrasi dengan shortcut/focus state ringkas.
  2. Tab Filter Kontekstual yang bermakna nyata:
     - `Semua Kelas`
     - `Jadwal Hari Ini` (Highlight kelas yang sedang/akan berlangsung hari ini)
     - `Belum Ada Jadwal` (Hanya muncul bila ada rombel yang jamnya belum diatur)
  3. Filter Dropdown Tingkat (X, XI, XII) & Guru (khusus mode supervisi admin).
  4. View Mode Segmented Control (`Grid` vs `Tabel`).
  5. Secondary Actions Menu (Dropdown `...` atau tombol subtle untuk Tambah Kelas Manual & Foto Absen AI).

### Task 4: Rekonstruksi Flat Enterprise Class Cards & Compact Table
- Bangun kartu kelas baru terinspirasi dari Linear/Stripe/Vercel:
  - Flat surface, border 1px subtle (`border-slate-200 dark:border-slate-800`), `rounded-xl`.
  - Judul tegas: Nama Kelas (`X RPL 1`) + Badge Kontekstual Hari Ini.
  - Subtitle bersih: Nama Mata Pelajaran (`Pemrograman Web`) & Kode.
  - Metadata minimal: Total Siswa, JP per minggu, Ruangan.
  - Action footer seimbang: Tombol primer `Masuk Kelas` + Tombol `Presensi` + Menu elipsis `...` untuk kelola rombel (khusus guru mandiri/owner).
- Rapikan tampilan Tabel Ringkas dengan kolom sejajar dan tipografi yang konsisten.

### Task 5: Integrasi Motion System
- Tambahkan animasi spring hover `whileHover={{ y: -2 }}` pada kartu kelas.
- Tambahkan smooth sliding indicator (`layoutId="activeFilterPill"`) pada bilah filter kontekstual.
- Tambahkan `<AnimatePresence mode="wait">` untuk transisi halus antar view mode (Grid ↔ Tabel) dan filter.

### Task 6: Verifikasi Quality Gate
- `npm run typecheck`
- `npx vitest run src/test/learning/learning-views.test.tsx`
- `npm run build`
