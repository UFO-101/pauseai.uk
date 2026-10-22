import { NextResponse, type NextRequest } from "next/server";
import { fixturesEnabled } from "@/lib/fixtures-enabled";
import { createSession } from "@/lib/server/staff-auth";
import { sessionCookie } from "@/lib/staff-session";
import { siteUrl } from "@/lib/site-url";

// The dev login (DevLogin): in a fixture build, the login page's second
// form posts an address and gets a session for it at once, with no email
// and no link. Anywhere else it doesn't exist: a 404, whatever is posted.
export async function POST(request: NextRequest) {
  if (!fixturesEnabled()) return new NextResponse(null, { status: 404 });
  const form = await request.formData().catch(() => undefined);
  const email = form?.get("email");
  if (typeof email !== "string" || !/^[^@\s]+@pauseai\.uk$/i.test(email.trim())) {
    return new NextResponse(null, { status: 400 });
  }
  const response = NextResponse.redirect(siteUrl("/staff", request), 303);
  response.cookies.set(sessionCookie(await createSession(email.trim().toLowerCase()), false));
  return response;
}
