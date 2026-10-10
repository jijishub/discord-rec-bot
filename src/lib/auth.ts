import { NextRequest } from "next/server";
import crypto from "crypto";

export const ADMIN_COOKIE_NAME = "jasmine_admin_session";

function getSecretKey(): string {
  const secret = process.env.ADMIN_SESSION_SECRET || process.env.GOOGLE_CLIENT_SECRET;
  if (!secret) throw new Error('Admin session signing secret is not configured.');
  return secret;
}

export interface AdminSessionUser {
  email: string;
  name?: string;
  picture?: string;
  isAdmin: boolean;
  exp: number;
}

/**
 * Creates an HMAC-signed session token containing user payload
 */
export function createAdminToken(user: { email: string; name?: string; picture?: string }): string {
  const secret = getSecretKey();
  const payload: AdminSessionUser = {
    email: user.email,
    name: user.name || "Jizelle",
    picture: user.picture,
    isAdmin: true,
    exp: Date.now() + 1000 * 60 * 60 * 24 * 7, // 7 days expiration
  };

  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto
    .createHmac("sha256", secret)
    .update(payloadB64)
    .digest("base64url");

  return `${payloadB64}.${signature}`;
}

/**
 * Verifies and decodes an HMAC-signed session token
 */
export function verifyAdminToken(token: string | undefined): AdminSessionUser | null {
  if (!token) return null;
  if (!process.env.ADMIN_SESSION_SECRET && !process.env.GOOGLE_CLIENT_SECRET) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;

  const [payloadB64, signature] = parts;
  const secret = getSecretKey();

  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(payloadB64)
    .digest("base64url");

  if (Buffer.byteLength(signature) !== Buffer.byteLength(expectedSignature) ||
      !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
    return null;
  }

  try {
    const payload: AdminSessionUser = JSON.parse(
      Buffer.from(payloadB64, "base64url").toString("utf-8")
    );

    if (Date.now() > payload.exp) {
      return null;
    }

    return payload.isAdmin === true && typeof payload.email === 'string' &&
      typeof payload.exp === 'number' && isAuthorizedAdminEmail(payload.email) ? payload : null;
  } catch {
    return null;
  }
}

/**
 * Checks if a given email is authorized to be Admin
 */
export function isAuthorizedAdminEmail(email: string): boolean {
  const configuredAdmins = process.env.ADMIN_EMAIL || process.env.ADMIN_EMAILS;
  if (!configuredAdmins) {
    return false;
  }

  const allowedList = configuredAdmins
    .split(",")
    .map((e) => e.trim().toLowerCase());

  return allowedList.includes(email.trim().toLowerCase());
}

/**
 * Validates whether the incoming NextRequest is from an authenticated admin via Google SSO session
 */
export function verifyAdminRequest(req: NextRequest | Request): boolean {
  // 1. Check HTTP-only cookie from Google SSO session
  if ("cookies" in req) {
    const cookieToken = req.cookies.get(ADMIN_COOKIE_NAME)?.value;
    if (cookieToken && verifyAdminToken(cookieToken)) {
      return true;
    }
  }

  // 2. Check Authorization Header (Bearer <signed_token>)
  const authHeader = req.headers.get("authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.slice(7).trim();
    if (token && verifyAdminToken(token)) {
      return true;
    }
  }

  return false;
}
