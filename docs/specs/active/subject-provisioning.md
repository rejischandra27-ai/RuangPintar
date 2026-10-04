# STAGE TO-02 — SUBJECT PROVISIONING SPEC

**Status:** BUILD / active  
**Scope:** Subject catalog creation for newly created tenants, owner catalog access, and teacher onboarding subject selection.

## Objective

Create an initial, school-owned subject catalog in the same transaction that creates a new school. Keep catalog subjects, teacher onboarding preferences, and official teaching assignments as separate concepts.

## Provisioning Templates

Templates are application starter catalogs, not legal or curriculum-compliance claims. Provision only the following jenjang profiles:

| Jenjang | Subjects |
| --- | --- |
| SD | Pendidikan Agama, PPKn, Bahasa Indonesia, Matematika, IPAS, Seni Budaya, PJOK |
| SMP | Pendidikan Agama, PPKn, Bahasa Indonesia, Matematika, IPA, IPS, Bahasa Inggris, Informatika, Seni Budaya, PJOK |
| SMA | Pendidikan Agama, PPKn, Bahasa Indonesia, Matematika, Bahasa Inggris, Informatika, Sejarah, Seni Budaya, PJOK |
| SMK | Pendidikan Agama, PPKn, Bahasa Indonesia, Matematika, Bahasa Inggris, Informatika, Projek Kejuruan |

Each template uses stable school-local subject codes. SMK `Projek Kejuruan` is a starter catalog entry and does not imply a selected vocational concentration. `UMUM` has no approved template in this stage and remains owner-configurable through the empty state.

## Behavior and Invariants

- Provisioning runs only in the new-school branch of teacher registration, after the school row is created and before its transaction commits.
- Provisioning does not run on login, onboarding, or existing-school join.
- Provisioning is idempotent by `(sekolah_id, kode)` and does not overwrite existing subject names, statuses, or owner edits on retry.
- Any provisioning failure aborts the same tenant-creation transaction.
- Subject preference selection supports multiple active, non-archived subjects and creates no teaching assignment.
- If the onboarding catalog is empty, show **Tambah Mata Pelajaran**. A tenant owner may create a subject there; on success the wizard refreshes its snapshot and choices.
- Tenant owners can view, create, update, deactivate, and archive subjects within their active tenant. No teacher-directory or teaching-assignment permission is implied.
- A teacher dashboard with no class or official assignment must retain truthful empty-state guidance. No fake teaching activity or KPI is introduced.
- Typography remains unchanged in this stage.

## Acceptance Criteria

1. New SD, SMP, SMA, and SMK registrations contain exactly the configured starter subjects before registration commits.
2. Existing-school joins do not provision additional subjects.
3. Re-running the provisioner creates no duplicate and does not overwrite edited records.
4. A forced provisioning failure rolls back school, owner membership, and trial creation.
5. The owner can reach and manage the subject catalog; a non-owner teacher cannot mutate it.
6. Wizard subject selection allows multiple choices; creating a subject from its empty state refreshes the choice list.
7. Saving preferences does not create `PenugasanMengajar`.
8. The post-onboarding teacher dashboard communicates the actual next step when there is no class or assignment.
9. No typography changes or schema migration are required.
