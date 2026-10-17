import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { page } from "vitest/browser";
import { Field, Input } from "./FormParts";

describe("Input", () => {
  it("is the tool's text box, the same in every form, its own size whatever its label's", async () => {
    await render(
      <Field>
        <label style={{ fontSize: "0.9rem" }}>
          Address
          <Input name="address" defaultValue="7 Fake Lane" />
        </label>
      </Field>,
    );
    const input = page.getByRole("textbox", { name: "Address" });
    await expect.element(input).toHaveValue("7 Fake Lane");
    const style = getComputedStyle(input.element());
    expect(style.paddingTop).toBe("12px");
    expect(style.borderRadius).toBe("8px");
    expect(style.fontSize).toBe("16px");
    expect(style.fontWeight).toBe("400");
  });

  it("fades while disabled", async () => {
    await render(<Input aria-label="Postcode" disabled />);
    expect(getComputedStyle(page.getByRole("textbox", { name: "Postcode" }).element()).opacity).toBe("0.6");
  });
});
