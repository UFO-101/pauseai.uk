import { describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";
import { page } from "vitest/browser";
import { campaigns } from "@/lib/content/email-your-mp";
import { jobTitles, staffCopy } from "@/lib/content/staff-interface";
import type { AnyImportRun, ControlAiImport, MpCheck, MpSync, SignatoryImport } from "@/lib/import-runs";
import ChangesTable from "./ChangesTable";
import EmailBlockFilters from "./EmailBlockFilters";
import EmailBlocksTable from "./EmailBlocksTable";
import { exampleBlock, exampleComplaint, exampleProblems } from "./EmailBlocksTable.examples";
import EmailProblemsTable from "./EmailProblemsTable";
import { exampleChange } from "./ChangesTable.examples";
import LettersTable from "./LettersTable";
import { exampleLetter } from "./LettersTable.examples";
import JobActions from "./JobActions";
import LoginCard from "./LoginCard";
import LoginForm from "./LoginForm";
import PoliticianDetails from "./PoliticianDetails";
import PoliticianFilters from "./PoliticianFilters";
import PoliticianForm from "./PoliticianForm";
import PoliticianTable from "./PoliticianTable";
import { examplePolitician } from "./PoliticianTable.examples";
import ResultBox, { OPEN_UP_TO } from "./ResultBox";
import RunFilters from "./RunFilters";
import RunList from "./RunList";
import {
  exampleAppliedSync,
  exampleControlAiResult,
  exampleFailedRun,
  exampleHeldSync,
  exampleRun,
  exampleSyncedMp,
} from "./RunList.examples";
import StaffHeader from "./StaffHeader";

const [pm, bill] = campaigns;

const MP = examplePolitician;
const ran = exampleRun;
const failed = exampleFailedRun;
const AT = "2026-10-15 02:00";

/** A stand-in Server Action that keeps what it was sent. */
function action() {
  const sent: Record<string, FormDataEntryValue>[] = [];
  const fn = vi.fn((form: FormData) => void sent.push(Object.fromEntries(form)));
  return { fn, sent };
}

describe("StaffHeader", () => {
  it("is just the title on the login page", async () => {
    await render(<StaffHeader />);
    await expect.element(page.getByText(staffCopy.nav.title)).toBeVisible();
    await expect.element(page.getByRole("navigation")).not.toBeInTheDocument();
    await expect.element(page.getByRole("button")).not.toBeInTheDocument();
  });

  it("links the staff pages, says who's logged in, and logs out with a POST", async () => {
    await render(<StaffHeader email="jo@pauseai.uk" current="politicians" />);
    await expect.element(page.getByText(staffCopy.nav.title)).toBeVisible();
    await expect.element(page.getByRole("link", { name: staffCopy.nav.title })).not.toBeInTheDocument();
    // The current page is bold, not a link.
    await expect.element(page.getByRole("link", { name: staffCopy.nav.politicians })).not.toBeInTheDocument();
    // The row of links is for wider screens than the test's, so it's read from the DOM.
    const nav = document.querySelector("nav")!;
    expect(nav.querySelector("strong")!.textContent).toBe(staffCopy.nav.politicians);
    expect(nav.querySelector('a[href="/staff/import-data"]')!.textContent).toBe(staffCopy.nav.import);
    expect(nav.querySelector('a[href="/staff/letters"]')!.textContent).toBe(staffCopy.nav.letters);
    // On a phone, a dropdown instead: the current page, with the pages, the email and the way out under it once opened.
    const menu = page.getByRole("group");
    expect((menu.element() as HTMLDetailsElement).open).toBe(false);
    await menu.getByText(staffCopy.nav.politicians, { exact: true }).first().click();
    await expect
      .element(menu.getByRole("link", { name: staffCopy.nav.import }))
      .toHaveAttribute("href", "/staff/import-data");
    await expect.element(menu.getByRole("link", { name: staffCopy.nav.import })).toBeVisible();
    await expect.element(menu.getByText("jo@pauseai.uk")).toBeVisible();
    const form = menu.getByRole("button", { name: staffCopy.nav.logout }).element().closest("form")!;
    expect(form.getAttribute("method")).toBe("post");
    expect(form.getAttribute("action")).toBe("/staff/api/logout");
    // The wider screen's row has its own.
    expect(document.querySelectorAll('form[action="/staff/api/logout"]')).toHaveLength(2);
  });
});

describe("LoginCard", () => {
  it("heads its form with the title, with no margin under the form", async () => {
    await render(
      <LoginCard title={staffCopy.login.title}>
        <LoginForm />
      </LoginCard>,
    );
    await expect.element(page.getByRole("heading", { level: 1, name: staffCopy.login.title })).toBeVisible();
    const form = page.getByRole("button", { name: staffCopy.login.button }).element().closest("form")!;
    expect(getComputedStyle(form).marginBottom).toBe("0px");
  });
});

describe("LoginForm", () => {
  it("is the form, on its own at first", async () => {
    await render(<LoginForm />);
    await expect.element(page.getByText(staffCopy.login.intro)).toBeVisible();
    await expect.element(page.getByRole("textbox", { name: staffCopy.login.emailLabel })).toBeVisible();
    await expect.element(page.getByText(staffCopy.login.failed)).not.toBeInTheDocument();
    await expect.element(page.getByText(staffCopy.login.elsewhere)).not.toBeInTheDocument();
  });

  it("says why the last link didn't work", async () => {
    await render(<LoginForm failed="1" elsewhere="1" />);
    await expect.element(page.getByText(staffCopy.login.failed)).toBeVisible();
    await expect.element(page.getByText(staffCopy.login.elsewhere)).toBeVisible();
    await expect.element(page.getByRole("button", { name: staffCopy.login.button })).toBeVisible();
  });

  it("replaces the form once a link is sent, with a way to send another", async () => {
    await render(<LoginForm sent="1" />);
    await expect.element(page.getByRole("status")).toHaveTextContent(staffCopy.login.sent);
    await expect
      .element(page.getByRole("link", { name: staffCopy.login.again }))
      .toHaveAttribute("href", "/staff/login");
    await expect.element(page.getByRole("textbox")).not.toBeInTheDocument();
  });
});

describe("PoliticianDetails", () => {
  it("heads the page with their name and what's known, and edits a signer the team added", async () => {
    const { fn } = action();
    await render(
      <PoliticianDetails politician={{ ...MP, airtableId: null, email: null }} action={fn} unblock={vi.fn()} />,
    );
    await expect.element(page.getByRole("heading", { level: 1, name: MP.name })).toBeVisible();
    await expect
      .element(page.getByText([staffCopy.houses[MP.house], MP.constituency, MP.party].join(" · ")))
      .toBeVisible();
    await expect.element(page.getByRole("button", { name: staffCopy.politician.save })).toBeVisible();
  });

  it("sends Airtable's MPs to Airtable, and lets no one edit a test MP", async () => {
    const { fn } = action();
    for (const politician of [MP, { ...MP, airtableId: null, isTest: true }]) {
      const { unmount } = await render(<PoliticianDetails politician={politician} action={fn} unblock={vi.fn()} />);
      await expect.element(page.getByText(staffCopy.politician.fromAirtable)).toBeVisible();
      await expect.element(page.getByRole("button", { name: staffCopy.politician.save })).not.toBeInTheDocument();
      await unmount();
    }
  });

  it("says why their address is blocked, and unblocks it with a note", async () => {
    const { fn, sent } = action();
    await render(
      <PoliticianDetails
        politician={{ ...MP, emailBlocked: true }}
        action={vi.fn()}
        block={{ ...exampleBlock, address: MP.email! }}
        unblock={fn}
      />,
    );
    await expect
      .element(page.getByRole("paragraph").nth(1))
      .toHaveTextContent(
        `${staffCopy.politicians.emailBlocked} ${staffCopy.politician.blocked(exampleBlock.reason, "2026-10-12 09:10")}`,
      );
    await page.getByLabelText(staffCopy.emails.note).fill("Fixed in Airtable");
    await page.getByRole("button", { name: staffCopy.emails.unblock }).click();
    await vi.waitFor(() => expect(sent).toEqual([{ address: MP.email, note: "Fixed in Airtable" }]));
  });
});

describe("EmailBlocksTable", () => {
  it("lists each blocked address: why, since when, whose, the letter, emails not sent, and unblocks one", async () => {
    const { fn, sent } = action();
    await render(
      <EmailBlocksTable
        blocks={[
          exampleBlock,
          {
            ...exampleComplaint,
            politicians: [
              { id: 1, name: "A" },
              { id: 2, name: "B" },
            ],
          },
        ]}
        unblock={fn}
      />,
    );
    const bounced = page.getByRole("row").filter({ hasText: exampleBlock.address });
    await expect.element(bounced.getByText(staffCopy.emails.kinds.hard)).toBeVisible();
    await expect.element(bounced.getByText(exampleBlock.reason)).toBeVisible();
    await expect
      .element(bounced.getByRole("link", { name: "Bouncy McTestface MP" }))
      .toHaveAttribute("href", "/staff/politicians/5");
    await expect.element(bounced.getByText(staffCopy.emails.letter(1))).toBeVisible();
    await expect.element(bounced.getByRole("cell", { name: "2", exact: true })).toBeVisible();
    // A complaint can't be unblocked; two politicians share its address.
    const complained = page.getByRole("row").filter({ hasText: exampleComplaint.address });
    await expect.element(complained.getByText(staffCopy.emails.cantReset)).toBeVisible();
    await expect.element(complained.getByText("A, B")).toBeVisible();
    await bounced.getByRole("button", { name: staffCopy.emails.unblock }).click();
    await vi.waitFor(() => expect(sent).toEqual([{ address: exampleBlock.address, note: "" }]));
  });

  it("says when there are none", async () => {
    await render(<EmailBlocksTable blocks={[]} unblock={vi.fn()} />);
    await expect.element(page.getByText(staffCopy.emails.none)).toBeVisible();
  });
});

describe("EmailProblemsTable", () => {
  it("lists bounces and complaints, and what each email was", async () => {
    await render(<EmailProblemsTable problems={exampleProblems} />);
    const [hard, soft, complaint] = exampleProblems.map((p) => page.getByRole("row").filter({ hasText: p.address }));
    await expect.element(hard.getByText(staffCopy.emails.letter(1))).toBeVisible();
    await expect.element(soft.getByText(staffCopy.emails.kinds.soft)).toBeVisible();
    await expect.element(soft.getByText(staffCopy.emails.purposes["forwarded-reply"])).toBeVisible();
    await expect.element(complaint.getByText(staffCopy.emails.kinds.complaint)).toBeVisible();
    expect(complaint.getByRole("cell").last().element().textContent).toBe("");
  });

  it("says when there are none", async () => {
    await render(<EmailProblemsTable problems={[]} />);
    await expect.element(page.getByText(staffCopy.emails.none)).toBeVisible();
  });
});

describe("EmailBlockFilters", () => {
  it("is a GET form to /staff/emails, filled in with the current filter", async () => {
    await render(<EmailBlockFilters kind="complaint" />);
    await expect.element(page.getByRole("combobox")).toHaveValue("complaint");
    const form = page.getByRole("combobox").element().closest("form")!;
    expect(form.getAttribute("method")).toBe("get");
    expect(form.getAttribute("action")).toBe("/staff/emails");
  });
});

describe("JobActions", () => {
  it("runs the job, and links to all its runs", async () => {
    const fn = vi.fn();
    await render(<JobActions action={fn} label="Run it" job="check-mps" />);
    await page.getByRole("button", { name: "Run it" }).click();
    await vi.waitFor(() => expect(fn).toHaveBeenCalledOnce());
    await expect
      .element(page.getByRole("link", { name: staffCopy.history.showAll }))
      .toHaveAttribute("href", "/staff/import-history?job=check-mps");
  });
});

describe("PoliticianFilters", () => {
  it("is a GET form to /staff, filled in with the current filter", async () => {
    await render(<PoliticianFilters search="blake" house="lords" campaign={pm.slug} email="blocked" />);
    await expect.element(page.getByRole("searchbox")).toHaveValue("blake");
    await expect
      .element(page.getByRole("combobox", { name: staffCopy.fields.house, exact: true }))
      .toHaveValue("lords");
    await expect
      .element(page.getByRole("combobox", { name: staffCopy.politician.statusesTitle, exact: true }))
      .toHaveValue(pm.slug);
    await expect
      .element(page.getByRole("combobox", { name: staffCopy.fields.email, exact: true }))
      .toHaveValue("blocked");
    const form = page.getByRole("searchbox").element().closest("form")!;
    expect(form.getAttribute("method")).toBe("get");
    expect(form.getAttribute("action")).toBe("/staff/politicians");
  });
});

describe("PoliticianTable", () => {
  it("lists each politician with their status for each campaign, and marks the letter to the PM signed or not", async () => {
    const { fn, sent } = action();
    const testMp = {
      ...MP,
      id: 8,
      name: "Testy McTestface MP",
      isTest: true,
      sitting: false,
      emailBlocked: true,
      house: "lords" as const,
    };
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
    await expect.element(page.getByText(staffCopy.politicians.emailBlocked)).toBeVisible();
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

describe("RunList", () => {
  const mp = exampleSyncedMp;
  const held = exampleHeldSync;
  const applied = exampleAppliedSync;
  const controlAi = exampleControlAiResult;

  it("lists each MP sync's changes, and lets a held one be applied or discarded", async () => {
    const { fn, sent } = action();
    await render(<RunList runs={[held, applied]} none="None" decide={fn} />);
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
      "sync-mps",
      { changes: { added: [1, 2, 3, 4, 5, 6].map((n) => mp(n)), removed: [], changed: [] } },
      { id: 9, status: "held" },
    );
    await render(<RunList runs={[big, applied]} none="None" decide={() => {}} />);
    const folds = page.getByRole("group").all();
    expect(folds.map((fold) => (fold.element() as HTMLDetailsElement).open)).toEqual([false, true]);
    await expect.element(page.getByText("Seat 1: MP 1", { exact: true })).not.toBeVisible();
    await expect.element(page.getByRole("button", { name: staffCopy.syncs.apply })).toBeVisible();
    await page.getByText(`${staffCopy.syncs.added} 6`, { exact: false }).click();
    await expect.element(page.getByText("Seat 1: MP 1", { exact: true })).toBeVisible();
  });

  it("shows a failed or unchanged sync as one line, and a held one without buttons where nothing can be decided", async () => {
    const unchanged: MpSync = ran(
      "sync-mps",
      { changes: { added: [], removed: [], changed: [] } },
      { id: 5, status: "unchanged" },
    );
    await render(
      <RunList
        runs={[failed("sync-mps", "Airtable request failed with status 422", { id: 6 }), unchanged, held]}
        none="None"
      />,
    );
    await expect.element(page.getByText(/status 422/)).toBeVisible();
    await expect.element(page.getByText(staffCopy.runs.status.unchanged)).toBeVisible();
    await expect.element(page.getByText(staffCopy.runs.status.held)).toBeVisible();
    await expect.element(page.getByRole("button")).not.toBeInTheDocument();
  });

  it("lists each check's problems, with what Airtable and Parliament say", async () => {
    await render(
      <RunList
        none="None"
        runs={[
          ran("check-mps", {
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

  it("says when a check found all well, or why it failed", async () => {
    const runs: MpCheck[] = [
      ran("check-mps", { problems: [] }, { id: 2 }),
      failed("check-mps", "Parliament returned 500", { id: 1 }),
    ];
    const { rerender } = await render(<RunList runs={runs} none="None" />);
    await expect.element(page.getByText(staffCopy.check.allGood, { exact: false })).toBeVisible();
    await expect.element(page.getByText(/Parliament returned 500/)).toBeVisible();
    await expect.element(page.getByRole("group")).not.toBeInTheDocument();
    await rerender(
      <RunList
        none="None"
        runs={[ran("check-mps", { problems: [{ kind: "missing", constituency: "New Seat", parliament: "N" }] })]}
      />,
    );
    await expect.element(page.getByText(staffCopy.check.problems(1), { exact: false })).toBeVisible();
  });

  it("says what each ControlAI read did, and why one failed", async () => {
    const runs: ControlAiImport[] = [
      ran("import-controlai", controlAi, { id: 2 }),
      failed("import-controlai", "No PDF linked", { id: 1 }),
    ];
    await render(<RunList runs={runs} none="None" />);
    await expect.element(page.getByText(/86 names/)).toBeVisible();
    await expect.element(page.getByRole("table")).not.toBeInTheDocument();
    expect(page.getByText(staffCopy.runs.status.failed).element().closest("section")).toHaveTextContent(
      `${staffCopy.runs.status.failed} ${AT} · ${staffCopy.import.nightly} · No PDF linked`,
    );
  });

  it("lists the names a ControlAI read couldn't place", async () => {
    await render(
      <RunList
        none="None"
        runs={[
          ran("import-controlai", {
            ...controlAi,
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

  it("says what each signatory import did, who ran it, or why it failed", async () => {
    const runs: SignatoryImport[] = [
      ran("import-signatories", { matched: 3, added: 7, alreadySet: 0 }, { id: 2, startedBy: "jo@pauseai.uk" }),
      failed("import-signatories", "AIRTABLE_TOKEN isn't set", { id: 1, startedBy: null }),
    ];
    await render(<RunList runs={runs} none="None" />);
    const [first, second] = page.getByRole("status").all();
    await expect
      .element(first)
      .toHaveTextContent(
        `${staffCopy.runs.status.ok} ${AT} · ${staffCopy.runs.by("jo@pauseai.uk")} · ${staffCopy.import.result({ matched: 3, added: 7, alreadySet: 0 })}`,
      );
    await expect.element(second).toHaveTextContent(`${staffCopy.runs.status.failed} ${AT} · AIRTABLE_TOKEN isn't set`);
  });

  it("on the history page, names each run's job and heads each day's runs with its date; says when there are none", async () => {
    const runs: AnyImportRun[] = [
      ran("check-mps", { problems: [] }, { id: 7, at: "2026-11-03T01:00:00Z" }),
      ran("import-controlai", controlAi, { id: 8, at: "2026-11-02T02:00:00Z" }),
      ran("import-signatories", { matched: 1, added: 0, alreadySet: 0 }, { id: 9, at: "2026-11-02T00:30:00Z" }),
      applied,
    ];
    const { rerender } = await render(<RunList runs={runs} none="None" history />);
    for (const job of ["sync-mps", "check-mps", "import-controlai", "import-signatories"] as const) {
      await expect.element(page.getByText(`${jobTitles[job]} ·`, { exact: false })).toBeVisible();
    }
    expect(
      page
        .getByRole("heading", { level: 2 })
        .all()
        .map((h) => h.element().textContent),
    ).toEqual(["3 Nov 2026", "2 Nov 2026", "11 Oct 2026"]);
    await rerender(<RunList runs={[]} none="Nothing here" />);
    await expect.element(page.getByText("Nothing here")).toBeVisible();
  });
});

describe("RunFilters", () => {
  it("is a GET form to the history page, with the job filled in", async () => {
    await render(<RunFilters job="check-mps" />);
    const select = page.getByRole("combobox", { name: staffCopy.history.job, exact: true });
    await expect.element(select).toHaveValue("check-mps");
    const form = select.element().closest("form")!;
    expect(form.getAttribute("method")).toBe("get");
    expect(form.getAttribute("action")).toBe("/staff/import-history");
  });
});

describe("ChangesTable", () => {
  it("lists who changed what", async () => {
    await render(<ChangesTable changes={[exampleChange]} />);
    await expect.element(page.getByRole("cell", { name: "jo@pauseai.uk" })).toBeVisible();
    await expect.element(page.getByText('{"politicianId":7}')).toBeVisible();
  });
});

describe("LettersTable", () => {
  const letter = exampleLetter;

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
