import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PATHS = new Set([
  "/",
  "/login",
  "/room-entry",
  "/transformers-status",
  "/api/open-faults/sync",
  "/manifest.webmanifest",
  "/icon.png",
  "/apple-icon.png",
  "/icon-192.png",
  "/icon-512.png",
]);

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.has(pathname)) {
    return NextResponse.next();
  }

  const isAdmin = request.cookies.get("role")?.value === "admin";
  if (!isAdmin) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/((?!_next/static|_next/image|favicon.ico).*)",
};
