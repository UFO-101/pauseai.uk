import { http, HttpResponse } from "msw";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { staffCopy } from "@/lib/content/staff-interface";
import { describeWithDatabase, useTestDatabase } from "@/tests/database";
import { server } from "@/tests/fixtures/msw";
import { notifications } from "@/tests/notifications";
import { query } from "./db";
import { tagUpcomingEvents, unclearEventEmails } from "./event-tagging";

const API = "https://public-api.luma.com/v1/calendars/event-tags";
const CALENDAR_TAGS = ["Big events", "London", "Online", "Oxford"];

/** Luma's tags, answering each apply as `apply` says, noting what it was asked for. */
function fakeLuma(apply: (tag: string) => Response = () => HttpResponse.json({ applied_count: 1, skipped_count: 0 })) {
  const applied: { tag: string; event_ids: string[] }[] = [];
  server.use(
    http.get(`${API}/list`, () =>
      HttpResponse.json({ entries: CALENDAR_TAGS.map((name) => ({ id: `tag-${name}`, name })), has_more: false }),
    ),
    http.post(`${API}/apply`, async ({ request }) => {
      const body = (await request.json()) as { tag: string; event_ids: string[] };
      applied.push(body);
      return apply(body.tag);
    }),
  );
  return applied;
}

async function addEvent(id: string, over: Record<string, unknown> = {}) {
  const row = {
    name: `Event ${id}`,
    start_at: "2030-01-01T18:00:00Z",
    access: "manage",
    city: "Oxford",
    location_type: "offline",
    tags: [],
    tags_checked_at: null,
    removed_at: null,
    ...over,
  };
  await query(
    `INSERT INTO luma_events (id, name, url, start_at, access, city, location_type, tags, tags_checked_at, removed_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [
      id,
      row.name,
      `https://luma.com/${id}`,
      row.start_at,
      row.access,
      row.city,
      row.location_type,
      row.tags,
      row.tags_checked_at,
      row.removed_at,
    ],
  );
}

const kept = async (id: string) =>
  (
    await query<{ tags: string[]; checked: boolean }>(
      `SELECT tags, tags_checked_at IS NOT NULL AS checked FROM luma_events WHERE id = $1`,
      [id],
    )
  )[0];

describeWithDatabase("tagging upcoming events", () => {
  useTestDatabase();
  beforeEach(() => {
    vi.stubEnv("DEPLOY_CONTEXT", "production");
    vi.stubEnv("LUMA_API_KEY", "key");
    vi.stubEnv("NOTIFICATION_INBOX", "inbox@example.com");
  });
  afterEach(() => vi.unstubAllEnvs());

  it("applies a clear event's tags on Luma and keeps them, once", async () => {
    const applied = fakeLuma();
    await addEvent("a-call", { city: null, location_type: "zoom", name: "Oxford call" });
    await addEvent("b-oxford", { start_at: "2030-01-02T18:00:00Z" });
    expect(await tagUpcomingEvents()).toEqual({ tagged: 2, requests: 4, unclear: [] });
    expect(applied).toEqual([
      { tag: "Online", event_ids: ["a-call"] },
      { tag: "Oxford", event_ids: ["a-call"] },
      { tag: "Oxford", event_ids: ["b-oxford"] },
    ]);
    expect(await kept("b-oxford")).toEqual({ tags: ["Oxford"], checked: true });
    expect(await tagUpcomingEvents()).toEqual({ tagged: 0, requests: 0, unclear: [] });
  });

  it("notes one it can't tell as unclear, once, changing nothing on Luma", async () => {
    const applied = fakeLuma();
    await addEvent("kent", { name: "Kent flyering", city: "Tunbridge Wells" });
    const { unclear, tagged } = await tagUpcomingEvents();
    expect(tagged).toBe(0);
    expect(unclear).toEqual([
      {
        name: "Kent flyering",
        startAt: "2030-01-01T18:00:00.000Z",
        city: "Tunbridge Wells",
        url: "https://luma.com/kent",
      },
    ]);
    expect(applied).toEqual([]);
    expect(await kept("kent")).toEqual({ tags: [], checked: true });
    expect((await tagUpcomingEvents()).unclear).toEqual([]);
  });

  it("leaves alone events past, tagged, removed, another calendar's, settled, or not read since it began", async () => {
    const applied = fakeLuma();
    await addEvent("past", { start_at: "2020-01-01T18:00:00Z" });
    await addEvent("tagged", { tags: ["Big events"] });
    await addEvent("removed", { removed_at: "2026-01-01T00:00:00Z" });
    await addEvent("theirs", { access: "view" });
    await addEvent("settled", { tags_checked_at: "2026-01-01T00:00:00Z" });
    await addEvent("unread", { location_type: null });
    expect(await tagUpcomingEvents()).toEqual({ tagged: 0, requests: 0, unclear: [] });
    expect(applied).toEqual([]);
  });

  it("settles only so many a run, soonest first", async () => {
    const applied = fakeLuma();
    for (let i = 10; i < 22; i++) await addEvent(`event-${i}`, { start_at: `2030-01-${i}T18:00:00Z` });
    expect((await tagUpcomingEvents()).tagged).toBe(10);
    expect(applied.at(-1)).toEqual({ tag: "Oxford", event_ids: ["event-19"] });
    expect((await tagUpcomingEvents()).tagged).toBe(2);
  });

  it("does nothing to Luma from a preview, whose events are a copy of the real ones", async () => {
    vi.stubEnv("DEPLOY_CONTEXT", "deploy-preview");
    const applied = fakeLuma();
    await addEvent("oxford");
    expect(await tagUpcomingEvents()).toEqual({ tagged: 0, requests: 0, unclear: [] });
    expect(applied).toEqual([]);
    expect(await kept("oxford")).toEqual({ tags: [], checked: false });
  });

  it("tags in a fixture build, whose Luma is pretend", async () => {
    vi.stubEnv("DEPLOY_CONTEXT", "");
    vi.stubEnv("DATA_FIXTURES", "1");
    fakeLuma();
    await addEvent("oxford");
    expect((await tagUpcomingEvents()).tagged).toBe(1);
  });

  it("reports an event Luma refuses and tries it again next run, still doing the rest", async () => {
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    let refuse = true;
    fakeLuma(() =>
      refuse ? new HttpResponse(null, { status: 500 }) : HttpResponse.json({ applied_count: 1, skipped_count: 0 }),
    );
    await addEvent("refused", { name: "Refused", start_at: "2030-01-01T18:00:00Z" });
    await addEvent("kent", { city: "Tunbridge Wells", start_at: "2030-01-02T18:00:00Z" });
    const first = await tagUpcomingEvents();
    expect(first.tagged).toBe(0);
    expect(first.unclear).toHaveLength(1);
    expect(errors.mock.calls.flat().join(" ")).toContain(staffCopy.problems.job.lumaTagRefused("Refused"));
    expect(await kept("refused")).toEqual({ tags: [], checked: false });
    refuse = false;
    expect((await tagUpcomingEvents()).tagged).toBe(1);
    expect(await kept("refused")).toEqual({ tags: ["Oxford"], checked: true });
    errors.mockRestore();
  });

  it("reports when Luma won't list its tags, settling nothing", async () => {
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    server.use(http.get(`${API}/list`, () => new HttpResponse(null, { status: 500 })));
    await addEvent("oxford");
    expect(await tagUpcomingEvents()).toEqual({ tagged: 0, requests: 0, unclear: [] });
    expect(errors.mock.calls.flat().join(" ")).toContain(staffCopy.problems.job.lumaTagsUnread);
    expect(await kept("oxford")).toEqual({ tags: [], checked: false });
    errors.mockRestore();
  });

  it("emails the notification inbox about each unclear event, online ones so named", async () => {
    const sent = notifications();
    await unclearEventEmails([
      {
        name: "Kent flyering",
        startAt: "2030-01-01T18:00:00.000Z",
        city: "Tunbridge Wells",
        url: "https://luma.com/k",
      },
      { name: "A mystery", startAt: "2030-01-02T18:00:00.000Z", city: null, url: "https://luma.com/m" },
    ]);
    const copy = staffCopy.events.unclearTagEmail;
    expect(sent.map((email) => email.Subject)).toEqual([copy.subject("Kent flyering"), copy.subject("A mystery")]);
    expect(sent[0].TextBody).toContain("Tunbridge Wells");
    expect(sent[0].TextBody).toContain("https://luma.com/k");
    expect(sent[1].TextBody).toContain(staffCopy.events.online);
  });
});
