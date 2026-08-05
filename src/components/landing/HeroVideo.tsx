"use client";

import { useState } from "react";
import { BRAND } from "@/lib/brand";

/**
 * The hero visual: the CampaignStrike product video, compressed for the web
 * (1280px H.264, muted, ~1.5 MB), served from /public/hero-video.mp4.
 * If it somehow fails to load, a clean navy panel keeps the hero intact.
 */
export default function HeroVideo() {
  const [videoFailed, setVideoFailed] = useState(false);

  if (videoFailed) {
    return (
      <div
        aria-hidden
        className="aspect-video w-full rounded-2xl border border-slate-200 bg-navy-950 shadow-lift"
      />
    );
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-navy-950 shadow-lift">
      <video
        className="block h-auto w-full object-cover"
        src="/hero-video.mp4"
        autoPlay
        loop
        muted
        playsInline
        preload="metadata"
        aria-label={`${BRAND.name} product tour`}
        onError={() => setVideoFailed(true)}
      />
    </div>
  );
}
