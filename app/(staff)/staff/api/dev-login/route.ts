import { NextResponse, type NextRequest } from "next/server";
import { fixturesEnabled } from "@/lib/fixtures-enabled";
import { createSession } from "@/lib/server/staff-auth";
import { afterLogin, NEXT_PARAM, sessionCookie } from "@/lib/staff-session";
import { siteUrl } from "@/lib/site-url";

// The dev login (DevLogin): in a fixture build, the login page's second
// form posts an address and gets a session for it at once, with no email
// and no link, and goes on to the page it was given. Anywhere else it doesn't exist: a 404, whatever is posted.
export async function POST(request: NextRequest) {
  if (!fixturesEnabled()) return new NextResponse(null, { status: 404 });
  const form = await request.formData().catch(() => undefined);
  const email = form?.get("email");
  const next = afterLogin(form?.get(NEXT_PARAM));
  if (typeof email !== "string" || !/^[^@\s]+@pauseai\.uk$/i.test(email.trim())) {
    return new NextResponse(null, { status: 400 });
  }
  const response = NextResponse.redirect(siteUrl(next, request), 303);
  response.cookies.set(
    sessionCookie(await createSession(email.trim().toLowerCase(), false, request.headers.get("user-agent")), false),
  );
  return response;
}
