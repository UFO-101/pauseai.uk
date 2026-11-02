import { describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";
import { page } from "vitest/browser";
import { staffCopy } from "@/lib/content/staff-interface";
import EventEdit from "./EventEdit";
import EventsOverview, { EventsSource } from "./EventsOverview";
import { exampleEventGroups, exampleEventsNow, exampleStaff } from "./EventsOverview.examples";

const copy = staffCopy.events;
const noAction = async () => {};

describe("EventsOverview", () => {
  const row = (name: string) => page.getByRole("listitem").filter({ hasText: name });

  it("groups them, coming up and then by month and year, each with when, its owner, where, who's going and its tags", async () => {
    await render(
      <EventsOverview groups={exampleEventGroups} staff={exampleStaff} now={exampleEventsNow} save={noAction} />,
    );
    expect(
      page
        .getByRole("heading", { level: 2 })
        .all()
        .map((h) => h.element().textContent),
    ).toEqual(["Coming up", "October 2026", "2025"]);
    await expect
      .element(page.getByRole("link", { name: "PauseAI London: Protest at Parliament" }))
      .toHaveAttribute("href", "https://luma.com/evt-protest");
    await expect.element(row("Protest at Parliament")).toMatchTextContent("Sat 21 Nov 2026, 13:00");
    await expect.element(row("Protest at Parliament")).toMatchTextContent(`London · ${copy.going(42)}`);
    await expect.element(row("online training")).toMatchTextContent(`${copy.online} · ${copy.going(18)}`);
    await expect.element(row("Manchester Social")).toMatchTextContent(copy.removed);
    await expect.element(row("Protest at Parliament")).not.toMatchTextContent(copy.removed);
    // Its owner, by their name, the whole address on hover.
    await expect
      .element(row("Protest at Parliament").getByText("joseph", { exact: true }))
      .toHaveAttribute("title", "joseph@pauseai.uk");
    // With no owner: an error, with its warning, on one coming up, and only said on one past.
    await expect.element(row("AI risk talk").getByText(copy.noOwner)).toHaveClass(/noOwner/);
    await expect.element(row("Manchester Social").getByText(copy.noOwner)).not.toHaveClass(/noOwner/);
    // Its Luma tags, by its name; none where it has none.
    await expect.element(row("Protest at Parliament").getByText("Big events", { exact: true })).toBeVisible();
    await expect.element(row("AI risk talk").getByText("Oxford", { exact: true })).toBeVisible();
    await expect.element(row("Manchester Social").getByText("Big events", { exact: true })).not.toBeInTheDocument();
    // A doc, linked under its name, only where there is one.
    await expect
      .element(row("Protest at Parliament").getByRole("link", { name: copy.doc }))
      .toHaveAttribute("href", "https://docs.google.com/document/d/example-protest-plan/edit");
    await expect.element(row("AI risk talk").getByRole("link", { name: copy.doc })).not.toBeInTheDocument();
    // No forms, only an Edit button on each.
    expect(page.getByRole("button", { name: copy.edit }).all()).toHaveLength(5);
    expect(document.querySelectorAll("form")).toHaveLength(0);
  });

  it("doesn't call an event coming up with no owner an error once it's been taken off Luma", async () => {
    const [soon] = exampleEventGroups[0].items;
    const groups = [{ ...exampleEventGroups[0], items: [{ ...soon, owner: null, removed: true }] }];
    await render(<EventsOverview groups={groups} staff={exampleStaff} now={exampleEventsNow} save={noAction} />);
    await expect.element(page.getByText(copy.noOwner)).not.toHaveClass(/noOwner/);
    await expect.element(page.getByText(copy.removed)).toBeVisible();
  });

  it("says when there are none", async () => {
    await render(<EventsOverview groups={[]} staff={exampleStaff} now={exampleEventsNow} save={noAction} />);
    await expect.element(page.getByText(copy.none)).toBeVisible();
  });
});

describe("EventEdit", () => {
  const event = { id: "evt-1", name: "AI risk talk", owner: null, doc: null };

  it("opens a form for its owner and Google Doc, which Cancel closes", async () => {
    await render(<EventEdit event={event} staff={exampleStaff} save={noAction} />);
    await page.getByRole("button", { name: copy.editLabel("AI risk talk") }).click();
    const form = page.getByRole("form", { name: copy.editLabel("AI risk talk") });
    await expect.element(form.getByLabelText(copy.owner)).toHaveValue("");
    await expect.element(form.getByLabelText(copy.owner)).toHaveFocus();
    // No owner can't be chosen back.
    await expect.element(page.getByRole("option", { name: copy.noOwner })).toBeDisabled();
    await expect.element(form.getByLabelText(copy.docField)).toHaveAttribute("placeholder", copy.docPlaceholder);
    await expect.element(page.getByRole("button", { name: copy.editLabel("AI risk talk") })).not.toBeInTheDocument();
    await page.getByRole("button", { name: copy.cancel }).click();
    await expect.element(form).not.toBeInTheDocument();
    await expect.element(page.getByRole("button", { name: copy.editLabel("AI risk talk") })).toBeVisible();
  });

  it("saves the owner and doc together, only a link to Google, then closes", async () => {
    const save = vi.fn<(form: FormData) => void>();
    await render(<EventEdit event={event} staff={exampleStaff} save={save} />);
    await page.getByRole("button", { name: copy.editLabel("AI risk talk") }).click();
    await page.getByLabelText(copy.owner).selectOptions("sean@pauseai.uk");
    // Anywhere else, the browser won't send it.
    await page.getByLabelText(copy.docField).fill("https://example.com/plan");
    await page.getByRole("button", { name: copy.save }).click();
    expect(save).not.toHaveBeenCalled();
    const doc = "https://docs.google.com/document/d/abc/edit";
    await page.getByLabelText(copy.docField).fill(doc);
    await page.getByRole("button", { name: copy.save }).click();
    await vi.waitFor(() => expect(save).toHaveBeenCalledOnce());
    const form = save.mock.calls[0][0];
    expect([form.get("eventId"), form.get("owner"), form.get("doc")]).toEqual(["evt-1", "sean@pauseai.uk", doc]);
    await expect.element(page.getByRole("form")).not.toBeInTheDocument();
  });

  it("begins with the owner and doc it has", async () => {
    const doc = "https://docs.google.com/document/d/abc/edit";
    await render(
      <EventEdit event={{ ...event, owner: "joseph@pauseai.uk", doc }} staff={exampleStaff} save={noAction} />,
    );
    await page.getByRole("button", { name: copy.editLabel("AI risk talk") }).click();
    await expect.element(page.getByLabelText(copy.owner)).toHaveValue("joseph@pauseai.uk");
    await expect.element(page.getByLabelText(copy.docField)).toHaveValue(doc);
    await expect.element(page.getByRole("option", { name: copy.noOwner })).not.toBeInTheDocument();
  });
});

describe("EventsSource", () => {
  it("says the events are imported hourly from Luma, leading to the import's page", async () => {
    await render(<EventsSource />);
    await expect.element(page.getByText(/These are .* from Luma\./)).toBeVisible();
    await expect
      .element(page.getByRole("link", { name: copy.intro.link }))
      .toHaveAttribute("href", "/staff/import-data/luma");
  });
});
