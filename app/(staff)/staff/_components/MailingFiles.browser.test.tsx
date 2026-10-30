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

  it("shows Add files pending while the files chosen are added", async () => {
    let finish = () => {};
    const onAdd = vi.fn<(files: File[]) => Promise<void>>(() => new Promise((resolve) => (finish = resolve)));
    const { container } = await render(<MailingFiles files={[]} base="/nowhere" onAdd={onAdd} />);
    const picker = container.querySelector<HTMLInputElement>("input[type=file]")!;
    const chosen = new DataTransfer();
    chosen.items.add(new File(["x"], "a.txt"));
    picker.files = chosen.files;
    picker.dispatchEvent(new Event("change", { bubbles: true }));
    const add = page.getByRole("button", { name: copy.addFiles });
    await expect.element(add).toHaveAttribute("aria-busy", "true");
    expect(onAdd.mock.calls[0][0].map((file) => file.name)).toEqual(["a.txt"]);
    finish();
    await expect.element(add).not.toHaveAttribute("aria-busy");
  });

  it("disables a file's × while it's removed, marked for the line along the top", async () => {
    let finish = () => {};
    const onRemove = vi.fn(() => new Promise<void>((resolve) => (finish = resolve)));
    await render(<MailingFiles files={[PDF]} base={PDF_BASE} onRemove={onRemove} />);
    const remove = page.getByRole("button", { name: copy.removeFile(PDF.filename) });
    await remove.click();
    await expect.element(remove).toBeDisabled();
    await expect.element(remove).toHaveAttribute("data-pending", "true");
    expect(onRemove).toHaveBeenCalledWith(PDF.id);
    finish();
    await expect.element(remove).toBeEnabled();
    await expect.element(remove).not.toHaveAttribute("data-pending");
  });
});
