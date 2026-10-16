import { describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";
import { page } from "vitest/browser";
import { campaigns } from "@/lib/content/email-your-mp";
import { staffCopy } from "@/lib/content/staff-interface";
import { type ImportRun, NIGHTLY } from "@/lib/import-runs";
import type { ControlAiImport } from "@/lib/server/controlai-import";
import type { MpCheck } from "@/lib/server/mp-check";
import type { Politician } from "@/lib/server/politicians";
import type { MpSync } from "@/lib/server/mp-sync";
import type { SignatoryImport } from "@/lib/server/signatory-import";
import ChangesTable from "./ChangesTable";
import ControlAiImportList from "./ControlAiImportList";
import LettersTable from "./LettersTable";
import MpCheckList from "./MpCheckList";
import PoliticianFilters from "./PoliticianFilters";
import PoliticianForm from "./PoliticianForm";
import PoliticianTable from "./PoliticianTable";
import ResultBox, { OPEN_UP_TO } from "./ResultBox";
import SignatoryImportList from "./SignatoryImportList";
import StaffHeader from "./StaffHeader";
import SyncList from "./SyncList";

const [pm, bill] = campaigns;

const MP: Politician = {
  id: 7,
  airtableId: "rec90002",
  house: "commons",
  name: "Polly Placeholder",
  salutation: "Ms Placeholder",
  constituency: "Cities of London and Westminster",
  party: "Labour (Co-op)",
  email: "polly.placeholder.mp@parliament.uk",
  isTest: false,
  sitting: true,
  statuses: {
    [pm.slug]: {
      status: "signed",
      date: "2026-10-01",
      note: "",
      updatedAt: "2026-10-02T10:00:00Z",
      updatedBy: "jo@pauseai.uk",
    },
  },
};

/** A run from the import log that went well, with `result`. */
function ran<Result>(result: Result, run: Partial<ImportRun<Result>> = {}): ImportRun<Result> {
  return {
    id: 1,
    at: "2026-10-15T02:00:00Z",
    startedBy: NIGHTLY,
    decidedBy: null,
    status: "ok",
    error: null,
    result,
    ...run,
  } as ImportRun<Result>;
}
const failed = <Result,>(error: string, run: Partial<ImportRun<Result>> = {}): ImportRun<Result> =>
  ({ ...ran({}), status: "failed", error, ...run }) as ImportRun<Result>;
const AT = "2026-10-15 02:00";

/** A stand-in Server Action that keeps what it was sent. */
function action() {
  const sent: Record<string, FormDataEntryValue>[] = [];
  const fn = vi.fn((form: FormData) => void sent.push(Object.fromEntries(form)));
  return { fn, sent };
}

describe("StaffHeader", () => {
  it("links the staff pages, says who's logged in, and logs out with a POST", async () => {
    await render(<StaffHeader email="jo@pauseai.uk" current="politicians" />);
    await expect.element(page.getByText(staffCopy.nav.title)).toBeVisible();
    await expect.element(page.getByRole("link", { name: staffCopy.nav.title })).not.toBeInTheDocument();
    // The current page is bold, not a link.
    await expect.element(page.getByRole("link", { name: staffCopy.nav.politicians })).not.toBeInTheDocument();
    expect(page.getByText(staffCopy.nav.politicians).element().tagName).toBe("STRONG");
    await expect
      .element(page.getByRole("link", { name: staffCopy.nav.import }))
      .toHaveAttribute("href", "/staff/import-data");
    await expect
      .element(page.getByRole("link", { name: staffCopy.nav.letters }))
      .toHaveAttribute("href", "/staff/letters");
    await expect.element(page.getByText(staffCopy.nav.signedInAs("jo@pauseai.uk"))).toBeVisible();
    const form = page.getByRole("button", { name: staffCopy.nav.logout }).element().closest("form")!;
    expect(form.getAttribute("method")).toBe("post");
    expect(form.getAttribute("action")).toBe("/staff/api/logout");
  });
});

describe("PoliticianFilters", () => {
  it("is a GET form to /staff, filled in with the current filter", async () => {
    await render(<PoliticianFilters search="blake" house="lords" campaign={pm.slug} />);
    await expect.element(page.getByRole("searchbox")).toHaveValue("blake");
    await expect
      .element(page.getByRole("combobox", { name: staffCopy.fields.house, exact: true }))
      .toHaveValue("lords");
    await expect
      .element(page.getByRole("combobox", { name: staffCopy.politician.statusesTitle, exact: true }))
      .toHaveValue(pm.slug);
    const form = page.getByRole("searchbox").element().closest("form")!;
    expect(form.getAttribute("method")).toBe("get");
    expect(form.getAttribute("action")).toBe("/staff/politicians");
  });
});

describe("PoliticianTable", () => {
  it("lists each politician with their status for each campaign, and marks the letter to the PM signed or not", async () => {
    const { fn, sent } = action();
    const testMp = { ...MP, id: 8, name: "Testy McTestface MP", isTest: true, sitting: false, house: "lords" as const };
    await render(
      <PoliticianTable
        politicians={[
          MP,
          { ...testMp, statuses: { [bill.slug]: { ...MP.statuses[pm.slug], updatedBy: "controlai" } } },
        ]}
        markSigned={fn}
      />,
    );
    await expect
      .element(page.getByRole("link", { name: "Polly Placeholder" }))
      .toHaveAttribute("href", "/staff/politicians/7");
    await expect.element(page.getByText(pm.title)).toBeInTheDocument();
    await expect.element(page.getByText(bill.title)).toBeInTheDocument();
    await expect.element(page.getByText(staffCopy.politicians.testMp)).toBeVisible();
    await expect.element(page.getByText(staffCopy.politicians.notSitting)).toBeVisible();
    await expect.element(page.getByRole("cell", { name: staffCopy.houses.lords })).toBeVisible();

    // Polly has signed the letter to the PM, with the date; the test MP hasn't.
    const polly = page.getByRole("form", { name: `${pm.title}: Polly Placeholder` });
    await expect.element(polly.getByText(new RegExp(`^${staffCopy.statuses.signed}`))).toBeVisible();
    await expect.element(polly.getByText("2026-10-01")).toBeVisible();
    // Not signed: just the button, no status to read against it.
    const testy = page.getByRole("form", { name: `${pm.title}: Testy McTestface MP` });
    await expect.element(testy.getByText(staffCopy.statuses.signed)).not.toBeInTheDocument();

    // The bill's column says who signed ControlAI's letter, with no button.
    await expect.element(page.getByText(staffCopy.politicians.signedControlAi)).toBeVisible();
    expect(page.getByRole("button").all()).toHaveLength(2);

    await polly.getByRole("button", { name: staffCopy.politicians.unmarkSigned }).click();
    await testy.getByRole("button", { name: staffCopy.politicians.markSigned }).click();
    await vi.waitFor(() => expect(sent).toHaveLength(2));
    expect(sent).toEqual([
      { politicianId: "7", campaign: pm.slug, signed: "" },
      { politicianId: "8", campaign: pm.slug, signed: "1" },
    ]);
  });

  it("says when nobody matches", async () => {
    await render(<PoliticianTable politicians={[]} markSigned={() => {}} />);
    await expect.element(page.getByText(staffCopy.politicians.none)).toBeVisible();
  });
});

describe("ControlAiImportList", () => {
  const ok = {
    pdfUrl: "https://images.controlai.com/letter.pdf",
    signatories: 86,
    matched: 74,
    added: 2,
    removed: 1,
    problems: [],
  };

  it("says what each run did, newest first, and why one failed", async () => {
    const runs: ControlAiImport[] = [ran(ok, { id: 2 }), failed("No PDF linked", { id: 1 })];
    await render(<ControlAiImportList runs={runs} />);
    await expect.element(page.getByText(/86 names/)).toBeVisible();
    await expect.element(page.getByRole("table")).not.toBeInTheDocument();
    await expect.element(page.getByText(/No PDF linked/)).toBeVisible();
    expect(page.getByText(staffCopy.runs.status.failed).element().closest("section")).toHaveTextContent(
      `${staffCopy.runs.status.failed} ${AT} · ${staffCopy.import.nightly} · No PDF linked`,
    );
  });

  it("lists the names it couldn't place", async () => {
    await render(
      <ControlAiImportList
        runs={[
          ran({
            ...ok,
            problems: [
              { name: "Baroness Nobody", kind: "nobody", candidates: [] },
              { name: "Lord Sample", kind: "several", candidates: ["Lord Sample", "Lord Sample of Elsewhere"] },
            ],
          }),
        ]}
      />,
    );
    await expect.element(page.getByRole("cell", { name: "Baroness Nobody" })).toBeVisible();
    await expect.element(page.getByText(staffCopy.controlAi.kinds.nobody)).toBeVisible();
    await expect.element(page.getByText("Lord Sample, Lord Sample of Elsewhere")).toBeVisible();
  });

  it("says when there's been no run", async () => {
    await render(<ControlAiImportList runs={[]} />);
    await expect.element(page.getByText(staffCopy.controlAi.never)).toBeVisible();
  });
});

describe("SignatoryImportList", () => {
  it("says what each run did, who ran it, or why it failed, and when there's been none", async () => {
    const runs: SignatoryImport[] = [
      ran({ matched: 3, added: 7, alreadySet: 0 }, { id: 2, startedBy: "jo@pauseai.uk" }),
      failed("AIRTABLE_TOKEN isn't set", { id: 1, startedBy: null }),
    ];
    const { rerender } = await render(<SignatoryImportList runs={runs} />);
    const [first, second] = page.getByRole("status").all();
    await expect
      .element(first)
      .toHaveTextContent(
        `${staffCopy.runs.status.ok} ${AT} · ${staffCopy.runs.by("jo@pauseai.uk")} · ${staffCopy.import.result({ matched: 3, added: 7, alreadySet: 0 })}`,
      );
    await expect.element(second).toHaveTextContent(`${staffCopy.runs.status.failed} ${AT} · AIRTABLE_TOKEN isn't set`);
    await rerender(<SignatoryImportList runs={[]} />);
    await expect.element(page.getByText(staffCopy.import.none)).toBeVisible();
  });
});

describe("ResultBox", () => {
  it("is one line without detail, and folds detail under the line, open only when short", async () => {
    const { rerender } = await render(<ResultBox summary="Just a line" />);
    await expect.element(page.getByRole("status")).toHaveTextContent("Just a line");
    await expect.element(page.getByRole("group")).not.toBeInTheDocument();

    await rerender(
      <ResultBox summary="Short" lines={OPEN_UP_TO} actions={<button>Act</button>}>
        <p>Detail</p>
      </ResultBox>,
    );
    expect((page.getByRole("group").element() as HTMLDetailsElement).open).toBe(true);
    await expect.element(page.getByText("Detail")).toBeVisible();
    await expect.element(page.getByRole("button", { name: "Act" })).toBeVisible();

    await rerender(
      <ResultBox summary="Long" lines={OPEN_UP_TO + 1} error>
        <p>Detail</p>
      </ResultBox>,
    );
    expect((page.getByRole("group").element() as HTMLDetailsElement).open).toBe(false);
    await expect.element(page.getByText("Detail")).not.toBeVisible();
  });
});

describe("PoliticianForm", () => {
  it("edits a signer, filled in with their details", async () => {
    const { fn, sent } = action();
    await render(
      <PoliticianForm
        action={fn}
        politician={{ ...MP, airtableId: null, constituency: null, email: null, house: "senedd" }}
      />,
    );
    await expect
      .element(page.getByRole("combobox", { name: staffCopy.fields.house, exact: true }))
      .toHaveValue("senedd");
    await expect
      .element(page.getByRole("textbox", { name: staffCopy.fields.name, exact: true }))
      .toHaveValue("Polly Placeholder");
    await page.getByRole("button", { name: staffCopy.politician.save }).click();
    await vi.waitFor(() => expect(sent).toHaveLength(1));
    expect(sent[0]).toMatchObject({ id: "7", house: "senedd", salutation: "Ms Placeholder", party: "Labour (Co-op)" });
  });
});

describe("SyncList", () => {
  const mp = (id: number, email: string | null = "a@parliament.uk") => ({
    airtableId: `rec${id}`,
    name: `MP ${id}`,
    salutation: "",
    constituency: `Seat ${id}`,
    party: "",
    email,
  });
  const held: MpSync = ran(
    { changes: { added: [mp(1)], removed: [mp(2, null)], changed: [] }, mps: [mp(1)] },
    { id: 3, at: "2026-10-12T02:00:00Z", status: "held" },
  );
  const applied: MpSync = ran(
    { changes: { added: [], removed: [], changed: [mp(4)] } },
    { id: 2, at: "2026-10-11T02:00:00Z", status: "applied", decidedBy: "jo@pauseai.uk" },
  );

  it("lists each sync's changes, and lets a held one be applied or discarded", async () => {
    const { fn, sent } = action();
    await render(<SyncList runs={[held, applied]} decide={fn} />);
    await expect.element(page.getByText(staffCopy.runs.status.held)).toBeVisible();
    await expect
      .element(page.getByText(`${staffCopy.syncs.added} 1, ${staffCopy.syncs.removed} 1`, { exact: false }))
      .toBeVisible();
    await expect.element(page.getByText("Seat 1: MP 1", { exact: true })).toBeVisible();
    await expect.element(page.getByText(`Seat 2: MP 2 (${staffCopy.politicians.noEmail})`)).toBeVisible();
    await expect.element(page.getByText(`${staffCopy.syncs.changed} (1)`)).toBeVisible();
    await expect.element(page.getByText(staffCopy.runs.decidedBy("jo@pauseai.uk"), { exact: false })).toBeVisible();
    expect(page.getByRole("button", { name: staffCopy.syncs.apply }).all()).toHaveLength(1);

    await page.getByRole("button", { name: staffCopy.syncs.discard }).click();
    await vi.waitFor(() => expect(sent).toHaveLength(1));
    expect(sent[0]).toEqual({ id: "3", decision: "discard" });
  });

  it("starts a sync with many changes folded to its status line, with the buttons still there", async () => {
    const big: MpSync = ran(
      { changes: { added: [1, 2, 3, 4, 5, 6].map((n) => mp(n)), removed: [], changed: [] } },
      { id: 9, status: "held" },
    );
    await render(<SyncList runs={[big, applied]} decide={() => {}} />);
    const folds = page.getByRole("group").all();
    expect(folds.map((fold) => (fold.element() as HTMLDetailsElement).open)).toEqual([false, true]);
    await expect.element(page.getByText("Seat 1: MP 1", { exact: true })).not.toBeVisible();
    await expect.element(page.getByRole("button", { name: staffCopy.syncs.apply })).toBeVisible();
    await page.getByText(`${staffCopy.syncs.added} 6`, { exact: false }).click();
    await expect.element(page.getByText("Seat 1: MP 1", { exact: true })).toBeVisible();
  });

  it("shows a failed or unchanged sync as one line, and says when there are none", async () => {
    const unchanged: MpSync = ran({ changes: { added: [], removed: [], changed: [] } }, { id: 5, status: "unchanged" });
    const { rerender } = await render(
      <SyncList runs={[failed("Airtable request failed with status 422", { id: 6 }), unchanged]} decide={() => {}} />,
    );
    await expect.element(page.getByText(/status 422/)).toBeVisible();
    await expect.element(page.getByText(staffCopy.runs.status.unchanged)).toBeVisible();
    await expect.element(page.getByRole("group")).not.toBeInTheDocument();
    await expect.element(page.getByRole("button")).not.toBeInTheDocument();
    await rerender(<SyncList runs={[]} decide={() => {}} />);
    await expect.element(page.getByText(staffCopy.syncs.none)).toBeVisible();
  });
});

describe("MpCheckList", () => {
  it("lists each problem, with what Airtable and Parliament say", async () => {
    await render(
      <MpCheckList
        runs={[
          ran({
            problems: [
              { kind: "extra", constituency: "Gone", airtable: "Former MP" },
              { kind: "unofficial", constituency: "Montgomeryshire and Glyndwr", airtable: "Steve Witherden" },
              { kind: "missing", constituency: "New Seat", parliament: "New MP" },
              {
                kind: "name",
                constituency: "North East Derbyshire",
                airtable: "Louise Jones",
                parliament: "Louise Sandher-Jones",
              },
              {
                kind: "email",
                constituency: "Wallasey",
                name: "Angela Eagle",
                airtable: "eaglea@parliament.uk",
                parliament: ["angela.eagle.mp@parliament.uk", "a@example.org"],
              },
              { kind: "email", constituency: "Zetland", name: "Zed", airtable: null, parliament: ["z@parliament.uk"] },
            ],
          }),
        ]}
      />,
    );
    // Six problems is more than a few lines, so the box starts folded.
    await page.getByText(staffCopy.check.problems(6), { exact: false }).click();
    const row = (constituency: string) => page.getByRole("row").filter({ hasText: constituency });
    await expect.element(row("Gone")).toHaveTextContent(`Gone${staffCopy.check.kinds.extra}Former MP`);
    await expect
      .element(row("Montgomeryshire"))
      .toHaveTextContent(`Montgomeryshire and Glyndwr${staffCopy.check.kinds.unofficial}Steve Witherden`);
    await expect.element(row("New Seat")).toHaveTextContent(`New Seat${staffCopy.check.kinds.missing}New MP`);
    await expect
      .element(row("North East Derbyshire"))
      .toHaveTextContent(`North East Derbyshire${staffCopy.check.kinds.name}Louise JonesLouise Sandher-Jones`);
    await expect
      .element(row("Wallasey"))
      .toHaveTextContent(
        `Wallasey${staffCopy.check.kinds.email}Angela Eagle: eaglea@parliament.ukangela.eagle.mp@parliament.uk, a@example.org`,
      );
    await expect
      .element(row("Zetland"))
      .toHaveTextContent(`Zetland${staffCopy.check.kinds.email}Zed: ${staffCopy.check.noEmail}z@parliament.uk`);
  });

  it("says when all is well, why a check failed, or when there's been none", async () => {
    const runs: MpCheck[] = [ran({ problems: [] }, { id: 2 }), failed("Parliament returned 500", { id: 1 })];
    const { rerender } = await render(<MpCheckList runs={runs} />);
    await expect.element(page.getByText(staffCopy.check.allGood, { exact: false })).toBeVisible();
    await expect.element(page.getByText(/Parliament returned 500/)).toBeVisible();
    await expect.element(page.getByRole("group")).not.toBeInTheDocument();
    await rerender(
      <MpCheckList runs={[ran({ problems: [{ kind: "missing", constituency: "New Seat", parliament: "N" }] })]} />,
    );
    await expect.element(page.getByText(staffCopy.check.problems(1), { exact: false })).toBeVisible();
    await rerender(<MpCheckList runs={[]} />);
    await expect.element(page.getByText(staffCopy.check.never)).toBeVisible();
  });
});

describe("ChangesTable", () => {
  it("lists who changed what", async () => {
    await render(
      <ChangesTable
        changes={[
          {
            id: 1,
            at: "2026-10-12T09:00:00Z",
            actor: "jo@pauseai.uk",
            action: "set status",
            details: { politicianId: 7 },
          },
        ]}
      />,
    );
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
    await render(
      <LettersTable
        letters={[
          letter,
          {
            ...letter,
            id: 2,
            campaign: "gone",
            status: "odd",
            isTest: false,
            contactConsent: false,
            repliedAt: "2026-10-13T09:00:00Z",
            events: [{ at: letter.createdAt, status: "strange", details: {} }],
          },
        ]}
      />,
    );
    await expect.element(page.getByText("jane@example.com").first()).toBeInTheDocument();
    await expect.element(page.getByText(pm.title).first()).toBeInTheDocument();
    await expect.element(page.getByText("gone")).toBeInTheDocument();
    await expect.element(page.getByText("odd")).toBeInTheDocument();
    await expect
      .element(page.getByRole("cell", { name: staffCopy.letters.consent.yes, exact: true }))
      .toBeInTheDocument();
    await expect
      .element(page.getByRole("cell", { name: staffCopy.letters.consent.no, exact: true }))
      .toBeInTheDocument();
    await expect.element(page.getByText(/strange/)).toBeInTheDocument();
    await expect.element(page.getByText('{"type":"HardBounce"}', { exact: false })).toBeInTheDocument();
    expect(page.getByText(staffCopy.politicians.testMp).all()).toHaveLength(1);
    await expect.element(page.getByRole("cell", { name: "2026-10-13 09:00", exact: true })).toBeInTheDocument();
  });

  it("says when there are none", async () => {
    await render(<LettersTable letters={[]} />);
    await expect.element(page.getByText(staffCopy.letters.none)).toBeVisible();
  });
});
