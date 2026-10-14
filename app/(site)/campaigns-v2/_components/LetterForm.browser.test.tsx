import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";
import { page, userEvent } from "vitest/browser";
import { campaigns, copy } from "@/lib/content/email-your-mp";
import type { TurnstileApi } from "./Turnstile";
import LetterForm from "./LetterForm";

const [letterToPm, bill] = campaigns;
const MP = { name: "Rachel Blake", salutation: "Ms Blake", constituency: "Cities of London and Westminster", email: "rachel.blake.mp@parliament.uk" };
const PROPS = { campaign: letterToPm, mp: MP, statuses: {}, senderName: "Jane Smith", postcode: "sw1a 1aa" };

type TestWindow = Window & { dataLayer?: unknown[]; turnstile?: TurnstileApi };
const w = window as TestWindow;

let sent: Record<string, unknown>[];
let respond: () => Promise<Response>;

beforeEach(() => {
  sent = [];
  respond = async () => Response.json({ ok: true });
  delete w.dataLayer;
  vi.spyOn(window, "fetch").mockImplementation(async (url, init) => {
    expect(url).toBe("/api/email-your-mp/letters");
    sent.push(JSON.parse(String(init!.body)));
    return respond();
  });
});
afterEach(() => {
  vi.restoreAllMocks();
  delete w.turnstile;
});

async function fillAndSend() {
  await userEvent.fill(page.getByLabelText(copy.form.emailLabel), "jane@example.com");
  await userEvent.fill(page.getByRole("textbox", { name: copy.form.addressLabel }), "1 High St\nLondon");
  await page.getByRole("button", { name: copy.form.send }).click();
  await page.getByRole("button", { name: copy.form.confirmSend }).click();
}

describe("LetterForm", () => {
  it("drafts the letter for the MP, signed with the sender's name and postcode, then their address", async () => {
    await render(<LetterForm {...PROPS} />);
    await expect.element(page.getByLabelText(copy.form.subjectLabel)).toHaveValue(letterToPm.subject);
    await expect.element(page.getByRole("textbox", { name: copy.form.letterLabel, exact: true })).toHaveValue(
      letterToPm.letter({ salutation: "Ms Blake", constituency: MP.constituency, senderName: "Jane Smith" }),
    );
    await expect.element(page.getByText("Jane Smith SW1A 1AA")).toBeVisible();
    await expect.element(page.getByText(copy.form.replyNotice)).toBeVisible();
    await userEvent.fill(page.getByRole("textbox", { name: copy.form.addressLabel }), "1 High St\nLondon");
    await expect.element(page.getByText("Jane Smith 1 High St London SW1A 1AA")).toBeVisible();
    await expect.element(page.getByText(letterToPm.alreadyDone)).not.toBeInTheDocument();
    for (const attachment of letterToPm.attachments) {
      await expect.element(page.getByRole("link", { name: new RegExp(attachment.title) })).toHaveAttribute("href", `/pdfs/${attachment.file}`);
    }
  });

  it("thanks an MP who's done it, and leaves out attachments when there are none", async () => {
    await render(<LetterForm {...PROPS} campaign={bill} statuses={{ [bill.slug]: "supports" }} />);
    await expect.element(page.getByText(bill.alreadyDone)).toBeVisible();
    await expect.element(page.getByRole("textbox", { name: copy.form.letterLabel, exact: true })).toHaveValue(
      bill.thanks({ salutation: "Ms Blake", constituency: MP.constituency, senderName: "Jane Smith" }),
    );
    await expect.element(page.getByText(copy.form.attachments)).not.toBeInTheDocument();
  });

  it("sends what the sender wrote, counts the conversion once, and says it's sent", async () => {
    await render(<LetterForm {...PROPS} />);
    await userEvent.fill(page.getByLabelText(copy.form.subjectLabel), "My subject");
    await userEvent.fill(page.getByRole("textbox", { name: copy.form.letterLabel, exact: true }), "My letter");
    await page.getByLabelText(copy.form.consent).click();
    await expect.element(page.getByText(copy.form.confirmPrompt("Rachel Blake"))).not.toBeInTheDocument();
    await fillAndSend();

    await expect.element(page.getByRole("status")).toHaveTextContent(copy.form.checkInbox);
    expect(sent).toEqual([
      {
        campaign: letterToPm.slug,
        name: "Jane Smith",
        postcode: "sw1a 1aa",
        address: "1 High St\nLondon",
        email: "jane@example.com",
        subject: "My subject",
        letter: "My letter",
        consent: true,
        nickname: "",
        turnstileToken: "",
      },
    ]);
    expect(w.dataLayer).toEqual([{ event: "mp_email_sent" }]);
  });

  it("adds to an existing dataLayer", async () => {
    w.dataLayer = ["gtm"];
    await render(<LetterForm {...PROPS} />);
    await fillAndSend();
    await expect.element(page.getByRole("status")).toBeVisible();
    expect(w.dataLayer).toEqual(["gtm", { event: "mp_email_sent" }]);
  });

  it("needs an email and an address before asking to confirm, and can cancel", async () => {
    await render(<LetterForm {...PROPS} />);
    await page.getByRole("button", { name: copy.form.send }).click();
    await expect.element(page.getByRole("alert")).toHaveTextContent(copy.form.emailRequired);
    await userEvent.fill(page.getByLabelText(copy.form.emailLabel), "jane@example.com");
    await page.getByRole("button", { name: copy.form.send }).click();
    await expect.element(page.getByRole("alert")).toHaveTextContent(copy.form.addressRequired);
    await userEvent.fill(page.getByRole("textbox", { name: copy.form.addressLabel }), "1 High St");
    await page.getByRole("button", { name: copy.form.send }).click();
    await expect.element(page.getByText(copy.form.confirmPrompt("Rachel Blake"))).toBeVisible();
    await page.getByRole("button", { name: copy.form.cancel }).click();
    await expect.element(page.getByRole("button", { name: copy.form.send })).toBeVisible();
  });

  it("shows the server's refusal, counts nothing, and lets the sender try again", async () => {
    respond = async () => Response.json({ ok: false, message: copy.errors.invalidEmail }, { status: 400 });
    await render(<LetterForm {...PROPS} />);
    await fillAndSend();
    await expect.element(page.getByRole("alert")).toHaveTextContent(copy.errors.invalidEmail);
    expect(w.dataLayer).toBeUndefined();

    respond = async () => {
      throw new TypeError("offline");
    };
    await page.getByRole("button", { name: copy.form.send }).click();
    await page.getByRole("button", { name: copy.form.confirmSend }).click();
    await expect.element(page.getByRole("alert")).toHaveTextContent(copy.form.networkError);
    expect(w.dataLayer).toBeUndefined();
  });

  it("waits for Turnstile's token, sends it, then gets a fresh one", async () => {
    const widgets: Record<string, (token: string) => void>[] = [];
    w.turnstile = {
      render: (_el, options) => {
        widgets.push(options as (typeof widgets)[number]);
        return `w${widgets.length}`;
      },
      remove: () => {},
    };
    respond = async () => Response.json({ ok: false, message: copy.errors.spamFailed }, { status: 403 });
    await render(<LetterForm {...PROPS} turnstileSiteKey="site-key" />);
    await userEvent.fill(page.getByLabelText(copy.form.emailLabel), "jane@example.com");
    await userEvent.fill(page.getByRole("textbox", { name: copy.form.addressLabel }), "1 High St");
    await page.getByRole("button", { name: copy.form.send }).click();

    const confirm = page.getByRole("button", { name: copy.form.confirmSend });
    await expect.element(confirm).toBeDisabled();
    await vi.waitFor(() => expect(widgets).toHaveLength(1));
    widgets[0].callback("token-1");
    await confirm.click();
    await expect.element(page.getByRole("alert")).toHaveTextContent(copy.errors.spamFailed);
    expect(sent[0].turnstileToken).toBe("token-1");

    await page.getByRole("button", { name: copy.form.send }).click();
    await vi.waitFor(() => expect(widgets).toHaveLength(2));
    await expect.element(page.getByRole("button", { name: copy.form.confirmSend })).toBeDisabled();
  });

  it("says it's sending while it waits", async () => {
    let finish!: (res: Response) => void;
    respond = () => new Promise((resolve) => (finish = resolve));
    await render(<LetterForm {...PROPS} />);
    await fillAndSend();
    await expect.element(page.getByRole("button", { name: copy.form.sending })).toBeDisabled();
    finish(Response.json({ ok: true }));
    await expect.element(page.getByRole("status")).toBeVisible();
  });

  it("doesn't send or reload when Enter is pressed in a field", async () => {
    await render(<LetterForm {...PROPS} />);
    await userEvent.type(page.getByLabelText(copy.form.emailLabel), "jane@example.com{Enter}");
    await expect.element(page.getByRole("button", { name: copy.form.send })).toBeVisible();
    expect(sent).toEqual([]);
  });

  it("passes on what a bot puts in the hidden field", async () => {
    await render(<LetterForm {...PROPS} />);
    await userEvent.fill(page.getByRole("textbox", { name: "Nickname", includeHidden: true }), "bot");
    await fillAndSend();
    await expect.element(page.getByRole("status")).toBeVisible();
    expect(sent[0].nickname).toBe("bot");
  });
});
