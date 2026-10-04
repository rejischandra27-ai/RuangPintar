# SUBJECT PROVISIONING DESIGN — STAGE TO-02

**Status:** Architecture proposal; no code, schema, UI, or migration changes made.  
**Inputs:** `CURRENT-STATE-SUBJECT-PROVISIONING-AUDIT.md`, current registration/onboarding implementation, current Prisma model.

## Current Reality

For a new school, `smartOnboardingService.registerTeacher()` provisions the tenant, active owner membership, 30-day trial, active 2026/2027 academic year, active Semester Ganjil, grade levels X/XI/XII, teacher/user records, onboarding preferences, timezone config, and an active owner session. It does not provision `MataPelajaran`, `Fase`, `ProgramKeahlian`, or a `Kurikulum` record. Grade X/XI/XII is currently seeded for every submitted jenjang.

The onboarding snapshot reads only subjects belonging to the active school with both `status_aktif = true` and `status_lifecycle = "AKTIF"` ([teacher-onboarding-service.ts](src/modules/teacher/application/teacher-onboarding-service.ts#L72)). The subject step persists selected IDs as onboarding preference JSON and does not create subjects or assignments ([lines 281–324](src/modules/teacher/application/teacher-onboarding-service.ts#L281)).

Current domain relations:

- `MataPelajaran` belongs directly to `Sekolah`; the model has code/name/group/lifecycle fields but no curriculum, phase, grade-level applicability, template provenance, or required/optional flag ([schema.prisma](prisma/schema.prisma#L717)).
- `PenugasanMengajar` references a school, teacher, subject, academic year, and rombel ([schema.prisma](prisma/schema.prisma#L744)).
- `PreferensiOnboardingGuru.mata_pelajaran_ids_json` is a JSON preference, not a relation to `MataPelajaran` ([schema.prisma](prisma/schema.prisma#L551)).
- `Fase` exists, but a separate `Kurikulum` model does not. School only records `jenjang`; registration does not select a curriculum, phase profile, program, or vocational concentration ([schema.prisma](prisma/schema.prisma#L454)).

## Domain Analysis

### Provisioning Timing

**Recommendation: provision during new-tenant creation, inside the same tenant-creation transaction.** Do not wait until first login or onboarding completion:

- The first onboarding snapshot needs a catalog before displaying its subject choices.
- First-login provisioning is race-prone and can leave different users seeing different states.
- Provisioning after the wizard is too late for that wizard session and forces a second setup path.
- Transactional provisioning makes tenant, owner membership, trial, academic defaults, and initial subject catalog all-or-nothing.

The provisioning operation should be idempotent by `(sekolah_id, subject_template_code)`. Current `MataPelajaran` has a unique `(sekolah_id, kode)` constraint, so stable template codes can protect retries without duplicate subjects ([schema.prisma](prisma/schema.prisma#L717)). Existing-school joins must not reprovision the school's catalog; they join its existing catalog.

### Subject Ownership and Assignment Lifecycle

```text
Curriculum/School Template (source definition)
                 │ provisions school-scoped rows
                 ▼
Sekolah ──< MataPelajaran (master catalog)
                 │ selected as teacher onboarding preference (optional)
                 │
                 └── referenced by PenugasanMengajar
                         ├── Guru
                         ├── Rombel
                         └── TahunAjaran / Semester
```

- The school owns and governs its catalog. A system template supplies initial data but must not remain a shared mutable catalog across tenants.
- Onboarding subject choices express teacher interest/preference only.
- A real teaching assignment is a separate authorized administrative operation and must require a valid teacher, school-owned subject, rombel, and academic period.
- Subject availability, curriculum applicability, and a teacher's preference are distinct concepts. The current schema represents availability via `status_aktif`/`status_lifecycle` and preference via `mata_pelajaran_ids_json`; it does not represent curriculum requirements or grade/phase applicability.

## Architecture Recommendation

1. Define immutable, versioned seed templates keyed by `(jenjang, curriculum_profile, template_version)`. The initial School Discovery input only supplies jenjang, so either use a clearly named default profile per jenjang or introduce curriculum/profile selection in a later approved product change. Do not infer SMK concentration or a school's adopted curriculum.
2. At new-school creation, call a pure template resolver and an idempotent `SubjectCatalogProvisioningService` within the existing database transaction. Create tenant-owned `MataPelajaran` rows using stable `kode`, `nama`, `kelompok`, `status_aktif`, and `status_lifecycle` fields.
3. Seed the baseline and optional catalog entries as active/selectable rows unless the owner explicitly excludes an optional item. “Baseline required” here means preloaded by the application. It does not assert that every school or every pupil is legally required to take that subject.
4. Leave teacher subject preference empty until the teacher chooses. Do not silently create `PenugasanMengajar` from seeded subjects or wizard preferences.
5. Give a new-school owner a supported school-scoped subject-catalog management path. Prefer a catalog-only surface guarded by `academic.structure.manage` rather than granting teacher-profile/assignment permissions merely to pass the `/guru-pengajaran` teacher-management page gate.
6. Preserve existing tenants and join flows. Provisioning runs only on new-tenant creation; it is not a backfill or mutation of current schools.

### Data Impact

- **No migration is needed** to insert initial school-scoped subjects using the current `MataPelajaran` fields.
- The current model cannot store template version, legal/source provenance, “required versus optional”, or grade/phase applicability. If these must remain queryable or govern future template upgrades, a later additive schema decision is needed. Do not encode those semantics in `kelompok` or in teacher preference JSON.
- A later template update must never silently overwrite an owner-edited subject. Track provisioned codes/version or perform additive, conflict-aware updates. Never deactivate/delete tenant-custom subjects as a template side effect.
- The hard-coded X/XI/XII grades for all jenjang are a related structural mismatch; resolve it separately rather than bundling grade/curriculum redesign into subject provisioning without approval.

### Authorization Impact

- New school owner should be able to view/manage the subject catalog within their active tenant.
- A regular TEACHER may select active catalog subjects as preferences but must not gain subject catalog management or official assignment creation from that preference.
- `createSubjectAction()` currently checks `academic.structure.manage`, while `/guru-pengajaran` page entry checks `academic.teachers.view/manage`; reconcile the owner catalog route/gate in the implementation phase.
- All queries and writes remain constrained by the actor's active `sekolah_id`; template data is copied into that tenant, not exposed as another school's rows.

## Risks

- A jenjang-only seed may misstate curriculum applicability because the current registration flow does not collect curriculum version, grade phase, local curriculum, or SMK concentration.
- “Wajib” may be misunderstood as a legal guarantee. UI and catalog metadata must distinguish an application starter baseline from a validated curricular obligation.
- Activating every optional subject by default can clutter teacher choices; seeding too few subjects reproduces the empty-catalog experience.
- Retry or partial-provisioning behavior can duplicate catalog rows unless creation is transactional and idempotent.
- Subject preferences may become stale if the owner archives a subject after a teacher selects it; the existing snapshot already filters invalid IDs, but the UX/reconciliation policy should be explicit.

## Final Recommendation

Provision an initial, school-owned, jenjang-based starter catalog atomically when a new tenant is created, using reviewed and versioned templates. Keep teacher subject choices as preferences and keep assignments separate. Make owner catalog management accessible under school-structure authority. Treat the proposed per-jenjang list in `SUBJECT-CATALOG-STRATEGY.md` as a starter-data proposal, not a legally complete curriculum until its source, year, and grade/phase coverage are approved.
