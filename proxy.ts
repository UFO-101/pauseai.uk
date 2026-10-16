import { NextResponse, type NextRequest } from "next/server";
import { LOGIN_PATH, OPEN_STAFF_PATHS, SESSION_COOKIE, siteUrl } from "@/lib/staff-session";

// Turns away anyone on /staff without a session cookie: pages go to the
// login page, staff API routes get a 401. This is only the first, cheap
// check (Next's authentication guide: a cookie, no database). Every staff
// page, Server Action and route handler still calls requireStaff().
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (OPEN_STAFF_PATHS.includes(pathname) || request.cookies.has(SESSION_COOKIE)) return NextResponse.next();
  if (pathname.startsWith("/staff/api/")) return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  return NextResponse.redirect(siteUrl(LOGIN_PATH, request));
}

export const config = {
  matcher: "/staff/:path*",
};
