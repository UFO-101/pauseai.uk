import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LETTERS_INBOX } from "../fixture-env.mjs";
import { deliverToLettersInbox, historyIdNow, labelNames, lettersMailbox, resetLettersInbox } from "./letters-inbox";
import { fixtureResponse } from "./outside-services";

const gmail = (path: string, init: RequestInit = {}, scope?: string, account = LETTERS_INBOX) =>
  fixtureResponse(
    `https://gmail.googleapis.com/gmail/v1/users/me${path}`,
    { ...init, headers: { authorization: `Bearer fixture-access:${account}` } },
    scope,
  )!;
const send = (raw: string, scope?: string, account?: string) =>
  gmail(
    "/messages/send",
    { method: "POST", body: JSON.stringify({ raw: Buffer.from(raw).toString("base64url") }) },
    scope,
    account,
  );

beforeEach(() => resetLettersInbox());
afterEach(() => vi.unstubAllEnvs());

describe("the fake letters inbox", () => {
  it("keeps what's sent to its addresses, under the ID it went with, and serves its history from where a read got to", async () => {
    expect(await gmail("/profile").json()).toEqual({ emailAddress: LETTERS_INBOX, historyId: "1000" });
    const [local, domain] = LETTERS_INBOX.split("@");
    // To someone else: not kept.
    await send("To: jane@example.com\r\nSubject: Letter\r\n\r\nHi");
    const { id } = await send(
      `To: "MP" <${local}+mp@${domain}>\r\nBcc: jane@example.com\r\nSubject: Copy\r\n\r\nHi`,
    ).json();
    await send(`To: jane@example.com\r\nCc: ${LETTERS_INBOX}\r\nSubject: Cc\r\n\r\nHi`);
    // Another account's mail to it isn't the letters inbox's own: it's delivered from outside, in a test.
    await send(`To: ${LETTERS_INBOX}\r\nSubject: From Jo\r\n\r\nHi`, undefined, "jo@pauseai.uk");
    // What it sent is kept, in Sent, and what it sent to itself in the Inbox too.
    const kept = lettersMailbox().messages;
    expect(kept).toHaveLength(3);
    expect(kept[1].id).toBe(id);
    expect(kept.map(labelNames)).toEqual([["SENT"], ["INBOX", "SENT", "UNREAD"], ["INBOX", "SENT", "UNREAD"]]);
    const [, second, third] = kept.map((m) => String(m.historyId));
    expect(Number(second)).toBeGreaterThan(historyIdNow() - 60_000_000);
    expect(await gmail(`/history?startHistoryId=${second}`).json()).toEqual({
      historyId: third,
      history: [{ id: third, messagesAdded: [{ message: { id: kept[2].id } }] }],
    });
    expect(await gmail(`/history?startHistoryId=${third}`).json()).toEqual({ historyId: third });
  });

  it("serves a message's headers asked for, and whole; labels it, makes labels, and trashes it", async () => {
    deliverToLettersInbox("From: a@example.org\r\nSubject: Hi\r\nDate: Fri, 16 Oct 2026 12:00:00 +0000\r\n\r\nBody");
    deliverToLettersInbox("From: b@example.org", { spam: true });
    const [first, second] = lettersMailbox().messages;
    expect(await gmail(`/messages/${first.id}?format=metadata&metadataHeaders=Subject`).json()).toEqual({
      id: first.id,
      threadId: first.id,
      labelIds: ["INBOX", "UNREAD"],
      internalDate: String(Date.parse("2026-10-16T12:00:00Z")),
      payload: { headers: [{ name: "Subject", value: "Hi" }] },
    });
    expect(await gmail(`/messages/${second.id}?format=metadata`).json()).toMatchObject({
      labelIds: ["SPAM", "UNREAD"],
      internalDate: "0",
      payload: { headers: [] },
    });
    const raw = (await gmail(`/messages/${second.id}?format=raw`).json()) as { raw: string };
    expect(Buffer.from(raw.raw, "base64url").toString()).toBe("From: b@example.org");
    expect(await gmail("/labels").json()).toEqual({ labels: [{ id: "INBOX", name: "INBOX", type: "system" }] });
    const label = await gmail("/labels", { method: "POST", body: JSON.stringify({ name: "Relayed" }) }).json();
    expect(label).toEqual({ id: "Label_1", name: "Relayed" });
    expect((await gmail("/labels").json()).labels).toContainEqual({ id: "Label_1", name: "Relayed", type: "user" });
    await gmail(`/messages/${first.id}/modify`, {
      method: "POST",
      body: JSON.stringify({ addLabelIds: ["Label_1"], removeLabelIds: ["INBOX", "UNREAD"] }),
    });
    await gmail(`/messages/${second.id}/modify`, { method: "POST", body: "{}" });
    expect(labelNames(first)).toEqual(["Relayed"]);
    await gmail(`/messages/${first.id}/trash`, { method: "POST" });
    expect(labelNames(first)).toEqual(["Relayed", "TRASH"]);
    // What it doesn't have, the fake for every account answers.
    expect(gmail("/messages/nothing").status).toBe(404);
    expect(await gmail("/messages?q=x").json()).toEqual({ resultSizeEstimate: 0 });
  });

  it("keeps a mailbox for each flow, and picks up mail a flow writes for it, in Spam if it says so", async () => {
    const dir = mkdtempSync(join(tmpdir(), "letters-inbox-"));
    try {
      vi.stubEnv("LETTERS_INBOX_DIR", dir);
      deliverToLettersInbox("Subject: One", { scope: "flow_a" });
      deliverToLettersInbox("Subject: Two", { scope: "flow_a", spam: true });
      expect(lettersMailbox("flow_b").messages).toEqual([]);
      expect(lettersMailbox("flow_a").messages.map((m) => [m.raw, [...m.labels]])).toEqual([
        ["Subject: One", ["INBOX", "UNREAD"]],
        ["Subject: Two", ["SPAM", "UNREAD"]],
      ]);
      // Each file once.
      expect(lettersMailbox("flow_a").messages).toHaveLength(2);
      expect(await gmail("/profile", {}, "flow_a").json()).toMatchObject({
        historyId: String(lettersMailbox("flow_a").messages[1].historyId),
      });
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("knows no letters inbox where LETTERS_INBOX isn't set", async () => {
    vi.stubEnv("LETTERS_INBOX", "");
    await send(`To: ${LETTERS_INBOX}\r\n\r\nHi`, undefined, LETTERS_INBOX);
    expect(lettersMailbox().messages).toEqual([]);
  });
});
