import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { page } from "vitest/browser";
import { campaigns } from "@/lib/content/email-your-mp";
import AttachmentChips from "./AttachmentChips";

describe("AttachmentChips", () => {
  it("lists each attachment by its file name, opening the PDF in a new tab", async () => {
    const { attachments } = campaigns[0];
    await render(<AttachmentChips attachments={attachments} label="Attachments" />);
    await expect.element(page.getByRole("list", { name: "Attachments" })).toBeVisible();
    for (const attachment of attachments) {
      const link = page.getByRole("link", { name: attachment.file, exact: true });
      await expect.element(link).toHaveAttribute("href", `/pdfs/${attachment.file}`);
      await expect.element(link).toHaveAttribute("target", "_blank");
    }
  });
});
