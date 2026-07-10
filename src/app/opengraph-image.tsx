import { ImageResponse } from "next/og";
import { BRAND } from "@/lib/brand";

/** The card shown when the site is shared in texts and social posts. */
export const runtime = "edge";
export const alt = `${BRAND.name} — Get Local Customers on Autopilot`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "linear-gradient(135deg, #0b1f3a 0%, #071527 100%)",
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 16,
              background: "#059669",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 34,
            }}
          >
            ➤
          </div>
          <div style={{ fontSize: 44, fontWeight: 700 }}>
            {BRAND.name.slice(0, 2)}
            <span style={{ color: "#34d399" }}>{BRAND.name.slice(2)}</span>
          </div>
        </div>
        <div style={{ marginTop: 48, fontSize: 76, fontWeight: 800, lineHeight: 1.1 }}>
          Get Local Customers on Autopilot.
        </div>
        <div style={{ marginTop: 20, fontSize: 40, color: "#34d399", fontWeight: 700 }}>
          No Tech Skills Required.
        </div>
        <div style={{ marginTop: 40, fontSize: 28, color: "#94a3b8" }}>
          One slider. One sentence. Ads on Google, Instagram &amp; Reddit.
        </div>
      </div>
    ),
    size
  );
}
