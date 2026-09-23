import { Router, type Response } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { User } from "../models/User.js";
import {
  cookieDomain,
  hashPassword,
  signAccessToken,
  signRefreshToken,
  signSetPasswordToken,
  verifyPassword,
  verifyRefreshToken,
  verifySetPasswordToken,
} from "../services/authService.js";
import { createPersonalOrganization } from "../services/organizationService.js";
import { enqueueEmail } from "../queues/emailQueue.js";

export const authRouter = Router();

authRouter.get("/me", requireAuth, async (req, res) => {
  const user = await User.findById(req.user!.id).select("-password_hash");
  if (!user) return res.status(401).json({ error: { code: "UNAUTHENTICATED", message: "Login required." } });
  res.json(user);
});

const isProd = process.env.NODE_ENV === "production";

function setAuthCookies(res: Response, accessToken: string, refreshToken: string) {
  const base = { httpOnly: true, sameSite: "lax" as const, secure: isProd, path: "/", domain: cookieDomain };
  res.cookie("access_token", accessToken, { ...base, maxAge: 15 * 60 * 1000 });
  res.cookie("refresh_token", refreshToken, { ...base, maxAge: 7 * 24 * 60 * 60 * 1000 });
}

const credentialsSchema = z.object({ email: z.string().email(), password: z.string().min(8) });

authRouter.post("/register", async (req, res) => {
  const parsed = z.object({ name: z.string().min(1) }).merge(credentialsSchema).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: { code: "INVALID_INPUT", message: parsed.error.issues[0].message } });

  const { name, email, password } = parsed.data;
  if (await User.findOne({ email })) {
    return res.status(409).json({ error: { code: "EMAIL_TAKEN", message: "An account with that email already exists." } });
  }

  const user = await User.create({ name, email, password_hash: await hashPassword(password), role: "customer" });
  await createPersonalOrganization(user._id, user.name);
  enqueueEmail("welcome", user.email, { name: user.name });
  const accessToken = signAccessToken({ sub: user._id.toString(), role: user.role });
  const refreshToken = signRefreshToken(user._id.toString());
  setAuthCookies(res, accessToken, refreshToken);
  res.status(201).json({ _id: user._id, name: user.name, email: user.email, role: user.role });
});

authRouter.post("/login", async (req, res) => {
  const parsed = credentialsSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: { code: "INVALID_INPUT", message: "Valid email and password required." } });

  const user = await User.findOne({ email: parsed.data.email });
  if (!user || !(await verifyPassword(parsed.data.password, user.password_hash))) {
    return res.status(401).json({ error: { code: "INVALID_CREDENTIALS", message: "Invalid email or password." } });
  }
  if (user.status === "disabled") {
    return res.status(403).json({ error: { code: "ACCOUNT_DISABLED", message: "This account has been deactivated." } });
  }

  const accessToken = signAccessToken({ sub: user._id.toString(), role: user.role });
  const refreshToken = signRefreshToken(user._id.toString());
  setAuthCookies(res, accessToken, refreshToken);
  res.json({ _id: user._id, name: user.name, email: user.email, role: user.role });
});

authRouter.post("/set-password", async (req, res) => {
  const parsed = z.object({ token: z.string().min(1), password: z.string().min(8) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: { code: "INVALID_INPUT", message: "token and password (min 8 chars) are required" } });

  let payload: { sub: string };
  try {
    payload = verifySetPasswordToken(parsed.data.token);
  } catch {
    return res.status(401).json({ error: { code: "INVALID_TOKEN", message: "This invite link is invalid or has expired." } });
  }

  const user = await User.findById(payload.sub);
  if (!user) return res.status(401).json({ error: { code: "INVALID_TOKEN", message: "This invite link is invalid or has expired." } });

  user.password_hash = await hashPassword(parsed.data.password);
  await user.save();

  const accessToken = signAccessToken({ sub: user._id.toString(), role: user.role });
  const refreshToken = signRefreshToken(user._id.toString());
  setAuthCookies(res, accessToken, refreshToken);
  res.json({ _id: user._id, name: user.name, email: user.email, role: user.role });
});

authRouter.post("/forgot-password", async (req, res) => {
  const parsed = z.object({ email: z.string().email() }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: { code: "INVALID_INPUT", message: "A valid email is required." } });

  const user = await User.findOne({ email: parsed.data.email });
  // Always the same response whether or not the account exists / is disabled —
  // a differing response here would let an attacker enumerate registered emails.
  if (user && user.status !== "disabled") {
    enqueueEmail("password-reset", user.email, {
      name: user.name,
      resetUrl: `${process.env.APP_URL ?? "http://localhost:3000"}/set-password?token=${signSetPasswordToken(user._id.toString(), "1h")}`,
    });
  }
  res.json({ message: "If an account exists for that email, a reset link has been sent." });
});

authRouter.post("/refresh", async (req, res) => {
  const token = req.cookies?.refresh_token;
  if (!token) return res.status(401).json({ error: { code: "UNAUTHENTICATED", message: "Login required." } });

  try {
    const payload = verifyRefreshToken(token);
    const user = await User.findById(payload.sub);
    if (!user) return res.status(401).json({ error: { code: "UNAUTHENTICATED", message: "Login required." } });

    const accessToken = signAccessToken({ sub: user._id.toString(), role: user.role });
    const refreshToken = signRefreshToken(user._id.toString());
    setAuthCookies(res, accessToken, refreshToken);
    res.status(204).end();
  } catch {
    res.status(401).json({ error: { code: "UNAUTHENTICATED", message: "Session expired." } });
  }
});

authRouter.post("/logout", (_req, res) => {
  res.clearCookie("access_token", { path: "/", domain: cookieDomain });
  res.clearCookie("refresh_token", { path: "/", domain: cookieDomain });
  res.status(204).end();
});
