import { describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";
import { page } from "vitest/browser";
import { staffCopy } from "@/lib/content/staff-interface";
import type { Mailing } from "@/lib/server/mailings";
import { DeleteDraft, StopMailing } from "./MailingButtons";
import MailingFor from "./MailingFor";
import { MailingLetter } from "./MailingLetter";
import { FilterPills, MailingCounts } from "./MailingParts";
import MailingView from "./MailingView";
import MailingsOverview from "./MailingsOverview";
import { exampleMailingLetter, exampleWriterData, exampleWrittenMailing } from "./MailingWriter.examples";
import { exampleDraft, exampleMailing, exampleMailings, exampleScheduled } from "./MailingsTable.examples";
import { exampleAsks } from "./PoliticianTable.examples";

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

describe("MailingCounts", () => {
  it("counts each outcome", async () => {
    await render(<MailingCounts mailing={exampleMailings[0]} />);
    await expect.element(page.getByText(`11${copy.counts.sent}`)).toBeVisible();
    await expect.element(page.getByText(`3${copy.counts.answered}`)).toBeVisible();
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
  it("lists the drafts, those coming up and those sent", async () => {
    await render(
      <MailingsOverview
        drafts={[exampleDraft, { ...exampleDraft, id: 7, title: "" }]}
        comingUp={[exampleScheduled, { ...exampleScheduled, id: 8, state: "sending" }]}
        sent={exampleMailings}
        deleteDraft={noAction}
        stop={noAction}
      />,
    );
    await expect
      .element(page.getByRole("link", { name: "Meet us in Westminster" }))
      .toHaveAttribute("href", "/staff/mailings/5");
    await expect.element(page.getByRole("link", { name: copy.untitled })).toBeVisible();
    await expect.element(page.getByText(copy.draftLine("jo@pauseai.uk", 412)).first()).toBeVisible();
    await expect
      .element(page.getByText(copy.comingLine("jo@pauseai.uk", "Friday 30 October at 09:00", 72)).first())
      .toBeVisible();
    await expect.element(page.getByRole("button", { name: copy.unschedule })).toBeVisible();
    await expect.element(page.getByRole("button", { name: copy.stopSending })).toBeVisible();
    await expect.element(page.getByText("Jo Example")).toBeVisible();
    await expect
      .element(page.getByRole("link", { name: copy.howToStart.link }))
      .toHaveAttribute("href", "/staff/politicians");
  });

  it("says when there are no drafts and nothing coming up", async () => {
    await render(<MailingsOverview drafts={[]} comingUp={[]} sent={[]} deleteDraft={noAction} stop={noAction} />);
    await expect.element(page.getByText(copy.noDrafts)).toBeVisible();
    await expect.element(page.getByText(copy.noneComing)).toBeVisible();
  });
});

/** The recipients table's column headings. */
const headings = () => [...page.getByRole("table").element().querySelectorAll("th")].map((th) => th.textContent);

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

  it("once sent: when, from whom and its ask, its counts, its recipients in tabs with their answers, and the email", async () => {
    await view({});
    await expect.element(page.getByRole("heading", { level: 1 })).toHaveTextContent(mailing.title);
    await expect.element(page.getByText(copy.states.sent, { exact: true }).first()).toBeVisible();
    await expect
      .element(page.getByText(copy.sentLine("20 Oct 2026, 08:00", "Jo Example"), { exact: false }))
      .toBeVisible();
    await expect.element(page.getByText(`11${copy.counts.sent}`)).toBeVisible();
    await expect
      .element(page.getByRole("link", { name: copy.tab(copy.tabs.bounced, 1) }))
      .toHaveAttribute("href", "/staff/mailings/4?tab=bounced");
    // Past the right of a phone's window, so in the page rather than seen.
    await expect.element(page.getByRole("cell", { name: staffCopy.statuses.going })).toBeInTheDocument();
    expect(headings()).toContain("Edinburgh conference");
    await expect.element(page.getByText(copy.skipReasons["left-office"])).toBeVisible();
    // The email as a mail app shows one: from, to and the subject, then the letter and its files.
    await expect.element(page.getByText("Jo Example <jo@pauseai.uk>")).toBeVisible();
    await expect.element(page.getByText(copy.toEach)).toBeVisible();
    await expect.element(page.getByText("Come to the example conference")).toBeVisible();
    await expect.element(page.getByRole("list", { name: copy.attachments })).toBeVisible();
    await expect.element(page.getByText(staffCopy.mailingEditor.fields.salutation)).toBeVisible();
    await expect.element(page.getByText("who")).toBeVisible();
  });

  it("with no ask, no answers; stopped, said so; sent at its time when nothing's gone", async () => {
    await view({
      mailing: { ...mailing, ask: null, askTitle: null, sentAt: null, tab: "bounced", page: 2, pages: 2 },
      written: { ...written, state: "cancelled" },
    });
    await expect.element(page.getByText(copy.states.cancelled, { exact: true }).first()).toBeVisible();
    await expect.element(page.getByText(copy.sentLine("1 Dec 2026, 09:00", "Jo Example"))).toBeVisible();
    await expect.element(page.getByRole("table")).toBeInTheDocument();
    expect(headings()).toHaveLength(4);
    await expect
      .element(page.getByRole("link", { name: staffCopy.paging.previous }))
      .toHaveAttribute("href", "/staff/mailings/4?tab=bounced");
  });

  it("scheduled: when it sends, Change the time in London's hours, and Stop", async () => {
    const forms: FormData[] = [];
    const action = async (form: FormData) => void forms.push(form);
    await view({ written: { ...written, state: "scheduled" }, stop: action, reschedule: action });
    await expect.element(page.getByText(copy.sends("Tuesday 1 December at 09:00"))).toBeVisible();
    await expect.element(page.getByText(`11${copy.counts.sent}`)).not.toBeInTheDocument();
    await page.getByRole("button", { name: copy.changeTime }).click();
    await expect.element(page.getByLabelText(copy.day)).toHaveValue("2026-12-01");
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

  it("by its address alone, for a sender with no name", async () => {
    const { rerender } = await view({ written: { ...written, fromName: null } });
    await expect
      .element(page.getByText(copy.sentLine("20 Oct 2026, 08:00", "jo@pauseai.uk"), { exact: false }))
      .toBeVisible();
    await expect.element(page.getByText("jo@pauseai.uk", { exact: true })).toBeVisible();
    await rerender(
      <MailingView
        mailing={mailing}
        written={{ ...written, fromName: null, state: "scheduled" }}
        asks={exampleAsks}
        stop={noAction}
        reschedule={noAction}
      />,
    );
    await expect
      .element(page.getByText(new RegExp(`${copy.scheduledLine(mailing.to, "jo@pauseai.uk").replaceAll(".", "\\.")}$`)))
      .toBeVisible();
  });

  it("sending: how far it's got, and Stop", async () => {
    await view({ written: { ...written, state: "sending" } });
    await expect.element(page.getByText(copy.sending(11, 12))).toBeVisible();
    await expect.element(page.getByRole("progressbar", { name: copy.sentLabel })).toHaveAttribute("value", "11");
    await expect.element(page.getByRole("button", { name: copy.stopSending })).toBeVisible();
  });
});

describe("MailingView, for a mailing imported from Airtable", () => {
  const mailings = staffCopy.mailings;
  const imported = (props: Partial<Mailing> = {}) =>
    render(<MailingView mailing={{ ...exampleMailing, ...props }} asks={[]} stop={noAction} reschedule={noAction} />);

  it("is when it went, its counts, each recipient's outcome and how it was written, and that it has no text", async () => {
    await imported();
    await expect.element(page.getByRole("heading", { level: 1 })).toHaveTextContent(exampleMailing.title);
    await expect.element(page.getByText(mailings.imported)).toBeVisible();
    await expect.element(page.getByText(new RegExp(`^${copy.importedLine("1 Oct 2026, 09:00")}`))).toBeVisible();
    await expect.element(page.getByText(`2${copy.counts.sent}`)).toBeVisible();
    await expect.element(page.getByText(mailings.noText)).toBeVisible();
    await expect.element(page.getByText(copy.whoTitle)).not.toBeInTheDocument();
    expect(headings()).toContain(mailings.recipientColumns.how);
    await expect.element(page.getByRole("cell", { name: mailings.personalised })).toBeInTheDocument();
    await expect.element(page.getByText(mailings.asWritten).first()).toBeInTheDocument();
    await expect
      .element(page.getByRole("link", { name: "Morag Example" }))
      .toHaveAttribute("href", "/staff/politicians/8");
  });

  it("says when it hasn't been sent, and a status nobody knows any more as it's stored", async () => {
    await imported({ sentAt: null, recipients: [{ ...exampleMailing.recipients[0], status: "queued" }] });
    await expect.element(page.getByText(new RegExp(`^${mailings.notSent}`))).toBeVisible();
    await expect.element(page.getByRole("cell", { name: "queued" })).toBeInTheDocument();
  });

  it("pages its recipients, a hundred at a time, saying how many there are", async () => {
    await imported({ recipientsTotal: 250, page: 2, pages: 3 });
    await expect.element(page.getByText(mailings.recipientsCount(250))).toBeVisible();
    await expect
      .element(page.getByRole("link", { name: staffCopy.paging.next }))
      .toHaveAttribute("href", `/staff/mailings/${exampleMailing.id}?page=3`);
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
    await expect.element(page.getByText(copy.states.sent, { exact: true }).first()).toBeVisible();
  });
});
