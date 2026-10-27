import { describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";
import { page } from "vitest/browser";
import type { ComponentProps } from "react";
import { navigation } from "@/tests/browser/navigation";
import StaffLink from "./StaffLink";
import Menu from "./Menu";

// Outside Next's app router a Link is a plain link, and following it would
// leave the test's page. Here, as the app router does, a click calls the
// Link's onNavigate, and goes nowhere itself; how much it would prefetch is
// written on it.
vi.mock("next/link", () => ({
  default: ({
    onNavigate,
    prefetch,
    ...props
  }: ComponentProps<"a"> & { onNavigate: (event: { preventDefault(): void }) => void; prefetch: boolean | null }) => (
    <a
      {...props}
      data-prefetch={String(prefetch)}
      onClick={(event) => {
        event.preventDefault();
        onNavigate({ preventDefault: () => {} });
      }}
    />
  ),
}));

describe("StaffLink", () => {
  it("goes to its page as a transition, leaving the menu it's in open until the page arrives", async () => {
    await render(
      <Menu id="choices" label="Choose">
        <StaffLink href="/staff/supporters?activity=member">Members</StaffLink>
      </Menu>,
    );
    await page.getByRole("button", { name: "Choose" }).click();
    await page.getByRole("link", { name: "Members" }).click();
    await vi.waitFor(() => expect(navigation.pushed).toEqual(["/staff/supporters?activity=member"]));
    expect(document.getElementById("choices")!.matches(":popover-open")).toBe(true);
  });

  it("prefetches its page whole once it's hovered, focused or touched, its outline before", async () => {
    await render(
      <>
        <StaffLink href="/staff/asks">Asks</StaffLink>
        <StaffLink href="/staff/mailings">Mailings</StaffLink>
        <StaffLink href="/staff/letters">Letters</StaffLink>
      </>,
    );
    const link = (name: string) => page.getByRole("link", { name });
    await expect.element(link("Asks")).toHaveAttribute("data-prefetch", "null");
    await link("Asks").hover();
    await expect.element(link("Asks")).toHaveAttribute("data-prefetch", "true");
    link("Mailings").element().focus();
    await expect.element(link("Mailings")).toHaveAttribute("data-prefetch", "true");
    link("Letters")
      .element()
      .dispatchEvent(new TouchEvent("touchstart", { bubbles: true }));
    await expect.element(link("Letters")).toHaveAttribute("data-prefetch", "true");
  });
});
