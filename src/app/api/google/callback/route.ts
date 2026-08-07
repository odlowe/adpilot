import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { exchangeCodeForRefreshToken } from "@/lib/google-ads";
import { requestOrigin } from "@/lib/request-origin";

export const dynamic = "force-dynamic";

/** Minimal branded page — this is for the owner's eyes only. */
function page(title: string, bodyHtml: string, ok: boolean): NextResponse {
  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title>
<style>
  body{font-family:system-ui,-apple-system,sans-serif;background:#f8fafc;color:#0b1f3a;margin:0;padding:40px 16px}
  .card{max-width:640px;margin:0 auto;background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:32px;box-shadow:0 10px 30px -12px rgba(7,21,39,.18)}
  h1{font-size:22px;margin:0 0 8px}
  .badge{display:inline-block;font-size:12px;font-weight:700;padding:4px 10px;border-radius:999px;margin-bottom:16px;
    background:${ok ? "#ecfdf5" : "#fef2f2"};color:${ok ? "#059669" : "#dc2626"}}
  p{line-height:1.6;font-size:15px;color:#475569}
  code,pre{background:#0b1f3a;color:#a7f3d0;border-radius:10px;font-size:13px}
  pre{padding:16px;overflow-x:auto;white-space:pre-wrap;word-break:break-all;user-select:all}
  ol{color:#475569;line-height:1.8;font-size:15px}
  b{color:#0b1f3a}
</style></head><body><div class="card"><span class="badge">${ok ? "Connected" : "Something went wrong"}</span><h1>${title}</h1>${bodyHtml}</div></body></html>`;
  return new NextResponse(html, {
    status: ok ? 200 : 400,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  });
}

/**
 * Step 2: Google sends the owner back here with a one-time code. We trade it
 * for the refresh token and SHOW it (never store it) — it belongs in Vercel's
 * env vars, not in the database.
 */
export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return page(
      "Please log in first",
      `<p>Log in to CampaignStrike in this browser, then visit <b>/api/google/connect</b> again.</p>`,
      false
    );
  }

  const url = new URL(request.url);
  const error = url.searchParams.get("error");
  if (error) {
    return page(
      "Google said no",
      `<p>Google returned: <b>${error}</b>. Usually this means the consent screen was cancelled. Visit <b>/api/google/connect</b> to try again.</p>`,
      false
    );
  }

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookieState = request.headers
    .get("cookie")
    ?.match(/adpilot_gstate=([a-f0-9]+)/)?.[1];
  if (!code || !state || !cookieState || state !== cookieState) {
    return page(
      "That link didn't check out",
      `<p>The security code didn't match (links expire after 10 minutes). Start again at <b>/api/google/connect</b>.</p>`,
      false
    );
  }

  try {
    const refreshToken = await exchangeCodeForRefreshToken(
      code,
      `${requestOrigin(request)}/api/google/callback`
    );
    if (!refreshToken) {
      return page(
        "No refresh token came back",
        `<p>Google connected but didn't hand over a refresh token. This happens when access was granted before. Go to <a href="https://myaccount.google.com/permissions">myaccount.google.com/permissions</a>, remove this app's access, then start again at <b>/api/google/connect</b>.</p>`,
        false
      );
    }
    const response = page(
      "Google Ads is connected 🎉",
      `<p>This is your <b>refresh token</b> — treat it like a password. It is shown once and not saved anywhere.</p>
       <pre>${refreshToken}</pre>
       <ol>
         <li>Click the token above (it auto-selects) and copy it.</li>
         <li>In Vercel: your project → <b>Settings → Environment Variables</b>.</li>
         <li>Add <code>&nbsp;GOOGLE_ADS_REFRESH_TOKEN&nbsp;</code> and paste the token as the value.</li>
         <li>Redeploy (Deployments → ⋯ on the latest → Redeploy).</li>
         <li>Then visit <b>/api/google/status</b> to confirm everything lights up green.</li>
       </ol>`,
      true
    );
    response.cookies.set("adpilot_gstate", "", { maxAge: 0, path: "/api/google" });
    return response;
  } catch (err) {
    return page(
      "The token exchange failed",
      `<p>${err instanceof Error ? err.message : "Unknown error"}</p><p>Double-check GOOGLE_ADS_OAUTH_CLIENT_ID / GOOGLE_ADS_OAUTH_CLIENT_SECRET in Vercel, and that this exact URL is listed as an authorized redirect URI in Google Cloud.</p>`,
      false
    );
  }
}
