import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";
import { page, userEvent } from "vitest/browser";
import { TextInput } from "@/components/ui/Controls";
import StaffPage from "./StaffPage";
import Tabs from "./Tabs";
import FilterBar, { filterWords, type Filter } from "./FilterBar";
import Menu from "./Menu";
import ListFrame, { ListTable, type ListColumn } from "./ListFrame";
import NavFold from "./NavFold";
import FormPending from "./FormPending";

import { renderToString } from "react-dom/server";
import { NAV_FOLD_KEY } from "@/lib/staff-nav";
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
    {
      name: "answer",
      label: "Answer",
      after: "ask",
      options: [
        { value: "", label: "Any" },
        { value: "yes", label: "Yes" },
      ],
    },
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

  it("with filters on: a chip each, the one after another its second half; removing one removes what comes after it", async () => {
    await render(bar({ q: "jo", ask: "x", answer: "maybe", page: "3", tab: "t" }));
    await expect
      .element(page.getByRole("link", { name: staffCopy.filters.clearSearch }))
      .toHaveAttribute("href", "/list?ask=x&answer=maybe&tab=t");
    const form = page.getByRole("search").element() as HTMLFormElement;
    expect(new FormData(form).has("page")).toBe(false);
    // One lozenge, named for the first, its halves the choices made, an unknown one as it is.
    const pair = page.getByRole("group", { name: "Ask" });
    expect(
      pair
        .getByRole("button")
        .all()
        .map((b) => b.element().textContent),
    ).toEqual(["X", "maybe"]);
    await pair.getByRole("button", { name: "X" }).click();
    expect(links()).toEqual(["/list?q=jo&ask=x&tab=t", "/list?q=jo&tab=t"]);
    // The second half has no remove: its blank choice takes it off.
    await pair.getByRole("button", { name: "maybe" }).click();
    expect(links()).toEqual(["/list?q=jo&ask=x&tab=t", "/list?q=jo&ask=x&answer=yes&tab=t"]);
    expect(document.querySelector("[popover]:popover-open a[aria-current]")).toBeNull();
    await expect
      .element(page.getByRole("link", { name: staffCopy.resetFilters }))
      .toHaveAttribute("href", "/list?tab=t");
  });

  it("names the second half by its blank choice until one is made, and one after nothing on is its own chip", async () => {
    const { rerender } = await render(bar({ ask: "x" }));
    expect(
      page
        .getByRole("group", { name: "Ask" })
        .getByRole("button")
        .all()
        .map((b) => b.element().textContent),
    ).toEqual(["X", "Any"]);
    await rerender(bar({ answer: "yes" }));
    await page.getByRole("button", { name: "Answer: Yes" }).click();
    expect(links()).toEqual(["/list", "/list?answer=yes", "/list"]);
  });

  it("has no + Filter once every filter is on, and Clear filters for a search alone", async () => {
    const { rerender } = await render(bar({ kind: "a", ask: "x", answer: "yes" }));
    await expect.element(page.getByRole("button", { name: staffCopy.filters.add })).not.toBeInTheDocument();
    await page.getByRole("button", { name: "Kind: A" }).click();
    expect(document.querySelector("[popover]:popover-open a[aria-current]")!.textContent).toBe("A");
    await rerender(bar({ q: "jo" }));
    await expect.element(page.getByRole("link", { name: staffCopy.resetFilters })).toHaveAttribute("href", "/list");
  });

  it("lists every other filter in + Filter, a row each, its choices opening under it, one at a time", async () => {
    const options = Array.from({ length: 40 }, (_, i) => ({ value: `${i}`, label: `Choice ${i}` }));
    await render(
      <FilterBar
        path="/list"
        values={{}}
        search={{ name: "q", label: "Search" }}
        filters={[
          { name: "many", label: "Many", options },
          { name: "few", label: "Few", options: options.slice(0, 2) },
        ]}
      />,
    );
    await page.getByRole("button", { name: staffCopy.filters.add }).click();
    const rows = [...document.querySelectorAll<HTMLDetailsElement>("[popover]:popover-open details")];
    expect(rows.map((row) => row.querySelector("summary")!.textContent)).toEqual(["Many", "Few"]);
    expect(rows.map((row) => row.open)).toEqual([false, false]);
    await page.getByText("Many", { exact: true }).click();
    // A long list scrolls in its row.
    const list = rows[0].querySelector("ul")!;
    expect(list.scrollHeight).toBeGreaterThan(list.clientHeight);
    await page.getByText("Few", { exact: true }).click();
    expect(rows.map((row) => row.open)).toEqual([false, true]);
  });

  it("shows a searchable filter's choices only once something's typed, those that have it", async () => {
    await render(
      <FilterBar
        path="/list"
        values={{}}
        search={{ name: "q", label: "Search" }}
        filters={[
          {
            name: "event",
            label: "Event",
            searchable: true,
            options: [
              { value: "a", label: "Leeds social" },
              { value: "b", label: "Oxford talk" },
            ],
          },
        ]}
      />,
    );
    await page.getByRole("button", { name: staffCopy.filters.add }).click();
    await page.getByText("Event", { exact: true }).click();
    const list = document.querySelector<HTMLElement>("[popover]:popover-open ul")!;
    expect(getComputedStyle(list).display).toBe("none");
    const box = page.getByRole("searchbox", { name: staffCopy.filters.narrow });
    await box.fill("oxf");
    expect(getComputedStyle(list).display).not.toBe("none");
    expect([...list.querySelectorAll("li")].map((li) => li.hidden)).toEqual([true, false]);
    await box.fill("");
    expect(getComputedStyle(list).display).toBe("none");
  });

  it("takes a place in a small form, keeping the other filters, and says what it found and how far in its chip", async () => {
    const place: Filter = {
      name: "near",
      label: "Near",
      options: [{ value: "ls1", label: "Leeds" }],
      place: {
        within: "within",
        placeholder: "Postcode or town",
        distances: [
          { value: "5", label: "5 miles" },
          { value: "10", label: "10 miles" },
        ],
      },
    };
    const kind: Filter = { name: "kind", label: "Kind", repeat: true, options: [{ value: "a", label: "A" }] };
    const { rerender } = await render(
      <FilterBar
        path="/list"
        values={{ kind: ["a"], page: "2" }}
        search={{ name: "q", label: "Search" }}
        filters={[place, kind]}
      />,
    );
    await page.getByRole("button", { name: staffCopy.filters.add }).click();
    await page.getByText("Near", { exact: true }).click();
    const form = document.querySelector<HTMLFormElement>("[popover]:popover-open form")!;
    expect(form.getAttribute("action")).toBe("/list");
    expect([...new FormData(form)]).toEqual([
      ["kind", "a"],
      ["near", ""],
      ["within", "10"],
    ]);
    await userEvent.keyboard("{Escape}");
    await rerender(
      <FilterBar
        path="/list"
        values={{ near: "ls1", within: "5", kind: ["a"] }}
        search={{ name: "q", label: "Search" }}
        filters={[place, kind]}
      />,
    );
    await page.getByRole("button", { name: "Near: Leeds, 5 miles" }).click();
    const chipForm = document.querySelector<HTMLFormElement>("[popover]:popover-open form")!;
    expect([...new FormData(chipForm)]).toEqual([
      ["kind", "a"],
      ["near", "ls1"],
      ["within", "5"],
    ]);
    expect(document.querySelector("[popover]:popover-open a")!.getAttribute("href")).toBe("/list?kind=a");
    await userEvent.keyboard("{Escape}");
    // A distance it doesn't know is the middle one.
    await rerender(
      <FilterBar
        path="/list"
        values={{ near: "x", within: "7" }}
        search={{ name: "q", label: "Search" }}
        filters={[place]}
      />,
    );
    expect([...document.querySelectorAll("button")].map((b) => b.textContent)).toContain("Near: x, 10 miles");
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

type Row = { name: string; count: number };
const rows: Row[] = [
  { name: "Ann", count: 3 },
  { name: "Bob", count: 0 },
];
const columns: ListColumn<Row>[] = [
  { key: "name", label: "Name", text: (r) => r.name, cell: (r) => r.name },
  { key: "count", label: "Count", short: true, className: "figure", text: (r) => r.count, cell: (r) => r.count },
  { key: "button", label: "", heading: <th key="button">Act</th>, cell: () => <button type="button">Go</button> },
];

describe("ListFrame", () => {
  const frame = (page: number, pages: number, download = true) => (
    <StaffPage as="div">
      <ListFrame
        count="250 rows"
        total={250}
        page={page}
        pages={pages}
        pageSize={2}
        href={(n) => `/list?page=${n}`}
        download={download ? (format) => `/list/download?format=${format}` : undefined}
        columns={columns}
        rows={rows}
        rowKey={(r) => r.name}
        empty="None."
      />
    </StaffPage>
  );

  it("says how many, which these are, and offers every one as CSV or JSON from a Download menu", async () => {
    await render(frame(6, 50));
    await expect.element(page.getByText("250 rows")).toBeVisible();
    await expect.element(page.getByText(staffCopy.lists.showing(11, 12), { exact: false })).toBeVisible();
    await page.getByRole("button", { name: staffCopy.lists.download }).click();
    const links = [...document.querySelectorAll<HTMLAnchorElement>("[popover]:popover-open a")];
    expect(links.map((a) => [a.textContent, a.getAttribute("href"), a.hasAttribute("download")])).toEqual([
      [staffCopy.lists.formats.csv, "/list/download?format=csv", true],
      [staffCopy.lists.formats.json, "/list/download?format=json", true],
    ]);
    await userEvent.keyboard("{Escape}");
    await expect.element(page.getByText(staffCopy.paging.range(11, 12, 250))).toBeVisible();
  });

  it("offers vCards too, for a list of people", async () => {
    await render(
      <ListFrame
        count="2 people"
        total={2}
        page={1}
        pages={1}
        pageSize={2}
        href={() => ""}
        download={(format) => `/people/download?format=${format}`}
        formats={["csv", "json", "vcf"]}
        columns={columns}
        rows={rows}
        rowKey={(r) => r.name}
        empty="None."
      />,
    );
    await page.getByRole("button", { name: staffCopy.lists.download }).click();
    await expect
      .element(page.getByRole("link", { name: staffCopy.lists.formats.vcf }))
      .toHaveAttribute("href", "/people/download?format=vcf");
  });

  it("draws a striped table, a short column on one line, a column's own heading", async () => {
    await render(frame(1, 1));
    const cells = page.getByRole("row").all().slice(1);
    const [first, second] = cells.map((row) => getComputedStyle(row.element().querySelector("td")!).backgroundColor);
    expect(first).not.toBe(second);
    const count = page.getByRole("cell", { name: "3" }).element();
    expect(getComputedStyle(count).whiteSpace).toBe("nowrap");
    expect(count.className).toContain("figure");
    expect([...document.querySelectorAll("th")].map((th) => th.textContent)).toEqual(["Name", "Count", "Act"]);
  });

  it("links to the first, the last and the pages near this one, with a gap between", async () => {
    await render(frame(6, 50));
    const pages = page.getByRole("navigation", { name: staffCopy.paging.label });
    expect([...pages.element().querySelectorAll("li")].map((item) => item.textContent)).toEqual([
      "1",
      "…",
      "4",
      "5",
      "6",
      "7",
      "8",
      "…",
      "50",
    ]);
    await expect
      .element(pages.getByRole("link", { name: staffCopy.paging.page(50) }))
      .toHaveAttribute("href", "/list?page=50");
    await expect.element(pages.getByText("6", { exact: true })).toHaveAttribute("aria-current", "page");
    await expect
      .element(pages.getByRole("link", { name: staffCopy.paging.previous }))
      .toHaveAttribute("href", "/list?page=5");
    await expect
      .element(pages.getByRole("link", { name: staffCopy.paging.next }))
      .toHaveAttribute("href", "/list?page=7");
  });

  it("has no Previous on the first page, no Next on the last", async () => {
    const { rerender } = await render(frame(1, 3));
    await expect.element(page.getByRole("link", { name: staffCopy.paging.previous })).not.toBeInTheDocument();
    await rerender(frame(3, 3));
    await expect.element(page.getByRole("link", { name: staffCopy.paging.next })).not.toBeInTheDocument();
  });

  it("on one page, has no paging nor which these are; without downloads, no buttons", async () => {
    await render(frame(1, 1, false));
    await expect.element(page.getByRole("navigation")).not.toBeInTheDocument();
    await expect.element(page.getByText(staffCopy.lists.showing(1, 2), { exact: false })).not.toBeInTheDocument();
    await expect.element(page.getByRole("button", { name: staffCopy.lists.download })).not.toBeInTheDocument();
  });

  it("says what a list with nothing in it says, instead", async () => {
    await render(
      <ListFrame
        count="0 rows"
        total={0}
        page={1}
        pages={1}
        pageSize={2}
        href={() => ""}
        columns={columns}
        rows={[]}
        rowKey={(r) => r.name}
        empty="None."
      />,
    );
    await expect.element(page.getByText("None.")).toBeVisible();
    await expect.element(page.getByRole("table")).not.toBeInTheDocument();
  });

  it("is wider than the content's width, and on a phone says the page in place of the numbers", async () => {
    const { container } = await render(frame(6, 50));
    const content = container.querySelector("[data-density] > div") as HTMLElement;
    content.style.width = "2000px";
    expect(container.querySelector("table")!.getBoundingClientRect().width).toBeGreaterThan(88 * 16);
    await page.viewport(400, 800);
    try {
      await expect.element(page.getByText(staffCopy.paging.of(6, 50))).toBeVisible();
      expect(getComputedStyle(container.querySelector("ol")!).display).toBe("none");
    } finally {
      await page.viewport(1280, 800);
    }
  });
});

describe("ListTable", () => {
  it("is the rows alone, a cell per column", async () => {
    await render(<ListTable columns={columns} rows={rows} rowKey={(r) => r.name} />);
    await expect.element(page.getByRole("cell", { name: "Bob" })).toBeVisible();
    expect(document.querySelector("th")!.textContent).toBe("Name");
  });
});

describe("NavFold", () => {
  afterEach(() => {
    delete document.documentElement.dataset.staffNav;
    localStorage.removeItem(NAV_FOLD_KEY);
  });

  it("folds the sidebar and unfolds it, on <html> and remembered in this browser", async () => {
    await render(<NavFold />);
    const fold = page.getByRole("button", { name: staffCopy.nav.fold });
    await expect.element(fold).toHaveAttribute("aria-expanded", "true");
    await fold.click();
    expect(document.documentElement.dataset.staffNav).toBe("folded");
    expect(localStorage.getItem(NAV_FOLD_KEY)).toBe("folded");
    const unfold = page.getByRole("button", { name: staffCopy.nav.unfold });
    await expect.element(unfold).toHaveAttribute("aria-expanded", "false");
    await unfold.click();
    expect(document.documentElement.dataset.staffNav).toBeUndefined();
    expect(localStorage.getItem(NAV_FOLD_KEY)).toBeNull();
  });

  it("starts folded when the page already is, and still folds a browser that won't store it", async () => {
    document.documentElement.dataset.staffNav = "folded";
    await render(<NavFold />);
    await expect.element(page.getByRole("button", { name: staffCopy.nav.unfold })).toBeVisible();
    const setItem = Storage.prototype.setItem;
    const removeItem = Storage.prototype.removeItem;
    Storage.prototype.setItem = Storage.prototype.removeItem = () => {
      throw new Error("no storage");
    };
    try {
      await page.getByRole("button", { name: staffCopy.nav.unfold }).click();
      expect(document.documentElement.dataset.staffNav).toBeUndefined();
      await page.getByRole("button", { name: staffCopy.nav.fold }).click();
      expect(document.documentElement.dataset.staffNav).toBe("folded");
    } finally {
      Storage.prototype.setItem = setItem;
      Storage.prototype.removeItem = removeItem;
    }
  });
});

describe("filterWords", () => {
  it("says the search and each filter on, by its choice's words, or as typed when it has none", () => {
    const filters: Filter[] = [
      { name: "kind", label: "Kind", repeat: true, options: [{ value: "a", label: "A" }] },
      { name: "near", label: "Near", options: [] },
    ];
    expect(filterWords(filters, { q: ["jo", "x"], kind: ["a", "b", "!a"], near: "LS1" }, "q")).toEqual([
      `${staffCopy.search} jo`,
      "Kind A",
      "Kind b",
      staffCopy.filters.notChip("Kind", "A"),
      "Near LS1",
    ]);
  });
});

describe("a searchable filter's chip", () => {
  it("has the box over its choices too", async () => {
    await render(
      <FilterBar
        path="/list"
        values={{ event: "a" }}
        search={{ name: "q", label: "Search" }}
        filters={[{ name: "event", label: "Event", searchable: true, options: [{ value: "a", label: "Leeds" }] }]}
      />,
    );
    await page.getByRole("button", { name: "Event: Leeds" }).click();
    expect(document.querySelector("[popover]:popover-open input[type=search]")).not.toBeNull();
  });
});

describe("NavFold on the server", () => {
  it("draws open, as the page's script folds it before it shows", () => {
    expect(renderToString(<NavFold />)).toContain(`aria-expanded="true"`);
  });
});

describe("FormPending", () => {
  it("marks its form pending while it submits", async () => {
    let finish = () => {};
    await render(
      <form action={() => new Promise<void>((done) => (finish = done))}>
        <FormPending />
        <button type="submit">Search</button>
      </form>,
    );
    const mark = () => document.querySelector("[data-pending]");
    expect(mark()).toBeNull();
    await page.getByRole("button", { name: "Search" }).click();
    await vi.waitFor(() => expect(mark()).not.toBeNull());
    finish();
    await vi.waitFor(() => expect(mark()).toBeNull());
  });
});
