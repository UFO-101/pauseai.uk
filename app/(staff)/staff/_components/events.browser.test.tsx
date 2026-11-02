import { describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";
import { page } from "vitest/browser";
import { staffCopy } from "@/lib/content/staff-interface";
import EventDoc from "./EventDoc";
import EventOwner from "./EventOwner";
import EventsOverview, { EventsSource } from "./EventsOverview";
import { exampleEventGroups, exampleEventsNow, exampleStaff } from "./EventsOverview.examples";

const copy = staffCopy.events;
const noAction = async () => {};

describe("EventsOverview", () => {
  const row = (name: string) => page.getByRole("listitem").filter({ hasText: name });

  it("groups them, coming up and then by month and year, each with when, where, who's going and its owner", async () => {
    await render(
      <EventsOverview
        groups={exampleEventGroups}
        staff={exampleStaff}
        now={exampleEventsNow}
        setOwner={noAction}
        setDoc={noAction}
      />,
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
    // Its Luma tags, by its name; none where it has none.
    await expect.element(row("Protest at Parliament").getByText("Big events", { exact: true })).toBeVisible();
    await expect.element(row("AI risk talk").getByText("Oxford", { exact: true })).toBeVisible();
    await expect.element(row("Manchester Social").getByText("Big events", { exact: true })).not.toBeInTheDocument();
    await expect.element(row("Protest at Parliament")).not.toMatchTextContent(copy.removed);
    await expect
      .element(page.getByRole("combobox", { name: copy.ownerLabel("PauseAI London: Protest at Parliament") }))
      .toHaveValue("joseph@pauseai.uk");
    // With no owner: an error on one coming up, and only said on one past.
    await expect.element(page.getByRole("combobox", { name: copy.ownerLabel("AI risk talk") })).toBeInvalid();
    await expect
      .element(page.getByRole("combobox", { name: copy.ownerLabel("PauseAI Manchester Social") }))
      .not.toBeInvalid();
    await expect.element(row("Manchester Social")).toMatchTextContent(copy.noOwner);
    // A doc, linked by its name, only where there is one; the box for one on every row.
    await expect
      .element(row("Protest at Parliament").getByRole("link", { name: copy.doc }))
      .toHaveAttribute("href", "https://docs.google.com/document/d/example-protest-plan/edit");
    await expect.element(row("AI risk talk").getByRole("link", { name: copy.doc })).not.toBeInTheDocument();
    await expect
      .element(page.getByRole("textbox", { name: copy.docLabel("PauseAI London: Protest at Parliament") }))
      .toHaveValue("https://docs.google.com/document/d/example-protest-plan/edit");
  });

  it("doesn't call an event coming up with no owner an error once it's been taken off Luma", async () => {
    const [soon] = exampleEventGroups[0].items;
    const groups = [{ ...exampleEventGroups[0], items: [{ ...soon, owner: null, removed: true }] }];
    await render(
      <EventsOverview
        groups={groups}
        staff={exampleStaff}
        now={exampleEventsNow}
        setOwner={noAction}
        setDoc={noAction}
      />,
    );
    await expect.element(page.getByRole("combobox", { name: copy.ownerLabel(soon.name) })).not.toBeInvalid();
    await expect.element(page.getByText(copy.removed)).toBeVisible();
  });

  it("says when there are none", async () => {
    await render(
      <EventsOverview groups={[]} staff={exampleStaff} now={exampleEventsNow} setOwner={noAction} setDoc={noAction} />,
    );
    await expect.element(page.getByText(copy.none)).toBeVisible();
  });
});

describe("EventOwner", () => {
  it("saves the owner chosen at once, with the event's ID, then shows the owner saved", async () => {
    const setOwner = vi.fn<(form: FormData) => void>();
    const { rerender } = await render(
      <EventOwner
        event={{ id: "evt-1", name: "AI risk talk", owner: null }}
        staff={exampleStaff}
        needed
        setOwner={setOwner}
      />,
    );
    const select = page.getByRole("combobox", { name: copy.ownerLabel("AI risk talk") });
    await expect.element(select).toHaveValue("");
    // No owner can't be chosen back.
    await expect.element(page.getByRole("option", { name: copy.noOwner })).toBeDisabled();
    await select.selectOptions("sean@pauseai.uk");
    await vi.waitFor(() => expect(setOwner).toHaveBeenCalledOnce());
    const form = setOwner.mock.calls[0][0];
    expect([form.get("eventId"), form.get("owner")]).toEqual(["evt-1", "sean@pauseai.uk"]);
    // As the page has it once saved: the form is reset, and shows the new owner, not the first in the list.
    await rerender(
      <EventOwner
        event={{ id: "evt-1", name: "AI risk talk", owner: "sean@pauseai.uk" }}
        staff={exampleStaff}
        needed
        setOwner={setOwner}
      />,
    );
    await expect.element(select).toHaveValue("sean@pauseai.uk");
    await expect.element(select).not.toBeInvalid();
  });
});

describe("EventDoc", () => {
  it("saves the link pasted, only one to Google, then shows the link saved", async () => {
    const setDoc = vi.fn<(form: FormData) => void>();
    const event = { id: "evt-1", name: "AI risk talk", doc: null };
    const { rerender } = await render(<EventDoc event={event} setDoc={setDoc} />);
    const box = page.getByRole("textbox", { name: copy.docLabel("AI risk talk") });
    await expect.element(box).toHaveAttribute("placeholder", copy.docPlaceholder);
    // Anywhere else, the browser won't send it.
    await box.fill("https://example.com/plan");
    await page.getByRole("button", { name: copy.docSave }).click();
    expect(setDoc).not.toHaveBeenCalled();
    const doc = "https://docs.google.com/document/d/abc/edit";
    await box.fill(doc);
    await page.getByRole("button", { name: copy.docSave }).click();
    await vi.waitFor(() => expect(setDoc).toHaveBeenCalledOnce());
    const form = setDoc.mock.calls[0][0];
    expect([form.get("eventId"), form.get("doc")]).toEqual(["evt-1", doc]);
    await rerender(<EventDoc event={{ ...event, doc }} setDoc={setDoc} />);
    await expect.element(box).toHaveValue(doc);
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
