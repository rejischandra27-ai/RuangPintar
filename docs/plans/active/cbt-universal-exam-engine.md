# PLAN: Implementasi CBT Universal Exam Engine & School Assessment System
## Roadmap 5 Tahap: Dari Bank Soal Cerdas Menuju Live Proctor Cockpit

| Metadata | Nilai |
| --- | --- |
| **Fitur** | CBT Universal Exam Engine (M14) |
| **Status** | `active` (In Progress) |
| **Tahap Aktif** | **TAHAP 1: Bank Soal & Editor Soal Multi-Format** |
| **Verifikasi** | Vitest suite, TypeScript typecheck, Next.js build |

---

## 1. Pembagian Tahap Kerja & Review Gate

```text
┌────────────────────────────────────────────────────────┐
│ TAHAP 1: Bank Soal & Editor Soal Multi-Format          │ <── [TAHAP INI]
│ (Gambar, KaTeX Math, Arab RTL, Audio Listening, dll)   │
├────────────────────────────────────────────────────────┤
│ GATE REVIEW 1: Demo Pembuatan Soal & UI Editor Guru    │
├────────────────────────────────────────────────────────┤
│ TAHAP 2: Wizard Konfigurasi & Dual-Mode Scheduling     │
│ (Formatif Harian vs Sumatif Ketat, Model Waktu Server) │
├────────────────────────────────────────────────────────┤
│ GATE REVIEW 2: Uji Penjadwalan & Konfigurasi Token     │
├────────────────────────────────────────────────────────┤
│ TAHAP 3: CBT Player Engine Upgrade (Layar Siswa)       │
│ (Render Formula KaTeX, RTL Arab, Anti-Cheat Watchdog)  │
├────────────────────────────────────────────────────────┤
│ GATE REVIEW 3: Uji Pengerjaan Siswa & Anti-Cheat Lock  │
├────────────────────────────────────────────────────────┤
│ TAHAP 4: Live Proctor Cockpit (Layar Pengawas Ujian)   │
│ (Realtime Grid, Buka Kunci Siswa, Reset Sesi, Force)   │
├────────────────────────────────────────────────────────┤
│ GATE REVIEW 4: Simulasi Pengawasan Ujian Realtime      │
├────────────────────────────────────────────────────────┤
│ TAHAP 5: Autograding, Evaluasi Esai & Sinkron Rapor    │
│ (Analitik Butir Soal P & D, Ekspor Buku Nilai Resmi)   │
└────────────────────────────────────────────────────────┘
```

---

## 2. Rincian Pekerjaan Tahap 1 (Saat Ini Sedang Dikerjakan)

### 2.1. Dependensi & Komponen Pendukung
- Instalasi dependensi `katex` (ringan, performa tinggi untuk formula matematika) dan tipe TypeScript-nya.
- Penambahan komponen `MathRenderer` untuk merender formula LaTeX inline (`$formula$`) maupun block (`$$formula$$`).
- Penambahan komponen `AudioStimulusPlayer` dengan batas pemutaran (*play counter limit*) dan proteksi unduhan langsung.
- Penambahan komponen `ImageStimulus` dengan dialog zoom lightbox.
- Penambahan styling font khusus untuk teks Arab (`dir="rtl"`).

### 2.2. Pembaruan Editor Soal di `QuestionBankModal` & Komponen Terkait
- Desain ulang editor butir soal di [`src/modules/cbt/presentation/question-bank-modal.tsx`](file:///C:/laragon/www/Ruang-Pintar/src/modules/cbt/presentation/question-bank-modal.tsx):
  - Dukungan multi-tipe soal: Pilihan Ganda, Pilihan Ganda Kompleks (Multi-Jawaban), Benar/Salah, Menjodohkan, Isian Singkat, dan Esai.
  - Toolbar praktis:
    - Tombol input Formula Matematika (Pecahan, Akar, Pangkat, Simbol Yunani, Integral).
    - Tombol Teks Arab (RTL Toggle).
    - Tombol Unggah / Tempel Gambar Stimulus (Paste dari Clipboard / Upload).
    - Tombol Unggah Audio Listening (dengan input batas putar).
  - Bobot skor mandiri per butir soal.

### 2.3. Verifikasi & Pengujian
- Unit test untuk parsing formula KaTeX dan validasi payload butir soal di `src/test/cbt/`.
- Validasi typecheck: `npm run typecheck` $\rightarrow$ 0 error.
- Validasi lint: `npm run lint` $\rightarrow$ 0 error.
- Validasi build: `npm run build` $\rightarrow$ 100% PASS.

---

## 3. Human Review Checkpoint (Gate 1)
Setelah Tahap 1 selesai dan seluruh Quality Gate lolos, AI berhenti dan melaporkan:
1. Demo tampilan antarmuka Editor Soal Guru (Gambar, Matematika, Arab, Audio).
2. Bukti pengujian data dan penyimpanan ke database.
3. Permintaan review Human sebelum melangkah ke **Tahap 2 (Wizard Penjadwalan & Dual-Mode Ujian)**.
