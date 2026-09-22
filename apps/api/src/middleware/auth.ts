import type { NextFunction, Request, Response } from "express";
import { verifyAccessToken } from "../services/authService.js";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: { id: string; role: "customer" | "admin"; impersonatedBy?: string };
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.access_token;
  if (!token) return res.status(401).json({ error: { code: "UNAUTHENTICATED", message: "Login required." } });

  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, role: payload.role, impersonatedBy: payload.impersonated_by };
    next();
  } catch {
    res.status(401).json({ error: { code: "UNAUTHENTICATED", message: "Session expired." } });
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ error: { code: "FORBIDDEN", message: "Admin access required." } });
  }
  next();
}
