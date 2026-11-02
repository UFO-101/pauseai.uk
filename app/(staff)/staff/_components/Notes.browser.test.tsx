import { describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";
import { page, userEvent } from "vitest/browser";
import { staffCopy } from "@/lib/content/staff-interface";
import { staffTime } from "@/lib/staff-time";
import Notes, { NoteText } from "./Notes";
import { exampleNoteAdmin, exampleNotes, exampleNotesAt, exampleNoteWriter } from "./Notes.examples";

const copy = staffCopy.notes;
const notes = () => page.getByRole("list", { name: copy.title }).getByRole("listitem");

function renderNotes(reader = exampleNoteWriter, list = exampleNotes) {
  const add = vi.fn();
  const edit = vi.fn();
  const remove = vi.fn();
  return render(
    <Notes
      notes={list}
      target={{ name: "supporterId", value: 4 }}
      reader={reader}
      at={exampleNotesAt}
      add={add}
      edit={edit}
      remove={remove}
    />,
  ).then(() => ({ add, edit, remove }));
}

describe("Notes", () => {
  it("lists the notes, newest first, with who wrote each, when, and whether it was edited, their addresses links", async () => {
    await renderNotes();
    await expect.element(notes().nth(0)).toHaveTextContent(`jo@pauseai.uk · ${staffTime(exampleNotes[0].createdAt)}`);
    await expect
      .element(notes().nth(1))
      .toHaveTextContent(`sam@pauseai.uk · ${staffTime(exampleNotes[1].createdAt)} · ${copy.edited}`);
    const link = notes().nth(0).getByRole("link", { name: "https://example.org/slides/leeds-2026" });
    await expect.element(link).toHaveAttribute("href", "https://example.org/slides/leeds-2026");
    await expect.element(link).toHaveAttribute("target", "_blank");
    await expect
      .element(notes().nth(1).getByRole("link", { name: "www.example.com/rota" }))
      .toHaveAttribute("href", "https://www.example.com/rota");
  });

  it("lets the writer edit or delete only her note still young enough, sending its ID and new text", async () => {
    const { edit, remove } = await renderNotes();
    await expect.element(notes().nth(1).getByText(copy.edit)).not.toBeInTheDocument();
    await expect.element(notes().nth(2).getByRole("button", { name: copy.delete })).not.toBeInTheDocument();
    await notes().nth(0).getByText(copy.edit, { exact: true }).click();
    const field = notes().nth(0).getByRole("textbox", { name: copy.note });
    await expect.element(field).toHaveValue(exampleNotes[0].body);
    await field.fill("Spoke in Leeds");
    await notes().nth(0).getByRole("button", { name: copy.save }).click();
    expect(Object.fromEntries((edit.mock.calls[0][0] as FormData).entries())).toEqual({
      id: "3",
      body: "Spoke in Leeds",
    });
    await notes().nth(0).getByRole("button", { name: copy.delete }).click();
    await page.getByRole("button", { name: staffCopy.deleteIt }).click();
    await vi.waitFor(() => expect(remove).toHaveBeenCalled());
    expect((remove.mock.calls[0][0] as FormData).get("id")).toBe("3");
  });

  it("lets an admin delete any note, but edit none of them", async () => {
    await renderNotes(exampleNoteAdmin);
    for (const i of [0, 1, 2])
      await expect.element(notes().nth(i).getByRole("button", { name: copy.delete })).toBeVisible();
    await expect.element(page.getByText(copy.edit, { exact: true })).not.toBeInTheDocument();
  });

  it("says when there are none, and adds one on whom it's about, with what a note should be under the field", async () => {
    const { add } = await renderNotes(exampleNoteWriter, []);
    await expect.element(page.getByText(copy.none)).toBeVisible();
    const field = page.getByRole("textbox", { name: copy.note });
    await expect.element(field).toHaveAccessibleDescription(copy.guidance.supporterId);
    await field.click();
    await userEvent.keyboard("Keen{Shift>}{Enter}{/Shift}to help");
    await page.getByRole("button", { name: copy.add }).click();
    expect(Object.fromEntries((add.mock.calls[0][0] as FormData).entries())).toEqual({
      supporterId: "4",
      body: "Keen\nto help",
    });
  });
});

describe("NoteText", () => {
  it("keeps the lines, in its own class or one given", async () => {
    const { container } = await render(<NoteText body={"One\nTwo"} className="given" />);
    expect(container.querySelector("p.given")?.textContent).toBe("One\nTwo");
  });
});
