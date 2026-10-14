import { NextResponse } from "next/server";
import { createSession, sessionCookie } from "@/lib/server/staff-auth";
import { redeemLoginLink } from "@/lib/server/staff-login";
import { LOGIN_PATH } from "@/lib/staff-session";

// Step two of logging in: the button on the page the emailed link opens
// posts its token here. Open to anyone, so it doesn't call requireStaff();
// it starts a session only for a current, unused link.
export async function POST(request: Request) {
  const form = await request.formData().catch(() => undefined);
  const token = form?.get("token");
  const email = await redeemLoginLink(typeof token === "string" ? token : "");
  if (!email) return NextResponse.redirect(new URL(`${LOGIN_PATH}?failed=1`, request.url), 303);
  const response = NextResponse.redirect(new URL("/staff", request.url), 303);
  response.cookies.set(sessionCookie(await createSession(email)));
  return response;
}
