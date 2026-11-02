import { describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";
import { page } from "vitest/browser";
import { staffCopy } from "@/lib/content/staff-interface";
import type { SaveEvent } from "./EventEdit";
import EventFilters, { eventWords } from "./EventFilters";
import EventsTable, { EventsSource, EventTabs } from "./EventsTable";
import { exampleEvents, exampleEventsNow, exampleEventsTab, exampleStaff } from "./EventsTable.examples";

const copy = staffCopy.events;
const noAction: SaveEvent = async () => ({ emailed: [], owner: null });

/** The events table on a tab, with filters as typed (`params`), saving with `save`. */
function renderTable(params: Parameters<typeof exampleEventsTab>[0] = {}, save: SaveEvent = noAction) {
  const { search, found } = exampleEventsTab(params);
  return render(<EventsTable found={found} search={search} staff={exampleStaff} now={exampleEventsNow} save={save} />);
}

const row = (name: string) => page.getByRole("row").filter({ hasText: name });
/** A column's heading, by its words. */
const th = (label: string) =>
  [...document.querySelectorAll("thead th")].find((cell) => cell.textContent!.startsWith(label))!;
/** The note over the table of whom a save emailed. */
const status = () => document.querySelector("[role=status]")!;
const names = () => [...document.querySelectorAll("tbody tr")].map((tr) => tr.querySelector("a")!.textContent);

describe("EventsTable", () => {
  it("lists those to come, soonest first, each with when, its name, tags, place, who's going, owner and doc", async () => {
    await renderTable();
    await expect.element(page.getByText(copy.total(2))).toBeVisible();
    expect(names()).toEqual(["PauseAI London: Protest at Parliament", "AI risk talk"]);
    const headings = [...document.querySelectorAll("thead th")].map((th) => th.textContent!.replace(/[▲▼ ]+$/, ""));
    expect(headings).toEqual([
      copy.columns.when,
      copy.columns.name,
      copy.columns.tags,
      copy.columns.place,
      copy.columns.going,
      copy.owner,
      copy.doc,
      "",
    ]);
    const protest = row("Protest at Parliament");
    expect([...protest.element().querySelectorAll("td")].map((td) => td.textContent)).toEqual([
      "Sat 21 Nov 2026, 13:00",
      "PauseAI London: Protest at Parliament",
      "Big eventsLondon",
      "London",
      "42",
      "joseph@pauseai.uk",
      copy.doc,
      copy.edit,
    ]);
    await expect
      .element(protest.getByRole("link", { name: "PauseAI London: Protest at Parliament" }))
      .toHaveAttribute("href", "https://luma.com/evt-protest");
    await expect
      .element(protest.getByRole("link", { name: copy.doc }))
      .toHaveAttribute("href", "https://docs.google.com/document/d/example-protest-plan/edit");
    // To come with no owner or doc: errors.
    await expect.element(row("AI risk talk").getByText(copy.noOwner)).toHaveClass(/missing/);
    await expect.element(row("AI risk talk").getByText(copy.noDoc)).toHaveClass(/missing/);
    // Sorted by when, soonest first: its heading says so, and leads to the other way.
    const when = th(copy.columns.when);
    expect(when.getAttribute("aria-sort")).toBe("ascending");
    expect(when.querySelector("a")!.getAttribute("href")).toBe("/staff/events?sort=start&dir=desc");
    expect(th(copy.columns.going).querySelector("a")!.getAttribute("href")).toBe("/staff/events?sort=going&dir=desc");
    // No forms, only an Edit button on each.
    expect(page.getByRole("button", { name: new RegExp(`^${copy.editLabel("")}`) }).all()).toHaveLength(2);
    expect(document.querySelectorAll("form")).toHaveLength(0);
  });

  it("lists those past, latest first, what they lack only said, and one taken off Luma marked", async () => {
    await renderTable({ when: "past" });
    expect(names()).toEqual([
      "Lobbying your MP (online training)",
      "PauseAI Manchester Social",
      "PauseAI London March",
    ]);
    expect(row("online training").element().querySelectorAll("td")[3].textContent).toBe(copy.online);
    await expect.element(row("Manchester Social").getByText(copy.noOwner)).not.toHaveClass(/missing/);
    await expect.element(row("Manchester Social").getByText(copy.noDoc)).not.toHaveClass(/missing/);
    await expect.element(row("Manchester Social").getByText(copy.removed)).toBeVisible();
    await expect.element(row("London March").getByText(copy.removed)).not.toBeInTheDocument();
    const when = th(copy.columns.when);
    expect(when.getAttribute("aria-sort")).toBe("descending");
    // Its links keep the tab.
    expect(when.querySelector("a")!.getAttribute("href")).toBe("/staff/events?when=past&sort=start&dir=asc");
  });

  it("doesn't call one to come with no owner an error once it's been taken off Luma", async () => {
    const [soon] = exampleEvents;
    const found = { events: [{ ...soon, owner: null, removed: true }], total: 1, pages: 1 };
    const { search } = exampleEventsTab();
    await render(
      <EventsTable found={found} search={search} staff={exampleStaff} now={exampleEventsNow} save={noAction} />,
    );
    await expect.element(page.getByText(copy.noOwner)).not.toHaveClass(/missing/);
    await expect.element(page.getByText(copy.removed)).toBeVisible();
  });

  it("says when the filters find none", async () => {
    await renderTable({ q: "nothing like this" });
    await expect.element(page.getByText(copy.noneFound)).toBeVisible();
  });

  it("puts an event's owner and doc fields in their cells, which Cancel takes away", async () => {
    await renderTable();
    await page.getByRole("button", { name: copy.editLabel("AI risk talk") }).click();
    const talk = row("AI risk talk");
    const owner = talk.getByRole("combobox", { name: copy.owner });
    await expect.element(owner).toHaveValue("");
    await expect.element(owner).toHaveFocus();
    // No owner can't be chosen back.
    await expect.element(talk.getByRole("option", { name: copy.noOwner })).toBeDisabled();
    await expect
      .element(talk.getByRole("textbox", { name: copy.docField }))
      .toHaveAttribute("placeholder", copy.docPlaceholder);
    // In their columns, in place of what they show.
    const cells = talk.element().querySelectorAll("td");
    expect(cells[5].querySelector("select")).not.toBeNull();
    expect(cells[6].querySelector("input")).not.toBeNull();
    expect(cells[5].querySelector("[class*=missing]")).toBeNull();
    // Only one at a time: another's Edit closes this.
    await page.getByRole("button", { name: copy.editLabel("PauseAI London: Protest at Parliament") }).click();
    await expect.element(owner).not.toBeInTheDocument();
    await expect
      .element(row("Protest at Parliament").getByRole("combobox", { name: copy.owner }))
      .toHaveValue("joseph@pauseai.uk");
    await expect
      .element(row("Protest at Parliament").getByRole("textbox", { name: copy.docField }))
      .toHaveValue("https://docs.google.com/document/d/example-protest-plan/edit");
    await expect.element(page.getByRole("option", { name: copy.noOwner })).not.toBeInTheDocument();
    await page.getByRole("button", { name: copy.cancel }).click();
    await expect.element(page.getByRole("form")).not.toBeInTheDocument();
    await expect.element(row("Protest at Parliament").getByText("joseph@pauseai.uk")).toBeVisible();
  });

  it("saves the owner and doc together, only a link to Google, then closes", async () => {
    const save = vi.fn(async (form: FormData) => ({ emailed: [], owner: form.get("owner") as string }));
    await renderTable({}, save);
    await page.getByRole("button", { name: copy.editLabel("AI risk talk") }).click();
    await page.getByRole("combobox").selectOptions("sean@pauseai.uk");
    // Anywhere else, the browser won't send it.
    await page.getByRole("textbox").fill("https://example.com/plan");
    await page.getByRole("button", { name: copy.save }).click();
    expect(save).not.toHaveBeenCalled();
    const doc = "https://docs.google.com/document/d/abc/edit";
    await page.getByRole("textbox").fill(doc);
    await page.getByRole("button", { name: copy.save }).click();
    await vi.waitFor(() => expect(save).toHaveBeenCalledOnce());
    const form = save.mock.calls[0][0];
    expect([form.get("eventId"), form.get("owner"), form.get("doc")]).toEqual([
      "evt-oxford-talk",
      "sean@pauseai.uk",
      doc,
    ]);
    await expect.element(page.getByRole("form")).not.toBeInTheDocument();
    // Emailing no one, it says nothing.
    expect(status().textContent).toBe("");
  });

  it("says whom a save emailed, over the table, till its × closes it", async () => {
    const save = async () => ({ emailed: ["sean@pauseai.uk", "joseph@pauseai.uk"], owner: "sean@pauseai.uk" });
    await renderTable({}, save);
    await page.getByRole("button", { name: copy.editLabel("AI risk talk") }).click();
    await page.getByRole("combobox").selectOptions("sean@pauseai.uk");
    await page.getByRole("button", { name: copy.save }).click();
    await vi.waitFor(() =>
      expect(status().textContent).toContain(copy.emailed(["sean@pauseai.uk", "joseph@pauseai.uk"], "sean@pauseai.uk")),
    );
    await page.getByRole("button", { name: copy.closeEmailed }).click();
    await expect.element(page.getByRole("button", { name: copy.closeEmailed })).not.toBeInTheDocument();
    expect(status().textContent).toBe("");
  });
});

describe("EventTabs", () => {
  it("leads to Future and Past, keeping the filters but the sort and page, the tab it's on marked", async () => {
    await render(
      <EventTabs search={exampleEventsTab({ when: "past", tag: "London", sort: "going", page: "2" }).search} />,
    );
    await expect
      .element(page.getByRole("link", { name: copy.tabs.future }))
      .toHaveAttribute("href", "/staff/events?tag=London");
    const past = page.getByRole("link", { name: copy.tabs.past });
    await expect.element(past).toHaveAttribute("href", "/staff/events?when=past&tag=London");
    await expect.element(past).toHaveAttribute("aria-current", "page");
  });

  it("is on Future with no tab chosen", async () => {
    await render(<EventTabs search={exampleEventsTab().search} />);
    await expect.element(page.getByRole("link", { name: copy.tabs.future })).toHaveAttribute("aria-current", "page");
  });
});

describe("EventFilters", () => {
  const choices = { staff: exampleStaff, tags: ["Big events", "London"], cities: ["London", "Oxford"] };

  it("offers a filter by tag, place, owner, what it lacks, and taken off Luma, each chosen as a chip, keeping the tab", async () => {
    const { search } = exampleEventsTab({ when: "past", tag: "London", place: "!online", owner: "none" });
    await render(<EventFilters search={search} choices={choices} />);
    await expect.element(page.getByRole("searchbox", { name: copy.filters.search })).toBeVisible();
    // A chip each, by its words.
    const bar = document.querySelector("[class*=bar]")!.textContent;
    for (const words of ["London", staffCopy.filters.notChip(copy.filters.place, copy.online), copy.noOwner]) {
      expect(bar).toContain(words);
    }
    // Clearing them keeps the tab.
    await expect
      .element(page.getByRole("link", { name: staffCopy.resetFilters }))
      .toHaveAttribute("href", "/staff/events?when=past");
    // + Filter offers every one; a tag only those not chosen.
    const offered = document.getElementById("filter-add")!.textContent;
    for (const label of [copy.filters.tag, copy.filters.place, copy.owner, copy.filters.missing, copy.removed]) {
      expect(offered).toContain(label);
    }
    expect(offered).toContain("Big events");
  });

  it("says the search and filters that are on, in words", () => {
    const { search } = exampleEventsTab({ q: "talk", missing: "doc", removed: "yes" });
    expect(eventWords(search, choices)).toEqual([
      `${staffCopy.search} talk`,
      `${copy.filters.missing} ${copy.filters.missingWhat.doc}`,
      `${copy.removed} ${copy.filters.removed.yes}`,
    ]);
  });
});

describe("EventsSource", () => {
  it("says the events come from Luma, leading to its import's page", async () => {
    await render(<EventsSource />);
    await expect.element(page.getByText(`${copy.source.label} ${copy.source.link}`)).toBeVisible();
    await expect
      .element(page.getByRole("link", { name: copy.source.link }))
      .toHaveAttribute("href", "/staff/import-data/luma");
  });
});
