/**
 * routes/discord.ts — Discord OAuth2 + Binary Beats guild membership gate.
 *
 * Replaces the email/password + Google flow in routes/auth.ts as the primary
 * identity. Discord is the identity; guild membership is the entitlement.
 *
 * Mount in server/src/index.ts alongside the existing routers:
 *   import discordRouter from "./routes/discord.js";
 *   app.use("/api/discord", discordRouter);
 *   app.use("/discord", discordRouter);
 *
 * Env required (server/.env):
 *   DISCORD_CLIENT_ID=
 *   DISCORD_CLIENT_SECRET=
 *   DISCORD_REDIRECT_URI=http://localhost:8787/api/discord/callback
 *   DISCORD_GUILD_ID=
 *   WEB_ORIGIN=http://localhost:5173
 *   SESSION_SECRET=              (already used by auth.ts)
 */
import { Router, type Request, type Response } from "express";
import crypto from "node:crypto";
import { signSession, verifySession, setSessionCookie, clearSessionCookie } from "../auth.js";

const router = Router();

const CLIENT_ID = process.env.DISCORD_CLIENT_ID ?? "";
const CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET ?? "";
const REDIRECT_URI = process.env.DISCORD_REDIRECT_URI ?? "";
const GUILD_ID = process.env.DISCORD_GUILD_ID ?? "";
const WEB_ORIGIN = process.env.WEB_ORIGIN ?? "http://localhost:5173";
const STATE_COOKIE = "bb_oauth_state";

const DISCORD_API = "https://discord.com/api/v10";
const SCOPES = ["identify", "guilds", "guilds.members.read"].join(" ");

export interface DiscordIdentity {
  id: string;
  username: string;
  globalName: string | null;
  avatarUrl: string | null;
  isMember: boolean;
  roles: string[];
}

/** In-memory cache so we don't hit Discord on every /me. 5 min is short
 *  enough that a fresh join unlocks features almost immediately. */
const memberCache = new Map<string, { at: number; value: { isMember: boolean; roles: string[] } }>();
const MEMBER_TTL_MS = 5 * 60 * 1000;

function avatarUrl(id: string, hash: string | null): string | null {
  if (!hash) return null;
  const ext = hash.startsWith("a_") ? "gif" : "png";
  return `https://cdn.discordapp.com/avatars/${id}/${hash}.${ext}?size=128`;
}

async function fetchGuildMembership(
  accessToken: string,
  discordId: string
): Promise<{ isMember: boolean; roles: string[] }> {
  const cached = memberCache.get(discordId);
  if (cached && Date.now() - cached.at < MEMBER_TTL_MS) return cached.value;

  let value = { isMember: false, roles: [] as string[] };
  try {
    const r = await fetch(`${DISCORD_API}/users/@me/guilds/${GUILD_ID}/member`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (r.ok) {
      const m = (await r.json()) as { roles?: string[] };
      value = { isMember: true, roles: m.roles ?? [] };
    }
    // 404 => user is not in the guild. Anything else we also treat as
    // "not a member" rather than throwing, so the site degrades to public
    // mode instead of erroring out when Discord is having a bad day.
  } catch {
    /* network blip — fall through as non-member, cache briefly */
  }
  memberCache.set(discordId, { at: Date.now(), value });
  return value;
}

/** GET /api/discord/login — kick off the OAuth dance. */
router.get("/login", (req: Request, res: Response) => {
  if (!CLIENT_ID || !REDIRECT_URI) {
    res.status(500).json({ error: "Discord OAuth is not configured" });
    return;
  }
  const state = crypto.randomBytes(16).toString("hex");
  res.cookie(STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 10 * 60 * 1000,
  });
  const url = new URL(`${DISCORD_API}/oauth2/authorize`);
  url.searchParams.set("client_id", CLIENT_ID);
  url.searchParams.set("redirect_uri", REDIRECT_URI);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", SCOPES);
  url.searchParams.set("state", state);
  url.searchParams.set("prompt", "none");
  res.redirect(url.toString());
});

/** GET /api/discord/callback — exchange code, check guild, set session. */
router.get("/callback", async (req: Request, res: Response) => {
  const { code, state } = req.query as { code?: string; state?: string };
  const expected = req.cookies?.[STATE_COOKIE];
  res.clearCookie(STATE_COOKIE);

  if (!code || !state || !expected || state !== expected) {
    res.redirect(`${WEB_ORIGIN}/?auth=state_mismatch`);
    return;
  }

  try {
    const tokenRes = await fetch(`${DISCORD_API}/oauth2/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        grant_type: "authorization_code",
        code,
        redirect_uri: REDIRECT_URI,
      }),
    });
    if (!tokenRes.ok) throw new Error(`token exchange failed: ${tokenRes.status}`);
    const token = (await tokenRes.json()) as { access_token: string };

    const meRes = await fetch(`${DISCORD_API}/users/@me`, {
      headers: { Authorization: `Bearer ${token.access_token}` },
    });
    if (!meRes.ok) throw new Error(`identify failed: ${meRes.status}`);
    const me = (await meRes.json()) as {
      id: string; username: string; global_name: string | null; avatar: string | null;
    };

    const { isMember, roles } = await fetchGuildMembership(token.access_token, me.id);

    // The session carries the Discord id. Membership is NOT baked into the
    // token — it is re-checked on /me so that joining (or leaving) the
    // server takes effect without forcing a re-login.
    const jwt = signSession({ sub: me.id, email: `${me.id}@discord` });
    setSessionCookie(res, jwt);

    // Stash the OAuth access token in a separate httpOnly cookie so /me can
    // re-verify membership later without another full OAuth round trip.
    res.cookie("bb_dc_at", token.access_token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.redirect(`${WEB_ORIGIN}/?auth=ok&member=${isMember ? 1 : 0}&roles=${roles.length}`);
  } catch (err) {
    console.error("[discord] callback error", err);
    res.redirect(`${WEB_ORIGIN}/?auth=error`);
  }
});

/** GET /api/discord/me — current identity + live membership status. */
router.get("/me", async (req: Request, res: Response) => {
  try {
    const session = verifySession(req.cookies?.bb_session ?? "");
    if (!session) {
      res.status(200).json({ authenticated: false });
      return;
    }
    const accessToken = req.cookies?.bb_dc_at as string | undefined;
    if (!accessToken) {
      res.status(200).json({ authenticated: false, reason: "token_expired" });
      return;
    }

    const meRes = await fetch(`${DISCORD_API}/users/@me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(5000),
    });
    if (!meRes.ok) {
      res.status(200).json({ authenticated: false, reason: "token_expired" });
      return;
    }
    const me = (await meRes.json()) as {
      id: string; username: string; global_name: string | null; avatar: string | null;
    };
    const { isMember, roles } = await fetchGuildMembership(accessToken, me.id);

    const identity: DiscordIdentity = {
      id: me.id,
      username: me.username,
      globalName: me.global_name,
      avatarUrl: avatarUrl(me.id, me.avatar),
      isMember,
      roles,
    };
    res.json({ authenticated: true, user: identity });
  } catch (err) {
    res.status(200).json({ authenticated: false });
  }
});

/** POST /api/discord/logout */
router.post("/logout", (req: Request, res: Response) => {
  clearSessionCookie(res);
  res.clearCookie("bb_dc_at");
  res.json({ ok: true });
});

/**
 * requireMember — Express middleware for every members-only endpoint.
 * Returns 403 with a machine-readable reason the frontend turns into the
 * "Join our Discord" gate card rather than a generic error.
 */
export async function requireMember(req: Request, res: Response, next: Function) {
  const session = verifySession(req.cookies?.bb_session ?? "");
  const accessToken = req.cookies?.bb_dc_at as string | undefined;
  if (!session || !accessToken) {
    res.status(401).json({ error: "not_authenticated" });
    return;
  }
  const { isMember, roles } = await fetchGuildMembership(accessToken, session.sub);
  if (!isMember) {
    res.status(403).json({ error: "not_a_member", guildId: GUILD_ID });
    return;
  }
  (req as Request & { discord?: { id: string; roles: string[] } }).discord = {
    id: session.sub,
    roles,
  };
  next();
}

export default router;
