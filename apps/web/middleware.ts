import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Edge-level "is there even a session cookie" check, to kill the old
// flash-then-redirect UX. The real auth+role check still happens server-side
// (admin/layout.tsx calls the API's /auth/me — the API remains the source of
// truth; a JWT can't be safely verified here without duplicating the secret
// into the edge runtime for marginal benefit).
export function middleware(request: NextRequest) {
  const hasSession = request.cookies.has("access_token");
  if (!hasSession) {
    const url = new URL("/login", request.url);
    url.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*"],
};
