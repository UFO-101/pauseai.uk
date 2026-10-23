import { NextResponse } from "next/server";
import { deleteSession, endSession, requireStaff, sessionId } from "@/lib/server/staff-auth";
import { endStaffSessions } from "@/lib/server/staff-accounts";
import { KEEP_COOKIE, LOGIN_PATH, SESSION_COOKIE } from "@/lib/staff-session";
import { siteUrl } from "@/lib/site-url";

/** Where ending one of your other sessions goes: back to the page of them. */
const SESSIONS_PATH = "/staff/sessions";

/**
 * Ends sessions: a POST, from Log out in the staff navigation, which ends
 * this one; or from the page of your sessions, with `everywhere`, which
 * ends every one of yours, or `session`, which ends that one of yours.
 * Ending this one logs out, to the login page; ending another goes back to
 * the page of them. Ending any but by Log out is logged as "end staff
 * sessions".
 */
export async function POST(request: Request) {
  const { email, token } = await requireStaff();
  const form = await request.formData().catch(() => undefined);
  const session = form?.get("session");
  const one = typeof session === "string" ? session : undefined;
  if (one && one !== sessionId(token)) {
    await endSession(email, one);
    return NextResponse.redirect(siteUrl(SESSIONS_PATH, request), 303);
  }
  if (form?.get("everywhere")) await endStaffSessions(email, email);
  else if (one) await endSession(email, one);
  else await deleteSession(token);
  const response = NextResponse.redirect(siteUrl(LOGIN_PATH, request), 303);
  response.cookies.delete({ name: SESSION_COOKIE, path: "/staff" });
  response.cookies.delete({ name: KEEP_COOKIE, path: "/staff" });
  return response;
}
