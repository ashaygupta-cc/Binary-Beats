/**
 * Drizzle ORM schema for Binary Beats — Neon PostgreSQL.
 *
 * Tables:
 *   problems       — CF problem metadata + statement
 *   tests          — gzip-compressed official test inputs/outputs (bytea)
 *   blitz_sessions — persistent sessions (replaces in-memory Map)
 *   ingest_meta    — tracks which parquet files have been ingested
 *   users          — account records (password and/or Google sign-in);
 *                    lives in a separate Neon project, see db/authDb.ts
 */
import {
  pgTable,
  text,
  integer,
  boolean,
  jsonb,
  timestamp,
  primaryKey,
  index,
  uniqueIndex,
  customType,
} from "drizzle-orm/pg-core";

// ─── bytea custom type ───────────────────────────────────────────────────────

const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType() {
    return "bytea";
  },
});

// ─── problems ───────────────────────────────────────────────────────────────

export const problems = pgTable(
  "problems",
  {
    problemKey: text("problem_key").primaryKey(),
    contestId: integer("contest_id").notNull(),
    problemIndex: text("problem_index").notNull(),
    title: text("title"),
    rating: integer("rating"),
    tags: jsonb("tags").notNull().default("[]").$type<string[]>(),
    timeLimitMs: integer("time_limit_ms"),
    memoryLimitMb: integer("memory_limit_mb"),
    description: text("description"),
    inputFormat: text("input_format"),
    outputFormat: text("output_format"),
    note: text("note"),
    examples: jsonb("examples").notNull().default("[]").$type<{ input: string; output: string }[]>(),
    interactive: boolean("interactive").notNull().default(false),
    testsComplete: boolean("tests_complete").notNull().default(false),
    testCount: integer("test_count").notNull().default(0),
    hasChecker: boolean("has_checker").notNull().default(false),
    checkerSource: bytea("checker_source"),
    editorial: text("editorial"),
  },
  (table) => [
    index("idx_problems_judgeable").on(table.testsComplete, table.interactive, table.hasChecker),
    index("idx_problems_rating").on(table.rating),
    index("idx_problems_contest").on(table.contestId),
  ]
);

// ─── tests ──────────────────────────────────────────────────────────────────

export const tests = pgTable(
  "tests",
  {
    problemKey: text("problem_key")
      .notNull()
      .references(() => problems.problemKey, { onDelete: "cascade" }),
    testIndex: integer("test_index").notNull(),
    input: bytea("input").notNull(),
    output: bytea("output").notNull(),
  },
  (table) => [primaryKey({ columns: [table.problemKey, table.testIndex] })]
);

// ─── blitz_sessions ─────────────────────────────────────────────────────────

export const blitzSessions = pgTable("blitz_sessions", {
  id: text("id").primaryKey(),
  mode: text("mode").notNull(),
  handles: jsonb("handles").notNull().$type<string[]>(),
  displayHandles: jsonb("display_handles").notNull().$type<Record<string, string>>(),
  ratings: jsonb("ratings").notNull().$type<Record<string, number | null>>(),
  baselineSubmissionId: jsonb("baseline_submission_id").notNull().$type<Record<string, number>>(),
  problems: jsonb("problems").notNull().$type<object[]>(),
  results: jsonb("results").notNull().$type<Record<string, Record<string, number>>>(),
  solveSources: jsonb("solve_sources").$type<Record<string, Record<string, string>>>(),
  status: text("status").notNull().default("active"),
  createdAtSeconds: integer("created_at_seconds").notNull(),
  finishedAtSeconds: integer("finished_at_seconds"),
});

// ─── ingest_meta ─────────────────────────────────────────────────────────────

export const ingestMeta = pgTable("ingest_meta", {
  file: text("file").primaryKey(),
  status: text("status").notNull(),
  rows: integer("rows"),
  ingestedAt: timestamp("ingested_at", { withTimezone: true }),
});

// ─── users ──────────────────────────────────────────────────────────────────
// A user can have a password, a linked Google account, or both — whichever
// they signed up with. At least one of passwordHash / googleId is expected.
// Queried exclusively through db/authDb.ts (a separate Neon project) — never
// through the `db` export above, which points at the dataset DB.

export const users = pgTable(
  "users",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull(),
    name: text("name").notNull(),
    passwordHash: text("password_hash"),
    googleId: text("google_id"),
    avatarUrl: text("avatar_url"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_users_email").on(table.email),
    uniqueIndex("idx_users_google_id").on(table.googleId),
  ]
);
