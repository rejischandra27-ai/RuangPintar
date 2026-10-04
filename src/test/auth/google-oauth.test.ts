import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import {
  GOOGLE_OAUTH_NONCE_COOKIE,
  GOOGLE_OAUTH_STATE_COOKIE,
  GOOGLE_OAUTH_VERIFIER_COOKIE,
  GOOGLE_PENDING_REGISTRATION_COOKIE,
  createGooglePendingRegistrationCookie,
  getGoogleAppUrl,
  readGooglePendingRegistrationCookie,
} from "@/shared/infrastructure/auth/google-oauth-service";
import { GET as startGoogle } from "@/app/api/auth/google/route";
import { GET as googleCallback } from "@/app/api/auth/google/callback/route";

const { completeGoogleAuthenticationMock, headersMock } = vi.hoisted(() => ({
  completeGoogleAuthenticationMock: vi.fn(),
  headersMock: vi.fn(),
}));

vi.mock("@/shared/infrastructure/auth/google-oauth-service", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/shared/infrastructure/auth/google-oauth-service")>()),
  completeGoogleAuthentication: completeGoogleAuthenticationMock,
}));
vi.mock("next/headers", () => ({ headers: headersMock }));

describe("Google OAuth MVP route contract", () => {
  beforeEach(() => {
    completeGoogleAuthenticationMock.mockReset();
    headersMock.mockResolvedValue(new Headers());
    vi.stubEnv("GOOGLE_CLIENT_ID", "google-client-test");
    vi.stubEnv("GOOGLE_CLIENT_SECRET", "google-secret-test");
    vi.stubEnv("GOOGLE_OAUTH_STATE_SECRET", "state-secret-test");
    vi.stubEnv("GOOGLE_REDIRECT_URI", "http://localhost:3000/api/auth/google/callback");
    vi.stubEnv("NODE_ENV", "test");
  });

  it("starts registration with state, nonce, and PKCE cookies", async () => {
    const response = await startGoogle(
      new NextRequest("http://localhost:3000/api/auth/google?mode=register")
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("accounts.google.com/o/oauth2/v2/auth");
    expect(response.headers.get("location")).toContain("code_challenge_method=S256");
    expect(response.headers.get("location")).toContain("scope=openid+email+profile");

    const cookies = response.headers.getSetCookie();
    expect(cookies).toHaveLength(3);
    expect(cookies.join(";")).toContain("HttpOnly");
    expect(cookies.join(";")).toContain("Max-Age=600");
  });

  it("builds the Google callback URI from APP_URL when GOOGLE_REDIRECT_URI is unset", async () => {
    vi.stubEnv("GOOGLE_REDIRECT_URI", "");
    vi.stubEnv("FRONTEND_URL", "");
    vi.stubEnv("APP_URL", "http://0.0.0.0:3000");

    const response = await startGoogle(
      new NextRequest("http://0.0.0.0:3000/api/auth/google?mode=register")
    );
    const authorizationUrl = new URL(response.headers.get("location")!);

    expect(authorizationUrl.searchParams.get("redirect_uri")).toBe(
      "http://localhost:3000/api/auth/google/callback"
    );
  });

  it("normalizes an explicitly configured wildcard Google callback URI", async () => {
    vi.stubEnv("FRONTEND_URL", "http://localhost:3000");
    vi.stubEnv("APP_URL", "http://localhost:3000");
    vi.stubEnv("GOOGLE_REDIRECT_URI", "http://0.0.0.0:3000/api/auth/google/callback");

    const response = await startGoogle(
      new NextRequest("http://0.0.0.0:3000/api/auth/google?mode=register")
    );
    const authorizationUrl = new URL(response.headers.get("location")!);

    expect(authorizationUrl.searchParams.get("redirect_uri")).toBe(
      "http://localhost:3000/api/auth/google/callback"
    );
  });

  it("rejects a callback without the one-time OAuth state material", async () => {
    const response = await googleCallback(
      new NextRequest("http://localhost:3000/api/auth/google/callback?code=code&state=state")
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/login?error=google_failed"
    );
  });

  it("uses the configured app URL after OAuth start fails on a wildcard-bound request", async () => {
    vi.stubEnv("GOOGLE_CLIENT_ID", "");

    const response = await startGoogle(
      new NextRequest("http://0.0.0.0:3000/api/auth/google?mode=register")
    );

    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/register?error=google_failed"
    );
  });

  it("uses the configured app URL after callback failure on a wildcard-bound request", async () => {
    const request = new NextRequest(
      "http://0.0.0.0:3000/api/auth/google/callback?code=code&state=state"
    );
    request.cookies.set(GOOGLE_OAUTH_STATE_COOKIE, "signed.register.state");

    const response = await googleCallback(request);

    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/register?error=google_failed"
    );
  });

  it("sends a new Google identity to school discovery before avatar onboarding", async () => {
    completeGoogleAuthenticationMock.mockResolvedValue({
      mode: "register",
      needsAvatar: false,
      pendingRegistrationToken: "signed-pending-google-identity",
    });

    const request = new NextRequest(
      "http://localhost:3000/api/auth/google/callback?code=code&state=state"
    );
    request.cookies.set(GOOGLE_OAUTH_STATE_COOKIE, "signed.register.state");
    request.cookies.set(GOOGLE_OAUTH_NONCE_COOKIE, "nonce");
    request.cookies.set(GOOGLE_OAUTH_VERIFIER_COOKIE, "verifier");
    const response = await googleCallback(request);

    expect(completeGoogleAuthenticationMock).toHaveBeenCalledOnce();
    expect(response.headers.get("location")).toBe("http://localhost:3000/register?oauth=google");
    const responseCookies = response.headers.getSetCookie().join(";");
    expect(responseCookies).toContain(GOOGLE_PENDING_REGISTRATION_COOKIE);
    expect(responseCookies).not.toContain("ruang_pintar_session");
  });

  it("uses the configured frontend origin for successful OAuth redirects", async () => {
    vi.stubEnv("FRONTEND_URL", "http://localhost:3000/base-path");
    completeGoogleAuthenticationMock.mockResolvedValue({
      mode: "login",
      needsAvatar: false,
    });
    const request = new NextRequest(
      "http://0.0.0.0:3000/api/auth/google/callback?code=code&state=state"
    );
    request.cookies.set(GOOGLE_OAUTH_STATE_COOKIE, "signed.login.state");
    request.cookies.set(GOOGLE_OAUTH_NONCE_COOKIE, "nonce");
    request.cookies.set(GOOGLE_OAUTH_VERIFIER_COOKIE, "verifier");

    const response = await googleCallback(request);

    expect(response.headers.get("location")).toBe("http://localhost:3000/dashboard");
  });

  it("prefers FRONTEND_URL, then APP_URL, over the request bind address", () => {
    vi.stubEnv("FRONTEND_URL", "http://school-portal.local:3100");
    vi.stubEnv("APP_URL", "http://localhost:3000");

    expect(getGoogleAppUrl("/register?error=google_failed", "http://0.0.0.0:3000").toString()).toBe(
      "http://school-portal.local:3100/register?error=google_failed"
    );
  });

  it("signs the pending Google identity and rejects tampered claims", () => {
    const token = createGooglePendingRegistrationCookie({
      subject: "google-subject",
      email: "guru@example.test",
      nama_lengkap: "Guru OAuth",
    });

    expect(readGooglePendingRegistrationCookie(token)).toEqual({
      subject: "google-subject",
      email: "guru@example.test",
      nama_lengkap: "Guru OAuth",
    });
    expect(readGooglePendingRegistrationCookie(`${token}tampered`)).toBeNull();
  });
});
