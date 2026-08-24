import type { IncomingMessage, ServerResponse } from "node:http";

const ALLOWED_HOSTS = new Set(["cdn.discordapp.com", "media.discordapp.net"]);

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== "GET") {
    res.statusCode = 405;
    res.setHeader("Allow", "GET");
    res.end("Method Not Allowed");
    return;
  }

  const requestUrl = new URL(req.url ?? "/", "http://localhost");
  const rawAttachmentUrl = requestUrl.searchParams.get("url") ?? "";
  let attachmentUrl: URL;
  try {
    attachmentUrl = new URL(rawAttachmentUrl);
  } catch {
    res.statusCode = 400;
    res.end("Invalid attachment URL");
    return;
  }

  if (attachmentUrl.protocol !== "https:" || !ALLOWED_HOSTS.has(attachmentUrl.hostname)) {
    res.statusCode = 400;
    res.end("Attachment host is not allowed");
    return;
  }

  try {
    const upstream = await fetch(attachmentUrl, { signal: AbortSignal.timeout(10_000) });
    if (!upstream.ok) {
      res.statusCode = upstream.status;
      res.end();
      return;
    }
    res.statusCode = 200;
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Content-Disposition", "inline");
    res.end(await upstream.text());
  } catch {
    res.statusCode = 502;
    res.end("Attachment preview is unavailable");
  }
}
