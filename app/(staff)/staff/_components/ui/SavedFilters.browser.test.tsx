import { describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";
import { page, userEvent } from "vitest/browser";
import { staffCopy } from "@/lib/content/staff-interface";
import type { SavedFilter, SavedFiltersState } from "@/lib/server/saved-filters";
import EventFilters from "../EventFilters";
import PoliticianFilters from "../PoliticianFilters";
import { emptyPoliticiansSearch } from "../PoliticianTable.examples";
import SupporterFilters from "../SupporterFilters";
import { eventsSearch, supportersSearch } from "@/lib/staff-search";
import FilterBar, { filteredName } from "./FilterBar";
import { savedFiltersProps, type SavedFilterActions } from "./SavedFilters";

const copy = staffCopy.filters.saved;

const actions = (): SavedFilterActions => ({
  save: vi.fn(async () => {}),
  update: vi.fn(async () => {}),
  rename: vi.fn(async () => {}),
  remove: vi.fn(async () => {}),
});

const row = (id: number, name: string, params: SavedFilter["params"] = { party: "Labour" }): SavedFilter => ({
  id,
  name,
  params,
  createdBy: `jane.smith+${id}@pauseai.uk`,
  createdAt: "2026-10-28T10:00:00Z",
  changedAt: "2026-10-28T10:00:00Z",
});

const FILTERS = [
  { name: "party", label: "Party", repeat: true, options: [{ value: "Labour", label: "Labour" }] },
  { name: "nation", label: "Nation", options: [{ value: "scotland", label: "Scotland" }] },
];

/** The bar, on a list's URL parameters and what the server found. */
async function bar(values: Record<string, string | string[]>, state: Partial<SavedFiltersState> = {}, did = actions()) {
  await render(
    <FilterBar
      path="/staff/politicians"
      values={values}
      search={{ name: "q", label: "Search" }}
      filters={FILTERS}
      keep={["house"]}
      saved={savedFiltersProps({
        list: "politicians",
        state: { rows: [], params: {}, ...state },
        values,
        path: "/staff/politicians",
        name: filteredName("Politicians", ["House of Commons", "", "Party Labour"]),
        summary: (params) => [String(params.party), ""],
        actions: did,
      })}
    />,
  );
  return did;
}

const LOADED = { id: 7, name: "Labour only", params: { party: "Labour" }, edited: false, gone: [] };
const chip = () => page.getByRole("button", { name: new RegExp(`^${copy.chip}`) });
/** The button of a filter's name, however the browser here says the arrow after it. */
const named = (name: string) => page.getByRole("button", { name: new RegExp(`^${name}`) });
const saveMenu = () => page.getByRole("button", { name: new RegExp(`^${copy.save}( |$)(?!as)`) }).first();
/** What a link says, once it's there. */
const says = (name: RegExp, words: string) =>
  expect.poll(() => page.getByRole("link", { name }).element().textContent).toContain(words);

describe("SavedFilters' chip", () => {
  it("keeps Save's menu up while Update for everyone waits, greyed with a spinner, and pressable once", async () => {
    const did = actions();
    let finish = () => {};
    did.update = vi.fn(() => new Promise<void>((done) => (finish = done)));
    await bar(
      { party: "Labour", saved: "7" },
      { rows: [row(7, "Labour only")], loaded: { ...LOADED, edited: true } },
      did,
    );
    await saveMenu().click();
    const update = page.getByRole("button", { name: copy.update });
    await update.click();
    await expect.element(update).toHaveAttribute("aria-busy", "true");
    await expect.element(update).toBeDisabled();
    await expect.element(update).toBeVisible();
    expect(getComputedStyle(update.element()).opacity).toBe("0.6");
    expect(did.update).toHaveBeenCalledTimes(1);
    finish();
    await expect.element(update).not.toHaveAttribute("aria-busy");
  });

  it("with nothing on, is only the list", async () => {
    await bar({ house: "commons" });
    await expect.element(chip()).toBeVisible();
    await expect.element(page.getByRole("button", { name: copy.save, exact: true })).not.toBeInTheDocument();
    await expect.element(page.getByRole("link", { name: staffCopy.resetFilters })).not.toBeInTheDocument();
  });

  it("says how to start when none are saved", async () => {
    await bar({});
    await chip().click();
    await expect.element(page.getByText(copy.none)).toBeVisible();
  });

  it("with a filter on, offers Save, whose form starts with the page's words in full and sends the page", async () => {
    const did = await bar({ party: "Labour", house: "commons" });
    await page.getByRole("button", { name: copy.save, exact: true }).click();
    const name = page.getByRole("textbox", { name: copy.name });
    await expect.element(name).toHaveValue("Politicians: House of Commons, Party Labour");
    await expect.element(page.getByText(copy.shared)).toBeVisible();
    await name.fill("My own name");
    await page.getByRole("dialog").or(page.getByText(copy.saveTitle)).first().click();
    const form = name.element().closest("form")!;
    expect(new FormData(form).get("back")).toBe("/staff/politicians?party=Labour&house=commons");
    expect(new FormData(form).get("list")).toBe("politicians");
    form.requestSubmit();
    await expect.poll(() => (did.save as ReturnType<typeof vi.fn>).mock.calls.length).toBe(1);
  });

  it("offers Save for a search too, and Cancel closes the form", async () => {
    await bar({ q: "jo" });
    await page.getByRole("button", { name: copy.save, exact: true }).click();
    await page.getByRole("button", { name: copy.cancel }).click();
    await expect.element(page.getByRole("textbox", { name: copy.name })).not.toBeInTheDocument();
  });

  it("loaded and unchanged, is named for the filter, all of it on hover, with Clear filters though no chip's on", async () => {
    await bar({ saved: "7" }, { rows: [row(7, "Labour only")], loaded: LOADED });
    const button = named("Labour only");
    await expect.element(button).toBeVisible();
    expect(button.element().querySelector("[title]")?.getAttribute("title")).toBe("Labour only");
    await expect.element(page.getByRole("button", { name: copy.save, exact: true })).not.toBeInTheDocument();
    // Clear filters unloads it: it isn't in `keep`.
    await expect
      .element(page.getByRole("link", { name: staffCopy.resetFilters }))
      .toHaveAttribute("href", "/staff/politicians");
    expect(button.element().querySelector("svg")?.getAttribute("fill")).toBe("currentColor");
  });

  it("edited, says so, and Save holds Update for everyone, Save as new and Undo my changes", async () => {
    const did = await bar(
      { party: "Labour", nation: "scotland", saved: "7", mailing: "12" },
      { rows: [row(7, "Labour only")], loaded: { ...LOADED, edited: true } },
    );
    expect(named("Labour only").element().textContent).toBe(`Labour only${copy.edited}`);
    await saveMenu().click();
    await expect
      .element(page.getByRole("link", { name: copy.undo }))
      .toHaveAttribute("href", "/staff/politicians?party=Labour&mailing=12&saved=7");
    await page.getByRole("button", { name: copy.saveAsNew }).click();
    await expect.element(page.getByRole("textbox", { name: copy.name })).toBeVisible();
    await page.getByRole("button", { name: copy.cancel }).click();
    await page.getByRole("button", { name: copy.update }).click();
    await expect.poll(() => (did.update as ReturnType<typeof vi.fn>).mock.calls.length).toBe(1);
    const sent = (did.update as ReturnType<typeof vi.fn>).mock.calls[0][0] as FormData;
    expect(sent.get("id")).toBe("7");
    expect(sent.get("back")).toBe("/staff/politicians?party=Labour&nation=scotland&saved=7&mailing=12");
  });

  it("keeps a long name to its longest width, and 'edited' whole", async () => {
    const name = "A very long saved filter name that goes on and on and on and on and on and on";
    await bar({ saved: "7" }, { rows: [row(7, name)], loaded: { ...LOADED, name, edited: true } });
    const title = named(name).element().querySelector("[title]")!;
    expect(title.getBoundingClientRect().width).toBeLessThanOrEqual(17 * 16);
    expect(page.getByText(copy.edited).element().scrollWidth).toBeLessThanOrEqual(
      page.getByText(copy.edited).element().clientWidth,
    );
  });
});

describe("SavedFilters' list", () => {
  const rows = [row(1, "Conservatives who replied"), row(2, "Scottish MPs", { nation: "scotland" })];

  it("lists each with its summary, who made it and when; a row is a link that loads it, keeping who a mailing's for", async () => {
    await bar({ mailing: "12", pasted: ["Jo"] }, { rows });
    await chip().click();
    const link = page.getByRole("link", { name: /Conservatives who replied/ });
    await says(/Conservatives who replied/, "jane.smith+1 · ");
    await says(/Conservatives who replied/, "Labour");
    await expect.element(link).toHaveAttribute("href", "/staff/politicians?party=Labour&mailing=12&pasted=Jo&saved=1");
    await expect.element(page.getByText(copy.count(2))).toBeVisible();
    const wide = document.querySelector<HTMLElement>("#saved-filters")!;
    expect(wide.getBoundingClientRect().width).toBeGreaterThan(22 * 16);
  });

  it("says one in the singular, and marks the one loaded", async () => {
    await bar({ saved: "1" }, { rows: [rows[0]], loaded: { ...LOADED, id: 1 } });
    await named(LOADED.name).click();
    await expect.element(page.getByText(copy.count(1))).toBeVisible();
    await expect
      .element(page.getByRole("link", { name: /Conservatives who replied/ }))
      .toHaveAttribute("aria-current", "true");
  });

  it("narrows by name as it's typed, not by what else a row says", async () => {
    await bar({}, { rows });
    await chip().click();
    const box = page.getByRole("searchbox", { name: copy.find });
    await box.fill("scot");
    await expect.element(page.getByRole("link", { name: /Scottish MPs/ })).toBeVisible();
    await expect.element(page.getByRole("link", { name: /Conservatives/ })).not.toBeInTheDocument();
    await box.fill("jane");
    await expect.element(page.getByRole("link", { name: /Scottish MPs/ })).not.toBeInTheDocument();
    await box.fill("");
    await expect.element(page.getByRole("link", { name: /Conservatives/ })).toBeVisible();
  });

  it("has a menu on each row that renames and deletes twice, without loading it", async () => {
    const did = await bar({ mailing: "12" }, { rows });
    await chip().click();
    await page.getByRole("button", { name: copy.rowMenu("Scottish MPs") }).click();
    // Still open under it: a menu within a menu.
    await expect.element(page.getByRole("searchbox", { name: copy.find })).toBeVisible();

    await page.getByRole("button", { name: copy.rename, exact: true }).click();
    const name = page.getByRole("textbox", { name: copy.name });
    await expect.element(name).toHaveValue("Scottish MPs");
    name.element().closest("form")!.requestSubmit();
    await expect.poll(() => (did.rename as ReturnType<typeof vi.fn>).mock.calls.length).toBe(1);
    const renamed = (did.rename as ReturnType<typeof vi.fn>).mock.calls[0][0] as FormData;
    expect(renamed.get("id")).toBe("2");
    expect(renamed.get("back")).toBeNull();
    await userEvent.keyboard("{Escape}");

    // The first press only asks: nothing's sent, and it asks no more once the focus has gone.
    await page.getByRole("button", { name: copy.deleteForEveryone }).click();
    const again = page.getByRole("button", { name: staffCopy.deleteIt });
    await expect.element(again).toHaveFocus();
    expect(did.remove).not.toHaveBeenCalled();
    (again.element() as HTMLElement).blur();
    await expect.element(page.getByRole("button", { name: copy.deleteForEveryone })).toBeVisible();
    expect(did.remove).not.toHaveBeenCalled();

    await page.getByRole("button", { name: copy.deleteForEveryone }).click();
    await page.getByRole("button", { name: staffCopy.deleteIt }).click();
    await expect.poll(() => (did.remove as ReturnType<typeof vi.fn>).mock.calls.length).toBe(1);
    const removed = (did.remove as ReturnType<typeof vi.fn>).mock.calls[0][0] as FormData;
    expect(removed.get("id")).toBe("2");
    expect(removed.get("list")).toBe("politicians");
    expect(removed.get("back")).toBe("/staff/politicians?mailing=12");
  });
});

describe("SavedFilterGone", () => {
  it("says nothing with nothing gone", async () => {
    await bar({ saved: "7" }, { rows: [row(7, "One")], loaded: LOADED });
    await expect.element(page.getByRole("status")).not.toBeInTheDocument();
  });

  it("says what's gone in the chips' words", async () => {
    await bar(
      { saved: "7", party: "Labour" },
      {
        rows: [row(7, "One")],
        loaded: { ...LOADED, gone: ["party=Reform=Group", "nation=!atlantis", "house=moon"] },
      },
    );
    await expect
      .poll(() => document.body.textContent)
      .toContain(copy.gone("Party: Reform=Group, Nation: not atlantis, moon"));
  });
});

describe("each list's saved filters", () => {
  const state = (params: SavedFilter["params"]): SavedFiltersState => ({ rows: [row(1, "One", params)], params: {} });

  it("on politicians, are said in its words, and start named after them", async () => {
    await render(
      <PoliticianFilters
        search={{ ...emptyPoliticiansSearch, party: ["Labour"], house: "commons" }}
        asks={[]}
        parties={["Labour"]}
        saved={{ state: state({ house: "lords", party: "Green" }), actions: actions() }}
      />,
    );
    await chip().click();
    await says(/One/, `${staffCopy.houses.lords} · ${staffCopy.fields.party} Green`);
    await userEvent.keyboard("{Escape}");
    await page.getByRole("button", { name: copy.save, exact: true }).click();
    await expect
      .element(page.getByRole("textbox", { name: copy.name }))
      .toHaveValue(`${staffCopy.politicians.title}: ${staffCopy.houses.commons}, ${staffCopy.fields.party} Labour`);
  });

  it("on supporters, are said in its words, without its erased notice", async () => {
    const { filter, ...search } = supportersSearch({ near: "Leeds", erased: "1" });
    void filter;
    await render(
      <SupporterFilters
        search={search}
        choices={{ events: [], mps: [] }}
        saved={{ state: state({ q: "jo" }), actions: actions() }}
      />,
    );
    await chip().click();
    await says(/One/, `${staffCopy.search} jo`);
    expect(page.getByRole("link", { name: /One/ }).element().getAttribute("href")).toBe(
      "/staff/supporters?q=jo&saved=1",
    );
    await userEvent.keyboard("{Escape}");
    await page.getByRole("button", { name: copy.save, exact: true }).click();
    const form = page.getByRole("textbox", { name: copy.name }).element().closest("form")!;
    expect(new FormData(form).get("back")).toBe("/staff/supporters?near=Leeds");
  });

  it("on events, say the Past tab, and start named after the filters", async () => {
    const search = eventsSearch({ q: "talk", page: "2" });
    await render(
      <EventFilters
        search={search}
        choices={{ staff: [], tags: ["Talk"], cities: [] }}
        saved={{
          state: {
            rows: [row(1, "Old talks", { when: "past", tag: "Talk" }), row(2, "New talks", { tag: "Talk" })],
            params: {},
          },
          actions: actions(),
        }}
      />,
    );
    await chip().click();
    await says(/Old talks/, `${staffCopy.events.tabs.past} · ${staffCopy.events.filters.tag} Talk`);
    expect(page.getByRole("link", { name: /New talks/ }).element().textContent).not.toContain(
      staffCopy.events.tabs.past,
    );
    await userEvent.keyboard("{Escape}");
    await page.getByRole("button", { name: copy.save, exact: true }).click();
    await expect
      .element(page.getByRole("textbox", { name: copy.name }))
      .toHaveValue(`${staffCopy.events.title}: ${staffCopy.search} talk`);
  });
});
