"use client";

/**
 * The hero visual — currently a clean navy panel, standing in until the new
 * CampaignStrike product video is recorded. To restore video: drop the new
 * file at public/hero-video.mp4 and put back the <video> element (the old
 * implementation is in git history from the AdPilot era).
 */
export default function HeroVideo() {
  return (
    <div
      aria-hidden
      className="aspect-video w-full rounded-2xl border border-slate-200 bg-navy-950 shadow-lift"
    />
  );
}
