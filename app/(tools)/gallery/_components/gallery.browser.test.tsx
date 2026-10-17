import { describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";
import { page } from "vitest/browser";
import { GROUPS } from "../_examples";
import { anchor, exampleKey } from "./anchors";
import GalleryGroup from "./GalleryGroup";
import GalleryIndex from "./GalleryIndex";
import { Controlled, Logged } from "./wiring";

// The examples import async server components (the local groups' events),
// which fetch through the fixture services, which need Node's crypto. Those
// render only on the page (their variants are `server`), so the browser
// never fetches.
vi.mock("@/tests/fixtures/outside-services", () => ({ fixtureResponse: () => null }));

describe("GalleryIndex", () => {
  it("has a card for each group, linking to its page, with what's in it", async () => {
    await render(<GalleryIndex groups={GROUPS} />);
    await expect.element(page.getByRole("heading", { level: 1, name: "Component gallery" })).toBeInTheDocument();
    const cards = page.getByRole("listitem");
    expect(cards.all()).toHaveLength(GROUPS.length);
    for (const [i, group] of GROUPS.entries()) {
      const card = cards.nth(i).getByRole("link");
      await expect.element(card).toHaveAttribute("href", `/gallery/${group.id}`);
      const text = card.element().textContent;
      expect(text).toContain(group.title);
      expect(text).toContain(`${group.examples.length} components`);
    }
  });

  it("counts every variant of every component", async () => {
    const groups = [
      {
        id: "g",
        title: "G",
        examples: [
          { name: "One", file: "a.tsx", variants: [{ label: "A", render: () => null }] },
          {
            name: "Two",
            file: "b.tsx",
            variants: [
              { label: "A", render: () => null },
              { label: "B", render: () => null },
            ],
          },
        ],
      },
    ];
    await render(<GalleryIndex groups={groups} />);
    await expect.element(page.getByRole("link")).toHaveTextContent("G2 components, 3 variantsOne, Two");
  });
});

describe("GalleryGroup", () => {
  it("renders every example of every group, each variant under its own anchor, each linked from the top", async () => {
    await page.viewport(1280, 900);
    for (const group of GROUPS) {
      const { container, unmount } = await render(<GalleryGroup group={group} browser />);
      // The group's title is the page's first <h1>: some of its components have their own.
      expect(container.querySelector("h1")?.textContent).toBe(group.title);
      expect(container.querySelector('a[href="/gallery"]')?.textContent).toBe("← Component gallery");
      const links = [...container.querySelectorAll('nav[aria-label="Components"] a')].map((a) =>
        a.getAttribute("href"),
      );
      for (const example of group.examples) {
        const exampleAnchor = anchor(group.id, exampleKey(group, example));
        expect(links).toContain(`#${exampleAnchor}`);
        expect(container.querySelector(`#${exampleAnchor}`)).not.toBeNull();
        for (const variant of example.variants) {
          const variantAnchor = `#${anchor(group.id, exampleKey(group, example), variant.label)}`;
          if (variant.server) {
            // An async server component renders only on the page; building its
            // element here is all the browser can do.
            expect(variant.render()).toBeTruthy();
            expect(container.querySelector(variantAnchor)).toBeNull();
          } else {
            expect(container.querySelector(variantAnchor)).not.toBeNull();
          }
        }
      }
      // Every anchor on the page is unique.
      const ids = [...container.querySelectorAll("[data-gallery-variant]")].map((element) => element.id);
      expect(new Set(ids).size).toBe(ids.length);
      await unmount();
    }
  });

  it("leaves out server variants in the browser, and shows them on the page", async () => {
    const group = {
      id: "g",
      title: "G",
      examples: [
        {
          name: "Thing",
          file: "x.tsx",
          variants: [
            { label: "Client", render: () => <p>client</p> },
            { label: "Server", render: () => <p>server</p>, server: true },
          ],
        },
      ],
    };
    const { rerender } = await render(<GalleryGroup group={group} browser />);
    await expect.element(page.getByText("client")).toBeInTheDocument();
    expect(page.getByText("server").query()).toBeNull();
    await rerender(<GalleryGroup group={group} />);
    await expect.element(page.getByText("server")).toBeInTheDocument();
  });
});

describe("anchor", () => {
  it("joins the group, the name and the label as a slug", () => {
    expect(anchor("ui", "Button")).toBe("ui--button");
    expect(anchor("ui", "Button", "Primary, in each size")).toBe("ui--button--primary-in-each-size");
  });

  it("tells apart two components of one name by their folders", () => {
    const one = { name: "Foreword", file: "app/(site)/a/_components/Foreword.tsx", variants: [] };
    const two = { name: "Foreword", file: "app/(site)/b/_components/Foreword.tsx", variants: [] };
    const alone = { name: "Closing", file: "components/ui/Closing.tsx", variants: [] };
    const group = { id: "pages", title: "Pages", examples: [one, two, alone] };
    expect(anchor(group.id, exampleKey(group, one))).toBe("pages--foreword-a");
    expect(anchor(group.id, exampleKey(group, two))).toBe("pages--foreword-b");
    expect(anchor(group.id, exampleKey(group, alone))).toBe("pages--closing");
  });
});

describe("Controlled", () => {
  it("holds the value, and shows it", async () => {
    await render(
      <Controlled initial={1}>
        {(value, set) => (
          <button type="button" onClick={() => set(value + 1)}>
            Add
          </button>
        )}
      </Controlled>,
    );
    await expect.element(page.getByText("Value: 1")).toBeVisible();
    await page.getByRole("button", { name: "Add" }).click();
    await expect.element(page.getByText("Value: 2")).toBeVisible();
  });

  it("shows the value its own way when asked", async () => {
    await render(
      <Controlled initial="a" show={(value) => value.toUpperCase()}>
        {() => null}
      </Controlled>,
    );
    await expect.element(page.getByText("Value: A")).toBeVisible();
  });
});

/** A form's data, as a Server Action gets it. */
function formData(fields: Record<string, string>) {
  const data = new FormData();
  for (const [name, value] of Object.entries(fields)) data.set(name, value);
  return data;
}

describe("Logged", () => {
  it("logs each call with its arguments: plain, a file, a function, an event, a form's data, and what JSON can't write", async () => {
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    await render(
      <Logged>
        {(log) => (
          <>
            <button type="button" onClick={() => log("onSave")()}>
              Save
            </button>
            <button type="button" onClick={() => log("onOpen")(new File(["{}"], "poster.json"), 3)}>
              Open
            </button>
            <button type="button" onClick={() => log("onPick")(() => {}, undefined, circular)}>
              Pick
            </button>
            <button type="button" onClick={log("onClick")}>
              Click
            </button>
            <button type="button" onClick={() => log("onKey")(new KeyboardEvent("keydown"))}>
              Key
            </button>
            <button type="button" onClick={() => log("action")(formData({ id: "7", name: "Jo" }))}>
              Submit
            </button>
          </>
        )}
      </Logged>,
    );
    await page.getByRole("button", { name: "Save" }).click();
    await page.getByRole("button", { name: "Open" }).click();
    await page.getByRole("button", { name: "Pick" }).click();
    await page.getByRole("button", { name: "Click" }).click();
    await page.getByRole("button", { name: "Key" }).click();
    await page.getByRole("button", { name: "Submit" }).click();
    const items = page.getByRole("list", { name: "Event log" }).getByRole("listitem");
    await expect.element(items.nth(0)).toHaveTextContent("onSave()");
    await expect.element(items.nth(1)).toHaveTextContent("onOpen(File poster.json, 3)");
    await expect.element(items.nth(2)).toHaveTextContent("onPick(ƒ, undefined, [object Object])");
    await expect.element(items.nth(3)).toHaveTextContent("onClick(event)");
    await expect.element(items.nth(4)).toHaveTextContent("onKey(event)");
    await expect.element(items.nth(5)).toHaveTextContent('action({"id":"7","name":"Jo"})');
  });
});
