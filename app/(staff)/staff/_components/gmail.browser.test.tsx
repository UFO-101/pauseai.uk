import { describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";
import { page } from "vitest/browser";
import { staffCopy } from "@/lib/content/staff-interface";
import AskForm from "./AskForm";
import BounceReason from "./BounceReason";
import { GmailConnect, GmailOutcome, SentToday } from "./GmailConnect";
import AccountTitle from "./AccountTitle";
import LetterThread from "./LetterThread";
import { exampleEditableAsk, exampleGmailAccount, exampleImportedThread, exampleThread } from "./LetterThread.examples";
import { DeleteTwice } from "./MailingButtons";
import MyGmail from "./MyGmail";

const gmail = staffCopy.gmail;

describe("GmailConnect, SentToday and GmailOutcome", () => {
  it("says what connecting means, then links to Google's consent, coming back to the page", async () => {
    await render(<GmailConnect back="/staff/me" />);
    await expect.element(page.getByText(gmail.intro)).toBeVisible();
    for (const line of gmail.explain) await expect.element(page.getByRole("listitem").getByText(line)).toBeVisible();
    await expect.element(page.getByText(gmail.limit("1,800"))).toBeVisible();
    await expect
      .element(page.getByRole("link", { name: gmail.connect }))
      .toHaveAttribute("href", "/staff/api/gmail/connect?back=%2Fstaff%2Fme");
  });

  it("says how many of today's sends are gone", async () => {
    await render(<SentToday sent={12} />);
    await expect.element(page.getByText(gmail.sentToday(12, "1,800"))).toBeVisible();
  });

  it("says how connecting ended, green if it did, amber if refused, red for an error, and nothing for an outcome it doesn't know", async () => {
    const { rerender } = await render(<GmailOutcome outcome="connected" me="jo@pauseai.uk" />);
    await expect.element(page.getByRole("status")).toHaveTextContent(gmail.outcomes.connected);
    await rerender(<GmailOutcome outcome="refused" me="jo@pauseai.uk" />);
    await expect.element(page.getByRole("status")).toHaveTextContent(gmail.outcomes.refused);
    await rerender(<GmailOutcome outcome="other-account" me="jo@pauseai.uk" />);
    await expect.element(page.getByRole("alert")).toHaveTextContent(gmail.otherAccount("jo@pauseai.uk"));
    await rerender(<GmailOutcome outcome="" me="jo@pauseai.uk" />);
    expect(page.getByRole("status").query()).toBeNull();
  });
});

describe("MyGmail", () => {
  it("connected: since when, today's sends, and Disconnect", async () => {
    const disconnect = vi.fn();
    await render(<MyGmail me="jo@pauseai.uk" account={exampleGmailAccount} outcome="" disconnect={disconnect} />);
    await expect
      .element(page.getByText(gmail.connected("1 Oct 2026"), { exact: false }))
      .toHaveTextContent(`${gmail.connected("1 Oct 2026")} ${gmail.sentToday(120, "1,800")}`);
    await page.getByRole("button", { name: gmail.disconnect }).click();
    await expect.poll(() => disconnect.mock.calls.length).toBe(1);
  });

  it("not connected: what connecting means, and the button, coming back here", async () => {
    await render(<MyGmail me="jo@pauseai.uk" account={undefined} outcome="failed" disconnect={vi.fn()} />);
    await expect.element(page.getByRole("alert")).toHaveTextContent(gmail.outcomes.failed);
    await expect
      .element(page.getByRole("link", { name: gmail.connect }))
      .toHaveAttribute("href", "/staff/api/gmail/connect?back=%2Fstaff%2Fme");
  });
});

describe("AccountTitle", () => {
  it("titles your own page, with your address under it", async () => {
    await render(<AccountTitle email="jo@pauseai.uk" />);
    await expect.element(page.getByRole("heading", { level: 1, name: staffCopy.me.title })).toBeVisible();
    await expect.element(page.getByText("jo@pauseai.uk")).toBeVisible();
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
    await render(<LetterThread thread={{ ...exampleThread, fromName: "" }} me="samuel.whitlock@pauseai.uk" />);
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
  const preview = () => page.getByRole("region", { name: copy.previewTitle });

  it("a new ask: the kind first, the rest in its words, previewed as typed; PauseAI asking, and no slug or Delete", async () => {
    const save = vi.fn();
    await render(<AskForm ask={null} back="/staff/mailings/4" notice="" save={save} remove={vi.fn()} />);
    expect(page.getByRole("button", { name: copy.delete }).query()).toBeNull();
    await expect.element(page.getByRole("button", { name: copy.save })).toBeDisabled();
    await expect
      .element(field(copy.byKind.letter.title))
      .toHaveAttribute("placeholder", copy.byKind.letter.titleExample);
    await expect.element(preview().getByRole("group", { name: copy.byKind.letter.titleExample })).toBeVisible();
    await page.getByText(copy.kinds.event).click();
    await expect.element(page.getByRole("radio", { name: copy.kinds.event })).toBeChecked();
    await field(copy.byKind.event.title).fill("Winter reception");
    await field(copy.byKind.event.date).fill("2026-12-09");
    await field(copy.byKind.event.url).fill("https://luma.com/winter");
    await expect.element(page.getByText("winter-reception-dec-2026", { exact: true })).toBeVisible();
    await page.getByLabelText(copy.askedBy.supporters).click();
    await page.getByLabelText(copy.askedBy.pauseai).click();
    await expect
      .element(preview().getByText(`${staffCopy.politician.askedThem(copy.askedBy.supporters, "event")} · 9 Dec 2026`))
      .toBeVisible();
    await expect
      .element(preview().getByRole("link", { name: "Winter reception" }))
      .toHaveAttribute("href", "https://luma.com/winter");
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
    await expect.element(page.getByText("winter-reception-dec-2026", { exact: true })).toBeVisible();
    await expect.element(field(copy.byKind.event.title)).toHaveValue("Winter reception");
    await page.getByRole("button", { name: copy.delete }).click();
    await page.getByRole("button", { name: staffCopy.mailingPages.deleteIt }).click();
    await expect.poll(() => remove.mock.calls.length).toBe(1);
    expect((remove.mock.calls[0][0] as FormData).get("slug")).toBe("winter-reception-dec-2026");
  });

  it("one answered: its kind fixed, sent all the same, and no Delete but why", async () => {
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
    await expect.element(page.getByRole("radio", { name: copy.kinds.event })).toBeDisabled();
    await expect.element(page.getByRole("radio", { name: copy.kinds.event })).toBeChecked();
    await expect.element(page.getByText(copy.kindFixed)).toBeVisible();
    expect(page.getByRole("button", { name: copy.delete }).query()).toBeNull();
    await expect.element(page.getByText(copy.notDeletable).last()).toBeVisible();
    await page.getByRole("button", { name: copy.save }).click();
    await expect.poll(() => save.mock.calls.length).toBe(1);
    expect((save.mock.calls[0][0] as FormData).get("kind")).toBe("event");
  });

  it("one the code names: nothing can be changed, and there's no Save or Delete", async () => {
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
    expect(page.getByRole("button", { name: copy.save }).query()).toBeNull();
    expect(page.getByRole("button", { name: copy.delete }).query()).toBeNull();
    expect(page.getByText(copy.kindFixed).query()).toBeNull();
    expect(page.getByText(copy.notDeletable).query()).toBeNull();
  });
});
