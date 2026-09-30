import crypto from "crypto";
import { createPublicKey, verify as verifySignature } from "crypto";
import { prisma } from "../database/prisma";
import { authService } from "./auth-service";

export const GOOGLE_OAUTH_STATE_COOKIE = "ruang_pintar_google_oauth_state";
export const GOOGLE_OAUTH_NONCE_COOKIE = "ruang_pintar_google_oauth_nonce";
export const GOOGLE_OAUTH_VERIFIER_COOKIE = "ruang_pintar_google_oauth_verifier";
export const GOOGLE_PENDING_REGISTRATION_COOKIE = "ruang_pintar_google_pending";
export const GOOGLE_OAUTH_MAX_AGE_SECONDS = 600;

type GoogleMode = "login" | "register";

interface GoogleConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  stateSecret: string;
}

interface GoogleIdTokenClaims {
  iss: string;
  aud: string | string[];
  sub: string;
  email: string;
  email_verified: boolean;
  name?: string;
  exp: number;
  iat: number;
  nonce?: string;
}

export interface GooglePendingRegistration {
  subject: string;
  email: string;
  nama_lengkap: string;
}

interface GoogleJwk {
  kid: string;
  kty: string;
  alg?: string;
  use?: string;
  n: string;
  e: string;
}

function getGoogleConfig(): GoogleConfig {
  const values = {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    redirectUri:
      process.env.GOOGLE_REDIRECT_URI ||
      `${process.env.APP_URL || "http://localhost:3000"}/api/auth/google/callback`,
    stateSecret: process.env.GOOGLE_OAUTH_STATE_SECRET,
  };

  if (!values.clientId || !values.clientSecret || !values.stateSecret) {
    throw new Error("Google Login belum dikonfigurasi.");
  }

  return values as GoogleConfig;
}

function base64Url(buffer: Buffer): string {
  return buffer.toString("base64url");
}

function createSignedState(mode: GoogleMode, state: string, secret: string): string {
  const payload = `${state}.${mode}.${Date.now()}`;
  const signature = crypto.createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

function verifySignedState(
  value: string,
  secret: string
): { state: string; mode: GoogleMode } | null {
  const [state, mode, timestamp, signature] = value.split(".");
  if (!state || !timestamp || !signature || (mode !== "login" && mode !== "register")) return null;

  const payload = `${state}.${mode}.${timestamp}`;
  const expected = crypto.createHmac("sha256", secret).update(payload).digest("base64url");
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (
    actualBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(actualBuffer, expectedBuffer)
  ) {
    return null;
  }

  if (Date.now() - Number(timestamp) > GOOGLE_OAUTH_MAX_AGE_SECONDS * 1000) return null;
  return { state, mode };
}

function decodeJson<T>(value: string): T {
  return JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as T;
}

function randomPassword(): string {
  return `${base64Url(crypto.randomBytes(32))}Aa1!`;
}

export function createGoogleRegistrationPassword(): string {
  return randomPassword();
}

export function createGooglePendingRegistrationCookie(
  registration: GooglePendingRegistration
): string {
  const config = getGoogleConfig();
  const payload = base64Url(
    Buffer.from(JSON.stringify({ ...registration, issuedAt: Date.now() }), "utf8")
  );
  const signature = crypto
    .createHmac("sha256", config.stateSecret)
    .update(payload)
    .digest("base64url");
  return `${payload}.${signature}`;
}

export function readGooglePendingRegistrationCookie(
  value?: string
): GooglePendingRegistration | null {
  if (!value) return null;
  const [payload, signature] = value.split(".");
  if (!payload || !signature) return null;

  const config = getGoogleConfig();
  const expected = crypto
    .createHmac("sha256", config.stateSecret)
    .update(payload)
    .digest("base64url");
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (
    actualBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(actualBuffer, expectedBuffer)
  ) {
    return null;
  }

  try {
    const registration = decodeJson<GooglePendingRegistration & { issuedAt: number }>(payload);
    if (
      !registration.subject ||
      !registration.email ||
      !registration.nama_lengkap ||
      !Number.isFinite(registration.issuedAt) ||
      Date.now() - registration.issuedAt > GOOGLE_OAUTH_MAX_AGE_SECONDS * 1000 ||
      registration.issuedAt > Date.now() + 300_000
    ) {
      return null;
    }
    return {
      subject: registration.subject,
      email: registration.email,
      nama_lengkap: registration.nama_lengkap,
    };
  } catch {
    return null;
  }
}

export function createGoogleAuthorizationUrl(mode: GoogleMode): {
  url: string;
  stateCookie: string;
  nonce: string;
  codeVerifier: string;
} {
  const config = getGoogleConfig();
  const state = base64Url(crypto.randomBytes(32));
  const nonce = base64Url(crypto.randomBytes(32));
  const codeVerifier = base64Url(crypto.randomBytes(48));
  const stateCookie = createSignedState(mode, state, config.stateSecret);
  const codeChallenge = base64Url(crypto.createHash("sha256").update(codeVerifier).digest());
  const query = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state,
    nonce,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    access_type: "online",
    prompt: "select_account",
  });

  return {
    url: `https://accounts.google.com/o/oauth2/v2/auth?${query.toString()}`,
    stateCookie,
    nonce,
    codeVerifier,
  };
}

async function exchangeCode(code: string, codeVerifier: string): Promise<{ id_token: string }> {
  const config = getGoogleConfig();
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri,
      grant_type: "authorization_code",
      code_verifier: codeVerifier,
    }),
    cache: "no-store",
  });

  if (!response.ok) throw new Error("Google OAuth token exchange gagal.");
  const data = (await response.json()) as { id_token?: string };
  if (!data.id_token) throw new Error("Google tidak mengembalikan identity token.");
  return { id_token: data.id_token };
}

async function getGoogleJwks(): Promise<GoogleJwk[]> {
  const response = await fetch("https://www.googleapis.com/oauth2/v3/certs", {
    next: { revalidate: 3600 },
  });
  if (!response.ok) throw new Error("Google signing keys tidak tersedia.");
  const data = (await response.json()) as { keys?: GoogleJwk[] };
  if (!data.keys?.length) throw new Error("Google signing keys tidak valid.");
  return data.keys;
}

async function verifyIdToken(idToken: string, nonce: string): Promise<GoogleIdTokenClaims> {
  const config = getGoogleConfig();
  const parts = idToken.split(".");
  if (parts.length !== 3) throw new Error("Google identity token tidak valid.");

  const [encodedHeader, encodedPayload, encodedSignature] = parts;
  const header = decodeJson<{ alg?: string; kid?: string }>(encodedHeader);
  if (header.alg !== "RS256" || !header.kid) throw new Error("Algoritma Google token tidak valid.");

  const key = (await getGoogleJwks()).find((item) => item.kid === header.kid && item.kty === "RSA");
  if (!key) throw new Error("Google signing key tidak ditemukan.");

  const validSignature = verifySignature(
    "RSA-SHA256",
    Buffer.from(`${encodedHeader}.${encodedPayload}`),
    createPublicKey({ key: key as unknown as import("crypto").JsonWebKey, format: "jwk" }),
    Buffer.from(encodedSignature, "base64url")
  );
  if (!validSignature) throw new Error("Signature Google token tidak valid.");

  const claims = decodeJson<GoogleIdTokenClaims>(encodedPayload);
  const issuerValid =
    claims.iss === "https://accounts.google.com" || claims.iss === "accounts.google.com";
  const audienceValid = Array.isArray(claims.aud)
    ? claims.aud.includes(config.clientId)
    : claims.aud === config.clientId;
  const now = Math.floor(Date.now() / 1000);
  if (!issuerValid || !audienceValid || claims.exp <= now || claims.iat > now + 300) {
    throw new Error("Claim Google token tidak valid.");
  }
  if (!claims.sub || !claims.email || claims.email_verified !== true || claims.nonce !== nonce) {
    throw new Error("Identity Google belum terverifikasi.");
  }

  return claims;
}

export async function completeGoogleAuthentication(input: {
  code: string;
  state: string;
  stateCookie: string;
  nonce: string;
  codeVerifier: string;
  ipAddress?: string;
  userAgent?: string;
}): Promise<{
  rawSessionToken?: string;
  mode: GoogleMode;
  needsAvatar: boolean;
  pendingRegistrationToken?: string;
}> {
  const config = getGoogleConfig();
  const signedState = verifySignedState(input.stateCookie, config.stateSecret);
  if (!signedState || signedState.state !== input.state) {
    throw new Error("Sesi Google OAuth tidak valid atau sudah kedaluwarsa.");
  }

  const claims = await verifyIdToken(
    (await exchangeCode(input.code, input.codeVerifier)).id_token,
    input.nonce
  );
  const providerIdentity = await prisma.identitasProvider.findUnique({
    where: { provider_subject: { provider: "GOOGLE", subject: claims.sub } },
    select: { pengguna_id: true, pengguna: { select: { avatar_id: true } } },
  });

  if (providerIdentity) {
    const result = await authService.createSessionForUser(providerIdentity.pengguna_id, {
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      auditAction: "AUTH_GOOGLE_LOGIN_SUCCESS",
    });
    if (!result.success || !result.sessionToken)
      throw new Error(result.error || "Login Google gagal.");
    return {
      rawSessionToken: result.sessionToken,
      mode: signedState.mode,
      needsAvatar: !providerIdentity.pengguna.avatar_id,
    };
  }

  if (signedState.mode === "login") {
    throw new Error("Akun Google belum terdaftar. Gunakan Daftar dengan Google terlebih dahulu.");
  }

  const normalizedEmail = claims.email.trim().toLowerCase();
  const existingEmail = await prisma.pengguna.findUnique({ where: { email: normalizedEmail } });
  if (existingEmail) {
    throw new Error("Email Google sudah memiliki akun. Masuk dengan akun lokal terlebih dahulu.");
  }

  return {
    mode: signedState.mode,
    needsAvatar: false,
    pendingRegistrationToken: createGooglePendingRegistrationCookie({
      subject: claims.sub,
      email: normalizedEmail,
      nama_lengkap: claims.name?.trim() || normalizedEmail.split("@")[0],
    }),
  };
}

export function getGoogleOAuthCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: GOOGLE_OAUTH_MAX_AGE_SECONDS,
  };
}

export function getGoogleOAuthExpiredCookieOptions() {
  return { ...getGoogleOAuthCookieOptions(), maxAge: 0, expires: new Date(0) };
}

export function getGoogleMode(value: string | null): GoogleMode {
  return value === "register" ? "register" : "login";
}

export function getGoogleErrorRedirect(mode: GoogleMode): string {
  return mode === "register" ? "/register?error=google_failed" : "/login?error=google_failed";
}
