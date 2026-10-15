import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { page } from "vitest/browser";
import { copy } from "@/lib/content/email-your-mp";
import MpCard from "./MpCard";

const MP = {
  name: "Polly Placeholder",
  salutation: "Ms Placeholder",
  constituency: "Cities of London and Westminster",
  email: "polly.placeholder.mp@parliament.uk",
};

describe("MpCard", () => {
  it("names the MP and their constituency, with their email as a link", async () => {
    await render(<MpCard mp={MP} />);
    await expect.element(page.getByRole("heading", { name: "Polly Placeholder" })).toBeVisible();
    await expect.element(page.getByText(copy.lookup.mpOf(MP.constituency))).toBeVisible();
    await expect.element(page.getByRole("link", { name: MP.email })).toHaveAttribute("href", `mailto:${MP.email}`);
  });

  it("says when there's no email for them", async () => {
    await render(<MpCard mp={{ ...MP, email: null }} />);
    await expect.element(page.getByText(copy.lookup.noEmail)).toBeVisible();
    await expect.element(page.getByRole("link")).not.toBeInTheDocument();
  });
});
