import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";
import { page, userEvent } from "vitest/browser";
import type { MarchRegisterResult } from "@/lib/march-registration";
import SignupForm from "./SignupForm";

/** The form, still, with nothing listening for it to move on. */
const formProps = { onRegistered: () => {}, motion: "still" as const, onLeft: () => {} };

async function fillIn() {
  await page.getByLabelText("Full name").fill("Testy McTestface");
  await page.getByLabelText("Email address").fill(" testy@example.org ");
}

type GtagWindow = Window & { gtag?: (...args: unknown[]) => void };

let gtagCalls: unknown[][] = [];

/** The events the form has sent to GA through gtag, each as track() was given it. */
const pushed = () => gtagCalls.map(([, event, params]) => ({ event, ...(params as object) }));

beforeEach(() => {
  gtagCalls = [];
  (window as GtagWindow).gtag = (...args) => gtagCalls.push(args);
});

afterEach(() => {
  delete (window as GtagWindow).gtag;
});

describe("SignupForm", () => {
  it("sends the box ticked, and the utm_source of the link they came by", async () => {
    const sent: unknown[] = [];
    window.history.replaceState(null, "", "?utm_source=nl");
    try {
      await render(
        <SignupForm
          {...formProps}
          register={async (input) => {
            sent.push(input);
            return { ok: true };
          }}
        />,
      );
      await fillIn();
      await page.getByRole("checkbox").click();
      await page.getByRole("button", { name: "Register" }).click();
      await expect.poll(() => sent).toEqual([expect.objectContaining({ consent: true, utmSource: "nl" })]);
    } finally {
      window.history.replaceState(null, "", window.location.pathname);
    }
  });

  it("sends what was filled in, then tells GA and moves on", async () => {
    const onRegistered = vi.fn();
    const sent: unknown[] = [];
    let finish: (result: MarchRegisterResult) => void = () => {};
    await render(
      <SignupForm
        {...formProps}
        onRegistered={onRegistered}
        register={(input) => {
          sent.push(input);
          return new Promise((done) => (finish = done));
        }}
      />,
    );
    await fillIn();
    await page.getByLabelText(/Phone/).fill("07700 900000");
    await page.getByLabelText(/City/).fill("London");
    await page.getByLabelText(/Postcode/).fill("SW1A 0AA");
    await page.getByRole("button", { name: "Register" }).click();
    await expect.element(page.getByRole("button", { name: "Registering…" })).toBeDisabled();
    expect(sent).toEqual([
      {
        name: "Testy McTestface",
        email: "testy@example.org",
        phone: "07700 900000",
        city: "London",
        postcode: "SW1A 0AA",
        consent: false,
        utmSource: "",
        website: "",
      },
    ]);
    expect(pushed()).toEqual([]);
    finish({ ok: true });
    await expect.poll(() => onRegistered.mock.calls.length).toBe(1);
    expect(pushed()).toEqual([{ event: "march_signup" }]);
  });

  it("says what to fix in the name or email, and stays", async () => {
    await render(
      <SignupForm
        {...formProps}
        register={async () => ({
          ok: false,
          reason: "invalid",
          errors: { name: "Please check your full name.", email: "Please enter a valid email address." },
        })}
      />,
    );
    await fillIn();
    await page.getByRole("button", { name: "Register" }).click();
    await expect
      .element(page.getByRole("alert"))
      .toHaveTextContent("Please check your full name. Please enter a valid email address.");
    await expect.element(page.getByRole("link", { name: /Luma/ })).not.toBeInTheDocument();
    await expect.element(page.getByRole("button", { name: "Register" })).toBeEnabled();
    expect(pushed()).toEqual([]);
  });

  it("offers the Luma page when Luma didn't take them", async () => {
    await render(<SignupForm {...formProps} register={async () => ({ ok: false, reason: "luma-failed" })} />);
    await fillIn();
    await page.getByRole("button", { name: "Register" }).click();
    await expect.element(page.getByRole("alert")).toMatchTextContent(/^Sorry, your registration didn.t go through\./);
    await expect
      .element(page.getByRole("link", { name: "Register on our Luma event page instead." }))
      .toHaveAttribute("href", "https://luma.com/pauseai-nov26");
    expect(pushed()).toEqual([]);
  });

  it("offers the Luma page when the server can't be reached", async () => {
    await render(
      <SignupForm
        {...formProps}
        register={async () => {
          throw new Error("offline");
        }}
      />,
    );
    await fillIn();
    await userEvent.keyboard("{Enter}");
    await expect.element(page.getByRole("link", { name: "Register on our Luma event page instead." })).toBeVisible();
    expect(pushed()).toEqual([]);
  });

  it("keeps the honeypot off-screen, out of reach of people", async () => {
    await render(<SignupForm {...formProps} register={async () => ({ ok: true })} />);
    const honeypot = document.getElementById("website")!;
    expect(honeypot.tabIndex).toBe(-1);
    expect(honeypot.getBoundingClientRect().right).toBeLessThan(0);
    await expect.element(page.getByRole("link", { name: "privacy policy" })).toHaveAttribute("href", "/privacy");
  });
});
