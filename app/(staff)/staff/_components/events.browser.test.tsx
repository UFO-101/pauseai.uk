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

/** An event's edit bubble's form, and its fields and buttons. */
const bubble = (name: string) => {
  const form = page.getByRole("form", { name: copy.editLabel(name) });
  return {
    form,
    owner: form.getByLabelText(copy.owner),
    doc: form.getByLabelText(copy.docField),
    save: form.getByRole("button", { name: copy.save }),
    cancel: form.getByRole("button", { name: copy.cancel }),
  };
};
/** Whether a form's bubble is open. */
const open = (label: string) =>
  document.querySelector(`form[aria-label="${label}"]`)!.closest("[popover]")!.matches(":popover-open");
/** The text of a row's cells, but its Edit's, whose bubble holds a form. */
const cells = (name: string) =>
  [...row(name).element().querySelectorAll("td")].slice(0, -1).map((td) => td.textContent);

describe("EventsTable", () => {
  it("lists those to come, soonest first, each with its day, name, place, tags, who's going, owner and doc", async () => {
    await renderTable();
    await expect.element(page.getByText(copy.total(2))).toBeVisible();
    expect(names()).toEqual(["PauseAI London: Protest at Parliament", "AI risk talk"]);
    const headings = [...document.querySelectorAll("thead th")].map((th) => th.textContent!.replace(/[▲▼ ]+$/, ""));
    expect(headings).toEqual([
      copy.columns.when,
      copy.columns.name,
      copy.columns.place,
      copy.columns.tags,
      copy.columns.going,
      copy.owner,
      copy.doc,
      "",
    ]);
    expect(cells("Protest at Parliament")).toEqual([
      "21 Nov 2026",
      "PauseAI London: Protest at Parliament",
      "London",
      "Big eventsLondon",
      "42",
      "joseph@pauseai.uk",
      copy.doc,
    ]);
    const protest = row("Protest at Parliament");
    await expect
      .element(protest.getByRole("link", { name: "PauseAI London: Protest at Parliament" }))
      .toHaveAttribute("href", "https://luma.com/evt-protest");
    await expect
      .element(protest.getByRole("link", { name: copy.doc }))
      .toHaveAttribute("href", "https://docs.google.com/document/d/example-protest-plan/edit");
    // To come with no owner or doc: errors.
    await expect.element(row("AI risk talk").getByRole("cell").nth(5).getByText(copy.noOwner)).toHaveClass(/missing/);
    await expect.element(row("AI risk talk").getByText(copy.noDoc)).toHaveClass(/missing/);
    // Sorted by when, soonest first: its heading says so, and leads to the other way; the doc's sorts too.
    const when = th(copy.columns.when);
    expect(when.getAttribute("aria-sort")).toBe("ascending");
    expect(when.querySelector("a")!.getAttribute("href")).toBe("/staff/events?sort=start&dir=desc");
    expect(th(copy.columns.going).querySelector("a")!.getAttribute("href")).toBe("/staff/events?sort=going&dir=desc");
    expect(th(copy.doc).querySelector("a")!.getAttribute("href")).toBe("/staff/events?sort=doc&dir=asc");
    expect(th(copy.columns.tags).querySelector("a")).toBeNull();
    // Only Edit on each; its bubble shut.
    expect(page.getByRole("button", { name: copy.edit, exact: true }).all()).toHaveLength(2);
    expect(open(copy.editLabel("AI risk talk"))).toBe(false);
  });

  it("lists those past, latest first, what they lack only said, and leaves out those taken off Luma", async () => {
    await renderTable({ when: "past" });
    expect(names()).toEqual(["Lobbying your MP (online training)", "PauseAI London March"]);
    expect(cells("online training")[2]).toBe(copy.online);
    await expect.element(row("London March").getByText(copy.noDoc)).not.toHaveClass(/missing/);
    const when = th(copy.columns.when);
    expect(when.getAttribute("aria-sort")).toBe("descending");
    // Its links keep the tab.
    expect(when.querySelector("a")!.getAttribute("href")).toBe("/staff/events?when=past&sort=start&dir=asc");
  });

  it("lists only those taken off Luma, when asked, marked, what they lack only said", async () => {
    await renderTable({ when: "past", removed: "yes" });
    expect(names()).toEqual(["PauseAI Manchester Social"]);
    await expect.element(row("Manchester Social").getByText(copy.removed)).toBeVisible();
    await expect
      .element(row("Manchester Social").getByRole("cell").nth(5).getByText(copy.noOwner))
      .not.toHaveClass(/missing/);
    await expect.element(row("Manchester Social").getByText(copy.noDoc)).not.toHaveClass(/missing/);
  });

  it("doesn't call one to come with no owner an error once it's been taken off Luma", async () => {
    const [soon] = exampleEvents;
    const found = { events: [{ ...soon, owner: null, removed: true }], total: 1, pages: 1, removed: 0 };
    const { search } = exampleEventsTab({ removed: "yes" });
    await render(
      <EventsTable found={found} search={search} staff={exampleStaff} now={exampleEventsNow} save={noAction} />,
    );
    await expect.element(row("Protest").getByRole("cell").nth(5).getByText(copy.noOwner)).not.toHaveClass(/missing/);
    await expect.element(row("Protest").getByText(copy.removed)).toBeVisible();
  });

  it("leads to its other pages, keeping the tab and filters", async () => {
    const { search } = exampleEventsTab({ when: "past", tag: "London" });
    const found = { events: exampleEvents, total: 150, pages: 2, removed: 0 };
    await render(
      <EventsTable found={found} search={search} staff={exampleStaff} now={exampleEventsNow} save={noAction} />,
    );
    await expect
      .element(page.getByRole("link", { name: staffCopy.paging.next }))
      .toHaveAttribute("href", "/staff/events?when=past&tag=London&page=2");
  });

  it("says when the filters find none, and leads to a search's matches among those taken off Luma", async () => {
    await renderTable({ q: "nothing like this" });
    await expect.element(page.getByText(copy.noneFound)).toBeVisible();
    expect(page.getByRole("link", { name: copy.removedMatches(1) }).all()).toHaveLength(0);
    await renderTable({ when: "past", q: "social" });
    await expect
      .element(page.getByRole("link", { name: copy.removedMatches(1) }))
      .toHaveAttribute("href", "/staff/events?when=past&q=social&removed=yes");
  });

  it("opens a bubble from Edit with its owner and doc, Save off till one changes, Cancel closing it as it was", async () => {
    await renderTable();
    await row("AI risk talk").getByRole("button", { name: copy.edit }).click();
    const { form, owner, doc, save, cancel } = bubble("AI risk talk");
    await expect.element(form).toBeVisible();
    await expect.element(owner).toHaveValue("");
    // No owner can't be chosen back.
    await expect.element(form.getByRole("option", { name: copy.noOwner })).toBeDisabled();
    await expect.element(doc).toHaveAttribute("placeholder", copy.docPlaceholder);
    await expect.element(save).toBeDisabled();
    await doc.fill("https://docs.google.com/document/d/abc/edit");
    await expect.element(save).toBeEnabled();
    // Back as it was, off again.
    await doc.fill("");
    await expect.element(save).toBeDisabled();
    await owner.selectOptions("sean@pauseai.uk");
    await expect.element(save).toBeEnabled();
    await cancel.click();
    await expect.poll(() => open(copy.editLabel("AI risk talk"))).toBe(false);
    // Opened again, as it was.
    await row("AI risk talk").getByRole("button", { name: copy.edit }).click();
    await expect.element(owner).toHaveValue("");
    await expect.element(save).toBeDisabled();
    // The table didn't change.
    expect(cells("AI risk talk")[5]).toBe(copy.noOwner);
  });

  it("begins with the owner and doc it has", async () => {
    await renderTable();
    await row("Protest at Parliament").getByRole("button", { name: copy.edit }).click();
    const { form, owner, doc } = bubble("PauseAI London: Protest at Parliament");
    await expect.element(owner).toHaveValue("joseph@pauseai.uk");
    await expect.element(doc).toHaveValue("https://docs.google.com/document/d/example-protest-plan/edit");
    await expect.element(form.getByRole("option", { name: copy.noOwner })).not.toBeInTheDocument();
  });

  it("saves the owner and doc together, only a link to Google, then closes", async () => {
    const save = vi.fn(async (form: FormData) => ({ emailed: [], owner: form.get("owner") as string }));
    await renderTable({}, save);
    await row("AI risk talk").getByRole("button", { name: copy.edit }).click();
    const fields = bubble("AI risk talk");
    await fields.owner.selectOptions("sean@pauseai.uk");
    // Anywhere else, the browser won't send it.
    await fields.doc.fill("https://example.com/plan");
    await fields.save.click();
    expect(save).not.toHaveBeenCalled();
    const doc = "https://docs.google.com/document/d/abc/edit";
    await fields.doc.fill(doc);
    await fields.save.click();
    await vi.waitFor(() => expect(save).toHaveBeenCalledOnce());
    const form = save.mock.calls[0][0];
    expect([form.get("eventId"), form.get("owner"), form.get("doc")]).toEqual([
      "evt-oxford-talk",
      "sean@pauseai.uk",
      doc,
    ]);
    await expect.poll(() => open(copy.editLabel("AI risk talk"))).toBe(false);
    // Emailing no one, it says nothing.
    expect(status().textContent).toBe("");
  });

  it("says whom a save emailed, over the table, till its × closes it", async () => {
    const save = async () => ({ emailed: ["sean@pauseai.uk", "joseph@pauseai.uk"], owner: "sean@pauseai.uk" });
    await renderTable({}, save);
    await row("AI risk talk").getByRole("button", { name: copy.edit }).click();
    const fields = bubble("AI risk talk");
    await fields.owner.selectOptions("sean@pauseai.uk");
    await fields.save.click();
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

  it("offers a filter by place, tag, owner, and taken off Luma, each chosen as a chip, keeping the tab", async () => {
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
    for (const label of [copy.filters.place, copy.filters.tag, copy.owner, copy.removed]) {
      expect(offered).toContain(label);
    }
    expect(offered).toContain("Big events");
  });

  it("says the search and filters that are on, in words", () => {
    const { search } = exampleEventsTab({ q: "talk", owner: "none", removed: "yes" });
    expect(eventWords(search, choices)).toEqual([
      `${staffCopy.search} talk`,
      `${copy.owner} ${copy.noOwner}`,
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
