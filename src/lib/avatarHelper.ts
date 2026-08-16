export function getPlayerAvatarUrl(handle: string, loggedInAvatar?: string | null): string | null {
  if (!handle) return loggedInAvatar || null;
  const h = handle.toLowerCase();

  if (loggedInAvatar && (h === "zodiacz408" || h.includes("zodiac") || h.includes("ashay"))) {
    return loggedInAvatar;
  }

  if (h.includes("zodiac") || h.includes("ashay")) return "/avatars/ashay.jpeg";
  if (h.includes("kalash")) return "/avatars/kalash.jpeg";
  if (h.includes("aditya")) return "/avatars/aditya.jpeg";
  if (h.includes("anant")) return "/avatars/anant.jpeg";
  if (h.includes("dipto")) return "/avatars/dipto.jpeg";
  if (h.includes("devraj")) return "/avatars/devraj.jpeg";
  if (h.includes("bhavesh")) return "/avatars/bhavesh.jpeg";
  if (h.includes("jainam")) return "/avatars/jainam.jpeg";
  if (h.includes("aaban")) return "/avatars/aaban.jpeg";
  if (h.includes("mohit")) return "/avatars/mohit.jpeg";

  return loggedInAvatar || null;
}
