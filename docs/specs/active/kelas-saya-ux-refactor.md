# SPESIFIKASI UX REFACTOR — KELAS SAYA (/kelas-saya)
## Ruang Pintar — Professional Teacher Workspace Redesign

| Metadata | Keterangan |
| --- | --- |
| **Halaman Target** | `/kelas-saya` (`src/app/kelas-saya/page.tsx` & `teacher-classes-view.tsx`) |
| **Persona Utama** | Guru Pengampu (`TEACHER`) & Guru Mandiri (`is_tenant_owner`) |
| **Persona Sekunder** | Staf Akademik / Super Admin (`isAdmin` - Mode Supervisi) |
| **Filosofi Desain** | Calm, Clean, Minimal, Enterprise-Grade (Inspirasi: Linear, Notion, Stripe, GitHub Projects) |
| **Status Dokumen** | `PROPOSED FOR HUMAN REVIEW` |

---

# 1. UX AUDIT & ROOT CAUSE ANALYSIS

## 1.1. Evaluasi Brutal 6 Elemen Eksisting

### 1. Tab "Semua Penugasan"
- **Masalah:** Nama teknis database (`penugasan_mengajar`), bukan bahasa mental guru. Bagi guru, mereka mengajar "Kelas", bukan "Penugasan".
- **Pertanyaan UX:** Mengapa user harus memilih ini? Jawabannya: Tidak perlu. Ini adalah default state yang seharusnya tidak memerlukan tab terpisah.

### 2. Tab "Per Rombel"
- **Masalah:** Redundan dan memicu *circular UX flow*.
- **Bukti Alur:**
  1. Guru klik tab "Per Rombel".
  2. Guru melihat kartu rombel yang hanya menampilkan daftar nama mapel.
  3. Guru mengklik tombol "Buka Kelas Rombel".
  4. Yang terjadi: sistem hanya mem-filter dan melempar user KEMBALI ke tab "Semua Penugasan"!
- **Kesimpulan:** Tidak ada nilai tambah nyata. Membuang klik, membingungkan guru, dan memecah data yang seharusnya langsung tersaji.

### 3. Kotak Pencarian (Search)
- **Masalah:** Terisolasi di dalam card/container terpisah (`rounded-[24px]` dengan border dan padding besar) yang memakan ruang vertikal penuh.
- **Kesimpulan:** Search harus menjadi bagian integral dari **Unified Workspace Toolbar** (1 baris bersama filter dan view toggle), bukan sebuah kontainer raksasa tersendiri.

### 4. Switch Tampilan (Grid vs Tabel)
- **Masalah:** Ditaruh di pojok kanan kontainer Tab, terpisah 150px dari kontainer Search dan Filter di bawahnya.
- **Kesimpulan:** Pengaturan tampilan (view toggle) harus bersanding tepat di samping filter dan search di satu baris toolbar.

### 5. Tombol "Tambah Kelas Manual"
- **Masalah:** Diduplikasi di 2 tempat sekaligus (di dalam Hero Banner raksasa dan di dalam Toolbar).
- **Pertanyaan Kritis:** Apakah guru menambah kelas setiap hari? **TIDAK.** Penambahan kelas hanya terjadi di awal semester (1-2 kali setahun).
- **Kesimpulan:** Menaruh tombol primer besar di tengah layar harian adalah *visual pollution*. Tombol ini wajib dipindahkan ke aksi sekunder (*secondary action dropdown* atau tombol clean di sudut header).

### 6. Tombol "Foto Absen AI"
- **Masalah:** Juga diduplikasi di Hero Banner dan Toolbar.
- **Pertanyaan Kritis:** Guru yang membuka `/kelas-saya` ingin melihat direktori kelasnya. Jika guru ingin absen, mereka masuk ke sesi kelas atau presensi kilat.
- **Kesimpulan:** Pindahkan ke menu aksi impor/utilitas atau akses cepat di baris toolbar tanpa mendominasi visual direktori kelas.

---

## 1.2. Masalah Arsitektur Visual Lainnya

1. **Cognitive Overload & Scroll Fatigue:**
   - 400px–500px pertama dari layar dihabiskan untuk:
     - Hero banner raksasa dengan maskot kartun 3D astronot.
     - 4 kartu KPI statistik (Rombel Diajar, Beban KBM, Siswa Binaan, Lingkup Materi).
   - **Dampak Fatal:** Guru harus scroll ke bawah layar hanya untuk melihat kelas pertama mereka! Padahal di Dashboard utama (`/dashboard`), ke-4 statistik ini sudah terpampang lengkap.
2. **Card-in-Card Syndrome (Nesting Berlebihan):**
   - Halaman dibungkus dalam Card luar -> Toolbar dibungkus Card -> Kartu kelas dibungkus Card -> Di dalam kartu kelas ada lagi Card abu-abu untuk jadwal, Card untuk wali kelas, dan Card footer.
   - Terlalu banyak garis border (3-4 lapis) yang membebani visual (*heavy visual noise*).
3. **Hierarchy Hierarchy Failure:**
   - Mata pengguna tidak tahu harus melihat ke mana dalam 3 detik pertama karena ada 7 badge berwarna-warni sekaligus dalam satu kartu (kode biru, tingkat abu-abu, status hijau, JP ungu/kuning, tombol kuning, tombol putih, tombol biru).

---

# 2. DESIGN PROPOSAL: ENTERPRISE TEACHER WORKSPACE

## 2.1. Aturan Hapus (Elimination List)
- ❌ **HAPUS:** Hero Banner raksasa dan ilustrasi maskot 3D di halaman kerja ini.
- ❌ **HAPUS:** 4 Kartu KPI statistik duplikat.
- ❌ **HAPUS:** Tab biner "Semua Penugasan" vs "Per Rombel".
- ❌ **HAPUS:** 3 Kontainer card bersarang yang memisahkan Tab, Search, dan Filter Chips.
- ❌ **HAPUS:** Border ganda, rounded-3xl berlebihan, dan shadow bertumpuk.
- ❌ **HAPUS:** Tombol masif "Tambah Kelas" dan "Foto Absen AI" dari tengah alur kerja.

## 2.2. Aturan Terapkan (Adoption List)
- ✅ **GUNAKAN:** **Workspace Header Ringkas (Minimalist Header):**
  - Judul: `Kelas Saya` (font bold, kontras tegas).
  - Subtitle: `4 Kelas Aktif • Semester Ganjil 2026/2027` (slate-500, font-medium, 13px).
  - Aksi Header: Tombol sekunder `+ Tambah Kelas` & menu utilitas `Titik Tiga (...)` untuk Impor/AI.
- ✅ **GUNAKAN:** **Unified Workspace Toolbar (Satu Baris Tunggal ala Linear/Stripe):**
  - `[ 🔍 Cari kelas atau mata pelajaran... ]` (Lebar fleksibel dengan focus ring halus).
  - Filter Tabs Kontekstual:
    - `[ Semua Kelas (4) ]`
    - `[ Jadwal Hari Ini (2) ]` *(Memberikan nilai nyata seketika: guru langsung tahu kelas apa yang harus diajar hari ini!)*
    - `[ Belum Terjadwal (1) ]` *(Jika ada kelas yang jamnya belum ditentukan).*
  - `[ Filter Tingkat: Semua / X / XI / XII ]` (Dropdown kompak atau clean chips).
  - `[ Toggle: Grid ⊞ / Tabel ☰ ]` (Segmented control minimalis).
- ✅ **GUNAKAN:** **Flat Enterprise Class Cards:**
  - Card flat dengan border 1px sangat halus (`border-slate-200 dark:border-slate-800`).
  - Radius 12px (`rounded-xl`), background solid (`bg-white dark:bg-slate-900`).
  - **Hirarki Informasi Kartu:**
    1. **Header Baris 1:** Nama Kelas (`X RPL 1`) sebagai judul utama yang tegas, disandingkan dengan Badge Status Hari Ini (misal: `● 07.15 - 09.30 WIB` jika hari ini, atau netral jika hari lain).
    2. **Header Baris 2:** Nama Mata Pelajaran (`Pemrograman Web & Perangkat Bergerak`) + Kode (`PWP-X`).
    3. **Metadata Baris 3:** Total Siswa (`36 Siswa`) • Beban Jam (`4 JP/minggu`) • Ruangan (`Lab Komputer 2`).
    4. **Action Footer:**
       - Tombol Utama: `Masuk Kelas →` (Mengarah langsung ke ruang kerja kelas).
       - Tombol Ringkas: `Presensi` (Akses langsung pencatatan kehadiran).
       - Context Menu (`...`): Ubah Nama Kelas, Atur Jadwal, atau Hapus Kelas (khusus Guru Mandiri).

---

# 3. MOTION SYSTEM SPECIFICATION

Menggunakan primitif `@/shared/components/motion/motion-elements`:

1. **Card Hover & Tap Interaction:**
   - `whileHover={{ y: -2 }}` dengan transisi spring halus (`stiffness: 450, damping: 30`).
   - Tidak ada animasi kartun atau bouncy berlebihan.
2. **Unified Toolbar Active Tab Indicator:**
   - Menggunakan `layoutId="activeWorkspaceFilter"` sehingga saat berpindah filter (`Semua`, `Hari Ini`, `Belum Terjadwal`), pill latar belakang meluncur secara mulus (*smooth sliding indicator*).
3. **Search Input Focus Transition:**
   - Transisi border-color dan shadow ring dalam 150ms cubic-bezier.
4. **Card Stagger Entrance:**
   - Menggunakan `<StaggerContainer>` dan `<StaggerItem>` saat halaman pertama kali dibuka, memberikan efek masuk bertingkat yang tenang (*calm stagger*).
5. **View Mode Switching (Grid ↔ Tabel):**
   - Transisi fade-in lembut dengan `<AnimatePresence mode="wait">` tanpa layout jumping.

---

# 4. IMPLEMENTATION ROADMAP

1. **Fase 1 (Review & Approval):** Konfirmasi UX Audit & Arsitektur Redesign dengan pengguna.
2. **Fase 2 (Refactor Struktur `teacher-classes-view.tsx`):**
   - Hapus Hero Banner raksasa & KPI cards duplikat.
   - Satukan bilah tab, search, filter, dan view mode ke dalam `UnifiedWorkspaceToolbar`.
3. **Fase 3 (Redesign Flat Cards & Table):**
   - Implementasikan Flat Enterprise Card dengan hirarki tipografi Linear/Stripe.
   - Rapikan Compact Table View dengan kolom presisi.
4. **Fase 4 (Motion & Accessibility Tuning):**
   - Terapkan spring hover, sliding tab indicator, dan responsive touch targets.
5. **Fase 5 (Quality Gate Verification):**
   - `npm run typecheck`, `npm run test`, `npm run build`.
