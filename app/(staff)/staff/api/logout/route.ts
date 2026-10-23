import { NextResponse } from "next/server";
import { deleteSession, requireStaff } from "@/lib/server/staff-auth";
import { KEEP_COOKIE, LOGIN_PATH, SESSION_COOKIE } from "@/lib/staff-session";
import { siteUrl } from "@/lib/site-url";

/** Ends the session. A POST, from the button in the staff header. */
export async function POST(request: Request) {
  const { token } = await requireStaff();
  await deleteSession(token);
  const response = NextResponse.redirect(siteUrl(LOGIN_PATH, request), 303);
  response.cookies.delete({ name: SESSION_COOKIE, path: "/staff" });
  response.cookies.delete({ name: KEEP_COOKIE, path: "/staff" });
  return response;
}
