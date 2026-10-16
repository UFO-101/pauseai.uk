import { afterEach, describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { page, userEvent } from "vitest/browser";
import FooterQr from "./FooterQr";

describe("FooterQr", () => {
  const testerPath = window.location.pathname + window.location.search;
  afterEach(() => window.history.replaceState(null, "", testerPath));

  it("opens a big QR code for this page, and closes from the button, Escape or the backdrop", async () => {
    const { container } = await render(<FooterQr />);
    // Closed, the dialog is out of the accessibility tree, so it's found by its tag to check it's shut.
    const shut = () => expect.poll(() => container.querySelector("dialog")!.open).toBe(false);
    const dialog = page.getByRole("dialog", { name: "QR code" });
    const show = page.getByRole("button", { name: "Show QR code larger" });

    // Opened once on the tester's own page first: that loads the QR code's script, which won't load from a made-up path.
    await show.click();
    await expect.element(dialog).toBeVisible();
    const qr = page.getByRole("img", { name: "QR code linking to this page" });
    await expect.element(qr).toHaveAttribute("src", expect.stringMatching(/^data:image\/svg\+xml/));

    // A tap on the code itself leaves it open.
    await qr.click();
    await expect.element(dialog).toBeVisible();

    await page.getByRole("button", { name: "Close" }).click();
    await shut();

    window.history.replaceState(null, "", "/campaigns/regulate-letter-pm?utm_source=test#write");
    await show.click();
    await expect.element(dialog).toBeVisible();
    // The live address of the page it was opened on, without the query or fragment.
    await expect.element(page.getByText("pauseai.uk/campaigns/regulate-letter-pm", { exact: true })).toBeVisible();
    await userEvent.keyboard("{Escape}");
    await shut();

    await show.click();
    await expect.element(dialog).toBeVisible();
    await dialog.click({ position: { x: 5, y: 5 } });
    await shut();
  });
});
