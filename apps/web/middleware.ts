import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

// Edge-level session check, to kill the flash-then-redirect UX. The real
// auth+role check still happens in the API (admin/layout.tsx calls /auth/me).
//
// The access token only lives 15 minutes; the refresh token lives 7 days. When
// only the refresh token is left, renew the session here — before any server
// component reads cookies — instead of bouncing a logged-in user to /login.
export async function middleware(request: NextRequest) {
  if (request.cookies.has("access_token")) return NextResponse.next();

  const refreshToken = request.cookies.get("refresh_token")?.value;
  if (refreshToken) {
    const renewed = await renewSession(request, refreshToken);
    if (renewed) return renewed;
  }

  const url = new URL("/login", request.url);
  url.searchParams.set("next", request.nextUrl.pathname + request.nextUrl.search);
  return NextResponse.redirect(url);
}

async function renewSession(request: NextRequest, refreshToken: string): Promise<NextResponse | null> {
  try {
    const res = await fetch(`${API_URL}/api/auth/refresh`, {
      method: "POST",
      headers: { cookie: `refresh_token=${refreshToken}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const setCookies = res.headers.getSetCookie();

    // Let this same request (e.g. admin/layout.tsx's /auth/me call) see the new cookies...
    const requestHeaders = new Headers(request.headers);
    for (const raw of setCookies) {
      const [pair] = raw.split(";");
      const name = pair.slice(0, pair.indexOf("="));
      request.cookies.set(name, pair.slice(pair.indexOf("=") + 1));
    }
    requestHeaders.set("cookie", request.cookies.toString());
    const response = NextResponse.next({ request: { headers: requestHeaders } });
    // ...and store them in the browser for the requests that follow.
    for (const raw of setCookies) response.headers.append("set-cookie", raw);
    return response;
  } catch {
    return null; // API unreachable — fall through to the login redirect
  }
}

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*"],
};
