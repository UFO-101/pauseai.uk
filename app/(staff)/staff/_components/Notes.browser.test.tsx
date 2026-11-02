import { describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";
import { page, userEvent } from "vitest/browser";
import { buttonClass } from "@/components/ui/Button";
import { staffCopy } from "@/lib/content/staff-interface";
import { staffTime } from "@/lib/staff-time";
import NoteForm from "./NoteForm";
import Notes, { NoteEntry, NoteText } from "./Notes";
import { exampleNoteAdmin, exampleNotes, exampleNotesAt, exampleNoteWriter } from "./Notes.examples";

const copy = staffCopy.notes;
const notes = () => page.getByRole("list", { name: copy.title }).getByRole("listitem");
const fields = (form: FormData) => Object.fromEntries(form.entries());

async function renderNotes(reader = exampleNoteWriter, list = exampleNotes) {
  const actions = { add: vi.fn(), edit: vi.fn(), remove: vi.fn() };
  await render(<Notes supporterId={4} notes={list} reader={reader} at={exampleNotesAt} {...actions} />);
  return actions;
}

describe("Notes", () => {
  it("lists a supporter's notes, newest first, with who wrote each, when, and whether it was edited, their addresses links", async () => {
    await renderNotes();
    await expect.element(page.getByRole("heading", { name: copy.title })).toBeVisible();
    await expect.element(notes().nth(1)).toBeVisible();
    const text = (i: number) => notes().nth(i).element().textContent;
    expect(text(0)).toContain(`jo@pauseai.uk · ${staffTime(exampleNotes[0].createdAt)}`);
    expect(text(1)).toContain(`sam@pauseai.uk · ${staffTime(exampleNotes[1].createdAt)} · ${copy.edited}`);
    const link = notes().nth(0).getByRole("link", { name: "https://example.org/slides/leeds-2026" });
    await expect.element(link).toHaveAttribute("href", "https://example.org/slides/leeds-2026");
    await expect.element(link).toHaveAttribute("target", "_blank");
    await expect
      .element(notes().nth(1).getByRole("link", { name: "www.example.com/rota" }))
      .toHaveAttribute("href", "https://www.example.com/rota");
  });

  it("lets the writer edit only her note still young enough: Save, Cancel, and Delete, red, while editing", async () => {
    const { edit, remove } = await renderNotes();
    const first = notes().nth(0);
    await expect.element(notes().nth(1).getByRole("button", { name: copy.edit })).not.toBeInTheDocument();
    await expect.element(notes().nth(2).getByRole("button")).not.toBeInTheDocument();
    // Not editing: Edit alone, no Delete.
    await expect.element(first.getByRole("button", { name: copy.delete })).not.toBeInTheDocument();
    await first.getByRole("button", { name: copy.edit }).click();
    // Editing: no Edit; the field, focused, with its text, in place of the text.
    await expect.element(first.getByRole("button", { name: copy.edit })).not.toBeInTheDocument();
    await expect.element(first.getByRole("link")).not.toBeInTheDocument();
    const field = first.getByRole("textbox", { name: copy.note });
    await expect.element(field).toHaveFocus();
    await expect.element(field).toHaveValue(exampleNotes[0].body);
    await field.fill("Never saved");
    await first.getByRole("button", { name: copy.cancel }).click();
    await expect.element(field).not.toBeInTheDocument();
    await expect.element(first.getByRole("link")).toBeVisible();
    expect(edit).not.toHaveBeenCalled();
    await first.getByRole("button", { name: copy.edit }).click();
    await first.getByRole("textbox", { name: copy.note }).fill("Spoke in Leeds");
    await first.getByRole("button", { name: copy.save }).click();
    expect(fields(edit.mock.calls[0][0])).toEqual({ id: "3", body: "Spoke in Leeds" });
    // Saved, it closes.
    await expect.element(first.getByRole("button", { name: copy.edit })).toBeVisible();
    await first.getByRole("button", { name: copy.edit }).click();
    const del = first.getByRole("button", { name: copy.delete });
    expect(del.element().className).toBe(buttonClass({ variant: "danger", size: "small", fit: true }));
    await del.click();
    await page.getByRole("button", { name: staffCopy.deleteIt }).click();
    await vi.waitFor(() => expect(remove).toHaveBeenCalled());
    expect((remove.mock.calls[0][0] as FormData).get("id")).toBe("3");
  });

  it("says so, and stays open, when the server won't change it, its day up on a page left open", async () => {
    const { edit, remove } = await renderNotes();
    edit.mockResolvedValue(false);
    remove.mockResolvedValue(false);
    const first = notes().nth(0);
    await first.getByRole("button", { name: copy.edit }).click();
    await first.getByRole("button", { name: copy.save }).click();
    await expect.element(first.getByRole("alert")).toHaveTextContent(copy.tooLate.edit);
    await expect.element(first.getByRole("textbox", { name: copy.note })).toBeVisible();
    await first.getByRole("button", { name: copy.delete }).click();
    await page.getByRole("button", { name: staffCopy.deleteIt }).click();
    await expect.element(first.getByRole("alert")).toHaveTextContent(copy.tooLate.delete);
    // Cancel closes it, and what it said with it.
    await first.getByRole("button", { name: copy.cancel }).click();
    await first.getByRole("button", { name: copy.edit }).click();
    await expect.element(first.getByRole("alert")).not.toBeInTheDocument();
  });

  it("lets an admin delete any note, but edit none of them", async () => {
    await renderNotes(exampleNoteAdmin);
    for (const i of [0, 1, 2]) {
      await expect.element(notes().nth(i).getByRole("button", { name: copy.delete })).toBeVisible();
    }
    await expect.element(page.getByText(copy.edit, { exact: true })).not.toBeInTheDocument();
  });

  it("says when there are none, and adds one on the supporter, with what a note should be under the field", async () => {
    const { add } = await renderNotes(exampleNoteWriter, []);
    await expect.element(page.getByText(copy.none)).toBeVisible();
    await page.getByRole("button", { name: copy.write }).click();
    const field = page.getByRole("textbox", { name: copy.note });
    await expect.element(field).toHaveFocus();
    await expect.element(field).toHaveAccessibleDescription(copy.guidance);
    await field.click();
    await userEvent.keyboard("Keen{Shift>}{Enter}{/Shift}to help");
    await page.getByRole("button", { name: copy.add }).click();
    expect(fields(add.mock.calls[0][0])).toEqual({ supporterId: "4", body: "Keen\nto help" });
    // Added, it closes, for the page to show the note.
    await expect.element(page.getByRole("button", { name: copy.write })).toBeVisible();
  });
});

describe("NoteEntry", () => {
  it("in a history: its label, who wrote it and no time, the history giving that", async () => {
    await render(
      <NoteEntry
        note={exampleNotes[1]}
        reader={exampleNoteWriter}
        at={exampleNotesAt}
        edit={vi.fn()}
        remove={vi.fn()}
        label="Note"
        dated={false}
      />,
    );
    await expect.element(page.getByText(`Note · sam@pauseai.uk · ${copy.edited}`)).toBeVisible();
    await expect.element(page.getByRole("button")).not.toBeInTheDocument();
  });
});

describe("NoteForm", () => {
  it("opens from Write a note, closes unsent on Cancel, and on a politician has no reminder under the field", async () => {
    const add = vi.fn();
    await render(<NoteForm target={{ name: "politicianId", value: 7 }} add={add} />);
    await expect.element(page.getByRole("textbox")).not.toBeInTheDocument();
    await page.getByRole("button", { name: copy.write }).click();
    await page.getByRole("textbox", { name: copy.note }).fill("Never sent");
    await page.getByRole("button", { name: copy.cancel }).click();
    await expect.element(page.getByRole("textbox")).not.toBeInTheDocument();
    expect(add).not.toHaveBeenCalled();
    await page.getByRole("button", { name: copy.write }).click();
    await expect.element(page.getByRole("textbox", { name: copy.note })).not.toHaveAttribute("aria-describedby");
    await expect.element(page.getByText(copy.guidance)).not.toBeInTheDocument();
    await page.getByRole("textbox", { name: copy.note }).fill("Met them");
    await page.getByRole("button", { name: copy.add }).click();
    expect(fields(add.mock.calls[0][0])).toEqual({ politicianId: "7", body: "Met them" });
  });
});

describe("NoteText", () => {
  it("keeps the lines, in its own class or one given", async () => {
    const { container } = await render(<NoteText body={"One\nTwo"} className="given" />);
    expect(container.querySelector("p.given")?.textContent).toBe("One\nTwo");
  });
});
