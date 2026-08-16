/**
 * site.ts — navigation map and community constants.
 *
 * Updated: Team + About are primary nav items; Daily Problems merged into
 * CP/DSA Content panel; Maths Lounge → CP/DSA Content.
 */

export const DISCORD_INVITE: string =
  import.meta.env.VITE_DISCORD_INVITE ?? "https://discord.gg/binarybeats";

export interface NavItem {
  id: string;
  n: string;
  label: string;
  short?: string;
  memberOnly: boolean;
  secondary?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { id: "home",         n: "01", label: "Home",             memberOnly: false },
  { id: "content",      n: "02", label: "CP/DSA Content",   short: "Content",  memberOnly: false },
  { id: "leaderboards", n: "03", label: "Leaderboards",     short: "Ranking",  memberOnly: false },
  { id: "community",    n: "04", label: "Community",        memberOnly: false },
  { id: "arena",        n: "05", label: "Arena",            memberOnly: true },
  { id: "team",         n: "06", label: "Team",             memberOnly: false },
  { id: "about",        n: "07", label: "About",            memberOnly: false },
  // Secondary — routable but not in primary navbar
  { id: "feed",     n: "08", label: "Community Feed",   short: "Feed",     memberOnly: true, secondary: true },
  { id: "ranking",  n: "09", label: "Session Ranking",  memberOnly: true,  secondary: true },
  { id: "u",        n: "10", label: "Profile",          memberOnly: true,  secondary: true },
  { id: "problems", n: "11", label: "Daily Problems",   short: "Problems", memberOnly: false, secondary: true },
];

export const PRIMARY_NAV = NAV_ITEMS.filter((i) => !i.secondary);

export function navItem(id: string): NavItem | undefined {
  return NAV_ITEMS.find((i) => i.id === id);
}

export interface BoardDef {
  id: string;
  label: string;
  kind: "points" | "rating";
  param: string;
  blurb: string;
}

export const BOARDS: BoardDef[] = [
  { id: "overall",   label: "Overall Points", kind: "points", param: "all",       blurb: "Every point earned since day one." },
  { id: "daily",     label: "Today",          kind: "points", param: "daily",     blurb: "Today's assigned problems only." },
  { id: "weekly",    label: "Weekly",         kind: "points", param: "week",      blurb: "The currently active week." },
  { id: "monthly",   label: "Monthly",        kind: "points", param: "month",     blurb: "The currently active month." },
  { id: "cp_duel",   label: "CP Duel",        kind: "rating", param: "cp_duel",   blurb: "Head-to-head Codeforces duels." },
  { id: "cp_blitz",  label: "CP Blitz",       kind: "rating", param: "cp_blitz",  blurb: "Fast-format Codeforces blitz." },
  { id: "dsa_duel",  label: "DSA Duel",       kind: "rating", param: "dsa_duel",  blurb: "Head-to-head LeetCode duels." },
  { id: "dsa_blitz", label: "DSA Blitz",      kind: "rating", param: "dsa_blitz", blurb: "Fast-format LeetCode blitz." },
  { id: "icpc_duel", label: "ICPC Duel",      kind: "rating", param: "icpc_duel", blurb: "Team-format ICPC duels." },
  { id: "icpc_blitz",label: "ICPC Blitz",     kind: "rating", param: "icpc_blitz",blurb: "Fast-format ICPC blitz." },
];
