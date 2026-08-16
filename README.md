# Binary Beats

A competitive programming and DSA practice platform. Browse real Codeforces and LeetCode problems, climb daily and weekly leaderboards, challenge other members to rated duels, and compete in timed Blitz Arena sessions — all tied to a Discord community.

**Stack:** React 19 · TypeScript · Vite · Tailwind CSS v4 · Express · Drizzle ORM · Neon PostgreSQL · Docker

---

## Table of Contents

- [Project Structure](#project-structure)
- [Features](#features)
- [Known Bugs / Open Issues](#known-bugs--open-issues)
- [Architecture](#architecture)
- [Database Schema](#database-schema)
- [API Routes](#api-routes)
- [Local Development](#local-development)
- [Environment Variables](#environment-variables)
- [Deployment](#deployment)
- [Design System](#design-system)
- [Contributing](#contributing)

---

## Project Structure

```
binary-beats/
├── src/                        # React frontend (Vite)
│   ├── App.tsx                 # Root — routing, auth state, theme
│   ├── main.tsx                # React entry point
│   ├── app.css                 # Global styles, CSS custom properties
│   ├── components/
│   │   ├── blitz/              # Blitz Arena UI components
│   │   │   ├── BlitzDuelView.tsx       # Main arena view
│   │   │   ├── HandleLinkCard.tsx      # CF/LC handle linking prompt
│   │   │   ├── MatchmakingCard.tsx     # Session setup + matchmaking
│   │   │   ├── MatchResultsAnalytics.tsx
│   │   │   ├── ProblemCard.tsx         # Problem tile in a blitz round
│   │   │   ├── Scoreboard.tsx          # Live blitz scoreboard
│   │   │   ├── SessionSetup.tsx        # Mode/handle config form
│   │   │   └── SessionTimer.tsx        # Countdown timer
│   │   ├── solve/              # Code editor + judge UI
│   │   │   ├── SolveWorkspace.tsx      # Split-pane editor shell
│   │   │   ├── CodeWorkspace.tsx       # Monaco-style code editor
│   │   │   ├── ProblemStatement.tsx    # Rendered problem statement
│   │   │   ├── StatementPane.tsx       # Statement panel wrapper
│   │   │   ├── SolveSidebar.tsx        # Test results + submit panel
│   │   │   ├── SubmissionHistoryPanel.tsx
│   │   │   ├── TestGrid.tsx            # Per-test-case result grid
│   │   │   ├── DiffViewer.tsx          # Expected vs actual diff
│   │   │   ├── SplitPane.tsx           # Resizable split pane
│   │   │   ├── adapters.ts             # Problem format normalization
│   │   │   └── types.ts                # Shared solve types
│   │   ├── pages/              # Route-level page components (lazy loaded)
│   │   │   ├── CPDSAContentPage.tsx    # Primary CP/DSA content panel
│   │   │   ├── DailyProblemsPage.tsx   # Legacy daily problems route
│   │   │   ├── LeaderboardsPage.tsx    # Multi-board leaderboard hub
│   │   │   ├── CommunityPage.tsx       # Public community overview
│   │   │   ├── ChannelPage.tsx         # Discord channel thread view
│   │   │   ├── ProfilePage.tsx         # Member profile page
│   │   │   ├── TeamPage.tsx            # Team/credits page
│   │   │   └── AboutPage.tsx           # About the platform
│   │   ├── discord/            # Discord-specific UI components
│   │   ├── Effects/            # Visual effect components
│   │   ├── renderers/          # Markdown/LaTeX problem renderers
│   │   ├── ui/                 # Shared primitive components
│   │   │   └── (Button, Panel, Tag, VerdictBadge, StatNumeral,
│   │   │       Countdown, Eyebrow, Divider, RatingBadge,
│   │   │       MemberGate, PageShell, ...)
│   │   ├── CommunityView.tsx   # Member-only community feed
│   │   ├── LeaderboardView.tsx # Session leaderboard (blitz)
│   │   ├── LeetCodeDashboard.tsx # Home dashboard
│   │   ├── HeroSection.tsx
│   │   ├── Navbar.tsx
│   │   ├── Footer.tsx
│   │   └── ProblemOrbit.tsx    # Floating problem orbit widget
│   ├── hooks/                  # React hooks
│   │   ├── useAuth.ts                  # Email/password auth state
│   │   ├── useDiscordAuth.ts           # Discord OAuth state + membership gate
│   │   ├── useCfHandle.ts              # Linked Codeforces handle
│   │   ├── useBotData.ts               # CP-Bot API data fetching
│   │   ├── useProblems.ts              # Problem list fetching + filters
│   │   ├── useProblemStatement.ts      # Single problem statement fetch
│   │   ├── useSubmissionHistory.ts     # User's past submissions
│   │   ├── useSessionPolling.ts        # Blitz session live polling
│   │   ├── useCodeDraft.ts             # Persisted code draft (localStorage)
│   │   ├── useCountUp.ts               # Animated counter
│   │   └── useScramble.ts              # Text scramble animation
│   ├── lib/
│   │   ├── router.ts           # Hash-based client router
│   │   ├── apiBase.ts          # Base fetch wrapper (reads VITE_API_URL)
│   │   └── botApi.ts           # Typed CP-Bot API client
│   ├── data/
│   │   └── site.ts             # Nav map, board config, shared constants
│   ├── utils/
│   │   └── audio.ts            # Synth sound effects (click/hover)
│   └── styles/                 # Additional style modules
│
├── server/                     # Express backend
│   ├── src/
│   │   ├── index.ts            # App entry — Express setup, route mounts
│   │   ├── auth.ts             # JWT signing/verification, cookie helpers
│   │   ├── codeforces.ts       # CF API client
│   │   ├── blitzAlgorithm.ts   # Problem selection logic for blitz
│   │   ├── blitzSession.ts     # Session model factory
│   │   ├── sessionStore.ts     # Blitz session persistence (Postgres)
│   │   ├── sessionPoller.ts    # Background poller — expires stale sessions
│   │   ├── problemCache.ts     # In-memory problem pool cache
│   │   ├── problemDb.ts        # Problem DB query helpers
│   │   ├── hfTestFetch.ts      # Hugging Face parquet test data fetcher
│   │   ├── db/
│   │   │   ├── index.ts        # Drizzle client (dataset DB)
│   │   │   ├── authDb.ts       # Drizzle client (auth DB — separate Neon project)
│   │   │   └── schema.ts       # Full Drizzle schema (problems, tests, blitz_sessions, users)
│   │   ├── routes/
│   │   │   ├── auth.ts         # POST /register /login /google, GET /me, POST /logout
│   │   │   ├── discord.ts      # Discord OAuth callback + /me + requireMember middleware
│   │   │   ├── cf.ts           # Codeforces handle link/verify
│   │   │   ├── leetcode.ts     # LeetCode handle link/verify
│   │   │   ├── problems.ts     # Problem listing + statement fetch
│   │   │   ├── blitz.ts        # Blitz Arena session CRUD
│   │   │   ├── duel.ts         # Duel challenge/accept/decline/finish
│   │   │   ├── judge.ts        # Code submission + verdict streaming
│   │   │   ├── leaderboard.ts  # Daily/weekly rankings
│   │   │   ├── bot.ts          # Read-through proxy to CP-Bot API
│   │   │   └── discord.ts      # Discord OAuth + membership gate
│   │   ├── judge/
│   │   │   ├── executor.ts     # g++ compile + sandboxed run + prlimit memory cap
│   │   │   ├── judge.ts        # Verdict logic (AC/WA/TLE/RE/CE)
│   │   │   └── runStore.ts     # In-progress run tracking
│   │   ├── middleware/
│   │   │   └── auth.ts         # requireAuth middleware
│   │   └── scripts/
│   │       ├── ingestProblems.ts       # One-time parquet → Neon ingest
│   │       └── migrateFromSqlite.ts    # Legacy SQLite migration helper
│   ├── Dockerfile              # Multi-stage build — installs g++ + prlimit
│   ├── drizzle.config.ts
│   ├── package.json
│   └── tsconfig.json
│
├── public/                     # Static assets served by Vite
│   ├── avatars/                # Member avatars (real usernames)
│   └── avatar/                 # Anime/character avatars
├── index.html                  # Main SPA entry
├── vite.config.ts              # Vite config — proxies /api → :4000, code splitting
├── tsconfig.app.json
├── tsconfig.node.json
├── tsconfig.json
├── package.json                # Frontend deps + concurrently dev script
├── render.yaml                 # Render Blueprint — provisions backend Docker service
├── vercel.json                 # Vercel config — pins Vite build + output dir
├── .env.example                # Frontend env template
└── server/.env.example         # Backend env template
```

---

## Features

### Authentication

- Discord OAuth 2.0 — primary identity. Login hits `GET /api/discord/callback`; a session JWT is set as an `httpOnly` cookie.
- Email/password and Google OAuth — legacy paths backed by a separate Neon `users` table (`AUTH_DATABASE_URL`). These routes return `503 AUTH_NOT_CONFIGURED` when the auth database is not connected, without crashing the rest of the API.
- Membership gating — Discord server membership is re-checked on every `/api/discord/me` call (5-minute server-side cache), not baked into the session. Joining or leaving the server takes effect within ~5 minutes without re-login. Non-members receive a `403 not_a_member` response, rendered as a join-gate card on the frontend.

### Codeforces Integration

- Link and verify a real CF handle via a profile-based verification code (a specific problem submission is required to prove ownership).
- Verified handle's rating is pulled from the CF API and surfaced on leaderboards and the blitz matchmaking card.

### LeetCode Integration

- Link and verify a LeetCode username via the same profile-based verification method.

### Problem Sets

- **CP mode** — thousands of real Codeforces problems ingested from a Hugging Face parquet dataset. Stored with full metadata: rating, tags, time/memory limits, statement (HTML), examples, test cases (gzip-compressed bytea).
- **DSA mode** — a curated rotating pool of real LeetCode problems (Easy/Medium/Hard), linked out to the original problem page.

### Local Judge

- Compile-and-run judge for CP problems. Accepts C++ code, compiles with `g++ -O2 -std=gnu++17`, runs against official test cases fetched from the database.
- Memory limiting via `prlimit` (Linux only); falls back gracefully if not available.
- Verdicts: AC / WA / TLE / RE / CE with per-test timing and peak RSS.
- Output is streamed back to the frontend via the `/api/judge` route. Stale temp directories are swept on startup.

### Blitz Arena

- Timed head-to-head or solo sessions. Modes: `cf_blitz` (Codeforces problems) and `dsa_blitz` (LeetCode problems).
- Problem selection uses a rating-aware algorithm (`blitzAlgorithm.ts`) that finds unsolved problems near the player's current rating.
- Sessions are persisted in Postgres (`blitz_sessions` table) — survives server restarts. A background poller (`sessionPoller.ts`) expires stale sessions.
- Falls back to a local static problem pool if the CP-Bot API is unreachable.

### Duels

- Challenge any member by Discord user ID. Rating gap limited to 300 points.
- **CP duel** — one problem picked near the average rating of both players.
- **DSA duel** — one Easy, one Medium, one Hard problem per match.
- Full lifecycle: `pending` → `in_progress` → `completed` / `declined`.
- Currently stored in-memory (`duelStore` Map) — does not survive a server restart. Tracked as a known bug.

### Leaderboards

- Daily and weekly rankings pulled from the CP-Bot API via a read-through proxy (`/api/bot`).
- Seven separate boards, each with its own search and pagination.
- The proxy caches responses per-path with a per-route TTL, serves stale data on upstream failure, and never exposes `BB_API_KEY` to the browser.

### Community Feed (member-only)

- Discord channel and thread viewer, backed by the CP-Bot API.

### Routing

- Hash-based (`#/page`) — no server rewrite needed for the static Vite build. Deep links survive a page refresh with zero config.
- All page components are route-level lazy-loaded via `React.lazy`.

---

## Known Bugs / Open Issues

These are confirmed bugs — contributions to fix any of them are welcome.

**Backend**

| # | File | Bug |
|---|------|-----|
| 1 | `server/src/routes/duel.ts` | Duels are stored in a plain `Map` — lost on every server restart. Needs Postgres persistence via Drizzle (a `duels` table). |
| 2 | `server/src/routes/duel.ts` | Player ratings are hardcoded to `1200` for both participants. Should read the verified CF rating from the user's session/profile. |
| 3 | `server/src/routes/auth.ts` | `hashPassword` in `server/src/auth.ts` returns its input unchanged — passwords are stored in plain text. Either fix bcrypt hashing or remove the email/password routes entirely now that Discord OAuth is live. |
| 4 | `server/src/index.ts` | Every route is double-mounted at both `/api/x` and `/x`. The root-path mounts (`/auth`, `/cf`, etc.) are redundant and widen the attack surface unnecessarily. |
| 5 | `server/src/index.ts` | CORS `origin` callback reflects any origin (`origin || "*"`) — effectively disables CORS in production. Should be locked to `WEB_ORIGIN`. |

**Frontend**

| # | File | Bug |
|---|------|-----|
| 6 | `src/hooks/useDiscordAuth.ts` | Auth `refresh()` is called on every mount that detects `?auth=ok` in the URL query string. If the `?auth=ok` cleanup `replaceState` call races with a fast re-render, `refresh` can fire twice. |
| 7 | `src/components/solve/CodeWorkspace.tsx` | Code drafts are persisted per problem key to `localStorage` via `useCodeDraft`, but the draft is never cleared after a successful submission — stale code reappears on revisit. |

**Infrastructure**

| # | File | Bug |
|---|------|-----|
| 8 | `render.yaml` | `AUTH_DATABASE_URL` has `sync: false` but no `required: false` annotation — Render treats it as a required secret and blocks the first deploy until it is set manually, even though the app handles its absence gracefully at runtime. |

---

## Architecture

```
Browser
  │
  ├── Vite dev server (:5173)  ──proxy /api──►  Express API (:4000)
  │         │                                        │
  │     React SPA                           ┌────────┴────────┐
  │     Hash router                         │                 │
  │     Discord OAuth (redirect)       Neon Postgres     CP-Bot API
  │                                    ├── dataset DB    (read-through
  │                                    │   (problems,     proxy, TTL
  │                                    │    tests,        cached)
  │                                    │    blitz_sessions)
  │                                    └── auth DB
  │                                        (users)
  │
  └── Production
        Vercel (static Vite build)  ──VITE_API_URL──►  Render / Docker
                                                         (Express + g++)
```

**Why the backend cannot run on Vercel:** the judge shells out to `g++`, writes compiled binaries to the filesystem, and runs them as child processes. Vercel functions are stateless, ephemeral, and have no `g++`. The session poller also requires a persistent process. The backend is Docker-based and runs anywhere that supports containers.

**Two separate Neon databases:**
- `DATABASE_URL` — the problem/test dataset. Large (near free-tier storage limit). Read-heavy.
- `AUTH_DATABASE_URL` — the `users` table only. Kept separate to avoid running the dataset DB near capacity.

---

## Database Schema

Defined in `server/src/db/schema.ts` via Drizzle ORM.

| Table | Key columns | Notes |
|-------|------------|-------|
| `problems` | `problem_key` (PK), `contest_id`, `problem_index`, `title`, `rating`, `tags` (jsonb), `description`, `examples` (jsonb), `tests_complete`, `has_checker` | Full CF problem metadata + statement. Indexed on `rating`, `contest_id`, and judgeable flag. |
| `tests` | `problem_key` + `test_index` (composite PK), `input` (bytea), `output` (bytea) | Official test cases stored gzip-compressed. Cascades on problem delete. |
| `blitz_sessions` | `id`, `mode`, `handles` (jsonb), `ratings` (jsonb), `problems` (jsonb), `results` (jsonb), `status`, `created_at_seconds` | Persistent blitz session state. Replaces the old in-memory Map. |
| `ingest_meta` | `file` (PK), `status`, `rows`, `ingested_at` | Tracks which parquet files have been ingested to prevent re-runs. |
| `users` | `id`, `email`, `name`, `password_hash`, `google_id`, `avatar_url`, `created_at` | Lives in a separate Neon project (`AUTH_DATABASE_URL`). Supports password and/or Google sign-in. |

Run migrations with:

```bash
cd server
npm run db:push     # push schema to Neon
npm run db:studio   # open Drizzle Studio
```

---

## API Routes

All routes are mounted under `/api/`. The server also mounts them at the root path (e.g. `/auth`) — see bug #4.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/health` | — | Health check |
| POST | `/api/auth/register` | — | Email/password registration |
| POST | `/api/auth/login` | — | Email/password login |
| POST | `/api/auth/google` | — | Google ID token sign-in |
| POST | `/api/auth/logout` | — | Clear session cookie |
| GET | `/api/auth/me` | cookie | Current user |
| GET | `/api/discord/login` | — | Redirect to Discord OAuth |
| GET | `/api/discord/callback` | — | OAuth callback → sets session cookie |
| GET | `/api/discord/me` | cookie | Discord user + membership status |
| POST | `/api/discord/logout` | — | Clear Discord session |
| GET | `/api/cf/handle` | cookie | Get linked CF handle |
| POST | `/api/cf/link` | cookie | Start CF handle verification |
| POST | `/api/cf/verify` | cookie | Confirm CF handle via submission |
| GET | `/api/leetcode/handle` | cookie | Get linked LC handle |
| POST | `/api/leetcode/link` | cookie | Start LC handle verification |
| POST | `/api/leetcode/verify` | cookie | Confirm LC handle |
| GET | `/api/problems` | — | Paginated problem list with filters |
| GET | `/api/problems/:key` | — | Single problem statement |
| POST | `/api/blitz/sessions` | — | Create blitz session |
| GET | `/api/blitz/sessions/:id` | — | Get session state |
| POST | `/api/blitz/sessions/:id/end` | — | End and delete session |
| POST | `/api/duel/challenge` | cookie | Challenge a user to a duel |
| GET | `/api/duel/pending` | cookie | List incoming pending duels |
| POST | `/api/duel/:id/accept` | cookie | Accept a duel |
| POST | `/api/duel/:id/decline` | cookie | Decline a duel |
| POST | `/api/duel/:id/finish` | cookie | Mark duel complete with winner |
| POST | `/api/judge/submit` | — | Submit C++ code, returns verdict |
| GET | `/api/leaderboard/:board` | — | Leaderboard data |
| GET | `/api/bot/*` | — | Read-through proxy to CP-Bot API |

---

## Local Development

### Prerequisites

- Node.js 20+
- `g++` (for the local judge — skip if not testing judge features)
- A Discord application with OAuth2 configured
- Two Neon Postgres projects (or one, with `AUTH_DATABASE_URL` left unset to disable legacy auth)
- The CP-Bot running locally or a deployed instance (optional — bot-backed pages show a retry card without it)

### Setup

```bash
# 1. Install dependencies
npm install
cd server && npm install && cd ..

# 2. Configure environment
cp .env.example .env.local          # frontend
cp server/.env.example server/.env  # backend — fill in all required values

# 3. Push the DB schema (first time only)
cd server && npm run db:push && cd ..

# 4. Start everything
npm run dev
# Starts Vite (:5173) and the Express server (:4000) concurrently.
# Or separately:
npm run dev:client   # Vite only
npm run dev:server   # Express only
```

Open [http://localhost:5173](http://localhost:5173).

### Discord OAuth redirect

Register this URI verbatim in the [Discord Developer Portal](https://discord.com/developers/applications) under **OAuth2 → Redirects**:

```
http://localhost:4000/api/discord/callback
```

Port `4000` — the backend, not Vite. If this entry is missing, login fails silently and you land back on the site logged out with no error.

### Verify the wiring

```bash
curl http://localhost:4000/api/health        # backend alive
curl http://localhost:10000/api/stats        # bot alive (if running)
curl http://localhost:4000/api/bot/stats     # full proxy chain
```

### Type-check

```bash
npm run check               # frontend tsc
cd server && npm run check  # backend tsc
```

---

## Environment Variables

### Frontend — `.env.local`

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_API_URL` | No (local) / Yes (prod) | Backend origin. Leave empty locally — Vite proxies `/api` to `:4000`. Set to the full backend URL on Vercel, e.g. `https://binary-beats-api.onrender.com`. |
| `VITE_DISCORD_INVITE` | Yes | Public Discord invite URL shown on join buttons and the member gate. |

### Backend — `server/.env`

| Variable | Required | Description |
|----------|----------|-------------|
| `NODE_ENV` | No | `development` or `production`. |
| `PORT` | No | Defaults to `4000`. Render injects this automatically. |
| `WEB_ORIGIN` | Yes | Frontend origin for CORS and post-OAuth redirect. |
| `SESSION_SECRET` | Yes | Long random secret for JWT signing. Generate: `openssl rand -hex 32`. |
| `DISCORD_CLIENT_ID` | Yes | From Discord Developer Portal → OAuth2. |
| `DISCORD_CLIENT_SECRET` | Yes | Same. Rotate if ever committed. |
| `DISCORD_REDIRECT_URI` | Yes | Must be registered verbatim in the portal. |
| `DISCORD_GUILD_ID` | Yes | Right-click your server with Developer Mode on → Copy Server ID. |
| `BOT_API_URL` | No | Base URL of the CP-Bot service. Blitz falls back to a local pool if unset. |
| `BB_API_KEY` | No | Shared secret between backend and bot. Generate: `openssl rand -hex 32`. Must match the bot's `BB_API_KEY`. |
| `DATABASE_URL` | Yes | Neon connection string — problem/test dataset. |
| `AUTH_DATABASE_URL` | No | Neon connection string — users table. Without it, `/api/auth/*` returns `503` instead of crashing. |
| `GOOGLE_CLIENT_ID` | No | Google Cloud Console → OAuth client ID. Leave unset to disable Google sign-in. |

---

## Deployment

### Frontend → Vercel

1. Import the repo in the [Vercel dashboard](https://vercel.com/new). `vercel.json` pins the build command and output directory.
2. Set `VITE_API_URL` to the backend's public URL in **Settings → Environment Variables**.
3. Deploy. Redeploy whenever `VITE_API_URL` changes (Vite bakes env vars into the bundle at build time).

`.vercelignore` excludes `server/` and `design/` from the Vercel upload.

### Backend → Render (default)

1. **Render dashboard → New → Blueprint** — point it at this repo. Render reads `render.yaml` and provisions a Docker web service from `server/Dockerfile`.
2. Set the `sync: false` secrets in Render's dashboard: `DATABASE_URL`, `AUTH_DATABASE_URL`, `SESSION_SECRET`, `WEB_ORIGIN`, `DISCORD_*`, `BOT_API_URL`, `BB_API_KEY`. `SESSION_SECRET` can be auto-generated by Render (`generateValue: true` in `render.yaml`).
3. Render health-checks `GET /api/health` and routes traffic once it responds `200`.
4. Copy the resulting URL into Vercel's `VITE_API_URL` and redeploy the frontend.

**The Dockerfile** (`server/Dockerfile`) is a two-stage build:
- Stage 1: Node 20 slim → `npm ci` → `tsc` (compiles to `dist/`)
- Stage 2: Node 20 slim → installs `g++` and `util-linux` (for `prlimit`) → copies only `dist/` from stage 1

Works unchanged on Railway, Fly.io, or any Docker host. To switch hosts, deploy the same `Dockerfile` to the new platform, set the same env vars, update `VITE_API_URL` in Vercel, and decommission the old service.

### Database bootstrap (first time only)

The problem/test dataset is not bundled — it must be ingested once from parquet sources into a fresh Neon database:

```bash
cd server
DATABASE_URL=<your-neon-url> npm run ingest
```

This only needs to run once per new database. It is not required for development if you point `DATABASE_URL` at an existing populated database.

---

## Design System

The UI follows a **Scoreboard Brutalism** design language: dark-first, sharp corners, hard offset "sticker" shadows, thick borders, no blur, no grain.

**Tokens** (defined as CSS custom properties in `src/app.css`):

| Token | Dark | Light | Role |
|-------|------|-------|------|
| `--bb-ground` | `#0B0C0E` | `#F2F2ED` | Page background |
| `--bb-surface` | `#16181C` | `#FFFFFF` | Card / panel background |
| `--bb-ink` | — | — | Primary text |
| `--bb-yellow` | `#FFD400` | — | Single loud accent — CTAs, active states, brand |
| `--bb-success` | `#35D46A` | — | AC verdict |
| `--bb-danger` | `#E8362B` | — | WA / RE / CE / destructive |
| `--bb-warning` | `#FF9F1C` | — | TLE / pending |
| `--bb-rival` | `#3AA0FF` | — | Opponent identity in duels only |

**Typography:**
- Display headings — Big Shoulders Display (condensed, heavy)
- HUD numerals (ratings, timers, ranks) — Orbitron
- Body — Inter
- Monospace (code, data labels) — JetBrains Mono

**Shared UI primitives** live in `src/components/ui/` — `Button`, `Panel`, `Tag`, `VerdictBadge`, `StatNumeral`, `Countdown`, `Eyebrow`, `Divider`, `RatingBadge`, `MemberGate`. Use these instead of hand-rolling Tailwind utility strings.

---

## Contributing

The project is open source. Contributions are welcome, especially fixes for the bugs listed above.

**Before opening a PR:**

1. Run the type-checker on both packages and confirm it is clean:
   ```bash
   npm run check
   cd server && npm run check
   ```
2. Run `npm run build` from the repo root and confirm it succeeds.
3. Keep changes focused — one concern per PR.
4. Match the existing code style (no new frameworks, no new UI libraries, no new CSS conventions outside the design token system).
5. Do not commit `.env` files, `node_modules/`, `dist/`, or the `server/data/` ingest directory.

**Good first issues** (from the bug table above):

- Persist duels in Postgres — `server/src/routes/duel.ts` bug #1
- Fix duel player ratings — `server/src/routes/duel.ts` bug #2
- Lock CORS to `WEB_ORIGIN` — `server/src/index.ts` bug #5
- Remove redundant root-path route mounts — `server/src/index.ts` bug #4
- Clear code drafts after successful submission — `src/components/solve/CodeWorkspace.tsx` bug #7

---

## Credits

NewlAsh · akrist-rai
