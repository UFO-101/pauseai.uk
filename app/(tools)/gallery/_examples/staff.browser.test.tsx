import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { page } from "vitest/browser";
import { staffCopy } from "@/lib/content/staff-interface";
import { exampleLetter } from "@/app/(staff)/staff/_components/LettersTable.examples";
import {
  ChangeTimeFormExample,
  DueTimeFieldsExample,
  HeldSyncExample,
  MailingWriterExample,
  NoteEntryExample,
  NoteFormExample,
  NotesExample,
  NoteTextExample,
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
    await expect.element(page.getByText(staffCopy.notes.edit, { exact: true })).toBeVisible();
    await unmount();
    await render(<NoteTextExample />);
    await expect.element(page.getByRole("link", { name: "www.example.com/rota" })).toBeVisible();
  });

  it("shows a note in a history, its own or another's, and logs the form on a politician", async () => {
    const { unmount } = await render(<NoteEntryExample />);
    await expect.element(page.getByText(staffCopy.notes.edit, { exact: true })).toBeVisible();
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

  it("logs a held sync's apply and discard", async () => {
    await render(<HeldSyncExample />);
    await page.getByRole("button", { name: staffCopy.syncs.apply }).click();
    await expect.element(log().nth(0)).toHaveTextContent('decide({"id":"3","decision":"apply"})');
    await page.getByRole("button", { name: staffCopy.syncs.discard }).click();
    await expect.element(log().nth(1)).toHaveTextContent('decide({"id":"3","decision":"discard"})');
  });

  it("logs removing a politician's signature on their page", async () => {
    await render(<PoliticianDetailsExample />);
    await page.getByText(staffCopy.politician.edit, { exact: true }).click();
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
