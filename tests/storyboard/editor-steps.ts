// Writing in the letter's editor, as a person does, for the flows that
// edit a letter (campaigns, replies).
import type { Page } from "@playwright/test";
import { copy } from "@/lib/content/email-your-mp";
import { expect } from "./fixtures";

/** The letter's editor: the text box Tiptap draws, labelled by the form's "Message". */
export const editor = (page: Page) => page.getByRole("textbox", { name: copy.form.letterLabel, exact: true });

/** The editor's element: Tiptap puts the editor on it, and so where it has the caret. */
type TiptapElement = HTMLElement & {
  editor: {
    state: { selection: { $to: { parentOffset: number; parent: { textContent: string; content: { size: number } } } } };
  };
};

/**
 * Waits for the editor to have the caret at the start or end of the
 * paragraph that reads `text`. It reads where the caret went a moment after
 * a click or an arrow key, and a key pressed before then lands where the
 * caret was. No person types that fast.
 */
async function caretSettled(page: Page, text: string, at?: "start" | "end") {
  await expect
    .poll(() =>
      editor(page).evaluate(
        (el, { text, at }) => {
          const { $to } = (el as TiptapElement).editor.state.selection;
          const offset = at === undefined || $to.parentOffset === (at === "start" ? 0 : $to.parent.content.size);
          return $to.parent.textContent === text && offset;
        },
        { text, at },
      ),
    )
    .toBe(true);
}

/**
 * Gives the editor focus, and waits out what ProseMirror does then: 20ms
 * later, it puts its own caret back unless it has seen where the browser's
 * went (prosemirror-view's handlers.focus). On a busy machine, a click that
 * focuses the editor can lose its caret to that, and land at the letter's
 * start. A timer due after ProseMirror's runs after it.
 */
async function focusEditor(page: Page) {
  await editor(page).focus();
  await editor(page).evaluate(() => new Promise((done) => setTimeout(done, 25)));
}

/**
 * Puts the caret at the start or end of the letter's paragraph that reads
 * `text`: a click in it, and once the caret is there, Home or End.
 */
export async function caretAt(page: Page, text: string, at: "start" | "end") {
  await focusEditor(page);
  await editor(page).getByText(text, { exact: true }).click();
  await caretSettled(page, text);
  await page.keyboard.press(at === "start" ? "Home" : "End");
  await caretSettled(page, text, at);
}

/** Opens a new paragraph above the sign-off, as someone adding to the letter would, with the caret in it. */
export async function newParagraphAboveSignOff(page: Page) {
  await caretAt(page, "Thank you for your consideration,", "start");
  await page.keyboard.press("Enter");
  await page.keyboard.press("ArrowUp");
  await caretSettled(page, "", "start");
}

/** Clicks a toolbar button, then waits for the editor to take focus back, a frame later, as Tiptap gives it. */
export async function toolbar(page: Page, name: string) {
  await page.getByRole("button", { name, exact: true }).click();
  await expect(editor(page)).toBeFocused();
}

/** Pastes `html` into the editor, as a browser does from another app's clipboard. */
export async function paste(page: Page, html: string, text: string) {
  await editor(page).evaluate(
    (el, { html, text }) => {
      const data = new DataTransfer();
      data.setData("text/html", html);
      data.setData("text/plain", text);
      el.dispatchEvent(new ClipboardEvent("paste", { clipboardData: data, bubbles: true, cancelable: true }));
    },
    { html, text },
  );
}
