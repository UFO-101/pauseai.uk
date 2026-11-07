import { afterEach, expect, it, vi } from "vitest";
import { staffCopy } from "@/lib/content/staff-interface";
import { addTestMp, describeWithDatabase, useTestDatabase } from "@/tests/database";
import { NOTIFICATIONS, notifications } from "@/tests/notifications";
import { query } from "./db";
import { notifyStaff, reportMailingBounces, staffLink } from "./notifications";

afterEach(() => vi.unstubAllEnvs());

it("links to the site where the build knows its address, and gives the path where it can't", () => {
  vi.stubEnv("SITE_ORIGIN", "https://pauseai.uk");
  expect(staffLink("/staff/letters", undefined)).toBe("https://pauseai.uk/staff/letters");
  vi.stubEnv("SITE_ORIGIN", "");
  vi.stubEnv("DEPLOY_CONTEXT", "local");
  expect(staffLink("/staff/letters", undefined)).toBe("/staff/letters");
});

describeWithDatabase("notifyStaff", () => {
  useTestDatabase();

  it("emails the notification inbox, logged as a staff alert, and nothing where it isn't set", async () => {
    const sent = notifications();
    expect(await notifyStaff("Subject", "Body")).toBe(true);
    expect(sent).toEqual([expect.objectContaining({ To: NOTIFICATIONS, Subject: "Subject", TextBody: "Body" })]);
    expect(await query("SELECT purpose, address, letter_id FROM email_sends")).toEqual([
      { purpose: "staff-alert", address: NOTIFICATIONS, letter_id: null },
    ]);
    vi.stubEnv("NOTIFICATION_INBOX", "");
    expect(await notifyStaff("Subject", "Body")).toBe(false);
    expect(sent).toHaveLength(1);
  });
});

describeWithDatabase("reportMailingBounces", () => {
  useTestDatabase();

  const LINK = "https://pauseai.uk/staff/politicians/blocked-emails";
  const words = staffCopy.notifications.mailingBounces;
  const ADDRESS = "test-mp@parliament.example";
  const NAME = "Testy McTestface MP";
  let messages = 0;

  /** A letter to the MP sent as `purpose`, and a problem with it from `at`. */
  async function bounced(mp: number, reason: string, { kind = "hard", purpose = "mailing", at = "now()" } = {}) {
    const [{ id }] = await query<{ id: number }>(
      "INSERT INTO letters (kind, notable_person_id, status) VALUES ('pauseai', $1, 'bounced') RETURNING id::int AS id",
      [mp],
    );
    const messageId = `report-${++messages}`;
    await query(
      "INSERT INTO email_sends (purpose, letter_id, address, outcome, message_id) VALUES ($1, $2, $3, 'sent', $4)",
      [purpose, id, ADDRESS, messageId],
    );
    await query(
      `INSERT INTO email_problems (address, message_id, kind, reason, can_reset, at) VALUES ($1, $2, $3, $4, $5, ${at})`,
      [ADDRESS, messageId, kind, reason, kind !== "complaint"],
    );
  }

  function setUp() {
    vi.stubEnv("SITE_ORIGIN", "https://pauseai.uk");
    return notifications();
  }

  it("says nothing when no mailing's letter bounced, nor of soft bounces, other emails, or those long past", async () => {
    const sent = setUp();
    const mp = await addTestMp();
    await reportMailingBounces(undefined);
    await bounced(mp, "Mailbox full", { kind: "soft" });
    await bounced(mp, "Unknown user", { purpose: "letter" });
    await bounced(mp, "Unknown user", { at: "now() - interval '2 days'" });
    await reportMailingBounces(undefined);
    expect(sent).toEqual([]);
  });

  it("says nothing of an MP no longer in office", async () => {
    const sent = setUp();
    const mp = await addTestMp();
    await bounced(mp, "Unknown user");
    await query("UPDATE notable_people SET status = 'left_office' WHERE id = $1", [mp]);
    await reportMailingBounces(undefined);
    expect(sent).toEqual([]);
  });

  it("lists each bounce and complaint since the last report, at most once a day", async () => {
    const sent = setUp();
    const mp = await addTestMp();
    await bounced(mp, "Unknown user");
    await bounced(mp, "Marked as spam", { kind: "complaint" });
    await reportMailingBounces(undefined);
    expect(sent).toMatchObject([
      {
        Subject: words.subject(2),
        TextBody: words.body([`- ${NAME} (${ADDRESS}): Unknown user`, `- ${NAME} (${ADDRESS}): Marked as spam`], LINK),
      },
    ]);
    // Within the day: nothing more.
    await bounced(mp, "Mailbox gone");
    await reportMailingBounces(undefined);
    expect(sent).toHaveLength(1);
    // A day on, only the one since.
    await query(
      "UPDATE email_problems SET details = jsonb_build_object('reportedAt', (now() - interval '25 hours')::text) WHERE details ? 'reportedAt'",
    );
    await reportMailingBounces(undefined);
    expect(sent.at(-1)).toMatchObject({
      Subject: words.subject(1),
      TextBody: words.body([`- ${NAME} (${ADDRESS}): Mailbox gone`], LINK),
    });
  });

  it("tells of them next time if its email didn't go", async () => {
    const sent = setUp();
    await bounced(await addTestMp(), "Unknown user");
    vi.stubEnv("NOTIFICATION_INBOX", "");
    await reportMailingBounces(undefined);
    expect(sent).toEqual([]);
    vi.stubEnv("NOTIFICATION_INBOX", NOTIFICATIONS);
    await reportMailingBounces(undefined);
    expect(sent).toHaveLength(1);
  });

  it("keeps its time apart from the supporters' report", async () => {
    const sent = setUp();
    await bounced(await addTestMp(), "Unknown user");
    // A staff report just gone doesn't hold this one back.
    await query(
      "INSERT INTO email_sends (purpose, address, outcome, message_id) VALUES ('staff-report', $1, 'sent', 'another-report')",
      [NOTIFICATIONS],
    );
    await reportMailingBounces(undefined);
    expect(sent).toHaveLength(1);
    // Nor does this one count as a staff report, which would hold that one back.
    expect(await query("SELECT purpose FROM email_sends WHERE subject = $1", [words.subject(1)])).toEqual([
      { purpose: "staff-alert" },
    ]);
  });
});
