import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { page, userEvent } from "vitest/browser";
import { staffCopy } from "@/lib/content/staff-interface";
import AskView from "./AskView";
import CampaignLetter from "./CampaignLetter";
import CampaignsOverview, { CampaignAsk } from "./CampaignsOverview";
import CampaignView from "./CampaignView";
import {
  exampleAskPage,
  exampleBands,
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
import JobActions from "./JobActions";
import { emptyLettersSearch, exampleLetter } from "./LettersTable.examples";
import MailingsOverview from "./MailingsOverview";
import MyGmail from "./MyGmail";
import OneOffList, { OneOffTable } from "./OneOffList";
import OneOffThreadView from "./OneOffThreadView";
import Run from "./Run";
import { exampleRun, exampleFailedRun } from "./RunList.examples";
import SentEmails from "./SentEmails";
import StaffNav from "./StaffNav";

const copy = staffCopy.campaigns;
const NOW = "2026-11-05T09:00:00Z";
const link = (name: string) => page.getByRole("link", { name, exact: true });

describe("CampaignsOverview", () => {
  it("files each under the month of its last letter, the rest under their years, saying who it's from and its ask", async () => {
    await render(
      <CampaignsOverview campaigns={[exampleCampaign, exampleCampaignNoAsk, exampleCampaignEmpty]} now={NOW} />,
    );
    const headings = page
      .getByRole("heading", { level: 2 })
      .all()
      .map((h) => h.element().textContent);
    expect(headings).toEqual(["November 2026", "October 2026", "2025"]);
    await expect
      .element(link(exampleCampaign.title))
      .toHaveAttribute("href", `/staff/campaigns/${exampleCampaign.slug}`);
    await expect.element(link(exampleCampaign.askTitle!)).toHaveAttribute("href", `/staff/asks/${exampleCampaign.ask}`);
    expect(document.body.textContent).toContain(
      `${copy.fromSupporters} · ${copy.started} 18 Jun · ${copy.lettersTo(12, 9)}`,
    );
    expect(document.body.textContent).toContain(`${copy.lastLetter("22 Oct")}`);
    expect(document.body.textContent).toContain(copy.lastLetter("17 Jun 2025"));
    expect(document.body.textContent).toContain(staffCopy.asks.noAsk);
  });

  it("says there are none", async () => {
    await render(<CampaignsOverview campaigns={[]} now={NOW} />);
    await expect.element(page.getByText(copy.none)).toBeVisible();
  });

  it("says an ask by its kind", async () => {
    const { rerender } = await render(<CampaignAsk campaign={exampleCampaign} />);
    expect(document.body.textContent).toContain(staffCopy.asks.askTo.letter);
    await rerender(<CampaignAsk campaign={{ ...exampleCampaign, askKind: "event" }} />);
    expect(document.body.textContent).toContain(staffCopy.asks.askTo.event);
  });
});

describe("CampaignLetter", () => {
  it("chooses among versions, each with its subject and text, names as chips", async () => {
    await render(<CampaignLetter versions={exampleVersions} bands={exampleBands} />);
    await expect.element(page.getByText(exampleVersions[0].subject)).toBeVisible();
    await expect.element(page.getByText(copy.fields.salutation).first()).toBeVisible();
    await page.getByRole("combobox").selectOptions("older");
    await expect.element(page.getByText(exampleVersions[1].subject)).toBeVisible();
    await expect.element(page.getByText(copy.ownBands(8, 3, 1))).toBeVisible();
  });

  it("with one version, says how many it has, and with no one's own words, no bar", async () => {
    await render(
      <CampaignLetter versions={exampleVersions.slice(1)} bands={{ under: 0, middle: 0, over: 0, changed: 0 }} />,
    );
    expect(page.getByRole("combobox").query()).toBeNull();
    expect(document.body.textContent).toContain(copy.versionLine("18 Jun 2026", 8));
    expect(document.body.textContent).not.toContain(copy.ownTitle);
    const { rerender } = await render(
      <CampaignLetter versions={[{ ...exampleVersions[0], from: null }]} bands={exampleBands} />,
    );
    expect(document.body.textContent).toContain(copy.versionLine(null, 4));
    await rerender(<CampaignLetter versions={[]} bands={exampleBands} />);
    await expect.element(page.getByText(copy.noText)).toBeVisible();
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
      bands={exampleBands}
      letters={{ letters, total: 150, pages: 2, pageSize: 100 }}
      search={search}
      tabCounts={{ all: 150, changed: 50, replied: 2, failed: 1 }}
    />
  );

  it("says who it's from and to, its ask and how many answered, with its letters", async () => {
    await render(view());
    await expect.element(page.getByRole("heading", { level: 1 })).toHaveTextContent(exampleCampaign.title);
    await expect.element(page.getByText(copy.supporters(10))).toBeVisible();
    await expect.element(page.getByText(copy.politicians(9))).toBeVisible();
    await expect.element(page.getByText(copy.answeredBar(3, 9))).toBeVisible();
    await expect.element(link(exampleCampaign.askTitle!)).toHaveAttribute("href", `/staff/asks/${exampleCampaign.ask}`);
    await expect.element(page.getByText(`✓ ${staffCopy.statuses.signed}`)).toBeVisible();
    await expect.element(page.getByText(staffCopy.letters.status.bounced).first()).toBeVisible();
    await expect.element(page.getByText(staffCopy.letters.status.auto_reply)).toBeVisible();
    await expect.element(page.getByText("unknown")).toBeVisible();
    await expect
      .element(link(copy.tabs.changed(50)))
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
    await expect.element(page.getByText(answers.letters(19))).toBeVisible();
    await expect.element(page.getByText(answers.bar(3, 40, "letter"))).toBeVisible();
    await expect.element(link(staffCopy.asks.edit)).toHaveAttribute("href", `/staff/asks/${exampleAskPage.slug}/edit`);
    await expect.element(link(answers.all(3))).toBeVisible();
    await expect.element(link("Polly Placeholder")).toHaveAttribute("href", "/staff/politicians/1");
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
        ask={{ ...exampleAskPage, url: "https://example.org/letter", counts: {}, ways: [], answers: [], writtenTo: 0 }}
        answer=""
      />,
    );
    await expect.element(link(staffCopy.asks.page.theLink.letter)).toHaveAttribute("target", "_blank");
    await expect.element(page.getByText(staffCopy.asks.page.noWay)).toBeVisible();
    await expect.element(page.getByText(staffCopy.asks.page.none)).toBeVisible();
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
  const list = (who = "") => (
    <OneOffList
      threads={[...exampleOneOffs, exampleHiddenOneOff, { ...exampleOneOffs[0], id: 3, subject: "" }]}
      total={150}
      page={1}
      pages={2}
      pageSize={100}
      who={who}
    />
  );

  it("lists each thread, whose it is, and hides what staff can't read", async () => {
    await render(list("pauseai"));
    await expect.element(link(exampleOneOffs[0].subject!)).toHaveAttribute("href", "/staff/mailings/one-off/1");
    await expect.element(page.getByText(staffCopy.oneOff.noPolitician).first()).toBeVisible();
    await expect.element(link(staffCopy.oneOff.hidden)).toBeVisible();
    await expect.element(link(staffCopy.oneOff.noSubject)).toBeVisible();
    await expect
      .element(link(staffCopy.oneOff.filters["someone-else"]))
      .toHaveAttribute("href", "/staff/mailings/one-off?who=someone-else");
    await expect
      .element(page.getByRole("link", { name: staffCopy.paging.next }))
      .toHaveAttribute("href", "/staff/mailings/one-off?who=pauseai&page=2");
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
    await expect.element(page.getByText("Could we meet?")).toBeVisible();
    await expect.element(page.getByText(staffCopy.oneOff.unreadable)).toBeVisible();
    await rerender(<OneOffThreadView thread={{ ...exampleHiddenOneOff, messages_: null }} />);
    await expect.element(page.getByText(staffCopy.oneOff.hidden)).toBeVisible();
    await expect.element(page.getByRole("heading", { level: 1 })).toHaveTextContent(staffCopy.oneOff.title);
    await rerender(
      <OneOffThreadView
        thread={{
          ...exampleOneOffThread,
          subject: "",
          people: [...exampleOneOffThread.people, { id: 9, name: "Dora" }],
          someoneElse: true,
        }}
      />,
    );
    await expect.element(page.getByRole("heading", { level: 1 })).toHaveTextContent(staffCopy.oneOff.noSubject);
    expect(document.body.textContent).toContain(", Dora");
  });
});

describe("SentEmails", () => {
  it("has a heading only for a screen reader, each person linked if they can be, imported tagged, and links through its letter", async () => {
    await render(
      <SentEmails
        emails={exampleSentEmails}
        total={150}
        pages={2}
        page={1}
        pageSize={100}
        search={{ q: "", purpose: [], outcome: [], backend: [], page: "" }}
      />,
    );
    const heading = page.getByRole("heading", { level: 1 }).element() as HTMLElement;
    expect(heading.getBoundingClientRect().width).toBeLessThanOrEqual(1);
    const words = staffCopy.sentEmails;
    await expect.element(link("Jane Smith").first()).toHaveAttribute("href", "/staff/supporters/5");
    expect(document.body.textContent).toContain("Sam Brown");
    expect(page.getByRole("link", { name: "Sam Brown" }).query()).toBeNull();
    await expect.element(page.getByText(words.imported)).toBeVisible();
    await expect.element(page.getByText(words.outcomes.bounced)).toBeVisible();
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
        search={{ q: "", purpose: [], outcome: [], backend: [], page: "" }}
      />,
    );
    await expect.element(page.getByText("new-purpose")).toBeVisible();
    await expect.element(page.getByText("new-outcome")).toBeVisible();
  });
});

describe("the import of old letters' run", () => {
  it("says what it did and how much is left, by mailing, and who mail is from to those who may see", async () => {
    const words = staffCopy.oldLetters;
    const run = exampleRun("import-old-letters", exampleOldLettersResult);
    const { rerender } = await render(<Run run={run} open people />);
    await expect.element(page.getByText(words.result(exampleOldLettersResult))).toBeVisible();
    await expect.element(page.getByRole("heading", { name: words.joined })).toBeVisible();
    await expect.element(page.getByText(`${words.mailingTitles["deepmind-30-june"]}: 500`)).toBeVisible();
    await expect.element(page.getByText("form: 40")).toBeVisible();
    await expect.element(page.getByText("Jane Smith <jane@example.com>: A question")).toBeVisible();
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
    await expect.element(page.getByText(words.onlyWithSupporters(1))).toBeVisible();
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
    await expect.element(page.getByText("Gmail said no")).toBeVisible();
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

describe("the rest", () => {
  it("marks new pages in the navigation", async () => {
    await render(<StaffNav email="jo@pauseai.uk" permissions={["supporters"]} fresh={["campaigns"]} />);
    const tagged = [...document.querySelectorAll("nav a")].filter((a) => a.textContent?.endsWith(staffCopy.nav.newTag));
    expect(tagged.map((a) => a.getAttribute("href"))).toContain("/staff/campaigns");
    expect(tagged.map((a) => a.getAttribute("href"))).not.toContain("/staff/supporters");
  });

  it("has a row at the foot of the mailings for the one-off emails, even with no mailings", async () => {
    await render(<MailingsOverview groups={[]} now={NOW} oneOffs={3} />);
    await expect.element(link(staffCopy.oneOff.title)).toHaveAttribute("href", "/staff/mailings/one-off");
    await expect.element(page.getByText(staffCopy.oneOff.threads(3))).toBeVisible();
  });

  it("lets you turn keeping your threads with politicians on or off", async () => {
    const words = staffCopy.oneOff;
    const account = { email: "jo@pauseai.uk", name: "Jo", connectedAt: NOW, sentToday: 0, remaining: 1800 };
    const props = { me: "jo@pauseai.uk", account, outcome: "", disconnect: () => {}, setKeepThreads: () => {} };
    const { rerender } = await render(<MyGmail {...props} keepsThreads />);
    await expect.element(page.getByRole("button", { name: words.stopKeeping })).toBeVisible();
    await expect.element(page.getByText(words.keepOn)).toBeVisible();
    await rerender(<MyGmail {...props} />);
    await expect.element(page.getByRole("button", { name: words.startKeeping })).toBeVisible();
    await rerender(<MyGmail {...props} lettersInbox />);
    expect(page.getByText(words.keepOff).query()).toBeNull();
  });
});
