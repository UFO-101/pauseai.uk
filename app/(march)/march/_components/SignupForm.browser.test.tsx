import { describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";
import { page, userEvent } from "vitest/browser";
import type { MarchRegisterResult } from "../actions";
import SignupForm from "./SignupForm";

/** The form, still, with nothing listening for it to move on. */
const formProps = { onRegistered: () => {}, motion: "still" as const, onLeft: () => {} };

async function fillIn() {
  await page.getByLabelText("First name").fill("Testy");
  await page.getByLabelText("Last name").fill("McTestface");
  await page.getByLabelText("Email address").fill(" testy@example.org ");
}

describe("SignupForm", () => {
  it("sends the name and email, then moves on", async () => {
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
    await page.getByRole("button", { name: "Register" }).click();
    await expect.element(page.getByRole("button", { name: "Registering…" })).toBeDisabled();
    expect(sent).toEqual([{ firstName: "Testy", lastName: "McTestface", email: "testy@example.org", website: "" }]);
    finish({ ok: true });
    await expect.poll(() => onRegistered.mock.calls.length).toBe(1);
  });

  it("says what to fix in the name or email, and stays", async () => {
    await render(
      <SignupForm
        {...formProps}
        register={async () => ({
          ok: false,
          reason: "invalid",
          errors: { firstName: "Please check your first name.", email: "Please enter a valid email address." },
        })}
      />,
    );
    await fillIn();
    await page.getByRole("button", { name: "Register" }).click();
    await expect
      .element(page.getByRole("alert"))
      .toHaveTextContent("Please check your first name. Please enter a valid email address.");
    await expect.element(page.getByRole("link", { name: /Luma/ })).not.toBeInTheDocument();
    await expect.element(page.getByRole("button", { name: "Register" })).toBeEnabled();
  });

  it("offers the Luma page when Luma didn't take them", async () => {
    await render(<SignupForm {...formProps} register={async () => ({ ok: false, reason: "luma-failed" })} />);
    await fillIn();
    await page.getByRole("button", { name: "Register" }).click();
    await expect.element(page.getByRole("alert")).toMatchTextContent(/^Sorry, your registration didn.t go through\./);
    await expect
      .element(page.getByRole("link", { name: "Register on our Luma event page instead." }))
      .toHaveAttribute("href", "https://luma.com/pauseai-nov26");
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
  });

  it("keeps the honeypot off-screen, out of reach of people", async () => {
    await render(<SignupForm {...formProps} register={async () => ({ ok: true })} />);
    const honeypot = document.getElementById("website")!;
    expect(honeypot.tabIndex).toBe(-1);
    expect(honeypot.getBoundingClientRect().right).toBeLessThan(0);
    await expect.element(page.getByRole("link", { name: "privacy policy" })).toHaveAttribute("href", "/privacy");
  });
});
