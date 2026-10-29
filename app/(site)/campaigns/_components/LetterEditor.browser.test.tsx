import { describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";
import { page, userEvent } from "vitest/browser";
import { copy } from "@/lib/content/email-your-mp";
import type { LetterDoc } from "@/lib/letter-format";
import LetterEditor from "./LetterEditor";

const words = copy.editor;

async function renderEditor() {
  const onChange = vi.fn<(doc: LetterDoc) => void>();
  await render(
    <>
      <p id="label">Letter</p>
      <p id="hint">Hint</p>
      <LetterEditor
        initial={{ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Dear MP" }] }] }}
        onChange={onChange}
        labelledBy="label"
        describedBy="hint"
      />
    </>,
  );
  return { onChange, last: () => onChange.mock.lastCall![0] };
}

const letter = () => page.getByRole("textbox", { name: "Letter" });

describe("LetterEditor", () => {
  it("links the text selected from Link, changes it from Ctrl+K, and quotes it", async () => {
    const { last } = await renderEditor();
    await letter().click();
    await userEvent.keyboard("{Control>}a{/Control}");
    await page.getByRole("button", { name: words.link }).click();
    await userEvent.keyboard("pauseai.uk{Enter}");
    await expect.element(page.getByRole("button", { name: words.link })).toHaveAttribute("aria-pressed", "true");
    expect(JSON.stringify(last())).toContain('"href":"https://pauseai.uk/"');
    await userEvent.keyboard("{Control>}k{/Control}");
    await page.getByRole("textbox", { name: words.linkBar.address }).fill("pauseai.uk/join");
    await page.getByRole("button", { name: words.linkBar.save }).click();
    expect(JSON.stringify(last())).toContain('"href":"https://pauseai.uk/join"');
    // Other keys with Ctrl are the editor's.
    await userEvent.keyboard("{Control>}i{/Control}");
    await expect.element(page.getByRole("textbox", { name: words.linkBar.address })).not.toBeInTheDocument();
    await page.getByRole("button", { name: words.quote }).click();
    await expect.element(page.getByRole("button", { name: words.quote })).toHaveAttribute("aria-pressed", "true");
    expect(last().content[0].type).toBe("blockquote");
  });
});
