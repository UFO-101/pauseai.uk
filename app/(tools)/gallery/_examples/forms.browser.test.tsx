// The forms group's examples work, and show each at both densities.
import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { page } from "vitest/browser";
import Densities from "../_components/Densities";
import { CheckboxExample, LinkButtonExample, SegmentedExample, StatusMessageUndoExample } from "./forms.client";

const value = () => page.getByText(/^Value: /);
const log = () => page.getByRole("list", { name: "Event log" }).getByRole("listitem");

describe("Densities", () => {
  it("shows an example twice, comfortable and then compact", async () => {
    await render(<Densities>{(density) => <p>An example, {density}</p>}</Densities>);
    await expect.element(page.getByText("Comfortable")).toBeVisible();
    const compact = page.getByText("An example, compact").element();
    expect(compact.closest("[data-density]")!.getAttribute("data-density")).toBe("compact");
    expect(page.getByText("An example, comfortable").element().closest("[data-density]")).toBeNull();
  });
});

describe("the forms group's examples", () => {
  it("ticks and unticks", async () => {
    await render(<CheckboxExample />);
    await page.getByRole("checkbox", { name: "An example option", exact: true }).click();
    await expect.element(value()).toHaveTextContent("Value: false");
    await page.getByRole("checkbox", { name: /long label/ }).click();
    await expect.element(value()).toHaveTextContent("Value: true");
  });

  it("picks a segment", async () => {
    await render(<SegmentedExample />);
    await page.getByRole("radio", { name: "Large" }).click();
    await expect.element(value()).toHaveTextContent('Value: "l"');
  });

  it("presses the link button", async () => {
    await render(<LinkButtonExample />);
    await page.getByRole("button", { name: "Remove" }).click();
    await expect.element(log().nth(0)).toMatchTextContent(/^onClick\(/);
  });

  it("undoes from a message", async () => {
    await render(<StatusMessageUndoExample />);
    await page.getByRole("button", { name: "Undo" }).click();
    await expect.element(log().nth(0)).toMatchTextContent(/^onUndo\(/);
  });
});
