import { randomUUID } from "node:crypto";
import { Router, Request, Response } from "express";
import { eq } from "drizzle-orm";
import { OAuth2Client } from "google-auth-library";
import { authDb as db } from "../db/authDb.js";
import { users } from "../db/schema.js";
import {
  hashPassword,
  verifyPassword,
  signSession,
  setSessionCookie,
  clearSessionCookie,
  getSessionFromRequest,
} from "../auth.js";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || null;
const googleClient = GOOGLE_CLIENT_ID ? new OAuth2Client(GOOGLE_CLIENT_ID) : null;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type UserRow = typeof users.$inferSelect;

function publicUser(row: UserRow) {
  return { id: row.id, email: row.email, name: row.name, avatarUrl: row.avatarUrl };
}

function badRequest(res: Response, message: string) {
  res.status(400).json({ error: "BAD_REQUEST", message });
}

function authDbUnavailable(res: Response): boolean {
  if (db) return false;
  res.status(503).json({
    error: "AUTH_NOT_CONFIGURED",
    message: "Auth isn't set up yet — set AUTH_DATABASE_URL in server/.env.",
  });
  return true;
}

async function findByEmail(email: string): Promise<UserRow | undefined> {
  if (!db) return undefined;
  const rows = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return rows[0];
}

async function findById(id: string): Promise<UserRow | undefined> {
  if (!db) return undefined;
  const rows = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return rows[0];
}

const router = Router();

// GET /api/auth/config
router.get("/config", (req: Request, res: Response) => {
  res.json({ googleClientId: GOOGLE_CLIENT_ID });
});

// POST /api/auth/register
router.post("/register", async (req: Request, res: Response) => {
  if (authDbUnavailable(res)) return;

  try {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const name = typeof body.name === "string" ? body.name.trim() : "";

    if (!EMAIL_RE.test(email)) return badRequest(res, "Enter a valid email address.");
    if (password.length < 8) return badRequest(res, "Access code must be at least 8 characters.");
    if (!name) return badRequest(res, "Enter a display name.");

    const existing = await findByEmail(email);
    if (existing) {
      res.status(409).json({ error: "EMAIL_TAKEN", message: "An account with that email already exists." });
      return;
    }

    const row: UserRow = {
      id: randomUUID(),
      email,
      name,
      passwordHash: await hashPassword(password),
      googleId: null,
      avatarUrl: null,
      createdAt: new Date(),
    };
    await db!.insert(users).values(row);

    setSessionCookie(res, signSession({ sub: row.id, email: row.email }));
    res.json({ user: publicUser(row) });
  } catch (error: any) {
    console.error("Register error:", error);
    res.status(500).json({ error: "INTERNAL", message: error.message });
  }
});

// POST /api/auth/login
router.post("/login", async (req: Request, res: Response) => {
  if (authDbUnavailable(res)) return;

  try {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";

    const invalid = () => {
      res.status(401).json({ error: "INVALID_CREDENTIALS", message: "Incorrect email or access code." });
    };

    if (!email || !password) return invalid();

    const row = await findByEmail(email);
    if (!row) return invalid();

    if (!row.passwordHash) {
      res.status(401).json({
        error: "GOOGLE_ONLY_ACCOUNT",
        message: "This account was created with Google — use the Google button instead.",
      });
      return;
    }

    const ok = await verifyPassword(password, row.passwordHash);
    if (!ok) return invalid();

    setSessionCookie(res, signSession({ sub: row.id, email: row.email }));
    res.json({ user: publicUser(row) });
  } catch (error: any) {
    console.error("Login error:", error);
    res.status(500).json({ error: "INTERNAL", message: error.message });
  }
});

// POST /api/auth/google
router.post("/google", async (req: Request, res: Response) => {
  if (!googleClient || !GOOGLE_CLIENT_ID) {
    res.status(503).json({
      error: "GOOGLE_NOT_CONFIGURED",
      message: "Google sign-in isn't configured on this server yet.",
    });
    return;
  }
  if (authDbUnavailable(res)) return;

  try {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const credential = typeof body.credential === "string" ? body.credential : "";
    if (!credential) return badRequest(res, "Missing Google credential.");

    let payload;
    try {
      const ticket = await googleClient.verifyIdToken({ idToken: credential, audience: GOOGLE_CLIENT_ID });
      payload = ticket.getPayload();
    } catch {
      res.status(401).json({ error: "INVALID_GOOGLE_CREDENTIAL", message: "Could not verify Google credential." });
      return;
    }

    if (!payload?.sub || !payload.email) {
      res.status(401).json({ error: "INVALID_GOOGLE_CREDENTIAL", message: "Google credential missing required fields." });
      return;
    }

    const googleId = payload.sub;
    const email = payload.email.toLowerCase();
    const name = payload.name || email;
    const avatarUrl = payload.picture || null;

    const rows = await db!.select().from(users).where(eq(users.googleId, googleId)).limit(1);
    let row = rows[0];

    if (!row) {
      const existingByEmail = await findByEmail(email);
      if (existingByEmail) {
        // Same email already has a password account — link Google to it.
        await db!.update(users).set({ googleId, avatarUrl: existingByEmail.avatarUrl ?? avatarUrl }).where(eq(users.id, existingByEmail.id));
        row = { ...existingByEmail, googleId, avatarUrl: existingByEmail.avatarUrl ?? avatarUrl };
      } else {
        row = {
          id: randomUUID(),
          email,
          name,
          passwordHash: null,
          googleId,
          avatarUrl,
          createdAt: new Date(),
        };
        await db!.insert(users).values(row);
      }
    }

    setSessionCookie(res, signSession({ sub: row.id, email: row.email }));
    res.json({ user: publicUser(row) });
  } catch (error: any) {
    console.error("Google auth error:", error);
    res.status(500).json({ error: "INTERNAL", message: error.message });
  }
});

// POST /api/auth/logout
router.post("/logout", (req: Request, res: Response) => {
  clearSessionCookie(res);
  res.status(204).end();
});

// GET /api/auth/me
router.get("/me", async (req: Request, res: Response) => {
  if (authDbUnavailable(res)) return;

  try {
    const session = getSessionFromRequest(req);
    if (!session) {
      res.status(401).json({ error: "UNAUTHENTICATED", message: "Not signed in." });
      return;
    }

    const row = await findById(session.sub);
    if (!row) {
      clearSessionCookie(res);
      res.status(401).json({ error: "UNAUTHENTICATED", message: "Not signed in." });
      return;
    }

    res.json({ user: publicUser(row) });
  } catch (error: any) {
    console.error("Me auth error:", error);
    res.status(500).json({ error: "INTERNAL", message: error.message });
  }
});

export default router;
