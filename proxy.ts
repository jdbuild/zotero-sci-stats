import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ROLE_COOKIE, SESSION_COOKIE } from "@/lib/auth/session";

// Renamed from "middleware" in Next.js 16 - see node_modules/next/dist/docs
// /01-app/03-api-reference/03-file-conventions/proxy.md.
//
// This is the cheap, cookie-presence-only "optimistic" check - it never
// touches MongoDB (Proxy runs on every navigation, including prefetches,
// so a DB round-trip here would be wasteful). The real, database-backed
// check is lib/auth/session.ts's verifySession(), called from inside each
// protected page/route - this file is a first line of defense, not the
// only one.
const PUBLIC_PATHS = ["/login", "/api/auth/login", "/api/auth/me"];

export function proxy(request: NextRequest) {
  if (process.env.NEXT_PUBLIC_AUTH_ENABLED !== "true") return NextResponse.next();

  const { pathname } = request.nextUrl;
  if (PUBLIC_PATHS.some((p) => pathname === p)) return NextResponse.next();

  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE)?.value);
  if (!hasSession) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Settings is admin-only. This is the optimistic check (see comment
  // above) - the real enforcement is requireAdmin()/isAdminOrAuthDisabled()
  // in each Settings-related Route Handler.
  if (pathname === "/settings" && request.cookies.get(ROLE_COOKIE)?.value !== "admin") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
