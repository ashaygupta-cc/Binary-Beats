/**
 * botApi.ts — client for CP-Bot-owned data.
 *
 * Never talks to the bot directly. Everything goes through the site server's
 * /api/bot/* proxy, which holds BB_API_KEY, adds caching, and keeps the bot's
 * origin out of the browser. The bot stays the single source of truth; nothing
 * here computes ratings, points or streaks.
 */
import { API_ORIGIN } from "./apiBase";

const BASE = `${API_ORIGIN}/api/bot`;

async function get<T>(path: string, params?: Record<string, string | number | undefined>): Promise<T> {
  const url = new URL(`${BASE}${path}`, window.location.origin);
  for (const [k, v] of Object.entries(params ?? {})) {
    if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
  }
  const res = await fetch(url.toString(), { credentials: "include" });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new BotApiError(res.status, (body as { error?: string }).error ?? res.statusText);
  }
  return res.json() as Promise<T>;
}

async function post<T>(path: string, body?: unknown): Promise<T> {
  const url = new URL(`${BASE}${path}`, window.location.origin);
  const res = await fetch(url.toString(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
    credentials: "include",
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new BotApiError(res.status, (data as { error?: string }).error ?? res.statusText);
  }
  return res.json() as Promise<T>;
}

export class BotApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "BotApiError";
  }
}

// ───────────────────────────── types ─────────────────────────────

export interface CommunityStats {
  members: number;
  problems: number;
  solves: number;
  duels: number;
  verified_handles: number;
}

export interface DailyProblem {
  id: number;
  platform: string;
  problem_id: string;
  title: string | null;
  difficulty: string;
  points: number;
  assigned_date: string;
  set_by: string;
  week_label: string | null;
  month_label: string | null;
  solve_count: number;
}

export interface Solver {
  discord_id: string;
  discord_username: string;
  solved_at: string | null;
  points_awarded: number;
}

export interface PointsEntry {
  rank: number;
  discord_id: string;
  discord_username: string;
  points: number;
  solved: number;
}

export interface RatingEntry {
  rank: number;
  discord_id: string;
  discord_username: string;
  rating: number;
  wins: number;
  losses: number;
  draws: number;
  streak: number;
  bot_matches: number;
  updated_at: string | null;
}

export interface ProfileRating {
  mode: string;
  rating: number;
  wins: number;
  losses: number;
  draws: number;
  streak: number;
  /** Present on the board endpoint; the profile endpoint returns the raw
   *  duel_ratings row, so treat it as optional rather than assuming. */
  bot_matches?: number;
  updated_at?: string | null;
}

export interface Profile {
  user: { discord_id: string; discord_username: string; created_at: string | null };
  handles: { platform: string; handle: string; verified: boolean; linked_at: string | null }[];
  ratings: ProfileRating[];
  points: number;
  solved: number;
  streak: number;
  recent_solves: {
    platform: string;
    problem_id: string;
    title: string | null;
    difficulty: string;
    points_awarded: number;
    solved_at: string | null;
  }[];
}

export interface DuelRecord {
  id: number;
  mode: string;
  player1_id: string;
  player2_id: string | null;
  player1_name: string | null;
  player2_name: string | null;
  is_bot_match: boolean;
  bot_rating: number | null;
  status: string;
  winner_id: string | null;
  p1_games_won: number;
  p2_games_won: number;
  total_games: number;
  duel_number: number | null;
  started_at: string | null;
  ended_at: string | null;
}

export interface LiveDuel {
  id: number;
  mode: string;
  duel_number: number | null;
  is_bot_match: boolean;
  started_at: string | null;
  current_game: number;
  total_games: number;
  player1_name: string | null;
  player2_name: string | null;
}

export interface Announcement {
  id: string;
  body: string;
  author: string | null;
  posted_at: string | null;
}

export interface ApiContest {
  platform: string;
  id: string;
  name: string;
  start_ts: number;
  duration: number;
  url: string;
  start_iso: string;
}

// ───────────────────────────── calls ─────────────────────────────

let contestsCachePromise: Promise<{ contests: ApiContest[]; cached: boolean }> | null = null;

export const botApi = {
  stats: () => get<CommunityStats>("/stats"),
  modes: () => get<{ modes: string[] }>("/modes"),
  problems: (opts?: { limit?: number; platform?: string }) =>
    get<{ problems: DailyProblem[] }>("/problems", opts),
  solvers: (problemId: number) => get<{ solvers: Solver[] }>(`/problems/${problemId}/solvers`),
  pointsBoard: (scope: string, limit = 100) =>
    get<{ scope: string; entries: PointsEntry[] }>("/leaderboard/points", { scope, limit }),
  ratingBoard: (mode: string, limit = 100) =>
    get<{ mode: string; entries: RatingEntry[] }>("/leaderboard/rating", { mode, limit }),
  profile: (discordId: string) => get<Profile>(`/users/${discordId}`),
  duels: (opts?: { discord_id?: string; mode?: string; limit?: number }) =>
    get<{ duels: DuelRecord[] }>("/duels", opts),
  liveDuels: () => get<{ live: LiveDuel[] }>("/duels/live"),
  announcements: () => get<{ announcements: Announcement[] }>("/announcements"),
  contests: () => {
    if (!contestsCachePromise) {
      contestsCachePromise = get<{ contests: ApiContest[]; cached: boolean }>("/contests").catch((err) => {
        contestsCachePromise = null;
        throw err;
      });
    }
    return contestsCachePromise;
  },
};

// ── Discord channel mirror (Phase 2) ────────────────────────────────────────

export interface DiscordEmbedField { name: string; value: string; inline?: boolean }

export interface DiscordEmbed {
  title?: string;
  description?: string;
  url?: string;
  color?: number | null;
  timestamp?: string | null;
  fields?: DiscordEmbedField[];
  author?: { name: string; icon_url?: string; url?: string };
  footer?: { text: string; icon_url?: string };
  thumbnail?: { url: string };
  image?: { url: string };
}

export interface DiscordAttachment {
  id: string;
  filename: string;
  url: string;
  proxy_url: string;
  size: number;
  content_type: string | null;
  width: number | null;
  height: number | null;
  is_image: boolean;
  is_pdf: boolean;
}

export interface DiscordMessage {
  message_id: string;
  channel_id: string;
  channel_key: string;
  author_id: string | null;
  author_name: string | null;
  author_avatar: string | null;
  author_is_bot: boolean;
  content: string;
  embeds: DiscordEmbed[];
  attachments: DiscordAttachment[];
  thread_id: string | null;
  thread_name: string | null;
  is_pinned: boolean;
  reply_to_id: string | null;
  created_at: string;
  edited_at: string | null;
}

export interface DiscordThread {
  thread_id: string;
  parent_id: string;
  channel_key: string;
  name: string;
  editorial_date: string | null;
  message_count: number;
  has_pdf: boolean;
  is_archived: boolean;
  created_at: string;
}

export interface GuildSnapshot {
  guild_id: string;
  name: string | null;
  icon_url: string | null;
  member_count: number;
  online_count: number;
  boost_count: number;
  boost_tier: number;
  channel_count: number;
  role_count: number;
  created_at: string | null;
  updated_at: string;
}

export interface EditorialState {
  date: string;
  /** none = hide the section entirely, per the spec. */
  status: "none" | "coming_soon" | "available";
  thread?: DiscordThread;
  files?: DiscordAttachment[];
}

export interface RegisteredHandle {
  platform: string;
  handle: string;
  verified: boolean;
  linked_at: string;
}

/** Registered handles for a Discord member, straight from the bot's `handles`
 *  table — the single source of truth. Used to stop the site's own "link a
 *  handle" flows from creating a second, disconnected handle string for
 *  someone who already has one registered via the bot (`!setcf` etc). */
export const botUserApi = {
  handles: (discordId: string) =>
    get<{ user: { discord_id: string; discord_username: string }; handles: RegisteredHandle[] }>(
      `/users/${discordId}`
    ).catch(() => ({ user: null as any, handles: [] as RegisteredHandle[] })),
};

export interface RemoteTeamMember {
  id: number;
  name: string;
  role: string;
  linkedin_url: string;
  github_url: string | null;
  sort_order: number;
  created_at: string;
}

/** Team roster added at runtime via !team in Discord. */
export const teamApi = {
  list: () => get<{ members: RemoteTeamMember[] }>("/team").catch(() => ({ members: [] as RemoteTeamMember[] })),
};

export const discordApi = {
  channels: () => get<{ channels: { channel_key: string; message_count: number; latest_at: string | null }[] }>("/channels"),
  messages: (key: string, opts?: { limit?: number; before?: string; pinned?: string; q?: string; threads?: string }) =>
    get<{ channel_key: string; messages: DiscordMessage[]; next_before: string | null }>(
      `/channels/${key}/messages`, opts),
  threads: (key: string, limit = 100) =>
    get<{ channel_key: string; threads: DiscordThread[] }>(`/channels/${key}/threads`, { limit }),
  threadMessages: (threadId: string) =>
    get<{ thread_id: string; messages: DiscordMessage[] }>(`/threads/${threadId}/messages`),
  editorial: (isoDate: string) => get<EditorialState>(`/editorials/${isoDate}`),
  guild: () => get<GuildSnapshot>("/guild"),
  checkSubmissions: (discordId: string) =>
    post<{ success: boolean; results: string[]; earned: number }>("/problems/check", { discord_id: discordId }),
};
