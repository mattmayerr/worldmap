import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const SESSION_COOKIE = "saa_session";
const PUBLIC_PATHS = ["/login", "/api/auth/login"];
const ADMIN_PAGE_PATHS = ["/settings", "/documents", "/admin"];
const ADMIN_API_PREFIXES = ["/api/documents", "/api/admin"];
const AGENT_LEGACY_PATHS = ["/history", "/stats", "/objections"];

function isAdminOnlyPage(pathname: string): boolean {
  return ADMIN_PAGE_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );
}

function isAdminOnlyApi(pathname: string): boolean {
  return ADMIN_API_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

function getSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 16) {
    return new TextEncoder().encode("dev-only-auth-secret-change-me");
  }
  return new TextEncoder().encode(secret);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`))) {
    return NextResponse.next();
  }

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.endsWith(".ico") ||
    pathname.endsWith(".png") ||
    pathname.endsWith(".jpg") ||
    pathname.endsWith(".jpeg") ||
    pathname.endsWith(".svg") ||
    pathname.endsWith(".webp")
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;

  if (!token) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  try {
    const { payload } = await jwtVerify(token, getSecret());
    const role = payload.role as string | undefined;

    if (role !== "admin") {
      if (
        AGENT_LEGACY_PATHS.some(
          (path) => pathname === path || pathname.startsWith(`${path}/`)
        )
      ) {
        return NextResponse.redirect(new URL("/progress", request.url));
      }
      if (isAdminOnlyPage(pathname)) {
        return NextResponse.redirect(new URL("/", request.url));
      }
      if (isAdminOnlyApi(pathname)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      if (pathname === "/api/profile" && request.method === "PUT") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    return NextResponse.next();
  } catch {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
