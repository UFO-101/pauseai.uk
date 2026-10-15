import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { page } from "vitest/browser";
import { APPLY_URL, JobRole, SkillTags } from "./JobRole";
import JobRoles from "./JobRoles";

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
    const cards = container.querySelectorAll(".jobs-role-card");
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
    const roles = container.querySelectorAll(".jobs-role-card");
    expect(roles.length).toBeGreaterThan(3);
    expect(container.querySelectorAll(".jobs-card-apply").length).toBe(
      roles.length - container.querySelectorAll(".jobs-closed-tag").length,
    );
    await expect.element(page.getByRole("heading", { name: "Head of Public Affairs" })).toBeVisible();
  });
});
