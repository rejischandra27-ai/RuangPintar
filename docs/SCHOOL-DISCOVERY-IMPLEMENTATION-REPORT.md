# PHASE 03 — SCHOOL DISCOVERY & REGISTRATION IMPLEMENTATION REPORT

| Metadata | Value |
| --- | --- |
| Phase | PHASE 03 — SCHOOL DISCOVERY & REGISTRATION REFACTOR |
| Status | READY FOR HUMAN REVIEW |
| Approved specification | [docs/specs/active/SCHOOL-DISCOVERY-SPEC.md](specs/active/SCHOOL-DISCOVERY-SPEC.md) |
| Canonical spec pointer | [docs/SCHOOL-DISCOVERY-SPEC.md](SCHOOL-DISCOVERY-SPEC.md) |

## Implemented

- Added debounced school discovery by name or NPSN, with active-school filtering, a 12-result cap, school level, city/regency or address, and join action.
- Added the no-results flow with only school name and level (`SD`, `SMP`, `SMA`, `SMK`, `UMUM`). Manual registration preserves the existing teacher and guardian account flows.
- Refactored `registerTeacher()` into existing-school and new-school branches. Existing-school signup creates an active non-owner membership and teacher onboarding preference without creating a tenant or trial. New-school signup creates the tenant, owner membership, 30-day trial, academic defaults, teacher profile, provider identity when applicable, and active session in one transaction.
- Changed new Google OAuth registration to place verified claims in a signed, HTTP-only, 10-minute pending cookie and return to `/register?oauth=google`. No user, provider record, tenant, trial, or session is created until school selection is submitted. Final registration consumes the pending identity and follows the same atomic service flow.
- Existing Google identities continue through the current login/session path. Avatar selection and the dashboard onboarding wizard remain unchanged.

## Scope and Compatibility

- No Prisma schema change or migration was made.
- Existing teacher and tenant records are not rewritten. Existing tenants and their subscriptions are not altered by a join.
- The selected school ID is revalidated server-side as an active school. OAuth claims are accepted only from the signed, unexpired server cookie; client-provided identity and owner flags are ignored.
- Authorization/session engines, avatar picker, teacher wizard, dashboard cockpit, and Academic Glass UI system were not changed.

## Tests and Evidence

- Unit/UI, integration, OAuth, and authorization coverage added or updated for name/NPSN search, empty state, new-school owner/trial, existing-school non-owner membership without trial, Google pending-cookie validation and routing, and invalid registration authorization.
- `npm run test`: PASS — 123 test files, 745 tests.
- `npm run typecheck`: PASS.
- `npm run lint`: PASS with 0 errors and 4 existing `<img>` warnings in CBT presentation files.
- `npm run build`: PASS — Next.js production build completed and `/register` rendered as a dynamic route.
- `npx prettier --check` on all touched Phase 03 TypeScript files: PASS.
- `npm run format:check`: BLOCKED by the pre-existing dirty file `src/test/teacher/teacher-onboarding-hub.test.tsx`; no out-of-scope formatting change was made.
- Browser QA: `/register` rendered; search empty state and new-school form verified at 390px viewport with no horizontal overflow. Existing Academic Glass registration shell was retained.
- `git diff --check`: no whitespace errors in source changes; reports a pre-existing trailing blank line in `prisma/schema.prisma` and Windows LF/CRLF notices.

## Required Review Fields

- **Files created:** `docs/SCHOOL-DISCOVERY-IMPLEMENTATION-REPORT.md`; `src/modules/ai-assistant/presentation/school-discovery.tsx`; `src/test/authorization/school-registration-authorization.test.ts`.
- **Files modified:** registration server actions, registration page/form, Google OAuth service/callback, onboarding service/domain validation/types, and the focused AI-assistant/OAuth/authorization tests. The approved spec and root pointer were already present and were not rewritten.
- **Dependencies:** None.
- **Migrations:** None.
- **Domain invariants:** New tenant owner is `is_owner = true`; joining teacher is `is_owner = false`; existing tenant subscription/trial is untouched.
- **Authorization and tenant isolation:** Server validates active school; Google completion requires valid signed pending identity; membership and session tenant are created from server-verified selection.
- **UI visual QA:** Desktop registration route and 390px mobile empty state checked; no overflow; no redesign.
- **Known limitations / residual risk:** The existing-school join behavior creates an active membership directly, as defined by the approved Phase 03 specification. The school location display uses the existing `alamat` field because the current schema has no separate city/regency field. Full repository format gate remains blocked by the pre-existing unrelated dirty test file noted above.
- **Git status:** Pre-existing local changes span multiple out-of-scope files. Those changes were preserved; only Phase 03 changes should be staged for this deliverable.

**READY FOR HUMAN REVIEW**
