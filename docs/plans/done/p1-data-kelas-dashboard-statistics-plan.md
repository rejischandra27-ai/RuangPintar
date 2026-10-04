# P1 — Rencana Implementasi Data Kelas & Statistik Dashboard

## Status

`APPROVED — PHASE P1 CLOSED BY HUMAN ARCHITECT`

## Urutan Kerja

1. Tambahkan regression test owner dashboard yang membedakan hitungan tenant owner dari agregasi assignment guru reguler.
2. Perbaiki facade dashboard: total kelas dan siswa aktif untuk owner di-scope eksplisit dengan tenant aktif; statistik pembelajaran tetap memakai assignment guru.
3. Perbaiki partial update rombel agar field yang tidak dikirim tidak diubah menjadi `null`; batasi mutation kelas pada permission kelas dan tenant aktif.
4. Implementasikan pengarsipan rombel beserta assignment aktif dalam transaksi, menjaga foreign-key dan sejarah akademik.
5. Tambahkan aksi rename/delete yang khusus owner pada kartu `/kelas-saya`, termasuk konfirmasi dan refresh data.
6. Tolak create rombel struktur umum untuk owner di UI dan Server Action; pastikan jalur kelas mandiri yang meminta mapel tetap membuat rombel dan assignment dalam transaksi serta buktikan rollback melalui test.
7. Jalankan test terfokus, lalu seluruh quality gates yang diwajibkan.
8. Tulis `P1-IMPLEMENTATION-REPORT.md` beserta hasil gate dan checklist verifikasi manual.

## Verifikasi

- `npm run test -- src/test/teacher/teacher-facade.test.ts`
- Test akademik/learning/authorization yang disentuh.
- `npm run typecheck`
- `npm run lint`
- `npm run format:check`
- `npm run test`
- `npm run build`
- Visual check kartu kelas desktop/mobile dan screenshot evidence bila browser dapat dijalankan.

## Rollback

Revert hanya perubahan P1 setelah persetujuan Human Architect bila diperlukan. Jangan mengubah migrasi atau menghapus data tenant; operasi hapus kelas P1 mempertahankan data melalui status arsip.