// For the download routes' tests: a GET of a route as Jo, logged in with
// `permissions`. The test mocks next/headers with tests/next-headers.ts.
import { NextRequest } from "next/server";
import { query } from "@/lib/server/db";
import { createSession } from "@/lib/server/staff-auth";
import { requestCookies } from "./next-headers";

/** Logs Jo in with `permissions`, and GETs `url` from `route`. */
export async function downloadAs(
  route: (request: NextRequest) => Promise<Response>,
  url: string,
  permissions: string[] = [],
): Promise<Response> {
  requestCookies.set("staff_session", await createSession("jo@pauseai.uk"));
  await query("UPDATE staff_accounts SET permissions = $1 WHERE email = 'jo@pauseai.uk'", [permissions]);
  return route(new NextRequest(url));
}
