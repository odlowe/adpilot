import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { MAX_UPLOAD_BYTES, storeCreative } from "@/lib/storage";

/** Accepts an ad photo/video and returns a URL to reference in campaigns. */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Please log in first." }, { status: 401 });
  }

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "No file received." }, { status: 400 });
  }
  if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
    return NextResponse.json({ error: "Please upload a photo or video." }, { status: 400 });
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: "Keep files under 50 MB." }, { status: 400 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const result = await storeCreative({ bytes, contentType: file.type, filename: file.name });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ url: result.url }, { status: 201 });
}
