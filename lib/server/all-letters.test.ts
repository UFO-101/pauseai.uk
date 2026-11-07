import { afterEach, expect, it, vi } from "vitest";
import { addTestLetter, addTestMp, addTestPolitician, describeWithDatabase, useTestDatabase } from "@/tests/database";
import { allLettersSearch } from "@/lib/staff-search";
import { listAllLetters } from "./all-letters";
import { query } from "./db";

const NOW = "2026-10-21T12:00:00.000Z";

describeWithDatabase("listAllLetters", () => {
  useTestDatabase();
  afterEach(() => vi.unstubAllEnvs());

  /** Two supporters' letters, one replied to lately; one of PauseAI's replied to lately; one to a test MP. */
  async function fill() {
    vi.stubEnv("FIXTURE_NOW", NOW);
    const mp = await addTestPolitician();
    const test = await addTestMp();
    const letter = (politicianId: number, senderEmail: string, sentAt: string, repliedAt: string | null) =>
      addTestLetter({ campaign: "regulate-letter-pm", politicianId, senderEmail, status: "sent", sentAt, repliedAt });
    await letter(mp, "new@example.com", "2026-10-20T10:00:00Z", "2026-10-20T15:00:00Z");
    await letter(mp, "old@example.com", "2026-08-01T10:00:00Z", null);
    await letter(test, "test@example.com", "2026-10-19T10:00:00Z", null);
    const [{ id: mailing }] = await query<{ id: number }>(
      `INSERT INTO mailings (title, airtable_field, audience, channel, state) VALUES ('The March mailing', 'March', 'politicians', 'email', 'sent')
       ON CONFLICT (airtable_field) DO UPDATE SET title = EXCLUDED.title RETURNING id::int`,
    );
    const [{ id }] = await query<{ id: number }>(
      `INSERT INTO letters (notable_person_id, status, sent_at, replied_at, kind)
       VALUES ($1, 'sent', '2026-10-18T10:00:00Z', '2026-10-01T10:00:00Z', 'pauseai') RETURNING id::int`,
      [mp],
    );
    await query("INSERT INTO letters_from_pauseai (id, mailing_id) VALUES ($1, $2)", [id, mailing]);
  }

  const found = async (params: Record<string, string>) =>
    (await listAllLetters(allLettersSearch(params).filter)).letters.map((letter) =>
      letter.kind === "pauseai" ? letter.mailingTitle : letter.senderEmail,
    );

  it("lists both kinds, newest sent first, leaving out test MPs'", async () => {
    await fill();
    expect(await found({})).toEqual(["new@example.com", "The March mailing", "old@example.com"]);
    const { total, pages } = await listAllLetters(allLettersSearch({}).filter);
    expect({ total, pages }).toEqual({ total: 3, pages: 1 });
  });

  it("filters by who from, by when sent, by search", async () => {
    await fill();
    expect(await found({ from: "pauseai" })).toEqual(["The March mailing"]);
    expect(await found({ from: "supporter", sent: "7" })).toEqual(["new@example.com"]);
    expect(await found({ sent: "30" })).toEqual(["new@example.com", "The March mailing"]);
    expect(await found({ q: "march" })).toEqual(["The March mailing"]);
    expect(await found({ q: "OLD@" })).toEqual(["old@example.com"]);
  });

  it("filters by a reply: any, none, or one in the window", async () => {
    await fill();
    expect(await found({ replied: "yes" })).toEqual(["new@example.com", "The March mailing"]);
    expect(await found({ replied: "no" })).toEqual(["old@example.com"]);
    expect(await found({ replied: "7" })).toEqual(["new@example.com"]);
    expect(await found({ replied: "30" })).toEqual(["new@example.com", "The March mailing"]);
  });

  it("gives a page's letters", async () => {
    await fill();
    expect(await found({ page: "2" })).toEqual([]);
    expect((await listAllLetters(allLettersSearch({ page: "2" }).filter)).total).toBe(3);
  });
});
