import { describe, expect, it, onTestFinished, vi } from "vitest";
import { render } from "vitest-browser-react";
import { chooseDay } from "@/tests/browser/date-picker";
import { page } from "vitest/browser";
import { staffCopy } from "@/lib/content/staff-interface";
import type { Mailing } from "@/lib/server/mailings";
import { DeleteDraft, StopMailing } from "./MailingButtons";
import MailingFor from "./MailingFor";
import { MailingLetter } from "./MailingLetter";
import { FilterPills } from "./MailingParts";
import MailingLetterView from "./MailingLetterView";
import { examplePauseaiLetterDetails } from "./LettersTable.examples";
import { mailingGroups } from "@/lib/mailing-groups";
import MailingView from "./MailingView";
import MailingsOverview from "./MailingsOverview";
import { exampleMailingLetter, exampleWriterData, exampleWrittenMailing } from "./MailingWriter.examples";
import {
  exampleDraft,
  exampleMailing,
  exampleMailings,
  exampleScheduled,
  exampleSending,
} from "./MailingsTable.examples";
import { exampleAsks, examplePolitician } from "./PoliticianTable.examples";

const copy = staffCopy.mailingPages;
const noAction = async () => {};

describe("MailingLetter", () => {
  it("shows fields as chips by their labels, or their IDs, and a part for only some in a box saying who", async () => {
    await render(
      <MailingLetter
        doc={exampleMailingLetter}
        fields={{ salutation: "Salutation" }}
        conditions={{ "frontier-ai-letter:signed": "signed the letter" }}
      />,
    );
    await expect.element(page.getByText("Salutation", { exact: true })).toBeVisible();
    await expect.element(page.getByText("constituency", { exact: true })).toBeVisible();
    await expect.element(page.getByText(staffCopy.mailingEditor.onlyForLabel("signed the letter"))).toBeVisible();
    await expect.element(page.getByText("Will you come to the example conference?")).toBeVisible();
    expect(page.getByRole("listitem").all()).toHaveLength(1);
  });

  it("shows links, a linked field, and quotes", async () => {
    const link = { type: "link" as const, attrs: { href: "https://pauseai.uk/join" } };
    await render(
      <MailingLetter
        doc={{
          type: "doc",
          content: [
            {
              type: "blockquote",
              content: [
                {
                  type: "paragraph",
                  content: [
                    { type: "text", text: "Join", marks: [link] },
                    { type: "field", attrs: { field: "name" }, marks: [link] },
                  ],
                },
              ],
            },
          ],
        }}
      />,
    );
    await expect.element(page.getByRole("link", { name: "Join" })).toHaveAttribute("href", "https://pauseai.uk/join");
    await expect.element(page.getByRole("link", { name: "name" })).toHaveAttribute("href", "https://pauseai.uk/join");
    expect(document.querySelector("blockquote p")!.textContent).toBe("Joinname");
  });

  it("names a part's condition by its ID with no labels", async () => {
    await render(<MailingLetter doc={exampleMailingLetter} />);
    await expect
      .element(page.getByText(staffCopy.mailingEditor.onlyForLabel("frontier-ai-letter:signed")))
      .toBeVisible();
  });
});

describe("FilterPills", () => {
  it("says the filter as the list's chips do, the house first", async () => {
    await render(<FilterPills data={exampleWriterData} />);
    const pills = page.getByRole("list", { name: copy.whoLabel });
    await expect.element(pills.getByText(staffCopy.houses.commons)).toBeVisible();
    await expect.element(pills.getByText("Example Letter to the PM", { exact: false })).toBeVisible();
    expect(pills.getByRole("listitem").all()).toHaveLength(3);
  });

  it("puts a search in its own pill", async () => {
    await render(
      <FilterPills data={{ ...exampleWriterData, filter: { list: "politicians", params: { q: "smith" } } }} />,
    );
    await expect.element(page.getByRole("listitem")).toHaveTextContent(copy.searchPill("smith"));
  });

  it("says everyone in office for a filter of nothing", async () => {
    await render(<FilterPills data={{ ...exampleWriterData, filter: { list: "politicians", params: {} } }} />);
    await expect.element(page.getByText(copy.everyone)).toBeVisible();
  });
});

describe("DeleteDraft and StopMailing", () => {
  it("delete when pressed twice, and stop at once, each the mailing named", async () => {
    const forms: FormData[] = [];
    const action = vi.fn(async (form: FormData) => void forms.push(form));
    await render(
      <>
        <DeleteDraft id={5} action={action} />
        <StopMailing id={6} label="Stop" action={action} />
      </>,
    );
    await page.getByRole("button", { name: copy.deleteDraft }).click();
    await expect.element(page.getByRole("button", { name: copy.deleteIt })).toHaveFocus();
    await page.getByRole("button", { name: copy.deleteIt }).click();
    await page.getByRole("button", { name: "Stop" }).click();
    await expect.poll(() => forms.map((form) => form.get("id"))).toEqual(["5", "6"]);
  });

  it("turns back if the second press doesn't come, or focus goes elsewhere", async () => {
    const action = vi.fn();
    await render(
      <>
        <DeleteDraft id={5} action={action} />
        <button type="button">Elsewhere</button>
      </>,
    );
    await page.getByRole("button", { name: copy.deleteDraft }).click();
    await page.getByRole("button", { name: "Elsewhere" }).click();
    await expect.element(page.getByRole("button", { name: copy.deleteDraft })).toBeVisible();
    vi.useFakeTimers();
    try {
      await page.getByRole("button", { name: copy.deleteDraft }).click();
      await expect.element(page.getByRole("button", { name: copy.deleteIt })).toBeVisible();
      await vi.advanceTimersByTimeAsync(5000);
    } finally {
      vi.useRealTimers();
    }
    await expect.element(page.getByRole("button", { name: copy.deleteDraft })).toBeVisible();
    expect(action).not.toHaveBeenCalled();
  });
});

describe("MailingsOverview", () => {
  const now = "2026-10-30T12:00:00Z";
  const groups = mailingGroups(
    {
      drafts: [exampleDraft, { ...exampleDraft, id: 7, title: "" }],
      comingUp: [exampleScheduled, exampleSending],
      sent: [...exampleMailings, { ...exampleMailings[1], id: 9, sentAt: "2025-07-09T10:00:00Z" }],
    },
    new Date(now),
  );
  const row = (title: string) => page.getByRole("listitem").filter({ hasText: title });

  it("groups them: coming up, then by month, then by year, each row only what matters at its stage", async () => {
    await render(<MailingsOverview groups={groups} now={now} />);
    expect(
      page
        .getByRole("heading", { level: 2 })
        .all()
        .map((h) => h.element().textContent),
    ).toEqual([copy.comingUp, "October 2026", "2025"]);
    // A draft: when it was saved, Draft and how many it's to; one untitled, said so.
    await expect.element(row("Meet us in Westminster").first()).toMatchTextContent(copy.savedAt("28 Oct 2026"));
    await expect.element(row("Meet us in Westminster").first()).toMatchTextContent(copy.toCount(412));
    await expect.element(page.getByRole("link", { name: copy.untitled })).toHaveAttribute("href", "/staff/mailings/7");
    // Scheduled: when it goes, and how many it's to.
    await expect.element(row("Edinburgh: one week to go")).toMatchTextContent("Fri 30 Oct, 09:18");
    await expect.element(row("Edinburgh: one week to go")).toMatchTextContent(copy.states.scheduled);
    // Sending: its bar, leading to it.
    await expect.element(page.getByRole("progressbar", { name: copy.sentLabel })).toHaveAttribute("value", "214");
    await expect.element(page.getByText(copy.sendingBar(212, 650))).toBeVisible();
    // Sent: its box of counts, one link to it, the day without this year; answered only with an ask.
    await expect
      .element(page.getByRole("link", { name: copy.countsLabel("Invitation: AI safety conference, Edinburgh") }))
      .toHaveAttribute("href", "/staff/mailings/4");
    await expect.element(row("AI safety conference")).toMatchTextContent("20 Oct");
    await expect.element(row("AI safety conference")).not.toMatchTextContent("20 Oct 2026");
    await expect.element(row("Ben Lake").first()).not.toMatchTextContent(copy.counts.answered);
    // Last year's, with its year.
    await expect.element(row("Ben Lake").last()).toMatchTextContent("9 Jul 2025");
    // Who it's from, or Airtable, and its ask, leading to who answered it.
    await expect
      .element(row("Nov 26"))
      .toMatchTextContent(`${staffCopy.mailings.imported} · ${staffCopy.mailings.columns.ask}`);
    await expect.element(row("AI safety conference")).toMatchTextContent("Jo Example <jo@pauseai.uk> · ");
    // With no name of its own, its address alone.
    await expect.element(row("Edinburgh: one week to go")).toMatchTextContent("jo@pauseai.uk");
    await expect.element(row("Edinburgh: one week to go")).not.toMatchTextContent("<jo@pauseai.uk>");
    await expect
      .element(row("Edinburgh: one week to go").getByRole("link", { name: "Edinburgh conference" }))
      .not.toBeInTheDocument();
    await expect
      .element(page.getByRole("link", { name: "Edinburgh conference" }).first())
      .toHaveAttribute("href", "/staff/politicians?ask=edinburgh-conference-2026");
    // Nothing on it changes a mailing.
    expect(page.getByRole("button").all()).toHaveLength(0);
  });

  it("an ask with no sender says only the ask", async () => {
    const lone = { ...exampleMailings[1], id: 10, ask: "frontier-ai-letter", askTitle: "Frontier AI letter" };
    await render(
      <MailingsOverview groups={mailingGroups({ drafts: [], comingUp: [], sent: [lone] }, new Date(now))} now={now} />,
    );
    await expect.element(row("Ben Lake")).toMatchTextContent(`${staffCopy.mailings.columns.ask} Frontier AI letter`);
    await expect.element(row("Ben Lake")).not.toMatchTextContent(" · ");
  });

  it("says when there are none", async () => {
    await render(<MailingsOverview groups={[]} now={now} />);
    await expect.element(page.getByText(staffCopy.mailings.none)).toBeVisible();
  });
});

describe("MailingView", () => {
  const written = { ...exampleWrittenMailing, state: "sent" as const };
  const mailing: Mailing = {
    ...exampleMailing,
    ...exampleMailings[0],
    recipients: exampleMailing.recipients.map((r, i) =>
      i === 2 ? { ...r, status: "skipped", skipReason: "left-office" } : r,
    ),
  };
  const view = (props: Partial<Parameters<typeof MailingView>[0]>) =>
    render(
      <MailingView
        mailing={mailing}
        written={written}
        who={<p>who</p>}
        asks={exampleAsks}
        stop={noAction}
        reschedule={noAction}
        {...props}
      />,
    );
  const recipient = (name: string) => page.getByRole("row").filter({ hasText: name });

  it("once sent: its band, how many answered, the email, and its recipients", async () => {
    await view({});
    await expect.element(page.getByRole("heading", { level: 1 })).toMatchTextContent(mailing.title);
    // With an ask, the bar says it's sent, not a tag.
    expect(page.getByText(copy.states.sent, { exact: true }).all()).toHaveLength(1);
    await expect.element(page.getByText(copy.answeredBar(3, 12))).toBeVisible();
    await expect.element(page.getByRole("progressbar", { name: copy.counts.answered })).toHaveAttribute("value", "3");
    // The band: when, by whom, from where, the ask, and who it was for.
    await expect.element(page.getByText("20 Oct 2026, 08:00")).toBeVisible();
    await expect.element(page.getByText(copy.by(written.createdBy))).toBeVisible();
    await expect.element(page.getByText("jo@pauseai.uk", { exact: true })).toBeVisible();
    await expect.element(page.getByText("who")).toBeVisible();
    await expect.element(page.getByText(staffCopy.mailings.recipientsCount(12))).toBeVisible();
    // Each count leads to those recipients, sent to them all.
    await expect
      .element(page.getByRole("link", { name: `1 ${copy.counts.bounced}` }))
      .toHaveAttribute("href", "/staff/mailings/4?tab=bounced");
    await expect
      .element(page.getByRole("link", { name: `11 ${copy.counts.sent}` }))
      .toHaveAttribute("href", "/staff/mailings/4");
    // Each recipient: their seat and party, their answer, how it went and their letter.
    await expect.element(recipient("Polly")).toMatchTextContent("Cities of London and Westminster · Labour (Co-op)");
    await expect.element(recipient("Polly")).toMatchTextContent(`✓ ${staffCopy.statuses.going}`);
    await expect.element(recipient("Polly")).toMatchTextContent(staffCopy.mailings.columns.answered);
    await expect
      .element(recipient("Polly").getByRole("link", { name: copy.letterAndReplies(2) }))
      .toHaveAttribute("href", "/staff/mailings/4/letters/11");
    await expect.element(recipient("Morag")).toMatchTextContent(staffCopy.letters.status.bounced);
    await expect.element(recipient("Morag").getByRole("link", { name: copy.theLetter })).toBeInTheDocument();
    // One skipped says why, with no letter to go to.
    await expect.element(recipient("Dora")).toMatchTextContent(copy.skipReasons["left-office"]);
    await expect.element(recipient("Dora").getByRole("link", { name: copy.theLetter })).not.toBeInTheDocument();
    // The email as a mail app shows one: from, to and the subject, then the letter and its files.
    await expect.element(page.getByText("Jo Example <jo@pauseai.uk>")).toBeVisible();
    await expect.element(page.getByText(copy.toEach)).toBeVisible();
    await expect.element(page.getByText("Come to the example conference")).toBeVisible();
    await expect.element(page.getByRole("list", { name: copy.attachments })).toBeVisible();
    await expect.element(page.getByText(staffCopy.mailingEditor.fields.salutation)).toBeVisible();
  });

  it("with no ask: no bar, Sent as a tag, and no answers; a count chosen, with the way back", async () => {
    await view({
      mailing: {
        ...mailing,
        ask: null,
        askTitle: null,
        tab: "replied",
        recipients: [
          { ...mailing.recipients[0], answer: null, replies: 0 },
          { ...mailing.recipients[1], status: "spam_complaint" },
          { ...mailing.recipients[2], status: "queued", skipReason: null, sentAt: null },
        ],
      },
    });
    await expect.element(page.getByRole("progressbar")).not.toBeInTheDocument();
    expect(page.getByText(copy.states.sent, { exact: true }).all()).toHaveLength(2);
    await expect.element(page.getByRole("heading", { name: copy.tabs.replied })).toBeVisible();
    await expect
      .element(page.getByRole("link", { name: copy.showEveryone }))
      .toHaveAttribute("href", "/staff/mailings/4");
    await expect
      .element(page.getByRole("link", { name: `2 ${copy.counts.replied}` }))
      .toHaveAttribute("aria-current", "true");
    // With no ask, no answers.
    await expect.element(page.getByText(copy.counts.answered)).not.toBeInTheDocument();
    await expect.element(recipient("Polly")).toMatchTextContent(copy.tabs.replied);
    // Replied, as Airtable recorded it, with no reply kept: still one.
    await expect.element(recipient("Polly").getByRole("link", { name: copy.letterAndReplies(1) })).toBeVisible();
    await expect.element(recipient("Morag")).toMatchTextContent(staffCopy.letters.status.spam_complaint);
    // A status nobody knows any more, as it's stored, dated when the mailing last changed.
    await expect.element(recipient("Dora")).toMatchTextContent("queued");
    await expect.element(recipient("Dora")).toMatchTextContent("28 Oct 2026");
  });

  it("stopped, said so; sent at no time when nothing's gone", async () => {
    await view({
      mailing: { ...mailing, ask: null, askTitle: null, sentAt: null, tab: "bounced", page: 2, pages: 2 },
      written: { ...written, state: "cancelled" },
    });
    await expect.element(page.getByText(copy.states.cancelled, { exact: true })).toBeVisible();
    await expect.element(page.getByText(staffCopy.mailings.notSent)).toBeVisible();
    await expect
      .element(page.getByRole("link", { name: staffCopy.paging.previous }))
      .toHaveAttribute("href", "/staff/mailings/4?tab=bounced");
  });

  it("scheduled: when it sends, Change the time in London's hours, and Stop; no counts yet", async () => {
    vi.useFakeTimers({ now: new Date("2026-10-29T12:00:00Z"), toFake: ["Date"] });
    onTestFinished(() => void vi.useRealTimers());
    const forms: FormData[] = [];
    const action = async (form: FormData) => void forms.push(form);
    await view({ written: { ...written, state: "scheduled" }, stop: action, reschedule: action });
    await expect.element(page.getByText(copy.sends("Tue 1 Dec at 09:18"))).toBeVisible();
    expect(page.getByText(copy.states.scheduled, { exact: true }).all()).toHaveLength(2);
    await expect.element(page.getByRole("link", { name: `11 ${copy.counts.sent}` })).not.toBeInTheDocument();
    await page.getByRole("button", { name: copy.changeTime }).click();
    await expect.element(page.getByRole("button", { name: copy.day })).toMatchTextContent("Tue 1 Dec 2026");
    await page.getByRole("combobox").selectOptions("10");
    await page.getByRole("button", { name: copy.saveTime }).click();
    await page.getByRole("button", { name: copy.unschedule }).click();
    await expect
      .poll(() => forms.map((form) => [...form.entries()]))
      .toEqual([
        [
          ["id", "12"],
          ["day", "2026-12-01"],
          ["hour", "10"],
        ],
        [["id", "12"]],
      ]);
  });

  it("Change the time keeps an hour overnight that a mailing was due at already, saying when it goes", async () => {
    vi.useFakeTimers({ now: new Date("2026-12-01T08:58:00Z"), toFake: ["Date", "setInterval", "clearInterval"] });
    onTestFinished(() => void vi.useRealTimers());
    await view({
      written: { ...written, state: "scheduled", dueAt: "2026-12-03T03:00:00Z" },
      reschedule: async () => {},
    });
    await page.getByRole("button", { name: copy.changeTime }).click();
    await expect.element(page.getByRole("combobox")).toHaveValue("3");
    expect(
      page
        .getByRole("option")
        .all()
        .map((option) => option.element().textContent)[0],
    ).toBe(copy.goesAt("03:00", "06:18"));
  });

  it("Change the time never offers a time too soon: it starts at the first it can go, and moves on as time passes", async () => {
    vi.useFakeTimers({ now: new Date("2026-12-01T08:58:00Z"), toFake: ["Date", "setInterval", "clearInterval"] });
    onTestFinished(() => void vi.useRealTimers());
    const forms: FormData[] = [];
    const action = async (form: FormData) => void forms.push(form);
    await view({ written: { ...written, state: "scheduled" }, reschedule: action });
    await page.getByRole("button", { name: copy.changeTime }).click();
    const day = page.getByRole("button", { name: copy.day });
    const hour = page.getByRole("combobox");
    const option = (h: number) => page.getByRole("option", { name: `${String(h).padStart(2, "0")}:18` });
    // Each hour says when a mailing due then goes, and those overnight, when nothing is sent, aren't offered.
    expect(page.getByRole("option").all()[0].element().textContent).toBe("06:18");
    // It goes at 09:00, five minutes from now in London: too soon, so 10:00, and the hours before it can't be.
    await expect.element(day).toMatchTextContent("Tue 1 Dec 2026");
    await expect.element(hour).toHaveValue("10");
    await expect.element(option(9)).toBeDisabled();
    await expect.element(option(10)).not.toBeDisabled();
    // Another day, any hour; back to today, one too soon moves on.
    await chooseDay(day, "2026-12-02");
    await hour.selectOptions("7");
    await expect.element(option(7)).not.toBeDisabled();
    await chooseDay(day, "2026-12-01");
    await expect.element(hour).toHaveValue("10");
    // An hour on, 10:00 is too soon too.
    vi.advanceTimersByTime(58 * 60_000);
    await expect.element(hour).toHaveValue("11");
    await page.getByRole("button", { name: copy.saveTime }).click();
    await expect
      .poll(() => forms.map((form) => [...form.entries()]))
      .toEqual([
        [
          ["id", "12"],
          ["day", "2026-12-01"],
          ["hour", "11"],
        ],
      ]);
  });

  it("by its address alone, for a sender with no name or a blank one", async () => {
    const { rerender } = await view({ written: { ...written, fromName: null, createdBy: "" } });
    await expect.element(page.getByText("jo@pauseai.uk", { exact: true }).first()).toBeVisible();
    await expect.element(page.getByText(copy.by(""))).not.toBeInTheDocument();
    await rerender(
      <MailingView
        mailing={mailing}
        written={{ ...written, fromName: "", state: "scheduled" }}
        asks={exampleAsks}
        stop={noAction}
        reschedule={noAction}
      />,
    );
    await expect.element(page.getByText(copy.scheduledLine(mailing.to, "jo@pauseai.uk"))).toBeVisible();
  });

  it("sending: how far it's got, when it started, and Stop sending", async () => {
    await view({ written: { ...written, state: "sending" } });
    await expect.element(page.getByText(copy.sendingBar(11, 12))).toBeVisible();
    await expect.element(page.getByText(copy.started)).toBeVisible();
    await expect.element(page.getByRole("progressbar", { name: copy.sentLabel })).toHaveAttribute("value", "12");
    await expect.element(page.getByRole("button", { name: copy.stopSending })).toBeVisible();
    await expect.element(page.getByText(copy.states.sending, { exact: true })).not.toBeInTheDocument();
  });
});

describe("MailingView, for a mailing imported from Airtable", () => {
  const mailings = staffCopy.mailings;
  const imported = (props: Partial<Mailing> = {}) =>
    render(<MailingView mailing={{ ...exampleMailing, ...props }} asks={[]} stop={noAction} reschedule={noAction} />);

  it("is when it went, its counts, each recipient's outcome and how it was written, and that it has no text", async () => {
    await imported({ ask: null });
    await expect.element(page.getByRole("heading", { level: 1 })).toMatchTextContent(exampleMailing.title);
    await expect.element(page.getByText(mailings.imported).first()).toBeVisible();
    await expect.element(page.getByText("1 Oct 2026, 09:00")).toBeVisible();
    await expect.element(page.getByText(mailings.recipientsCount(4))).toBeVisible();
    await expect.element(page.getByText(mailings.noText)).toBeVisible();
    await expect.element(page.getByRole("row").filter({ hasText: "Polly" })).toMatchTextContent(mailings.personalised);
    await expect
      .element(page.getByRole("link", { name: "Morag Example" }))
      .toHaveAttribute("href", "/staff/politicians/8");
  });

  it("with an ask, its bar", async () => {
    await imported();
    await expect.element(page.getByText(copy.answeredBar(1, 4))).toBeVisible();
  });

  it("pages its recipients, a hundred at a time, saying how many there are", async () => {
    await imported({ recipientsTotal: 250, page: 2, pages: 3 });
    await expect.element(page.getByText(mailings.recipientsCount(250))).toBeVisible();
    await expect
      .element(page.getByRole("link", { name: staffCopy.paging.next }))
      .toHaveAttribute("href", `/staff/mailings/${exampleMailing.id}?page=3`);
  });
});

describe("MailingLetterView", () => {
  const letter = { ...examplePauseaiLetterDetails, mailingAsk: exampleAsks[0]!.slug };
  const politician = { ...examplePolitician, airtableId: null };
  const view = (props: Partial<Parameters<typeof MailingLetterView>[0]>) =>
    render(
      <MailingLetterView letter={letter} politician={politician} asks={exampleAsks} setStatus={noAction} {...props}>
        <p>the thread</p>
      </MailingLetterView>,
    );

  it("answered: green, with the ask as the politician's page has it, beside the thread and history", async () => {
    await view({});
    await expect.element(page.getByText(staffCopy.mailings.columns.answered, { exact: true })).toBeVisible();
    await expect.element(page.getByRole("group", { name: exampleAsks[0]!.title })).toBeVisible();
    await expect.element(page.getByText("the thread")).toBeVisible();
    await expect.element(page.getByRole("heading", { name: staffCopy.letters.detail.historyTitle })).toBeVisible();
    await expect
      .element(page.getByRole("link", { name: letter.mailing }))
      .toHaveAttribute("href", `/staff/mailings/${letter.mailingId}`);
    await expect.element(page.getByText(staffCopy.mailings.personalised, { exact: false })).toBeVisible();
    await expect
      .element(page.getByRole("link", { name: letter.mpName }))
      .toHaveAttribute("href", `/staff/politicians/${letter.politicianId}`);
  });

  it("not answered, with no ask: its status, red when it bounced; one nobody knows any more as stored", async () => {
    const { rerender } = await view({
      letter: { ...letter, mailingAsk: null, status: "bounced", personalised: false },
    });
    await expect.element(page.getByText(staffCopy.letters.status.bounced, { exact: true })).toBeVisible();
    await expect
      .element(page.getByRole("heading", { name: staffCopy.mailings.fields.ask, exact: true }))
      .not.toBeInTheDocument();
    await rerender(
      <MailingLetterView
        letter={{ ...letter, status: "queued" }}
        politician={{ ...politician, statuses: {} }}
        asks={exampleAsks}
        setStatus={noAction}
      >
        <p>the thread</p>
      </MailingLetterView>,
    );
    await expect.element(page.getByText("queued", { exact: true })).toBeVisible();
    await rerender(
      <MailingLetterView
        letter={{ ...letter, status: "spam_complaint" }}
        politician={{ ...politician, statuses: {} }}
        asks={exampleAsks}
        setStatus={noAction}
      >
        <p>the thread</p>
      </MailingLetterView>,
    );
    await expect.element(page.getByText(staffCopy.letters.status.spam_complaint, { exact: true })).toBeVisible();
  });
});

describe("MailingFor", () => {
  const actions = {
    start: vi.fn(),
    save: vi.fn(),
    attach: vi.fn(),
    detach: vi.fn(),
    sendTest: vi.fn(),
    schedule: vi.fn(),
    deleteDraft: noAction,
    stop: noAction,
    reschedule: noAction,
  };

  it("shows an imported mailing's recipients, a draft to write, or a mailing scheduled", async () => {
    const { rerender } = await render(
      <MailingFor data={{ kind: "imported", mailing: exampleMailing }} actions={actions} />,
    );
    await expect.element(page.getByText(staffCopy.mailings.noText)).toBeVisible();
    await rerender(
      <MailingFor data={{ kind: "draft", draft: exampleWrittenMailing, ...exampleWriterData }} actions={actions} />,
    );
    await expect.element(page.getByRole("textbox", { name: copy.letter })).toBeVisible();
    await rerender(
      <MailingFor
        data={{
          kind: "written",
          mailing: exampleMailing,
          written: { ...exampleWrittenMailing, state: "sent" },
          filter: exampleWriterData.filter,
          parties: [],
          asks: exampleAsks,
        }}
        actions={actions}
      />,
    );
    await expect.element(page.getByText(copy.answeredBar(1, 4))).toBeVisible();
  });
});
