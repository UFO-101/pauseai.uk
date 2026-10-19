import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import worker, { BackupContainer, backUpAndReport, type Env } from "./index.ts";

// @cloudflare/containers runs only in Cloudflare's runtime: a stand-in
// Container, and a getContainer whose fetch is the container's server.
const containerFetch = vi.fn<(request: Request) => Promise<Response>>();
vi.mock("@cloudflare/containers", () => ({
  Container: class {
    ctx: unknown;
    env: unknown;
    constructor(ctx: unknown, env: unknown) {
      this.ctx = ctx;
      this.env = env;
    }
  },
  getContainer: () => ({ fetch: containerFetch }),
}));

// Everything the rules in checks.ts look for.
const REPORT = {
  bytes: 4,
  sha256: "abc",
  tables: {
    import_runs: { rows: 1, newest: new Date().toISOString() },
    letters: { rows: 1, newest: null },
    letter_events: { rows: 1, newest: null },
    audit_log: { rows: 1, newest: null },
    politicians: { rows: 650 },
  },
};
let stored: Record<string, { value: string; options?: unknown }>;
let env: Env;
const send = vi.fn<typeof fetch>();

beforeEach(() => {
  stored = {};
  env = {
    DATABASE_URL: "postgresql://reader@db/site",
    RUN_SECRET: "s3cret",
    POSTMARK_SERVER_TOKEN: "token",
    ALERT_FROM: "backups@example.org",
    ALERT_TO: "me@example.org",
    BACKUPS: {
      get: async (key: string) => (stored[key] ? { text: async () => stored[key].value } : null),
      put: async (key: string, value: string | ReadableStream, options?: unknown) => {
        stored[key] = { value: await new Response(value).text(), options };
      },
    } as unknown as R2Bucket,
    BACKUP_CONTAINER: {} as Env["BACKUP_CONTAINER"],
  };
  containerFetch.mockImplementation(async (request) =>
    new URL(request.url).pathname === "/backup" ? Response.json(REPORT) : new Response("DUMP"),
  );
  send.mockResolvedValue(new Response("ok"));
  vi.stubGlobal("fetch", send);
  // Cloudflare's stream that insists on a length; a plain pass-through here.
  vi.stubGlobal(
    "FixedLengthStream",
    class extends TransformStream {
      constructor(length: number) {
        super();
        expect(length).toBe(REPORT.bytes);
      }
    },
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("BackupContainer", () => {
  it("gives the container the database's connection string", () => {
    const container = new BackupContainer({} as BackupContainer["ctx"], env);
    expect(container.envVars).toEqual({ DATABASE_URL: "postgresql://reader@db/site" });
    expect(container.defaultPort).toBe(8080);
  });
});

describe("backUpAndReport", () => {
  it("backs up into the bucket, checking the dump's hash", async () => {
    const outcome = await backUpAndReport(env, new Date(Date.now() + 1000));
    expect(outcome.problems).toEqual([]);
    expect(stored[outcome.manifest!.key]).toEqual({ value: "DUMP", options: { sha256: "abc" } });
    const [request] = containerFetch.mock.calls[0];
    expect(request.method).toBe("POST");
    expect(new URL(request.url).pathname).toBe("/backup");
  });
});

describe("the scheduled handler", () => {
  it("backs up and reports", async () => {
    await worker.scheduled({} as ScheduledController, env);
    expect(Object.keys(stored)).toContain("latest.json");
  });
});

describe("the fetch handler", () => {
  const run = (init: RequestInit = {}, path = "/run") =>
    worker.fetch(new Request(`https://backup.example.workers.dev${path}`, { method: "POST", ...init }) as never, env);
  const authorized = { headers: { Authorization: "Bearer s3cret" } };

  it("runs a backup on POST /run, and replies with the report", async () => {
    const response = await run(authorized);
    expect(response.status).toBe(200);
    expect(await response.text()).toMatch(/^No problems\./);
  });

  it("replies 500 with the problems from a bad backup", async () => {
    containerFetch.mockResolvedValue(new Response("pg_dump failed", { status: 500 }));
    const response = await run(authorized);
    expect(response.status).toBe(500);
    expect(await response.text()).toBe("Problems:\n- The container couldn't back up the database. pg_dump failed");
  });

  it("replies 500 when the report can't be sent", async () => {
    containerFetch.mockResolvedValue(new Response("pg_dump failed", { status: 500 }));
    send.mockResolvedValue(new Response("no", { status: 401 }));
    const response = await run(authorized);
    expect(response.status).toBe(500);
    expect(await response.text()).toMatch(/^Postmark replied 401: no/);
  });

  it("refuses a request without the secret", async () => {
    expect((await run()).status).toBe(401);
    expect((await run({ headers: { Authorization: "Bearer wrong" } })).status).toBe(401);
    env.RUN_SECRET = undefined;
    expect((await run({ headers: { Authorization: "Bearer " } })).status).toBe(401);
    expect(containerFetch).not.toHaveBeenCalled();
  });

  it("replies 404 to anything else", async () => {
    expect((await run(authorized, "/other")).status).toBe(404);
    expect((await run({ method: "GET" })).status).toBe(404);
  });
});
