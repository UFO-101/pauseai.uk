// The march sign-up group's form example sends to a logged stand-in, and stays put.
import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { page } from "vitest/browser";
import { ShareCardExample, SignupFormExample, SignupRegisterExample } from "./march-signup.client";

describe("the march sign-up group's examples", () => {
  it.each([
    ["the form", SignupFormExample],
    ["the register band", SignupRegisterExample],
  ])("logs what %s sends", async (_, Example) => {
    await render(<Example />);
    await page.getByLabelText("Full name").fill("Testy McTestface");
    await page.getByLabelText("Email address").fill("testy@example.org");
    await page.getByRole("button", { name: "Register" }).click();
    await expect
      .element(page.getByRole("list", { name: "Event log" }).getByRole("listitem"))
      .toHaveTextContent(
        'register({"name":"Testy McTestface","email":"testy@example.org","phone":"","city":"","postcode":"","consent":false,"utmSource":"","website":""})',
      );
    await expect.element(page.getByRole("alert")).toBeVisible();
  });

  it("logs what the share card calls", async () => {
    await render(<ShareCardExample />);
    await page.getByRole("button", { name: "Register someone new" }).click();
    await expect
      .element(page.getByRole("list", { name: "Event log" }).getByRole("listitem"))
      .toHaveTextContent("onRegisterAnother(event)");
  });
});
