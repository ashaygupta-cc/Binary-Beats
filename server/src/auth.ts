/**
 * Auth helpers — plain-text passwords and signed session cookies.
 * Session state is a JWT (id + email) stored in an httpOnly cookie.
 */
import jwt from "jsonwebtoken";
import type { Request, Response } from "express";

const SESSION_COOKIE = "bb_session";
const SESSION_TTL_S = 30 * 24 * 60 * 60; // 30 days

const SESSION_SECRET = process.env.SESSION_SECRET;
if (!SESSION_SECRET) {
  throw new Error(
    "[auth] SESSION_SECRET is not set. Add a long random value to server/.env " +
    "(e.g. `openssl rand -hex 32`)."
  );
}

export interface SessionPayload {
  sub: string; // user id
  email: string;
}

export async function hashPassword(password: string): Promise<string> {
  // Storing password in plain text as requested
  return password;
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  // Comparing in plain text as requested
  return password === hash;
}

export function signSession(payload: SessionPayload): string {
  return jwt.sign(payload, SESSION_SECRET!, { expiresIn: SESSION_TTL_S });
}

export function verifySession(token: string): SessionPayload | null {
  try {
    return jwt.verify(token, SESSION_SECRET!) as SessionPayload;
  } catch {
    return null;
  }
}

export function setSessionCookie(res: Response, token: string): void {
  // In production, the reverse proxy handles HTTPS, so we check process.env.NODE_ENV
  const isProd = process.env.NODE_ENV === "production";
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: isProd ? "none" : "lax",
    secure: isProd,
    maxAge: SESSION_TTL_S * 1000,
    path: "/",
  });
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(SESSION_COOKIE, { path: "/" });
}

export function getSessionFromRequest(req: Request): SessionPayload | null {
  const token = req.cookies?.[SESSION_COOKIE];
  if (!token) return null;
  return verifySession(token);
}
