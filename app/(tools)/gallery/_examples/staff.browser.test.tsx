import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { page } from "vitest/browser";
import { staffCopy } from "@/lib/content/staff-interface";
import { exampleLetter } from "@/app/(staff)/staff/_components/LettersTable.examples";
import {
  ChangeTimeFormExample,
  DueTimeFieldsExample,
  EventsTableExample,
  HeldSyncExample,
  MailingWriterExample,
  NoteChangesExample,
  NoteEntryExample,
  NoteFormExample,
  NoteHistoryExample,
  NotesExample,
  NoteTextExample,
  NoticeExample,
  PoliticianDetailsExample,
  PoliticianTableEmptyExample,
  PoliticianTableExample,
} from "./staff.client";

// The staff examples' Server Actions are logged, not sent: pressing each adds its line to the event log.
const log = () => page.getByRole("list", { name: "Event log" }).getByRole("listitem");
const subject = () => page.getByLabelText(new RegExp(`^${staffCopy.mailingPages.subject}`));

describe("the staff examples", () => {
  it("picks a mailing's hour, and logs Change the time's save", async () => {
    const { unmount } = await render(<DueTimeFieldsExample />);
    await page.getByRole("combobox").selectOptions("15");
    await expect.element(page.getByRole("combobox")).toHaveValue("15");
    await unmount();
    await render(<ChangeTimeFormExample />);
    await page.getByRole("button", { name: staffCopy.mailingPages.saveTime }).click();
    await expect.element(page.getByText(/^rescheduleMailingNow\(\{"id":"5"/)).toBeVisible();
  });

  it("logs a new note, as each reader sees the notes", async () => {
    const { unmount } = await render(<NotesExample as="admin" />);
    await expect.element(page.getByRole("button", { name: staffCopy.notes.delete }).nth(2)).toBeVisible();
    await unmount();
    await render(<NotesExample as="empty" />);
    await page.getByRole("button", { name: staffCopy.notes.write }).click();
    await page.getByRole("textbox", { name: staffCopy.notes.note }).fill("Met them");
    await page.getByRole("button", { name: staffCopy.notes.add }).click();
    await expect.element(log().nth(0)).toHaveTextContent('add({"supporterId":"1","body":"Met them"})');
  });

  it("shows a note's text with its links", async () => {
    const { unmount } = await render(<NotesExample />);
    await expect.element(page.getByRole("button", { name: staffCopy.notes.edit })).toBeVisible();
    await unmount();
    await render(<NoteTextExample />);
    await expect.element(page.getByRole("link", { name: "www.example.com/rota" })).toBeVisible();
  });

  it("logs a note drafted at the top of a history, and has no Write a note without its action", async () => {
    const { unmount } = await render(<NoteHistoryExample lines={false} />);
    await page.getByRole("button", { name: staffCopy.notes.write }).click();
    await page.getByRole("textbox", { name: staffCopy.notes.note }).fill("Met them");
    await page.getByRole("button", { name: staffCopy.notes.add }).click();
    await expect.element(log().nth(0)).toHaveTextContent('add({"politicianId":"7","body":"Met them"})');
    await unmount();
    const plain = await render(<NoteHistoryExample writable={false} />);
    await expect.element(page.getByRole("button", { name: staffCopy.notes.write })).not.toBeInTheDocument();
    await plain.unmount();
    await render(<NoteHistoryExample />);
    await expect.element(page.getByText("Email from PauseAI: Example Mailing")).toBeVisible();
  });

  it("logs a note's edit, and gives an admin Delete alone", async () => {
    const { unmount } = await render(<NoteChangesExample />);
    await page.getByRole("button", { name: staffCopy.notes.edit }).click();
    await page.getByRole("button", { name: staffCopy.notes.save }).click();
    await expect.poll(() => log().nth(0).query()?.textContent).toMatch(/^edit\(/);
    await unmount();
    await render(<NoteChangesExample editable={false} />);
    await expect.element(page.getByRole("button", { name: staffCopy.notes.delete })).toBeVisible();
    await expect.element(page.getByRole("button", { name: staffCopy.notes.edit })).not.toBeInTheDocument();
  });

  it("shows a note in a history, its own or another's, and logs the form on a politician", async () => {
    const { unmount } = await render(<NoteEntryExample />);
    await expect.element(page.getByRole("button", { name: staffCopy.notes.edit })).toBeVisible();
    await unmount();
    const other = await render(<NoteEntryExample own={false} />);
    await expect.element(page.getByText(staffCopy.notes.edited, { exact: false })).toBeVisible();
    await other.unmount();
    await render(<NoteFormExample on="politicianId" opened />);
    await expect.element(page.getByRole("textbox", { name: staffCopy.notes.note })).not.toHaveFocus();
    await page.getByRole("textbox", { name: staffCopy.notes.note }).fill("Met them");
    await page.getByRole("button", { name: staffCopy.notes.add }).click();
    await expect.element(log().nth(0)).toHaveTextContent('add({"politicianId":"1","body":"Met them"})');
  });

  it("logs an event's save in the table", async () => {
    await render(<EventsTableExample />);
    await page.getByRole("button", { name: staffCopy.events.editLabel("AI risk talk") }).click();
    await page.getByRole("combobox").selectOptions("sean@pauseai.uk");
    await page.getByRole("button", { name: staffCopy.events.save }).click();
    await expect.poll(() => log().nth(0).query()?.textContent).toMatch(/^save\(/);
    expect(document.querySelector("[role=status]")!.textContent).toBe("");
  });

  it("logs an event's save, and says whom it emailed", async () => {
    await render(<EventsTableExample emailed />);
    await page.getByRole("button", { name: staffCopy.events.editLabel("AI risk talk") }).click();
    await page.getByRole("combobox").selectOptions("sean@pauseai.uk");
    await page.getByRole("button", { name: staffCopy.events.save }).click();
    await expect.poll(() => log().nth(0).query()?.textContent).toMatch(/^save\(/);
    await expect
      .poll(() => page.getByRole("status").query()?.textContent)
      .toContain(staffCopy.events.emailed(["sean@pauseai.uk", "joseph@pauseai.uk"], "sean@pauseai.uk"));
  });

  it("closes a Notice with its ×, and opens it again", async () => {
    await render(<NoticeExample />);
    await page.getByRole("button", { name: "Close" }).click();
    await page.getByRole("button", { name: "Open it again" }).click();
    await expect.element(page.getByRole("button", { name: "Close" })).toBeVisible();
  });

  it("logs a held sync's apply and discard", async () => {
    await render(<HeldSyncExample />);
    await page.getByRole("button", { name: staffCopy.syncs.apply }).click();
    await expect.element(log().nth(0)).toHaveTextContent('decide({"id":"3","decision":"apply"})');
    await page.getByRole("button", { name: staffCopy.syncs.discard }).click();
    await expect.element(log().nth(1)).toHaveTextContent('decide({"id":"3","decision":"discard"})');
  });

  it("logs removing a politician's signature on their page", async () => {
    await render(<PoliticianDetailsExample />);
    await page
      .getByRole("region", { name: staffCopy.politician.statusesTitle })
      .getByText(staffCopy.politician.edit, { exact: true })
      .click();
    await page.getByLabelText(staffCopy.politician.note).fill("Their office wrote");
    await page.getByRole("button", { name: staffCopy.politicians.unmarkSigned }).click();
    await expect
      .element(log().nth(0))
      .toHaveTextContent(
        'setStatus({"politicianId":"7","ask":"frontier-ai-letter","status":"","note":"Their office wrote"})',
      );
  });

  it("shows a politician's letters without who wrote them", async () => {
    await render(<PoliticianDetailsExample fromAirtable senders={false} />);
    await expect.element(page.getByText(staffCopy.politician.history.unsignedLetter, { exact: false })).toBeVisible();
    await expect.element(page.getByText(exampleLetter.senderName)).not.toBeInTheDocument();
  });

  it("logs a new mailing's start", async () => {
    await render(<MailingWriterExample draft={false} />);
    await subject().fill("Hello");
    await expect.poll(() => log().nth(0).query()?.textContent).toMatch(/^startMailing\(/);
  });

  it("logs a draft's save", async () => {
    await render(<MailingWriterExample draft />);
    await subject().fill("Hello again");
    await expect.poll(() => log().last().query()?.textContent).toMatch(/^saveMailing\(/);
  });

  it("lists politicians with no buttons", async () => {
    await render(<PoliticianTableExample />);
    expect(page.getByRole("button").all()).toHaveLength(0);
  });

  it("says when no politician matches", async () => {
    await render(<PoliticianTableEmptyExample />);
    await expect.element(page.getByText(staffCopy.politicians.none)).toBeVisible();
  });
});
