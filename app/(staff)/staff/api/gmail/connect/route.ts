import { randomBytes } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { backPath, GMAIL_CALLBACK_PATH, GMAIL_STATE_COOKIE } from "@/lib/gmail-connect";
import { gmailConsentUrl } from "@/lib/server/outside-services/gmail";
import { requireStaff } from "@/lib/server/staff-auth";
import { siteUrl } from "@/lib/site-url";

/**
 * Connect Gmail: goes to Google's consent for the staff member's own
 * account, keeping in a cookie a random state, to check it comes back to
 * this browser, and the staff page to go back to (`back`).
 */
export async function GET(request: NextRequest) {
  const { email } = await requireStaff();
  const state = randomBytes(24).toString("base64url");
  const back = backPath(request.nextUrl.searchParams.get("back"));
  const response = NextResponse.redirect(
    gmailConsentUrl(email, siteUrl(GMAIL_CALLBACK_PATH, request).href, state),
    303,
  );
  response.cookies.set({
    name: GMAIL_STATE_COOKIE,
    value: JSON.stringify({ state, back }),
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/staff/api/gmail",
    maxAge: 15 * 60,
  });
  return response;
}
