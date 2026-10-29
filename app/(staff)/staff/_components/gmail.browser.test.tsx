import { describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";
import { page } from "vitest/browser";
import { staffCopy } from "@/lib/content/staff-interface";
import AskForm from "./AskForm";
import BounceReason from "./BounceReason";
import { GmailConnect, GmailOutcome, SentToday } from "./GmailConnect";
import LetterThread from "./LetterThread";
import { exampleEditableAsk, exampleGmailAccount, exampleImportedThread, exampleThread } from "./LetterThread.examples";
import { DeleteTwice } from "./MailingButtons";
import MyGmail from "./MyGmail";

const gmail = staffCopy.gmail;

describe("GmailConnect, SentToday and GmailOutcome", () => {
  it("says what connecting means, then links to Google's consent, coming back to the page", async () => {
    await render(<GmailConnect back="/staff/me" />);
    for (const line of gmail.explain) await expect.element(page.getByText(line)).toBeVisible();
    await expect.element(page.getByText(gmail.limit("1,800"))).toBeVisible();
    await expect
      .element(page.getByRole("link", { name: gmail.connect }))
      .toHaveAttribute("href", "/staff/api/gmail/connect?back=%2Fstaff%2Fme");
  });

  it("says how many of today's sends are gone", async () => {
    await render(<SentToday sent={12} />);
    await expect.element(page.getByText(gmail.sentToday(12, "1,800"))).toBeVisible();
  });

  it("says how connecting ended, green if it did, and nothing for an outcome it doesn't know", async () => {
    const { rerender } = await render(<GmailOutcome outcome="connected" />);
    await expect.element(page.getByRole("status")).toHaveTextContent(gmail.outcomes.connected);
    await rerender(<GmailOutcome outcome="refused" />);
    await expect.element(page.getByRole("status")).toHaveTextContent(gmail.outcomes.refused);
    await rerender(<GmailOutcome outcome="" />);
    expect(page.getByRole("status").query()).toBeNull();
  });
});

describe("MyGmail", () => {
  it("connected: since when, today's sends, and Disconnect", async () => {
    const disconnect = vi.fn();
    await render(<MyGmail account={exampleGmailAccount} outcome="" disconnect={disconnect} />);
    await expect
      .element(page.getByText(gmail.connected("1 Oct 2026"), { exact: false }))
      .toHaveTextContent(`${gmail.connected("1 Oct 2026")} ${gmail.sentToday(120, "1,800")}`);
    await page.getByRole("button", { name: gmail.disconnect }).click();
    await expect.poll(() => disconnect.mock.calls.length).toBe(1);
  });

  it("not connected: what connecting means, and the button, coming back here", async () => {
    await render(<MyGmail account={undefined} outcome="failed" disconnect={vi.fn()} />);
    await expect.element(page.getByRole("status")).toHaveTextContent(gmail.outcomes.failed);
    await expect
      .element(page.getByRole("link", { name: gmail.connect }))
      .toHaveAttribute("href", "/staff/api/gmail/connect?back=%2Fstaff%2Fme");
  });
});

describe("LetterThread", () => {
  const copy = staffCopy.letterThread;

  it("shows the Gmail it went from, the letter as it went, and each reply; Open in Gmail for the one who sent it", async () => {
    await render(<LetterThread thread={exampleThread} me="jo@pauseai.uk" />);
    await expect.element(page.getByRole("heading", { level: 2, name: copy.title })).toBeVisible();
    await expect.element(page.getByText(copy.sentFrom("Jo Seed <jo@pauseai.uk>"))).toBeVisible();
    await expect.element(page.getByText("Will you come and meet us?")).toBeVisible();
    await expect.element(page.getByText(/I'd be glad to meet/)).toBeVisible();
    await expect.element(page.getByText(copy.unreadable)).toBeVisible();
    await expect
      .element(page.getByRole("link", { name: copy.openInGmail }))
      .toHaveAttribute("href", "https://mail.google.com/mail/u/jo%40pauseai.uk/#all/thread-seed-2");
    expect(page.getByText(copy.noReplies).query()).toBeNull();
  });

  it("names a reply with no name by its address", async () => {
    const reply = { ...exampleThread.messages[0], fromName: "" };
    await render(<LetterThread thread={{ ...exampleThread, messages: [reply] }} me="jo@pauseai.uk" />);
    await expect.element(page.getByRole("heading", { name: reply.fromAddress })).toBeVisible();
  });

  it("has no Open in Gmail for anyone else, and the address alone with no name", async () => {
    await render(<LetterThread thread={{ ...exampleThread, fromName: "" }} me="sam@pauseai.uk" />);
    expect(page.getByRole("link", { name: copy.openInGmail }).query()).toBeNull();
    await expect.element(page.getByText(copy.sentFrom("jo@pauseai.uk"))).toBeVisible();
  });

  it("says an imported letter's text isn't here, and that nothing's come back", async () => {
    await render(<LetterThread thread={{ ...exampleImportedThread, subject: "" }} me="jo@pauseai.uk" />);
    await expect.element(page.getByText(copy.noText)).toBeVisible();
    await expect.element(page.getByText(copy.noReplies)).toBeVisible();
    await expect.element(page.getByRole("heading", { name: exampleThread.mailingTitle })).toBeVisible();
    expect(page.getByText(copy.sentFrom("jo@pauseai.uk")).query()).toBeNull();
  });
});

describe("BounceReason", () => {
  it("marks a bounce found in Gmail", async () => {
    const { rerender } = await render(<BounceReason reason="Unknown user" foundInGmail={false} />);
    expect(page.getByText(staffCopy.emails.foundInGmail).query()).toBeNull();
    await rerender(<BounceReason reason="Unknown user" foundInGmail />);
    await expect.element(page.getByText(staffCopy.emails.foundInGmail)).toBeVisible();
  });
});

describe("DeleteTwice", () => {
  it("can't be armed when disabled", async () => {
    await render(<DeleteTwice name="slug" value="x" label="Delete ask" disabled action={vi.fn()} />);
    await expect.element(page.getByRole("button", { name: "Delete ask" })).toBeDisabled();
  });
});

describe("AskForm", () => {
  const copy = staffCopy.asks;
  /** A field by the start of its label: a select's name also holds its choice. */
  const field = (label: string) => page.getByLabelText(new RegExp(`^${label}`));

  it("a new ask: its fields, PauseAI asking to start with, and no slug or Delete; sends what's filled in", async () => {
    const save = vi.fn();
    await render(<AskForm ask={null} back="/staff/mailings/4" notice="" save={save} remove={vi.fn()} />);
    expect(page.getByRole("button", { name: copy.delete }).query()).toBeNull();
    await field(copy.fields.title).fill("Winter reception");
    await field(copy.fields.kind).selectOptions("event");
    await page.getByLabelText(copy.askedBy.supporters).click();
    await page.getByLabelText(copy.askedBy.pauseai).click();
    await page.getByRole("button", { name: copy.save }).click();
    await expect.poll(() => save.mock.calls.length).toBe(1);
    const sent = save.mock.calls[0][0] as FormData;
    expect([sent.get("title"), sent.get("kind"), sent.get("back"), sent.get("slug"), sent.getAll("askedBy")]).toEqual([
      "Winter reception",
      "event",
      "/staff/mailings/4",
      null,
      ["supporters"],
    ]);
  });

  it("one staff added: its slug, which doesn't change, and Delete, pressed twice", async () => {
    const remove = vi.fn();
    await render(<AskForm ask={exampleEditableAsk} back="/staff/asks" notice="saved" save={vi.fn()} remove={remove} />);
    await expect.element(page.getByRole("status")).toHaveTextContent(copy.notices.saved);
    await expect.element(page.getByText(copy.slugHint("winter-reception-dec-2026"))).toBeVisible();
    await expect.element(field(copy.fields.title)).toHaveValue("Winter reception");
    await page.getByRole("button", { name: copy.delete }).click();
    await page.getByRole("button", { name: staffCopy.mailingPages.deleteIt }).click();
    await expect.poll(() => remove.mock.calls.length).toBe(1);
    expect((remove.mock.calls[0][0] as FormData).get("slug")).toBe("winter-reception-dec-2026");
  });

  it("one answered: its kind fixed, sent all the same, and Delete greyed with why", async () => {
    const save = vi.fn();
    await render(
      <AskForm
        ask={{ ...exampleEditableAsk, kindFixed: true, deletable: false }}
        back="/staff/asks"
        notice="in-use"
        save={save}
        remove={vi.fn()}
      />,
    );
    await expect
      .element(page.getByRole("alert").or(page.getByRole("status")))
      .toHaveTextContent(copy.notices["in-use"]);
    await expect.element(field(copy.fields.kind)).toBeDisabled();
    await expect.element(page.getByText(copy.kindFixed)).toBeVisible();
    await expect.element(page.getByRole("button", { name: copy.delete })).toBeDisabled();
    await expect.element(page.getByText(copy.notDeletable).last()).toBeVisible();
    await page.getByRole("button", { name: copy.save }).click();
    await expect.poll(() => save.mock.calls.length).toBe(1);
    expect((save.mock.calls[0][0] as FormData).get("kind")).toBe("event");
  });

  it("one the code names: nothing can be changed, and there's no Delete", async () => {
    await render(
      <AskForm
        ask={{ ...exampleEditableAsk, fixed: true, kindFixed: true, deletable: false }}
        back="/staff/asks"
        notice="nonsense"
        save={vi.fn()}
        remove={vi.fn()}
      />,
    );
    await expect.element(page.getByText(copy.fixed)).toBeVisible();
    await expect.element(page.getByRole("button", { name: copy.save })).toBeDisabled();
    expect(page.getByRole("button", { name: copy.delete }).query()).toBeNull();
    expect(page.getByText(copy.kindFixed).query()).toBeNull();
  });
});
