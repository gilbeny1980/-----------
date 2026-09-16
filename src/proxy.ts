import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const url = request.nextUrl;
  if (!url.searchParams.has("view")) {
    return NextResponse.next();
  }

  url.searchParams.delete("view");
  const response = NextResponse.redirect(url);
  response.cookies.set("role", "viewer", {
    maxAge: 60 * 60 * 24 * 365,
    httpOnly: true,
    sameSite: "lax",
  });
  return response;
}

export const config = {
  matcher: "/((?!_next/static|_next/image|favicon.ico).*)",
};
