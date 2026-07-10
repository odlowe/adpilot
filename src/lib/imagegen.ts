/**
 * Real AI photo generation via Google's Gemini API (raw fetch, no SDK —
 * matching the project convention).
 *
 * Setup: grab a key at https://aistudio.google.com/apikey and set
 * GEMINI_API_KEY. Model defaults to gemini-3.1-flash-image (the "Nano
 * Banana" image line, current as of mid-2026); override with
 * GEMINI_IMAGE_MODEL if Google ships a newer one.
 *
 * Uses the Interactions API (GA June 2026, Google's recommended interface):
 *   POST https://generativelanguage.googleapis.com/v1beta/interactions
 * Reference images ride along as base64 input parts, so "make it look like
 * this photo of my storefront" works.
 */

const GEMINI_IMAGE_MODEL = process.env.GEMINI_IMAGE_MODEL ?? "gemini-3.1-flash-image";
const GEMINI_TIMEOUT_MS = 55_000;

export interface ReferenceImage {
  mimeType: string;
  /** base64, no data-URL prefix */
  data: string;
}

export function isImageAiConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

/**
 * Generates one ad photo. Returns raw image bytes ready for storage.
 * Throws with a readable message on any failure — the route decides how
 * to surface it.
 */
const ALLOWED_RATIOS = new Set(["21:9", "16:9", "1:1", "9:16", "4:3", "3:4", "4:5", "5:4", "3:2", "2:3"]);

export async function generateAdImage(options: {
  prompt: string;
  businessName?: string;
  businessCategory?: string;
  businessDescription?: string;
  /** Plain-English target-customer description — drives audience-tailored aesthetics. */
  targetAudience?: string;
  references: ReferenceImage[];
  /** e.g. "16:9" — must be one Gemini supports. */
  aspectRatio?: string;
  /** Plain-English placement, e.g. "a wide banner strip across the top of a webpage". */
  placement?: string;
  /** Platform-native composition direction for the placement. */
  formatStyle?: string;
  /** True when the first reference image is the business's actual logo. */
  logoAttached?: boolean;
}): Promise<{ bytes: Buffer; contentType: string }> {
  const {
    prompt,
    businessName,
    businessCategory,
    businessDescription,
    targetAudience,
    references,
    aspectRatio,
    placement,
    formatStyle,
    logoAttached,
  } = options;

  // The invisible half of the prompt: a creative-director briefing that turns
  // whatever the owner types into a modern, click-worthy ad. The owner's own
  // words are quoted inside it as the creative request.
  const businessLine = [
    businessName ? `"${businessName}"` : "a local small business",
    businessCategory ? `(${businessCategory})` : "",
    businessDescription ? `— ${businessDescription.slice(0, 400)}` : "",
  ]
    .filter(Boolean)
    .join(" ");

  const instruction = [
    "You are an elite advertising creative director. Produce ONE finished, professional digital DISPLAY AD — a deliberate, high-end graphic-design layout, never a plain photo with words floating on it. Process the inputs below through three strict filters: Visual & Layout Rules, the Input Translation Matrix, and Ad Network Standards.",
    `THE BUSINESS: ${businessLine}.`,
    targetAudience ? `THE TARGET AUDIENCE: ${targetAudience.slice(0, 300)}.` : "",
    `THE OWNER'S CREATIVE REQUEST: "${prompt}"`,
    placement ? `PLACEMENT: this exact ad runs as ${placement}.` : "",
    formatStyle ? `LAYOUT RULE FOR THIS FORMAT: ${formatStyle}.` : "",
    "FILTER 1 — UNIVERSAL VISUAL & LAYOUT RULES: Text and the main subject NEVER overlap — imagery lives in its zone, type lives in its own solid/minimalist/soft-focused zone. ZERO TEXT EFFECTS: absolute ban on strokes, outlines, outer glows, boxes, and harsh drop shadows; contrast comes purely from clean typographic color choice against a simple background. FONT PAIRING PROTOCOL: exactly TWO fonts — one bold, character-rich display font for the headline that matches the brand's vibe, one highly legible minimalist sans-serif for the subline and CTA. Professional editorial composition with ample negative space. Perfect spelling, straight baselines.",
    "FILTER 2 — TRANSLATE THE INPUTS: First classify the business: Premium/Luxury → deep muted palette, massive negative space, elegant restrained type, hyper-minimalist layout. Casual/Local → warm vibrant high-key photography, friendly approachable type. B2B/Corporate → clean high-contrast blues/slates/whites, benefit-first tone, sharp geometric type. Then read the audience: older/professional → sophisticated imagery, LARGER highly legible type, direct value proposition. Younger → editorial, candid lifestyle photography (a beautiful social post, not a studio setup), subtle clever tone. Then the goal: aspirational request → grand spacious imagery, the headline sells a feeling or status. Problem-solving request → the image clearly shows the product solving the problem IN USE, human hands interacting with it, crisp macro detail.",
    "THE PRODUCT IS THE HERO of the visual zone: shown in use, immediately understandable at a glance — a viewer must grasp what is being sold within three seconds. One strong subject, zero clutter.",
    references.length > 0
      ? "BRAND MATCHING: derive the entire palette and the display font's character from the attached brand images — the ad must look like it belongs to the same family as the logo and photos. Stay faithful to how the real business, products, and people actually look."
      : "COLOR DISCIPLINE (60-30-10): 60% dominant background tone native to the brand's identity, 30% secondary tone on the product/subject, 10% one high-contrast accent reserved for the CTA. One cohesive palette, committed to across the whole frame — never clashing hues.",
    businessName
      ? `TEXT LAYERS (exactly three, nothing more, together under 20% of the canvas): (1) headline featuring the business name "${businessName}" — bold, fully in frame, legible at thumbnail size, in its own text zone; (2) ONE short subline, 3-6 words drawn from the owner's request, in the sans-serif; (3) THE CTA FOOTER: a small, clean, high-contrast zone at the very bottom of the layout with a short actionable line or minimalist button outline (2-3 words like "Visit us" or "Order now") in the accent color — never cluttered.`
      : "TEXT: none — no lettering at all.",
    logoAttached
      ? "LOGO: the FIRST attached reference image is the business's actual logo. Reproduce it faithfully — exact colors and shapes, never distorted, cropped, redrawn, or blended into background objects — subtly but clearly present (small corner placement or on packaging in frame) so the brand registers immediately."
      : "",
    "FILTER 3 — AD NETWORK STANDARDS: text occupies at most 20% of the canvas. The layout must be clean, scannable, and ready for Meta/Google/LinkedIn deployment. IMAGE QUALITY: photorealistic, professional commercial-photography grade — crisp focus on the hero, controlled color, lighting matched to the brand tier (high-key diffused for everyday businesses; low-key moody ONLY for explicit luxury).",
    "CRITICAL QUALITY CONTROL — TYPOGRAPHY BLOCKS: the entire text group (headline, subline, CTA) is vertically centered as ONE cohesive unit within its text zone, padding distributed evenly above the headline and below the CTA — never text shoved to the top or bottom of the zone leaving a massive void of empty background. If the text zone is large, scale the font sizes and line spacing proportionally so the typography elegantly commands the space instead of getting lost in it. In split layouts the text column occupies AT MOST 45% of the canvas width, with a clean hard geometric division from the imagery. The background behind the text column stays perfectly flat, uniform, or smoothly blurred — no stray artifacts, ghost text, or secondary micro-images inside the text zone.",
    "CRITICAL QUALITY CONTROL — CLEAN CANVAS: this is a raw master marketing graphic, NOT a phone screenshot. ABSOLUTE BAN on rendering any smartphone or device UI: no cellular signal bars, no carrier names, no Wi-Fi icons, no battery indicators, no top-of-screen clocks or timestamps, no search bars, navigation arrows, volume sliders, or app-store chrome. No device frames or mockup wrappers of any kind. The output must be a completely clean, un-encapsulated design asset ready for direct upload to an ad manager.",
    "NEVER include: watermarks, other brands' logos or trademarks, fake awards or press badges, gibberish text, or any words beyond the three text layers.",
  ]
    .filter(Boolean)
    .join(" ");

  const input: Array<Record<string, string>> = [{ type: "text", text: instruction }];
  for (const ref of references) {
    input.push({ type: "image", mime_type: ref.mimeType, data: ref.data });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS);
  try {
    const res = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions", {
      method: "POST",
      headers: {
        "x-goog-api-key": process.env.GEMINI_API_KEY as string,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: GEMINI_IMAGE_MODEL,
        input,
        store: false,
        response_format: {
          type: "image",
          mime_type: "image/jpeg",
          aspect_ratio: aspectRatio && ALLOWED_RATIOS.has(aspectRatio) ? aspectRatio : "16:9",
        },
      }),
      signal: controller.signal,
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(`Gemini API ${res.status}: ${detail.slice(0, 300)}`);
    }
    const data: unknown = await res.json();
    const image = findImagePart(data);
    if (!image) throw new Error("Gemini reply contained no image");
    return {
      bytes: Buffer.from(image.data, "base64"),
      contentType: image.mimeType,
    };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Walks the response and returns the last image part found. Deliberately
 * shape-agnostic: Google's Interactions resource nests output inside
 * execution steps, and field spellings have shifted between releases —
 * this survives both snake_case and camelCase.
 */
function findImagePart(node: unknown): { data: string; mimeType: string } | null {
  let found: { data: string; mimeType: string } | null = null;

  const visit = (value: unknown): void => {
    if (Array.isArray(value)) {
      for (const item of value) visit(item);
      return;
    }
    if (!value || typeof value !== "object") return;
    const obj = value as Record<string, unknown>;

    const mime = obj.mime_type ?? obj.mimeType;
    const data = obj.data;
    if (
      typeof data === "string" &&
      data.length > 100 &&
      typeof mime === "string" &&
      mime.startsWith("image/")
    ) {
      found = { data, mimeType: mime };
    }
    for (const child of Object.values(obj)) visit(child);
  };

  visit(node);
  return found;
}
