import { NextRequest, NextResponse } from "next/server";
import {
  GOOGLE_OAUTH_NONCE_COOKIE,
  GOOGLE_OAUTH_STATE_COOKIE,
  GOOGLE_OAUTH_VERIFIER_COOKIE,
  GOOGLE_PENDING_REGISTRATION_COOKIE,
  createGoogleAuthorizationUrl,
  createGooglePendingRegistrationCookie,
  getGoogleAppUrl,
  getGoogleErrorRedirect,
  getGoogleMode,
  getGoogleOAuthCookieOptions,
} from "@/shared/infrastructure/auth/google-oauth-service";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const mode = getGoogleMode(request.nextUrl.searchParams.get("mode"));

  // Model 1: Local Development Mock jika GOOGLE_CLIENT_ID belum diisi
  if (process.env.NODE_ENV === "development" && !process.env.GOOGLE_CLIENT_ID) {
    if (mode === "register") {
      const mockToken = createGooglePendingRegistrationCookie({
        subject: "google-dev-mock-guru-001",
        email: "guru.pembelajar@gmail.com",
        nama_lengkap: "Drs. Budi Setiawan, M.Pd",
      });
      const response = NextResponse.redirect(
        getGoogleAppUrl("/register?oauth=google", request.url)
      );
      const options = getGoogleOAuthCookieOptions();
      response.cookies.set(GOOGLE_PENDING_REGISTRATION_COOKIE, mockToken, options);
      return response;
    }
  }

  try {
    const authorization = createGoogleAuthorizationUrl(mode);
    const response = NextResponse.redirect(authorization.url);
    const options = getGoogleOAuthCookieOptions();
    response.cookies.set(GOOGLE_OAUTH_STATE_COOKIE, authorization.stateCookie, options);
    response.cookies.set(GOOGLE_OAUTH_NONCE_COOKIE, authorization.nonce, options);
    response.cookies.set(GOOGLE_OAUTH_VERIFIER_COOKIE, authorization.codeVerifier, options);
    return response;
  } catch {
    return NextResponse.redirect(getGoogleAppUrl(getGoogleErrorRedirect(mode), request.url));
  }
}
