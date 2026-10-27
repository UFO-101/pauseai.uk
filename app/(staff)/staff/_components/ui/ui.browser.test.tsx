import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { page, userEvent } from "vitest/browser";
import { TextInput } from "@/components/ui/Controls";
import StaffPage from "./StaffPage";
import Tabs from "./Tabs";
import FilterBar, { type Filter } from "./FilterBar";
import Menu from "./Menu";
import { staffCopy } from "@/lib/content/staff-interface";

describe("StaffPage", () => {
  it("is the page's main landmark, the full width", async () => {
    await render(
      <StaffPage>
        <h1>Heading</h1>
      </StaffPage>,
    );
    const main = page.getByRole("main");
    await expect.element(main.getByRole("heading", { name: "Heading" })).toBeVisible();
    expect(getComputedStyle(main.element()).width).toBe(`${document.body.clientWidth}px`);
  });

  it("frames a part of a staff page the same way inside another page's main", async () => {
    const { container } = await render(
      <StaffPage as="div">
        <h1>Heading</h1>
      </StaffPage>,
    );
    await expect.element(page.getByRole("main")).not.toBeInTheDocument();
    const div = container.firstElementChild as HTMLElement;
    expect(div.tagName).toBe("DIV");
    expect(getComputedStyle(container.querySelector("h1")!.parentElement!).paddingTop).toBe("32px");
  });

  it("puts the navigation in a column beside the page on a wide screen, and above it on a phone", async () => {
    await page.viewport(1280, 800);
    const { container } = await render(
      <StaffPage nav={<nav aria-label="Pages">links</nav>}>
        <h1>Heading</h1>
      </StaffPage>,
    );
    const nav = page.getByRole("navigation", { name: "Pages" }).element();
    const heading = page.getByRole("heading", { name: "Heading" }).element();
    expect(nav.getBoundingClientRect().right).toBeLessThanOrEqual(heading.getBoundingClientRect().left);
    // The column is tinted, so it reads apart from the page.
    const side = nav.parentElement!;
    expect(getComputedStyle(side).backgroundColor).not.toBe(
      getComputedStyle(container.firstElementChild!).backgroundColor,
    );
    expect(getComputedStyle(container.firstElementChild!).gridTemplateColumns.split(" ")).toHaveLength(2);
    await page.viewport(390, 800);
    expect(nav.getBoundingClientRect().bottom).toBeLessThanOrEqual(heading.getBoundingClientRect().top);
  });

  it("sets the compact density on what's in it", async () => {
    await page.viewport(1280, 800);
    await render(
      <>
        <TextInput aria-label="Outside" />
        <StaffPage>
          <TextInput aria-label="Inside" />
        </StaffPage>
      </>,
    );
    const height = (name: string) => page.getByRole("textbox", { name }).element().getBoundingClientRect().height;
    expect(height("Outside")).toBe(48);
    expect(height("Inside")).toBe(36);
  });
});

describe("Tabs", () => {
  it("is a row of links, the chosen one marked as the page", async () => {
    await render(
      <Tabs
        label="House"
        current="lords"
        tabs={[
          { key: "", label: "All", href: "/staff/politicians" },
          { key: "lords", label: "Lords", href: "/staff/politicians?house=lords" },
        ]}
      />,
    );
    const nav = page.getByRole("navigation", { name: "House" });
    await expect.element(nav.getByRole("link", { name: "All" })).not.toHaveAttribute("aria-current");
    await expect.element(nav.getByRole("link", { name: "Lords" })).toHaveAttribute("aria-current", "page");
    await expect
      .element(nav.getByRole("link", { name: "Lords" }))
      .toHaveAttribute("href", "/staff/politicians?house=lords");
  });
});

describe("Menu", () => {
  it("is a button that opens its box, and a click elsewhere closes it", async () => {
    await render(
      <Menu id="m" label="Choose" trigger="look">
        <p>Inside</p>
      </Menu>,
    );
    const button = page.getByRole("button", { name: "Choose" });
    expect(button.element().className).toBe("look");
    await expect.element(page.getByText("Inside")).not.toBeVisible();
    await button.click();
    await expect.element(page.getByText("Inside")).toBeVisible();
    document.body.click();
    await userEvent.keyboard("{Escape}");
    await expect.element(page.getByText("Inside")).not.toBeVisible();
  });
});

describe("FilterBar", () => {
  const filters: Filter[] = [
    { name: "kind", label: "Kind", options: [{ value: "a", label: "A" }] },
    { name: "ask", label: "Ask", options: [{ value: "x", label: "X" }] },
    { name: "answer", label: "Answer", after: "ask", options: [{ value: "yes", label: "Yes" }] },
  ];
  const bar = (values: Record<string, string>) => (
    <FilterBar path="/list" values={values} search={{ name: "q", label: "Search" }} filters={filters} keep={["tab"]} />
  );
  const links = () => [...document.querySelectorAll("[popover]:popover-open a")].map((a) => a.getAttribute("href"));

  it("with nothing on, is the search, its button and + Filter, offering only what needs nothing else", async () => {
    await render(bar({ tab: "t" }));
    await expect.element(page.getByRole("searchbox", { name: "Search" })).toHaveValue("");
    await expect.element(page.getByRole("link", { name: staffCopy.filters.clearSearch })).not.toBeInTheDocument();
    await expect.element(page.getByRole("link", { name: staffCopy.resetFilters })).not.toBeInTheDocument();
    await page.getByRole("button", { name: staffCopy.filters.add }).click();
    expect(links()).toEqual(["/list?tab=t&kind=a", "/list?tab=t&ask=x"]);
    // The search keeps the other values as they are.
    const form = page.getByRole("search").element() as HTMLFormElement;
    expect([form.method, form.getAttribute("action"), new FormData(form).get("tab")]).toEqual(["get", "/list", "t"]);
  });

  it("with filters on: a chip each, an unknown value as it is; removing one removes what comes after it", async () => {
    await render(bar({ q: "jo", ask: "x", answer: "maybe", page: "3", tab: "t" }));
    await expect
      .element(page.getByRole("link", { name: staffCopy.filters.clearSearch }))
      .toHaveAttribute("href", "/list?ask=x&answer=maybe&tab=t");
    const form = page.getByRole("search").element() as HTMLFormElement;
    expect(new FormData(form).has("page")).toBe(false);
    await page.getByRole("button", { name: "Ask: X" }).click();
    expect(links()).toEqual(["/list?q=jo&ask=x&tab=t", "/list?q=jo&tab=t"]);
    await page.getByRole("button", { name: "Answer: maybe" }).click();
    expect(links()).toEqual(["/list?q=jo&ask=x&answer=yes&tab=t", "/list?q=jo&ask=x&tab=t"]);
    expect(document.querySelector("[popover]:popover-open a[aria-current]")).toBeNull();
    await expect
      .element(page.getByRole("link", { name: staffCopy.resetFilters }))
      .toHaveAttribute("href", "/list?tab=t");
  });

  it("has no + Filter once every filter is on, and Clear all for a search alone", async () => {
    const { rerender } = await render(bar({ kind: "a", ask: "x", answer: "yes" }));
    await expect.element(page.getByRole("button", { name: staffCopy.filters.add })).not.toBeInTheDocument();
    await page.getByRole("button", { name: "Kind: A" }).click();
    expect(document.querySelector("[popover]:popover-open a[aria-current]")!.textContent).toBe("A");
    await rerender(bar({ q: "jo" }));
    await expect.element(page.getByRole("link", { name: staffCopy.resetFilters })).toHaveAttribute("href", "/list");
  });
});

describe("FilterBar's menus", () => {
  it("close when the filters change, as they do once a choice is followed", async () => {
    const filters: Filter[] = [{ name: "kind", label: "Kind", options: [{ value: "a", label: "A" }] }];
    const bar = (values: Record<string, string>) => (
      <FilterBar path="/list" values={values} search={{ name: "q", label: "Search" }} filters={filters} />
    );
    const { rerender } = await render(bar({}));
    await page.getByRole("button", { name: staffCopy.filters.add }).click();
    expect(document.querySelector("[popover]:popover-open")).not.toBeNull();
    await rerender(bar({ kind: "a" }));
    expect(document.querySelector("[popover]:popover-open")).toBeNull();
  });
});
