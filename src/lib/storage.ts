/**
 * Creative (photo/video) storage.
 *
 * With Supabase configured, files land in a public "creatives" storage
 * bucket (create it once in Supabase → Storage → New bucket → name
 * "creatives", public). Without Supabase, small files are kept inline as
 * data URLs so the whole flow still works locally with zero setup.
 */
import { randomUUID } from "crypto";

const BUCKET = "creatives";
const MAX_INLINE_BYTES = 4 * 1024 * 1024; // 4 MB fallback cap
export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024; // 50 MB with real storage

function supabaseConfigured(): boolean {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export async function storeCreative(options: {
  bytes: Buffer;
  contentType: string;
  filename: string;
}): Promise<{ url: string } | { error: string }> {
  const { bytes, contentType, filename } = options;

  if (supabaseConfigured()) {
    const safeName = filename.replace(/[^\w.-]/g, "_").slice(-80);
    const path = `${randomUUID()}-${safeName}`;
    const res = await fetch(
      `${process.env.SUPABASE_URL}/storage/v1/object/${BUCKET}/${path}`,
      {
        method: "POST",
        headers: {
          // Both header forms: legacy JWT service keys use Authorization,
          // new-format Supabase secret keys (sb_secret_...) need apikey.
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          apikey: process.env.SUPABASE_SERVICE_ROLE_KEY as string,
          "Content-Type": contentType,
          "x-upsert": "false",
        },
        body: new Uint8Array(bytes),
      }
    );
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      // Always leave the real reason in the server logs — "Upload failed"
      // alone is undiagnosable from the outside.
      console.warn(`[storage] upload failed (HTTP ${res.status}): ${detail.slice(0, 500)}`);
      if (detail.includes("Bucket not found")) {
        return {
          error:
            'Storage bucket missing — in Supabase go to Storage → New bucket, name it "creatives", and make it public.',
        };
      }
      if (detail.toLowerCase().includes("mime type") || detail.includes("not supported")) {
        return {
          error:
            'The storage bucket rejected this file type — in Supabase open the "creatives" bucket settings and clear the "Allowed MIME types" restriction.',
        };
      }
      if (detail.toLowerCase().includes("exceeded") || detail.toLowerCase().includes("too large")) {
        return { error: "The file is larger than the storage bucket allows — raise the bucket's file size limit in Supabase." };
      }
      return { error: "Upload failed. Please try again." };
    }
    return {
      url: `${process.env.SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`,
    };
  }

  // Local fallback: inline data URL (small files only)
  if (bytes.length > MAX_INLINE_BYTES) {
    return {
      error: "Files over 4 MB need cloud storage — connect Supabase to enable it.",
    };
  }
  return { url: `data:${contentType};base64,${bytes.toString("base64")}` };
}
