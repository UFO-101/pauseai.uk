import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";
import { page } from "vitest/browser";
import { site } from "@/lib/content/site";
import Signatories from "./Signatories";
import SignatoriesList from "./SignatoriesList";

afterEach(() => vi.restoreAllMocks());

describe("Signatories", () => {
  it("lists the signatories, with a note for journalists", async () => {
    vi.spyOn(window, "fetch").mockResolvedValue(new Response("[]"));
    await render(<Signatories />);
    await expect.element(page.getByText("No signatories yet.")).toBeVisible();
    await expect
      .element(page.getByRole("link", { name: site.pressEmail }))
      .toHaveAttribute("href", `mailto:${site.pressEmail}`);
  });
});

describe("SignatoriesList", () => {
  const respond = (body: unknown, status = 200) =>
    vi.spyOn(window, "fetch").mockResolvedValue(new Response(JSON.stringify(body), { status }));

  it("says it is loading, then lists each house separately", async () => {
    respond([
      { name: "Jane MP", party: "Labour", constituency: "Somewhere", house: "commons" },
      { name: "Sam MP", party: "", constituency: "Elsewhere", house: "commons" },
      { name: "Lord Example", party: "Crossbench", constituency: "", house: "lords" },
      { name: "Baroness Plain", party: "", constituency: "", house: "lords" },
      { name: "Jo MSP", party: "SNP", constituency: "Glasgow Kelvin", house: "scottish-parliament" },
    ]);
    const { container } = await render(<SignatoriesList />);
    expect(container.textContent).toBe("Loading signatories…");
    await expect.element(page.getByRole("heading", { name: "MPs" })).toBeVisible();
    await expect.element(page.getByRole("heading", { name: "Lords" })).toBeVisible();
    await expect.element(page.getByText("MP for Somewhere, Labour")).toBeVisible();
    await expect.element(page.getByText("MP for Elsewhere")).toBeVisible();
    await expect.element(page.getByText("Crossbench")).toBeVisible();
    // Signers outside Westminster show where they sit, without "MP for".
    await expect.element(page.getByText("Glasgow Kelvin, SNP")).toBeVisible();
    expect(container.querySelectorAll(".signatories-group h3")).toHaveLength(3);
    // A Lord with no party has no subtitle.
    const plain = [...container.querySelectorAll(".signatories-item")].find(
      (li) => li.textContent === "Baroness Plain",
    );
    expect(plain?.querySelector(".signatories-subtitle")).toBeNull();
  });

  it("leaves out an empty group", async () => {
    respond([{ name: "Lord Only", party: "Crossbench", constituency: "", house: "lords" }]);
    await render(<SignatoriesList />);
    await expect.element(page.getByRole("heading", { name: "Lords" })).toBeVisible();
    expect(document.querySelector(".signatories-group h3")?.textContent).toBe("Lords");
    respond([{ name: "MP Only", party: "Green", constituency: "Here", house: "commons" }]);
    const second = await render(<SignatoriesList />);
    await expect.poll(() => second.container.querySelector("h3")?.textContent).toBe("MPs");
  });

  it("says so when the list can't be loaded", async () => {
    respond({ error: "nope" }, 502);
    await render(<SignatoriesList />);
    await expect.element(page.getByText("Couldn't load signatories right now — try refreshing.")).toBeVisible();
  });
});
