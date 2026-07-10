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
}> = [
  { key: "banner", label: "Banner", ratio: "21:9", placement: "a wide banner strip across the top of a webpage" },
  { key: "landscape", label: "Feed / page break", ratio: "16:9", placement: "an in-feed or page-break ad on a website" },
  { key: "square", label: "Pop-up / square", ratio: "1:1", placement: "a pop-up or square social ad" },
  { key: "vertical", label: "Sidebar / story", ratio: "9:16", placement: "a tall sidebar ad beside an article" },
];

export const FORMAT_LABELS: Record<CreativeFormat, string> = {
  banner: "Banner",
  landscape: "Feed / page break",
  square: "Pop-up / square",
  vertical: "Sidebar / story",
  custom: "Uploaded",
};
