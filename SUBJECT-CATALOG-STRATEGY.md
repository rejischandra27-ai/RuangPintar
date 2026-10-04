# SUBJECT CATALOG STRATEGY — STAGE TO-02

**Status:** Proposed catalog policy for architecture review; not a legal curriculum certification.  
**Scope:** Starter Subject Catalogs for SD, SMP, SMA, and SMK tenants created through School Discovery.

## Current Reality

The current `MataPelajaran` schema stores a school-scoped code, name, group, active/lifecycle state, and description. It has no curriculum profile, curriculum version, grade/phase applicability, source provenance, or required/optional flag. The onboarding wizard treats catalog entries as active choices; it does not distinguish curricular obligations from teacher preferences.

Accordingly, “wajib bawaan” below means **recommended core starter catalog records to provision**, not a claim that every learner or every curriculum version is legally required to take each row. A legally complete template requires approval against a named curriculum version and grade/phase structure.

## Catalog Policy

1. Provision core starter rows active so the new tenant has an immediately usable catalog.
2. Keep optional catalog rows available only when applicable to the selected level/profile; do not auto-select them for a teacher.
3. Teacher onboarding selection remains an individual preference. It must not create an official teaching assignment.
4. Owner-addable entries are tenant-local and must use unique codes within that tenant.
5. Do not seed SMK productive/vocational subjects from jenjang alone; those depend on the selected `ProgramKeahlian`/concentration, which School Discovery does not collect.

## Proposed Starter Matrix

### SD

**Core starter rows (seed active):**
- Pendidikan Agama dan Budi Pekerti
- Pendidikan Pancasila
- Bahasa Indonesia
- Matematika
- Pendidikan Jasmani, Olahraga, dan Kesehatan (PJOK)
- Seni Budaya
- Ilmu Pengetahuan Alam dan Sosial (IPAS), with applicability limited to the appropriate grades/phases when that mapping is available

**Optional starter rows (available, not teacher-selected by default):**
- Bahasa Inggris, subject to adopted curriculum and transition-year policy
- Muatan Lokal / Bahasa Daerah
- Additional arts, language, coding, or locally approved enrichment offerings

**Owner-added:** local curriculum, regional language, school-specific enrichment, and valid additional subjects. Religious-education variants or school-specific naming should be handled according to the institution's actual curriculum rather than multiplying speculative defaults.

### SMP

**Core starter rows (seed active):**
- Pendidikan Agama dan Budi Pekerti
- Pendidikan Pancasila
- Bahasa Indonesia
- Matematika
- Ilmu Pengetahuan Alam (IPA)
- Ilmu Pengetahuan Sosial (IPS)
- Bahasa Inggris
- PJOK
- Informatika
- Seni Budaya
- Prakarya

**Optional starter rows (available, not teacher-selected by default):**
- Muatan Lokal / Bahasa Daerah
- Additional language, arts, practical, or school enrichment subjects
- Additional coding/AI or project-oriented offerings where locally approved

**Owner-added:** locally approved content, specific additional language/arts variants, and school-defined enrichment subjects.

### SMA

**Core starter rows (seed active):**
- Pendidikan Agama dan Budi Pekerti
- Pendidikan Pancasila
- Bahasa Indonesia
- Matematika
- Bahasa Inggris
- PJOK
- Sejarah
- Seni dan Budaya

**Optional starter rows (available, not teacher-selected by default):**
- Advanced Mathematics
- Physics, Chemistry, Biology
- Economics, Sociology, Geography, Anthropology
- Informatics, additional languages, and other elective offerings
- Muatan Lokal / school enrichment

**Owner-added:** elective variants, local content, and school-specific enrichment. The actual student elective structure is a separate academic enrollment/selection decision; catalog presence must not imply every student takes every elective.

### SMK

**Core starter rows (seed active, pending curriculum-profile approval):**
- Pendidikan Agama dan Budi Pekerti
- Pendidikan Pancasila
- Bahasa Indonesia
- Matematika
- Bahasa Inggris
- PJOK
- Sejarah
- Seni dan Budaya

These rows are a generic starter proposal only. Before production seeding, validate the exact common-subject list against the adopted SMK curriculum and version.

**Optional starter rows (profile-dependent):**
- Informatics, IPAS/project subjects, Muatan Lokal, additional languages, and school enrichment only where the selected curriculum/profile applies.
- Do not create generic “Kejuruan” subjects without an actual program/concentration definition.

**Owner-added:** productive/vocational subjects derived from the selected `ProgramKeahlian` and concentration, local teaching modules, and school-defined specialization subjects. The program must precede its subject template; the School Discovery jenjang field alone is insufficient.

## Required vs Optional Semantics

The target catalog may keep a versioned template's `core` versus `optional` designation, but the current database cannot represent that distinction. Do not overload `kelompok` or `status_lifecycle` to mean “legally mandatory.” For a first foundation implementation:

- Template core rows: provision as active, selectable catalog rows.
- Template optional rows: provision only for the selected profile, also active/selectable, but not pre-selected in teacher preference.
- Teacher-owned selection: stored as onboarding preference IDs only.
- Official curriculum requirement: remains a separate, versioned template policy and must be explicitly sourced/approved.

If the product must display or enforce core/optional status after provisioning, add explicit template provenance and applicability metadata in a future additive schema design. This is not implemented by this strategy document.

## Risks and Approval Dependencies

- Exact required subjects can change by curriculum year, phase, grade, local content rules, and vocational concentration.
- The new-school form only provides jenjang; no curriculum version or SMK program is selected.
- Existing schema has no phase/grade links on `MataPelajaran`, so phase-specific IPAS or upper-grade electives cannot be enforced or filtered precisely.
- English and technology subject policy can be transition-year dependent; do not mark those legal obligations based only on a broad jenjang code.
- Subject-name/code source must be reviewed before shipping a production template. Initial records should include stable, school-unique codes and template provenance outside the displayed subject name.

## Final Recommendation

Use this matrix as a **reviewable starter-catalog proposal**, not as an authoritative national curriculum database. Provision only approved core rows on new-tenant creation; keep optional rows unselected in teacher preferences; require an explicit curriculum profile and program/concentration before seeding curriculum-specific/elective/SMK vocational subjects. Preserve owner ability to add and deactivate tenant-local subjects through a supported, authorized catalog-management path.
