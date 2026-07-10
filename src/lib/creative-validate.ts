import type { CampaignCreative, CreativeFormat } from "./types";

const FORMATS: CreativeFormat[] = ["banner", "landscape", "square", "vertical", "custom"];
const MAX_CREATIVES = 12;
// Generous cap: storage URLs are short; data-URL fallbacks can be sizable.
const MAX_URL_CHARS = 2_000_000;

/** Validates a client-supplied creatives array down to safe, typed entries. */
export function cleanCreatives(value: unknown): CampaignCreative[] {
  if (!Array.isArray(value)) return [];
  const out: CampaignCreative[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const url = typeof o.url === "string" ? o.url.trim() : "";
    const okUrl =
      url.length > 0 &&
      url.length <= MAX_URL_CHARS &&
      (url.startsWith("https://") || url.startsWith("http://") || url.startsWith("data:image/") || url.startsWith("data:video/"));
    if (!okUrl) continue;
    const format: CreativeFormat = FORMATS.includes(o.format as CreativeFormat)
      ? (o.format as CreativeFormat)
      : "custom";
    const prompt = typeof o.prompt === "string" ? o.prompt.trim().slice(0, 600) : undefined;
    const createdAt =
      typeof o.createdAt === "string" && !Number.isNaN(Date.parse(o.createdAt))
        ? o.createdAt
        : new Date().toISOString();
    out.push({ url, format, ...(prompt ? { prompt } : {}), createdAt });
    if (out.length >= MAX_CREATIVES) break;
  }
  return out;
}
