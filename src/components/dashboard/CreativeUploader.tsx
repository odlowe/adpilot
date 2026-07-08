"use client";

import { FileVideo, ImagePlus, X } from "lucide-react";
import { useCallback, useRef, useState } from "react";

/**
 * Drag-and-drop zone for the campaign's photo or video.
 * Files are previewed locally; wire the upload to storage
 * (e.g. Supabase Storage) when going to production.
 */
export default function CreativeUploader() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const acceptFile = useCallback(
    (candidate: File | undefined) => {
      if (!candidate) return;
      if (!candidate.type.startsWith("image/") && !candidate.type.startsWith("video/")) return;
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setFile(candidate);
      setPreviewUrl(URL.createObjectURL(candidate));
    },
    [previewUrl]
  );

  function clearFile() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null);
    setPreviewUrl(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  if (file && previewUrl) {
    const isVideo = file.type.startsWith("video/");
    return (
      <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
        {isVideo ? (
          <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-navy-900 text-emerald-400">
            <FileVideo size={26} />
          </span>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewUrl}
            alt="Your ad creative"
            className="h-16 w-16 shrink-0 rounded-lg border border-slate-200 object-cover"
          />
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-navy-900">{file.name}</p>
          <p className="text-xs text-slate-500">
            {isVideo ? "Video" : "Photo"} &middot; {(file.size / 1024 / 1024).toFixed(1)} MB —
            looks great, we&apos;ll fit it to every platform.
          </p>
        </div>
        <button
          type="button"
          onClick={clearFile}
          aria-label="Remove file"
          className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-200 hover:text-navy-900"
        >
          <X size={16} />
        </button>
      </div>
    );
  }

  return (
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
      <span className="text-xs text-slate-400">JPG, PNG, or MP4 — whatever you have works</span>
      <input
        ref={inputRef}
        type="file"
        accept="image/*,video/*"
        className="hidden"
        onChange={(e) => acceptFile(e.target.files?.[0])}
      />
    </button>
  );
}
