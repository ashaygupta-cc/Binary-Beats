/**
 * static.ts — Hand-curated content that does NOT come from the Discord sync.
 *
 * Team bios, server rules, social links, and arena guide structure live here
 * because they rarely change and the Discord text format isn't structured
 * enough for the dedicated renderers to consume directly.
 *
 * Everything else (announcements, updates, maths articles, contest reminders,
 * roadmap phases) comes from the bot API at runtime.
 */

import { DISCORD_INVITE } from "./site";

// ───────────────────────────── TEAM ─────────────────────────────

export interface TeamMember {
  name: string;
  discordId: string;
  role: string;
  title: string;
  linkedin: string;
  /** Optional GitHub profile — renders as an icon-only button next to LinkedIn. */
  github?: string;
  /** Optional — falls back to a monogram avatar. */
  avatarUrl?: string;
  isFounder?: boolean;
}

export const TEAM: TeamMember[] = [
  {
    name: "Ashay Gupta",
    discordId: "1290993918011244609",
    role: "founder",
    title: "Founder & Admin",
    linkedin: "https://www.linkedin.com/in/ashay-shiva",
    avatarUrl: "/avatars/ashay.jpeg",
    isFounder: true,
  },
  {
    name: "Kalash Desai",
    discordId: "1350000000000000001",
    role: "dev-lead",
    title: "Dev Lead",
    linkedin: "https://www.linkedin.com/in/kalash-desai-a9b47b387/",
    avatarUrl: "/avatars/kalash.jpeg",
  },
  {
    name: "Aditya Vikram",
    discordId: "983339883588378644",
    role: "moderator",
    title: "Moderator",
    linkedin: "https://www.linkedin.com/in/aditya-vikram-020a3b378/",
    avatarUrl: "/avatars/aditya.jpeg",
  },
  {
    name: "Akrist Rai",
    discordId: "1350000000000000002",
    role: "dev-lead",
    title: "Dev Lead",
    linkedin: "https://www.linkedin.com/in/akrist-rai-b510593b1",
    avatarUrl: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=500&auto=format&fit=crop&q=80",
  },
  {
    name: "Anant Kumar Gupta",
    discordId: "1382293598724161678",
    role: "lead",
    title: "CP / DSA Lead",
    linkedin: "https://www.linkedin.com/in/anant-kumar-gupta-88526a36a",
    avatarUrl: "/avatars/anant.jpeg",
  },
  {
    name: "Dipto Halder",
    discordId: "1043521446091182160",
    role: "lead",
    title: "Problem Setter",
    linkedin: "https://www.linkedin.com/in/dipto-halder-a46602381",
    avatarUrl: "/avatars/dipto.jpeg",
  },
  {
    name: "Devraj Desai",
    discordId: "1285510663250116650",
    role: "lead",
    title: "Algorithmic Theory Lead",
    linkedin: "https://www.linkedin.com/in/devraj-desai-274107381",
    avatarUrl: "/avatars/devraj.jpeg",
  },
  {
    name: "Bhavesh",
    discordId: "1147537980467196016",
    role: "lead",
    title: "Content & Editorial Lead",
    linkedin: "https://www.linkedin.com/in/bhavesh-kumar-116410398",
    avatarUrl: "/avatars/bhavesh.jpeg",
  },
  {
    name: "Jainam Domadiya",
    discordId: "1424790756899553472",
    role: "lead",
    title: "Content & Editorial Lead",
    linkedin: "https://www.linkedin.com/in/jainam-domadiya-243742399",
    avatarUrl: "/avatars/jainam.jpeg",
  },
  {
    name: "Aaban Khan",
    discordId: "737156490355539991",
    role: "lead",
    title: "Public Relations Lead",
    linkedin: "https://www.linkedin.com/in/aaban-khan-a93848383",
    avatarUrl: "/avatars/aaban.jpeg",
  },
  {
    name: "Mohit Kumar Singh",
    discordId: "1425932705844957334",
    role: "lead",
    title: "Public Relations Lead",
    linkedin: "https://www.linkedin.com/in/mohit-kumar-singh-b3aa5038a",
    avatarUrl: "/avatars/mohit.jpeg",
  },
  {
    name: "Z4s",
    discordId: "1519084550226051102",
    role: "lead",
    title: "CP / Bot Engine Lead",
    linkedin: "https://www.linkedin.com/company/binarybeatshq/",
    avatarUrl: "https://raw.githubusercontent.com/ashaygupta-cc/ashaygupta-cc/main/Zodiac_Z408.png",
  },
];

// ───────────────────────────── SOCIAL ─────────────────────────────

export interface SocialLink {
  label: string;
  url: string;
  /** Short icon identifier — the renderer picks an SVG/icon per platform. */
  platform: "linkedin" | "youtube" | "email" | "discord" | "github" | "instagram" | "twitter";
  description?: string;
}

export const SOCIAL_LINKS: SocialLink[] = [
  {
    label: "LinkedIn",
    url: "https://www.linkedin.com/company/binarybeatshq/",
    platform: "linkedin",
    description: "Follow for events, achievements, and community highlights.",
  },
  {
    label: "YouTube",
    url: "https://www.youtube.com/@BinaryBeats-HQ",
    platform: "youtube",
    description: "Arena walkthroughs, contest guides, and tutorials.",
  },
  {
    label: "Email",
    url: "mailto:binarybeats.community@gmail.com",
    platform: "email",
    description: "binarybeats.community@gmail.com",
  },
  {
    label: "Discord",
    url: DISCORD_INVITE,
    platform: "discord",
    description: "Join the community server — where everything happens.",
  },
];

// ───────────────────────────── RULES ─────────────────────────────

export interface ServerRule {
  number: number;
  title: string;
  points: string[];
}

export const SERVER_RULES: ServerRule[] = [
  {
    number: 1,
    title: "Be an Active Member",
    points: [
      "Participate in discussions, contests, problem-solving sessions, and community activities.",
      "Engage with the learning tracks and initiatives you choose to follow.",
      "Binary Beats is built around learning and participation, not simply collecting another Discord server.",
    ],
  },
  {
    number: 2,
    title: "Introduce Yourself",
    points: [
      "Head over to #Introduction and share your name, preferred language, focus area, and goals.",
      "A proper introduction helps you connect with members working towards similar goals.",
    ],
  },
  {
    number: 3,
    title: "Respect Every Member",
    points: [
      "Maintain basic respect while interacting with members, moderators, and leads.",
      "Abusive, insulting, discriminatory, or deliberately offensive behaviour will not be tolerated.",
      "Debate the idea, not the individual.",
    ],
  },
  {
    number: 4,
    title: "Participate Responsibly",
    points: [
      "Join contests, sessions, and events you register or show interest for.",
      "If you register for a structured activity, remain consistent with it.",
    ],
  },
  {
    number: 5,
    title: "Use Channels Properly",
    points: [
      "Ask doubts in the relevant help or discussion channels.",
      "Share resources in the appropriate resource channels.",
      "Read channel names, descriptions, and pinned messages before posting.",
    ],
  },
  {
    number: 6,
    title: "Ask Questions Properly",
    points: [
      "Clearly explain the problem or doubt. Mention what you've already tried.",
      "Share your code with the error or failing test case.",
      "Do not drop a screenshot with \"help\" and expect others to debug everything.",
    ],
  },
  {
    number: 7,
    title: "Keep Casual Spaces Clean",
    points: [
      "NSFW content, hate speech, targeted harassment, and unnecessary drama are strictly prohibited.",
      "Avoid conversations intended purely to provoke or create conflict.",
    ],
  },
  {
    number: 8,
    title: "No Spam or Unnecessary Pings",
    points: [
      "Do not spam messages, reactions, bot commands, or media.",
      "Do not mass-ping members or roles without permission.",
    ],
  },
  {
    number: 9,
    title: "No Unauthorised Promotion",
    points: [
      "Do not advertise Discord servers, communities, courses, or products without permission.",
      "DM advertising or unsolicited mass messaging is not allowed.",
    ],
  },
  {
    number: 10,
    title: "Maintain Fair Play",
    points: [
      "Cheating, plagiarism, or presenting someone else's work as your own will not be tolerated.",
      "Do not share solutions or exploits during an active contest unless explicitly allowed.",
      "Attempts to manipulate leaderboards, bots, or verification systems may result in immediate action.",
    ],
  },
  {
    number: 11,
    title: "Follow Moderator Instructions",
    points: [
      "If a moderator asks you to stop or move a conversation, cooperate.",
      "If you disagree with a moderation decision, discuss it privately and respectfully.",
    ],
  },
];

export const ENFORCEMENT_NOTE =
  "Rule violations may result in: Warning → Mute / Timeout → Kick → Ban. Serious violations may result in an immediate kick or ban without prior warnings.";

// ───────────────────────────── ARENA GUIDE ─────────────────────────────

export interface ArenaSection {
  id: string;
  title: string;
  content: string;
}

export const ARENA_SECTIONS: ArenaSection[] = [
  {
    id: "formats",
    title: "Match Formats",
    content:
      "2-Problem Format: Medium + Medium. 3-Problem Format (Default): Easy + Medium + Hard. If no format is specified, the bot auto-selects the 3-problem format.",
  },
  {
    id: "duel",
    title: "Duel Mode",
    content:
      "Both players receive the same problem set. Every solved problem awards one point. The player with the most solved problems wins the match.",
  },
  {
    id: "blitz",
    title: "Blitz Mode",
    content:
      "Both players receive the same problem set. Only the first accepted submission on each problem earns the point. Once a player claims a problem, it can no longer be scored by the opponent.",
  },
  {
    id: "categories",
    title: "Categories",
    content:
      "CP — Codeforces problems, real Elo rating. DSA — LeetCode problems, fixed-point rating. ICPC — Codeforces problems, ICPC-style format, real Elo rating.",
  },
  {
    id: "matchmaking",
    title: "Matchmaking",
    content:
      "Challenge any member using !duel or !blitz commands. If the challenged player does not respond in time, the bot automatically creates a match against itself.",
  },
  {
    id: "tiers",
    title: "Rating Tiers",
    content:
      "Newbie (800) → Pupil → Specialist → Expert → Candidate Master → Master → Grandmaster → Legendary Grandmaster (3000+)",
  },
];

export interface ArenaCommand {
  command: string;
  description: string;
}

export const ARENA_COMMANDS: ArenaCommand[] = [
  { command: "!duel @user cp", description: "Start a 3-problem CP Duel" },
  { command: "!blitz @user cp", description: "Start a 3-problem CP Blitz" },
  { command: "!duel @user dsa 2", description: "Start a 2-problem DSA Duel" },
  { command: "!blitz @user icpc", description: "Start a 3-problem ICPC Blitz" },
  { command: "!duelprofile", description: "Show your Duel ratings" },
  { command: "!blitzprofile", description: "Show your Blitz ratings" },
  { command: "!duel cp leaderboard", description: "CP Duel leaderboard" },
  { command: "!duel rank", description: "Your rank across all categories" },
];

export const ARENA_VIDEO_URL = "https://www.youtube.com/embed/J5AoNXC2tc0";

// ───────────────────────────── ABOUT ─────────────────────────────

export const ABOUT = {
  tagline: "Code. Compete. Conquer.",
  subtitle: "Code. Compete. Conquer.",
  description:
    "Binary Beats is a competitive-programming ecosystem that combines structured learning, daily CP/DSA practice, real-time competitive battles, verified submissions, ratings, leaderboards, and a collaborative Discord community.",
  highlights: [
    { label: "Competitive Programming" },
    { label: "Data Structures & Algorithms" },
    { label: "Mathematics" },
    { label: "ICPC-style Battles" },
    { label: "Real-time Duels & Blitz" },
    { label: "Structured Learning Roadmaps" },
  ],
  ecosystem: [
    { layer: "LEARN", items: ["DSA", "CP", "Maths"] },
    { layer: "PRACTICE", items: ["Daily Problems", "Gyms", "Roadmap"] },
    { layer: "COMPETE", items: ["Duels", "Blitz", "Arena"] },
    { layer: "TRACK", items: ["Points", "Rating", "Badges", "Leaderboard"] },
  ],
};
