import type { BrandingImage, Business } from "./types";

const LABELS: BrandingImage["label"][] = ["Logo", "Storefront", "Product/Work", "Other"];
const MAX_BRANDING = 8;
const MAX_URL_CHARS = 2_000_000;

/** Validates a client-supplied branding array down to safe, typed entries. */
export function cleanBranding(value: unknown): BrandingImage[] {
  if (!Array.isArray(value)) return [];
  const out: BrandingImage[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const url = typeof o.url === "string" ? o.url.trim() : "";
    const okUrl =
      url.length > 0 &&
      url.length <= MAX_URL_CHARS &&
      (url.startsWith("https://") || url.startsWith("http://") || url.startsWith("data:image/"));
    if (!okUrl) continue;
    const label = LABELS.includes(o.label as BrandingImage["label"])
      ? (o.label as BrandingImage["label"])
      : "Other";
    out.push({ url, label });
    if (out.length >= MAX_BRANDING) break;
  }
  return out;
}

/** Builds a business profile patch from an untyped request body. */
export function businessPatchFrom(body: unknown): Partial<
  Pick<Business, "description" | "address" | "phone" | "website" | "brandingJson">
> {
  const b = (body ?? {}) as Record<string, unknown>;
  const patch: Partial<Pick<Business, "description" | "address" | "phone" | "website" | "brandingJson">> = {};
  if (typeof b.description === "string" && b.description.trim()) patch.description = b.description.trim().slice(0, 2000);
  if (typeof b.address === "string" && b.address.trim()) patch.address = b.address.trim().slice(0, 300);
  if (typeof b.phone === "string" && b.phone.trim()) patch.phone = b.phone.trim().slice(0, 40);
  if (typeof b.website === "string" && b.website.trim()) patch.website = b.website.trim().slice(0, 200);
  if (b.brandingImages !== undefined) {
    const branding = cleanBranding(b.brandingImages);
    if (branding.length > 0) patch.brandingJson = branding;
  }
  return patch;
}
