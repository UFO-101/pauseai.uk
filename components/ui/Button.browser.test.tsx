import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { page } from "vitest/browser";
import { Button, ButtonAnchor, ButtonLink, buttonAttributes } from "./Button";
import { SubmitButton } from "./SubmitButton";

describe("buttonAttributes", () => {
  it("combines the variant, size and extra class", () => {
    const attrs = buttonAttributes({ variant: "ghost", size: "small", className: "extra" });
    expect(attrs["data-button"]).toBe("");
    expect(attrs["data-variant"]).toBe("ghost");
    expect(attrs.className.split(" ")).toHaveLength(4);
    expect(attrs.className).toContain("extra");
  });

  it("leaves out the size and extra class when not given", () => {
    expect(buttonAttributes({ variant: "primary" }).className.split(" ")).toHaveLength(2);
  });
});

describe("Button", () => {
  it("renders a button that looks like a primary button", async () => {
    await render(
      <Button variant="primary" type="submit">
        Send
      </Button>,
    );
    const button = page.getByRole("button", { name: "Send" });
    await expect.element(button).toHaveAttribute("type", "submit");
    await expect.element(button).toHaveAttribute("data-variant", "primary");
    // The real stylesheet is loaded: the accent background and white text.
    const style = getComputedStyle(button.element());
    expect(style.color).toBe("rgb(255, 255, 255)");
    expect(style.backgroundColor).not.toBe("rgba(0, 0, 0, 0)");
    expect(style.display).toBe("inline-flex");
  });

  it("makes a ghost button transparent, and a large one bigger", async () => {
    await render(
      <>
        <Button variant="ghost">Ghost</Button>
        <Button variant="ghost" size="large">
          Large
        </Button>
        <Button variant="ghost" size="small">
          Small
        </Button>
      </>,
    );
    const ghost = getComputedStyle(page.getByRole("button", { name: "Ghost" }).element());
    const large = getComputedStyle(page.getByRole("button", { name: "Large" }).element());
    const small = getComputedStyle(page.getByRole("button", { name: "Small" }).element());
    expect(ghost.backgroundColor).toBe("rgba(0, 0, 0, 0)");
    expect(ghost.paddingTop).toBe("14px");
    expect(large.paddingTop).toBe("16px");
    expect(small.paddingTop).toBe("9px");
  });
});

describe("ButtonAnchor and ButtonLink", () => {
  it("render links with button styling", async () => {
    await render(
      <>
        <ButtonAnchor variant="primary" href="https://example.com" target="_blank">
          Out
        </ButtonAnchor>
        <ButtonLink variant="ghost" size="small" href="/people" className="extra">
          In
        </ButtonLink>
      </>,
    );
    const out = page.getByRole("link", { name: "Out" });
    const inner = page.getByRole("link", { name: "In" });
    await expect.element(out).toHaveAttribute("href", "https://example.com");
    await expect.element(out).toHaveAttribute("data-variant", "primary");
    await expect.element(inner).toHaveAttribute("href", "/people");
    await expect.element(inner).toHaveAttribute("data-variant", "ghost");
    await expect.element(inner).toHaveClass("extra");
  });
});

describe("Button pending", () => {
  it("is disabled and busy, with a spinner, while pending", async () => {
    await render(
      <Button variant="primary" pending>
        Import
      </Button>,
    );
    const button = page.getByRole("button", { name: "Import" });
    await expect.element(button).toBeDisabled();
    await expect.element(button).toHaveAttribute("aria-busy", "true");
    expect(button.element().querySelector("[aria-hidden]")).not.toBeNull();
  });

  it("is enabled, without a spinner, otherwise", async () => {
    await render(<Button variant="primary">Import</Button>);
    const button = page.getByRole("button", { name: "Import" });
    await expect.element(button).toBeEnabled();
    await expect.element(button).not.toHaveAttribute("aria-busy");
    expect(button.element().querySelector("[aria-hidden]")).toBeNull();
  });
});

describe("SubmitButton", () => {
  it("is pending while its form's action runs, then not", async () => {
    let finish = () => {};
    const action = () => new Promise<void>((resolve) => (finish = resolve));
    await render(
      <form action={action}>
        <SubmitButton variant="primary">Import</SubmitButton>
      </form>,
    );
    const button = page.getByRole("button", { name: "Import" });
    await button.click();
    await expect.element(button).toBeDisabled();
    await expect.element(button).toHaveAttribute("aria-busy", "true");
    finish();
    await expect.element(button).toBeEnabled();
  });
});
