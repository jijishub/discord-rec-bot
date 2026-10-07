import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE_NAME, createAdminToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { password } = body;

    const adminSecret =
      process.env.ADMIN_SECRET ||
      process.env.ADMIN_PASSWORD ||
      process.env.DISCORD_PUBLIC_KEY;

    if (!adminSecret) {
      return NextResponse.json(
        { success: false, error: "ADMIN_SECRET is not configured on the server." },
        { status: 500 }
      );
    }

    if (!password || password !== adminSecret) {
      return NextResponse.json(
        { success: false, error: "Invalid admin password or passcode." },
        { status: 401 }
      );
    }

    const adminEmail = process.env.ADMIN_EMAIL || "admin@jizellecasia.site";
    const sessionToken = createAdminToken({
      email: adminEmail,
      name: "Jizelle",
    });

    const response = NextResponse.json({
      success: true,
      user: {
        email: adminEmail,
        name: "Jizelle",
        isAdmin: true,
      },
    });

    response.cookies.set(ADMIN_COOKIE_NAME, sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    return response;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
