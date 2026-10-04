# IMPLEMENTATION PLAN — STAGE TO-02 SUBJECT PROVISIONING FOUNDATION

**Status:** Planning proposal; implementation not started.  
**Prerequisite:** Approve the subject catalog strategy and its curriculum-source caveats.  
**Constraint:** This plan does not authorize code, UI, or migration changes in the current audit/design stage.

## Objective

For a newly created school, provision an approved, school-owned starter subject catalog before the owner reaches Teacher Onboarding. Preserve the distinction between a catalog entry, an individual teacher's onboarding preference, and an official teaching assignment.

## Decisions Required Before Build

1. Approve the application starter-subject matrix in `SUBJECT-CATALOG-STRATEGY.md` and identify a named curriculum version/source for any claim of curricular obligation.
2. Decide how the system treats curriculum version when School Discovery currently collects only school name and jenjang. Proposed initial scope: one explicitly named default profile per jenjang, with no claim of legal completeness.
3. For SMK, approve that the base jenjang seed contains only shared/general starter subjects; vocational/concentration subjects are deferred until a `ProgramKeahlian` is known.
4. Confirm that `MataPelajaran.kelompok` is presentation/classification only and is not used as a proxy for “required.” Decide whether durable required/optional/provenance metadata is needed; that decision may imply a separate additive migration proposal.
5. Approve the owner catalog access path using school-structure permission without granting broad teacher-management permission.

## Ordered Work

### 1. Define the Provisioning Template

- Create an immutable, versioned code-owned subject template per approved jenjang/profile.
- Store stable subject codes, display names, group, and initial active state. Codes must be unique per school.
- Keep core versus optional classification in the template source. Do not describe it as legal enforcement unless the associated curriculum source is approved.
- For jenjang templates that require phase/grade applicability, record that limitation and avoid marking phase-specific subjects as universal requirements.

**Acceptance:** Template validation rejects duplicate codes, blank names, unsupported jenjang, and invalid groups; template fixtures enumerate SD/SMP/SMA and the approved generic SMK starter set.

### 2. Add an Idempotent Tenant Catalog Provisioner

- Introduce a provisioning service that accepts the new `sekolah_id`, jenjang, template/profile version, and transaction client.
- Create school-local `MataPelajaran` records only; do not share rows across tenant boundaries.
- Make repeat invocation a no-op/upsert by stable `(sekolah_id, kode)` identity. Never overwrite owner-customized names/status on a retry.
- Invoke only on the `createsSchool` registration branch and inside the same transaction as `Sekolah`, active owner membership, trial, academic year, semester, grade levels, teacher profile, onboarding preferences, and tenant defaults.
- Do not run on existing-school join; do not backfill existing tenants in this stage.

**Acceptance:** New-school registration atomically creates the expected school-scoped catalog. Forced provisioner failure rolls back the new tenant transaction. Retrying does not duplicate subjects. Joining an existing school creates no subject rows or trial.

### 3. Reconcile Owner Catalog Authorization

- Existing subject creation action requires `academic.structure.manage`, already granted to a tenant owner by the authorization engine.
- Provide a reachable owner entry to the existing subject catalog surface, or a dedicated catalog route reusing the existing `SubjectsView` rather than creating a new visual system.
- Permit access using the subject/catalog permission only. Keep teacher directory, teacher profile, teaching assignment, and homeroom operations behind their existing permissions.
- Split current page/tab capability inputs if needed so `canManageSubjects` does not imply `canManageTeachers` or teaching assignments.
- Add an owner navigation entry visible only when effective access contains the subject-catalog permission. Retain server-side checks in all mutations.

**Acceptance:** New-school owner can open and manage its own subject catalog; a regular teacher cannot create/edit catalog subjects; owner cannot gain unrelated teacher/assignment operations; cross-tenant subject IDs are rejected.

### 4. Keep Wizard Preference Semantics

- Keep the subject snapshot tenant-scoped and filtered to active, non-archived subjects.
- Core and optional catalog rows are choices, not teaching assignments. Do not create `PenugasanMengajar` when preferences are saved.
- Preserve a valid empty-catalog fallback while ensuring a newly provisioned tenant has its approved baseline before the first snapshot.
- If existing `mata_pelajaran_ids_json` selections refer to a later archived subject, retain current filtering behavior and test it.

**Acceptance:** New owner sees the provisioned catalog; subject save writes preference IDs and confirmation state only; no assignment rows are created; school without applicable catalog choices can still acknowledge/continue as specified.

### 5. Verification and Release Gate

- Unit: template resolution for each jenjang; stable codes; template validation; idempotence.
- Integration: new school includes template rows within the atomic tenant transaction; existing-school join does not seed; trial and owner semantics remain unchanged.
- Authorization: owner catalog access allowed; non-owner teacher denied catalog mutation; cross-tenant mutation denied.
- Regression: OAuth pending-cookie completion, Avatar Picker, teacher wizard preferences, existing subjects/assignments, existing tenants with no catalog.
- Run repository gates: typecheck, lint, format check, tests, production build. Perform UAT on SD/SMP/SMA/SMK templates only after the curriculum template matrix is approved.

## Data Impact

- Inserting initial rows into the existing `MataPelajaran` model requires no migration.
- Existing tenant data remains unchanged; no automatic backfill in TO-02.
- If the product requires durable template version, source, required/optional flag, or grade/phase applicability, submit a separate additive schema/migration proposal before implementation. No destructive rewrite or deletion of school catalog rows.

## Authorization Impact

- Tenant creation is server-authoritative and provisions subjects only under the newly created `sekolah_id`.
- Catalog administration requires effective school-scoped structure/catalog permission.
- Teacher subject preference is self-scoped to active tenant and does not grant catalog management or teaching assignment authority.

## Risks and Rollback

- **Curriculum drift:** templates must be versioned and owner edits must not be overwritten on upgrade.
- **Wrong level defaults:** jenjang alone cannot encode grade phase, curriculum version, or SMK concentration; block unsupported subject-specific claims until configuration is approved.
- **Permission overgrant:** do not satisfy page access by granting `academic.teachers.manage` broadly to teacher owners.
- **Partial tenant setup:** run provisioning in the tenant-creation transaction; any failure must abort tenant, membership, and trial creation together.
- **Rollback:** disable the template version for future tenant creation and revert service wiring. Do not delete already-provisioned subjects automatically; retain rows referenced by assignments or owner changes. Existing tenants are not affected.

## Final Recommendation

Implement new-tenant-only, transactional, idempotent subject provisioning from approved versioned templates. Pair that foundation with a reachable owner catalog path using narrow school-structure authority. Preserve wizard subject picks as preferences, not assignments. Defer legal “required subject” claims and SMK specialization rows until the relevant curriculum profile/program is explicit and approved.
