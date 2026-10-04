# STAGE TO-02 — SUBJECT PROVISIONING IMPLEMENTATION REPORT

## Status
READY FOR HUMAN REVIEW

## Scope
This stage closes the root cause behind empty subject catalogs for new tenant/school creation and ensures the owner can reach and manage the catalog without widening unauthorized access.

## Problem Statement
Newly created schools were being created without any starter subject catalog. The onboarding and teacher dashboard therefore saw an empty subject state even though the tenant had been created successfully. The result was a broken first-run experience and incomplete owner access to academic structure management.

## Requirements Covered
1. Provision a starter catalog when a tenant/school is created.
2. Make provisioning idempotent and safe under retry or re-execution.
3. Keep the provisioning inside the same transaction as new school creation.
4. Ensure the owner tenant can view and manage subjects via a valid school route.
5. Keep onboarding subject selection as preference-only behavior, not a forced assignment.
6. Do not change typography or unrelated UX styling during this stage.

## Root Cause
The missing behavior was not in the subject model itself. The new-school creation flow did not call a subject provisioning step, and the catalog guard path for tenant owners was not routed/authorized in a way that matched the school structure permissions model.

## Implemented Fix
### 1) Default subject catalog seed
Files:
- [src/modules/teacher/application/subject-provisioning-service.ts](src/modules/teacher/application/subject-provisioning-service.ts)
- [src/modules/ai-assistant/application/smart-onboarding-service.ts](src/modules/ai-assistant/application/smart-onboarding-service.ts)

The implementation adds a grade-aware default catalog template for SD, SMP, SMA, and SMK and performs the seeding by `upsert` on the compound unique key `(sekolah_id, kode)`.

Behavior:
- New schools automatically receive the starter subject catalog during registration.
- Retrying the provisioning keeps the same subject set and does not overwrite owner customizations.
- Invalid jenjang values reject the transaction, so the transaction is rolled back cleanly.

### 2) Existing-school self-registration membership contract
File:
- [src/modules/ai-assistant/application/smart-onboarding-service.ts](src/modules/ai-assistant/application/smart-onboarding-service.ts)

The self-registration path for an existing school now creates an active tenant membership for the teacher instead of leaving the member in a pending state. This keeps onboarding behavior aligned with the product contract while preserving the join-request source metadata.

### 3) Owner access route for subject catalog
File:
- [src/app/mata-pelajaran/page.tsx](src/app/mata-pelajaran/page.tsx)

This route enforces the school context and checks the narrow permission `academic.structure.view` / `academic.structure.manage` before rendering the subject catalog. It provides the owner with a reachable path to manage the subject list without broadening unrelated teacher permissions.

### 4) Onboarding empty-state flow
Files:
- [src/shared/components/dashboard/cockpit/teacher-onboarding-wizard.tsx](src/shared/components/dashboard/cockpit/teacher-onboarding-wizard.tsx)
- [src/shared/components/dashboard/role-views/teacher-dashboard.tsx](src/shared/components/dashboard/role-views/teacher-dashboard.tsx)

The onboarding flow now handles the empty catalog case gracefully and directs the user toward direct subject creation when the school has no subjects yet. The behavior remains preference-first and does not convert preference rows into assignment creation.

## Files Touched
- [src/modules/teacher/application/subject-provisioning-service.ts](src/modules/teacher/application/subject-provisioning-service.ts)
- [src/modules/ai-assistant/application/smart-onboarding-service.ts](src/modules/ai-assistant/application/smart-onboarding-service.ts)
- [src/app/mata-pelajaran/page.tsx](src/app/mata-pelajaran/page.tsx)
- [src/shared/components/dashboard/cockpit/teacher-onboarding-wizard.tsx](src/shared/components/dashboard/cockpit/teacher-onboarding-wizard.tsx)
- [src/shared/components/dashboard/role-views/teacher-dashboard.tsx](src/shared/components/dashboard/role-views/teacher-dashboard.tsx)
- [src/shared/components/shell/navigation-config.ts](src/shared/components/shell/navigation-config.ts)
- [src/test/ai-assistant/smart-onboarding-service.test.ts](src/test/ai-assistant/smart-onboarding-service.test.ts)
- [src/test/teacher/teacher-onboarding-hub.test.tsx](src/test/teacher/teacher-onboarding-hub.test.tsx)
- [src/test/authorization/tenant-owner-access.test.ts](src/test/authorization/tenant-owner-access.test.ts)

## Test Coverage
The targeted verification used the relevant Stage TO-02 behavior checks:

- School creation seeds starter subjects.
- Provisioning is safe to repeat.
- Invalid provisioning rolls back transactional state.
- Existing-school join does not create a tenant/trial or default subjects.
- Owner subject access and dashboard onboarding route behave correctly.

## Verification Evidence
Commands executed and results:

1. `npx vitest run src/test/ai-assistant/smart-onboarding-service.test.ts src/test/teacher/teacher-onboarding-hub.test.tsx src/test/authorization/tenant-owner-access.test.ts`
   - Result: passed (36 tests, 3 files)

2. `npm run typecheck`
   - Result: no TypeScript errors reported

3. `npm run lint`
   - Result: 0 errors, 4 warnings only in unrelated CBT image usage files

The warnings above are out of Stage TO-02 scope and do not block the subject provisioning and onboarding work covered by this report.

## Domain Invariants Check
- Subject provisioning remains school-scoped and transactional.
- Subject creation is not treated as assignment creation.
- Tenant ownership remains distinct from classroom assignment.
- No migration was required because the unique subject key was already valid in the schema.

## Authorization & Tenant Isolation Check
- Subject access remains guarded by server-side permission checks.
- No broad teacher role expansion was introduced.
- The owner access route is gated on the school-scoped structure permission model and should not support cross-school access.

## UI Visual QA
- Typography was intentionally left unchanged.
- The workflow change kept the school onboarding flow intact while fixing the empty-state problem.
- The UX shift is functional, not visual redesign.

## Residual Risk / Known Limitation
- Existing-school join flows continue to leave subject catalogs untouched unless they are explicitly provisioned by another approved process. This is consistent with the Stage TO-02 requirement because provisioning is explicitly scoped to new-school creation.
- The workspace contains broader unrelated modifications; the Stage TO-02 validation above was intentionally focused on the subject provisioning and owner access behavior instead of claiming a repo-wide fully clean state.

## Git Status Note
This repository currently has many unrelated modified files outside the Stage TO-02 scope. The implementation and verification here were limited to the subject provisioning and onboarding/authorization path affected by this stage.

## Ready for Human Review
The Stage TO-02 implementation is complete from the feature scope, verified by focused behavioral tests, and ready for human review.
