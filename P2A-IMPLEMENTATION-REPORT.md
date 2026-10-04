# P2A - Implementation Report

**Status:** PARTIAL - READY FOR HUMAN ARCHITECT REVIEW

## Implemented

- Form Guru Mandiri tidak lagi meminta `Nama Sekolah`.
- Input username dan nomor telepon juga dihapus dari jalur Guru Mandiri. Username tetap dibuat otomatis dari email di server.
- Tenant baru selalu dibuat dengan nama `Ruang Mengajar Mandiri - [Nama Guru]`.
- Jalur Wali Murid dan pilihan sekolahnya tidak diubah.
- Kontrak schema, DTO, server action, service, dan regression fixture diselaraskan.
- Rekap Presensi mendapat filter Hari, Kelas, dan Mata Pelajaran.

## P2A Items Not Yet Implemented

- Google OIDC login/linking belum tersedia di baseline repository ini.
- Provider identity dan persistensi `avatar_id` belum tersedia di schema atau migration.
- Avatar picker masih menggunakan `sessionStorage`; belum dapat dianggap sebagai persistensi server.

Item tersebut tetap di luar perubahan parsial ini agar tidak membuat kontrak auth, tenant, atau migration baru tanpa dependency dan quality gate yang dapat dijalankan.

## Data and Authorization Check

- Registrasi tetap menggunakan provisioning atomik owner/trial yang sudah ada.
- Nama tenant dibentuk server-side dari nama guru.
- Tidak ada perubahan pada school discovery, join school, approval membership, atau deduplikasi sekolah.
- Tenant aktif dan session tetap dibuat oleh service yang sama.

## Verification

- Workspace diagnostics: tidak ada error pada file registrasi dan filter presensi yang diubah.
- `npm test` belum dapat dijalankan karena `npm` tidak tersedia pada PATH PowerShell sesi ini.
- Typecheck lulus, format check lulus, dan lint lulus tanpa error (4 warning existing di modul CBT).
- Full suite pertama menemukan satu assertion lama yang masih mengharapkan Nama Sekolah; assertion sudah diperbarui dan test onboarding terkait lulus 3/3. Rerun full suite dihentikan sebelum exit final karena durasi suite, sehingga full-suite pass belum diklaim.
- Production build, OAuth callback check, dan screenshot QA belum memiliki bukti final pada checkpoint ini.

## Changed Files

- `src/app/register/register-form.tsx`
- `src/app/actions/smart-onboarding-actions.ts`
- `src/modules/ai-assistant/domain/ai-validation.ts`
- `src/modules/ai-assistant/domain/ai-types.ts`
- `src/modules/ai-assistant/application/smart-onboarding-service.ts`
- `src/modules/ai-assistant/presentation/register-view.tsx`
- `src/modules/attendance/presentation/class-attendance-overview.tsx`
- Related onboarding regression tests
- `docs/specs/active/P2A-SPEC.md`
- `docs/plans/active/P2A-PLAN.md`

## Human Review Gate

The registration revision and dashboard investigations are ready for review. P2A is not approved as fully implemented until Google OIDC, avatar persistence, and the required quality gates are completed.
