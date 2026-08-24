/**
 * channels.ts — the mirrored Discord channels and how each should render.
 *
 * Updated: added oa_questions channel (forum-style, company-wise OA posts).
 */

export type ChannelView =
  | "feed"      // reverse-chronological cards: updates, announcements, promo
  | "contests"  // embed-first, grouped by upcoming/past
  | "article"   // long-form posts rendered as articles (maths lounge / algorithmic theory)
  | "docs"      // one document assembled from many messages (server info)
  | "roadmap"   // phase detection, expandable sections
  | "team"      // member cards
  | "links"     // social/link cards
  | "threads"   // thread index (daily editorials)
  | "forum";    // forum-style thread list with thumbnails (OA questions)

export interface ChannelDef {
  key: string;
  id: string;
  label: string;
  slug: string;
  view: ChannelView;
  blurb: string;
  featured: boolean;
}

export const CHANNELS: ChannelDef[] = [
  {
    key: "server_updates", id: "1453501768179650570",
    label: "Server Updates", slug: "updates", view: "feed", featured: true,
    blurb: "Every change to the server, as it ships.",
  },
  {
    key: "updates_official", id: "1453499579583565969",
    label: "Official Announcements", slug: "announcements", view: "feed", featured: true,
    blurb: "Formal announcements from the Binary Beats team.",
  },
  {
    key: "contest_reminder", id: "1437074829235982356",
    label: "Contest Calendar", slug: "contests", view: "contests", featured: true,
    blurb: "Upcoming rounds across Codeforces, LeetCode, CodeChef and AtCoder.",
  },
  {
    key: "competitions_info", id: "1456216598846378057",
    label: "Competitions", slug: "competitions", view: "feed", featured: true,
    blurb: "In-house competitions and how to enter them.",
  },
  {
    key: "daily_problems", id: "1518305550914293942",
    label: "Daily Problems Threads", slug: "daily-problems", view: "threads", featured: false,
    blurb: "Daily problem challenge threads and community solution submissions.",
  },
  {
    key: "daily_editorials", id: "1520284027008061562",
    label: "Editorials", slug: "editorials", view: "threads", featured: true,
    blurb: "One thread per day, matched to that day's problems.",
  },
  {
    key: "cp_dsa_roadmap", id: "1526145287993688104",
    label: "CP & DSA Roadmap", slug: "roadmap", view: "roadmap", featured: true,
    blurb: "The full path, phase by phase.",
  },
  {
    key: "maths_lounge", id: "1518900916021887046",
    label: "Algorithmic Theory", slug: "maths", view: "threads", featured: true,
    blurb: "Long-form articles on the maths behind competitive programming.",
  },
  {
    key: "oa_questions", id: "1526149678796898305",
    label: "OA Questions", slug: "oa-questions", view: "forum", featured: true,
    blurb: "Company-wise online assessment questions — Amazon, Salesforce, and more.",
  },
  {
    key: "arena_guide", id: "1524890934095904920",
    label: "Arena Guide", slug: "arena-guide", view: "docs", featured: false,
    blurb: "Rules, formats and walkthroughs for duels, blitz and arenas.",
  },
  {
    key: "server_info", id: "1453508409864486912",
    label: "Server Info", slug: "server-info", view: "docs", featured: false,
    blurb: "Rules, channel map, commands and FAQs.",
  },
  {
    key: "team_info", id: "1433864900484009985",
    label: "The Team", slug: "team", view: "team", featured: false,
    blurb: "Founders, moderators, leads and contributors.",
  },
  {
    key: "find_us_online", id: "1453507423125110815",
    label: "Find Us Online", slug: "social", view: "links", featured: false,
    blurb: "Binary Beats everywhere else.",
  },
  {
    key: "ideas_feedback", id: "1433862332534096105",
    label: "Ideas & Feedback", slug: "ideas", view: "feed", featured: false,
    blurb: "What the community wants built next.",
  },
  {
    key: "self_promo", id: "1518192178520657981",
    label: "Community Showcase", slug: "showcase", view: "feed", featured: false,
    blurb: "Projects, blogs and wins shared by members.",
  },
];

export function channelBySlug(slug: string): ChannelDef | undefined {
  return CHANNELS.find((c) => c.slug === slug);
}

export function channelByKey(key: string): ChannelDef | undefined {
  return CHANNELS.find((c) => c.key === key);
}

export const FEATURED_CHANNELS = CHANNELS.filter((c) => c.featured);
