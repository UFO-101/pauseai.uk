// The march sign-up group's form example sends to a logged stand-in, and stays put.
import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { page } from "vitest/browser";
import { SignupFormExample } from "./march-signup.client";

describe("the march sign-up group's examples", () => {
  it("logs what the form sends", async () => {
    await render(<SignupFormExample />);
    await page.getByLabelText("First name").fill("Testy");
    await page.getByLabelText("Last name").fill("McTestface");
    await page.getByLabelText("Email address").fill("testy@example.org");
    await page.getByRole("button", { name: "Register" }).click();
    await expect
      .element(page.getByRole("list", { name: "Event log" }).getByRole("listitem"))
      .toHaveTextContent(
        'register({"firstName":"Testy","lastName":"McTestface","email":"testy@example.org","website":""})',
      );
    await expect.element(page.getByRole("alert")).toBeVisible();
  });
});
