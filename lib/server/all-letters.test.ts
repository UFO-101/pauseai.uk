import { afterEach, expect, it, vi } from "vitest";
import { addTestLetter, addTestMp, addTestPolitician, describeWithDatabase, useTestDatabase } from "@/tests/database";
import { allLettersSearch } from "@/lib/staff-search";
import { emailPeople, listAllLetters } from "./all-letters";
import { linkSupporters } from "./supporters";
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

  const found = async (params: Record<string, string | string[]>, supporters = true) =>
    (await listAllLetters(allLettersSearch(params).filter, supporters)).letters.map((letter) =>
      letter.kind === "pauseai" ? letter.mailingTitle : letter.kind === "one-off" ? letter.subject : letter.senderEmail,
    );

  /** A thread, its messages in order: who each is from and when. */
  async function thread(
    subject: string,
    messages: [string, string][],
    someoneElse = false,
    people: number[] = [],
    copied: string[] = [],
    to = "",
  ) {
    const [{ id }] = await query<{ id: number }>(
      "INSERT INTO one_off_threads (subject, someone_else, latest_at) VALUES ($1, $2, $3) RETURNING id::int",
      [subject, someoneElse, messages.at(-1)![1]],
    );
    for (const [i, [from, at]] of messages.entries()) {
      await query(
        `INSERT INTO one_off_messages (thread_id, account, gmail_message_id, gmail_thread_id, from_address, addresses, at, from_us, blob_key, size, to_line)
         VALUES ($1, 'jo@pauseai.uk', $2, $3, $4, $6, $5, $4 LIKE '%@pauseai.uk', $2, 1, $7)`,
        [id, `${subject}-${i}`, subject, from, at, copied, to],
      );
    }
    for (const person of people) {
      await query("INSERT INTO one_off_thread_people (thread_id, notable_person_id) VALUES ($1, $2)", [id, person]);
    }
  }

  it("has one-off threads, sent at their first message, replied to at a politician's next", async () => {
    await fill();
    const polly = await addTestPolitician({ airtableId: "recPolly2", name: "Polly Two", email: "polly2@example.org" });
    await thread(
      "Ours, no answer",
      [
        ["jo@pauseai.uk", "2026-10-17T10:00:00Z"],
        ["jo@pauseai.uk", "2026-10-17T11:00:00Z"],
      ],
      false,
      [polly],
    );
    await thread("Answered by address", [
      ["jo@pauseai.uk", "2026-10-16T10:00:00Z"],
      ["polly2@example.org", "2026-10-20T10:00:00Z"],
    ]);
    await thread("Answered by domain", [
      ["jo@pauseai.uk", "2026-09-15T10:00:00Z"],
      ["x@lords.parliament.uk", "2026-10-01T11:00:00Z"],
    ]);
    await thread("Their own", [["polly2@example.org", "2026-08-10T10:00:00Z"]]);
    expect(await found({ type: "one-off" })).toEqual([
      "Ours, no answer",
      "Answered by address",
      "Answered by domain",
      "Their own",
    ]);
    expect(await found({ type: "one-off", replied: "yes" })).toEqual(["Answered by address", "Answered by domain"]);
    expect(await found({ type: "one-off", replied: "7" })).toEqual(["Answered by address"]);
    expect(await found({ type: "one-off", sent: "7" })).toEqual(["Ours, no answer", "Answered by address"]);
    expect(await found({ q: "polly two" })).toEqual(["Ours, no answer"]);
    const [row] = (await listAllLetters(allLettersSearch({ q: "ours" }).filter, true)).letters;
    expect(row).toMatchObject({
      kind: "one-off",
      people: [{ id: polly, name: "Polly Two" }],
      senderEmail: "jo@pauseai.uk",
      fromUs: true,
    });
  });

  it("filters by who it's to, or all but them, and offers only those with an email", async () => {
    await fill();
    const polly = await addTestPolitician({ airtableId: "recPolly2", name: "Polly Two", email: "polly2@example.org" });
    await addTestPolitician({ airtableId: "recNone", name: "No Emails", email: "none@example.org" });
    await thread("With Polly Two", [["jo@pauseai.uk", "2026-10-17T10:00:00Z"]], false, [polly]);
    expect(await found({ to: String(polly) })).toEqual(["With Polly Two"]);
    expect(await found({ to: `!${polly}` })).not.toContain("With Polly Two");
    expect((await emailPeople(true)).map((person) => person.name)).toEqual(["Polly Placeholder", "Polly Two"]);
  });

  it("offers staff without supporters only those with an email they can see", async () => {
    vi.stubEnv("FIXTURE_NOW", NOW);
    const polly = await addTestPolitician();
    const two = await addTestPolitician({ airtableId: "recPolly2", name: "Polly Two", email: "polly2@example.org" });
    const three = await addTestPolitician({
      airtableId: "recPolly3",
      name: "Polly Three",
      email: "polly3@example.org",
    });
    await addTestLetter({
      campaign: "regulate-letter-pm",
      politicianId: polly,
      senderEmail: "a@example.com",
      status: "sent",
      sentAt: NOW,
      repliedAt: null,
    });
    await thread("Hidden", [["vera@example.com", "2026-10-16T10:00:00Z"]], true, [two]);
    await thread("Seen", [["jo@pauseai.uk", "2026-10-16T10:00:00Z"]], false, [three]);
    expect((await emailPeople(false)).map((person) => person.name)).toEqual(["Polly Three"]);
    expect((await emailPeople(true)).map((person) => person.name).sort()).toEqual([
      "Polly Placeholder",
      "Polly Three",
      "Polly Two",
    ]);
  });

  it("finds who sent it, a thread by its first message, and letters or threads alone", async () => {
    await fill();
    await addTestPolitician({ airtableId: "recPolly2", name: "Polly Two", email: "polly2@example.org" });
    await thread("From us", [["jo@pauseai.uk", "2026-10-17T10:00:00Z"]]);
    await thread("From a politician", [["polly2@example.org", "2026-10-16T10:00:00Z"]]);
    await thread("From a stranger", [["stranger@example.org", "2026-10-13T10:00:00Z"]]);
    await query("INSERT INTO luma_people (user_id, email, name) VALUES ('usr-vera', 'vera@example.com', 'Vera')");
    await linkSupporters();
    await thread("From a supporter", [["vera@example.com", "2026-10-12T10:00:00Z"]]);
    expect(await found({ from: "pauseai" })).toEqual(["The March mailing", "From us"]);
    expect(await found({ from: "politician" })).toEqual(["From a politician"]);
    expect(await found({ from: "other" })).toEqual(["From a stranger"]);
    expect(await found({ from: "supporter", type: "one-off" })).toEqual(["From a supporter"]);
    expect(await found({ from: "supporter", type: "campaign" })).toEqual(["new@example.com", "old@example.com"]);
    expect(await found({ type: "mailing" })).toEqual(["The March mailing"]);
    expect(await found({ type: ["campaign", "mailing"], replied: "yes" })).toEqual([
      "new@example.com",
      "The March mailing",
    ]);
    expect(await found({ type: "!one-off", from: "pauseai" })).toEqual(["The March mailing"]);
  });

  it("says who a thread's first message was to: PauseAI once, a politician by their ID, anyone else by name", async () => {
    vi.stubEnv("FIXTURE_NOW", NOW);
    const polly = await addTestPolitician();
    await thread(
      "To several",
      [["jo@pauseai.uk", "2026-10-17T10:00:00Z"]],
      false,
      [],
      [],
      "Jo <jo@pauseai.uk>, sam@pauseai.uk, Polly <polly.placeholder.mp@parliament.uk>, Vera <vera@example.com>, kim@example.com",
    );
    const [row] = (await listAllLetters(allLettersSearch({}).filter, true)).letters;
    expect(row).toMatchObject({
      recipients: [
        { name: "", politicianId: null, pauseai: true },
        { name: "Polly", politicianId: polly, pauseai: false },
        { name: "Vera", politicianId: null, pauseai: false },
        { name: "kim@example.com", politicianId: null, pauseai: false },
      ],
    });
  });

  it("names a politician on a thread by their own name, whatever the To line calls them", async () => {
    vi.stubEnv("FIXTURE_NOW", NOW);
    const polly = await addTestPolitician();
    await thread(
      "Bare",
      [["jo@pauseai.uk", "2026-10-17T10:00:00Z"]],
      false,
      [polly],
      [],
      "polly.placeholder.mp@parliament.uk",
    );
    const [row] = (await listAllLetters(allLettersSearch({}).filter, true)).letters;
    expect(row).toMatchObject({ recipients: [{ name: "Polly Placeholder", politicianId: polly, pauseai: false }] });
  });

  it("filters by several senders, or all but some", async () => {
    await fill();
    await thread("A thread", [["jo@pauseai.uk", "2026-10-17T10:00:00Z"]]);
    expect(await found({ type: ["campaign", "mailing"], from: ["supporter", "pauseai"] })).toEqual([
      "new@example.com",
      "The March mailing",
      "old@example.com",
    ]);
    expect(await found({ from: "!pauseai" })).toEqual(["new@example.com", "old@example.com"]);
  });

  it("leaves out a thread with a test MP", async () => {
    vi.stubEnv("FIXTURE_NOW", NOW);
    const test = await addTestMp();
    await thread("With a test MP", [["jo@pauseai.uk", "2026-10-17T10:00:00Z"]], false, [test]);
    expect(await found({})).toEqual([]);
  });

  it("without supporters, leaves out their letters and threads with someone else, as if they weren't there", async () => {
    await fill();
    await thread("Just us", [["jo@pauseai.uk", "2026-10-17T10:00:00Z"]]);
    await thread("With a volunteer", [["vera@example.com", "2026-10-16T10:00:00Z"]], true);
    await thread("Copied to a supporter", [["jo@pauseai.uk", "2026-10-15T10:00:00Z"]], false, [], ["vera@example.com"]);
    expect(await found({}, false)).toEqual(["The March mailing", "Just us"]);
    expect(await found({ from: "supporter" }, false)).toEqual([]);
    expect((await listAllLetters(allLettersSearch({}).filter, false)).total).toBe(2);
    expect(await found({})).toContain("With a volunteer");
  });

  it("lists both kinds, newest sent first, leaving out test MPs'", async () => {
    await fill();
    expect(await found({})).toEqual(["new@example.com", "The March mailing", "old@example.com"]);
    const { total, pages } = await listAllLetters(allLettersSearch({}).filter, true);
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
    expect((await listAllLetters(allLettersSearch({ page: "2" }).filter, true)).total).toBe(3);
  });
});
