import bcrypt from "bcryptjs";
import jwt, { type SignOptions } from "jsonwebtoken";

// Unset in dev (host-only cookie is fine on localhost). In production, set to
// the parent domain (e.g. ".myimage.fun") so auth cookies set by the API
// (tlvapi.myimage.fun) are also sent on requests to the web app's own domain
// (techlovev.myimage.fun) — without this, cookies are host-only to the API's
// domain and the web app's middleware never sees them.
export const cookieDomain = process.env.COOKIE_DOMAIN || undefined;

export interface AccessTokenPayload {
  sub: string;
  role: "customer" | "admin";
  impersonated_by?: string; // set when an admin is impersonating this user — see routes/admin.ts
}

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// No insecure fallback outside tests — a real deployment must set real secrets.
// (index.ts also checks this at startup so the failure is loud and immediate,
// not discovered on the first login request.)
function requireSecret(envVar: "JWT_ACCESS_SECRET" | "JWT_REFRESH_SECRET", testDefault: string): string {
  const secret = process.env[envVar];
  if (secret) return secret;
  if (process.env.NODE_ENV === "test") return testDefault;
  throw new Error(`${envVar} must be set — no default is used outside tests.`);
}

function accessSecret(): string {
  return requireSecret("JWT_ACCESS_SECRET", "test-access-secret");
}

function refreshSecret(): string {
  return requireSecret("JWT_REFRESH_SECRET", "test-refresh-secret");
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, accessSecret(), { expiresIn: "15m" });
}

/** Deliberately short-lived (5m) and no matching refresh token — an impersonation session expires on its own. */
export function signImpersonationToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, accessSecret(), { expiresIn: "5m" });
}

export function signRefreshToken(userId: string): string {
  return jwt.sign({ sub: userId }, refreshSecret(), { expiresIn: "7d" });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, accessSecret()) as AccessTokenPayload;
}

export function verifyRefreshToken(token: string): { sub: string } {
  return jwt.verify(token, refreshSecret()) as { sub: string };
}

/**
 * Issued to a newly-invited (admin-created) customer so they can set their own
 * password — also reused for self-service forgot-password with a shorter
 * expiry (see routes/auth.ts's /forgot-password), since both are "prove you
 * own this account, then set a new password" and need no separate token model.
 */
export function signSetPasswordToken(userId: string, expiresIn: NonNullable<SignOptions["expiresIn"]> = "7d"): string {
  return jwt.sign({ sub: userId, purpose: "set_password" }, accessSecret(), { expiresIn });
}

export function verifySetPasswordToken(token: string): { sub: string } {
  const payload = jwt.verify(token, accessSecret()) as { sub: string; purpose?: string };
  if (payload.purpose !== "set_password") throw new Error("Not a set-password token.");
  return payload;
}
