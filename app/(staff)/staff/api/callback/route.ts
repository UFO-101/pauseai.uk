import { NextResponse, type NextRequest } from "next/server";
import { finishLogin, googleClient } from "@/lib/server/google-login";
import { createSession, sessionCookie } from "@/lib/server/staff-auth";
import { LOGIN_COOKIE, LOGIN_PATH } from "@/lib/staff-session";

// Step two of logging in: Google sends the staff member back here. Open to
// anyone, so it doesn't call requireStaff(); it starts a session only for a
// checked pauseai.uk account.
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const failed = (reason: string) => {
    console.warn(`Staff login refused: ${reason}`);
    const response = NextResponse.redirect(new URL(`${LOGIN_PATH}?failed=1`, url));
    response.cookies.delete({ name: LOGIN_COOKIE, path: "/staff/api/callback" });
    return response;
  };

  const client = googleClient();
  if (!client) return failed("Google client not configured");
  const [state, verifier] = (request.cookies.get(LOGIN_COOKIE)?.value ?? "").split(".");
  const code = url.searchParams.get("code");
  if (!state || !verifier || url.searchParams.get("state") !== state || !code) return failed("state doesn't match");

  const result = await finishLogin(client, url.origin, code, verifier);
  if (!result.ok) return failed(result.reason);

  const response = NextResponse.redirect(new URL("/staff", url));
  response.cookies.set(sessionCookie(await createSession(result.email)));
  response.cookies.delete({ name: LOGIN_COOKIE, path: "/staff/api/callback" });
  return response;
}
