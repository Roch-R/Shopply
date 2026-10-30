import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  SHOPPLY_SESSION_COOKIE,
  verifySessionCookie,
  clearSessionCookie,
} from "@/lib/sessionCookie";

const GUEST_ONLY_PATHS = new Set([
  "/login",
  "/register",
  "/verify",
  "/auth/google/chooser",
]);

const NO_STORE_PREFIXES = [
  "/login",
  "/register",
  "/verify",
  "/auth/google",
  "/dashboard",
  "/shop",
  "/cart",
];

function withSecurityHeaders(res: NextResponse, noStore: boolean): NextResponse {
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  if (noStore) {
    res.headers.set("Cache-Control", "private, no-store, no-cache, must-revalidate, proxy-revalidate");
    res.headers.set("Pragma", "no-cache");
    res.headers.set("Expires", "0");
  }
  return res;
}

export async function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;
  const requiresNoStore = NO_STORE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

  // 1. Visiting "/" explicitly resets session state (matches app/page.tsx behavior).
  if (pathname === "/") {
    const res = withSecurityHeaders(NextResponse.next(), false);
    if (request.cookies.has(SHOPPLY_SESSION_COOKIE)) {
      clearSessionCookie(res);
    }
    return res;
  }

  // 2. Explicit logout/session-expiry redirect (`?logged_out=1`) clears any lingering cookie cleanly.
  if (pathname === "/login" && searchParams.get("logged_out") === "1") {
    const res = withSecurityHeaders(NextResponse.next(), true);
    clearSessionCookie(res);
    return res;
  }

  // 3. Block guest-only authentication routes if the user is ALREADY signed in.
  const isGoogleCallbackDirectVisit =
    pathname === "/auth/google/callback" &&
    !searchParams.has("code") &&
    !searchParams.has("error") &&
    !searchParams.has("simulated_email");

  if (GUEST_ONLY_PATHS.has(pathname) || isGoogleCallbackDirectVisit) {
    const rawSession = request.cookies.get(SHOPPLY_SESSION_COOKIE)?.value;
    const session = await verifySessionCookie(rawSession);
    if (session?.verified) {
      const target = new URL("/dashboard?notice=already_authenticated", request.url);
      const redirectRes = NextResponse.redirect(target, { status: 307 });
      return withSecurityHeaders(redirectRes, true);
    }
  }

  return withSecurityHeaders(NextResponse.next(), requiresNoStore);
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)"],
};
