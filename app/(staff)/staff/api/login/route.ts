import { NextResponse } from "next/server";
import { sendLoginLink } from "@/lib/server/staff-login";
import { LOGIN_PATH } from "@/lib/staff-session";

// Step one of logging in: the login page's form posts an email address, and
// a link is sent if it's a pauseai.uk one. Open to anyone (it's how staff
// get a session), so it doesn't call requireStaff(). The page says the same
// whatever was typed.
export async function POST(request: Request) {
  const form = await request.formData().catch(() => undefined);
  const email = form?.get("email");
  await sendLoginLink(typeof email === "string" ? email : "", new URL(request.url).origin);
  return NextResponse.redirect(new URL(`${LOGIN_PATH}?sent=1`, request.url), 303);
}
