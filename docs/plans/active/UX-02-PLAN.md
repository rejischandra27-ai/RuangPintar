# UX-02 — Teacher First Experience Redesign Plan

| Metadata | Value |
| --- | --- |
| Phase | UX-02 |
| Feature slug | `teacher-first-experience-redesign` |
| Version | 2.0 |
| Status | APPROVED — Human Architect Decision 2026-09-29; v2 implementation pending |
| Active spec | [UX-02-SPEC.md](../../specs/active/UX-02-SPEC.md) |
| Gap analysis | [UX-02.2-GAP-ANALYSIS.md](../../../UX-02.2-GAP-ANALYSIS.md) |
| Stop gate | Permintaan saat ini hanya merevisi spec/plan. Jangan mengubah kode sebelum instruksi implementasi berikutnya. |

## 1. Tahapan Implementasi

### Stage 0 — Human Architect Decision v2 (completed 2026-09-29)

- Dashboard tetap menjadi halaman utama; Teacher Onboarding tidak boleh dirender sebagai panel/checklist permanen.
- Glass Modal Wizard overlay auto-opens hanya untuk akun baru yang lifecycle onboarding-nya belum selesai.
- Wizard dapat ditutup sementara, progress disimpan server-side, dan sesi berikutnya melanjutkan checkpoint terakhir.
- Sesudah lifecycle selesai, wizard tidak muncul lagi dan dashboard production tetap bersih.
- Toggle Guru Mata Pelajaran dan Wali Kelas dipertahankan sebagai preferensi onboarding tanpa efek authorization; effective access tetap berbasis assignment resmi dan guard server-side.
- Domain decisions yang tidak bertentangan dari UX-02 v1 tetap berlaku, termasuk avatar server-readable, Rombel minimal Nama + Tingkat, serta pemisahan siswa/assignment/jadwal.
- Scope pekerjaan saat ini hanya revisi dokumen. Perubahan kode, migration, screenshot, dan deployment tidak termasuk izin pada task ini.

### Stage 1 — Contract and current-state baseline (before implementation)

- Audit ulang dirty worktree dan baca versi terbaru semua file terdampak sebelum perubahan kode.
- Catat server-authoritative eligibility: identifikasi akun baru/lifecycle first-use tanpa memakai `totalRombel === 0` atau client state sebagai pengganti.
- Tetapkan perlakuan akun legacy yang sudah ada tetapi memiliki progress incomplete; default-nya tidak memicu auto-open tanpa eligibility/migrasi yang eksplisit.
- Petakan enam checkpoint domain (`profile`, `avatar`, `roles`, `class`, `students`, `schedule`) ke langkah UI wizard; tetapkan mana mandatory dan mana opsional/defer.
- Tetapkan overall completion: checkpoint wajib complete; checkpoint opsional complete atau explicitly deferred. Deferred tetap status tersendiri, bukan data complete.
- Tetapkan close semantics: tutup hanya presentation saat ini; simpan cursor/progress; pada dashboard berikutnya lifecycle incomplete melanjutkan dari checkpoint terakhir.
- Verifikasi model progress existing per `pengguna_id + sekolah_id`, active tenant resolution, permission kelas, ownership Rombel, serta avatar persistence.
- Tulis/ubah test fail-first untuk first-use eligibility, overlay/no permanent panel, close/resume, completion, optional defer, role preference non-authorizing, dan tenant isolation.

### Stage 2 — Server-side lifecycle and resume state

- Reuse state domain yang sudah dapat diturunkan dari profil, avatar, preferensi, kelas, placement, dan jadwal.
- Audit apakah model existing cukup menyimpan eligibility, overall lifecycle completion, defer, serta last valid wizard cursor. Tambah persistence hanya untuk state yang tidak dapat diturunkan dengan andal.
- Jika diperlukan, gunakan migration additive/nullable dan unique scope pengguna + tenant; jangan rewrite migration yang sudah diterapkan atau menyimpan tenant/user identity yang dipercaya dari client.
- Implementasikan resolver/action server-side untuk snapshot, cursor update, defer, close/resume semantics, dan completion. Setiap mutasi memvalidasi sesi, active tenant, entitlement, permission, dan payload.
- Cursor hanya maju setelah aksi/checkpoint berhasil; failure/retry tidak menandai complete atau membuat data parsial.
- Pertahankan invariant akademik: preference bukan assignment; create Rombel tidak membuat mapel, roster, enrollment, placement, atau jadwal sintetis.

### Stage 3 — Modal-only dashboard integration

- Jadikan dashboard/cockpit sebagai background utama dan hapus render kartu/hub onboarding permanen.
- Mount Glass Modal Wizard secara kondisional hanya dari eligibility first-use + lifecycle incomplete yang server-authoritative.
- Tutup modal tanpa menyisakan onboarding panel; onboarding selesai menghilangkan modal pada render berikutnya dan login berikutnya.
- Saat lifecycle yang sama dilanjutkan, pulihkan cursor server-side; jangan selalu kembali ke langkah pertama.
- Pertahankan dua toggle preference independen dan jelaskan bahwa assignment resmi, bukan toggle, menentukan akses.
- Pastikan modal tidak menghalangi penggunaan dashboard atau kapabilitas lain yang telah diotorisasi; sediakan keyboard dismissal, fokus dialog yang benar, scroll containment, dan responsive behavior.
- Jangan mengubah avatar routing atau interstitial di luar kebutuhan eligibility modal tanpa bukti bahwa kontraknya memerlukan perubahan.

### Stage 4 — Legacy workflow audit and action reuse

- Audit seluruh pemanggil `TeacherFirstClassSetupModal`, event `manual-class-created`, `open-teacher-schedule-setup`, serta `TeacherOnboardingCard`.
- Hilangkan hanya trigger/presentation yang menduplikasi onboarding. Pertahankan workflow domain lain yang masih valid dan migrasikan pemanggil satu per satu bila memang terdampak.
- Pertahankan pembuatan Rombel minimal Nama + Tingkat dan pisahkan dari mapel, siswa, placement, assignment, serta jadwal.
- Gunakan workflow canonical untuk import/manual siswa dan jadwal; defer tidak boleh menciptakan data atau memberi akses.
- Jangan menghapus data lama, event handler, atau service yang masih dipakai workflow manual/AI lain tanpa audit pemanggil dan regression.

### Stage 5 — Regression, visual QA, and review

- Uji first login akun baru lokal/Google, akun lama, active tenant switch, wizard open/close/resume, reload/logout-login/perangkat lain, completion, deferred optional checkpoints, serta error/retry.
- Pastikan tidak ada checklist/panel pada dashboard saat modal tertutup atau onboarding complete; cek production rendering untuk guru yang sudah selesai.
- Verifikasi role toggles tidak mengubah base role, permission, membership, atau assignment; verifikasi akses tetap ditentukan assignment resmi.
- Jalankan regresi Rombel, siswa/enrollment/placement, import, assignment, jadwal, homeroom, Guardian, auth, entitlement, dan tenant isolation.
- Lakukan QA visual/aksesibilitas desktop dan mobile, keyboard/focus, reduced motion/transparency, screenshot modal first-use, close/resume, dan dashboard bersih sesudah completion.
- Jalankan `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm run test`, `npm run build`, `npx prisma validate`, dan `npx prisma migrate status` bila ada perubahan schema/migration.
- Setelah instruksi implementasi yang terpisah, tulis implementation report dan berhenti pada `READY FOR HUMAN REVIEW`. Jangan deploy atau pindahkan dokumen active ke done tanpa persetujuan eksplisit.

## 2. File yang Terdampak

Daftar ini adalah kandidat untuk planning, bukan izin mengedit sebelum spec+plan disetujui. Audit ulang seluruhnya setelah approval karena worktree dapat berubah.

| Surface | Candidate files | Expected change |
| --- | --- | --- |
| Local first-use routing | `src/app/register/register-form.tsx`, `src/app/onboarding/pilih-avatar/avatar-picker.tsx`, `src/app/onboarding/selesai/selesai-view.tsx` | Setelah avatar/default langsung dashboard; cegah redirect wizard berulang. |
| Google first-use routing | `src/app/api/auth/google/callback/route.ts` | Pisahkan akun baru dari Google login akun lama; first-use avatar checkpoint sesuai status profil. |
| Teacher Dashboard | `src/shared/components/dashboard/role-views/teacher-dashboard.tsx` | Tetap menjadi halaman utama; hapus panel permanen dan mount modal wizard secara kondisional berdasarkan server eligibility/completion. |
| Onboarding presentation | `src/shared/components/dashboard/cockpit/teacher-onboarding-hub.tsx`, `teacher-first-class-setup-modal.tsx`, `teacher-onboarding-card.tsx` atau komponen dialog baru sesuai konvensi | Ganti hub permanen dengan modal-only wizard; pertahankan action domain yang masih digunakan. |
| Onboarding service/action | `src/app/actions/smart-onboarding-actions.ts`, `src/modules/ai-assistant/application/smart-onboarding-service.ts` atau service akademik yang canonical | Pisahkan minimal Rombel dari mapel, roster, assignment, dan jadwal. Hindari menaruh domain akademik permanen di AI onboarding module. |
| Academic Rombel | `src/modules/academic/application/rombel-service.ts`, domain validation/types, repository/actions terkait | Validasi active year/grade/name uniqueness dan minimal create sesuai permission. |
| Teacher/homeroom | `src/modules/teacher/application/homeroom-assignment-service.ts`, `src/app/actions/teacher-actions.ts`, role authorization/navigation | Role preference tidak memberikan akses; effective features tetap berdasar assignment aktif. |
| Siswa/import | `src/app/data-siswa/page.tsx`, existing student actions/import/presentation modules | Hubungkan Import Excel, tambah manual, dan defer tanpa membuat enrollment/placement ganda. |
| Profile/avatar | `src/app/actions/profile-actions.ts`, `src/shared/infrastructure/auth/auth-service.ts`, `prisma/schema.prisma` | Hanya jika keputusan review memasukkan avatar ID persisten dan server-readable. |
| Persistence | `prisma/schema.prisma`, migration baru bila diperlukan, `src/modules/teacher/application/teacher-onboarding-service.ts` | Server-side eligibility/lifecycle completion/cursor hanya jika tidak dapat diturunkan dari state existing; progress tenant-scoped. |
| Auth / first-use eligibility | Local registration, Google callback, auth/session services hanya bila diperlukan setelah audit | Tandai atau turunkan akun baru/lifecycle secara server-authoritative; jangan mengulang first-use untuk akun lama. |
| Tests | `src/test/teacher/teacher-onboarding-hub.test.tsx`, dashboard tests, onboarding service/action tests, auth and security tests | Ganti test yang mengharapkan card + dialog; cover first-use, no-panel, dismiss/resume, completion, deferred, permission, tenant isolation. |
| Documentation | UX-02 spec/plan v2 (dokumen ini); implementation report hanya pada deliverable implementasi | Rencana sekarang; bukti tests, migration, authorization, visual QA, limitations, dan rollback nanti setelah implementasi. |

## 3. Migration Impact

- **Ekspektasi v2:** migration tidak otomatis diperlukan. Audit persistence existing terlebih dahulu; tambah field/record additive hanya jika eligibility first-use, overall lifecycle completion, atau cursor resume tidak dapat diturunkan secara andal.
- Status domain yang dapat disimpulkan (mis. avatar/assignment/jadwal/placement) tidak diduplikasi tanpa kebutuhan lifecycle/resume yang jelas.
- Progress/cursor record wajib scoped unik per pengguna + tenant aktif dan tidak boleh menjadi permission source.
- Close modal tidak menghapus progress. Completion tidak boleh bergantung pada state React/sessionStorage. Hindari duplikasi cursor bila checkpoint domain sudah mengidentifikasi next action secara deterministik.
- Avatar ID harus valid terhadap katalog; default/skip harus berupa nilai domain yang tervalidasi.
- Creator Rombel tidak menggantikan `sekolah_id`, `TahunAjaran`, atau `TingkatKelas` dan tidak memberikan hak tenant-wide.
- Migrasi yang telah diterapkan immutable. Rollback aplikasi tidak menghapus progress, avatar, rombel, assignment, enrollment, placement, siswa, atau jadwal yang telah tersimpan.
- `prisma migrate status` dan isi migration harus ditinjau sebelum deploy. Perubahan ke status done/deploy membutuhkan Human approval.

## 4. Regression Impact

### Required existing regression

- Local registration/login dan Google registration/login.
- New account avatar/default routing; existing user login tidak mengulang first-use.
- Teacher dashboard untuk owner Guru Mandiri dan Guru Sekolah formal, termasuk existing Rombel/assignment.
- `TeacherFirstClassSetupModal` pemanggil/event lain serta class manual/AI setup yang masih digunakan.
- Create Rombel, duplicate name, active academic year/grade missing, unauthorized teacher, tenant mismatch, dan transaction rollback.
- Siswa identity, enrollment, placement, import Excel, manual add, skip, and no duplicate records.
- Teaching assignment/mapel/schedule dependencies; defer schedule must not synthesize assignment or slot.
- Homeroom assignment controls all Wali Kelas data scopes: Leger, attendance, notes, and report.
- Tenant isolation on every query/action and entitlement/read-only enforcement.
- Guardian registration/join/claim and unrelated role dashboards unchanged.

### New behavior coverage

- New eligible account auto-opens the modal over the dashboard; existing/legacy account does not auto-open without explicit eligibility.
- No permanent onboarding card/panel while the modal is open or closed, and no onboarding surface after completion.
- Close dismisses only the current presentation; progress and cursor survive refresh/login/device and resume at the last valid checkpoint.
- Lifecycle completion and optional defer rules are distinct from domain status; deferred is never rendered or stored as complete.
- Role preferences persist independently and never change effective permissions or assignments.
- Rombel create action accepts only class name from UI but server resolves tenant/year/grade and enforces creator access.
- Student skip and schedule defer leave canonical academic data unchanged.
- Failure/retry does not mark steps completed or leave partial domain records.
- Dashboard remains the primary usable page at every incomplete checkpoint; closing the wizard restores normal dashboard composition.

## 5. Rollback Strategy

1. Before rollout, record deployed code version, migration status, and additive fields/tables.
2. If modal eligibility/resume has a production regression, rollback application code to the previous compatible release. Restore only the prior compatible entry behavior; do not reintroduce an unreviewed permanent dashboard panel or run destructive down-migrations.
3. Leave additive progress/avatar/creator records intact; previous code must ignore unknown nullable fields/records safely.
4. Preserve every Rombel, Siswa, Enrollment, Placement, assignment, and schedule created during the new flow. Do not delete/merge user data automatically.
5. If a legacy wizard/presentation is retired, keep canonical domain actions backward-compatible until the rollback window closes; roll back to a compatible application release before any later cleanup.
6. If incorrect role access is detected, immediately hide/deny through server-side assignment/permission checks; never rely on a client toggle to repair access.
7. Reconcile onboarding progress against canonical domain state before any repair; do not reset all users’ progress as a rollback shortcut.

## 6. Verification Commands

Run only after Human Architect approves implementation:

```bash
npm run typecheck
npm run lint
npm run format:check
npm run test
npm run build
npx prisma validate
npx prisma migrate status
```

## 7. Stop Gate

This v2 document revision does not authorize code implementation. Stop after the spec and plan are complete. Begin implementation only under a subsequent explicit task. After that implementation is authorized and completed, run the required gates, publish the implementation report and screenshots under `docs/evidence/UX-02/`, then stop at `READY FOR HUMAN REVIEW`. Do not deploy or move active documents to done without explicit approval.
