import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { page } from "vitest/browser";
import { Button } from "@/components/ui/Button";
import Actions from "./Actions";
import ErrorText from "./ErrorText";
import { Filters, StaffForm } from "./forms";
import Muted from "./Muted";
import StaffPage from "./StaffPage";
import StaffTable from "./StaffTable";
import Tag from "./Tag";

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
    const div = container.querySelector("h1")!.parentElement!;
    expect(div.tagName).toBe("DIV");
    expect(getComputedStyle(div).paddingTop).toBe("32px");
  });
});

describe("StaffTable", () => {
  it("is a table of its children, scrolling sideways in its box", async () => {
    await render(
      <StaffTable>
        <tbody>
          <tr>
            <td>Cell</td>
          </tr>
        </tbody>
      </StaffTable>,
    );
    const table = page.getByRole("table");
    await expect.element(table.getByRole("cell", { name: "Cell" })).toBeVisible();
    expect(getComputedStyle(table.element().parentElement!).overflowX).toBe("auto");
  });
});

describe("Tag", () => {
  it("is plain without a kind, and coloured by where an import is from or that it's nightly", async () => {
    await render(
      <h2>
        Title <Tag>Plain</Tag>
        <Tag kind="airtable">Airtable</Tag>
        <Tag kind="web">Web</Tag>
        <Tag kind="nightly">Nightly</Tag>
      </h2>,
    );
    const background = (name: string) => getComputedStyle(page.getByText(name).element()).backgroundColor;
    const colours = new Set(["Plain", "Airtable", "Web", "Nightly"].map(background));
    expect(colours.size).toBe(4);
    // After a heading, it sits on the baseline at its own weight.
    expect(getComputedStyle(page.getByText("Plain").element()).verticalAlign).toBe("middle");
  });
});

describe("Muted and ErrorText", () => {
  it("set their text in another colour than the text around it", async () => {
    await render(
      <p>
        Plain <Muted>Muted</Muted> <ErrorText>Wrong</ErrorText>
      </p>,
    );
    const colour = (name: string) => getComputedStyle(page.getByText(name, { exact: true }).element()).color;
    const plain = getComputedStyle(page.getByText("Plain", { exact: false }).element()).color;
    expect(colour("Muted")).not.toBe(plain);
    expect(colour("Wrong")).not.toBe(plain);
    expect(colour("Wrong")).not.toBe(colour("Muted"));
  });
});

describe("Actions", () => {
  it("puts its buttons in a row", async () => {
    await render(
      <Actions>
        <button>One</button>
        <button>Two</button>
      </Actions>,
    );
    const row = page.getByRole("button", { name: "One" }).element().parentElement!;
    expect(getComputedStyle(row).display).toBe("flex");
    await expect.element(page.getByRole("button", { name: "Two" })).toBeVisible();
  });
});

describe("Filters and StaffForm", () => {
  it("are forms, a row of filters and a column of fields, passing their attributes on", async () => {
    await render(
      <>
        <Filters method="get" action="/staff/letters" aria-label="Filters">
          <label>
            Status
            <select name="status" />
          </label>
        </Filters>
        <StaffForm method="post" action="/staff/api/login" aria-label="Fields">
          <label>
            Email
            <input name="email" />
          </label>
        </StaffForm>
      </>,
    );
    const filters = page.getByRole("form", { name: "Filters" }).element();
    const fields = page.getByRole("form", { name: "Fields" }).element();
    expect(filters.getAttribute("method")).toBe("get");
    expect(fields.getAttribute("action")).toBe("/staff/api/login");
    expect(getComputedStyle(filters).flexDirection).toBe("row");
    expect(getComputedStyle(fields).flexDirection).toBe("column");
    await expect.element(page.getByRole("combobox", { name: "Status" })).toBeVisible();
    await expect.element(page.getByRole("textbox", { name: "Email" })).toBeVisible();
  });

  it("lines up a row's select, search box and button: one height, one baseline", async () => {
    await page.viewport(1280, 800);
    await render(
      <Filters aria-label="Filters">
        <label>
          Status
          <select name="status">
            <option>Any</option>
          </select>
        </label>
        <label>
          Search
          <input type="search" name="q" />
        </label>
        <Button variant="primary" size="small" type="submit">
          Filter
        </Button>
      </Filters>,
    );
    const boxes = [
      page.getByRole("combobox", { name: "Status" }),
      page.getByRole("searchbox", { name: "Search" }),
      page.getByRole("button", { name: "Filter" }),
    ].map((control) => control.element().getBoundingClientRect());
    expect(boxes.map((box) => box.height)).toEqual([boxes[2].height, boxes[2].height, boxes[2].height]);
    expect(boxes.map((box) => box.bottom)).toEqual([boxes[2].bottom, boxes[2].bottom, boxes[2].bottom]);
  });
});
