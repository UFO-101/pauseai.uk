import { describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";
import { page, userEvent } from "vitest/browser";
import { Button } from "./Button";
import { Checkbox, DateRange, FileInput, Segmented, Select, TextArea, TextInput } from "./Controls";
import { Field, FieldError, FieldGroup, FieldSet, Hint, Label } from "./Field";
import { FilterForm, FormStack } from "./Form";

const style = (element: Element) => getComputedStyle(element);

describe("Field and Label", () => {
  it("names the control inside it by its label, in a place given by a class", async () => {
    await render(
      <>
        <Field label="Email">
          <TextInput name="email" />
        </Field>
        <Field label="Name" className="wide">
          <TextInput name="name" />
        </Field>
      </>,
    );
    await expect.element(page.getByRole("textbox", { name: "Email" })).toBeVisible();
    const name = page.getByRole("textbox", { name: "Name" }).element();
    expect(name.closest("label")!.classList.contains("wide")).toBe(true);
    expect(style(page.getByText("Email").element()).fontWeight).toBe("600");
  });

  it("labels a control elsewhere, with a note, or heads a group of buttons", async () => {
    await render(
      <>
        <Label htmlFor="title" note="(optional)">
          Title
        </Label>
        <TextInput id="title" />
        <Label id="size-label">Size</Label>
      </>,
    );
    await expect.element(page.getByRole("textbox", { name: /^Title ?\(optional\)$/ })).toBeVisible();
    const note = page.getByText("(optional)").element();
    expect(style(note).fontWeight).toBe("400");
    const group = page.getByText("Size").element();
    expect(group.tagName).toBe("SPAN");
    expect(group.id).toBe("size-label");
  });

  it("groups a field with a hint and an error, the error read out only when asked", async () => {
    await render(
      <FieldGroup>
        <Field label="Postcode">
          <TextInput aria-describedby="hint" aria-invalid />
        </Field>
        <Hint id="hint">Where you live.</Hint>
        <FieldError>Not found.</FieldError>
        <FieldError announce="alert">Try again.</FieldError>
        <FieldError announce="status">Checking.</FieldError>
      </FieldGroup>,
    );
    await expect
      .element(page.getByRole("textbox", { name: "Postcode" }))
      .toHaveAccessibleDescription("Where you live.");
    expect(page.getByText("Not found.").element().getAttribute("role")).toBeNull();
    await expect.element(page.getByRole("alert")).toHaveTextContent("Try again.");
    await expect.element(page.getByRole("status")).toHaveTextContent("Checking.");
    const error = style(page.getByText("Not found.").element());
    expect(error.borderLeftStyle).toBe("solid");
    expect(error.color).not.toBe(style(page.getByText("Where you live.").element()).color);
    const invalid = page.getByRole("textbox", { name: "Postcode" }).element();
    expect(style(invalid).borderColor).toBe(error.color);
  });
});

describe("the controls", () => {
  it("are the density's height, with 16px text, and fade while disabled", async () => {
    await page.viewport(1280, 800);
    await render(
      <>
        <TextInput aria-label="Text" />
        <Select aria-label="Pick">
          <option>One</option>
        </Select>
        <TextArea aria-label="Words" />
        <TextInput aria-label="Off" disabled />
        <FileInput aria-label="Photo" />
      </>,
    );
    for (const control of [page.getByRole("textbox", { name: "Text" }), page.getByRole("combobox", { name: "Pick" })]) {
      expect(control.element().getBoundingClientRect().height).toBe(48);
      expect(style(control.element()).fontSize).toBe("16px");
    }
    expect(page.getByRole("textbox", { name: "Words" }).element().getBoundingClientRect().height).toBe(96);
    expect(style(page.getByRole("textbox", { name: "Off" }).element()).opacity).toBe("0.6");
    expect(page.getByLabelText("Photo").element().getAttribute("type")).toBe("file");
  });

  it("are tighter at the compact density, but keep 16px text on a phone", async () => {
    await page.viewport(1280, 800);
    await render(
      <div data-density="compact">
        <TextInput aria-label="Text" />
      </div>,
    );
    const input = page.getByRole("textbox", { name: "Text" }).element();
    expect(input.getBoundingClientRect().height).toBe(36);
    expect(style(input).fontSize).toBe("14px");
    await page.viewport(400, 800);
    expect(style(input).fontSize).toBe("16px");
  });

  it("show the orange focus ring from the keyboard", async () => {
    await render(<TextInput aria-label="Text" />);
    await userEvent.keyboard("{Tab}");
    const input = page.getByRole("textbox", { name: "Text" }).element();
    expect(document.activeElement).toBe(input);
    expect(style(input).outlineStyle).toBe("solid");
    expect(style(input).outlineWidth).toBe("2px");
  });

  it("tick a checkbox by its label, saying whether it's ticked", async () => {
    const onChange = vi.fn();
    await render(
      <Checkbox id="consent" name="consent" checked={false} onChange={onChange}>
        Keep me updated
      </Checkbox>,
    );
    await page.getByText("Keep me updated").click();
    expect(onChange).toHaveBeenCalledWith(true);
    expect(page.getByRole("checkbox", { name: "Keep me updated" }).element().getAttribute("name")).toBe("consent");
  });

  it("line a checkbox up with the middle of its label's first line, at either density", async () => {
    await page.viewport(400, 800);
    await render(
      <>
        <Checkbox checked={false} onChange={() => {}}>
          Comfortable, with a label long enough to run on to a second line on a phone
        </Checkbox>
        <div data-density="compact">
          <Checkbox checked={false} onChange={() => {}}>
            Compact, with a label long enough to run on to a second line on a phone
          </Checkbox>
        </div>
      </>,
    );
    for (const name of [/^Comfortable/, /^Compact/]) {
      const box = page.getByRole("checkbox", { name }).element().getBoundingClientRect();
      const words = page.getByText(name).element();
      const range = document.createRange();
      range.selectNodeContents(words);
      const lines = [...range.getClientRects()];
      expect(lines.length).toBeGreaterThan(1);
      const lineHeight = parseFloat(getComputedStyle(words).lineHeight);
      const firstLineMiddle = lines[0].top + lines[0].height / 2;
      expect(Math.abs(box.top + box.height / 2 - (words.getBoundingClientRect().top + lineHeight / 2))).toBeLessThan(1);
      expect(Math.abs(box.top + box.height / 2 - firstLineMiddle)).toBeLessThan(2);
    }
  });

  it("pick one of a row of choices", async () => {
    const onChange = vi.fn();
    await render(
      <Segmented
        label="Size"
        options={[
          { value: "s", label: "Small" },
          { value: "l", label: "Large" },
        ]}
        value="s"
        onChange={onChange}
      />,
    );
    await expect.element(page.getByRole("radiogroup", { name: "Size" })).toBeVisible();
    await expect.element(page.getByRole("radio", { name: "Small" })).toHaveAttribute("aria-checked", "true");
    await expect.element(page.getByRole("radio", { name: "Large" })).toHaveAttribute("aria-checked", "false");
    await page.getByRole("radio", { name: "Large" }).click();
    expect(onChange).toHaveBeenCalledWith("l");
  });
});

describe("FormStack and FilterForm", () => {
  it("are forms, a column of fields and a row of filters, passing their attributes and a layout class on", async () => {
    await render(
      <>
        <FormStack aria-label="Fields" method="post" className="placed" />
        <FormStack aria-label="Plain" />
        <FilterForm aria-label="Filters" method="get" className="placed" />
        <FilterForm aria-label="Plain filters" />
      </>,
    );
    const fields = page.getByRole("form", { name: "Fields" }).element();
    const filters = page.getByRole("form", { name: "Filters" }).element();
    expect(fields.getAttribute("method")).toBe("post");
    expect(filters.getAttribute("method")).toBe("get");
    expect(fields.classList.contains("placed")).toBe(true);
    expect(filters.classList.contains("placed")).toBe(true);
    expect(style(fields).display).toBe("grid");
    expect(style(filters).flexDirection).toBe("row");
    expect(page.getByRole("form", { name: "Plain" }).element().className).not.toContain("placed");
    expect(page.getByRole("form", { name: "Plain filters" }).element().className).not.toContain("placed");
  });

  it("lines up a compact row's select, search box and small button: one height, one bottom", async () => {
    await page.viewport(1280, 800);
    await render(
      <div data-density="compact">
        <FilterForm aria-label="Filters">
          <Field label="Status">
            <Select name="status">
              <option>Any</option>
            </Select>
          </Field>
          <Field label="Search">
            <TextInput type="search" name="q" />
          </Field>
          <Button variant="primary" size="small" type="submit">
            Filter
          </Button>
        </FilterForm>
      </div>,
    );
    const boxes = [
      page.getByRole("combobox", { name: "Status" }),
      page.getByRole("searchbox", { name: "Search" }),
      page.getByRole("button", { name: "Filter" }),
    ].map((control) => control.element().getBoundingClientRect());
    const button = boxes[2];
    expect(boxes.map((box) => Math.round(box.height))).toEqual(
      [button.height, button.height, button.height].map(Math.round),
    );
    expect(boxes.map((box) => Math.round(box.bottom))).toEqual(
      [button.bottom, button.bottom, button.bottom].map(Math.round),
    );
  });
});

describe("FieldSet and DateRange", () => {
  it("names a pair of dates, each with its own name and label, side by side", async () => {
    await page.viewport(1280, 800);
    await render(
      <form aria-label="Dates">
        <FieldSet label="Signed up">
          <DateRange
            from={{ name: "from", defaultValue: "2026-01-01", "aria-label": "Signed up from" }}
            to={{ name: "to", "aria-label": "Signed up to" }}
          />
        </FieldSet>
      </form>,
    );
    await expect.element(page.getByRole("group", { name: "Signed up" })).toBeVisible();
    const from = page.getByRole("button", { name: "Signed up from" }).element();
    const to = page.getByRole("button", { name: "Signed up to" }).element();
    expect([from.textContent, to.textContent]).toEqual(["Thu 1 Jan 2026", "Choose a day"]);
    const form = new FormData(page.getByRole("form", { name: "Dates" }).element() as HTMLFormElement);
    expect([form.get("from"), form.get("to")]).toEqual(["2026-01-01", ""]);
    expect(Math.round(from.getBoundingClientRect().top)).toBe(Math.round(to.getBoundingClientRect().top));
  });
});
