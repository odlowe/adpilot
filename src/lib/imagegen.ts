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
    "You are an expert advertising creative director producing ONE finished, scroll-stopping digital DISPLAY AD for a local small business. This must read instantly as a designed advertisement — graphic layout with text over imagery — NOT a plain mood photo.",
    `The business: ${businessLine}.`,
    `The owner's creative request: "${prompt}"`,
    placement ? `This exact ad will run as ${placement} — compose the layout for that shape and viewing context.` : "",
    logoAttached
      ? "The FIRST attached reference image is the business's actual logo. Reproduce it faithfully and feature it prominently in the foreground — never distorted, never cropped, never blended into background objects."
      : "",
    references.length > 0
      ? "The attached reference photos show the real business/products/people — stay faithful to how they actually look so the ad feels authentic."
      : "",
    businessName
      ? `NON-NEGOTIABLE: the business name "${businessName}" must be FRONT AND CENTER — rendered as large, bold, modern graphic type in the foreground design layer, fully inside the frame, perfectly legible even at thumbnail size, with strong contrast against what's behind it (use a subtle panel, gradient scrim, or clean negative space if needed). Never place the name only on a background object like a distant sign, and never crop it.`
      : "",
    "Also include ONE short punchy supporting line (3-6 words, drawn from the owner's request) as smaller clean type near the name. Every word spelled perfectly; no other stray text anywhere.",
    "Backdrop: photorealistic, professional commercial-photography quality — crisp focus, rich color, flattering light, one strong subject, bold contrast. Modern and thumb-stopping; a viewer scrolling past should stop.",
    "Never include watermarks, other brands' logos, fake awards, or lorem-ipsum-style gibberish text.",
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
