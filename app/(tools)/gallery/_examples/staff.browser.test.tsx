import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { page } from "vitest/browser";
import { staffCopy } from "@/lib/content/staff-interface";
import { exampleLetter } from "@/app/(staff)/staff/_components/LettersTable.examples";
import {
  ChangeTimeFormExample,
  ChoosingListExample,
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
  PasteFormExample,
  PickBoxExample,
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
    await page
      .getByRole("row")
      .filter({ hasText: "AI risk talk" })
      .getByRole("button", { name: staffCopy.events.edit })
      .click();
    const form = page.getByRole("form", { name: staffCopy.events.editLabel("AI risk talk") });
    await form.getByLabelText(staffCopy.events.owner).selectOptions("sean@pauseai.uk");
    await form.getByRole("button", { name: staffCopy.events.save }).click();
    await expect.poll(() => log().nth(0).query()?.textContent).toMatch(/^save\(/);
    expect(document.querySelector("[role=status]")!.textContent).toBe("");
  });

  it("logs an event's save, and says whom it emailed", async () => {
    await render(<EventsTableExample emailed />);
    await page
      .getByRole("row")
      .filter({ hasText: "AI risk talk" })
      .getByRole("button", { name: staffCopy.events.edit })
      .click();
    const form = page.getByRole("form", { name: staffCopy.events.editLabel("AI risk talk") });
    await form.getByLabelText(staffCopy.events.owner).selectOptions("sean@pauseai.uk");
    await form.getByRole("button", { name: staffCopy.events.save }).click();
    await expect.poll(() => log().nth(0).query()?.textContent).toMatch(/^save\(/);
    await expect
      .poll(() => document.querySelector("[role=status]")?.textContent)
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

  it("logs clearing a politician's signature on their page", async () => {
    await render(<PoliticianDetailsExample />);
    await page
      .getByRole("region", { name: staffCopy.politician.statusesTitle })
      .getByText(staffCopy.politician.edit, { exact: true })
      .click();
    await page.getByRole("radio", { name: staffCopy.politician.clearAnswer }).click();
    await page.getByLabelText(staffCopy.politician.note).fill("Their office wrote");
    await page.getByRole("button", { name: staffCopy.politician.save }).click();
    await expect
      .element(log().nth(0))
      .toHaveTextContent(
        'setStatus({"politicianId":"7","ask":"frontier-ai-letter","note":"Their office wrote","status":""})',
      );
  });

  it("shows a politician's letters without who wrote them", async () => {
    await render(<PoliticianDetailsExample fromAirtable senders={false} />);
    await expect.element(page.getByText(staffCopy.politician.history.unsignedLetter, { exact: false })).toBeVisible();
    await expect.element(page.getByText(exampleLetter.senderName)).not.toBeInTheDocument();
  });

  it("logs a draft just made's first save, with its greeting", async () => {
    await render(<MailingWriterExample draft={false} />);
    await subject().fill("Hello");
    await expect.poll(() => log().nth(0).query()?.textContent).toMatch(/^saveMailing\(12, 1, \{"body"/);
  });

  it("logs a draft's save", async () => {
    await render(<MailingWriterExample draft />);
    await subject().fill("Hello again");
    await expect.poll(() => log().last().query()?.textContent).toMatch(/^saveMailing\(/);
  });

  it("logs a file taken off a draft", async () => {
    await render(<MailingWriterExample draft />);
    await page.getByRole("button", { name: staffCopy.mailingPages.removeFile("programme.pdf") }).click();
    await expect.poll(() => log().last().query()?.textContent).toMatch(/^detachFromMailing\(12, /);
  });

  it("logs a row ticked or unticked while choosing who a mailing is for", async () => {
    await render(<ChoosingListExample />);
    await page.getByRole("checkbox", { name: staffCopy.mailingPages.tick("Polly Placeholder") }).click();
    await expect.poll(() => log().last().query()?.textContent).toBe("pickPolitician(12, 7, false)");
  });

  it("logs names pasted, and ticking everyone they found", async () => {
    const { unmount } = await render(<PasteFormExample />);
    await page.getByRole("textbox", { name: staffCopy.mailingPages.pasteLabel }).fill("Polly Placeholder");
    await page.getByRole("button", { name: staffCopy.mailingPages.pasteTick }).click();
    await expect.poll(() => log().last().query()?.textContent).toMatch(/^pasteNames\(/);
    await unmount();
    await render(<ChoosingListExample pasted />);
    await page.getByRole("checkbox", { name: staffCopy.mailingPages.pastedTickAll(1) }).click();
    await expect.poll(() => log().last().query()?.textContent).toBe("pickMany(12, [7], false)");
    await page.getByRole("button", { name: staffCopy.mailingPages.untickAll }).click();
    await expect.poll(() => log().last().query()?.textContent).toMatch(/^untickAll\(12/);
  });

  it("logs each tick box's click", async () => {
    await render(<PickBoxExample />);
    for (const name of ["Ticked", "Not ticked", "Some ticked"]) await page.getByRole("checkbox", { name }).click();
    await expect
      .poll(() =>
        log()
          .all()
          .map((item) => item.element().textContent),
      )
      .toEqual(["pick(false)", "pick(true)", "pick(true)"]);
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
