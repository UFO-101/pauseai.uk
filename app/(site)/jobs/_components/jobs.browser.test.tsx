import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { page } from "vitest/browser";
import { APPLY_URL, JobRole, SkillTags } from "./JobRole";
import JobRoles from "./JobRoles";
import JobsArticle from "./JobsArticle";

describe("jobs", () => {
  it("gives open roles an Apply button and closed ones a notice instead", async () => {
    const { container } = await render(
      <>
        <JobRole title="Open role">
          <p>Do things.</p>
        </JobRole>
        <JobRole title="Closed role" closed>
          <p>Did things.</p>
        </JobRole>
      </>,
    );
    const cards = container.querySelectorAll("article");
    expect(cards[0].querySelector("h2")?.textContent).toBe("Open role");
    expect(cards[0].querySelector("a")?.getAttribute("href")).toBe(APPLY_URL);
    expect(cards[1].querySelector("h2")?.textContent).toBe("Closed role [Applications Closed]");
    expect(cards[1].querySelector("a")).toBeNull();
  });

  it("lists skills under a label", async () => {
    await render(<SkillTags label="Essential skills" skills={["One", "Two"]} />);
    await expect.element(page.getByText("Essential skills")).toBeVisible();
    await expect.element(page.getByRole("listitem").nth(1)).toHaveTextContent("Two");
  });

  it("lists every role, each open one with a way to apply", async () => {
    const { container } = await render(<JobRoles />);
    const roles = container.querySelectorAll("article");
    expect(roles.length).toBeGreaterThan(3);
    const closed = [...roles].filter((role) => role.textContent!.includes("[Applications Closed]"));
    expect(page.getByRole("link", { name: "Apply now" }).elements()).toHaveLength(roles.length - closed.length);
    expect(closed.length).toBeGreaterThan(0);
    // A closed role says why, where the salary would come first.
    expect(closed[0].textContent).toContain("Applications for this position are now closed.");
    await expect.element(page.getByRole("heading", { name: "Head of Public Affairs" })).toBeVisible();
  });

  it("frames the roles with who we are and what holds for every role", async () => {
    await render(<JobsArticle />);
    await expect.element(page.getByRole("img", { name: "PauseCon Brussels discussion" })).toBeVisible();
    await expect.element(page.getByText("Important information about all roles:")).toBeVisible();
    await expect.element(page.getByRole("heading", { name: "Head of Public Affairs" })).toBeVisible();
  });
});
