import { campaigns } from "@/lib/content/email-your-mp";
import type { CampaignSummary } from "@/lib/server/campaigns";
import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { page, userEvent } from "vitest/browser";
import { staffCopy } from "@/lib/content/staff-interface";
import { staffTime } from "@/lib/staff-time";
import type { Mailing } from "@/lib/server/mailings";
import AskView from "./AskView";
import CampaignLetter from "./CampaignLetter";
import CampaignsOverview, { CampaignAsk, letterRange } from "./CampaignsOverview";
import CampaignView from "./CampaignView";
import {
  exampleAskPage,
  exampleChanged,
  exampleCampaign,
  exampleCampaignEmpty,
  exampleCampaignNoAsk,
  exampleHiddenOneOff,
  exampleOldLettersResult,
  exampleOneOffs,
  exampleOneOffThread,
  exampleSentEmails,
  exampleVersions,
} from "./CampaignPages.examples";
import { ImportJobPage } from "./ImportJob";
import JobActions from "./JobActions";
import LetterThread from "./LetterThread";
import { exampleThread } from "./LetterThread.examples";
import MailEmail from "./MailEmail";
import MailingView from "./MailingView";
import { exampleMailing } from "./MailingsTable.examples";
import PoliticianDetails from "./PoliticianDetails";
import { examplePolitician } from "./PoliticianTable.examples";
import { emptyLettersSearch, exampleLetter } from "./LettersTable.examples";
import MyGmail from "./MyGmail";
import OneOffList, { OneOffTable } from "./OneOffList";
import OneOffThreadView from "./OneOffThreadView";
import ListFrame from "./ui/ListFrame";
import PageIntro from "./ui/PageIntro";
import Withheld from "./ui/Withheld";
import Tabs from "./ui/Tabs";
import Run from "./Run";
import { exampleRun, exampleFailedRun } from "./RunList.examples";
import SentEmails from "./SentEmails";
import StaffNav from "./StaffNav";

const copy = staffCopy.campaigns;
const NOW = "2026-11-05T09:00:00Z";
const link = (name: string) => page.getByRole("link", { name, exact: true });
/** Whether the page says `text`, whichever element it's in and however its line wraps. */
const says = (text: string) => expect.poll(() => document.body.textContent).toContain(text);

describe("CampaignsOverview", () => {
  it("files each under the month of its last letter, the rest under their years, those with none first, saying who it's from and its ask", async () => {
    await render(
      <CampaignsOverview campaigns={[exampleCampaign, exampleCampaignNoAsk, exampleCampaignEmpty]} now={NOW} />,
    );
    expect(document.querySelector(`a[href="/staff/campaigns/${exampleCampaign.slug}?tab=replied"]`)).not.toBeNull();
    const headings = page
      .getByRole("heading", { level: 2 })
      .all()
      .map((h) => h.element().textContent);
    expect(headings).toEqual(["October 2026", "2025"]);
    await expect
      .element(link(exampleCampaign.title))
      .toHaveAttribute("href", `/staff/campaigns/${exampleCampaign.slug}`);
    await expect.element(link(exampleCampaign.askTitle!)).toHaveAttribute("href", `/staff/asks/${exampleCampaign.ask}`);
    expect(document.body.textContent).toContain(`${copy.fromSupporters} · ${copy.lettersTo(12, 9)}`);
    expect(document.body.textContent).toContain("18 Jun – 22 Oct");
    expect(document.body.textContent).toContain("20 May – 17 Jun 2025");
    // Those with no letters come first, under no month.
    expect(document.querySelector("li")!.textContent).toContain(copy.noLetters);
    expect(document.body.textContent).toContain(staffCopy.asks.noAsk);
  });

  it("says there are none", async () => {
    await render(<CampaignsOverview campaigns={[]} now={NOW} />);
    await says(copy.none);
  });

  it("gives letters' days as a range, a year only once, and one day alone", () => {
    expect(letterRange("2026-11-01T09:00:00Z", "2026-11-05T09:00:00Z", "2026")).toBe("1 Nov – 5 Nov");
    expect(letterRange("2026-11-05T09:00:00Z", "2026-11-05T10:00:00Z", "2026")).toBe("5 Nov");
    expect(letterRange("2025-07-23T09:00:00Z", "2025-09-30T09:00:00Z", "2026")).toBe("23 Jul – 30 Sept 2025");
    expect(letterRange("2025-12-01T09:00:00Z", "2026-01-05T09:00:00Z", "2026")).toBe("1 Dec 2025 – 5 Jan");
    expect(letterRange("2025-07-23T09:00:00Z", "2025-07-23T09:00:00Z", "2026")).toBe("23 Jul 2025");
  });

  it("says an ask by its kind", async () => {
    const { rerender } = await render(<CampaignAsk campaign={exampleCampaign} />);
    expect(document.body.textContent).toContain(staffCopy.asks.askTo.letter);
    await rerender(<CampaignAsk campaign={{ ...exampleCampaign, askKind: "event" }} />);
    expect(document.body.textContent).toContain(staffCopy.asks.askTo.event);
  });
});

describe("CampaignLetter", () => {
  it("leads to those who changed the wording, when anyone did", async () => {
    const { rerender } = await render(<CampaignLetter changedHref="/changed" versions={exampleVersions} changed={3} />);
    await expect
      .element(page.getByRole("link", { name: staffCopy.campaigns.changedLink(3) }))
      .toHaveAttribute("href", "/changed");
    await rerender(<CampaignLetter changedHref="/changed" versions={exampleVersions} changed={0} />);
    expect(page.getByRole("link").query()).toBeNull();
  });

  it("chooses among versions, each with its subject and text, names as chips", async () => {
    await render(<CampaignLetter changedHref="/changed" versions={exampleVersions} changed={exampleChanged} />);
    await says(exampleVersions[0].subject);
    await says(copy.fields.salutation);
    await page.getByRole("combobox").selectOptions("older");
    await says(exampleVersions[1].subject);
  });

  it("with one version, says how many it has, and with no one changing the wording, no link", async () => {
    await render(<CampaignLetter changedHref="/changed" versions={exampleVersions.slice(1)} changed={0} />);
    expect(page.getByRole("combobox").query()).toBeNull();
    expect(document.body.textContent).toContain(copy.versionLine("18 Jun 2026", 8));
    const { rerender } = await render(
      <CampaignLetter
        changedHref="/changed"
        versions={[{ ...exampleVersions[0], from: null }]}
        changed={exampleChanged}
      />,
    );
    expect(document.body.textContent).toContain(copy.versionLine(null, 4));
    await rerender(<CampaignLetter changedHref="/changed" versions={[]} changed={exampleChanged} />);
    await says(copy.noText);
  });
});

describe("CampaignView's public page", () => {
  const view = (campaign: CampaignSummary) => (
    <CampaignView
      campaign={campaign}
      versions={exampleVersions}
      changed={0}
      letters={{ letters: [], total: 0, pages: 1, pageSize: 100 }}
      search={emptyLettersSearch}
    />
  );

  it("leads to the campaign on the site, else where its letter is kept, else says there's none", async () => {
    const see = () => page.getByRole("link", { name: staffCopy.campaigns.seePublicPage });
    const code = campaigns[0];
    const { rerender } = await render(view({ ...exampleCampaign, slug: code.slug }));
    await expect.element(see()).toHaveAttribute("href", `/campaigns/${code.slug}`);
    await rerender(view({ ...exampleCampaign, slug: "gone", url: "https://example.org/letter.pdf" }));
    await expect.element(see()).toHaveAttribute("href", "https://example.org/letter.pdf");
    await rerender(view({ ...exampleCampaign, slug: "gone", url: null }));
    expect(see().query()).toBeNull();
  });
});

describe("CampaignView", () => {
  const letters = [
    exampleLetter,
    { ...exampleLetter, id: 2, status: "sent", answer: "signed", constituency: null, party: "" },
    { ...exampleLetter, id: 3, status: "sent", repliedAt: NOW, ownWords: null, supporterId: null },
    { ...exampleLetter, id: 4, status: "sent", autoRepliedAt: NOW },
    { ...exampleLetter, id: 5, status: "unknown" },
    { ...exampleLetter, id: 6, status: "not_sent" },
  ];
  const view = (campaign = exampleCampaign, search = emptyLettersSearch) => (
    <CampaignView
      campaign={campaign}
      versions={exampleVersions}
      changed={exampleChanged}
      letters={{ letters, total: 150, pages: 2, pageSize: 100 }}
      search={search}
    />
  );

  it("says who it's from and to, its ask and how many answered, with its letters", async () => {
    await render(view());
    await expect.element(page.getByRole("heading", { level: 1 })).toHaveTextContent(exampleCampaign.title);
    await says(copy.supporters(10));
    await says(copy.politicians(9));
    await says(staffCopy.mailingPages.answeredBar(3, 9));
    await expect.element(link(exampleCampaign.askTitle!)).toHaveAttribute("href", `/staff/asks/${exampleCampaign.ask}`);
    await says(`✓ ${staffCopy.statuses.signed}`);
    await says(staffCopy.letters.status.bounced);
    await says(staffCopy.letters.status.auto_reply);
    await says("unknown");
    await expect
      .element(page.getByRole("link", { name: copy.changedLink(exampleChanged) }))
      .toHaveAttribute("href", `/staff/campaigns/${exampleCampaign.slug}?tab=changed`);
    await expect
      .element(page.getByRole("link", { name: staffCopy.paging.next }))
      .toHaveAttribute("href", `/staff/campaigns/${exampleCampaign.slug}?page=2`);
  });

  it("with no ask, says so, with no bar", async () => {
    await render(view(exampleCampaignNoAsk));
    expect(document.body.textContent).toContain(staffCopy.asks.noAsk);
    expect(document.querySelector("progress")).toBeNull();
    await render(view(exampleCampaignEmpty, { ...emptyLettersSearch, tab: "failed", page: "2" }));
    await expect.element(page.getByRole("link", { name: staffCopy.paging.previous })).toBeVisible();
  });
});

describe("AskView", () => {
  it("leads with what they were asked, with its answers beside how we asked", async () => {
    await render(<AskView ask={exampleAskPage} answer="" />);
    const answers = staffCopy.asks.page;
    expect(document.body.textContent).toContain(staffCopy.politician.askedThem("PauseAI", "letter").slice(0, 8));
    await expect.element(link(exampleAskPage.ways[0].title)).toHaveAttribute("href", exampleAskPage.ways[0].href);
    await says(answers.letters(19));
    await says(answers.bar(3, 40, "letter"));
    await expect.element(link(staffCopy.asks.edit)).toHaveAttribute("href", `/staff/asks/${exampleAskPage.slug}/edit`);
    expect(page.getByRole("link", { name: new RegExp(answers.answered) }).query()).toBeNull();
    await expect.element(link("Polly Placeholder")).toHaveAttribute("href", "/staff/politicians/1");
  });

  it("shows those who gave an answer, or none, from its pill, and pressed again, them all", async () => {
    const path = `/staff/asks/${exampleAskPage.slug}`;
    const pill = (words: string, n: number) => page.getByRole("link", { name: `${words} ${n}`, exact: true });
    const signed = () => pill(staffCopy.statuses.signed, exampleAskPage.counts.signed!);
    const none = () => pill(staffCopy.statuses.noAnswer, exampleAskPage.noAnswer);
    const { rerender } = await render(<AskView ask={exampleAskPage} answer="" />);
    await expect.element(signed()).toHaveAttribute("href", `${path}?answer=signed`);
    await expect.element(signed()).not.toHaveAttribute("aria-current");
    await expect.element(none()).toHaveAttribute("href", `${path}?answer=none`);
    await says(staffCopy.asks.page.lastWrittenTo);
    await rerender(<AskView ask={exampleAskPage} answer="signed" />);
    await expect.element(signed()).toHaveAttribute("href", path);
    await expect.element(signed()).toHaveAttribute("aria-current", "true");
    await expect.element(signed()).toHaveAttribute("title", staffCopy.asks.page.showAll);
    // Someone written to with no answer, and no one left unanswered: no pill for it.
    await rerender(
      <AskView
        ask={{
          ...exampleAskPage,
          answers: [{ ...exampleAskPage.answers[0], status: null }],
        }}
        answer="none"
      />,
    );
    await expect.element(none()).toHaveAttribute("aria-current", "true");
    await says(staffCopy.statuses.noAnswer);
    await rerender(<AskView ask={{ ...exampleAskPage, noAnswer: 0 }} answer="" />);
    expect(page.getByRole("link", { name: new RegExp(staffCopy.statuses.noAnswer) }).query()).toBeNull();
    // Nobody has answered, but some were written to: the pill still shows them.
    await rerender(<AskView ask={{ ...exampleAskPage, counts: {}, answers: [] }} answer="" />);
    await expect.element(none()).toBeVisible();
  });

  it("gives an ask with a date its day", async () => {
    await render(<AskView ask={{ ...exampleAskPage, date: "2026-11-23" }} answer="" />);
    await says("23 Nov 2026");
  });

  it("an event the code names: no Edit, its answers its own, a link on our site or another's, and when there's nothing", async () => {
    const event = {
      ...exampleAskPage,
      kind: "event" as const,
      fixed: true,
      date: null,
      url: "/events",
      counts: { going: 1, passed_on: 1 },
    };
    const { rerender } = await render(
      <AskView
        ask={{
          ...event,
          answers: [
            { ...event.answers[0], status: "going" },
            { ...event.answers[1], status: "passed_on" },
          ],
          ways: [{ ...event.ways[0], from: null, to: null }],
        }}
        answer="going"
      />,
    );
    expect(link(staffCopy.asks.edit).query()).toBeNull();
    await expect.element(link(staffCopy.asks.page.theLink.event)).toHaveAttribute("href", "/events");
    await rerender(
      <AskView
        ask={{
          ...exampleAskPage,
          url: "https://example.org/letter",
          counts: {},
          noAnswer: 0,
          ways: [],
          answers: [],
          writtenTo: 0,
        }}
        answer=""
      />,
    );
    await expect.element(link(staffCopy.asks.page.theLink.letter)).toHaveAttribute("target", "_blank");
    await says(staffCopy.asks.page.noWay);
    await says(staffCopy.asks.page.none);
    expect(document.querySelector("progress")).toBeNull();
    await rerender(
      <AskView
        ask={{
          ...exampleAskPage,
          url: null,
          ways: [{ ...exampleAskPage.ways[1], from: "2026-01-01T09:00:00Z", to: "2026-01-01T09:00:00Z" }],
        }}
        answer=""
      />,
    );
    expect(document.body.textContent).toContain("1 Jan 2026");
  });
});

describe("the one-off emails", () => {
  const list = () => (
    <OneOffList
      threads={[...exampleOneOffs, exampleHiddenOneOff, { ...exampleOneOffs[0], id: 3, subject: "" }]}
      total={150}
      page={1}
      pages={2}
      pageSize={100}
    />
  );

  it("lists each thread, whose it is and when to the minute, and hides what staff can't read", async () => {
    await render(list());
    await says(staffTime(exampleOneOffs[0].latestAt));
    const words = staffCopy.oneOff.columns;
    expect([...document.querySelectorAll("th")].map((th) => th.textContent)).toEqual([
      words.subject,
      words.politician,
      words.participants,
      words.answered,
      words.messages,
      words.when,
      words.mailbox,
    ]);
    await says(exampleOneOffs[0].mailboxes!.join(", "));
    await says(exampleOneOffs[0].participants!.join(", "));
    const cellsOf = (row: number) =>
      [...document.querySelectorAll("tbody tr")][row].querySelectorAll("td")[3].textContent;
    expect([cellsOf(0), cellsOf(1), cellsOf(2)]).toEqual([
      staffCopy.oneOff.answers.yes,
      staffCopy.oneOff.answers.no,
      "–",
    ]);
    await expect.element(link(exampleOneOffs[0].subject!)).toHaveAttribute("href", "/staff/one-off/1");
    await says(staffCopy.oneOff.noPolitician);
    await says(staffCopy.oneOff.hidden);
    expect(link(staffCopy.oneOff.hidden).query()).toBeNull();
    await expect.element(link(staffCopy.oneOff.noSubject)).toBeVisible();
    await expect
      .element(page.getByRole("link", { name: staffCopy.paging.next }))
      .toHaveAttribute("href", "/staff/one-off?page=2");
  });

  it("on a person's page, shows nothing with none", async () => {
    const { rerender } = await render(<OneOffTable threads={[]} />);
    expect(page.getByRole("heading").query()).toBeNull();
    await rerender(<OneOffTable threads={exampleOneOffs} />);
    await expect.element(page.getByRole("heading", { name: staffCopy.oneOff.onPageTitle })).toBeVisible();
  });

  it("opens a thread's messages, and says when it can't", async () => {
    const { rerender } = await render(<OneOffThreadView thread={exampleOneOffThread} />);
    await expect.element(page.getByRole("heading", { level: 1 })).toHaveTextContent(exampleOneOffThread.subject!);
    await says("Could we meet?");
    await says(staffCopy.oneOff.unreadable);
    for (const name of ["Placeholder, Polly", "polly.placeholder.mp@parliament.uk"]) {
      await expect.element(link(name)).toHaveAttribute("href", "/staff/politicians/1");
    }
    await says("Jane Smith <jane.smith@example.com>");
    await says("someone@example.com");
    expect(link("Joseph Example").query()).toBeNull();
    await rerender(<OneOffThreadView thread={{ ...exampleHiddenOneOff, messages_: null }} />);
    await says(staffCopy.oneOff.hidden);
    await expect.element(page.getByRole("heading", { level: 1 })).toHaveTextContent(staffCopy.oneOff.title);
    await rerender(
      <OneOffThreadView
        thread={{
          ...exampleOneOffThread,
          subject: "",
        }}
      />,
    );
    await expect.element(page.getByRole("heading", { level: 1 })).toHaveTextContent(staffCopy.oneOff.noSubject);
  });
});

const NO_SEARCH = { q: "", purpose: [], outcome: [], backend: [], link: [], sort: "", dir: "", page: "" };

describe("SentEmails", () => {
  it("sorts by each column but its links, keeping the filters, newest first unless another is chosen", async () => {
    const list = (search: Partial<typeof NO_SEARCH>) => (
      <SentEmails
        emails={exampleSentEmails}
        total={4}
        pages={1}
        page={1}
        pageSize={100}
        search={{ ...NO_SEARCH, ...search }}
      />
    );
    const words = staffCopy.sentEmails.columns;
    const heading = (name: string) => page.getByRole("link", { name, exact: false });
    const { rerender } = await render(list({ q: "x" }));
    await expect.element(heading(words.when)).toHaveAttribute("href", "/staff/sent-emails?q=x&sort=when&dir=asc");
    await expect.element(heading(words.subject)).toHaveAttribute("href", "/staff/sent-emails?q=x&sort=subject&dir=asc");
    expect(page.getByRole("link", { name: words.links }).query()).toBeNull();
    expect(heading(words.when).element().closest("th")!.getAttribute("aria-sort")).toBe("descending");
    await rerender(list({ sort: "subject", dir: "asc" }));
    await expect.element(heading(words.subject)).toHaveAttribute("href", "/staff/sent-emails?sort=subject&dir=desc");
    expect(heading(words.subject).element().closest("th")!.getAttribute("aria-sort")).toBe("ascending");
  });

  it("has a heading only for a screen reader, each person linked if they can be, imported tagged, and links through its letter", async () => {
    await render(
      <SentEmails emails={exampleSentEmails} total={150} pages={2} page={1} pageSize={100} search={NO_SEARCH} />,
    );
    const heading = page.getByRole("heading", { level: 1 }).element() as HTMLElement;
    expect(heading.getBoundingClientRect().width).toBeLessThanOrEqual(1);
    const words = staffCopy.sentEmails;
    expect([...document.querySelectorAll("th")].map((th) => th.textContent!.replace(/[ ▲▼]+$/, ""))).toEqual(
      Object.values(words.columns),
    );
    await says(words.backends.postmark);
    await expect.element(link("Jane Smith").first()).toHaveAttribute("href", "/staff/supporters/5");
    expect(document.body.textContent).toContain("Sam Brown");
    expect(page.getByRole("link", { name: "Sam Brown" }).query()).toBeNull();
    await says(words.imported);
    await says(words.outcomes.bounced);
    await expect.element(link(words.mailingLink)).toHaveAttribute("href", "/staff/mailings/3");
    await expect
      .element(link(words.campaignLink).first())
      .toHaveAttribute("href", "/staff/campaigns/support-sobel-bill");
    await expect
      .element(page.getByRole("link", { name: staffCopy.paging.next }))
      .toHaveAttribute("href", "/staff/sent-emails?page=2");
  });

  it("shows a purpose or outcome it doesn't know as it is, and a blank From", async () => {
    await render(
      <SentEmails
        emails={[
          { ...exampleSentEmails[3], purpose: "new-purpose", outcome: "new-outcome", fromAddress: null, subject: null },
        ]}
        total={1}
        pages={1}
        page={1}
        pageSize={100}
        search={NO_SEARCH}
      />,
    );
    await says("new-purpose");
    await says("new-outcome");
  });
});

describe("the import of old letters' run", () => {
  it("says what it did and how much is left, by mailing, and who mail is from to those who may see", async () => {
    const words = staffCopy.oldLetters;
    const run = exampleRun("import-old-letters", exampleOldLettersResult);
    const { rerender } = await render(<Run run={run} open people />);
    await says(words.result(exampleOldLettersResult));
    await expect.element(page.getByRole("heading", { name: words.joined })).toBeVisible();
    await says(`${words.mailingTitles["deepmind-30-june"]}: 500`);
    await says("form: 40");
    await says("Jane Smith <jane@example.com>: A question");
    expect(document.body.textContent).toContain(words.unreadable(1));
    expect(document.body.textContent).not.toContain(words.stoppedByGmail);
    await rerender(
      <Run
        run={exampleRun("import-old-letters", { ...exampleOldLettersResult, stoppedBy: "gmail", unreadable: [] })}
        open
      />,
    );
    expect(document.body.textContent).toContain(words.stoppedByGmail);
    expect(document.body.textContent).not.toContain("Jane Smith");
    await says(`${words.matchedNothing(1)} ${words.onlyWithSupporters}`);
    await rerender(
      <Run
        run={exampleRun("import-old-letters", {
          ...exampleOldLettersResult,
          joined: {},
          added: {},
          notJoined: { x: 0 },
          unmatched: [],
        })}
        open
      />,
    );
    expect(page.getByRole("heading", { name: words.joined }).query()).toBeNull();
    await rerender(<Run run={exampleFailedRun("import-old-letters", "Gmail said no", {})} open />);
    await says("Gmail said no");
  });

  it("offers its dry run in a box that goes with the press", async () => {
    const pressed: (string | null)[] = [];
    await render(
      <JobActions
        action={(form) => {
          pressed.push(form.get("dryRun") as string | null);
        }}
        label="Import"
        tick={{ name: "dryRun", label: "Dry run" }}
      />,
    );
    await userEvent.click(page.getByRole("button", { name: "Import" }));
    await expect.poll(() => pressed).toEqual([null]);
    await userEvent.click(page.getByRole("checkbox", { name: "Dry run" }));
    await userEvent.click(page.getByRole("button", { name: "Import" }));
    await expect.poll(() => pressed).toEqual([null, "on"]);
  });
});

describe("an imported mailing's text", () => {
  const doc = {
    type: "doc",
    content: [{ type: "paragraph", content: [{ type: "field", attrs: { field: "own" } }] }],
  };
  const imported = (props: Partial<Mailing>) => (
    <MailingView mailing={{ ...exampleMailing, ...props }} asks={[]} stop={() => {}} reschedule={() => {}} />
  );

  it("shows its template, with its fields as chips, saying so if it's approximate", async () => {
    const { rerender } = await render(
      imported({
        importedText: doc,
        importedSubject: "The subject",
        sentFrom: "joseph@pauseai.info",
        askKind: null,
        ask: null,
      }),
    );
    await says("The subject");
    await says(staffCopy.mailings.importedFields.own);
    expect(document.body.textContent).not.toContain(staffCopy.letterThread.approximate);
    await rerender(imported({ importedText: doc, sentFrom: null, importedTextApproximate: true, askKind: "letter" }));
    await says(staffCopy.letterThread.approximate);
    await says(staffCopy.mailings.notRecorded);
    await says(staffCopy.asks.askTo.letter);
  });

  it("says a letter's text is approximate on its page", async () => {
    await render(<LetterThread thread={{ ...exampleThread, approximate: true }} />);
    await says(staffCopy.letterThread.approximate);
  });
});

describe("the rule over a list", () => {
  it("is the tabs', with none of the list's own to double it", async () => {
    await render(
      <>
        <Tabs label="Which" current="a" tabs={[{ key: "a", label: "A", href: "/a" }]} />
        <ListFrame
          count="1 row"
          total={1}
          page={1}
          pages={1}
          pageSize={1}
          columns={[{ key: "one", label: "One", cell: (row: string) => row }]}
          rows={["Row"]}
          rowKey={(row) => row}
          empty="None"
        />
      </>,
    );
    const bar = page.getByText("1 row").element().parentElement!.parentElement!;
    expect(getComputedStyle(bar).borderTopWidth).toBe("0px");
    expect(getComputedStyle(page.getByRole("navigation", { name: "Which" }).element()).boxShadow).not.toBe("none");
  });
});

describe("MailEmail", () => {
  it("shows who it's from and to where it's said, always its subject, then its body", async () => {
    const { rerender } = await render(
      <MailEmail from="jo@pauseai.uk" to="Each politician" subject="A subject">
        The letter
      </MailEmail>,
    );
    const terms = () => [...document.querySelectorAll("dt")].map((dt) => dt.textContent);
    const words = staffCopy.mailingPages;
    expect(terms()).toEqual([words.from, words.to, words.subject]);
    await says("The letter");
    await rerender(<MailEmail subject="A subject">The letter</MailEmail>);
    expect(terms()).toEqual([words.subject]);
  });
});

describe("Withheld", () => {
  it("says what's kept back beside its envelope, and links nowhere", async () => {
    await render(<Withheld>Kept back</Withheld>);
    await says("Kept back");
    expect(document.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
    expect(page.getByRole("link").query()).toBeNull();
  });
});

describe("PageIntro", () => {
  it("is quieter than the page's text", async () => {
    await render(
      <div>
        <p>The page</p>
        <PageIntro>What this page is</PageIntro>
      </div>,
    );
    const colour = (text: string) => getComputedStyle(page.getByText(text).element()).color;
    expect(colour("What this page is")).not.toBe(colour("The page"));
  });
});

describe("the rest", () => {
  it("gives the import of old letters its box for a dry run, on its page alone", async () => {
    const page_ = (job: "import-old-letters" | "check-mps") => (
      <ImportJobPage job={job} runs={[]} run={() => {}} decide={() => {}} airtableTable="x" />
    );
    const { rerender } = await render(page_("import-old-letters"));
    await expect.element(page.getByRole("checkbox", { name: staffCopy.oldLetters.dryRun })).toBeVisible();
    await rerender(page_("check-mps"));
    expect(page.getByRole("checkbox").query()).toBeNull();
  });

  it("lists a politician's one-off emails in their history, one they can't read said so", async () => {
    await render(
      <PoliticianDetails
        politician={examplePolitician}
        asks={[]}
        setStatus={() => {}}
        block={undefined}
        unblock={() => {}}
        letters={{ senders: false, letters: [] }}
        oneOffs={[exampleOneOffs[0], exampleHiddenOneOff, { ...exampleOneOffs[0], id: 3, subject: "" }]}
        history={[]}
        airtableTable="x"
      />,
    );
    await expect.element(link(exampleOneOffs[0].subject!)).toHaveAttribute("href", "/staff/one-off/1");
    await expect.element(link(staffCopy.oneOff.noSubject)).toHaveAttribute("href", "/staff/one-off/3");
    await says(staffCopy.oneOff.hidden);
    expect(link(staffCopy.oneOff.hidden).query()).toBeNull();
  });

  it("has the one-off emails in the menu, under Politicians", async () => {
    await render(<StaffNav email="jo@pauseai.uk" permissions={[]} />);
    expect(document.querySelector('nav a[href="/staff/one-off"]')?.textContent).toContain(staffCopy.nav.oneOff);
  });

  it("marks new pages in the navigation", async () => {
    await render(<StaffNav email="jo@pauseai.uk" permissions={["supporters"]} fresh={["campaigns"]} />);
    const tagged = [...document.querySelectorAll("nav a")].filter((a) => a.textContent?.endsWith(staffCopy.nav.newTag));
    expect(tagged.map((a) => a.getAttribute("href"))).toContain("/staff/campaigns");
    expect(tagged.map((a) => a.getAttribute("href"))).not.toContain("/staff/supporters");
  });

  it("says in a Gmail read how many one-off emails it kept", async () => {
    const accounts = [{ account: "policy@pauseai.uk", replies: 0, autoReplies: 0, bounces: 0, oneOffs: 2 }];
    await render(<Run run={exampleRun("read-gmail", { accounts })} open />);
    await says(staffCopy.gmailReading.oneOffs(2));
  });

  it("says when threads with politicians are kept from your Gmail", async () => {
    const account = { email: "jo@pauseai.uk", name: "Jo", connectedAt: NOW, sentToday: 0, remaining: 1800 };
    const props = { me: "jo@pauseai.uk", account, outcome: "", disconnect: () => {} };
    const { rerender } = await render(<MyGmail {...props} keepsThreads />);
    await says(staffCopy.oneOff.kept.before);
    await expect.element(link(staffCopy.oneOff.title)).toHaveAttribute("href", "/staff/one-off");
    await rerender(<MyGmail {...props} />);
    expect(link(staffCopy.oneOff.title).query()).toBeNull();
    await says(staffCopy.oneOff.notKept.before);
    await expect.element(link(staffCopy.mailings.title)).toHaveAttribute("href", "/staff/mailings");
    await rerender(<MyGmail {...props} lettersInbox />);
    expect(link(staffCopy.mailings.title).query()).toBeNull();
  });
});
