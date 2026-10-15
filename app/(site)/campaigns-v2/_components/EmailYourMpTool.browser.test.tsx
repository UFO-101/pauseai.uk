import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";
import { page, userEvent } from "vitest/browser";
import { campaigns, copy } from "@/lib/content/email-your-mp";
import EmailYourMpTool from "./EmailYourMpTool";
import { saveDraft } from "./draft";
import { leaveHandoff } from "./handoff";

const { navigate } = vi.hoisted(() => ({ navigate: vi.fn() }));
vi.mock("@/lib/navigate", () => ({ navigate }));

const [letterToPm, bill] = campaigns;
const MP = { name: "Polly Placeholder", salutation: "Ms Placeholder", constituency: "Cities of London and Westminster", email: "polly.placeholder.mp@parliament.uk" };

let lookups: unknown[];
let respond: () => Promise<Response>;

beforeEach(() => {
  lookups = [];
  respond = async () => Response.json({ ok: true, mp: MP, statuses: {} });
  vi.spyOn(window, "fetch").mockImplementation(async (_url, init) => {
    if (init?.body) lookups.push(JSON.parse(String(init.body)));
    return respond();
  });
});
afterEach(() => {
  vi.restoreAllMocks();
  navigate.mockReset();
  sessionStorage.clear();
});

async function lookUp(name = "Jane Smith", postcode = "SW1A 1AA") {
  if (name) await userEvent.fill(page.getByLabelText(copy.lookup.nameLabel), name);
  if (postcode) await userEvent.fill(page.getByLabelText(copy.lookup.postcodeLabel), postcode);
  await page.getByRole("button", { name: copy.lookup.button }).click();
}

describe("EmailYourMpTool", () => {
  it("finds the MP, then drafts the campaign's letter", async () => {
    await render(<EmailYourMpTool campaignSlug={letterToPm.slug} />);
    await lookUp();

    expect(lookups).toEqual([{ postcode: "SW1A 1AA" }]);
    await expect.element(page.getByRole("heading", { name: "Polly Placeholder" })).toBeVisible();
    await expect.element(page.getByText(copy.lookup.mpOf(MP.constituency))).toBeVisible();
    await expect.element(page.getByText(MP.email)).toBeVisible();
    await expect.element(page.getByLabelText(copy.form.subjectLabel)).toHaveValue(letterToPm.subject);
    expect(navigate).not.toHaveBeenCalled();
  });

  it("moves on to the next campaign if the MP has done this one, taking the lookup along", async () => {
    respond = async () => Response.json({ ok: true, mp: MP, statuses: { [letterToPm.slug]: "signed" } });
    await render(<EmailYourMpTool campaignSlug={letterToPm.slug} />);
    await lookUp();

    await vi.waitFor(() => expect(navigate).toHaveBeenCalledWith(`/campaigns-v2/${bill.slug}#email-your-mp`));
    await expect.element(page.getByRole("button", { name: copy.lookup.looking })).toBeDisabled();
  });

  it("opens with the lookup another campaign's page moved on with, and says why", async () => {
    leaveHandoff({ from: letterToPm.slug, to: bill.slug, name: "Jane Smith", postcode: "SW1A 1AA", mp: MP, statuses: { [letterToPm.slug]: "signed" } });
    await render(<EmailYourMpTool campaignSlug={bill.slug} />);

    await expect.element(page.getByText(letterToPm.movedOn)).toBeVisible();
    await expect.element(page.getByLabelText(copy.lookup.nameLabel)).toHaveValue("Jane Smith");
    await expect.element(page.getByLabelText(copy.lookup.postcodeLabel)).toHaveValue("SW1A 1AA");
    await expect.element(page.getByLabelText(copy.form.subjectLabel)).toHaveValue(bill.subject);
    expect(lookups).toEqual([]);

    // Looking up again is a fresh start, without the note.
    await lookUp();
    await expect.element(page.getByText(letterToPm.movedOn)).not.toBeInTheDocument();
  });

  it("comes back to the letter from its preview, as it was left", async () => {
    saveDraft({
      campaign: letterToPm.slug,
      name: "Jane Smith",
      postcode: "SW1A 1AA",
      mp: MP,
      statuses: {},
      email: "jane@example.com",
      address: "1 High St",
      subject: "Kept subject",
      letter: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Kept letter" }] }] },
      nickname: "",
    });
    await render(<EmailYourMpTool campaignSlug={letterToPm.slug} />);

    await expect.element(page.getByLabelText(copy.lookup.nameLabel)).toHaveValue("Jane Smith");
    await expect.element(page.getByLabelText(copy.lookup.postcodeLabel)).toHaveValue("SW1A 1AA");
    await expect.element(page.getByRole("heading", { name: "Polly Placeholder" })).toBeVisible();
    await expect.element(page.getByLabelText(copy.form.subjectLabel)).toHaveValue("Kept subject");
    await expect.element(page.getByLabelText(copy.form.emailLabel)).toHaveValue("jane@example.com");
    await expect.element(page.getByText(letterToPm.movedOn)).not.toBeInTheDocument();
    expect(lookups).toEqual([]);

    // Looking up again starts a new letter.
    respond = async () => Response.json({ ok: true, mp: { ...MP, constituency: "Elsewhere" }, statuses: {} });
    await lookUp();
    await expect.element(page.getByLabelText(copy.form.subjectLabel)).toHaveValue(letterToPm.subject);
  });

  it("stays and says so, without the form, if the MP has done every campaign", async () => {
    respond = async () => Response.json({ ok: true, mp: MP, statuses: { [letterToPm.slug]: "signed", [bill.slug]: "supports" } });
    await render(<EmailYourMpTool campaignSlug={letterToPm.slug} />);
    await lookUp();

    await expect.element(page.getByText(copy.lookup.allDone)).toBeVisible();
    await expect.element(page.getByLabelText(copy.form.subjectLabel)).not.toBeInTheDocument();
    expect(navigate).not.toHaveBeenCalled();
  });

  it("stays and says it's done if the browser won't carry the lookup along", async () => {
    respond = async () => Response.json({ ok: true, mp: MP, statuses: { [letterToPm.slug]: "signed" } });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("blocked", "SecurityError");
    });
    await render(<EmailYourMpTool campaignSlug={letterToPm.slug} />);
    await lookUp();

    await expect.element(page.getByText(letterToPm.alreadyDone)).toBeVisible();
    await expect.element(page.getByLabelText(copy.form.subjectLabel)).not.toBeInTheDocument();
    expect(navigate).not.toHaveBeenCalled();
  });

  it("lists the test MPs' postcodes, only when asked to", async () => {
    const { rerender } = await render(<EmailYourMpTool campaignSlug={letterToPm.slug} />);
    await expect.element(page.getByText(/ZZ9 9ZZ/)).not.toBeInTheDocument();
    await rerender(<EmailYourMpTool campaignSlug={letterToPm.slug} showTestMps />);
    await expect.element(page.getByText(copy.lookup.testPostcodes("ZZ9 9ZZ (Testy McTestface MP), ZZ9 9ZS (Signy McTestface MP)"))).toBeVisible();
  });

  it("shows an MP with no email, without a form", async () => {
    respond = async () => Response.json({ ok: true, mp: { ...MP, email: null }, statuses: {} });
    await render(<EmailYourMpTool campaignSlug={letterToPm.slug} />);
    await lookUp();

    await expect.element(page.getByText(copy.lookup.noEmail)).toBeVisible();
    await expect.element(page.getByRole("textbox", { name: copy.form.letterLabel, exact: true })).not.toBeInTheDocument();
  });

  it("needs a name and a postcode", async () => {
    await render(<EmailYourMpTool campaignSlug={letterToPm.slug} />);
    await lookUp("", "");
    await expect.element(page.getByRole("alert")).toHaveTextContent(copy.lookup.nameRequired);
    await lookUp("Jane", "");
    await expect.element(page.getByRole("alert")).toHaveTextContent(copy.lookup.postcodeRequired);
    expect(lookups).toEqual([]);
  });

  it("shows the server's message, or its own if the request fails", async () => {
    respond = async () => Response.json({ ok: false, message: copy.lookup.notFound });
    await render(<EmailYourMpTool campaignSlug={letterToPm.slug} />);
    await lookUp();
    await expect.element(page.getByRole("alert")).toHaveTextContent(copy.lookup.notFound);

    respond = async () => {
      throw new TypeError("offline");
    };
    await page.getByRole("button", { name: copy.lookup.button }).click();
    await expect.element(page.getByRole("alert")).toHaveTextContent(copy.lookup.failed);
  });

  it("says it's looking while it waits", async () => {
    let finish!: (res: Response) => void;
    respond = () => new Promise((resolve) => (finish = resolve));
    await render(<EmailYourMpTool campaignSlug={letterToPm.slug} />);
    await lookUp();
    await expect.element(page.getByRole("button", { name: copy.lookup.looking })).toBeDisabled();
    finish(Response.json({ ok: true, mp: MP, statuses: {} }));
    await expect.element(page.getByRole("button", { name: copy.lookup.button })).toBeEnabled();
  });
});
