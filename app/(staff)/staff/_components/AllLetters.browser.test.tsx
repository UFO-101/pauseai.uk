import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { page } from "vitest/browser";
import { staffCopy } from "@/lib/content/staff-interface";
import type { AnyLetter } from "@/lib/server/all-letters";
import AllLetters from "./AllLetters";

const copy = staffCopy.allLetters;

const SUPPORTER: AnyLetter = {
  id: 1,
  kind: "supporter",
  status: "sent",
  sentAt: "2026-10-20T10:00:00Z",
  repliedAt: "2026-10-21T10:00:00Z",
  mpName: "Polly Placeholder",
  politicianId: 4,
  senderName: "Jane Smith",
  senderEmail: "jane.smith@example.com",
  supporterId: 9,
  campaign: "regulate-letter-pm",
  campaignTitle: "Regulate AI",
};
const PAUSEAI: AnyLetter = {
  id: 2,
  kind: "pauseai",
  status: "other",
  sentAt: null,
  repliedAt: null,
  mpName: "Peter Placeholder",
  politicianId: 5,
  mailingId: 3,
  mailingTitle: "About the march",
};
const SEARCH = { q: "", from: "", sent: "", replied: "", page: "" };
const link = (name: string) => page.getByRole("link", { name });

describe("AllLetters", () => {
  it("lists a supporter's letter and PauseAI's, each leading to its own pages", async () => {
    await render(<AllLetters found={{ letters: [SUPPORTER, PAUSEAI], total: 2, pages: 1 }} search={SEARCH} />);
    await expect.element(page.getByRole("heading", { level: 1 })).toHaveTextContent(copy.title);
    const rows = page.getByRole("row");
    await expect
      .element(rows.nth(1).getByRole("link", { name: staffCopy.mailingPages.theLetter }))
      .toHaveAttribute("href", "/staff/letters/1");
    await expect
      .element(rows.nth(2).getByRole("link", { name: staffCopy.mailingPages.theLetter }))
      .toHaveAttribute("href", "/staff/mailings/3/letters/2");
    await expect.element(link("Jane Smith")).toHaveAttribute("href", "/staff/supporters/9");
    await expect.element(link("About the march")).toHaveAttribute("href", "/staff/mailings/3");
    const pauseai = rows.nth(2).element().textContent;
    expect(pauseai).toContain(staffCopy.letters.fromPauseai);
    // A status with no words of its own shows as stored; nothing sent or replied, a dash.
    expect(pauseai).toContain("other");
    expect(pauseai).toContain("–");
  });

  it("names a sender with no supporter without a link, and keeps the filters across pages", async () => {
    await render(
      <AllLetters
        found={{ letters: [{ ...SUPPORTER, supporterId: null }], total: 150, pages: 2 }}
        search={{ ...SEARCH, sent: "30", page: "1" }}
      />,
    );
    await expect.element(page.getByText("Jane Smith")).toBeVisible();
    await expect.element(link("Jane Smith")).not.toBeInTheDocument();
    await expect
      .element(page.getByRole("link", { name: staffCopy.paging.next }))
      .toHaveAttribute("href", "/staff/letters/all?sent=30&page=2");
  });

  it("says when none are found, and has no first page number set", async () => {
    await render(<AllLetters found={{ letters: [], total: 0, pages: 1 }} search={SEARCH} />);
    await expect.element(page.getByText(copy.noneFound)).toBeVisible();
  });
});
