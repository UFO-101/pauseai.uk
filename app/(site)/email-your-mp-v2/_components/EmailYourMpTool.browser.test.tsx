import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";
import { page, userEvent } from "vitest/browser";
import { campaigns, copy } from "@/lib/content/email-your-mp";
import EmailYourMpPage from "./EmailYourMpPage";
import EmailYourMpTool from "./EmailYourMpTool";

const [letterToPm, bill] = campaigns;
const MP = { name: "Rachel Blake", salutation: "Ms Blake", constituency: "Cities of London and Westminster", email: "rachel.blake.mp@parliament.uk" };

let lookups: unknown[];
let respond: () => Promise<Response>;

beforeEach(() => {
  lookups = [];
  respond = async () => Response.json({ ok: true, mp: MP, statuses: {} });
  vi.spyOn(window, "fetch").mockImplementation(async (_url, init) => {
    lookups.push(JSON.parse(String(init!.body)));
    return respond();
  });
});
afterEach(() => vi.restoreAllMocks());

async function lookUp(name = "Jane Smith", postcode = "SW1A 1AA") {
  if (name) await userEvent.fill(page.getByLabelText(copy.lookup.nameLabel), name);
  if (postcode) await userEvent.fill(page.getByLabelText(copy.lookup.postcodeLabel), postcode);
  await page.getByRole("button", { name: copy.lookup.button }).click();
}

describe("EmailYourMpTool", () => {
  it("finds the MP, then drafts the first campaign they haven't done", async () => {
    respond = async () => Response.json({ ok: true, mp: MP, statuses: { [letterToPm.slug]: "signed" } });
    await render(<EmailYourMpTool />);
    await lookUp();

    expect(lookups).toEqual([{ postcode: "SW1A 1AA" }]);
    await expect.element(page.getByRole("heading", { name: "Rachel Blake" })).toBeVisible();
    await expect.element(page.getByText(copy.lookup.mpOf(MP.constituency))).toBeVisible();
    await expect.element(page.getByText(MP.email)).toBeVisible();
    await expect.element(page.getByLabelText(copy.form.subjectLabel)).toHaveValue(bill.subject);
  });

  it("on a campaign's page, keeps to that campaign and says if it's done", async () => {
    respond = async () => Response.json({ ok: true, mp: MP, statuses: { [letterToPm.slug]: "signed" } });
    await render(<EmailYourMpTool campaignSlug={letterToPm.slug} />);
    await lookUp();

    await expect.element(page.getByText(letterToPm.alreadyDone)).toBeVisible();
    await expect.element(page.getByLabelText(copy.form.subjectLabel)).toHaveValue(letterToPm.subject);
  });

  it("shows an MP with no email, without a form", async () => {
    respond = async () => Response.json({ ok: true, mp: { ...MP, email: null }, statuses: {} });
    await render(<EmailYourMpTool />);
    await lookUp();

    await expect.element(page.getByText(copy.lookup.noEmail)).toBeVisible();
    await expect.element(page.getByRole("textbox", { name: copy.form.letterLabel, exact: true })).not.toBeInTheDocument();
  });

  it("needs a name and a postcode", async () => {
    await render(<EmailYourMpTool />);
    await lookUp("", "");
    await expect.element(page.getByRole("alert")).toHaveTextContent(copy.lookup.nameRequired);
    await lookUp("Jane", "");
    await expect.element(page.getByRole("alert")).toHaveTextContent(copy.lookup.postcodeRequired);
    expect(lookups).toEqual([]);
  });

  it("shows the server's message, or its own if the request fails", async () => {
    respond = async () => Response.json({ ok: false, message: copy.lookup.notFound });
    await render(<EmailYourMpTool />);
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
    await render(<EmailYourMpTool />);
    await lookUp();
    await expect.element(page.getByRole("button", { name: copy.lookup.looking })).toBeDisabled();
    finish(Response.json({ ok: true, mp: MP, statuses: {} }));
    await expect.element(page.getByRole("button", { name: copy.lookup.button })).toBeEnabled();
  });
});

describe("EmailYourMpPage", () => {
  it("is titled for its campaign, or for the tool", async () => {
    const { rerender } = await render(<EmailYourMpPage campaign={bill} />);
    await expect.element(page.getByRole("heading", { level: 1 })).toHaveTextContent(bill.title);
    await expect.element(page.getByText(bill.description)).toBeVisible();
    await rerender(<EmailYourMpPage />);
    await expect.element(page.getByRole("heading", { level: 1 })).toHaveTextContent(copy.pageTitle);
    await expect.element(page.getByText(copy.pageDescription)).toBeVisible();
  });
});
