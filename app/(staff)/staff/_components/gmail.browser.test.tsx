import { describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";
import { chooseDay } from "@/tests/browser/date-picker";
import { page } from "vitest/browser";
import { staffCopy } from "@/lib/content/staff-interface";
import AskForm from "./AskForm";
import BounceReason from "./BounceReason";
import { GmailConnect, GmailOutcome, SentToday } from "./GmailConnect";
import AccountTitle from "./AccountTitle";
import LetterChanges from "./LetterChanges";
import LetterThread, { SupporterLetterThread } from "./LetterThread";
import { exampleProxiedLetterDetails, exampleSupporterLetterDetails } from "./LettersTable.examples";
import { exampleEditableAsk, exampleGmailAccount, exampleImportedThread, exampleThread } from "./LetterThread.examples";
import { DeleteTwice } from "./DeleteTwice";
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

  it("is pending from its click until the page shows again, as after the browser's Back", async () => {
    // Kept on this page, as Google's would replace the test's.
    const stay = (event: MouseEvent) => event.preventDefault();
    document.addEventListener("click", stay);
    await render(<GmailConnect back="/staff/me" />);
    const link = page.getByRole("link", { name: gmail.connect });
    await expect.element(link).not.toHaveAttribute("aria-busy");
    await link.click();
    await expect.element(link).toHaveAttribute("aria-busy", "true");
    await expect.element(link).toHaveAttribute("aria-disabled", "true");
    window.dispatchEvent(new PageTransitionEvent("pageshow", { persisted: true }));
    await expect.element(link).not.toHaveAttribute("aria-busy");
    document.removeEventListener("click", stay);
  });

  it("says how many of today's sends are gone", async () => {
    await render(<SentToday sent={12} />);
    await expect.element(page.getByText(gmail.sentToday(12, "1,800"))).toBeVisible();
  });

  it("says how connecting ended, green if it did, amber if refused, red for an error, and nothing for an outcome it doesn't know", async () => {
    const { rerender } = await render(<GmailOutcome outcome="connected" me="jo@pauseai.uk" />);
    await expect.element(page.getByRole("status")).toHaveTextContent(gmail.outcomes.connected);
    await rerender(<GmailOutcome outcome="connected" me="letters@pauseai.uk" lettersInbox />);
    await expect.element(page.getByRole("status")).toHaveTextContent(gmail.outcomes.connectedLettersInbox);
    await rerender(<GmailOutcome outcome="refused" me="letters@pauseai.uk" lettersInbox />);
    await expect.element(page.getByRole("status")).toHaveTextContent(gmail.outcomes.refused);
    await rerender(<GmailOutcome outcome="refused" me="jo@pauseai.uk" />);
    await expect.element(page.getByRole("status")).toHaveTextContent(gmail.outcomes.refused);
    await rerender(<GmailOutcome outcome="other-account" me="jo@pauseai.uk" />);
    await expect.element(page.getByRole("alert")).toHaveTextContent(gmail.otherAccount("jo@pauseai.uk"));
    await rerender(<GmailOutcome outcome="" me="jo@pauseai.uk" />);
    expect(page.getByRole("status").query()).toBeNull();
  });
});

describe("MyGmail", () => {
  it("connected: saying so in its heading, since when, today's sends, and Disconnect", async () => {
    const disconnect = vi.fn();
    await render(<MyGmail me="jo@pauseai.uk" account={exampleGmailAccount} outcome="" disconnect={disconnect} />);
    await expect.element(page.getByRole("heading", { level: 2, name: gmail.connectedTitle })).toBeVisible();
    await expect
      .element(page.getByText(gmail.connected("1 Oct 2026"), { exact: false }))
      .toHaveTextContent(`${gmail.connected("1 Oct 2026")} ${gmail.sentToday(120, "1,800")}`);
    await page.getByRole("button", { name: gmail.disconnect }).click();
    await expect.poll(() => disconnect.mock.calls.length).toBe(1);
  });

  it("not connected: what connecting means, and the button, coming back here", async () => {
    await render(<MyGmail me="jo@pauseai.uk" account={undefined} outcome="failed" disconnect={vi.fn()} />);
    await expect.element(page.getByRole("heading", { level: 2, name: gmail.title })).toBeVisible();
    await expect.element(page.getByRole("alert")).toHaveTextContent(gmail.outcomes.failed);
    await expect
      .element(page.getByRole("link", { name: gmail.connect }))
      .toHaveAttribute("href", "/staff/api/gmail/connect?back=%2Fstaff%2Fme");
  });

  it("the letters inbox's: headed as sending supporters' letters, connected or not, told so when it connects", async () => {
    const { rerender } = await render(
      <MyGmail me="letters@pauseai.uk" lettersInbox account={undefined} outcome="" disconnect={vi.fn()} />,
    );
    await expect.element(page.getByRole("heading", { level: 2, name: gmail.lettersInboxTitle })).toBeVisible();
    await rerender(
      <MyGmail
        me="letters@pauseai.uk"
        lettersInbox
        account={exampleGmailAccount}
        outcome="connected"
        disconnect={vi.fn()}
      />,
    );
    await expect.element(page.getByRole("heading", { level: 2, name: gmail.lettersInboxConnectedTitle })).toBeVisible();
    await expect.element(page.getByRole("status")).toHaveTextContent(gmail.outcomes.connectedLettersInbox);
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
  /** Each email's headers, as name and value pairs. */
  const headers = () =>
    [...document.querySelectorAll("article dl")].map((list) =>
      [...list.querySelectorAll("dt")].map((name) => [name.textContent, name.nextElementSibling!.textContent]),
    );

  it("shows each message as an email: the letter from the Gmail it went from, then each reply and answer", async () => {
    await render(<LetterThread thread={exampleThread} />);
    await expect.element(page.getByRole("heading", { level: 2, name: copy.title })).toBeVisible();
    const polly = "Polly Placeholder <polly.placeholder.mp@parliament.uk>";
    expect(headers()).toEqual([
      [
        [copy.headers.from, "Jo Seed <jo@pauseai.uk>"],
        [copy.headers.to, polly],
        [copy.headers.date, "9 Oct 2026, 09:00"],
        [copy.headers.subject, "Edinburgh follow-up"],
      ],
      [
        [copy.headers.from, polly],
        [copy.headers.to, "Jo Seed <jo@pauseai.uk>"],
        [copy.headers.date, "10 Oct 2026, 09:00"],
        [copy.headers.subject, "Re: Edinburgh follow-up"],
      ],
      [
        [copy.headers.from, "Jo Seed <jo@pauseai.uk>"],
        [copy.headers.to, polly],
        [copy.headers.date, "10 Oct 2026, 11:30"],
        [copy.headers.subject, "Re: Edinburgh follow-up"],
      ],
    ]);
    await expect.element(page.getByText("Will you come and meet us?")).toBeVisible();
    await expect.element(page.getByText(/I'd be glad to meet/)).toBeVisible();
    await expect.element(page.getByText(copy.unreadable)).toBeVisible();
    expect(page.getByText(copy.noReplies).query()).toBeNull();
  });

  it("puts the way to it in Gmail at the right of the heading when it has the letter's text", async () => {
    await render(<LetterThread thread={exampleThread} link={<a href="#gmail">Gmail</a>} />);
    await expect.element(page.getByRole("link", { name: "Gmail" })).toBeVisible();
    expect(page.getByRole("article").first().getByRole("link", { name: "Gmail" }).all()).toHaveLength(0);
  });

  it("names someone with no name by their address", async () => {
    const reply = { ...exampleThread.messages[0], fromName: "" };
    await render(<LetterThread thread={{ ...exampleThread, fromName: "", messages: [reply] }} />);
    expect(headers()[1][0]).toEqual([copy.headers.from, "polly.placeholder.mp@parliament.uk"]);
    expect(headers()[0][0]).toEqual([copy.headers.from, "jo@pauseai.uk"]);
  });

  it("says an imported letter's text isn't here, and that nothing's come back", async () => {
    await render(
      <LetterThread
        thread={{ ...exampleImportedThread, subject: "", to: { name: "Polly Placeholder", email: null } }}
        link={<a href="#gmail">Gmail</a>}
      />,
    );
    await expect.element(page.getByText(copy.noText)).toBeVisible();
    // The way to it in Gmail beside the note, in the letter's place, not by the heading.
    await expect.element(page.getByRole("article").getByRole("link", { name: "Gmail" })).toBeVisible();
    expect(page.getByRole("link", { name: "Gmail" }).all()).toHaveLength(1);
    await expect.element(page.getByText(copy.noReplies)).toBeVisible();
    expect(headers()).toEqual([
      [
        [copy.headers.from, staffCopy.letters.fromPauseai],
        [copy.headers.to, "Polly Placeholder"],
        [copy.headers.subject, exampleThread.mailingTitle],
      ],
    ]);
  });
});

describe("SupporterLetterThread", () => {
  const copy = staffCopy.letterThread;
  const letter = exampleSupporterLetterDetails;
  const headers = () =>
    [...document.querySelectorAll("article dt")].map((name) => [
      name.textContent,
      name.nextElementSibling!.textContent,
    ]);

  it("shows the letter as an email, from the sender, leading to their supporter page, saying its text is in Gmail", async () => {
    await render(<SupporterLetterThread letter={letter} link={<a href="#gmail">Gmail</a>} />);
    await expect.element(page.getByRole("heading", { level: 2, name: copy.title })).toBeVisible();
    // The way to it in Gmail beside the note, in the letter's place.
    await expect.element(page.getByRole("article").getByRole("link", { name: "Gmail" })).toBeVisible();
    expect(headers()).toEqual([
      [copy.headers.from, "Jane Smith <jane@example.com>"],
      [copy.headers.to, "Testy McTestface MP <testy.mctestface.mp@parliament.uk>"],
      [copy.headers.date, "12 Oct 2026, 09:05"],
      [copy.headers.subject, letter.subject],
    ]);
    await expect
      .element(page.getByRole("link", { name: "Jane Smith <jane@example.com>" }))
      .toHaveAttribute("href", "/staff/supporters/7");
    await expect.element(page.getByText(copy.supporterNoText)).toBeVisible();
  });

  it("one from the letters inbox: its changes to the draft, then each message both ways, with Gmail at the heading", async () => {
    await render(<SupporterLetterThread letter={exampleProxiedLetterDetails} link={<a href="#gmail">Gmail</a>} />);
    // The way to it in Gmail at the heading, not in the letter's place.
    await expect
      .element(page.getByRole("article").first().getByRole("link", { name: "Gmail" }))
      .not.toBeInTheDocument();
    await expect.element(page.getByRole("link", { name: "Gmail" })).toBeVisible();
    const [, reply, answer] = page.getByRole("article").all();
    await expect.element(reply.getByText("Thank you for writing to me.", { exact: false })).toBeVisible();
    // The office's reply is to Jane; her answer, to the MP.
    expect(reply.element().textContent).toContain(`${copy.headers.to}Jane Smith <jane@example.com>`);
    expect(answer.element().textContent).toContain(
      `${copy.headers.to}Testy McTestface MP <testy.mctestface.mp@parliament.uk>`,
    );
    await expect.element(page.getByRole("button", { name: staffCopy.letterChanges.asSent })).toBeVisible();
  });

  it("a message whose text can't be read says so", async () => {
    const sent = exampleProxiedLetterDetails.sent!;
    await render(
      <SupporterLetterThread
        letter={{ ...exampleProxiedLetterDetails, sent: { ...sent, messages: [{ ...sent.messages[0], text: null }] } }}
      />,
    );
    await expect.element(page.getByText(copy.unreadable)).toBeVisible();
  });

  it("one not yet a supporter's, never sent, with no subject: unlinked, undated, by its campaign", async () => {
    await render(
      <SupporterLetterThread letter={{ ...letter, supporterId: null, sentAt: null, subject: "", mpEmail: null }} />,
    );
    expect(headers()).toEqual([
      [copy.headers.from, "Jane Smith <jane@example.com>"],
      [copy.headers.to, "Testy McTestface MP"],
      [copy.headers.subject, letter.campaignTitle],
    ]);
    expect(page.getByRole("link").all()).toHaveLength(0);
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
    await page.getByRole("radio", { name: copy.kinds.event }).click();
    await expect.element(page.getByRole("radio", { name: copy.kinds.event })).toBeChecked();
    await field(copy.byKind.event.title).fill("Winter reception");
    await expect.element(page.getByRole("button", { name: copy.save })).toBeDisabled();
    await chooseDay(page.getByRole("button", { name: copy.byKind.event.date }), "2026-12-09");
    await field(copy.byKind.event.url).fill("luma.com/winter");
    await expect.element(page.getByText(copy.badLink)).toBeVisible();
    await expect.element(page.getByRole("button", { name: copy.save })).toBeDisabled();
    await field(copy.byKind.event.url).fill("https://luma.com/winter");
    expect(page.getByText(copy.badLink).query()).toBeNull();
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

  it("shows Save pending while it saves", async () => {
    let finish = () => {};
    const save = vi.fn(() => new Promise<void>((resolve) => (finish = resolve)));
    await render(<AskForm ask={exampleEditableAsk} back="/staff/asks" notice="" save={save} remove={vi.fn()} />);
    const button = page.getByRole("button", { name: copy.save });
    await button.click();
    await expect.element(button).toHaveAttribute("aria-busy", "true");
    finish();
    await expect.element(button).not.toHaveAttribute("aria-busy");
  });

  it("one staff added: its slug, which doesn't change, and Delete, pressed twice", async () => {
    const remove = vi.fn();
    await render(<AskForm ask={exampleEditableAsk} back="/staff/asks" notice="saved" save={vi.fn()} remove={remove} />);
    await expect.element(page.getByRole("status")).toHaveTextContent(copy.notices.saved);
    await expect.element(page.getByText("winter-reception-dec-2026", { exact: true })).toBeVisible();
    await expect.element(field(copy.byKind.event.title)).toHaveValue("Winter reception");
    await page.getByRole("button", { name: copy.delete }).click();
    await page.getByRole("button", { name: staffCopy.deleteIt }).click();
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

describe("LetterChanges", () => {
  const words = staffCopy.letterChanges;
  const draft = "Dear MP,\n\nOne.\n\nPlease act now on this.\n\nTwo.\n\nThree.\n\nJane";
  const sent = "Dear MP,\n\nOne.\n\nPlease act on this. I live here.\n\nTwo.\n\nThree.\n\nJane";

  it("shows only what changed, the paragraphs left alone folded, a click unfolding them", async () => {
    const { container } = await render(<LetterChanges sent={sent} draft={draft} approximate={false} />);
    await expect.element(page.getByText(words.intro)).toBeVisible();
    expect([...container.querySelectorAll("ins")].map((e) => e.textContent)).toEqual(["I live here."]);
    expect([...container.querySelectorAll("del")].map((e) => e.textContent)).toEqual(["now "]);
    await expect.element(page.getByRole("button", { name: words.folded(2) })).toBeVisible();
    await expect.element(page.getByText("Two.", { exact: false })).not.toBeInTheDocument();
    await page.getByRole("button", { name: words.folded(3) }).click();
    await expect.element(page.getByText("Two.\n\nThree.\n\nJane")).toBeVisible();
    await expect.element(page.getByRole("button", { name: words.folded(3) })).not.toBeInTheDocument();
    await expect.element(page.getByRole("button", { name: words.folded(1) })).not.toBeInTheDocument();
  });

  it("shows the letter as sent, and back", async () => {
    const { container } = await render(<LetterChanges sent={sent} draft={draft} approximate={false} />);
    await page.getByRole("button", { name: words.asSent }).click();
    expect(container.querySelector("ins")).toBeNull();
    await expect.element(page.getByText(sent)).toBeVisible();
    await page.getByRole("button", { name: words.showChanges }).click();
    await expect.element(page.getByRole("button", { name: words.asSent })).toBeVisible();
    expect(container.querySelector("ins")).not.toBeNull();
  });

  it("says a draft is approximate, a letter sent as drafted, and with none kept shows the letter alone", async () => {
    await render(<LetterChanges sent={sent} draft={draft} approximate />);
    await expect.element(page.getByText(words.approximate)).toBeVisible();
    await render(<LetterChanges sent={draft} draft={draft} approximate={false} />);
    await expect.element(page.getByText(words.unchanged)).toBeVisible();
    const { container } = await render(<LetterChanges sent={sent} draft={null} approximate={false} />);
    expect(container.textContent).toBe(sent);
  });
});
