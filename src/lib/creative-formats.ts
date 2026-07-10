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
      "slim horizontal layout — product hero moment on one side, business name and CTA in the clean space on the other, generous breathing room, nothing cramped",
  },
  {
    key: "landscape",
    label: "Feed / page break",
    ratio: "16:9",
    placement: "an in-feed or page-break ad on a website",
    style:
      "editorial feed layout — the product-in-use moment dominates, with one clearly separated text zone; high contrast against a typical webpage background",
  },
  {
    key: "square",
    label: "Pop-up / square",
    ratio: "1:1",
    placement: "a pop-up or square social ad",
    style:
      "tightly framed, high-contrast thumb-stopper with centered visual hierarchy — built to interrupt a rapid scroll with instant clarity",
  },
  {
    key: "vertical",
    label: "Sidebar / story",
    ratio: "9:16",
    placement: "a tall story-format or sidebar ad",
    style:
      "native phone-story energy — authentic, casual, almost user-generated feel; subject fills the frame; text styled like clean native story overlays, not a corporate poster",
  },
];

export const FORMAT_LABELS: Record<CreativeFormat, string> = {
  banner: "Banner",
  landscape: "Feed / page break",
  square: "Pop-up / square",
  vertical: "Sidebar / story",
  custom: "Uploaded",
};
