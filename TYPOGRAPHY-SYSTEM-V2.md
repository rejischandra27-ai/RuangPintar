# TYPOGRAPHY SYSTEM V2 — TEACHER WORKSPACE
## Ruang Pintar — Academic Glass UI Typography Standard (Stage UI-03)

| Field | Nilai |
| --- | --- |
| **Status** | `APPROVED & LOCKED` |
| **Stage** | `STAGE UI-03` |
| **Scope** | Teacher Workspace Only |
| **Identity Font** | `Space Mono` (Google Fonts via Next.js Font Optimization) |
| **Utility Font** | `Inter` (Google Fonts via Next.js Font Optimization) |
| **Base Non-Teacher Font** | `Poppins` (Untouched for Landing, Auth, Student, Guardian) |
| **Enforcement Mechanism** | Design Tokens (`--font-teacher-identity`, `--font-teacher-utility`) via `html.teacher-workspace` |
| **Prohibited Fonts** | `Monorama`, `Andale Mono`, generic/uncontrolled monospaced fonts |

---

## 1. Executive Summary & Design Vision

Standarisasi **Typography System V2** dirancang khusus untuk memulihkan kejelasan visual, hierarki akademik yang berwibawa, dan kenyamanan keterbacaan pada seluruh ekosistem **Teacher Workspace**.

Mengacu pada prinsip **Academic Glass UI**, tipografi guru dipisahkan secara tegas menjadi dua pilar:
1. **Space Mono (Academic Teacher Identity Font):** Memberikan karakter akademik yang kuat, presisi, dan berbasis data ilmiah untuk judul utama, kartu ringkasan, angka statistik, dan metrik kinerja guru.
2. **Inter (Interface & Utility Font):** Memberikan keterbacaan optimal (*high legibility*) tanpa distorsi visual pada elemen antarmuka kerja harian guru seperti formulir, tabel nilai, navigasi sidebar, tombol, dialog modal, dan teks konten panjang.

---

## 2. Font System Mapping Matrix

Berikut adalah pemetaan kanonikal elemen visual terhadap sistem font:

| Kategori Elemen | Target Font | Implementasi Token | Rationale & Keterangan |
| --- | --- | --- | --- |
| **Hero Greeting** | **Space Mono** | `var(--font-teacher-identity)` | Sapaan personal berwibawa guru (Contoh: *"Halo, Wardah Ulfah, S.Pd!"*). |
| **Judul Card Dashboard** | **Space Mono** | `var(--font-teacher-identity)` | Menegaskan pemisah blok kerja (Contoh: *Ketuntasan Penilaian*, *Rekap Presensi Rombel*). |
| **Judul Widget** | **Space Mono** | `var(--font-teacher-identity)` | Header modul ringkasan (Contoh: *Jadwal Mengajar*, *Agenda & Pengumuman*). |
| **Statistik Utama** | **Space Mono** | `var(--font-teacher-identity)` | Angka agregat beban ajar, kehadiran, dan skor kelas. |
| **Angka KPI** | **Space Mono** | `var(--font-teacher-identity)` | Angka metrik di stat cards (Contoh: *1 Rombel*, *3 Siswa*, *0 JP*, *0 Koreksi*). |
| **Empty State Headline** | **Space Mono** | `var(--font-teacher-identity)` | Judul pemberitahuan saat belum ada aktivitas (Contoh: *Belum Ada Penilaian Terbit*). |
| **Section Heading** | **Space Mono** | `var(--font-teacher-identity)` | Sub-bagian fitur di dalam halaman workspace (`h1` s.d. `h6`). |
| **Sidebar Navigation** | **Inter** | `var(--font-teacher-utility)` | Navigasi menu utama (`aside`, menu items, labels) agar nyaman dipindai mata. |
| **Form Input** | **Inter** | `var(--font-teacher-utility)` | Kotak input teks, angka, pencarian, dan area pengisian data. |
| **Label Form** | **Inter** | `var(--font-teacher-utility)` | Label keterangan field formulir (Contoh: *Nama Rombel / Kelas*, *Mata Pelajaran*). |
| **Button / CTAs** | **Inter** | `var(--font-teacher-utility)` | Tombol aksi primer, sekunder, dan navigasi alur (Contoh: *Simpan dan lanjutkan*, *Batal*). |
| **Table** | **Inter** | `var(--font-teacher-utility)` | Header kolom (`th`), baris data (`td`), dan sel rekap absensi / buku nilai. |
| **Dropdown & Select** | **Inter** | `var(--font-teacher-utility)` | Menu pilihan dropdown rombel, semester, dan opsi pilihan (`select`, `role="menu"`). |
| **Tooltip** | **Inter** | `var(--font-teacher-utility)` | Penjelasan bantuan melayang (`role="tooltip"`). |
| **Modal Content** | **Inter** | `var(--font-teacher-utility)` | Deskripsi, instruksi langkah, dan daftar opsi pada pop-up dialog. |
| **Wizard Content** | **Inter** | `var(--font-teacher-utility)` | Seluruh instruksi preferensi peran, step wizard onboarding, dan checklist mapel. |
| **Deskripsi Card** | **Inter** | `var(--font-teacher-utility)` | Teks penjelasan di bawah judul card dashboard (`p`, `.card-description`). |
| **Informasi Sekunder** | **Inter** | `var(--font-teacher-utility)` | Timestamp, catatan kaki, badge status non-KPI, dan teks bantuan kecil. |

---

## 3. Strict Prohibitions (Banned Elements)

Sesuai arahan penguncian desain Stage UI-03, elemen berikut **DILARANG KERAS** digunakan di seluruh Teacher Workspace:

- ❌ **Monorama:** Seluruh deklarasi `@font-face` dan referensi `Monorama` telah dihapus total dari CSS.
- ❌ **Andale Mono:** Tidak boleh lagi digunakan sebagai font monospace default atau fallback utama pada body/controls.
- ❌ **Font Monospace Lain:** Menghindari font monospace pihak ketiga yang tidak berizin atau inkonsisten lintas sistem operasi (`Courier`, `Consolas`, dll. sebagai font utama).
- ❌ **Campuran Font Tak Terkontrol:** Dilarang mencampur font secara *ad-hoc* per komponen melalui hardcoded `font-family` inline atau utility acak.
- ❌ **Emoji Literal pada Judul/Tombol:** Dilarang meletakkan emoji dekoratif klise (🚀, 🔥, 💡) di judul atau tombol workspace guru.

---

## 4. Scope & Boundaries (Area Kerja & Area Terlarang)

### In-Scope (Teacher Workspace Only)
Sistem tipografi V2 aktif secara dinamis saat peran terautentikasi adalah `TEACHER` dan berada pada route berikut:
1. **Dashboard Guru** (`/dashboard`)
2. **Kelas Saya** (`/kelas-saya` & sub-routes)
3. **Data Siswa** (`/data-siswa` & sub-routes)
4. **Jadwal Mengajar** (`/jadwal-saya`)
5. **Log Sesi KBM** (`/sesi-pembelajaran`)
6. **Kalender Akademik** (`/kalender-akademik`)
7. **Rekap Presensi** (`/presensi-kelas`)
8. **Buku Nilai & Rapor** (`/penilaian`)
9. **CBT Ujian Guru** (`/cbt-ujian`)
10. **Asisten AI Guru** (`/asisten-ai`)
11. **Onboarding Wizard** (`/onboarding` & modal komponen cockpit)
12. **Supervisi Pimpinan/Wali Kelas** (`/wali-kelas`, `/guru-pengajaran`, `/pimpinan` bagi profil guru)

### Out-of-Scope (DO NOT TOUCH)
Area berikut **TIDAK TERPENGARUH** dan tetap mempertahankan font dasar platform (`Poppins` / sistem default):
- 🛑 **Landing Page** (`/`)
- 🛑 **Login** (`/login`)
- 🛑 **Registrasi** (`/register`)
- 🛑 **Guardian Portal** (`/guardian/*`)
- 🛑 **Student Portal** (`/student/*`)
- 🛑 **Public Marketing Pages** (`/panduan`, `/struktur-akademik`, dll.)

---

## 5. Technical Implementation & Design Tokens

### 5.1. Google Fonts Optimization (`src/app/layout.tsx`)
Fonts di-load secara efisien menggunakan `next/font/google` dengan `display: "swap"` dan subsets `latin`:

```tsx
import { Inter, Poppins, Space_Mono } from "next/font/google";

const poppins = Poppins({
  weight: ["400", "500", "600", "700", "800"],
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const spaceMono = Space_Mono({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});
```

### 5.2. Design Tokens di Global Stylesheet (`src/app/globals.css`)

```css
:root {
  /* Academic Typography Tokens (Stage UI-03) */
  --font-teacher-identity: var(--font-mono), "Space Mono", monospace;
  --font-teacher-utility: var(--font-inter), "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}

@theme {
  --font-sans: var(--font-sans), "Poppins", "Segoe UI", -apple-system, BlinkMacSystemFont, sans-serif;
  --font-mono: var(--font-mono), "Space Mono", "SFMono-Regular", monospace;
  --font-inter: var(--font-inter), "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  --font-space-mono: var(--font-mono), "Space Mono", monospace;
  --font-teacher-identity: var(--font-mono), "Space Mono", monospace;
  --font-teacher-utility: var(--font-inter), "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}
```

### 5.3. Dynamic Scoping via `AcademicShell`
`src/shared/components/shell/academic-shell.tsx` mengecek `user.peran_dasar === "TEACHER"` dan mencocokkan route aktif. Bila valid, class `teacher-workspace` disematkan ke `document.documentElement`, dan dibersihkan secara otomatis saat berganti rute/unmount.

---

## 6. Verification & Automated Quality Evidence

- **Unit & Integration Test:** `src/test/shell/teacher-workspace-typography.test.tsx` (5/5 PASS) dan `src/test/shell/academic-shell.test.tsx` (5/5 PASS).
- **TypeScript Gate:** `npm run typecheck` (0 errors).
- **Lint Gate:** `npm run lint` (0 errors).
- **Visual Capture Gate:** Terverifikasi menggunakan browser testing Playwright headless engine (1440x900) dengan computed style matching `Space Mono` dan `Inter`.
