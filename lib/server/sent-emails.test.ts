import { expect, it, vi } from "vitest";
import { addTestLetter, addTestPolitician, describeWithDatabase, useTestDatabase } from "@/tests/database";
import type { SentEmailSort } from "@/lib/sent-email-sort";
import { query } from "./db";
import { send } from "./email";
import { recordProblem } from "./email";
import { listSentEmails } from "./sent-emails";
import { linkSupporters } from "./supporters";

const log = (row: Record<string, unknown>) => {
  const keys = Object.keys(row);
  return query<{ id: number }>(
    `INSERT INTO email_sends (${keys.join(", ")}) VALUES (${keys.map((_, i) => `$${i + 1}`).join(", ")}) RETURNING id::int AS id`,
    Object.values(row),
  );
};

describeWithDatabase("the sent emails", () => {
  useTestDatabase();

  it("saves a new email's subject and From, whichever way it went, and for one refused too", async () => {
    vi.stubEnv("POSTMARK_SERVER_TOKEN", "t");
    await send(
      { From: "PauseAI UK <noreply@notify.pauseai.uk>", To: "jo@pauseai.uk", Subject: "Hello", TextBody: "x" },
      "staff-alert",
    );
    const [row] = await query<{ subject: string; from: string }>(
      'SELECT subject, from_address AS "from" FROM email_sends',
    );
    expect(row).toEqual({ subject: "Hello", from: "noreply@notify.pauseai.uk" });
    vi.unstubAllEnvs();
  });

  it("lists newest first, with who each is to and from through its letter", async () => {
    const polly = await addTestPolitician();
    const letter = await addTestLetter({
      politicianId: polly,
      senderName: "Sam Sender",
      senderEmail: "sam@example.com",
    });
    await linkSupporters();
    const [{ supporter }] = await query<{ supporter: number }>(
      "SELECT supporter_id::int AS supporter FROM supporter_links",
    );
    await log({
      at: "2026-01-01",
      purpose: "letter",
      letter_id: letter,
      address: "polly.placeholder.mp@parliament.uk",
      outcome: "sent",
      message_id: "m1",
      subject: "S",
    });
    await log({
      at: "2026-01-02",
      purpose: "letter-copy",
      letter_id: letter,
      address: "sam@example.com",
      outcome: "sent",
      message_id: "m2",
    });
    await log({
      at: "2026-01-03",
      purpose: "relay",
      letter_id: letter,
      address: "sam@example.com",
      outcome: "sent",
      message_id: "m3",
    });
    await log({
      at: "2026-01-04",
      purpose: "office-notice",
      letter_id: letter,
      address: "polly.placeholder.mp@parliament.uk",
      outcome: "sent",
      message_id: "m4",
    });
    const { emails, total } = await listSentEmails({}, true);
    expect(total).toBe(4);
    expect(emails.map((e) => e.purpose)).toEqual(["office-notice", "relay", "letter-copy", "letter"]);
    const politician = { name: "Polly Placeholder", href: `/staff/politicians/${polly}` };
    const sender = { name: "Sam Sender", href: `/staff/supporters/${supporter}` };
    expect(emails[3]).toMatchObject({
      to: politician,
      from: sender,
      letterHref: `/staff/letters/${letter}`,
      campaignHref: "/staff/campaigns/regulate-letter-pm",
      mailingHref: null,
    });
    expect(emails[2]).toMatchObject({ to: sender, from: null });
    expect(emails[1]).toMatchObject({ to: sender, from: politician });
    expect(emails[0]).toMatchObject({ to: politician, from: sender });
    // An admin without supporters sees their name with no link.
    const limited = await listSentEmails({}, false);
    expect(limited.emails[3].from).toEqual({ name: "Sam Sender", href: null });
    expect(limited.emails[2].to).toEqual({ name: "Sam Sender", href: null });
  });

  it("links a mailing's letter through its mailing, tags an imported one, and a test has no link", async () => {
    const polly = await addTestPolitician();
    const [{ id }] = await query<{ id: number }>(
      `INSERT INTO letters (kind, notable_person_id, status, sent_at) VALUES ('pauseai', $1, 'sent', now()) RETURNING id::int AS id`,
      [polly],
    );
    const [{ mailing }] = await query<{ mailing: number }>("SELECT id::int AS mailing FROM mailings LIMIT 1");
    await query("INSERT INTO letters_from_pauseai (id, mailing_id) VALUES ($1, $2)", [id, mailing]);
    await log({
      purpose: "mailing",
      letter_id: id,
      address: "polly.placeholder.mp@parliament.uk",
      outcome: "sent",
      message_id: "g1",
      backend: "gmail",
      sender: "joseph@pauseai.uk",
      imported: true,
    });
    await log({
      at: "2020-01-01",
      purpose: "mailing-test",
      address: "jo@pauseai.uk",
      outcome: "sent",
      message_id: "g2",
      backend: "gmail",
      sender: "jo@pauseai.uk",
    });
    const { emails } = await listSentEmails({}, true);
    expect(emails[0]).toMatchObject({
      imported: true,
      fromAddress: "joseph@pauseai.uk",
      letterHref: `/staff/mailings/${mailing}/letters/${id}`,
      mailingHref: `/staff/mailings/${mailing}`,
      campaignHref: null,
    });
    expect(emails[1]).toMatchObject({ fromAddress: "jo@pauseai.uk", letterHref: null, to: null });
  });

  it("finds those with a letter, a campaign or a mailing to lead to, or leaves them out", async () => {
    const polly = await addTestPolitician();
    const campaign = await addTestLetter({ politicianId: polly });
    const [{ id: mailing }] = await query<{ id: number }>(
      `INSERT INTO letters (kind, notable_person_id, status) VALUES ('pauseai', $1, 'sent') RETURNING id::int AS id`,
      [polly],
    );
    await query("INSERT INTO letters_from_pauseai (id, mailing_id) SELECT $1, id FROM mailings LIMIT 1", [mailing]);
    await log({
      purpose: "letter",
      letter_id: campaign,
      address: "a@example.com",
      outcome: "sent",
      message_id: "1",
      at: "2026-01-03",
    });
    await log({
      purpose: "mailing",
      letter_id: mailing,
      address: "b@example.com",
      outcome: "sent",
      message_id: "2",
      at: "2026-01-02",
    });
    await log({ purpose: "staff-login", address: "c@example.com", outcome: "sent", message_id: "3", at: "2026-01-01" });
    const list = async (filter: Parameters<typeof listSentEmails>[0]) =>
      (await listSentEmails(filter, true)).emails.map((e) => e.address);
    expect(await list({ link: ["letter"] })).toEqual(["a@example.com", "b@example.com"]);
    expect(await list({ link: ["campaign"] })).toEqual(["a@example.com"]);
    expect(await list({ link: ["mailing"] })).toEqual(["b@example.com"]);
    expect(await list({ link: ["campaign", "mailing"] })).toEqual(["a@example.com", "b@example.com"]);
    expect(await list({ not: { link: ["letter"] } })).toEqual(["c@example.com"]);
    expect((await listSentEmails({ link: ["campaign"] }, true)).total).toBe(1);
  });

  it("matches an address with no letter to one politician or supporter, or says only the address if several", async () => {
    const polly = await addTestPolitician();
    await addTestPolitician({ name: "Twin", email: "shared@parliament.uk", airtableId: "a" });
    await addTestPolitician({ name: "Twin Two", email: "shared@parliament.uk", airtableId: "b" });
    await log({
      purpose: "staff-alert",
      address: "polly.placeholder.mp@parliament.uk",
      outcome: "sent",
      message_id: "1",
    });
    await log({
      purpose: "staff-alert",
      address: "shared@parliament.uk",
      outcome: "sent",
      message_id: "2",
      at: "2020-01-01",
    });
    const { emails } = await listSentEmails({}, true);
    expect(emails[0].to).toEqual({ name: "Polly Placeholder", href: `/staff/politicians/${polly}` });
    expect(emails[1].to).toBeNull();
  });

  it("says an email bounced or was complained of, and filters and searches", async () => {
    await log({
      at: "2026-01-03",
      purpose: "staff-alert",
      address: "a@example.com",
      outcome: "sent",
      message_id: "b1",
      subject: "Bounces",
    });
    await log({
      at: "2026-01-02",
      purpose: "staff-login",
      address: "b@example.com",
      outcome: "sent",
      message_id: "c1",
      subject: "Complaint",
    });
    await log({ at: "2026-01-01", purpose: "staff-login", address: "c@example.com", outcome: "refused" });
    await log({
      at: "2026-01-04",
      purpose: "staff-alert",
      address: "d@example.com",
      outcome: "sent",
      message_id: "s1",
      backend: "gmail",
      sender: "jo@pauseai.uk",
    });
    await recordProblem({ address: "a@example.com", messageId: "b1", kind: "hard", reason: "x", canReset: true });
    await recordProblem({ address: "b@example.com", messageId: "c1", kind: "complaint", reason: "x", canReset: false });
    await recordProblem({ address: "d@example.com", messageId: "s1", kind: "soft", reason: "x", canReset: true });
    const list = async (filter: Parameters<typeof listSentEmails>[0]) =>
      (await listSentEmails(filter, true)).emails.map((e) => e.address);
    const { emails } = await listSentEmails({}, true);
    expect(emails.map((e) => e.outcome)).toEqual(["sent", "bounced", "complaint", "refused"]);
    expect(emails.map((e) => e.problem)).toEqual([null, "hard", "complaint", null]);
    expect(await list({ search: "bounc" })).toEqual(["a@example.com"]);
    expect(await list({ purpose: ["staff-login"] })).toEqual(["b@example.com", "c@example.com"]);
    expect(await list({ not: { purpose: ["staff-login"] } })).toEqual(["d@example.com", "a@example.com"]);
    expect(await list({ outcome: ["bounced"] })).toEqual(["a@example.com"]);
    expect(await list({ not: { outcome: ["sent", "bounced"] } })).toEqual(["b@example.com", "c@example.com"]);
    expect(await list({ backend: ["gmail"] })).toEqual(["d@example.com"]);
    expect(await list({ not: { backend: ["gmail"] } })).toHaveLength(3);
    expect((await listSentEmails({ page: 2 }, true)).emails).toEqual([]);
    // Sorted, those with nothing to sort by last, whichever way.
    const sorted = (key: SentEmailSort, dir: "asc" | "desc") => list({ sort: { key, dir } });
    expect(await sorted("when", "asc")).toEqual(["c@example.com", "b@example.com", "a@example.com", "d@example.com"]);
    expect(await sorted("to", "desc")).toEqual(["d@example.com", "c@example.com", "b@example.com", "a@example.com"]);
    expect((await sorted("subject", "asc")).slice(0, 2)).toEqual(["a@example.com", "b@example.com"]);
    expect((await sorted("subject", "desc")).slice(-2)).toEqual(["d@example.com", "c@example.com"]);
    expect((await sorted("outcome", "asc"))[0]).toBe("a@example.com");
    expect((await sorted("what", "asc")).slice(0, 2)).toEqual(["d@example.com", "a@example.com"]);
    expect((await sorted("backend", "desc"))[0]).toBe("d@example.com");
    expect((await sorted("from", "asc"))[0]).toBe("d@example.com");
  });
});
