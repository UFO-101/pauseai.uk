import { NextResponse, type NextRequest } from "next/server";
import {
  backPath,
  backWithOutcome,
  GMAIL_CALLBACK_PATH,
  GMAIL_STATE_COOKIE,
  type GmailConnectOutcome,
} from "@/lib/gmail-connect";
import { connectGmail } from "@/lib/server/gmail-accounts";
import { requireStaff } from "@/lib/server/staff-auth";
import { siteUrl } from "@/lib/site-url";

/** The state and the page to go back to, kept by the connect route, if the cookie holds them. */
function started(cookie: string | undefined): { state: string; back: string } | undefined {
  try {
    const value = JSON.parse(cookie ?? "");
    return typeof value.state === "string" ? { state: value.state, back: backPath(value.back) } : undefined;
  } catch {
    return undefined;
  }
}

/** Connects `email`'s Gmail with `code`, saying how it went. */
async function connect(email: string, code: string, request: NextRequest): Promise<GmailConnectOutcome> {
  try {
    const result = await connectGmail(email, code, siteUrl(GMAIL_CALLBACK_PATH, request).href);
    return result.connected ? "connected" : result.reason;
  } catch (error) {
    console.error(`Couldn't connect ${email}'s Gmail:`, error);
    return "failed";
  }
}

/**
 * Where Google's consent comes back to: with a code, which connects the
 * staff member's Gmail if the state is the one this browser started with,
 * and the account is their own; or with an error, if they said no. Goes
 * back to the page it started from, saying how it ended.
 */
export async function GET(request: NextRequest) {
  const { email } = await requireStaff();
  const params = request.nextUrl.searchParams;
  const start = started(request.cookies.get(GMAIL_STATE_COOKIE)?.value);
  const code = params.get("code");
  const outcome: GmailConnectOutcome =
    start && params.get("state") === start.state ? (code ? await connect(email, code, request) : "refused") : "failed";
  const response = NextResponse.redirect(
    siteUrl(backWithOutcome(start?.back ?? backPath(null), outcome), request),
    303,
  );
  response.cookies.delete({ name: GMAIL_STATE_COOKIE, path: "/staff/api/gmail" });
  return response;
}
