# P1 — Data Kelas & Statistik Dashboard

## Status

`APPROVED — PHASE P1 CLOSED BY HUMAN ARCHITECT`

## Tujuan

Guru Mandiri sebagai owner tenant dapat mengelola kelas di workspace aktif dan melihat statistik yang mencerminkan data tenant, tanpa memperluas hak guru reguler atau menghapus riwayat akademik.

## Acceptance Criteria

- Owner tenant dapat mengganti nama kelas miliknya dan perubahan hanya memengaruhi sekolah aktif.
- Owner tenant dapat menghapus kelas dari workspace. Data akademik yang sudah terhubung dipertahankan melalui pengarsipan rombel dan assignment, bukan hard delete.
- Guru reguler tidak mendapat hak update/delete rombel hanya karena berperan sebagai TEACHER.
- Pembuatan kelas mandiri yang menyertakan mapel menciptakan `Rombel` dan `PenugasanMengajar` dalam satu transaksi; kegagalan bagian akhir membatalkan seluruh pembuatan.
- Owner tidak dapat membuat rombel melalui form struktur umum yang tidak meminta mapel; jalur tersebut diarahkan ke flow Kelas Saya yang atomik.
- Statistik owner menggunakan data siswa aktif dan rombel aktif milik `sekolah_id` tenant aktif, bukan hanya rombel yang kebetulan memiliki assignment aktif.
- Statistik pembelajaran tetap dihitung dari assignment aktif guru pada tenant yang sama.
- UI kartu kelas menyediakan aksi “Ubah Nama Kelas” dan “Hapus Kelas” khusus owner, dengan konfirmasi dan feedback hasil.
- Typecheck, lint, format check, test suite, dan production build lulus.

## Batasan

- Tidak mengerjakan P2, Google Login, School Discovery, atau onboarding baru.
- Tidak mengarang mata pelajaran untuk rombel struktur umum yang tidak membawa data mapel.
- Tidak menghapus enrollment, placement, attendance, grade, CBT, materi, atau jejak akademik yang sudah terkait.