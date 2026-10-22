import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { page } from "vitest/browser";
import { Button, ButtonAnchor, ButtonLink, buttonClass } from "./Button";
import { SubmitButton } from "./SubmitButton";

describe("buttonClass", () => {
  it("combines the variant, size, fit and extra class", () => {
    const className = buttonClass({ variant: "ghost", size: "small", fit: true, className: "extra" });
    expect(className.split(" ")).toHaveLength(5);
    expect(className).toContain("extra");
  });

  it("leaves out the size, fit and extra class when not given", () => {
    expect(buttonClass({ variant: "primary" }).split(" ")).toHaveLength(2);
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
    // The real stylesheet is loaded: the accent background and white text.
    const style = getComputedStyle(button.element());
    expect(style.color).toBe("rgb(255, 255, 255)");
    expect(style.backgroundColor).toBe("rgb(229, 114, 38)");
    expect(style.display).toBe("inline-flex");
    expect(style.cursor).toBe("pointer");
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

  it("is white on a photo, light", async () => {
    await render(<Button variant="light">Light</Button>);
    const style = getComputedStyle(page.getByRole("button", { name: "Light" }).element());
    expect(style.backgroundColor).toBe("rgb(255, 255, 255)");
    expect(style.borderTopColor).toBe("rgb(229, 114, 38)");
  });

  it("is red for something that can't be undone", async () => {
    await render(<Button variant="danger">Erase</Button>);
    const button = page.getByRole("button", { name: "Erase" }).element();
    expect(getComputedStyle(button).backgroundColor).toBe("rgb(176, 0, 32)");
  });

  it("fills a phone's width, unless told to fit", async () => {
    await render(
      <div style={{ width: 300 }}>
        <Button variant="primary">Fill</Button>
        <Button variant="primary" fit>
          Fit
        </Button>
      </div>,
    );
    expect(page.getByRole("button", { name: "Fill" }).element().getBoundingClientRect().width).toBe(300);
    expect(page.getByRole("button", { name: "Fit" }).element().getBoundingClientRect().width).toBeLessThan(300);
  });

  it("takes its padding and type from the container's custom properties", async () => {
    await render(
      <div style={{ ["--button-padding" as string]: "3px 5px", ["--button-font-size" as string]: "11px" }}>
        <Button variant="ghost" size="large">
          Sized
        </Button>
      </div>,
    );
    const style = getComputedStyle(page.getByRole("button", { name: "Sized" }).element());
    expect(style.paddingTop).toBe("3px");
    expect(style.fontSize).toBe("11px");
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
    expect(getComputedStyle(out.element()).backgroundColor).toBe("rgb(229, 114, 38)");
    await expect.element(inner).toHaveAttribute("href", "/people");
    expect(getComputedStyle(inner.element()).backgroundColor).toBe("rgba(0, 0, 0, 0)");
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
