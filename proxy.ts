import { NextResponse, type NextRequest } from "next/server";
import {
  KEEP_COOKIE,
  keepCookie,
  LOGIN_PATH,
  OPEN_STAFF_PATHS,
  SESSION_COOKIE,
  sessionCookie,
} from "@/lib/staff-session";
import { siteUrl } from "@/lib/site-url";

// Turns away anyone on /staff without a session cookie: pages go to the
// login page, staff API routes get a 401. This is only the first, cheap
// check (Next's authentication guide: a cookie, no database). Every staff
// page, Server Action and route handler still calls requireStaff(). A kept
// session ("Keep me signed in") has its cookies renewed for another 30
// days on every request, as the server renews the session.
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (OPEN_STAFF_PATHS.includes(pathname)) return NextResponse.next();
  const session = request.cookies.get(SESSION_COOKIE)?.value;
  if (session) {
    const response = NextResponse.next();
    if (request.cookies.has(KEEP_COOKIE)) {
      response.cookies.set(sessionCookie(session, true));
      response.cookies.set(keepCookie());
    }
    return response;
  }
  if (pathname.startsWith("/staff/api/")) return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  return NextResponse.redirect(siteUrl(LOGIN_PATH, request));
}

export const config = {
  matcher: "/staff/:path*",
};
