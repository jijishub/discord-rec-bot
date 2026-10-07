import { NextRequest, NextResponse } from "next/server";
import {
  ADMIN_COOKIE_NAME,
  createAdminToken,
  isAuthorizedAdminEmail,
} from "@/lib/auth";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error || !code) {
    return NextResponse.redirect(
      new URL(`/admin?error=${encodeURIComponent(error || "no_code")}`, req.url)
    );
  }

  // Verify CSRF state
  const savedState = req.cookies.get("jasmine_oauth_state")?.value;
  if (!state || !savedState || state !== savedState) {
    return NextResponse.redirect(
      new URL("/admin?error=invalid_csrf_state", req.url)
    );
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin;
  const redirectUri = `${appUrl}/api/auth/callback/google`;

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(
      new URL("/admin?error=missing_google_credentials", req.url)
    );
  }

  try {
    // 1. Exchange code for access token
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      console.error("Google token exchange error:", errText);
      return NextResponse.redirect(
        new URL("/admin?error=token_exchange_failed", req.url)
      );
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    // 2. Fetch authenticated user profile
    const userRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!userRes.ok) {
      return NextResponse.redirect(
        new URL("/admin?error=failed_to_fetch_userinfo", req.url)
      );
    }

    const userData = await userRes.json();
    const userEmail = userData.email;

    // 3. Verify authorized admin email against ADMIN_EMAIL
    if (!isAuthorizedAdminEmail(userEmail)) {
      return NextResponse.redirect(
        new URL(
          `/admin?error=unauthorized_email&email=${encodeURIComponent(userEmail)}`,
          req.url
        )
      );
    }

    // 4. Issue signed admin session token and set HTTP-only cookie
    const sessionToken = createAdminToken({
      email: userEmail,
      name: userData.name || "Jizelle",
      picture: userData.picture,
    });

    const response = NextResponse.redirect(new URL("/admin", req.url));
    response.cookies.set(ADMIN_COOKIE_NAME, sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    });

    // Clear temporary OAuth state cookie
    response.cookies.delete("jasmine_oauth_state");

    return response;
  } catch (err) {
    console.error("Google OAuth callback error:", err);
    return NextResponse.redirect(
      new URL("/admin?error=server_error", req.url)
    );
  }
}
