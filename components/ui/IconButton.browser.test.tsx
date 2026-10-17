import { describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";
import { page } from "vitest/browser";
import IconButton from "./IconButton";

describe("IconButton", () => {
  it("is a round button, 32px across unless sized", async () => {
    const onClick = vi.fn();
    await render(
      <>
        <IconButton look="outline" aria-label="Copy" onClick={onClick}>
          ×
        </IconButton>
        <IconButton look="raised" size={44} aria-label="Next" style={{ marginLeft: 4 }}>
          ›
        </IconButton>
      </>,
    );
    const copy = page.getByRole("button", { name: "Copy" });
    await expect.element(copy).toHaveAttribute("type", "button");
    expect(copy.element().getBoundingClientRect().width).toBe(32);
    expect(getComputedStyle(copy.element()).borderRadius).toBe("50%");
    await copy.click();
    expect(onClick).toHaveBeenCalledOnce();
    const next = page.getByRole("button", { name: "Next" }).element();
    expect(next.getBoundingClientRect().width).toBe(44);
    expect(getComputedStyle(next).marginLeft).toBe("4px");
    expect(getComputedStyle(next).backgroundColor).toBe("rgb(255, 255, 255)");
  });

  it("takes its size from a container, and a pale ring for a dark backdrop", async () => {
    await render(
      <div style={{ ["--icon-button-size" as string]: "50px" }}>
        <IconButton look="dark" aria-label="Close" type="submit" className="extra">
          ×
        </IconButton>
      </div>,
    );
    const close = page.getByRole("button", { name: "Close" });
    await expect.element(close).toHaveAttribute("type", "submit");
    await expect.element(close).toHaveClass("extra");
    expect(close.element().getBoundingClientRect().width).toBe(50);
    expect(getComputedStyle(close.element()).color).toBe("rgb(255, 255, 255)");
  });
});
