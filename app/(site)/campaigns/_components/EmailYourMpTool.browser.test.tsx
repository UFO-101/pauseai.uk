import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";
import { page, userEvent } from "vitest/browser";
import { campaigns, copy } from "@/lib/content/email-your-mp";
import { navigation } from "@/tests/browser/navigation";
import { readLookup, saveDraft, saveLookup } from "./draft";
import EmailYourMpTool from "./EmailYourMpTool";

const [letterToPm, bill] = campaigns;
const PLACE = { latitude: 51.501, longitude: -0.1416 };
const MP = {
  name: "Polly Placeholder",
  salutation: "Ms Placeholder",
  constituency: "Cities of London and Westminster",
  email: "polly.placeholder.mp@parliament.uk",
};

let lookups: unknown[];
let respond: () => Promise<Response>;

beforeEach(() => {
  lookups = [];
  respond = async () => Response.json({ ok: true, mp: MP, statuses: {}, place: PLACE });
  vi.spyOn(window, "fetch").mockImplementation(async (_url, init) => {
    if (init?.body) lookups.push(JSON.parse(String(init.body)));
    return respond();
  });
});
afterEach(() => {
  vi.restoreAllMocks();
  sessionStorage.clear();
});

async function lookUp(name = "Jane Smith", postcode = "SW1A 1AA", address = "1 High St") {
  if (name) await userEvent.fill(page.getByLabelText(copy.lookup.nameLabel), name);
  if (address) await userEvent.fill(page.getByLabelText(copy.lookup.addressLabel), address);
  if (postcode) await userEvent.fill(page.getByLabelText(copy.lookup.postcodeLabel), postcode);
  await page.getByRole("button", { name: copy.lookup.button }).click();
}

describe("EmailYourMpTool", () => {
  it("finds the MP, keeps the lookup, and goes on to write the campaign's letter", async () => {
    saveDraft({
      campaign: letterToPm.slug,
      name: "Old",
      postcode: "X",
      mp: MP,
      statuses: {},
      email: "",
      address: "",
      subject: "",
      letter: { type: "doc", content: [] },
      nickname: "",
    });
    await render(<EmailYourMpTool campaignSlug={letterToPm.slug} />);
    await lookUp(" Jane Smith ", " SW1A 1AA ", " 1 High St ");

    await vi.waitFor(() => expect(navigation.pushed).toEqual([`/campaigns/${letterToPm.slug}/write`]));
    expect(lookups).toEqual([{ postcode: " SW1A 1AA " }]);
    expect(readLookup(letterToPm.slug)).toEqual({
      campaign: letterToPm.slug,
      name: "Jane Smith",
      address: "1 High St",
      postcode: "SW1A 1AA",
      mp: MP,
      statuses: {},
      place: PLACE,
    });
    // A new lookup starts a new letter.
    expect(sessionStorage.getItem("email-your-mp-draft")).toBeNull();
    // Still "looking" while the next page loads.
    await expect.element(page.getByRole("button", { name: copy.lookup.looking })).toBeDisabled();
  });

  it("goes on to the next campaign's page if the MP has done this one, saying where it came from", async () => {
    respond = async () => Response.json({ ok: true, mp: MP, statuses: { [letterToPm.slug]: "signed" } });
    await render(<EmailYourMpTool campaignSlug={letterToPm.slug} />);
    await lookUp();

    await vi.waitFor(() => expect(navigation.pushed).toEqual([`/campaigns/${bill.slug}`]));
    expect(readLookup(bill.slug)).toMatchObject({ campaign: bill.slug, movedFrom: letterToPm.slug });
  });

  it("comes back with the name, address and postcode it went with", async () => {
    saveLookup({
      campaign: bill.slug,
      name: "Jane Smith",
      address: "1 High St",
      postcode: "SW1A 1AA",
      mp: MP,
      statuses: {},
    });
    await render(<EmailYourMpTool campaignSlug={letterToPm.slug} />);
    await expect.element(page.getByLabelText(copy.lookup.nameLabel)).toHaveValue("Jane Smith");
    await expect.element(page.getByLabelText(copy.lookup.addressLabel)).toHaveValue("1 High St");
    await expect.element(page.getByLabelText(copy.lookup.postcodeLabel)).toHaveValue("SW1A 1AA");
    expect(lookups).toEqual([]);
    expect(navigation.pushed).toEqual([]);
  });

  it("moves on from the PM letter to the bill even with a status for the bill, as nobody has done that", async () => {
    respond = async () =>
      Response.json({ ok: true, mp: MP, statuses: { [letterToPm.slug]: "signed", [bill.slug]: "signed" } });
    await render(<EmailYourMpTool campaignSlug={letterToPm.slug} />);
    await lookUp();

    await vi.waitFor(() => expect(navigation.pushed).toEqual([`/campaigns/${bill.slug}`]));
  });

  it("stays and says why if the browser won't keep the lookup", async () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("blocked", "SecurityError");
    });
    respond = async () => Response.json({ ok: true, mp: MP, statuses: { [letterToPm.slug]: "signed" } });
    await render(<EmailYourMpTool campaignSlug={letterToPm.slug} />);
    await lookUp();

    await expect.element(page.getByText(letterToPm.alreadyDone!)).toBeVisible();
    await expect.element(page.getByRole("alert")).toHaveTextContent(copy.form.storageFailed);
    expect(navigation.pushed).toEqual([]);

    // The MP hasn't done it: nothing's done, but there's still nowhere to go.
    respond = async () => Response.json({ ok: true, mp: MP, statuses: {} });
    await page.getByRole("button", { name: copy.lookup.button }).click();
    await expect.element(page.getByRole("alert")).toHaveTextContent(copy.form.storageFailed);
    await expect.element(page.getByText(letterToPm.alreadyDone!)).not.toBeInTheDocument();
    await expect.element(page.getByRole("heading", { name: "Polly Placeholder" })).toBeVisible();
  });

  it("lists the test MPs' postcodes, only when asked to", async () => {
    const { rerender } = await render(<EmailYourMpTool campaignSlug={letterToPm.slug} />);
    await expect.element(page.getByText(/ZZ9 9ZZ/)).not.toBeInTheDocument();
    await rerender(<EmailYourMpTool campaignSlug={letterToPm.slug} showTestMps />);
    // The first is always shown; the rest, with what each is for, unfold.
    await expect.element(page.getByText(`${copy.lookup.testPostcodes} ZZ9 9ZZ (Testy McTestface MP)`)).toBeVisible();
    // Folded: the rest aren't in the accessibility tree until the arrow is pressed.
    await expect.element(page.getByText(/Signy/)).not.toBeVisible();
    await page.getByText(copy.lookup.testPostcodes, { exact: false }).first().click();
    const items = page.getByRole("listitem");
    await expect
      .element(items.nth(1))
      .toHaveTextContent(`ZZ9 9ZS (Signy McTestface MP): ${copy.lookup.testMpSigned(letterToPm.title)}`);
    await expect
      .element(items.nth(2))
      .toHaveTextContent(`ZZ9 9ZB (Backy McTestface MP): ${copy.lookup.testMpSigned(bill.title)}`);
    await expect
      .element(items.nth(3))
      .toHaveTextContent(`ZZ9 9ZN (Nomail McTestface MP): ${copy.lookup.testMpNoEmail}`);
  });

  it("shows an MP with no email, and stays", async () => {
    respond = async () => Response.json({ ok: true, mp: { ...MP, email: null }, statuses: {} });
    await render(<EmailYourMpTool campaignSlug={letterToPm.slug} />);
    await lookUp();

    await expect.element(page.getByText(copy.lookup.noEmail)).toBeVisible();
    await expect.element(page.getByRole("heading", { name: "Polly Placeholder" })).toBeVisible();
    expect(navigation.pushed).toEqual([]);
  });

  it("needs a name, an address and a postcode, and says why it wants the address", async () => {
    await render(<EmailYourMpTool campaignSlug={letterToPm.slug} />);
    await expect
      .element(page.getByLabelText(copy.lookup.addressLabel))
      .toHaveAccessibleDescription(copy.lookup.addressHint);
    await lookUp("", "", "");
    await expect.element(page.getByRole("alert")).toHaveTextContent(copy.lookup.nameRequired);
    await lookUp("Jane", "", "");
    await expect.element(page.getByRole("alert")).toHaveTextContent(copy.lookup.addressRequired);
    await lookUp("Jane", "", "1 High St");
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
    expect(navigation.pushed).toEqual([]);
  });

  it("says it's looking while it waits", async () => {
    let finish!: (res: Response) => void;
    respond = () => new Promise((resolve) => (finish = resolve));
    await render(<EmailYourMpTool campaignSlug={letterToPm.slug} />);
    await lookUp();
    await expect.element(page.getByRole("button", { name: copy.lookup.looking })).toBeDisabled();
    finish(Response.json({ ok: false, message: copy.lookup.notFound }));
    await expect.element(page.getByRole("button", { name: copy.lookup.button })).toBeEnabled();
  });
});
