import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE_NAME, verifyAdminToken } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const token = req.cookies.get(ADMIN_COOKIE_NAME)?.value;
  const user = verifyAdminToken(token);

  const hasGoogleOauth = !!process.env.GOOGLE_CLIENT_ID;

  if (!user) {
    return NextResponse.json({
      isAuthenticated: false,
      hasGoogleOauth,
    });
  }

  return NextResponse.json({
    isAuthenticated: true,
    user: {
      email: user.email,
      name: user.name,
      picture: user.picture,
    },
    hasGoogleOauth,
  });
}
