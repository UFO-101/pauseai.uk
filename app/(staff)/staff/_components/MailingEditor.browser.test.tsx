import type { JSONContent } from "@tiptap/react";
import { describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";
import { page, userEvent } from "vitest/browser";
import { staffCopy } from "@/lib/content/staff-interface";
import MailingEditor from "./MailingEditor";

const copy = staffCopy.mailingEditor;

const fields = [
  { id: "salutation", label: "salutation" },
  { id: "name", label: "name" },
];
const conditions = [{ id: "signed:frontier-ai-letter", label: "signed the Frontier AI letter" }];

const paragraph = (...content: JSONContent[]): JSONContent => ({ type: "paragraph", content });
const text = (value: string): JSONContent => ({ type: "text", text: value });
const field = (id: string): JSONContent => ({ type: "field", attrs: { field: id } });

function renderEditor(content: JSONContent[]) {
  const onChange = vi.fn<(doc: JSONContent) => void>();
  render(
    <>
      <p id="label">Letter</p>
      <MailingEditor
        initial={{ type: "doc", content }}
        onChange={onChange}
        fields={fields}
        conditions={conditions}
        labelledBy="label"
      />
    </>,
  );
  return onChange;
}

const editor = () => page.getByRole("textbox", { name: "Letter" });

/** The last document the editor reported. */
function last(onChange: ReturnType<typeof renderEditor>): JSONContent {
  return onChange.mock.lastCall![0];
}

/** Puts the cursor at the end of the letter. */
async function toEnd() {
  await editor().click();
  await userEvent.keyboard("{Control>}{End}{/Control}");
}

describe("MailingEditor", () => {
  it("shows a merge field as a chip by its label, and a part for only some in a box saying who", async () => {
    renderEditor([
      paragraph(text("Dear "), field("salutation"), text(",")),
      { type: "onlyFor", attrs: { condition: conditions[0].id }, content: [paragraph(text("Thank you."))] },
    ]);
    await expect.element(editor().getByText("salutation", { exact: true })).toBeVisible();
    await expect.element(page.getByText(copy.onlyForLabel(conditions[0].label))).toBeVisible();
  });

  it("shows a field or part no longer offered by its ID", async () => {
    renderEditor([
      paragraph(field("postcode")),
      { type: "onlyFor", attrs: { condition: "going:old-event" }, content: [paragraph(text("See you."))] },
    ]);
    await expect.element(editor().getByText("postcode", { exact: true })).toBeVisible();
    await expect.element(page.getByText(copy.onlyForLabel("going:old-event"))).toBeVisible();
  });

  it("makes text bold, italic and a bullet point", async () => {
    const onChange = renderEditor([paragraph(text("Hello"))]);
    await editor().click();
    await userEvent.keyboard("{Control>}a{/Control}");
    for (const name of [copy.bold, copy.italic, copy.bulletList]) {
      await page.getByRole("button", { name }).click();
      await expect.element(page.getByRole("button", { name })).toHaveAttribute("aria-pressed", "true");
    }
    expect(JSON.stringify(last(onChange))).toContain('"bulletList"');
  });

  it("puts a field in at the cursor from its button", async () => {
    const onChange = renderEditor([paragraph(text("Dear "))]);
    await toEnd();
    await page.getByRole("button", { name: "name", exact: true }).click();
    expect(last(onChange).content![0].content).toContainEqual(field("name"));
  });

  it("makes a paragraph only for some, then for everyone again", async () => {
    const onChange = renderEditor([paragraph(text("Thank you."))]);
    await toEnd();
    await page.getByRole("combobox", { name: copy.onlyFor }).selectOptions(conditions[0].id);
    expect(last(onChange).content![0]).toMatchObject({ type: "onlyFor", attrs: { condition: conditions[0].id } });
    await page.getByRole("button", { name: copy.forEveryone }).click();
    expect(last(onChange).content![0]).toMatchObject({ type: "paragraph" });
  });

  it("offers the fields when { is typed, and puts the one picked where it was typed", async () => {
    const onChange = renderEditor([paragraph(text("Dear "))]);
    await toEnd();
    await userEvent.keyboard("{{");
    const menu = page.getByRole("menu", { name: copy.pickField });
    await expect.element(menu.getByRole("menuitem", { name: "salutation" })).toHaveFocus();
    await userEvent.keyboard("{ArrowDown}");
    await expect.element(menu).toBeVisible();
    await menu.getByRole("menuitem", { name: "salutation" }).click();
    await expect.element(menu).not.toBeInTheDocument();
    expect(last(onChange).content![0].content).toEqual([text("Dear "), field("salutation")]);
  });

  it("closes the menu of fields on Escape, typing no {", async () => {
    const onChange = renderEditor([paragraph(text("Dear"))]);
    await toEnd();
    await userEvent.keyboard("{{");
    await userEvent.keyboard("{Escape}");
    await expect.element(page.getByRole("menu")).not.toBeInTheDocument();
    await expect.element(editor()).toHaveFocus();
    await userEvent.keyboard("!");
    expect(last(onChange).content![0].content).toEqual([text("Dear!")]);
  });

  it("reads fields and parts pasted in, and copies a field as its label", async () => {
    const onChange = renderEditor([paragraph(text("Start"))]);
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
