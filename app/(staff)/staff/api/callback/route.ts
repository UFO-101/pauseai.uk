import { NextResponse, type NextRequest } from "next/server";
import { createSession, sessionCookie } from "@/lib/server/staff-auth";
import { redeemLoginLink } from "@/lib/server/staff-login";
import { LOGIN_BROWSER_COOKIE, LOGIN_PATH } from "@/lib/staff-session";

// Step two of logging in: where the emailed link goes. Open to anyone, so it
// doesn't call requireStaff(); it starts a session only for a current,
// unused link, opened in the browser that asked for it. Anywhere else (a
// mail scanner, another device) it says so and leaves the link unused.
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token") ?? "";
  const result = await redeemLoginLink(token, request.cookies.get(LOGIN_BROWSER_COOKIE)?.value ?? "");
  if ("refused" in result) return NextResponse.redirect(new URL(`${LOGIN_PATH}?${result.refused}=1`, request.url), 303);
  const response = NextResponse.redirect(new URL("/staff", request.url), 303);
  response.cookies.set(sessionCookie(await createSession(result.email)));
  response.cookies.delete({ name: LOGIN_BROWSER_COOKIE, path: "/staff" });
  return response;
}
