"use client";

import { Check, X, ZoomIn } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

export interface CropPreset {
  key: string;
  label: string;
  width: number;
  height: number;
}

/**
 * Force-crop modal: every image leaves here at EXACTLY the chosen preset's
 * pixel size — small photos scale up, huge photos scale down, and the owner
 * drags/zooms to choose what stays in frame. This is what keeps Google from
 * rejecting logos and ad images for being the wrong shape.
 */
export default function ImageCropModal({
  file,
  presets,
  initialPresetKey,
  title,
  onDone,
  onCancel,
}: {
  file: File;
  presets: CropPreset[];
  initialPresetKey?: string;
  title?: string;
  onDone: (dataUrl: string, presetKey: string) => void;
  onCancel: () => void;
}) {
  const [presetKey, setPresetKey] = useState(initialPresetKey ?? presets[0].key);
  const preset = presets.find((p) => p.key === presetKey) ?? presets[0];

  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1);
  // Crop-window center as a fraction of the image (0..1 each axis).
  const [center, setCenter] = useState({ x: 0.5, y: 0.5 });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragRef = useRef<{ x: number; y: number } | null>(null);

  // Load the picked file once.
  useEffect(() => {
    const url = URL.createObjectURL(file);
    const el = new Image();
    el.onload = () => setImg(el);
    el.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // Reset framing when the shape changes.
  useEffect(() => {
    setZoom(1);
    setCenter({ x: 0.5, y: 0.5 });
  }, [presetKey]);

  /** Source rectangle (image pixels) currently inside the crop window. */
  const sourceRect = useCallback(() => {
    if (!img) return null;
    const cover = Math.max(preset.width / img.naturalWidth, preset.height / img.naturalHeight);
    const scale = cover * zoom;
    const sw = preset.width / scale;
    const sh = preset.height / scale;
    const sx = Math.min(Math.max(center.x * img.naturalWidth - sw / 2, 0), img.naturalWidth - sw);
    const sy = Math.min(Math.max(center.y * img.naturalHeight - sh / 2, 0), img.naturalHeight - sh);
    return { sx, sy, sw, sh };
  }, [img, preset.width, preset.height, zoom, center]);

  // Live preview.
  useEffect(() => {
    const canvas = canvasRef.current;
    const rect = sourceRect();
    if (!canvas || !img || !rect) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingQuality = "high";
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, rect.sx, rect.sy, rect.sw, rect.sh, 0, 0, canvas.width, canvas.height);
  }, [img, sourceRect]);

  function onPointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    dragRef.current = { x: e.clientX, y: e.clientY };
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function onPointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    const start = dragRef.current;
    const rect = sourceRect();
    const canvas = canvasRef.current;
    if (!start || !rect || !img || !canvas) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    dragRef.current = { x: e.clientX, y: e.clientY };
    // Convert screen movement into image-fraction movement.
    const perPixelX = rect.sw / canvas.clientWidth / img.naturalWidth;
    const perPixelY = rect.sh / canvas.clientHeight / img.naturalHeight;
    setCenter((c) => ({
      x: Math.min(1, Math.max(0, c.x - dx * perPixelX)),
      y: Math.min(1, Math.max(0, c.y - dy * perPixelY)),
    }));
  }
  function onPointerUp() {
    dragRef.current = null;
  }

  function confirm() {
    const rect = sourceRect();
    if (!img || !rect) return;
    // Render at the EXACT target size — this is where small images scale up
    // and large ones scale down.
    const out = document.createElement("canvas");
    out.width = preset.width;
    out.height = preset.height;
    const ctx = out.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingQuality = "high";
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, out.width, out.height);
    ctx.drawImage(img, rect.sx, rect.sy, rect.sw, rect.sh, 0, 0, out.width, out.height);
    onDone(out.toDataURL("image/jpeg", 0.9), preset.key);
  }

  // Preview box: fixed max width, height follows the aspect.
  const previewW = 340;
  const previewH = Math.round((previewW * preset.height) / preset.width);
  const tallPreview = previewH > 380;
  const displayW = tallPreview ? Math.round((380 * preset.width) / preset.height) : previewW;
  const displayH = tallPreview ? 380 : previewH;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-navy-950/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-lift">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-navy-900">{title ?? "Crop your image"}</h3>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Cancel crop"
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-navy-900"
          >
            <X size={17} />
          </button>
        </div>

        {presets.length > 1 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {presets.map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => setPresetKey(p.key)}
                className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                  p.key === presetKey
                    ? "border-navy-900 bg-navy-900 text-white"
                    : "border-slate-300 bg-white text-slate-600 hover:border-navy-400"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        )}

        <p className="mt-2 text-xs text-slate-500">
          Drag to position · zoom to frame it. Saved at exactly {preset.width}×{preset.height} —
          the size Google expects.
        </p>

        <div className="mt-3 flex justify-center">
          {img ? (
            <canvas
              ref={canvasRef}
              width={displayW * 2}
              height={displayH * 2}
              style={{ width: displayW, height: displayH, touchAction: "none" }}
              className="cursor-grab rounded-xl border border-slate-200 bg-slate-100 active:cursor-grabbing"
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
            />
          ) : (
            <div
              style={{ width: displayW, height: displayH }}
              className="animate-pulse rounded-xl bg-slate-200"
            />
          )}
        </div>

        <div className="mt-3 flex items-center gap-2.5">
          <ZoomIn size={15} className="shrink-0 text-slate-400" />
          <input
            type="range"
            min={100}
            max={300}
            value={Math.round(zoom * 100)}
            onChange={(e) => setZoom(Number(e.target.value) / 100)}
            className="ap-range w-full"
            aria-label="Zoom"
          />
        </div>

        <div className="mt-4 flex gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            className="w-1/3 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={confirm}
            disabled={!img}
            className="flex w-2/3 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-card transition hover:bg-emerald-500 disabled:opacity-60"
          >
            <Check size={15} /> Use this crop
          </button>
        </div>
      </div>
    </div>
  );
}
