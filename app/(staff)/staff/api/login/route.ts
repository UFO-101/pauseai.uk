import { NextResponse, type NextRequest } from "next/server";
import { loginBrowser, loginBrowserCookie, sendLoginLink } from "@/lib/server/staff-login";
import { afterLogin, LOGIN_BROWSER_COOKIE, LOGIN_PATH, NEXT_PARAM } from "@/lib/staff-session";
import { siteUrl } from "@/lib/site-url";

// Step one of logging in: the login page's form posts an email address, and
// a link is sent if it's a pauseai.uk one. It only works in this browser, so
// this marks it with a cookie, whatever was typed. Open to anyone (it's how
// staff get a session), so it doesn't call requireStaff(). The page says the
// same whatever was typed. The link keeps the page to go to once logged in.
export async function POST(request: NextRequest) {
  const form = await request.formData().catch(() => undefined);
  const email = form?.get("email");
  const browser = loginBrowser(request.cookies.get(LOGIN_BROWSER_COOKIE)?.value);
  await sendLoginLink(typeof email === "string" ? email : "", request, browser, {
    remember: form?.get("remember") === "on",
    next: afterLogin(form?.get(NEXT_PARAM)),
  });
  const response = NextResponse.redirect(siteUrl(`${LOGIN_PATH}?sent=1`, request), 303);
  response.cookies.set(loginBrowserCookie(browser));
  return response;
}
