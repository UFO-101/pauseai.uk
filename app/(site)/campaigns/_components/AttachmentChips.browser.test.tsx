import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { page } from "vitest/browser";
import { campaigns } from "@/lib/content/email-your-mp";
import AttachmentChips from "./AttachmentChips";

describe("AttachmentChips", () => {
  it("shows each attachment's first page, title and file name, opening the PDF in a new tab", async () => {
    const { attachments } = campaigns[0];
    const { container } = await render(<AttachmentChips attachments={attachments} label="Attachments" />);
    await expect.element(page.getByRole("list", { name: "Attachments" })).toBeVisible();
    for (const attachment of attachments) {
      const name = `${attachment.title} ${attachment.subtitle} ${attachment.file}`;
      const link = page.getByRole("link", { name, exact: true });
      await expect.element(link).toHaveAttribute("href", `/pdfs/${attachment.file}`);
      await expect.element(link).toHaveAttribute("target", "_blank");
    }
    const thumbnails = [...container.querySelectorAll("img")].map((img) => img.getAttribute("src"));
    expect(thumbnails).toHaveLength(attachments.length);
    attachments.forEach((attachment, i) =>
      expect(thumbnails[i]).toContain(encodeURIComponent(`/pdfs/${attachment.thumbnail}`)),
    );
  });
});
