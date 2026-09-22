import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

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

/** Issued to a newly-invited (admin-created) customer so they can set their own password. */
export function signSetPasswordToken(userId: string): string {
  return jwt.sign({ sub: userId, purpose: "set_password" }, accessSecret(), { expiresIn: "7d" });
}

export function verifySetPasswordToken(token: string): { sub: string } {
  const payload = jwt.verify(token, accessSecret()) as { sub: string; purpose?: string };
  if (payload.purpose !== "set_password") throw new Error("Not a set-password token.");
  return payload;
}
