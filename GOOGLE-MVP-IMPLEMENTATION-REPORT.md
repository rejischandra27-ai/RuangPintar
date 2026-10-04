# Google Registration MVP - Implementation Report

**Status:** IMPLEMENTED - READY FOR HUMAN ARCHITECT REVIEW

## Scope Delivered

- Google Login for an already registered Google identity.
- Google Registration for a new Guru Mandiri account.
- Automatic tenant creation with the exact format `Ruang Mengajar Mandiri - [Nama Guru]`.
- Owner membership, trial subscription, teacher profile, and active application session.
- Redirect to `/dashboard` after successful callback.
- Local login and Guardian registration remain available and unchanged.

The MVP does not implement multi-provider support, School Discovery, Join School, advanced linking, or Avatar Persistence.

## Authentication Flow

1. `/api/auth/google?mode=login` or `/api/auth/google?mode=register` creates a Google authorization URL.
2. Server-only HttpOnly cookies store signed state, nonce, and PKCE verifier for ten minutes.
3. `/api/auth/google/callback` exchanges the authorization code server-side.
4. Google ID token signature is verified with Google's JWKS using RSA-SHA256.
5. Issuer, audience, expiry, issued-at skew, nonce, subject, and `email_verified` are validated.
6. `provider = GOOGLE` plus Google `sub` is used as the identity key. Email is not used for auto-linking.
7. Login mode rejects an unregistered Google subject.
8. Registration mode rejects an email that already belongs to a local account and otherwise provisions a new Guru Mandiri tenant atomically.
9. The existing Ruang Pintar session cookie is created server-side and the browser is redirected to `/dashboard`.

No access token, ID token, client secret, or password is sent to the browser, URL, or audit payload.

## Data Changes

- Added `IdentitasProvider` mapped to `identitas_provider`.
- Unique identity key: `(provider, subject)`.
- Additive migration: `prisma/migrations/20260929140000_add_google_provider_identity/migration.sql`.
- Migration applied successfully to the development database configured by `.env`.
- No existing migration was rewritten.

## Configuration

Set these server environment variables before using Google in a deployment:

```env
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."
GOOGLE_REDIRECT_URI="http://localhost:3000/api/auth/google/callback"
GOOGLE_OAUTH_STATE_SECRET="a-long-random-server-secret"
```

Register the exact value of `GOOGLE_REDIRECT_URI` as an Authorized redirect URI in Google Cloud Console. The secret values are intentionally absent from the repository.

## Changed Files

- `prisma/schema.prisma`
- `prisma/migrations/20260929140000_add_google_provider_identity/migration.sql`
- `src/shared/infrastructure/auth/google-oauth-service.ts`
- `src/shared/infrastructure/auth/auth-service.ts`
- `src/modules/ai-assistant/application/smart-onboarding-service.ts`
- `src/modules/ai-assistant/domain/ai-types.ts`
- `src/app/api/auth/google/route.ts`
- `src/app/api/auth/google/callback/route.ts`
- `src/app/login/login-form.tsx`
- `src/app/login/page.tsx`
- `src/app/register/register-form.tsx`
- `src/test/auth/google-oauth.test.ts`

## Verification Evidence

- `prisma validate`: PASS.
- `prisma migrate status`: database schema up to date.
- `npm run typecheck`: PASS.
- `npm run format:check`: PASS.
- Focused auth/provisioning/OAuth tests: 3 files, 15 tests passed.
- `npm run build`: PASS; both `/api/auth/google` and `/api/auth/google/callback` compiled as dynamic Route Handlers.
- `npm run lint`: 0 errors; four existing `@next/next/no-img-element` warnings remain in unrelated CBT files.

## Manual Deployment Check Remaining

The repository has no Google client credentials, so a real browser round-trip with Google was not executed in this environment. Human verification must configure the four environment variables, authorize the redirect URI, then test:

- New Google account -> new Guru Mandiri tenant -> dashboard.
- Existing linked Google account -> dashboard.
- Existing local email with unlinked Google subject -> rejection without auto-link.
- Invalid/replayed callback state -> rejection without session.

## Stop Gate

Google Registration MVP is ready for Human Architect review. No Avatar Persistence, multi-provider, discovery, join, or advanced linking work was started.
