import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import {
  GOOGLE_OAUTH_NONCE_COOKIE,
  GOOGLE_OAUTH_STATE_COOKIE,
  GOOGLE_OAUTH_VERIFIER_COOKIE,
  GOOGLE_PENDING_REGISTRATION_COOKIE,
  completeGoogleAuthentication,
  getGoogleAppUrl,
  getGoogleErrorRedirect,
  getGoogleOAuthExpiredCookieOptions,
  getGoogleOAuthCookieOptions,
} from "@/shared/infrastructure/auth/google-oauth-service";
import { getSessionCookieOptions } from "@/shared/lib/session";

export const dynamic = "force-dynamic";

function getModeFromSignedState(value?: string): "login" | "register" {
  return value?.split(".")[1] === "register" ? "register" : "login";
}

export async function GET(request: NextRequest) {
  const requestCookies = request.cookies;
  const stateCookie = requestCookies.get(GOOGLE_OAUTH_STATE_COOKIE)?.value;
  const nonce = requestCookies.get(GOOGLE_OAUTH_NONCE_COOKIE)?.value;
  const codeVerifier = requestCookies.get(GOOGLE_OAUTH_VERIFIER_COOKIE)?.value;
  const mode = getModeFromSignedState(stateCookie);
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");

  const clearCookieOptions = getGoogleOAuthExpiredCookieOptions();
  const fail = () => {
    const response = NextResponse.redirect(
      getGoogleAppUrl(getGoogleErrorRedirect(mode), request.url)
    );
    response.cookies.set(GOOGLE_OAUTH_STATE_COOKIE, "", clearCookieOptions);
    response.cookies.set(GOOGLE_OAUTH_NONCE_COOKIE, "", clearCookieOptions);
    response.cookies.set(GOOGLE_OAUTH_VERIFIER_COOKIE, "", clearCookieOptions);
    return response;
  };

  if (!code || !state || !stateCookie || !nonce || !codeVerifier) return fail();

  try {
    const requestHeaders = await headers();
    const result = await completeGoogleAuthentication({
      code,
      state,
      stateCookie,
      nonce,
      codeVerifier,
      ipAddress:
        requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        requestHeaders.get("x-real-ip") ||
        "127.0.0.1",
      userAgent: requestHeaders.get("user-agent") || undefined,
    });
    const redirectPath = result.pendingRegistrationToken
      ? "/register?oauth=google"
      : result.needsAvatar
        ? "/onboarding/pilih-avatar"
        : "/dashboard";
    const response = NextResponse.redirect(getGoogleAppUrl(redirectPath, request.url));
    if (result.rawSessionToken) {
      const sessionOptions = getSessionCookieOptions(result.rawSessionToken, true);
      response.cookies.set(sessionOptions.name, sessionOptions.value, {
        httpOnly: sessionOptions.httpOnly,
        secure: sessionOptions.secure,
        sameSite: sessionOptions.sameSite,
        path: sessionOptions.path,
        expires: sessionOptions.expires,
        maxAge: sessionOptions.maxAge,
      });
    }
    if (result.pendingRegistrationToken) {
      response.cookies.set(
        GOOGLE_PENDING_REGISTRATION_COOKIE,
        result.pendingRegistrationToken,
        getGoogleOAuthCookieOptions()
      );
    }
    response.cookies.set(GOOGLE_OAUTH_STATE_COOKIE, "", clearCookieOptions);
    response.cookies.set(GOOGLE_OAUTH_NONCE_COOKIE, "", clearCookieOptions);
    response.cookies.set(GOOGLE_OAUTH_VERIFIER_COOKIE, "", clearCookieOptions);
    return response;
  } catch {
    return fail();
  }
}
