import type { JSONContent } from "@tiptap/react";
import { describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";
import { page, userEvent } from "vitest/browser";
import { staffCopy } from "@/lib/content/staff-interface";
import MailingEditor from "./MailingEditor";

const copy = staffCopy.mailingEditor;

const fields = [
  { id: "salutation", label: "salutation", lacking: 0 },
  { id: "name", label: "name" },
  { id: "constituency", label: "constituency", lacking: 2 },
];
const conditions = [
  {
    id: "frontier-ai-letter:signed",
    label: "signed the Frontier AI letter",
    covers: 12,
    group: "Frontier AI letter",
    option: "Signed",
  },
  { id: "edinburgh:going", label: "are going to Edinburgh", covers: 3, group: "Edinburgh", option: "Going" },
];

const paragraph = (...content: JSONContent[]): JSONContent => ({ type: "paragraph", content });
const text = (value: string): JSONContent => ({ type: "text", text: value });
const field = (id: string): JSONContent => ({ type: "field", attrs: { field: id } });

async function renderEditor(content: JSONContent[], offered = { fields, conditions }, recipients?: number) {
  const onChange = vi.fn<(doc: JSONContent) => void>();
  await render(
    <>
      <p id="label">Letter</p>
      <MailingEditor
        initial={{ type: "doc", content }}
        onChange={onChange}
        fields={offered.fields}
        conditions={offered.conditions}
        recipients={recipients}
        labelledBy="label"
      />
    </>,
  );
  return onChange;
}

const editor = () => page.getByRole("textbox", { name: "Letter" });

/** The last document the editor reported. */
function last(onChange: Awaited<ReturnType<typeof renderEditor>>): JSONContent {
  return onChange.mock.lastCall![0];
}

/**
 * Puts the cursor at the start or end of a line of the letter: clicks it,
 * then presses Home or End until the cursor is there. Under load the
 * editor can take the click after a key, putting the cursor back where it
 * clicked, so one press isn't enough; another does no harm.
 */
async function cursorAt(line: string, end: "start" | "end") {
  await editor().getByText(line).click();
  await expect.element(editor()).toHaveFocus();
  await expect
    .poll(async () => {
      await userEvent.keyboard(end === "start" ? "{Home}" : "{End}");
      const selection = document.getSelection();
      return selection?.anchorNode?.textContent === line ? selection.anchorOffset : -1;
    })
    .toBe(end === "start" ? 0 : line.length);
}

/** Puts the cursor at the end of the letter. */
async function toEnd() {
  await editor().click();
  await userEvent.keyboard("{Control>}{End}{/Control}");
}

describe("MailingEditor", () => {
  it("shows a merge field as a chip by its label, and a part for only some in a box saying who", async () => {
    await renderEditor([
      paragraph(text("Dear "), field("salutation"), text(",")),
      { type: "onlyFor", attrs: { condition: conditions[0].id }, content: [paragraph(text("Thank you."))] },
    ]);
    await expect.element(editor().getByText("salutation", { exact: true })).toBeVisible();
    await expect.element(page.getByText(copy.onlyForLabel(conditions[0].label))).toBeVisible();
  });

  it("shows a field or part no longer offered by its ID", async () => {
    await renderEditor([
      paragraph(field("postcode")),
      { type: "onlyFor", attrs: { condition: "going:old-event" }, content: [paragraph(text("See you."))] },
    ]);
    await expect.element(editor().getByText("postcode", { exact: true })).toBeVisible();
    await expect.element(page.getByText(copy.onlyForLabel("going:old-event"))).toBeVisible();
  });

  it("makes text bold, italic and a bullet point", async () => {
    const onChange = await renderEditor([paragraph(text("Hello"))]);
    await editor().click();
    await userEvent.keyboard("{Control>}a{/Control}");
    for (const name of [copy.bold, copy.italic, copy.bulletList]) {
      await page.getByRole("button", { name }).click();
      await expect.element(page.getByRole("button", { name })).toHaveAttribute("aria-pressed", "true");
    }
    expect(JSON.stringify(last(onChange))).toContain('"bulletList"');
  });

  it("puts a field in at the cursor from its lozenge, but not one some recipients lack", async () => {
    const onChange = await renderEditor([paragraph(text("Dear "))]);
    await toEnd();
    await page.getByRole("button", { name: "name", exact: true }).click();
    expect(last(onChange).content![0].content).toContainEqual(field("name"));
    const ghost = page.getByRole("button", { name: "constituency", exact: true });
    await expect.element(ghost).toHaveAttribute("aria-disabled", "true");
    await expect.element(ghost).toHaveAttribute("title", copy.lacking(2));
    await expect.element(ghost).toHaveAttribute("draggable", "false");
    (ghost.element() as HTMLElement).click();
    expect(JSON.stringify(last(onChange))).not.toContain("constituency");
    await expect
      .element(page.getByRole("button", { name: "salutation", exact: true }))
      .toHaveAttribute("title", copy.dragHint);
  });

  it("makes a paragraph only for some, changes who for, then for everyone again", async () => {
    const onChange = await renderEditor([paragraph(text("Thank you."))]);
    await toEnd();
    const only = page.getByRole("menu", { name: copy.addOnlyFor });
    await page.getByRole("button", { name: copy.addOnlyFor }).click();
    await only.getByRole("menuitem", { name: "Edinburgh" }).click();
    await expect.element(only.getByText("Edinburgh", { exact: true })).toBeVisible();
    await only.getByRole("button", { name: copy.backToAsks }).click();
    await only.getByRole("menuitem", { name: "Frontier AI letter" }).click();
    const signed = only.getByRole("menuitem", { name: /Signed/ });
    await expect.element(signed.getByText(copy.covers(12), { exact: true })).toBeVisible();
    await signed.click();
    expect(document.querySelector(":popover-open")).toBeNull();
    expect(last(onChange).content![0]).toMatchObject({ type: "onlyFor", attrs: { condition: conditions[0].id } });
    await page.getByRole("button", { name: copy.except }).click();
    const except = page.getByRole("menu", { name: copy.except });
    await except.getByRole("menuitem", { name: "Edinburgh" }).click();
    await except.getByRole("menuitem", { name: /Going/ }).click();
    expect(last(onChange).content![0]).toMatchObject({ type: "onlyFor", attrs: { condition: `!${conditions[1].id}` } });
    await page.getByRole("button", { name: copy.forEveryone }).click();
    expect(last(onChange).content![0]).toMatchObject({ type: "paragraph" });
  });

  it("counts those an except part leaves in, out of the recipients", async () => {
    await renderEditor([paragraph(text("Thank you."))], { fields, conditions }, 20);
    await page.getByRole("button", { name: copy.except }).click();
    const except = page.getByRole("menu", { name: copy.except });
    await except.getByRole("menuitem", { name: "Frontier AI letter" }).click();
    await expect
      .element(except.getByRole("menuitem", { name: /Signed/ }).getByText(copy.covers(8), { exact: true }))
      .toBeVisible();
  });

  it("puts a field in from its lozenge by Enter or space, and not by other keys", async () => {
    const onChange = await renderEditor([paragraph(text("Dear "))]);
    await toEnd();
    const name = page.getByRole("button", { name: "name", exact: true }).element() as HTMLElement;
    name.focus();
    await userEvent.keyboard("a");
    expect(onChange).not.toHaveBeenCalled();
    await userEvent.keyboard("{Enter}");
    expect(last(onChange).content![0].content).toEqual([text("Dear "), field("name")]);
    name.focus();
    await userEvent.keyboard(" ");
    expect(last(onChange).content![0].content).toEqual([text("Dear "), field("name"), field("name")]);
  });

  it("drags a field in as the editor reads it", async () => {
    await renderEditor([paragraph(text("Dear "))]);
    const button = page.getByRole("button", { name: "name", exact: true });
    await expect.element(button).toBeVisible();
    const dragged = new DataTransfer();
    button.element().dispatchEvent(new DragEvent("dragstart", { dataTransfer: dragged, bubbles: true }));
    expect(dragged.getData("text/html")).toBe('<span data-field="name">name</span>');
    expect(dragged.getData("text/plain")).toBe("name");
  });

  it("says when no recipient has answered an ask, and types { when no field can be used", async () => {
    const onChange = await renderEditor([paragraph(text("Dear"))], { fields: [fields[2]], conditions: [] });
    await expect.element(page.getByText(copy.noConditions)).toBeVisible();
    await toEnd();
    await userEvent.keyboard("{{");
    await expect.element(page.getByRole("menu")).not.toBeInTheDocument();
    expect(last(onChange).content![0].content).toEqual([text("Dear{")]);
  });

  it("offers the fields when { is typed, and puts the one picked where it was typed", async () => {
    const onChange = await renderEditor([paragraph(text("Dear "))]);
    await toEnd();
    await userEvent.keyboard("{{");
    const menu = page.getByRole("menu", { name: copy.pickField });
    await expect.element(menu.getByRole("menuitem", { name: "salutation" })).toHaveFocus();
    await menu.getByRole("menuitem", { name: "salutation" }).click();
    await expect.element(menu).not.toBeInTheDocument();
    expect(last(onChange).content![0].content).toEqual([text("Dear "), field("salutation")]);
  });

  it("moves through the menu of fields every recipient has with the arrow keys, round from either end", async () => {
    const onChange = await renderEditor([paragraph(text("Dear "))]);
    await toEnd();
    await userEvent.keyboard("{{");
    const menu = page.getByRole("menu", { name: copy.pickField });
    await expect.element(menu.getByRole("menuitem", { name: "salutation" })).toHaveFocus();
    await userEvent.keyboard("{ArrowDown}");
    await expect.element(menu.getByRole("menuitem", { name: "name" })).toHaveFocus();
    await userEvent.keyboard("{ArrowDown}");
    await expect.element(menu.getByRole("menuitem", { name: "salutation" })).toHaveFocus();
    await userEvent.keyboard("{ArrowUp}");
    await expect.element(menu.getByRole("menuitem", { name: "name" })).toHaveFocus();
    await userEvent.keyboard("x");
    await expect.element(menu.getByRole("menuitem", { name: "name" })).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    expect(last(onChange).content![0].content).toEqual([text("Dear "), field("name")]);
  });

  describe("Backspace and a part for only some", () => {
    const box = (condition: string, ...content: JSONContent[]): JSONContent => ({
      type: "onlyFor",
      attrs: { condition },
      content,
    });

    it("at the start of a box, takes its text out rather than into a box just before it", async () => {
      const onChange = await renderEditor([
        box(conditions[0].id, paragraph(text("Thanks."))),
        box("going:edinburgh", paragraph(text("See you there."))),
      ]);
      await cursorAt("See you there.", "start");
      await userEvent.keyboard("{Backspace}");
      expect(last(onChange).content).toEqual([
        box(conditions[0].id, paragraph(text("Thanks."))),
        paragraph(text("See you there.")),
      ]);
    });

    it("inside a box, deletes as anywhere else: a letter, a selection, or the break before a second line", async () => {
      const onChange = await renderEditor([box(conditions[0].id, paragraph(text("One")), paragraph(text("Two")))]);
      await cursorAt("Two", "end");
      await userEvent.keyboard("{Backspace}");
      expect(last(onChange).content).toEqual([box(conditions[0].id, paragraph(text("One")), paragraph(text("Tw")))]);
      await userEvent.keyboard("{Shift>}{Home}{/Shift}");
      await userEvent.keyboard("{Backspace}");
      expect(last(onChange).content).toEqual([box(conditions[0].id, paragraph(text("One")), { type: "paragraph" })]);
      await userEvent.keyboard("{Backspace}");
      expect(last(onChange).content).toEqual([box(conditions[0].id, paragraph(text("One")))]);
    });

    it("at the start of a line in no box, joins it to the line before", async () => {
      const onChange = await renderEditor([paragraph(text("One")), paragraph(text("Two"))]);
      await cursorAt("Two", "start");
      await userEvent.keyboard("{Backspace}");
      expect(last(onChange).content).toEqual([paragraph(text("OneTwo"))]);
    });
  });

  it("closes the menu of fields on Escape, typing no {", async () => {
    const onChange = await renderEditor([paragraph(text("Dear"))]);
    await toEnd();
    await userEvent.keyboard("{{");
    await userEvent.keyboard("{Escape}");
    await expect.element(page.getByRole("menu")).not.toBeInTheDocument();
    await expect.element(editor()).toHaveFocus();
    await userEvent.keyboard("!");
    expect(last(onChange).content![0].content).toEqual([text("Dear!")]);
  });

  it("reads fields and parts pasted in, and copies a field as its label", async () => {
    const onChange = await renderEditor([paragraph(text("Start"))]);
    await toEnd();
    const pasted = new DataTransfer();
    pasted.setData(
      "text/html",
      '<p>Hi <span data-field="name">name</span></p><div data-condition="signed:frontier-ai-letter"><p>label</p><div data-body><p>Thanks.</p></div></div>',
    );
    editor()
      .element()
      .dispatchEvent(new ClipboardEvent("paste", { clipboardData: pasted, bubbles: true }));
    const doc = JSON.stringify(last(onChange));
    expect(doc).toContain('{"type":"field","attrs":{"field":"name"}}');
    expect(doc).toContain('"condition":"signed:frontier-ai-letter"');

    await userEvent.keyboard("{Control>}a{/Control}");
    const copied = new DataTransfer();
    editor()
      .element()
      .dispatchEvent(new ClipboardEvent("copy", { clipboardData: copied, bubbles: true }));
    expect(copied.getData("text/plain")).toContain("Hi name");
  });
});
