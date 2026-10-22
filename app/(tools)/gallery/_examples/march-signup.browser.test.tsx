// The march sign-up group's form example sends to a logged stand-in, and stays put.
import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { page } from "vitest/browser";
import { ShareCardExample, SignupFormExample, SignupRegisterExample, ThanksCardExample } from "./march-signup.client";

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
      .toHaveTextContent('register({"name":"Testy McTestface","email":"testy@example.org","website":"","tags":{}})');
    await expect.element(page.getByRole("alert")).toBeVisible();
  });

  it.each([
    ["the share card", ShareCardExample, "I can’t think of anywhere else", "onFinish(event)"],
    ["the thank-you card", ThanksCardExample, "Register someone new", "onRegisterAnother(event)"],
  ])("logs what %s calls", async (_, Example, button, call) => {
    await render(<Example />);
    await page.getByRole("button", { name: button }).click();
    await expect.element(page.getByRole("list", { name: "Event log" }).getByRole("listitem")).toHaveTextContent(call);
  });
});
