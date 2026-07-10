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
    "You are an elite advertising creative director and graphic designer producing ONE finished, scroll-stopping digital DISPLAY AD for a local small business. It must read instantly as a professionally DESIGNED advertisement — a deliberate layout of imagery and type — never a plain mood photo with words floating on it.",
    `THE BUSINESS: ${businessLine}.`,
    `THE OWNER'S CREATIVE REQUEST: "${prompt}"`,
    placement ? `PLACEMENT: this exact ad runs as ${placement}.` : "",
    formatStyle ? `COMPOSITION FOR THIS PLACEMENT: ${formatStyle}.` : "",
    "THE PRODUCT IS THE HERO — never an afterthought. Show the product or service moment IN USE: human hands opening, pouring, holding, serving, or wearing it, with crisp macro-level detail of texture and quality. Not a product sitting untouched on a counter. Three-second rule: a viewer must grasp what is being sold at a single glance — one strong subject, zero clutter.",
    "COLOR DISCIPLINE (60-30-10 rule, non-negotiable): choose ONE cohesive palette and commit to it across the entire ad — roughly 60% a dominant background/environment tone, 30% a secondary tone carried by the product and subject, 10% a single high-contrast accent used ONLY for the call-to-action element. Never mix clashing hues or let colors drift between areas of the frame.",
    references.length > 0
      ? "BRAND MATCHING: derive the palette directly from the attached brand images — the ad must look like it belongs to the same family as the logo and photos. Stay faithful to how the real business, products, and people actually look."
      : "PALETTE MOOD: pick the psychology that fits this business — urgency/deals: saturated warm accents on dark grounds; premium: deep navy, emerald, matte black, soft metallics; wellness/eco/trust/food: sage, warm cream, soft terracotta, earth tones.",
    "LIGHTING: high-key, soft, diffused light for everyday and lifestyle businesses (clean, welcoming, accessible). Low-key moody contrast is reserved ONLY for explicitly premium/luxury positioning.",
    "TYPOGRAPHY: bold, highly legible geometric sans-serif type in the family of Inter, Montserrat, or Futura — never script, never serif, never novelty fonts, never warped or hand-drawn lettering. If the logo has distinctive lettering, echo its character. ALL text combined occupies UNDER 20% of the frame. Perfect kerning, perfect spelling, straight baselines.",
    businessName
      ? `TEXT LAYERS (exactly three, nothing more): (1) the business name "${businessName}" — large, bold, fully inside the frame, perfectly legible at thumbnail size, set against clean negative space or a subtle scrim, never only on a background object like a distant sign; (2) ONE short supporting line, 3-6 words drawn from the owner's request; (3) a small call-to-action chip/button in the 10% accent color with 2-3 words like "Visit us" or "Order now".`
      : "TEXT: none — no lettering at all.",
    logoAttached
      ? "LOGO: the FIRST attached reference image is the business's actual logo. Reproduce it faithfully — exact colors, exact shapes, never distorted, cropped, redrawn, or blended into background objects — placed clearly (near a corner or on the product/packaging in frame) so the brand registers immediately."
      : "",
    "IMAGE QUALITY: photorealistic, professional commercial-photography grade — crisp focus on the hero, shallow depth of field, rich but controlled color. Modern and thumb-stopping.",
    "NEVER include: watermarks, other brands' logos or trademarks, fake awards or press badges, gibberish or lorem-ipsum text, extra stray words beyond the three text layers.",
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
