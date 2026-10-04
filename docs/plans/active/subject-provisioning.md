# STAGE TO-02 — SUBJECT PROVISIONING PLAN

**Status:** IMPLEMENT / active  
**Spec:** `docs/specs/active/subject-provisioning.md`

## Implementation Sequence

1. Add a typed, code-owned jenjang template and a transaction-client provisioner using the existing `(sekolah_id, kode)` unique key. Retry must be a no-op for already-present codes.
2. Invoke the provisioner only in `SmartOnboardingService.registerTeacher()`'s new-school transaction branch.
3. Add focused registration/service tests for all four templates, existing-school join, idempotence, tenant rollback on failure, and preference/assignment separation.
4. Add a tenant-scoped subject catalog route for owners. Reuse `SubjectService` and `SubjectsView`; gate the route and all mutations server-side with effective structure permissions.
5. Add owner-only subject navigation and wizard empty-state creation; refresh the wizard snapshot after successful create.
6. Verify the teacher first-run dashboard state and capture UAT screenshots for the seeded subject step, empty-state creation/refresh, and post-onboarding dashboard.
7. Run focused tests, then the project quality gates and record exact outcomes in `STAGE-TO02-IMPLEMENTATION-REPORT.md`.

## Verification Commands

- `npx vitest run src/test/ai-assistant/smart-onboarding-service.test.ts src/test/teacher/teacher-onboarding-hub.test.tsx src/test/shell/navigation-config.test.ts`
- `npm run typecheck`
- `npm run lint`
- `npm run format:check`
- `npm run test`
- `npm run build`

## Rollback

For new registrations, disable the service invocation and revert the code template. Do not delete already-provisioned subjects: they may have owner edits or academic references. No database migration is expected because `MataPelajaran` already enforces unique `(sekolah_id, kode)`.
