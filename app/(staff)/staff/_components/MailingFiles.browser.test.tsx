import { describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";
import { page } from "vitest/browser";
import { staffCopy } from "@/lib/content/staff-interface";
import MailingFiles from "./MailingFiles";

const copy = staffCopy.mailingPages;

// A real PDF the test server serves; the file's ID goes after the "?", which it ignores.
const PDF_BASE = "/public/pdfs/Frontier-AI-Open-Letter.pdf?";
const PDF = { id: 1, filename: "letter.pdf", contentType: "application/pdf", size: 2048 };

describe("MailingFiles", () => {
  it("draws a PDF's first page, a card's width", async () => {
    await render(<MailingFiles files={[PDF]} base={PDF_BASE} />);
    const canvas = () => document.querySelector("canvas");
    await expect.poll(() => canvas()?.width, { timeout: 10_000 }).toBe(180);
    expect(canvas()!.height).toBeGreaterThan(0);
  });

  it("stops drawing a PDF that's gone before it's loaded", async () => {
    const view = await render(<MailingFiles files={[PDF]} base={PDF_BASE} />);
    await view.unmount();
    await new Promise((resolve) => setTimeout(resolve, 1000));
    expect(document.querySelector("canvas")).toBeNull();
  });

  it("says ? for the kind of a file whose name has no end, and for an image that can't be shown", async () => {
    await render(
      <MailingFiles
        files={[
          { id: 2, filename: "README", contentType: "application/octet-stream", size: 800 },
          { id: 3, filename: "photo", contentType: "image/png", size: 800 },
        ]}
        base="/nowhere"
      />,
    );
    await expect.element(page.getByText("? · 800 BYTES").first()).toBeVisible();
    await expect.poll(() => document.querySelectorAll("img").length).toBe(0);
    expect([...document.querySelectorAll("[aria-hidden=true]")].filter((e) => e.textContent === "?")).toHaveLength(2);
  });

  it("opens the file picker from Add files", async () => {
    const click = vi.spyOn(HTMLInputElement.prototype, "click").mockImplementation(() => {});
    await render(<MailingFiles files={[]} base="/nowhere" onAdd={() => {}} />);
    await page.getByRole("button", { name: copy.addFiles }).click();
    expect(click).toHaveBeenCalledTimes(1);
    click.mockRestore();
  });
});
