import { describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";
import { page, userEvent } from "vitest/browser";
import { campaigns } from "@/lib/content/email-your-mp";
import { staffCopy } from "@/lib/content/staff-interface";
import type { Politician } from "@/lib/server/politicians";
import type { MpSync } from "@/lib/server/mp-sync";
import ChangesTable from "./ChangesTable";
import LettersTable from "./LettersTable";
import MpCheckList from "./MpCheckList";
import PoliticianFilters from "./PoliticianFilters";
import PoliticianForm from "./PoliticianForm";
import PoliticianTable from "./PoliticianTable";
import StaffHeader from "./StaffHeader";
import StatusForm from "./StatusForm";
import SyncList from "./SyncList";

const [pm, bill] = campaigns;

const MP: Politician = {
  id: 7,
  airtableId: "rec5257",
  house: "commons",
  name: "Rachel Blake",
  salutation: "Ms Blake",
  constituency: "Cities of London and Westminster",
  party: "Labour (Co-op)",
  email: "rachel.blake.mp@parliament.uk",
  isTest: false,
  sitting: true,
  statuses: { [pm.slug]: { status: "signed", date: "2026-10-01", note: "", updatedAt: "2026-10-02T10:00:00Z", updatedBy: "jo@pauseai.uk" } },
};

/** A stand-in Server Action that keeps what it was sent. */
function action() {
  const sent: Record<string, FormDataEntryValue>[] = [];
  const fn = vi.fn((form: FormData) => void sent.push(Object.fromEntries(form)));
  return { fn, sent };
}

describe("StaffHeader", () => {
  it("links the staff pages, says who's logged in, and logs out with a POST", async () => {
    await render(<StaffHeader email="jo@pauseai.uk" />);
    await expect.element(page.getByRole("link", { name: staffCopy.nav.politicians })).toHaveAttribute("href", "/staff");
    await expect.element(page.getByRole("link", { name: staffCopy.nav.import })).toHaveAttribute("href", "/staff/import");
    await expect.element(page.getByRole("link", { name: staffCopy.nav.letters })).toHaveAttribute("href", "/staff/letters");
    await expect.element(page.getByText(staffCopy.nav.signedInAs("jo@pauseai.uk"))).toBeVisible();
    const form = page.getByRole("button", { name: staffCopy.nav.logout }).element().closest("form")!;
    expect(form.getAttribute("method")).toBe("post");
    expect(form.getAttribute("action")).toBe("/staff/api/logout");
  });
});

describe("PoliticianFilters", () => {
  it("is a GET form to /staff, filled in with the current filter", async () => {
    await render(<PoliticianFilters search="blake" house="lords" campaign={bill.slug} />);
    await expect.element(page.getByRole("searchbox")).toHaveValue("blake");
    await expect.element(page.getByRole("combobox", { name: staffCopy.fields.house, exact: true })).toHaveValue("lords");
    await expect.element(page.getByRole("combobox", { name: staffCopy.politician.statusesTitle, exact: true })).toHaveValue(bill.slug);
    const form = page.getByRole("searchbox").element().closest("form")!;
    expect(form.getAttribute("method")).toBe("get");
    expect(form.getAttribute("action")).toBe("/staff");
  });
});

describe("PoliticianTable", () => {
  it("lists each politician with their status for each campaign", async () => {
    await render(<PoliticianTable politicians={[MP, { ...MP, id: 8, name: "Testy McTestface MP", isTest: true, sitting: false, house: "lords", statuses: {} }]} />);
    await expect.element(page.getByRole("link", { name: "Rachel Blake" })).toHaveAttribute("href", "/staff/politicians/7");
    await expect.element(page.getByText(pm.title)).toBeInTheDocument();
    await expect.element(page.getByRole("cell", { name: staffCopy.statuses.signed })).toBeInTheDocument();
    await expect.element(page.getByText(staffCopy.politicians.testMp)).toBeVisible();
    await expect.element(page.getByText(staffCopy.politicians.notSitting)).toBeVisible();
    await expect.element(page.getByRole("cell", { name: staffCopy.houses.lords })).toBeVisible();
  });

  it("says when nobody matches", async () => {
    await render(<PoliticianTable politicians={[]} />);
    await expect.element(page.getByText(staffCopy.politicians.none)).toBeVisible();
  });
});

describe("StatusForm", () => {
  it("shows the current status and who set it, and sends a change", async () => {
    const { fn, sent } = action();
    await render(<StatusForm politicianId={7} campaign={pm} current={MP.statuses[pm.slug]} action={fn} />);
    const form = page.getByRole("form", { name: pm.title });
    await expect.element(form.getByRole("combobox", { name: staffCopy.fields.status, exact: true })).toHaveValue("signed");
    await expect.element(form.getByLabelText(staffCopy.fields.date, { exact: true })).toHaveValue("2026-10-01");
    await expect.element(page.getByText(/jo@pauseai\.uk/)).toBeVisible();

    await userEvent.selectOptions(form.getByRole("combobox", { name: staffCopy.fields.status, exact: true }).element() as HTMLSelectElement, "supports");
    await userEvent.fill(form.getByRole("textbox", { name: staffCopy.fields.note, exact: true }), "Said so on the radio");
    await form.getByRole("button", { name: staffCopy.politician.save }).click();
    await vi.waitFor(() => expect(sent).toHaveLength(1));
    expect(sent[0]).toEqual({ politicianId: "7", campaign: pm.slug, status: "supports", date: "2026-10-01", note: "Said so on the radio" });
  });

  it("starts empty when there's no status", async () => {
    await render(<StatusForm politicianId={7} campaign={bill} action={() => {}} />);
    await expect.element(page.getByRole("combobox", { name: staffCopy.fields.status, exact: true })).toHaveValue("");
    await expect.element(page.getByRole("textbox", { name: staffCopy.fields.note, exact: true })).toHaveValue("");
  });
});

describe("PoliticianForm", () => {
  it("adds a signer, starting from the Lords", async () => {
    const { fn, sent } = action();
    await render(<PoliticianForm action={fn} submitLabel="Add" />);
    await expect.element(page.getByRole("combobox", { name: staffCopy.fields.house, exact: true })).toHaveValue("lords");
    await userEvent.fill(page.getByRole("textbox", { name: staffCopy.fields.name, exact: true }), "Lord Example");
    await page.getByRole("button", { name: "Add" }).click();
    await vi.waitFor(() => expect(sent).toHaveLength(1));
    expect(sent[0]).toMatchObject({ house: "lords", name: "Lord Example", constituency: "", email: "" });
    expect(sent[0].id).toBeUndefined();
  });

  it("edits a signer, filled in with their details", async () => {
    const { fn, sent } = action();
    await render(<PoliticianForm action={fn} politician={{ ...MP, airtableId: null, constituency: null, email: null, house: "senedd" }} submitLabel="Save" />);
    await expect.element(page.getByRole("combobox", { name: staffCopy.fields.house, exact: true })).toHaveValue("senedd");
    await expect.element(page.getByRole("textbox", { name: staffCopy.fields.name, exact: true })).toHaveValue("Rachel Blake");
    await page.getByRole("button", { name: "Save" }).click();
    await vi.waitFor(() => expect(sent).toHaveLength(1));
    expect(sent[0]).toMatchObject({ id: "7", house: "senedd", salutation: "Ms Blake", party: "Labour (Co-op)" });
  });
});

describe("SyncList", () => {
  const mp = (id: number, email: string | null = "a@parliament.uk") => ({ airtableId: `rec${id}`, name: `MP ${id}`, salutation: "", constituency: `Seat ${id}`, party: "", email });
  const held: MpSync = { id: 3, at: "2026-10-12T02:00:00Z", status: "held", changes: { added: [mp(1)], removed: [mp(2, null)], changed: [] }, decidedBy: null };
  const applied: MpSync = { id: 2, at: "2026-10-11T02:00:00Z", status: "applied", changes: { added: [], removed: [], changed: [mp(4)] }, decidedBy: "jo@pauseai.uk" };

  it("lists each sync's changes, and lets a held one be applied or discarded", async () => {
    const { fn, sent } = action();
    await render(<SyncList syncs={[held, applied]} decide={fn} />);
    await expect.element(page.getByText(staffCopy.syncs.status.held)).toBeVisible();
    await expect.element(page.getByText("Seat 1: MP 1", { exact: true })).toBeVisible();
    await expect.element(page.getByText(`Seat 2: MP 2 (${staffCopy.politicians.noEmail})`)).toBeVisible();
    await expect.element(page.getByText(`${staffCopy.syncs.changed} (1)`)).toBeVisible();
    await expect.element(page.getByText(staffCopy.syncs.decidedBy("jo@pauseai.uk"), { exact: false })).toBeVisible();
    expect(page.getByRole("button", { name: staffCopy.syncs.apply }).all()).toHaveLength(1);

    await page.getByRole("button", { name: staffCopy.syncs.discard }).click();
    await vi.waitFor(() => expect(sent).toHaveLength(1));
    expect(sent[0]).toEqual({ id: "3", decision: "discard" });
  });

  it("says when there are none", async () => {
    await render(<SyncList syncs={[]} decide={() => {}} />);
    await expect.element(page.getByText(staffCopy.syncs.none)).toBeVisible();
  });
});

describe("MpCheckList", () => {
  it("lists each problem, with what Airtable and Parliament say", async () => {
    await render(
      <MpCheckList
        check={{
          at: "2026-10-14T02:00:00Z",
          problems: [
            { kind: "extra", constituency: "Gone", airtable: "Former MP" },
            { kind: "unofficial", constituency: "Montgomeryshire and Glyndwr", airtable: "Steve Witherden" },
            { kind: "missing", constituency: "New Seat", parliament: "New MP" },
            { kind: "name", constituency: "North East Derbyshire", airtable: "Louise Jones", parliament: "Louise Sandher-Jones" },
            { kind: "email", constituency: "Wallasey", name: "Angela Eagle", airtable: "eaglea@parliament.uk", parliament: ["angela.eagle.mp@parliament.uk", "a@example.org"] },
            { kind: "email", constituency: "Zetland", name: "Zed", airtable: null, parliament: ["z@parliament.uk"] },
          ],
        }}
      />,
    );
    const row = (constituency: string) => page.getByRole("row").filter({ hasText: constituency });
    await expect.element(row("Gone")).toHaveTextContent(`Gone${staffCopy.check.kinds.extra}Former MP`);
    await expect.element(row("Montgomeryshire")).toHaveTextContent(`Montgomeryshire and Glyndwr${staffCopy.check.kinds.unofficial}Steve Witherden`);
    await expect.element(row("New Seat")).toHaveTextContent(`New Seat${staffCopy.check.kinds.missing}New MP`);
    await expect.element(row("North East Derbyshire")).toHaveTextContent(`North East Derbyshire${staffCopy.check.kinds.name}Louise JonesLouise Sandher-Jones`);
    await expect.element(row("Wallasey")).toHaveTextContent(`Wallasey${staffCopy.check.kinds.email}Angela Eagle: eaglea@parliament.ukangela.eagle.mp@parliament.uk, a@example.org`);
    await expect.element(row("Zetland")).toHaveTextContent(`Zetland${staffCopy.check.kinds.email}Zed: ${staffCopy.check.noEmail}z@parliament.uk`);
  });

  it("says when all is well, or when there's been no check", async () => {
    const { rerender } = await render(<MpCheckList check={{ at: "2026-10-14T02:00:00Z", problems: [] }} />);
    await expect.element(page.getByText(staffCopy.check.allGood)).toBeVisible();
    await rerender(<MpCheckList />);
    await expect.element(page.getByText(staffCopy.check.never)).toBeVisible();
  });
});

describe("ChangesTable", () => {
  it("lists who changed what", async () => {
    await render(<ChangesTable changes={[{ id: 1, at: "2026-10-12T09:00:00Z", actor: "jo@pauseai.uk", action: "set status", details: { politicianId: 7 } }]} />);
    await expect.element(page.getByRole("cell", { name: "jo@pauseai.uk" })).toBeVisible();
    await expect.element(page.getByText('{"politicianId":7}')).toBeVisible();
  });
});

describe("LettersTable", () => {
  const letter = {
    id: 1,
    campaign: pm.slug,
    status: "bounced",
    senderName: "Jane Smith",
    senderEmail: "jane@example.com",
    contactConsent: true,
    mpName: "Testy McTestface MP",
    isTest: true,
    subject: "S",
    createdAt: "2026-10-12T09:00:00Z",
    sentAt: "2026-10-12T09:05:00Z",
    repliedAt: null,
    events: [
      { at: "2026-10-12T09:00:00Z", status: "sending", details: {} },
      { at: "2026-10-12T09:10:00Z", status: "bounced", details: { type: "HardBounce" } },
    ],
  };

  it("lists letters with their status and history", async () => {
    await render(<LettersTable letters={[letter, { ...letter, id: 2, campaign: "gone", status: "odd", isTest: false, contactConsent: false, repliedAt: "2026-10-13T09:00:00Z", events: [{ at: letter.createdAt, status: "strange", details: {} }] }]} />);
    await expect.element(page.getByText("jane@example.com").first()).toBeInTheDocument();
    await expect.element(page.getByText(pm.title).first()).toBeInTheDocument();
    await expect.element(page.getByText("gone")).toBeInTheDocument();
    await expect.element(page.getByText("odd")).toBeInTheDocument();
    await expect.element(page.getByRole("cell", { name: staffCopy.letters.consent.yes, exact: true })).toBeInTheDocument();
    await expect.element(page.getByRole("cell", { name: staffCopy.letters.consent.no, exact: true })).toBeInTheDocument();
    await expect.element(page.getByText(/strange/)).toBeInTheDocument();
    await expect.element(page.getByText('{"type":"HardBounce"}', { exact: false })).toBeInTheDocument();
    expect(page.getByText(staffCopy.politicians.testMp).all()).toHaveLength(1);
    await expect.element(page.getByRole("cell", { name: new Date("2026-10-13T09:00:00Z").toLocaleString("en-GB"), exact: true })).toBeInTheDocument();
  });

  it("says when there are none", async () => {
    await render(<LettersTable letters={[]} />);
    await expect.element(page.getByText(staffCopy.letters.none)).toBeVisible();
  });
});
