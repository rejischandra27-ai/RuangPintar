# STAGE SD-01 / SD-01A — UX IMPLEMENTATION REPORT

**Status:** Implemented; ready for review  
**Scope:** Desktop registration layout and School Discovery result presentation. Mobile layout, School Discovery flow, and business logic were not changed.

## Before / After Screenshots

- [Desktop before — 1440px](docs/evidence/SD-01/desktop-before.png)
- [Desktop after — 1440px](docs/evidence/SD-01/desktop-after.png)
- [Desktop after — no-results/create-school state](docs/evidence/SD-01/desktop-after-empty-state.png)
- [Mobile after — 390px](docs/evidence/SD-01/mobile-after.png)

The local directory contains eight active schools, all legacy teacher-mandiri records in the sampled set; the chosen query did not produce a suitable institutional school result during screenshot capture. The no-results/create-school state is therefore captured live, while the populated result row is verified by the deterministic component test fixture and is not presented as live screenshot data.

## SD-01A Changes

- Registration route now opts into the wide auth form. Its desktop content panel measures 696px at both 1280px and 1440px viewport widths, and 700px at 1024px.
- The registration-only desktop shell gives the form column 700–760px and reduces the blank left track. Other auth pages keep their existing grid and panel sizes.
- School Discovery result items keep their previous mobile stack, spacing, type sizes, metadata order, and full-width action. At `lg` and above, each row uses a school-details column plus a visually separated CTA column.
- Desktop details are organized as school name, `Jenjang · Kota/Kabupaten`, then optional NPSN. The desktop join action has a left divider and a stable minimum width.
- Discovery heading, helper text, and search input receive desktop-only emphasis. Existing mobile control heights and type sizes are unchanged.

## Responsive QA

| Viewport | Panel width | Document overflow | Result layout |
| --- | ---: | --- | --- |
| 1024px | 700px | None | Desktop two-zone row |
| 1280px | 696px | None | Desktop two-zone row |
| 1440px | 696px | None | Desktop two-zone row |
| 390px | 342px | None | Existing stacked mobile row |

## Validation

- `npm run typecheck`: PASS.
- `npm run test -- src/test/ai-assistant/onboarding-views.test.tsx --reporter=dot`: PASS, 5 tests.
- Scoped ESLint for the touched layout, discovery, and view test files: PASS, no errors.
- Scoped Prettier check for the touched files: PASS.
- Playwright screenshot and geometry check at 1024px, 1280px, 1440px, and 390px: PASS for target sizing and no horizontal overflow.
- Join CTA and metadata behavior are asserted against a deterministic UI fixture. The local DB did not provide a populated search result to include in the live screenshot.

## SD-01 Google OAuth Local Setup

The local `.env` values inspected for this task had `APP_URL=http://localhost:3000`; `FRONTEND_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`, and `GOOGLE_OAUTH_STATE_SECRET` were unset. Do not commit the populated local `.env`.

1. In Google Cloud Console, select or create a project and configure the OAuth consent screen. Add a test user if the app remains in testing mode.
2. Create an OAuth Client ID with application type **Web application**.
3. Add this **Authorized JavaScript origin**:

   ```text
   http://localhost:3000
   ```

4. Add this exact **Authorized redirect URI**:

   ```text
   http://localhost:3000/api/auth/google/callback
   ```

5. Put the generated client ID and secret in the local `.env`; generate a private state secret locally. Example:

   ```dotenv
   APP_URL=http://localhost:3000
   FRONTEND_URL=http://localhost:3000
   GOOGLE_CLIENT_ID="<client-id-from-google-cloud>"
   GOOGLE_CLIENT_SECRET="<client-secret-from-google-cloud>"
   GOOGLE_REDIRECT_URI="http://localhost:3000/api/auth/google/callback"
   GOOGLE_OAUTH_STATE_SECRET="<random-secret-generated-locally>"
   ```

   Generate a state secret with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`. Keep the client secret and state secret private.
6. Restart the Next.js dev server after changing environment variables. Click **Daftar dengan Google**. Expected path: Google consent → `/register?oauth=google` with a verified pending identity → select/join or create a school → existing avatar step → dashboard.

The expected Google callback is `http://localhost:3000/api/auth/google/callback`; the value in Google Cloud Console must exactly match `GOOGLE_REDIRECT_URI`. Do not use `0.0.0.0` as a browser origin or callback URI.

## Known UAT Limitation

The layout change is implemented and verified. A live Google OAuth end-to-end pass still requires real local Google client credentials and the matching Cloud Console configuration; those credentials were not present in the inspected environment. No credentials were requested, invented, or written to the repository.
