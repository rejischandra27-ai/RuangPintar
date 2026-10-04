# GAP ANALYSIS — ONBOARDING SUBJECTS (STAGE TO-01)

**Status:** Audit only; recommendation, not implementation approval  
**Scope:** New-school subject provisioning, teacher onboarding subject preference, and owner catalog access.

## Current Reality

- New-school registration creates a school, owner membership, trial, active academic year and semester, and grade levels X/XI/XII. It creates **no** `MataPelajaran`, `Fase`, or `ProgramKeahlian` catalog data. The grade-level seed is the same X/XI/XII set regardless of submitted jenjang.
- The onboarding snapshot directly queries active subjects belonging to the active school, requiring `status_aktif = true` and `status_lifecycle = "AKTIF"` ([teacher-onboarding-service.ts](src/modules/teacher/application/teacher-onboarding-service.ts#L72)). The new school's subject catalog is empty, so the wizard's “Belum ada mata pelajaran aktif di sekolah” state is the expected query result.
- With zero results, the wizard lets the teacher continue. The service stores `[]` as `mata_pelajaran_ids_json`, writes `mapel_dikonfirmasi_pada`, and advances the wizard. It creates neither a subject nor a teaching assignment ([teacher-onboarding-service.ts](src/modules/teacher/application/teacher-onboarding-service.ts#L281)).
- A subject catalog UI and create action exist at `/guru-pengajaran` → **Mata Pelajaran**. The action requires `academic.structure.manage` ([teacher-actions.ts](src/app/actions/teacher-actions.ts#L510)). The owner permission engine grants `academic.structure.manage` ([access-control.ts](src/shared/infrastructure/authorization/access-control.ts#L82)).
- However, the page is gated by `academic.teachers.view` or `academic.teachers.manage` and redirects when both are denied ([guru-pengajaran/page.tsx](src/app/guru-pengajaran/page.tsx#L92)). Neither permission is granted to a base TEACHER or added by the current tenant-owner permission block. The subject tab's controls also receive a shared `canManage` value derived from teacher-management permission rather than `academic.structure.manage` ([teacher-management-tabs.tsx](src/modules/teacher/presentation/teacher-management-tabs.tsx#L97)). The navigation entry is for `SUPER_ADMIN` or qualified `SCHOOL_STAFF`, not TEACHER owners ([navigation-config.ts](src/shared/components/shell/navigation-config.ts#L262), [line 342](src/shared/components/shell/navigation-config.ts#L342)).

## Root Cause

There are two related but distinct gaps:

1. **Provisioning gap:** the new-school branch does not seed or request configuration of the school's master subject catalog. Therefore, the first onboarding snapshot has no active choices unless some other flow has already created subjects.
2. **Owner-access gap:** the subject-create server action recognizes `academic.structure.manage`, which an owner has, but the existing page gate, navigation, and shared UI `canManage` prop use teacher-management permissions. The owner cannot reach or see the normal subject-catalog creation controls through the UI.

The empty state is not caused by the wizard failing to load data. It is caused by no subject rows being provisioned for a newly created school. The active-status filter can also hide inactive/archived subjects in other tenants, but it is not the default cause for a new school.

## Domain Analysis

- **Subject catalog vs preference:** `MataPelajaran` is an institution-owned catalog entity. Wizard IDs are stored as a JSON preference on `PreferensiOnboardingGuru`; there is no subject foreign-key relation on that preference ([schema.prisma](prisma/schema.prisma#L551), [line 717](prisma/schema.prisma#L717)).
- **Subject step is not a domain prerequisite for registration:** the service rejects an empty selection only when the school has one or more active subjects. If none exist, empty selection is accepted and recorded as onboarding confirmation ([teacher-onboarding-service.ts](src/modules/teacher/application/teacher-onboarding-service.ts#L292)).
- **Preference does not create an assignment:** saving the step writes preference IDs/timestamp only. The UI explicitly says that this does not create an assignment ([teacher-onboarding-wizard.tsx](src/shared/components/dashboard/cockpit/teacher-onboarding-wizard.tsx#L415)).
- **Official assignment remains a separate invariant:** `PenugasanMengajar` requires a subject ID and also references teacher, rombel, and academic-year context ([schema.prisma](prisma/schema.prisma#L744)). Subject preference alone must not be promoted into an official teaching assignment.
- **School/grade foundation is incomplete for curriculum-aware schools:** there is no separate `Kurikulum` model in the current Prisma schema, no phase or program seed, and the new-school path inserts X/XI/XII grade codes irrespective of jenjang. Subject catalogs should not be auto-filled with guessed content until a curriculum/jenjang template is an approved source of truth.

## Is “0 Subjects → Continue” Expected?

**At the wizard level, yes.** The UI contains an explicit empty-catalog message and the service accepts an empty selection when the filtered catalog count is zero. It records the step as acknowledged and advances. This is an intentional graceful fallback in the current implementation.

**At the end-to-end owner setup level, the flow is incomplete.** The new-school flow creates no catalog, and the owner cannot reach the normal subject management UI despite holding the subject action's `academic.structure.manage` permission. Thus a teacher can continue, but the current UI does not give that owner a supported way to populate the missing catalog before or after the wizard.

## Recommendations

### Priority 1 — Give Owners a Usable Subject-Catalog Path

Provide an owner-accessible subject-catalog management surface authorized specifically with `academic.structure.manage`. Prefer a dedicated catalog route or a separately authorized subject tab over granting broad `academic.teachers.manage` merely to unlock a shared teacher-management page. Add a contextual link/action from the empty wizard state to that supported route. Keep server-side tenant scoping and subject authorization authoritative.

### Priority 2 — Preserve Optional Preference Semantics

Keep subject selection as an onboarding preference unless Product/Domain explicitly makes it mandatory. When a catalog is empty, continue to permit a confirmed empty preference. Do not create `PenugasanMengajar` from this step.

### Priority 3 — Decide Catalog Provisioning Source Before Auto-Seeding

Choose one approved path for new tenants:

- owner/staff creates the catalog through the supported management workflow; or
- a governed, jenjang/curriculum-specific template provisions subjects.

Do not seed one generic list across SD, SMP, SMA, SMK, and UMUM without an approved curriculum mapping. The current schema and new-school seeding logic do not provide that mapping.

### Priority 4 — Align New-School Academic Structure with Jenjang

Separately decide whether the default academic structure should vary by jenjang. Current code creates X/XI/XII for every new-school jenjang and no fase/program records. Resolve that policy before changing provisioning, since it affects the domain data baseline and subsequent class creation.

## Audit Conclusion

The immediate wizard symptom is **A: subjects have not been created** for the new tenant. The wizard's empty-state continuation is currently an intended fallback, not a failed subject query. The larger UX/product gap is that the tenant owner lacks a supported visible subject-catalog management path even though the underlying create action accepts the owner's structure-management permission.
