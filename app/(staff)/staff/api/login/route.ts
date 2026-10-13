import { NextResponse } from "next/server";
import { googleClient, startLogin } from "@/lib/server/google-login";
import { LOGIN_COOKIE } from "@/lib/staff-session";

// Step one of logging in: off to Google. Open to anyone (it's how staff get
// a session), so it doesn't call requireStaff().
export async function GET(request: Request) {
  const client = googleClient();
  if (!client) return new NextResponse("Staff login isn't set up: GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are missing.", { status: 500 });
  const { url, state, verifier } = startLogin(client, new URL(request.url).origin);
  const response = NextResponse.redirect(url);
  response.cookies.set({
    name: LOGIN_COOKIE,
    value: `${state}.${verifier}`,
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/staff/api/callback",
    maxAge: 10 * 60,
  });
  return response;
}
