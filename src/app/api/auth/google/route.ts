import { NextRequest, NextResponse } from "next/server";
import {
  GOOGLE_OAUTH_NONCE_COOKIE,
  GOOGLE_OAUTH_STATE_COOKIE,
  GOOGLE_OAUTH_VERIFIER_COOKIE,
  createGoogleAuthorizationUrl,
  getGoogleErrorRedirect,
  getGoogleMode,
  getGoogleOAuthCookieOptions,
} from "@/shared/infrastructure/auth/google-oauth-service";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const mode = getGoogleMode(request.nextUrl.searchParams.get("mode"));

  try {
    const authorization = createGoogleAuthorizationUrl(mode);
    const response = NextResponse.redirect(authorization.url);
    const options = getGoogleOAuthCookieOptions();
    response.cookies.set(GOOGLE_OAUTH_STATE_COOKIE, authorization.stateCookie, options);
    response.cookies.set(GOOGLE_OAUTH_NONCE_COOKIE, authorization.nonce, options);
    response.cookies.set(GOOGLE_OAUTH_VERIFIER_COOKIE, authorization.codeVerifier, options);
    return response;
  } catch {
    return NextResponse.redirect(new URL(getGoogleErrorRedirect(mode), request.url));
  }
}
