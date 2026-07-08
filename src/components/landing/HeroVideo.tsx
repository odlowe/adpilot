"use client";

import { useState } from "react";
import HeroAnimation from "./HeroAnimation";

/**
 * The hero visual: a looping product video served from /public/hero-video.mp4.
 * Until that file is added (or if it fails to load), the original animated
 * "Ad Journey" scene renders instead, so the hero is never blank.
 */
export default function HeroVideo() {
  const [videoFailed, setVideoFailed] = useState(false);

  if (videoFailed) {
    return <HeroAnimation />;
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
        aria-label="AdPilot product tour: one slider, one sentence, live ads everywhere"
        onError={() => setVideoFailed(true)}
      />
    </div>
  );
}
