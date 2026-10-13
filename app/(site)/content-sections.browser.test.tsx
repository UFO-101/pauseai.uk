import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { page } from "vitest/browser";
import { allCoverage, formatCoverageDate } from "@/lib/content/press-coverage";
import { site } from "@/lib/content/site";
import PressKit from "./press/_components/PressKit";
import PrivacyPolicy from "./privacy/_components/PrivacyPolicy";
import ChangeSteps from "./theory-of-change/_components/ChangeSteps";
import Closing from "./theory-of-change/_components/Closing";
import Foreword from "./theory-of-change/_components/Foreword";
import About from "./what-is-pauseai-uk/_components/About";

// Pages that are mostly prose: each section renders its headings and links.
describe("content sections", () => {
  it("press: contact, boilerplate, brand assets and every piece of coverage", async () => {
    const { container } = await render(<PressKit />);
    await expect.element(page.getByRole("heading", { name: "Media contact" })).toBeVisible();
    await expect.element(page.getByRole("link", { name: site.pressEmail }).first()).toHaveAttribute("href", `mailto:${site.pressEmail}`);
    expect(container.textContent).toContain(formatCoverageDate(allCoverage[0].date));
    expect(container.textContent).toContain(allCoverage[allCoverage.length - 1].title);
  });

  it("privacy policy", async () => {
    await render(<PrivacyPolicy />);
    await expect.element(page.getByRole("heading", { name: "Your rights" })).toBeVisible();
    await expect.element(page.getByRole("heading", { name: "Cookies" })).toBeVisible();
  });

  it("theory of change", async () => {
    await render(
      <>
        <Foreword />
        <ChangeSteps />
        <Closing />
      </>,
    );
    await expect.element(page.getByRole("heading", { name: "Long-term goals" })).toBeVisible();
    await expect.element(page.getByRole("heading", { name: "Why the UK?" })).toBeVisible();
  });

  it("what is PauseAI UK", async () => {
    await render(<About />);
    await expect.element(page.getByRole("link", { name: "PauseAI Code of Conduct" })).toHaveAttribute("href", "https://pauseai.info/code-of-conduct");
  });
});
