import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { page } from "vitest/browser";
import { m } from "./classes";
import MarchSignupFrame from "./MarchSignupFrame";
import ShareBody from "./ShareBody";
import ShareHead from "./ShareHead";
import SignupCase from "./SignupCase";
import SignupDay from "./SignupDay";
import SignupDemand from "./SignupDemand";
import SignupPhotos from "./SignupPhotos";
import SignupRegister from "./SignupRegister";
import SignupTurnout from "./SignupTurnout";

describe("m", () => {
  it("gives the stylesheet's own names for its classes", () => {
    expect(m("btn large").split(" ")).toHaveLength(2);
    expect(m("btn")).toMatch(/btn/);
  });

  it("throws on a class the stylesheet hasn't got", () => {
    expect(() => m("no-such-class")).toThrow('march.module.css has no class "no-such-class"');
  });
});

describe("the sign-up's sections", () => {
  it("sets the headings in Anton, on the frame's paper", async () => {
    await render(
      <MarchSignupFrame>
        <SignupCase />
      </MarchSignupFrame>,
    );
    const heading = page.getByRole("heading", { name: /Why we.re marching/ }).element();
    expect(getComputedStyle(heading).fontFamily).toMatch(/^Anton/);
    expect(getComputedStyle(heading).textTransform).toBe("uppercase");
    await expect.element(page.getByRole("link", { name: "Skip to content" })).toHaveAttribute("href", "#main");
  });

  it("says what we want", async () => {
    await render(<SignupDemand />);
    await expect.element(page.getByRole("region", { name: "What we want" })).toBeVisible();
  });

  it("shows the turnouts, the goal last, and links to the press", async () => {
    await render(<SignupTurnout />);
    await expect.element(page.getByText("1,000")).toBeVisible();
    await expect.element(page.getByText("21 Nov 2026")).toBeVisible();
    expect(page.getByRole("link").all()).toHaveLength(5);
    await expect.element(page.getByRole("img", { name: "WIRED" })).toBeVisible();
  });

  it("shows three photos from earlier marches", async () => {
    await render(<SignupPhotos />);
    expect(page.getByRole("img").all()).toHaveLength(3);
    await expect.element(page.getByText("June 2025")).toBeVisible();
  });

  it("maps the route's start and end", async () => {
    await render(<SignupDay />);
    await expect
      .element(page.getByRole("link", { name: "All Souls' Place" }))
      .toHaveAttribute("href", expect.stringContaining("All%20Souls'%20Place%2C%20London%20W1B%203DA"));
    await expect.element(page.getByRole("link", { name: "Downing Street" })).toHaveAttribute("target", "_blank");
    await expect
      .element(page.getByRole("link", { name: "hello@pauseai.uk" }))
      .toHaveAttribute("href", "mailto:hello@pauseai.uk");
  });

  it("puts the form in the register band", async () => {
    await render(<SignupRegister register={async () => ({ ok: true })} />);
    await expect.element(page.getByRole("heading", { name: "Register for the march" })).toBeVisible();
    await expect.element(page.getByRole("button", { name: "Register" })).toBeVisible();
    expect(document.getElementById("register")).not.toBeNull();
  });
});

describe("the share step's sections", () => {
  it("says they're registered, and asks them to share", async () => {
    await render(<ShareHead />);
    await expect.element(page.getByRole("heading", { level: 1, name: /Now bring people with you/ })).toBeVisible();
  });

  it("has the share card on its band", async () => {
    localStorage.clear();
    await render(<ShareBody />);
    await expect.element(page.getByRole("button", { name: "I can’t think of anywhere else" })).toBeVisible();
  });
});
