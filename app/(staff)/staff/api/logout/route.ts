import { NextResponse } from "next/server";
import { deleteSession, requireStaff } from "@/lib/server/staff-auth";
import { LOGIN_PATH, SESSION_COOKIE } from "@/lib/staff-session";

/** Ends the session. A POST, from the button in the staff header. */
export async function POST(request: Request) {
  const { token } = await requireStaff();
  await deleteSession(token);
  const response = NextResponse.redirect(new URL(LOGIN_PATH, request.url), 303);
  response.cookies.delete({ name: SESSION_COOKIE, path: "/staff" });
  return response;
}
