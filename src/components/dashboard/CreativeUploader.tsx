"use client";

import { FileVideo, ImagePlus, Loader2, X } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import ImageCropModal, { type CropPreset } from "@/components/ui/ImageCropModal";
import type { CreativeFormat } from "@/lib/types";

/** The shapes Google Ads actually accepts — every upload must become one. */
const AD_CROP_PRESETS: CropPreset[] = [
  { key: "landscape", label: "Feed 1200×628", width: 1200, height: 628 },
  { key: "square", label: "Square 1200×1200", width: 1200, height: 1200 },
  { key: "vertical", label: "Story 1080×1920", width: 1080, height: 1920 },
  { key: "banner", label: "Banner 1200×514", width: 1200, height: 514 },
];

/**
 * Drag-and-drop zone for the campaign's photo or video.
 * Pass `onUploaded` to store the file for real (via /api/upload — Supabase
 * Storage when configured); without it, the file is preview-only.
 * Photos are force-cropped to a Google-accepted size before upload —
 * too big gets scaled down, too small gets scaled up.
 */
export default function CreativeUploader({
  onUploaded,
}: {
  onUploaded?: (url: string | null, format?: CreativeFormat) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [stored, setStored] = useState(false);
  const [cropFile, setCropFile] = useState<File | null>(null);

  const startUpload = useCallback(
    (candidate: File, format?: CreativeFormat) => {
      if (!onUploaded) return;
      setUploading(true);
      const form = new FormData();
      form.append("file", candidate);
      fetch("/api/upload", { method: "POST", body: form })
        .then(async (res) => {
          const data = (await res.json()) as { url?: string; error?: string };
          if (res.ok && data.url) {
            onUploaded(data.url, format);
            setStored(true);
          } else {
            setUploadError(data.error ?? "Upload failed — the campaign can still launch without it.");
            onUploaded(null);
          }
        })
        .catch(() => {
          setUploadError("Upload failed — the campaign can still launch without it.");
          onUploaded(null);
        })
        .finally(() => setUploading(false));
    },
    [onUploaded]
  );

  const acceptFile = useCallback(
    (candidate: File | undefined) => {
      if (!candidate) return;
      if (!candidate.type.startsWith("image/") && !candidate.type.startsWith("video/")) return;

      // Photos headed for storage must pass through the crop step first.
      if (candidate.type.startsWith("image/") && onUploaded) {
        setCropFile(candidate);
        return;
      }

      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setFile(candidate);
      setPreviewUrl(URL.createObjectURL(candidate));
      setUploadError(null);
      setStored(false);
      if (candidate.type.startsWith("video/")) startUpload(candidate);
    },
    [previewUrl, onUploaded, startUpload]
  );

  async function handleCropped(dataUrl: string, presetKey: string) {
    const source = cropFile;
    setCropFile(null);
    if (!source) return;
    const blob = await (await fetch(dataUrl)).blob();
    const cropped = new File([blob], `ad-${presetKey}.jpg`, { type: "image/jpeg" });
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(cropped);
    setPreviewUrl(URL.createObjectURL(cropped));
    setUploadError(null);
    setStored(false);
    startUpload(cropped, presetKey as CreativeFormat);
  }

  function clearFile() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null);
    setPreviewUrl(null);
    setUploadError(null);
    setStored(false);
    onUploaded?.(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  if (file && previewUrl) {
    const isVideo = file.type.startsWith("video/");
    return (
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
        {/* live preview */}
        {isVideo ? (
          <video
            src={previewUrl}
            controls
            muted
            loop
            playsInline
            className="max-h-64 w-full bg-navy-950 object-contain"
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewUrl}
            alt="Preview of your ad creative"
            className="max-h-64 w-full bg-white object-contain"
          />
        )}
        <div className="flex items-center gap-3 p-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-navy-900 text-emerald-400">
            {isVideo ? <FileVideo size={17} /> : <ImagePlus size={17} />}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-navy-900">{file.name}</p>
            <p className="text-xs text-slate-500">
              {isVideo ? "Video" : "Photo"} &middot; {(file.size / 1024 / 1024).toFixed(1)} MB
              {uploading
                ? " — uploading…"
                : stored
                  ? " — saved! We'll fit it to every platform."
                  : uploadError
                    ? ` — ${uploadError}`
                    : " — looks great, we'll fit it to every platform."}
            </p>
          </div>
          {uploading && <Loader2 size={16} className="shrink-0 animate-spin text-emerald-600" />}
          <button
            type="button"
            onClick={clearFile}
            aria-label="Remove file"
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-200 hover:text-navy-900"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
    {cropFile && (
      <ImageCropModal
        file={cropFile}
        presets={AD_CROP_PRESETS}
        initialPresetKey="landscape"
        title="Fit your photo to an ad size"
        onDone={(dataUrl, presetKey) => void handleCropped(dataUrl, presetKey)}
        onCancel={() => setCropFile(null)}
      />
    )}
    <button
      type="button"
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        acceptFile(e.dataTransfer.files?.[0]);
      }}
      className={`flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-8 transition ${
        dragging
          ? "border-emerald-500 bg-emerald-50"
          : "border-slate-300 bg-slate-50 hover:border-emerald-400 hover:bg-emerald-50/50"
      }`}
    >
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-emerald-600 shadow-card">
        <ImagePlus size={20} />
      </span>
      <span className="text-sm font-semibold text-navy-900">
        Drag a photo or video here, or click to browse
      </span>
      <span className="text-xs text-slate-400">
        JPG, PNG, or MP4 — photos get fitted to a Google ad size in one step
      </span>
      <input
        ref={inputRef}
        type="file"
        accept="image/*,video/*"
        className="hidden"
        onChange={(e) => acceptFile(e.target.files?.[0])}
      />
    </button>
    </>
  );
}
