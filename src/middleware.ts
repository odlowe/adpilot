import { NextResponse, type NextRequest } from "next/server";
import { BRAND } from "@/lib/brand";

/**
 * Gate authenticated areas. The cookie signature is fully verified in the
 * node runtime (src/lib/auth.ts); here we only check presence so logged-out
 * visitors get a friendly redirect instead of an error.
 */
export function middleware(request: NextRequest) {
  const hasSession = request.cookies.has(BRAND.cookieName);
  if (!hasSession) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/onboarding/:path*"],
};
