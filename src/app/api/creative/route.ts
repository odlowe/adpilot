import { NextResponse } from "next/server";
import { verificationGate } from "@/lib/verification-gate";
import { rateLimit } from "@/lib/ratelimit";
import { generateAdTagline } from "@/lib/ai";
import { getCurrentUser } from "@/lib/auth";
import { getBusinessById } from "@/lib/db";
import { CREATIVE_FORMATS } from "@/lib/creative-formats";
import { generateAdImage, isImageAiConfigured, type ReferenceImage } from "@/lib/imagegen";
import type { BrandingImage, CreativeFormat } from "@/lib/types";
import { reportError } from "@/lib/monitor";
import { storeCreative } from "@/lib/storage";

export const maxDuration = 60;

const MAX_REFERENCES = 3;
// ~1.5 MB of raw image per reference (base64 is 4/3 the size). The client
// downscales to 1024px JPEG before sending, so real payloads are far smaller.
const MAX_REF_BASE64_CHARS = 2_000_000;

/**
 * "AI Generate Visuals" — turns a plain-English prompt into a polished
 * 1200x628 ad-card graphic: a brand-style gradient scene with an AI-written
 * headline and subline (Claude writes the copy when ANTHROPIC_API_KEY is
 * set). The graphic is stored like any uploaded creative and referenced by
 * URL only.
 *
 * This is the placeholder art engine. To upgrade to a real image model
 * later, swap `buildAdSvg` for the API call — the request/response contract
 * ({ prompt, businessName } → { url }) can stay exactly the same.
 */

const PALETTES: Array<{ from: string; to: string; accent: string }> = [
  { from: "#0b2545", to: "#13315c", accent: "#34d399" }, // navy → emerald
  { from: "#064e3b", to: "#065f46", accent: "#fbbf24" }, // deep emerald → amber
  { from: "#7c2d12", to: "#b45309", accent: "#fde68a" }, // terracotta
  { from: "#1e1b4b", to: "#4338ca", accent: "#a5b4fc" }, // indigo
  { from: "#134e4a", to: "#0f766e", accent: "#99f6e4" }, // teal
  { from: "#500724", to: "#9d174d", accent: "#fbcfe8" }, // berry
];

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Please log in first." }, { status: 401 });
  }

  const unverified = verificationGate(user);
  if (unverified) return unverified;

  const limited = rateLimit(request, "creative", 20, 300000, user.id);
  if (limited) return limited;

  const body = (await request.json().catch(() => null)) as
    | {
        prompt?: string;
        businessId?: string;
        businessName?: string;
        format?: string;
        audience?: string;
        references?: ReferenceImage[];
      }
    | null;
  const prompt = body?.prompt?.trim() ?? "";
  let businessName = body?.businessName?.trim() || undefined;
  let businessCategory: string | undefined;
  let businessDescription: string | undefined;
  let branding: BrandingImage[] = [];

  // Which placement/size is being generated (default: landscape feed ad).
  const formatDef =
    CREATIVE_FORMATS.find((f) => f.key === body?.format) ??
    CREATIVE_FORMATS.find((f) => f.key === "landscape")!;
  const format: CreativeFormat = formatDef.key;

  // Pull the full business profile so the ad briefing knows who this is for.
  if (body?.businessId) {
    const business = await getBusinessById(body.businessId);
    if (business && business.userId === user.id) {
      businessName = business.name;
      businessCategory = business.category;
      businessDescription = business.description?.trim() || undefined;
      branding = business.brandingJson ?? [];
    }
  }

  if (prompt.length < 4) {
    return NextResponse.json(
      { error: "Describe the visual in a few words first." },
      { status: 400 }
    );
  }

  const references: ReferenceImage[] = (Array.isArray(body?.references) ? body.references : [])
    .filter(
      (r): r is ReferenceImage =>
        Boolean(r) &&
        typeof r.mimeType === "string" &&
        r.mimeType.startsWith("image/") &&
        typeof r.data === "string" &&
        r.data.length > 0 &&
        r.data.length <= MAX_REF_BASE64_CHARS
    )
    .slice(0, MAX_REFERENCES);

  // Real AI photo when a Gemini key is configured.
  if (isImageAiConfigured()) {
    try {
      // Brand assets ride along as references — logo first, so Gemini can
      // put the real logo front and center.
      const sortedBranding = [...branding].sort(
        (a, b) => Number(b.label === "Logo") - Number(a.label === "Logo")
      );
      const brandingRefs = (
        await Promise.all(sortedBranding.slice(0, 3).map((b) => urlToReference(b.url)))
      ).filter((r): r is ReferenceImage => r !== null);
      const logoAttached = sortedBranding[0]?.label === "Logo" && brandingRefs.length > 0;

      const image = await generateAdImage({
        prompt,
        businessName,
        businessCategory,
        businessDescription,
        targetAudience: typeof body?.audience === "string" ? body.audience.trim() || undefined : undefined,
        references: [...brandingRefs, ...references].slice(0, 6),
        aspectRatio: formatDef.ratio,
        placement: formatDef.placement,
        formatStyle: formatDef.style,
        logoAttached,
      });
      const ext = image.contentType.split("/")[1]?.split(";")[0] ?? "png";
      const stored = await storeCreative({
        bytes: image.bytes,
        contentType: image.contentType,
        filename: `ai-photo.${ext}`,
      });
      if ("error" in stored) {
        return NextResponse.json({ error: stored.error }, { status: 400 });
      }
      return NextResponse.json({ url: stored.url, engine: "photo", format }, { status: 201 });
    } catch (err) {
      const detail = err instanceof Error ? err.message : "";
      await reportError("creative:gemini", err, { format, businessName });
      const friendly = detail.includes("429")
        ? "Google's image service is out of quota — the free allowance is very small. Enable billing on the Google AI account (aistudio.google.com) or wait for the daily reset."
        : "The image generator hit a snag — try again, or reword the description.";
      return NextResponse.json({ error: friendly }, { status: 502 });
    }
  }

  // No image key yet: designed concept card (Claude writes the words).
  const { headline, subline } = await generateAdTagline(prompt, businessName);
  const svg = buildAdSvg({ headline, subline, businessName, seed: prompt });

  const result = await storeCreative({
    bytes: Buffer.from(svg, "utf8"),
    contentType: "image/svg+xml",
    filename: "ai-visual.svg",
  });
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ url: result.url, engine: "card", format }, { status: 201 });
}

// ---- SVG scene builder ------------------------------------------------------

function hashSeed(s: string): number {
  let h = 0;
  for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h;
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** Greedy word-wrap; the last allowed line gets an ellipsis if text overflows. */
function wrapText(text: string, maxChars: number, maxLines: number): string[] {
  const words = text.trim().split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= maxChars) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      current = word;
      if (lines.length === maxLines) break;
    }
  }
  if (current && lines.length < maxLines) lines.push(current);
  if (lines.length === maxLines && words.join(" ").length > lines.join(" ").length) {
    lines[maxLines - 1] = `${lines[maxLines - 1].slice(0, maxChars - 1)}…`;
  }
  return lines;
}

function buildAdSvg(opts: {
  headline: string;
  subline: string;
  businessName?: string;
  seed: string;
}): string {
  const palette = PALETTES[hashSeed(opts.seed) % PALETTES.length];
  const headlineLines = wrapText(opts.headline, 24, 3);
  const sublineLines = wrapText(opts.subline, 52, 2);
  const headlineSize = headlineLines.length > 2 ? 54 : 64;

  const headlineY = 268;
  const headlineTspans = headlineLines
    .map(
      (line, i) =>
        `<tspan x="90" y="${headlineY + i * (headlineSize + 10)}">${escapeXml(line)}</tspan>`
    )
    .join("");
  const sublineStartY = headlineY + headlineLines.length * (headlineSize + 10) + 34;
  const sublineTspans = sublineLines
    .map((line, i) => `<tspan x="90" y="${sublineStartY + i * 40}">${escapeXml(line)}</tspan>`)
    .join("");

  const badge = opts.businessName
    ? `<text x="90" y="130" font-family="Arial, Helvetica, sans-serif" font-size="26" font-weight="bold" letter-spacing="6" fill="${palette.accent}">${escapeXml(opts.businessName.toUpperCase())}</text>`
    : "";

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="628" viewBox="0 0 1200 628">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${palette.from}"/>
      <stop offset="1" stop-color="${palette.to}"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="628" fill="url(#bg)"/>
  <circle cx="1050" cy="540" r="280" fill="${palette.accent}" opacity="0.12"/>
  <circle cx="1140" cy="90" r="150" fill="#ffffff" opacity="0.08"/>
  <circle cx="960" cy="300" r="70" fill="${palette.accent}" opacity="0.18"/>
  <rect x="1000" y="36" rx="14" width="164" height="34" fill="#ffffff" opacity="0.14"/>
  <text x="1082" y="59" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="15" font-weight="bold" letter-spacing="2" fill="#ffffff" opacity="0.85">AD CONCEPT</text>
  ${badge}
  <rect x="90" y="168" width="88" height="10" rx="5" fill="${palette.accent}"/>
  <text font-family="Arial, Helvetica, sans-serif" font-size="${headlineSize}" font-weight="bold" fill="#ffffff">${headlineTspans}</text>
  <text font-family="Arial, Helvetica, sans-serif" font-size="28" fill="#ffffff" opacity="0.85">${sublineTspans}</text>
</svg>`;
}

/**
 * Turns a stored image URL (Supabase public URL or data: URL) into a base64
 * reference part for Gemini. Returns null on any problem — a missing brand
 * asset should never block generation.
 */
async function urlToReference(url: string): Promise<ReferenceImage | null> {
  try {
    if (url.startsWith("data:")) {
      const match = url.match(/^data:(image\/[\w.+-]+);base64,(.+)$/);
      return match ? { mimeType: match[1], data: match[2] } : null;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10_000);
    try {
      const res = await fetch(url, { signal: controller.signal });
      if (!res.ok) return null;
      const contentType = res.headers.get("content-type") ?? "";
      if (!contentType.startsWith("image/") || contentType.includes("svg")) return null;
      const bytes = Buffer.from(await res.arrayBuffer());
      if (bytes.length > 4 * 1024 * 1024) return null;
      return { mimeType: contentType.split(";")[0], data: bytes.toString("base64") };
    } finally {
      clearTimeout(timer);
    }
  } catch {
    return null;
  }
}
