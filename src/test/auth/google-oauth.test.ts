import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import {
  GOOGLE_OAUTH_NONCE_COOKIE,
  GOOGLE_OAUTH_STATE_COOKIE,
  GOOGLE_OAUTH_VERIFIER_COOKIE,
  GOOGLE_PENDING_REGISTRATION_COOKIE,
  createGooglePendingRegistrationCookie,
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

  it("rejects a callback without the one-time OAuth state material", async () => {
    const response = await googleCallback(
      new NextRequest("http://localhost:3000/api/auth/google/callback?code=code&state=state")
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/login?error=google_failed"
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
