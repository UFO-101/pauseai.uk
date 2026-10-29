import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { page, userEvent } from "vitest/browser";
import { letterExtensions } from "@/lib/letter-extensions";
import LinkBar from "./LinkBar";

const WORDS = { address: "Address", save: "Save", remove: "Remove", cancel: "Cancel", invalid: "Not an address" };

let current: Editor;

/** A letter editor with a button that opens the bar, as the editors' Link does. */
function Harness({ content }: { content: string }) {
  const editor = useEditor({
    extensions: letterExtensions,
    content,
    immediatelyRender: false,
    editorProps: { attributes: { role: "textbox", "aria-label": "Letter" } },
    onCreate: ({ editor }) => void (current = editor),
  });
  const [open, setOpen] = useState(false);
  if (!editor) return null;
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Link
      </button>
      {open && <LinkBar editor={editor} words={WORDS} onClose={() => setOpen(false)} />}
      <EditorContent editor={editor} />
    </>
  );
}

const letter = () => page.getByRole("textbox", { name: "Letter" });
const address = () => page.getByRole("textbox", { name: WORDS.address });
/** The first paragraph's text nodes, as the editor holds them. */
const nodes = () => current.getJSON().content![0].content;

async function open() {
  await page.getByRole("button", { name: "Link" }).click();
  await expect.element(address()).toHaveFocus();
}

describe("LinkBar", () => {
  it("links the text selected, writing the address out in full, and goes back to the letter", async () => {
    await render(<Harness content="<p>Read this</p>" />);
    await letter().click();
    await userEvent.keyboard("{Control>}a{/Control}");
    await open();
    await expect.element(page.getByRole("button", { name: WORDS.remove })).not.toBeInTheDocument();
    await userEvent.keyboard("pauseai.uk/join{Enter}");
    await expect.element(address()).not.toBeInTheDocument();
    await expect.element(letter()).toHaveFocus();
    expect(nodes()).toMatchObject([
      { text: "Read this", marks: [{ type: "link", attrs: { href: "https://pauseai.uk/join" } }] },
    ]);
  });

  it("changes the link at the cursor, or removes it", async () => {
    await render(<Harness content='<p>See <a href="https://a.org/">site</a></p>' />);
    await letter().getByText("site").click();
    await open();
    await expect.element(address()).toHaveValue("https://a.org/");
    await address().fill("b.org");
    await page.getByRole("button", { name: WORDS.save }).click();
    expect(nodes()).toMatchObject([{ text: "See " }, { text: "site", marks: [{ attrs: { href: "https://b.org/" } }] }]);
    await letter().getByText("site").click();
    await open();
    await page.getByRole("button", { name: WORDS.remove }).click();
    expect(nodes()).toEqual([{ type: "text", text: "See site" }]);
  });

  it("puts in an address with nothing selected as a link to itself", async () => {
    await render(<Harness content="<p>Write to:</p>" />);
    await letter().click();
    await userEvent.keyboard("{End}");
    await open();
    await address().fill(" policy@pauseai.uk ");
    await page.getByRole("button", { name: WORDS.save }).click();
    expect(nodes()).toMatchObject([
      { text: "Write to:" },
      { text: "policy@pauseai.uk", marks: [{ attrs: { href: "mailto:policy@pauseai.uk" } }] },
    ]);
  });

  it("says when what's typed isn't an address, until it's changed; Escape or Cancel close it, changing nothing", async () => {
    await render(<Harness content="<p>Read this</p>" />);
    await letter().click();
    await userEvent.keyboard("{Control>}a{/Control}");
    await open();
    await userEvent.keyboard("hello{Enter}");
    await expect.element(page.getByText(WORDS.invalid)).toBeVisible();
    await expect.element(address()).toHaveAttribute("aria-invalid", "true");
    await expect.element(address()).toHaveAccessibleDescription(WORDS.invalid);
    await userEvent.keyboard("x");
    await expect.element(page.getByText(WORDS.invalid)).not.toBeInTheDocument();
    await userEvent.keyboard("{Escape}");
    await expect.element(address()).not.toBeInTheDocument();
    await expect.element(letter()).toHaveFocus();
    await open();
    await userEvent.keyboard("a");
    await page.getByRole("button", { name: WORDS.cancel }).click();
    await expect.element(address()).not.toBeInTheDocument();
    expect(nodes()).toEqual([{ type: "text", text: "Read this" }]);
  });
});
