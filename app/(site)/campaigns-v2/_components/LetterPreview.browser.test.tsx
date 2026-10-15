import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";
import { page } from "vitest/browser";
import { campaigns, copy } from "@/lib/content/email-your-mp";
import { navigation } from "@/tests/browser/navigation";
import { readDraft, readSent, saveDraft, type Draft } from "./draft";
import LetterPreview from "./LetterPreview";
import type { TurnstileApi } from "./Turnstile";

const [letterToPm, bill] = campaigns;
const MP = {
  name: "Polly Placeholder",
  salutation: "Ms Placeholder",
  constituency: "Cities of London and Westminster",
  email: "polly.placeholder.mp@parliament.uk",
};
const DRAFT: Draft = {
  campaign: letterToPm.slug,
  name: "Jane Smith",
  postcode: "sw1a 1aa",
  mp: MP,
  statuses: {},
  email: "jane@example.com",
  address: "1 High St\nLondon",
  subject: "My subject",
  letter: {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [
          { type: "text", text: "My " },
          { type: "text", text: "letter", marks: [{ type: "bold" }] },
        ],
      },
    ],
  },
  nickname: "",
};

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
  sessionStorage.clear();
  delete w.turnstile;
});

const send = () => page.getByRole("button", { name: copy.preview.send });

describe("LetterPreview", () => {
  it("shows the letter exactly as it will be sent, signed with the name, address and postcode", async () => {
    saveDraft(DRAFT);
    const { container } = await render(<LetterPreview campaignSlug={letterToPm.slug} />);
    await expect.element(page.getByText(MP.name)).toBeVisible();
    await expect.element(page.getByText("My subject")).toBeVisible();
    expect(container.querySelector("article div")!.innerHTML).toBe(
      "<p>My <strong>letter</strong></p>\n<p>Jane Smith<br>1 High St<br>London<br>SW1A 1AA</p>",
    );
    for (const attachment of letterToPm.attachments) {
      await expect
        .element(page.getByRole("link", { name: attachment.file }))
        .toHaveAttribute("href", `/pdfs/${attachment.file}`);
    }
    await expect.element(page.getByText(copy.preview.replyNotice)).toBeVisible();
    await expect
      .element(page.getByRole("link", { name: copy.preview.edit }))
      .toHaveAttribute("href", `/campaigns-v2/${letterToPm.slug}/write`);
  });

  it("shows what was typed as text, not markup", async () => {
    saveDraft({
      ...DRAFT,
      address: "<img src=x onerror=alert(1)>",
      letter: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "<b>hi</b>" }] }] },
    });
    const { container } = await render(<LetterPreview campaignSlug={letterToPm.slug} />);
    await expect.element(page.getByText("<b>hi</b>")).toBeVisible();
    expect(container.querySelector("article img, article b")).toBeNull();
  });

  it("leaves out attachments when there are none", async () => {
    saveDraft({ ...DRAFT, campaign: bill.slug });
    await render(<LetterPreview campaignSlug={bill.slug} />);
    await expect.element(send()).toBeVisible();
    await expect.element(page.getByRole("list", { name: copy.form.attachments })).not.toBeInTheDocument();
  });

  it("says there's nothing to preview without a draft, and links back to the form", async () => {
    await render(<LetterPreview campaignSlug={letterToPm.slug} />);
    await expect.element(page.getByText(copy.preview.none)).toBeVisible();
    await expect
      .element(page.getByRole("link", { name: copy.preview.backToForm }))
      .toHaveAttribute("href", `/campaigns-v2/${letterToPm.slug}#email-your-mp`);
    await expect.element(send()).not.toBeInTheDocument();
  });

  it("sends the draft, counts the conversion once, and goes to the sent page", async () => {
    saveDraft({ ...DRAFT, nickname: "bot" });
    await render(<LetterPreview campaignSlug={letterToPm.slug} />);
    await page.getByLabelText(copy.preview.consent).click();
    await send().click();

    await vi.waitFor(() => expect(navigation.pushed).toEqual([`/campaigns-v2/${letterToPm.slug}/sent`]));
    expect(sent).toEqual([
      {
        campaign: letterToPm.slug,
        name: "Jane Smith",
        postcode: "sw1a 1aa",
        address: "1 High St\nLondon",
        email: "jane@example.com",
        subject: "My subject",
        letter: DRAFT.letter,
        consent: true,
        nickname: "bot",
        turnstileToken: "",
      },
    ]);
    expect(w.dataLayer).toEqual([{ event: "mp_email_sent" }]);
    expect(readDraft(letterToPm.slug)).toBeNull();
    expect(readSent(letterToPm.slug)).toEqual({ campaign: letterToPm.slug, mpName: MP.name });
    // Still sending while the next page loads, so it can't be sent twice.
    await expect.element(page.getByRole("button", { name: copy.preview.sending })).toBeDisabled();
  });

  it("adds to an existing dataLayer", async () => {
    w.dataLayer = ["gtm"];
    saveDraft(DRAFT);
    await render(<LetterPreview campaignSlug={letterToPm.slug} />);
    await send().click();
    await vi.waitFor(() => expect(w.dataLayer).toEqual(["gtm", { event: "mp_email_sent" }]));
  });

  it("shows the server's refusal, counts nothing, keeps the draft, and lets the sender try again", async () => {
    respond = async () => Response.json({ ok: false, message: copy.errors.alreadySent }, { status: 400 });
    saveDraft(DRAFT);
    await render(<LetterPreview campaignSlug={letterToPm.slug} />);
    await send().click();
    await expect.element(page.getByRole("alert")).toHaveTextContent(copy.errors.alreadySent);
    expect(w.dataLayer).toBeUndefined();
    expect(navigation.pushed).toEqual([]);
    expect(readDraft(letterToPm.slug)).toEqual(DRAFT);

    respond = async () => {
      throw new TypeError("offline");
    };
    await send().click();
    await expect.element(page.getByRole("alert")).toHaveTextContent(copy.preview.networkError);
    expect(w.dataLayer).toBeUndefined();
  });

  it("says it's sending while it waits", async () => {
    let finish!: (res: Response) => void;
    respond = () => new Promise((resolve) => (finish = resolve));
    saveDraft(DRAFT);
    await render(<LetterPreview campaignSlug={letterToPm.slug} />);
    await send().click();
    await expect.element(page.getByRole("button", { name: copy.preview.sending })).toBeDisabled();
    finish(Response.json({ ok: false, message: copy.errors.failed }));
    await expect.element(send()).toBeEnabled();
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
    saveDraft(DRAFT);
    await render(<LetterPreview campaignSlug={letterToPm.slug} turnstileSiteKey="site-key" />);

    await expect.element(send()).toBeDisabled();
    await vi.waitFor(() => expect(widgets).toHaveLength(1));
    widgets[0].callback("token-1");
    await send().click();
    await expect.element(page.getByRole("alert")).toHaveTextContent(copy.errors.spamFailed);
    expect(sent[0].turnstileToken).toBe("token-1");

    await vi.waitFor(() => expect(widgets).toHaveLength(2));
    await expect.element(send()).toBeDisabled();
  });
});
