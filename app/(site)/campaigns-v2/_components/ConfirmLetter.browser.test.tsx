import { StrictMode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";
import { page } from "vitest/browser";
import { copy } from "@/lib/content/email-your-mp";
import ConfirmLetter from "./ConfirmLetter";

afterEach(() => {
  vi.restoreAllMocks();
  history.replaceState(null, "", location.pathname);
});

describe("ConfirmLetter", () => {
  it("sends the token from the link's fragment, once even in Strict Mode, and says the letter's sent", async () => {
    history.replaceState(null, "", "#token-1");
    let finish!: (res: Response) => void;
    const fetch = vi.spyOn(window, "fetch").mockImplementation(() => new Promise((resolve) => (finish = resolve)));

    await render(
      <StrictMode>
        <ConfirmLetter />
      </StrictMode>,
    );
    await expect.element(page.getByRole("status")).toHaveTextContent(copy.confirm.sending);
    finish(Response.json({ ok: true, message: copy.confirm.sent("Rachel Blake") }));

    await expect.element(page.getByRole("status")).toHaveTextContent(copy.confirm.sent("Rachel Blake"));
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch.mock.calls[0][0]).toBe("/api/email-your-mp/confirm");
    expect(JSON.parse(String(fetch.mock.calls[0][1]!.body))).toEqual({ token: "token-1" });
  });

  it("says the link doesn't work when it has no token, without asking the server", async () => {
    const fetch = vi.spyOn(window, "fetch");
    await render(<ConfirmLetter />);
    await expect.element(page.getByRole("status")).toHaveTextContent(copy.confirm.invalid);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("shows the server's message when the link doesn't work", async () => {
    history.replaceState(null, "", "#used");
    vi.spyOn(window, "fetch").mockResolvedValue(Response.json({ ok: false, message: copy.confirm.invalid }, { status: 404 }));
    await render(<ConfirmLetter />);
    await expect.element(page.getByRole("status")).toHaveTextContent(copy.confirm.invalid);
  });

  it("says so if the request fails", async () => {
    history.replaceState(null, "", "#token-2");
    vi.spyOn(window, "fetch").mockRejectedValue(new TypeError("offline"));
    await render(<ConfirmLetter />);
    await expect.element(page.getByRole("status")).toHaveTextContent(copy.confirm.failed);
  });
});
