import { describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";
import { page } from "vitest/browser";
import Actions from "./Actions";
import LinkButton from "./LinkButton";
import StatusMessage from "./StatusMessage";
import Table from "./Table";
import Tag from "./Tag";
import { ErrorText, Muted } from "./Text";

const style = (element: Element) => getComputedStyle(element);

describe("Tag", () => {
  it("is plain or a tone, and after a heading sits on its middle at its own weight", async () => {
    await render(
      <>
        <h2>
          Title <Tag>Plain</Tag>
        </h2>
        <Tag tone="amber">Amber</Tag>
        <Tag tone="green">Green</Tag>
        <Tag tone="blue">Blue</Tag>
      </>,
    );
    const background = (name: string) => style(page.getByText(name).element()).backgroundColor;
    expect(new Set(["Plain", "Amber", "Green", "Blue"].map(background)).size).toBe(4);
    const plain = style(page.getByText("Plain").element());
    expect(plain.verticalAlign).toBe("middle");
    expect(plain.fontWeight).toBe("400");
    expect(style(page.getByText("Amber").element()).verticalAlign).toBe("baseline");
  });

  it("is smaller at the compact density", async () => {
    await render(
      <>
        <Tag>Comfortable</Tag>
        <span data-density="compact">
          <Tag>Compact</Tag>
        </span>
      </>,
    );
    expect(style(page.getByText("Comfortable").element()).fontSize).toBe("14px");
    expect(style(page.getByText("Compact").element()).fontSize).toBe("12px");
  });
});

describe("Table", () => {
  it("is a table of its children, scrolling sideways in its box, tighter at the compact density", async () => {
    await render(
      <>
        <Table>
          <tbody>
            <tr>
              <td>Cell</td>
            </tr>
          </tbody>
        </Table>
        <div data-density="compact">
          <Table>
            <tbody>
              <tr>
                <td>Tight</td>
              </tr>
            </tbody>
          </Table>
        </div>
      </>,
    );
    const cell = page.getByRole("cell", { name: "Cell" }).element();
    expect(style(cell.closest("table")!.parentElement!).overflowX).toBe("auto");
    expect(style(cell).paddingTop).toBe("8px");
    expect(style(page.getByRole("cell", { name: "Tight" }).element()).paddingTop).toBe("4px");
  });
});

describe("Muted and ErrorText", () => {
  it("set their words in another colour than the text around them", async () => {
    await render(
      <p>
        Plain <Muted>Muted</Muted> <ErrorText>Wrong</ErrorText>
      </p>,
    );
    const colour = (name: string) => style(page.getByText(name, { exact: true }).element()).color;
    const plain = style(page.getByText("Plain", { exact: false }).element()).color;
    expect(colour("Muted")).not.toBe(plain);
    expect(colour("Wrong")).not.toBe(plain);
    expect(colour("Wrong")).not.toBe(colour("Muted"));
  });
});

describe("Actions", () => {
  it("puts its buttons in a row, and stacks them on a phone", async () => {
    await page.viewport(1280, 800);
    await render(
      <Actions>
        <button>One</button>
        <button>Two</button>
      </Actions>,
    );
    const row = page.getByRole("button", { name: "One" }).element().parentElement!;
    expect(style(row).flexDirection).toBe("row");
    await page.viewport(400, 800);
    expect(style(row).flexDirection).toBe("column");
  });
});

describe("LinkButton and StatusMessage", () => {
  it("reads as a link, and does what it's for", async () => {
    const onClick = vi.fn();
    await render(
      <p>
        photo.jpg <LinkButton onClick={onClick}>Remove</LinkButton>
      </p>,
    );
    const button = page.getByRole("button", { name: "Remove" });
    expect(style(button.element()).textDecorationLine).toBe("underline");
    await button.click();
    expect(onClick).toHaveBeenCalled();
  });

  it("reads out what just happened, with an Undo when there's one to do", async () => {
    const onUndo = vi.fn();
    await render(
      <>
        <StatusMessage>Saved.</StatusMessage>
        <StatusMessage onUndo={onUndo}>Reset.</StatusMessage>
        <StatusMessage onUndo={null}>Opened.</StatusMessage>
      </>,
    );
    const messages = page.getByRole("status");
    expect(messages.all()).toHaveLength(3);
    expect(page.getByRole("button", { name: "Undo" }).all()).toHaveLength(1);
    await page.getByRole("button", { name: "Undo" }).click();
    expect(onUndo).toHaveBeenCalled();
  });
});
