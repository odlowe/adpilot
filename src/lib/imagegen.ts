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
  references: ReferenceImage[];
}): Promise<{ bytes: Buffer; contentType: string }> {
  const { prompt, businessName, references } = options;

  const instruction = [
    "Create one photorealistic advertising photo for a local small business.",
    businessName ? `The business is called "${businessName}".` : "",
    `What the owner wants: ${prompt}`,
    references.length > 0
      ? "Use the attached reference photo(s) for the real look of the business, products, or people — stay faithful to them."
      : "",
    "Landscape orientation. Warm, inviting, professional quality. No watermarks, no logos of other brands, and do not add any text or lettering to the image.",
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
