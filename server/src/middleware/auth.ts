import type { Request, Response, NextFunction } from "express";
import { getSessionFromRequest } from "../auth.js";

declare global {
  namespace Express {
    interface Request {
      user?: {
        sub: string;
        email: string;
      };
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const session = getSessionFromRequest(req);
  if (!session) {
    res.status(401).json({ error: "UNAUTHENTICATED", message: "Not signed in." });
    return;
  }
  req.user = session;
  next();
}
