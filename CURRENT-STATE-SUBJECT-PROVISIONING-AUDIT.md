# CURRENT-STATE SUBJECT PROVISIONING AUDIT — STAGE TO-01

**Status:** Audit only; no code, UI, schema, or migration changes made.  
**Scope:** School creation, teacher onboarding subject step, subject catalog access, and related domain records.

## Current Reality

### Records Created for a New School

`smartOnboardingService.registerTeacher()` branches on `createsSchool = !dto.sekolah_id`. For a newly created school, the transaction currently creates:

| Record | Current behavior |
| --- | --- |
| `Sekolah` tenant | Created with submitted name and jenjang, `FREEMIUM`, active status, and a 30-day `trial_berakhir_pada`. |
| `KeanggotaanSekolah` | Created active with role `TEACHER`, `is_owner: true`, and source `OWNER_CREATE`. |
| `LanggananTenant` | Created with package `TRIAL`, status `TRIAL_ACTIVE`, and source `TRIAL_PROVISIONING`. |
| `TahunAjaran` | Creates hard-coded `2026/2027`, active, with dates 2026-07-01 through 2027-06-30. |
| `Semester` | Creates active `Semester Ganjil`, attached to that academic year. |
| `TingkatKelas` | Creates codes `X`, `XI`, `XII` with names Kelas X/XI/XII. This happens irrespective of the submitted school jenjang. |
| `Fase` / curriculum | No phase rows or curriculum-selection record are created by this branch. The Prisma schema has no `Kurikulum` model. |
| `ProgramKeahlian` | No program/major rows are created. |
| `Rombel` / class | No class/rombel is created during registration. The onboarding wizard creates one later if the owner proceeds. |
| `MataPelajaran` | No subject catalog row is created during registration. |
| Teacher and user | Creates `Pengguna`, a `Guru` profile, onboarding preferences, notification preferences, and an active session bound to the new tenant. |
| Other tenant setup | Creates a timezone system setting. A verified OAuth provider identity is added when present. |

Relevant implementation: [`smart-onboarding-service.ts`](src/modules/ai-assistant/application/smart-onboarding-service.ts#L101) selects the new-school branch; school, academic year, semester, and grade levels are created at [lines 113–155](src/modules/ai-assistant/application/smart-onboarding-service.ts#L113); owner membership is created at [line 210](src/modules/ai-assistant/application/smart-onboarding-service.ts#L210); trial and timezone setup are at [lines 249–261](src/modules/ai-assistant/application/smart-onboarding-service.ts#L249).

### Why the Wizard Has No Active Subjects

The onboarding snapshot queries `mata_pelajaran` directly for the active tenant and requires both `status_aktif: true` and `status_lifecycle: "AKTIF"` ([teacher-onboarding-service.ts](src/modules/teacher/application/teacher-onboarding-service.ts#L72)). This is not a separate subject loader or stale client cache. A school created by the current registration branch has no `MataPelajaran` records to return, so its default query result is empty.

The primary cause for a newly created school is therefore **A: no subject records are provisioned**. **B: subjects exist but are not loaded** is not supported by the observed code path. **C: records are excluded by the filter** can occur in other tenants if their subjects are inactive or archived, but it is not the default new-tenant cause.

The wizard explicitly handles zero choices: it renders “Belum ada mata pelajaran aktif di sekolah” and says the teacher may continue without an assignment ([teacher-onboarding-wizard.tsx](src/shared/components/dashboard/cockpit/teacher-onboarding-wizard.tsx#L379)). Its client validation requires a selection only when `subjectChoices.length > 0` ([lines 151–154](src/shared/components/dashboard/cockpit/teacher-onboarding-wizard.tsx#L151)). The service likewise rejects an empty selection only if the active subject count is greater than zero ([teacher-onboarding-service.ts](src/modules/teacher/application/teacher-onboarding-service.ts#L281)). With no active subjects it persists an empty JSON list plus `mapel_dikonfirmasi_pada` and advances the wizard step ([lines 292–324](src/modules/teacher/application/teacher-onboarding-service.ts#L292)).

### Subject Creation and Owner Access

The subject catalog UI exists at `/guru-pengajaran` → **Mata Pelajaran** → **Tambah Mata Pelajaran**. The tab is declared in [`teacher-management-tabs.tsx`](src/modules/teacher/presentation/teacher-management-tabs.tsx#L34), and the create control is visible in [`subjects-view.tsx`](src/modules/teacher/presentation/subjects-view.tsx#L566) when `canManage` is true.

There is an access mismatch for a teacher who owns the newly created tenant:

- `createSubjectAction()` requires `academic.structure.manage` ([teacher-actions.ts](src/app/actions/teacher-actions.ts#L510)). The authorization engine grants an owner that permission ([access-control.ts](src/shared/infrastructure/authorization/access-control.ts#L82)). Thus the server action permission itself permits an owner.
- The page `/guru-pengajaran` first checks `academic.teachers.view` and `academic.teachers.manage`, then redirects when neither is granted ([page.tsx](src/app/guru-pengajaran/page.tsx#L92)). The owner grant adds structure, student, and class permissions but not teacher view/manage ([access-control.ts](src/shared/infrastructure/authorization/access-control.ts#L82)); the base `TEACHER` permission list also does not include teacher view/manage ([role-permissions.ts](src/shared/infrastructure/authorization/role-permissions.ts#L74)).
- Navigation exposes `/guru-pengajaran` for `SUPER_ADMIN` and qualified `SCHOOL_STAFF`, not for `TEACHER` owners ([navigation-config.ts](src/shared/components/shell/navigation-config.ts#L262), [line 342](src/shared/components/shell/navigation-config.ts#L342)).
- The separate `/struktur-akademik` tabs cover year/semester, grade/phase, programs, and rombel; they do not include the subject catalog ([academic-management-tabs.tsx](src/modules/academic/presentation/academic-management-tabs.tsx#L27)).

Therefore, a subject creation service and server action exist, but the current owner-facing UI route is not reachable under the current page gate, and no owner navigation item leads to it. A direct server-action invocation may pass `academic.structure.manage`; that does not provide a usable owner workflow.

One separate post-onboarding path, `smartOnboardingService.confirmAndCreateClass()`, can create a subject from its AI class-setup payload if one with that name does not exist, then creates a teaching assignment ([smart-onboarding-service.ts](src/modules/ai-assistant/application/smart-onboarding-service.ts#L462)). This is not registration-time provisioning, is not a school-wide catalog bootstrap, and is not the wizard's subject-preference action.

## Root Cause

1. The new-school registration branch provisions tenant/trial/year/semester/grade-level foundation but intentionally has no subject seed/configuration step.
2. The wizard requests only active subject rows for the tenant, so a new tenant returns an empty `subjectChoices` array.
3. The UI and service intentionally allow the empty catalog case to be acknowledged and skipped.
4. The owner subject action has a permission grant, but the catalog page's teacher-management view/manage gate and navigation prevent the owner from using it through the current UI.

## Domain Analysis

- `MataPelajaran` is a school-owned master catalog entity. `PenugasanMengajar.mata_pelajaran_id` is a required relation when an actual teaching assignment is created ([schema.prisma](prisma/schema.prisma#L717), [line 744](prisma/schema.prisma#L744)).
- The wizard does **not** treat subject selection as a required domain invariant for user registration, tenant creation, or onboarding completion. It is an onboarding preference stored as `mata_pelajaran_ids_json` on `PreferensiOnboardingGuru` ([schema.prisma](prisma/schema.prisma#L551)); it is not a foreign-key relation to the subject catalog.
- Saving the wizard selection does **not** create `MataPelajaran` or `PenugasanMengajar`. It stores preference IDs and a confirmation timestamp. The wizard's own copy explicitly says selection does not create an assignment ([teacher-onboarding-wizard.tsx](src/shared/components/dashboard/cockpit/teacher-onboarding-wizard.tsx#L415)).
- Actual teaching assignment creation is a separate operation requiring a real teacher, subject, rombel, academic year, and related assignment context.

## Recommendation

Treat an empty subject catalog as a valid initial school state, but close the owner setup gap before expecting owners to manage subjects:

1. Provide a supported owner-accessible subject catalog route/action using a coherent owner permission boundary, and surface that route from the empty state or school setup navigation.
2. Keep subject preference separate from official teaching assignment. Do not turn wizard selection into assignment creation.
3. If automatic provisioning is considered later, use an approved, jenjang/curriculum-specific subject template. Do not seed guessed or generic subjects across SD/SMP/SMA/SMK/UMUM tenants.
4. Preserve the current empty-catalog continuation behavior unless product/domain owners decide subject configuration is a required onboarding gate.
