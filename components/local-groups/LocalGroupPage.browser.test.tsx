import { describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";
import { page } from "vitest/browser";
import { localGroupPages } from "@/lib/content/local-group-pages";
import LocalGroupPage from "./LocalGroupPage";

// The events sections are tested with LocalGroupEvents; here they stand in.
vi.mock("@/components/events/LocalGroupEvents", () => ({
  default: ({ localGroupName }: { localGroupName: string }) => (
    <section data-testid="events">{localGroupName} events</section>
  ),
}));

/** The badge over the hero photo: whatever follows the photo, beside the h1's column. */
describe("LocalGroupPage", () => {
  it.each(Object.values(localGroupPages).map((content) => [content.name, content] as const))(
    "renders %s's page",
    async (name, content) => {
      const { container } = await render(<LocalGroupPage content={content} />);
      await expect.element(page.getByRole("heading", { level: 1 })).toHaveTextContent(`PauseAI ${name}`);
      await expect.element(page.getByTestId("events")).toHaveTextContent(`${name} events`);
      const hero = container.querySelector("main > section")!;
      for (const action of content.hero.actions) {
        const link = [...hero.querySelectorAll("a")].find((a) => a.textContent === action.label)!;
        expect(link.getAttribute("target")).toBe(action.newTab ? "_blank" : null);
      }
      expect(container.querySelector('[data-testid="hero-badge"]')?.textContent).toBe(content.hero.badge);
    },
  );

  it("wraps several contact buttons together, and leaves out details it wasn't given", async () => {
    const { container } = await render(
      <LocalGroupPage
        content={{
          name: "London",
          hero: { lede: "Hi", actions: [], photo: "/x.jpg" },
          sections: [
            {
              kind: "contact",
              heading: "Two",
              lede: "l",
              actions: [
                { label: "A", href: "/a", variant: "primary", internal: true },
                { label: "B", href: "/b", variant: "ghost" },
              ],
            },
            { kind: "activities", heading: "Done", items: [{ title: "T", text: "x", image: "/i.jpg" }] },
          ],
        }}
      />,
    );
    // Both buttons share one wrapper, and it's the only thing in the callout: no details.
    const actions = page.getByRole("link", { name: "A" }).element().parentElement!;
    expect(page.getByRole("link", { name: "B" }).element().parentElement).toBe(actions);
    expect(actions.querySelectorAll("a")).toHaveLength(2);
    expect(actions.parentElement!.children).toHaveLength(1);
    expect(container.querySelector('[data-testid="hero-badge"]')).toBeNull();
    await expect.element(page.getByText("l", { exact: true })).toBeVisible();
    expect(container.querySelector("article .inline-link")).toBeNull();
    await expect.element(page.getByRole("link", { name: "View event page" })).not.toBeInTheDocument();
  });
});
