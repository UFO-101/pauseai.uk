import { describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";
import { page } from "vitest/browser";
import type { ComponentProps } from "react";
import { navigation } from "@/tests/browser/navigation";
import StaffLink from "./StaffLink";
import Menu from "./Menu";

// Outside Next's app router a Link is a plain link, and following it would
// leave the test's page. Here, as the app router does, a click calls the
// Link's onNavigate, and goes nowhere itself.
vi.mock("next/link", () => ({
  default: ({
    onNavigate,
    ...props
  }: ComponentProps<"a"> & { onNavigate: (event: { preventDefault(): void }) => void }) => (
    <a
      {...props}
      onClick={(event) => {
        event.preventDefault();
        onNavigate({ preventDefault: () => {} });
      }}
    />
  ),
}));

describe("StaffLink", () => {
  it("goes to its list as a transition, closing the menu it's in", async () => {
    await render(
      <Menu id="choices" label="Choose">
        <StaffLink href="/staff/supporters?activity=member">Members</StaffLink>
      </Menu>,
    );
    await page.getByRole("button", { name: "Choose" }).click();
    await page.getByRole("link", { name: "Members" }).click();
    await vi.waitFor(() => expect(navigation.pushed).toEqual(["/staff/supporters?activity=member"]));
    expect(document.getElementById("choices")!.matches(":popover-open")).toBe(false);
  });

  it("goes outside a menu too", async () => {
    await render(<StaffLink href="/staff/politicians?sort=name&dir=desc">Name</StaffLink>);
    await page.getByRole("link", { name: "Name" }).click();
    await vi.waitFor(() => expect(navigation.pushed).toEqual(["/staff/politicians?sort=name&dir=desc"]));
  });
});
