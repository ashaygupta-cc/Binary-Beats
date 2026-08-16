import { Router, Request, Response } from "express";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
const LEETCODE_GRAPHQL = "https://leetcode.com/graphql";

interface LeetcodeVerification {
  username: string;
  code: string;
  expires: Date;
  verified: boolean;
}

// In-memory store for LeetCode verification metadata
export const leetcodeStore = new Map<string, LeetcodeVerification>();

async function fetchLeetCodeProfile(username: string) {
  const query = `
    query getUserProfile($username: String!) {
      matchedUser(username: $username) {
        username
        profile {
          realName
          aboutMe
        }
      }
    }
  `;
  try {
    const response = await fetch(LEETCODE_GRAPHQL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, variables: { username } }),
    });
    const data = await response.json() as any;
    return data?.data?.matchedUser || null;
  } catch (error) {
    console.error("Error fetching LeetCode profile:", error);
    return null;
  }
}

// GET /api/leetcode/status
router.get("/status", requireAuth, async (req: Request, res: Response) => {
  const userId = req.user?.sub;
  if (!userId) return res.status(401).json({ message: "Unauthorized" });
  const record = leetcodeStore.get(userId);
  res.status(200).json({
    verified: record ? record.verified : false,
    username: record ? record.username : null,
    code: record ? record.code : null,
    expires: record ? record.expires : null,
  });
});

// POST /api/leetcode/start-verification
router.post("/start-verification", requireAuth, async (req: Request, res: Response) => {
  try {
    const { username } = req.body as { username?: string };
    const userId = req.user?.sub;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    if (!username) {
      return res.status(400).json({ message: "LeetCode username is required" });
    }

    const profile = await fetchLeetCodeProfile(username);
    if (!profile) {
      return res.status(400).json({ message: "Invalid LeetCode username" });
    }

    const verificationCode = "LC-VERIFY-" + Math.random().toString(36).slice(2, 8);

    leetcodeStore.set(userId, {
      username,
      code: verificationCode,
      expires: new Date(Date.now() + 10 * 60 * 1000),
      verified: false,
    });

    res.status(200).json({
      message: `Set your LeetCode "About Me" or real name to: ${verificationCode}, then confirm.`,
      code: verificationCode,
    });
  } catch (error: any) {
    console.error("Start LeetCode verification error:", error);
    res.status(500).json({ message: error.message });
  }
});

// POST /api/leetcode/confirm-verification
router.post("/confirm-verification", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.sub;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const record = leetcodeStore.get(userId);
    if (!record || record.expires.getTime() < Date.now()) {
      return res.status(400).json({ message: "Verification expired, please start again" });
    }

    const profile = await fetchLeetCodeProfile(record.username);
    if (!profile) {
      return res.status(400).json({ message: "Could not fetch LeetCode profile" });
    }

    const matches =
      profile.profile?.realName === record.code ||
      profile.profile?.aboutMe === record.code;

    if (!matches) {
      return res.status(400).json({ message: "Verification code not found on your LeetCode profile" });
    }

    record.verified = true;
    leetcodeStore.set(userId, record);

    res.status(200).json({ message: "LeetCode username verified", username: record.username });
  } catch (error: any) {
    console.error("Confirm LeetCode verification error:", error);
    res.status(500).json({ message: error.message });
  }
});

export default router;
