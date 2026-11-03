// An outside service down, for one storyboard flow alone, as flows run at
// once against one server: the flow writes the service's host to
// FAILING_DIR/<scope>, its database's name (failService), and every call it
// makes there answers as that service does when it's down (failingResponse,
// which outside-services.ts asks first). Google's token endpoint answers
// as it does once access has been revoked, as that's how its refusal
// shows.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

/** Makes `host` fail for the flow on `scope`, from now on, by writing it in `dir`. */
export function failService(scope: string, host: string, dir: string): void {
  mkdirSync(dir, { recursive: true });
  const file = join(dir, scope);
  writeFileSync(file, [...hostsFor(file), host].join("\n"));
}

function hostsFor(file: string): string[] {
  return existsSync(file) ? readFileSync(file, "utf8").split("\n") : [];
}

/** How `hostname` answers the flow on `scope`, if the flow made it fail; otherwise undefined. */
export function failingResponse(hostname: string, scope?: string, dir = process.env.FAILING_DIR): Response | undefined {
  if (!scope || !dir || !hostsFor(join(dir, scope)).includes(hostname)) return undefined;
  if (hostname === "oauth2.googleapis.com")
    return new Response(
      JSON.stringify({ error: "invalid_grant", error_description: "Token has been expired or revoked." }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      },
    );
  return new Response("Service Unavailable", { status: 503 });
}
