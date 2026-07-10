import type { CreativeFormat } from "./types";

/**
 * The ad placements we generate for. One click on "AI Generate Visuals"
 * produces each selected format so the same concept works everywhere —
 * banners, sidebars, page breaks, and pop-ups.
 */
export const CREATIVE_FORMATS: Array<{
  key: Exclude<CreativeFormat, "custom">;
  label: string;
  /** Gemini response_format aspect ratio. */
  ratio: "21:9" | "16:9" | "1:1" | "9:16";
  /** Where it runs — woven into the image briefing so composition fits. */
  placement: string;
  /** Platform-native composition direction for that placement. */
  style: string;
}> = [
  {
    key: "banner",
    label: "Banner",
    ratio: "21:9",
    placement: "a wide banner strip across the top of a webpage",
    style:
      "LEFT/RIGHT SPLIT: primary visual on one side, the opposite side a solid or soft-focused text zone — they never overlap; generous breathing room across the slim strip",
  },
  {
    key: "landscape",
    label: "Feed / page break",
    ratio: "16:9",
    placement: "an in-feed or page-break ad on a website",
    style:
      "LEFT/RIGHT SPLIT: the product-in-use moment fills one side of the frame; the opposite side is a solid, minimalist, or soft-focused text zone — imagery and text never overlap",
  },
  {
    key: "square",
    label: "Pop-up / square",
    ratio: "1:1",
    placement: "a pop-up or square social ad",
    style:
      "centered or beautifully split composition, high-contrast and tightly framed for a fast mobile feed — text lives in its own clean zone, never on top of the subject",
  },
  {
    key: "vertical",
    label: "Sidebar / story",
    ratio: "9:16",
    placement: "a tall story-format or sidebar ad",
    style:
      "UPPER/LOWER THIRDS: anchor the main subject in the lower two-thirds; the top third stays a clean, uncluttered canvas for the typography. Keep ALL critical text and logos out of the top 10% and bottom 15% of the frame (platform UI covers those). Candid, high-quality lifestyle energy — like a great social post, not a studio poster",
  },
];

export const FORMAT_LABELS: Record<CreativeFormat, string> = {
  banner: "Banner",
  landscape: "Feed / page break",
  square: "Pop-up / square",
  vertical: "Sidebar / story",
  custom: "Uploaded",
};
