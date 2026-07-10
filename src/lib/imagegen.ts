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
export async function generateAdImage(options: {
  prompt: string;
  businessName?: string;
  businessCategory?: string;
  businessDescription?: string;
  references: ReferenceImage[];
}): Promise<{ bytes: Buffer; contentType: string }> {
  const { prompt, businessName, businessCategory, businessDescription, references } = options;

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
    "You are an expert advertising creative director producing ONE finished, scroll-stopping digital advertisement image for a local small business.",
    `The business: ${businessLine}.`,
    `The owner's creative request: "${prompt}"`,
    references.length > 0
      ? "Reference photos of the real business/products/people are attached — stay faithful to how they actually look; the ad must feel authentic to this exact business."
      : "",
    "Creative direction: photorealistic, professional commercial-photography quality — crisp focus, rich color, flattering natural light. Modern, thumb-stopping composition built for social feeds: one strong subject, bold contrast, shallow depth of field, a little clean negative space. Warm and inviting, like a beloved neighborhood spot you want to visit today.",
    businessName
      ? `The business name may appear naturally in the scene (storefront signage or one short, clean line of type) — if any text appears it must be spelled exactly "${businessName}" and nothing else.`
      : "Do not add any text or lettering.",
    "Never include watermarks, other brands' logos, or fake awards. Landscape orientation, standard 1200x628 ad format.",
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
