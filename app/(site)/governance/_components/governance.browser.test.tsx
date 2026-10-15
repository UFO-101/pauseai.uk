import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { page } from "vitest/browser";
import { board } from "@/lib/content/board";
import BoardSection from "./BoardSection";
import DonationPolicies from "./DonationPolicies";

describe("governance", () => {
  it("introduces each board member, with their website and X account", async () => {
    await render(<BoardSection />);
    for (const member of board) {
      await expect.element(page.getByRole("heading", { name: member.name })).toBeVisible();
      await expect
        .element(page.getByRole("link", { name: `${member.name} website` }))
        .toHaveAttribute("href", member.website);
      await expect.element(page.getByRole("link", { name: `${member.name} on X` })).toHaveAttribute("href", member.x);
    }
  });

  it("sets out the donation policies, linkable from the donate page", async () => {
    const { container } = await render(<DonationPolicies />);
    expect(container.querySelector("#donation-policies h2")?.textContent).toBe("Donation policies");
    await expect.element(page.getByRole("heading", { name: "1. Know Your Donor" })).toBeVisible();
    await expect.element(page.getByRole("heading", { name: "2. Approval by the board" })).toBeVisible();
  });
});
