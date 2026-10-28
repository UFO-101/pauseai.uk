import { describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";
import { page, userEvent } from "vitest/browser";
import { ASK_STATUSES } from "@/lib/asks";
import { campaignBySlug } from "@/lib/email-your-mp";
import { campaigns } from "@/lib/content/email-your-mp";
import { campaignPath } from "@/lib/email-your-mp";
import { importPath } from "@/lib/import-runs";
import { registrationStatus } from "@/lib/supporters";
import { staffDate } from "@/lib/staff-time";
import { jobTitles, staffCopy } from "@/lib/content/staff-interface";
import type { AnyImportRun, ControlAiImport, MpCheck, PoliticianSync } from "@/lib/import-runs";
import type { StaffAccount } from "@/lib/server/staff-accounts";
import ChangesTable from "./ChangesTable";
import EmailBlockFilters from "./EmailBlockFilters";
import EmailBlocksTable, { blockColumns } from "./EmailBlocksTable";
import { exampleBlock, exampleComplaint, exampleProblems } from "./EmailBlocksTable.examples";
import EmailProblemsTable from "./EmailProblemsTable";
import { exampleChanges } from "./ChangesTable.examples";
import LettersTable, { LettersList, letterColumns } from "./LettersTable";
import { exampleLetter } from "./LettersTable.examples";
import JobActions from "./JobActions";
import LoginCard from "./LoginCard";
import LoginForm from "./LoginForm";
import PoliticianDetails from "./PoliticianDetails";
import PoliticianFilters from "./PoliticianFilters";
import PoliticianTable, { politicianColumns, politicianContact } from "./PoliticianTable";
import {
  exampleAsks,
  exampleAsksWithCounts,
  examplePolitician,
  examplePoliticianHistory,
} from "./PoliticianTable.examples";
import AsksTable, { askColumns } from "./AsksTable";
import ResultBox, { OPEN_UP_TO } from "./ResultBox";
import { ImportJobPage, ImportOverview } from "./ImportJob";
import RunList from "./RunList";
import {
  exampleAppliedSync,
  exampleControlAiResult,
  exampleEmailsResult,
  exampleFailedRun,
  exampleGoToParliamentResult,
  exampleHeldSync,
  exampleLumaResult,
  exampleMembersResult,
  exampleRun,
  exampleSyncedMp,
  exampleWebFormResult,
} from "./RunList.examples";
import StaffNav, { staffPageAt } from "./StaffNav";
import { navigation } from "@/tests/browser/navigation";
import StaffSessions from "./StaffSessions";
import { spanClass } from "./ui/Grid";
import StaffDashboard from "./StaffDashboard";
import { exampleDashboard, exampleQuietDashboard } from "./StaffDashboard.examples";
import Sparkline from "./Sparkline";
import StaffHome from "./StaffHome";
import AccountsNotice from "./AccountsNotice";
import Alert from "./Alert";
import Breadcrumb from "./Breadcrumb";
import EraseLink from "./EraseLink";
import DeletePolitician from "./DeletePolitician";
import PoliticiansList, { HouseTabs } from "./PoliticiansList";
import { emptyPoliticiansSearch, examplePoliticiansPage } from "./PoliticianTable.examples";
import MailingDetails from "./MailingDetails";
import MailingsTable, { mailingColumns } from "./MailingsTable";
import { exampleMailing, exampleMailings } from "./MailingsTable.examples";
import ImportCard, { ImportCards } from "./ImportCard";
import DevLogin from "./DevLogin";
import KeepSignedIn from "./KeepSignedIn";
import RemoveAccountForm from "./RemoveAccountForm";
import SortHeading from "./SortHeading";
import StaffAccountsTable from "./StaffAccountsTable";
import EraseForm from "./EraseForm";
import ErasedNotice from "./ErasedNotice";
import SubscriptionBadges, { subscriptionWords } from "./SubscriptionBadges";
import SupporterBadges, { supporterBadgeWords } from "./SupporterBadges";
import SupporterDetails from "./SupporterDetails";
import SupporterFilters, { SUBSCRIPTION_ORDER } from "./SupporterFilters";
import LetterFilters from "./LetterFilters";
import SupportersTable, { supporterColumns, supporterContact } from "./SupportersTable";
import type { ListColumn } from "./ui/ListFrame";
import {
  exampleBlockedPermissions,
  exampleMemberDetails,
  exampleSupporter,
  exampleSupporterRows,
  exampleSupporterDetails,
} from "./SupportersTable.examples";
import PermissionTiles from "./PermissionTiles";
import { CHANNELS, topicsOf, type Reason, type Topic } from "@/lib/contact-permissions";
import { lettersSearch, supportersSearch } from "@/lib/staff-search";
import Table from "@/components/ui/Table";

const [pm, bill] = campaigns;

const MP = examplePolitician;
const ask = (slug: string) => exampleAsks.find((a) => a.slug === slug)!;
const ran = exampleRun;
const failed = exampleFailedRun;
const AT = "15 Oct 2026, 02:00";

/** A stand-in Server Action that keeps what it was sent. */
function action() {
  const sent: Record<string, FormDataEntryValue>[] = [];
  const fn = vi.fn((data: FormData) => {
    sent.push(Object.fromEntries(data));
  });
  return { fn, sent };
}

describe("StaffNav", () => {
  it("is just the title on the login page", async () => {
    await render(<StaffNav />);
    await expect.element(page.getByText(staffCopy.nav.title)).toBeVisible();
    await expect.element(page.getByRole("navigation")).not.toBeInTheDocument();
    await expect.element(page.getByRole("textbox")).not.toBeInTheDocument();
  });

  it("groups the pages by permission, marks the current one but keeps it a link, says who's logged in, and logs out with a POST", async () => {
    await render(<StaffNav email="jo@pauseai.uk" permissions={["admin"]} current="politicians" />);
    // The title is the way home, except at home.
    await expect.element(page.getByRole("link", { name: staffCopy.nav.title })).toHaveAttribute("href", "/staff");
    // The sidebar is for wider screens than the test's, so it's read from the DOM.
    const nav = document.querySelector("nav")!;
    expect(nav.querySelector("span[class*=who]")!.textContent).toBe("jo@pauseai.uk");
    // Home leads the list, a link like the rest.
    expect(nav.querySelector('a[href="/staff"][class*=page]')!.textContent).toBe(staffCopy.nav.home);
    const current = nav.querySelector('a[aria-current="page"]')!;
    expect(current.textContent).toBe(staffCopy.nav.politicians);
    expect(current.getAttribute("href")).toBe("/staff/politicians");
    expect(nav.querySelector('a[href="/staff/import-data"]')!.textContent).toBe(staffCopy.nav.import);
    expect(nav.querySelector('a[href="/staff/accounts"]')!.textContent).toBe(staffCopy.nav.accounts);
    expect(nav.querySelector('a[href="/staff/politicians/blocked-emails"]')!.textContent).toBe(staffCopy.nav.mpEmails);
    expect([...nav.querySelectorAll("h2")].map((h) => h.textContent).slice(0, 2)).toEqual(
      ["politicians", "admin"].map((id) => staffCopy.nav.sections[id]),
    );
    // Without supporters, the Supporters section has no page to show, so it hides.
    expect(nav.querySelector('a[href="/staff/supporters"]')).toBeNull();
    expect(nav.querySelector('a[href="/staff/letters"]')).toBeNull();
    // On a phone, a dropdown instead: the current page, with the groups, the email and the way out under it once opened.
    const menu = page.getByRole("group");
    expect((menu.element() as HTMLDetailsElement).open).toBe(false);
    await menu.getByText(staffCopy.nav.politicians, { exact: true }).first().click();
    await expect
      .element(menu.getByRole("link", { name: staffCopy.nav.import }))
      .toHaveAttribute("href", "/staff/import-data");
    await expect.element(menu.getByRole("link", { name: staffCopy.nav.import })).toBeVisible();
    await expect.element(menu.getByText("jo@pauseai.uk", { exact: false })).toBeVisible();
    const form = menu.getByRole("button", { name: staffCopy.nav.logout }).element().closest("form")!;
    expect(form.getAttribute("method")).toBe("post");
    expect(form.getAttribute("action")).toBe("/staff/api/logout");
    // The wider screen's sidebar has its own.
    expect(document.querySelectorAll('form[action="/staff/api/logout"]')).toHaveLength(2);
  });

  it("shows the admin section with only Import to someone without the permission, and at home the title isn't a link", async () => {
    await render(<StaffNav email="jo@pauseai.uk" permissions={[]} current="home" />);
    await expect.element(page.getByRole("link", { name: staffCopy.nav.title })).not.toBeInTheDocument();
    const nav = document.querySelector("nav")!;
    expect(nav.querySelector('a[href="/staff/accounts"]')).toBeNull();
    expect(nav.querySelector('a[href="/staff/audit-log"]')).toBeNull();
    expect(nav.querySelector('a[href="/staff/import-data"]')).not.toBeNull();
    expect(nav.querySelector("summary")!.textContent).toBe(staffCopy.nav.home);
  });

  it("with more than one session, links faintly to the page of them under Log out, there and in the phone's menu", async () => {
    const { rerender } = await render(<StaffNav email="jo@pauseai.uk" permissions={[]} sessions={3} current="home" />);
    const links = document.querySelectorAll('a[href="/staff/sessions"]');
    expect([...links].map((a) => a.textContent)).toEqual([staffCopy.nav.sessions(3), staffCopy.nav.sessions(3)]);
    expect(links[0].getAttribute("aria-current")).toBeNull();
    await rerender(<StaffNav email="jo@pauseai.uk" permissions={[]} sessions={3} current="sessions" />);
    expect(document.querySelector('a[href="/staff/sessions"]')!.getAttribute("aria-current")).toBe("page");
    expect(document.querySelector("summary")!.textContent).toBe(staffCopy.sessions.title);
    await rerender(<StaffNav email="jo@pauseai.uk" permissions={[]} sessions={1} current="home" />);
    expect(document.querySelector('a[href="/staff/sessions"]')).toBeNull();
  });

  it("shows the Supporters section, Letters in it, to someone with supporters", async () => {
    await render(<StaffNav email="jo@pauseai.uk" permissions={["supporters"]} current="letters" />);
    const nav = document.querySelector("nav")!;
    const supporters = [...nav.querySelectorAll("section")].find(
      (section) => section.querySelector("h2")?.textContent === staffCopy.nav.sections.supporters,
    )!;
    expect([...supporters.querySelectorAll("a")].map((a) => a.getAttribute("href"))).toEqual([
      "/staff/supporters",
      "/staff/letters",
      "/staff/supporters/blocked-emails",
    ]);
  });
});

describe("StaffNav in the signed-in pages' layout", () => {
  it("marks the page the URL is, or is under, and closes the phone's menu when the page changes", async () => {
    navigation.pathname = "/staff/letters/supporter/3";
    const nav = () => <StaffNav email="jo@pauseai.uk" permissions={["supporters"]} />;
    const { rerender } = await render(nav());
    const current = () => document.querySelector('nav a[aria-current="page"]')?.textContent;
    expect(current()).toBe(staffCopy.nav.supporters);
    const menu = () => page.getByRole("group").element() as HTMLDetailsElement;
    await page.getByRole("group").getByText(staffCopy.nav.supporters, { exact: true }).first().click();
    expect(menu().open).toBe(true);
    navigation.pathname = "/staff/letters/7";
    await rerender(nav());
    expect(current()).toBe(staffCopy.nav.letters);
    expect(menu().open).toBe(false);
  });

  it("marks home at /staff and your sessions at theirs", async () => {
    expect(staffPageAt("/staff")).toBe("home");
    expect(staffPageAt("/staff/sessions")).toBe("sessions");
    expect(staffPageAt("/staff/politicians/blocked-emails")).toBe("mpEmails");
    expect(staffPageAt("/staff/login")).toBeUndefined();
  });
});

describe("StaffSessions", () => {
  it("lists each session, marks this browser's, and logs out of all of them with a POST", async () => {
    await render(
      <StaffSessions
        sessions={[
          {
            id: "session-1",
            userAgent: "Mozilla/5.0 (X11; Linux x86_64; rv:131.0) Gecko/20100101 Firefox/131.0",
            startedAt: "2026-10-22T09:00:00Z",
            expiresAt: "2026-10-23T09:00:00Z",
            remember: false,
            current: true,
          },
          {
            id: "session-2",
            userAgent: null,
            startedAt: "2026-10-20T08:00:00Z",
            expiresAt: "2026-11-21T08:00:00Z",
            remember: true,
            current: false,
          },
        ]}
      />,
    );
    const copy = staffCopy.sessions;
    const rows = page.getByRole("row").all().slice(1);
    expect(rows.map((row) => row.element().textContent)).toEqual([
      `FirefoxLinux22 Oct 2026, 09:0023 Oct 2026, 09:00${copy.kept.no}${copy.thisBrowser}${staffCopy.nav.logout}`,
      `${copy.unknown}${copy.unknown}20 Oct 2026, 08:0021 Nov 2026, 08:00${copy.kept.yes}${staffCopy.nav.logout}`,
    ]);
    const form = page.getByRole("button", { name: copy.logOutEverywhere }).element().closest("form")!;
    expect(form.getAttribute("method")).toBe("post");
    expect(form.getAttribute("action")).toBe("/staff/api/logout");
    expect(new FormData(form).get("everywhere")).toBe("1");
    // Its rows are centred, as they hold buttons.
    expect(getComputedStyle(page.getByRole("cell", { name: copy.kept.yes }).element()).verticalAlign).toBe("middle");
    // Each row's Log out ends that one.
    const ones = page.getByRole("button", { name: staffCopy.nav.logout }).all();
    expect(ones.map((button) => new FormData(button.element().closest("form")!).get("session"))).toEqual([
      "session-1",
      "session-2",
    ]);
  });
});

describe("StaffHome", () => {
  it("shows the dashboard under a title only screen readers hear", async () => {
    await render(<StaffHome permissions={["admin", "supporters"]} dashboard={exampleDashboard} />);
    const title = page.getByRole("heading", { level: 1, name: staffCopy.home.title });
    await expect.element(title).toBeInTheDocument();
    expect(title.element().getBoundingClientRect().width).toBeLessThanOrEqual(1);
    await expect
      .element(page.getByRole("heading", { level: 2, name: staffCopy.home.dashboard.sections.mps }))
      .toBeVisible();
  });
});

describe("StaffDashboard", () => {
  const copy = staffCopy.home.dashboard;

  it("lists what needs a person as a strip each, red when broken and amber when waiting, a button each, or nothing", async () => {
    const { rerender } = await render(<StaffDashboard dashboard={exampleDashboard} permissions={[]} />);
    const list = page.getByRole("list", { name: copy.actionsTitle });
    const items = list.getByRole("listitem").all();
    expect(items.map((item) => item.element().textContent)).toEqual([
      `${copy.actions.heldSync(24)}${copy.actions.heldSyncDetail}${copy.actions.decide}`,
      `${copy.actions.blockedMp("Bouncy McTestface MP")}${copy.actions.blockedMpDetail}${copy.actions.openMp}`,
      `${copy.actions.failedImport(jobTitles["import-controlai"])}${copy.actions.failedImportDetail("No PDF linked", "21 Oct 2026, 02:00")}${copy.actions.seeRun}`,
    ]);
    await expect
      .element(page.getByRole("link", { name: copy.actions.decide }))
      .toHaveAttribute("href", "/staff/import-data/politicians");
    await expect
      .element(page.getByRole("link", { name: copy.actions.openMp }))
      .toHaveAttribute("href", "/staff/politicians/7");
    await expect
      .element(page.getByRole("link", { name: copy.actions.seeRun }))
      .toHaveAttribute("href", "/staff/import-data/controlai");
    // No heading: the strips speak for themselves. Each its icon first; the held import amber, the rest red.
    expect(page.getByRole("heading", { name: copy.actionsTitle }).all()).toHaveLength(0);
    const strips = items.map((item) => item.element().firstElementChild!);
    expect(strips.map((strip) => strip.firstElementChild!.tagName.toLowerCase())).toEqual(["svg", "svg", "svg"]);
    expect(strips.map((strip) => strip.className.match(/amber|red/)?.[0])).toEqual(["amber", "red", "red"]);
    expect(getComputedStyle(strips[0]).borderLeftWidth).toBe("0px");
    // Each title stands out from its detail; the buttons are the small light ones, all alike.
    const [title, detail] = [...strips[0].querySelector("div")!.children].map((el) => getComputedStyle(el));
    expect(Number(title.fontWeight)).toBeGreaterThan(Number(detail.fontWeight));
    expect(getComputedStyle(list.getByRole("link").first().element()).paddingTop).toBe("4px");
    const looks = list
      .getByRole("link")
      .all()
      .map((link) => getComputedStyle(link.element()).backgroundColor);
    expect(new Set(looks).size).toBe(1);

    await rerender(<StaffDashboard dashboard={exampleQuietDashboard} permissions={[]} />);
    expect(page.getByRole("list", { name: copy.actionsTitle }).all()).toHaveLength(0);
  });

  it("heads the numbers with the day and the window, the other windows as links", async () => {
    const { rerender } = await render(<StaffDashboard dashboard={exampleDashboard} permissions={[]} />);
    await expect.element(page.getByText("Wednesday 21 October")).toBeVisible();
    const current = page.getByText(copy.window(7));
    await expect.element(current).toHaveAttribute("aria-current", "true");
    expect(current.element().closest("a")).toBeNull();
    await expect.element(page.getByRole("link", { name: copy.window(30) })).toHaveAttribute("href", "/staff?days=30");
    await expect.element(page.getByRole("link", { name: copy.window(90) })).toHaveAttribute("href", "/staff?days=90");

    await rerender(<StaffDashboard dashboard={exampleQuietDashboard} permissions={[]} />);
    await expect.element(page.getByRole("link", { name: copy.window(7) })).toHaveAttribute("href", "/staff");
    expect(page.getByText(copy.window(30)).element().closest("a")).toBeNull();
  });

  it("shows each number in its group with its change on the window before, linked where the person may see it", async () => {
    const { rerender } = await render(<StaffDashboard dashboard={exampleDashboard} permissions={["supporters"]} />);
    const group = (section: string) =>
      page.getByRole("list", { name: copy.sections[section] }).getByRole("listitem").all();
    const mps = group("mps");
    const events = group("events");
    const supporters = group("supporters");
    expect(mps).toHaveLength(3);
    expect(events).toHaveLength(2);
    expect(supporters).toHaveLength(2);
    // The letters tile: the number, the test letters apart, the label, the bar's legend, then the change.
    await expect
      .element(mps[0])
      .toHaveTextContent(
        `12${copy.testLetters(2)}${copy.metrics.lettersSent(12)} ${pm.title} · 9 ${bill.title} · 3${copy.change.up(4, 7)}`,
      );
    await expect.element(mps[1]).toHaveTextContent(`3${copy.metrics.lettersReplied(3)}${copy.change.down(2, 7)}`);
    await expect
      .element(mps[2])
      .toHaveTextContent(`5${copy.metrics.mpsSigned(5)} ${pm.title} · 3 ${bill.title} · 2${copy.change.up(2, 7)}`);
    await expect.element(events[1]).toHaveTextContent(`9${copy.metrics.eventsHeld(9)}${copy.change.up(3, 7)}`);
    // With a bar, the letters tile takes a third of the grid, so its legend fits; the rest a sixth.
    expect(mps[0].element().className).toBe(spanClass(2));
    expect(mps[1].element().className).toBe(spanClass(1));
    // The bar's segments are as wide as each campaign's share.
    const segments = mps[0].element().querySelectorAll("[data-campaign]");
    expect([...segments].map((segment) => (segment as HTMLElement).style.flexGrow)).toEqual(["9", "3", "", ""]);
    // Up is green for letters, red for unsubscribes; down is red for replies, green for unsubscribes.
    const changeClass = (item: ReturnType<typeof page.getByRole>) =>
      item.element().querySelector(":scope > * > span:last-child")!.className;
    expect(changeClass(mps[0])).toMatch(/good/);
    expect(changeClass(mps[1])).toMatch(/bad/);
    expect(changeClass(supporters[1])).toMatch(/good/);
    // The sparklines, on registrations and new supporters only, with the week's count on each point.
    const sparkline = (label: string) => page.getByRole("img", { name: copy.series(label, 7, 8) });
    await expect.element(sparkline(copy.metrics.eventRegistrations(277))).toBeVisible();
    await expect.element(sparkline(copy.metrics.supportersAdded(176))).toBeVisible();
    // Pointing at a point names its week by the day it begins.
    const line = sparkline(copy.metrics.eventRegistrations(277)).element();
    const box = line.getBoundingClientRect();
    line.dispatchEvent(new PointerEvent("pointermove", { clientX: box.right - 1, clientY: box.top, bubbles: true }));
    await expect
      .element(page.getByRole("status"))
      .toHaveTextContent(copy.seriesPoint(7, staffDate(exampleDashboard.series.eventRegistrations[7].from), 277));
    expect(page.getByRole("img").all()).toHaveLength(2);
    // The whole tile is the link; a tile with no page isn't one.
    const tileLink = (text: string) => page.getByText(text).element().closest("a");
    expect(tileLink(copy.metrics.lettersReplied(3))?.getAttribute("href")).toBe("/staff/letters?status=replied");
    expect(tileLink(copy.metrics.supportersAdded(176))?.getAttribute("href")).toBe("/staff/supporters");
    expect(tileLink(copy.metrics.eventsHeld(9))).toBeNull();

    await rerender(<StaffDashboard dashboard={exampleDashboard} permissions={[]} />);
    expect(tileLink(copy.metrics.supportersAdded(176))).toBeNull();
    await expect.element(page.getByText(copy.metrics.supportersAdded(176))).toBeVisible();
    // The letters are supporter data: the tiles count them, but lead nowhere.
    expect(tileLink(copy.metrics.lettersSent(12))).toBeNull();
    // Several signed: everyone who signed anything, newest first.
    expect(tileLink(copy.metrics.mpsSigned(5))?.getAttribute("href")).toBe(
      "/staff/politicians?answer=signed&sort=asks",
    );
    // One signed: their page.
    await rerender(
      <StaffDashboard
        dashboard={{
          ...exampleDashboard,
          counts: { ...exampleDashboard.counts, mpsSigned: { current: 1, previous: 3 } },
          byCampaign: { ...exampleDashboard.byCampaign, mpsSigned: { [bill.slug]: 1 } },
          signedMp: 7,
        }}
        permissions={[]}
      />,
    );
    expect(tileLink(copy.metrics.mpsSigned(1))?.getAttribute("href")).toBe("/staff/politicians/7");

    // A quiet month: nothing reads "None", with no test letters and no bar; the change is over 30 days.
    await rerender(<StaffDashboard dashboard={exampleQuietDashboard} permissions={[]} />);
    const month = page.getByRole("img", { name: copy.series(copy.metrics.eventRegistrations(4), 30, 8) }).element();
    const monthBox = month.getBoundingClientRect();
    month.dispatchEvent(
      new PointerEvent("pointermove", { clientX: monthBox.right - 1, clientY: monthBox.top, bubbles: true }),
    );
    await expect
      .element(page.getByRole("status"))
      .toHaveTextContent(copy.seriesPoint(30, staffDate(exampleQuietDashboard.series.eventRegistrations[7].from), 4));
    const quiet = group("mps");
    await expect
      .element(quiet[0])
      .toHaveTextContent(`${copy.none}${copy.metrics.lettersSent(0)}${copy.change.same(30)}`);
    await expect
      .element(quiet[1])
      .toHaveTextContent(`${copy.none}${copy.metrics.lettersReplied(0)}${copy.change.down(1, 30)}`);
    expect(quiet[0].element().querySelectorAll("[data-campaign]")).toHaveLength(0);
    // Nobody signed: every politician.
    expect(tileLink(copy.metrics.mpsSigned(0))?.getAttribute("href")).toBe("/staff/politicians");
    // With no bar the letters tile takes a sixth like the rest; a line of nothing but zeros isn't drawn.
    expect(quiet[0].element().className).toBe(spanClass(1));
    const flat = {
      ...exampleQuietDashboard,
      series: {
        ...exampleQuietDashboard.series,
        supportersAdded: exampleQuietDashboard.series.supportersAdded.map((point) => ({ ...point, count: 0 })),
      },
    };
    await rerender(<StaffDashboard dashboard={flat} permissions={[]} />);
    await expect
      .element(page.getByRole("img", { name: copy.series(copy.metrics.supportersAdded(0), 30, 8) }))
      .not.toBeInTheDocument();
    await expect
      .element(page.getByRole("img", { name: copy.series(copy.metrics.eventRegistrations(4), 30, 8) }))
      .toBeVisible();
    await expect.element(page.getByText(copy.testLetters(0))).not.toBeInTheDocument();
  });
});

describe("Sparkline", () => {
  const values = [70, 105, 376, 144, 220, 338, 498, 277];
  const labels = values.map((value, i) => `Week ${i}: ${value}`);

  it("draws the counts as a line with the last point marked, and says a point's count when pointed at", async () => {
    await render(
      <Sparkline values={values} labels={labels} name="Registrations" from="28 Aug 2026" to="23 Oct 2026" />,
    );
    const chart = page.getByRole("img", { name: "Registrations" });
    await expect.element(chart).toBeVisible();
    // The points: the lines after the line of counts, the first being the baseline.
    const circles = chart.element().querySelectorAll("polyline ~ line");
    expect(circles).toHaveLength(8);
    expect([...circles].filter((circle) => /marked/.test(circle.getAttribute("class") ?? ""))).toHaveLength(1);
    expect(circles[7].getAttribute("class")).toMatch(/marked/);
    await expect.element(page.getByText("28 Aug 2026")).toBeVisible();
    await expect.element(page.getByText("23 Oct 2026")).toBeVisible();
    await expect.element(page.getByRole("status")).not.toBeInTheDocument();

    const box = chart.element().getBoundingClientRect();
    const pointAt = (type: string, x: number) =>
      chart
        .element()
        .dispatchEvent(new PointerEvent(type, { clientX: box.left + x, clientY: box.top + 5, bubbles: true }));
    pointAt("pointermove", 1);
    await expect.element(page.getByRole("status")).toHaveTextContent(labels[0]);
    expect(circles[0].getAttribute("class")).toMatch(/marked/);
    pointAt("pointerdown", box.width - 1);
    await expect.element(page.getByRole("status")).toHaveTextContent(labels[7]);
    expect(circles[0].getAttribute("class")).not.toMatch(/marked/);
    // React hears the pointer leaving from pointerout.
    pointAt("pointerout", -10);
    await expect.element(page.getByRole("status")).not.toBeInTheDocument();
  });

  it("draws a flat line for one count, or counts all the same", async () => {
    const { rerender } = await render(<Sparkline values={[5]} labels={["Only: 5"]} name="One" from="a" to="b" />);
    const points = () => page.getByRole("img").element().querySelector("polyline")!.getAttribute("points")!;
    expect(points()).not.toMatch(/NaN/);
    await rerender(<Sparkline values={[2, 2, 2]} labels={["a", "b", "c"]} name="Flat" from="a" to="b" />);
    expect(points()).not.toMatch(/NaN/);
    expect(
      new Set(
        points()
          .split(" ")
          .map((point) => point.split(",")[1]),
      ).size,
    ).toBe(1);
  });

  it("puts zero at the bottom, on the baseline, even when no count is zero, and draws counts of all zero there", async () => {
    const { rerender } = await render(<Sparkline values={[50, 100]} labels={["a", "b"]} name="High" from="a" to="b" />);
    const chart = () => page.getByRole("img").element();
    const baseline = () => Number(chart().querySelector("line")!.getAttribute("y1"));
    const heights = () =>
      chart()
        .querySelector("polyline")!
        .getAttribute("points")!
        .split(" ")
        .map((point) => Number(point.split(",")[1]));
    // Half the top count is halfway between the top point and the baseline.
    const [half, top] = heights();
    expect(half).toBeCloseTo((top + baseline()) / 2);
    await rerender(<Sparkline values={[0, 0]} labels={["a", "b"]} name="None" from="a" to="b" />);
    expect(heights()).toEqual([baseline(), baseline()]);
  });
});

describe("DevLogin", () => {
  it("offers a button per address with what it is, each a form posting that address to the dev login route", async () => {
    await render(
      <DevLogin
        accounts={[
          { email: "admin@pauseai.uk", description: "Admin permissions" },
          { email: "jo@pauseai.uk", description: "no account" },
        ]}
      />,
    );
    const box = page.getByRole("region", { name: staffCopy.devLogin.title });
    await expect.element(box.getByText(staffCopy.devLogin.hint)).toBeVisible();
    const forms = box.element().querySelectorAll("form");
    expect([...forms].map((f) => [f.getAttribute("action"), f.querySelector("input")!.value])).toEqual([
      ["/staff/api/dev-login", "admin@pauseai.uk"],
      ["/staff/api/dev-login", "jo@pauseai.uk"],
    ]);
    await expect.element(box.getByRole("button", { name: "jo@pauseai.uk" })).toBeVisible();
    await expect.element(box.getByText("no account")).toBeVisible();
    expect(getComputedStyle(box.element()).borderTopStyle).toBe("dashed");
  });

  it("passes on the page to go to once logged in", async () => {
    await render(<DevLogin accounts={[{ email: "jo@pauseai.uk", description: "no account" }]} next="/staff/letters" />);
    expect(document.querySelector<HTMLInputElement>('input[name="next"]')!.value).toBe("/staff/letters");
  });

  it("is nothing outside a fixture build, where there are no accounts to offer", async () => {
    await render(<DevLogin accounts={undefined} />);
    await expect.element(page.getByRole("region", { name: staffCopy.devLogin.title })).not.toBeInTheDocument();
  });
});

describe("StaffAccountsTable", () => {
  const accounts = [
    {
      email: "admin@pauseai.uk",
      permissions: ["admin"],
      addedBy: "migration",
      addedAt: "2026-10-16T12:00:00Z",
      lastLoginAt: "2026-10-22T08:00:00Z",
      lastSeenAt: "2026-10-22T09:15:00Z",
      sessions: 2,
    },
    {
      email: "jo@pauseai.uk",
      permissions: ["supporters"],
      addedBy: "admin@pauseai.uk",
      addedAt: "2026-10-20T09:00:00Z",
      lastLoginAt: null,
      lastSeenAt: null,
      sessions: 0,
    },
    {
      email: "sam@pauseai.uk",
      permissions: [],
      addedBy: "login",
      addedAt: "2026-10-21T10:30:00Z",
      lastLoginAt: "2026-10-21T10:30:00Z",
      lastSeenAt: "2026-10-21T11:00:00Z",
      sessions: 1,
    },
  ] satisfies StaffAccount[];

  const renderTable = async () => {
    const save = action();
    const remove = action();
    const end = action();
    await render(
      <StaffAccountsTable
        save={save.fn}
        remove={remove.fn}
        endSessions={end.fn}
        accounts={accounts}
        you="admin@pauseai.uk"
      />,
    );
    return { save, remove, end };
  };

  it("says when each was added and by whom, or by its login, when last logged in and seen, and its sessions open", async () => {
    await renderTable();
    const row = (email: string) =>
      page
        .getByRole("row")
        .filter({ hasText: email })
        .getByRole("cell")
        .all()
        .map((cell) => cell.element().textContent);
    const copy = staffCopy.accounts;
    expect(row("jo@pauseai.uk").slice(2, 6)).toEqual([
      `20 Oct 2026, 09:00 ${copy.addedBy("admin@pauseai.uk")}`,
      copy.never,
      copy.never,
      "0",
    ]);
    expect(row("sam@pauseai.uk").slice(2, 6)).toEqual([
      `21 Oct 2026, 10:30 ${copy.addedByLogin}`,
      "21 Oct 2026, 10:30",
      "21 Oct 2026, 11:00",
      `1${copy.endSessions}`,
    ]);
  });

  it("ends an account's sessions from its row, only where it has some, saying on your own row that it logs you out", async () => {
    const { end } = await renderTable();
    const form = (email: string) => page.getByRole("form", { name: `${staffCopy.accounts.endSessions}: ${email}` });
    await expect.element(form("jo@pauseai.uk")).not.toBeInTheDocument();
    await expect
      .element(form("admin@pauseai.uk").getByRole("button"))
      .toHaveTextContent(staffCopy.accounts.endMySessions);
    await expect.element(form("sam@pauseai.uk").getByRole("button")).toHaveTextContent(staffCopy.accounts.endSessions);
    await form("sam@pauseai.uk").getByRole("button").click();
    await vi.waitFor(() => expect(end.sent).toEqual([{ email: "sam@pauseai.uk" }]));
  });

  it("lists every account, centred in its row, with its boxes, a Remove at the right, and a key to the permissions", async () => {
    const { remove } = await renderTable();
    const cell = page.getByRole("cell", { name: "22 Oct 2026, 08:00", exact: true });
    await expect.element(cell).toBeVisible();
    expect(getComputedStyle(cell.element()).verticalAlign).toBe("middle");
    const jo = page.getByRole("group", { name: "jo@pauseai.uk" });
    expect(
      jo
        .getByRole("checkbox")
        .all()
        .map((box) => box.element().parentElement!.textContent),
    ).toEqual([staffCopy.accounts.names.supporters, staffCopy.accounts.names.admin]);
    await expect.element(jo.getByRole("checkbox", { name: staffCopy.accounts.names.supporters })).toBeChecked();
    // Under its heading, what each permission opens, a row each: its name in bold, then what it opens.
    await expect
      .element(page.getByRole("heading", { level: 2, name: staffCopy.accounts.permissionsKey }))
      .toBeVisible();
    const opens = [...document.querySelectorAll("dl > div")].map((row) => [
      row.querySelector("dt")!.textContent,
      row.querySelector("dd")!.textContent,
    ]);
    expect(opens).toEqual([
      [staffCopy.accounts.names.supporters, staffCopy.accounts.opens.supporters],
      [staffCopy.accounts.names.admin, staffCopy.accounts.opens.admin],
    ]);
    expect(Number(getComputedStyle(document.querySelector("dt")!).fontWeight)).toBeGreaterThanOrEqual(600);

    await page
      .getByRole("form", { name: `${staffCopy.accounts.remove}: jo@pauseai.uk` })
      .getByRole("button")
      .click();
    await vi.waitFor(() => expect(remove.sent).toHaveLength(1));
    expect(remove.sent[0]).toEqual({ email: "jo@pauseai.uk" });
  });

  it("saves a tick at once: whose, and every permission now ticked in the row", async () => {
    const { save } = await renderTable();
    const jo = page.getByRole("group", { name: "jo@pauseai.uk" });
    await jo.getByRole("checkbox", { name: staffCopy.accounts.names.admin }).click();
    await vi.waitFor(() => expect(save.sent).toHaveLength(1));
    expect(save.sent[0]).toEqual({ email: "jo@pauseai.uk", "permission:supporters": "on", "permission:admin": "on" });
    await jo.getByRole("checkbox", { name: staffCopy.accounts.names.supporters }).click();
    await vi.waitFor(() => expect(save.sent).toHaveLength(2));
    expect(save.sent[1]).toEqual({ email: "jo@pauseai.uk" });
  });

  it("shows a tick straight away, its row's boxes off until it's saved, then what's saved", async () => {
    let done = () => {};
    const save = vi.fn(() => new Promise<void>((resolve) => (done = resolve)));
    await render(
      <StaffAccountsTable save={save} remove={vi.fn()} endSessions={vi.fn()} accounts={accounts} you="jo@pauseai.uk" />,
    );
    const jo = page.getByRole("group", { name: "jo@pauseai.uk" });
    const admin = jo.getByRole("checkbox", { name: staffCopy.accounts.names.admin });
    await admin.click();
    await expect.element(admin).toBeChecked();
    await expect.element(admin).toBeDisabled();
    await expect.element(jo).toHaveAttribute("aria-busy", "true");
    // Another row isn't held up.
    await expect
      .element(page.getByRole("group", { name: "admin@pauseai.uk" }).getByRole("checkbox").first())
      .toBeEnabled();
    // Saved, or refused, the row shows what the page was given: here, unchanged.
    done();
    await expect.element(admin).toBeEnabled();
    await expect.element(admin).not.toBeChecked();
  });

  it("adds someone at once, refusing an address not at pauseai.uk or in the table already, and keeping it to put right", async () => {
    const { save } = await renderTable();
    const field = page.getByRole("textbox", { name: staffCopy.accounts.addTitle });
    const addButton = page.getByRole("button", { name: staffCopy.accounts.add });

    await field.fill("sam@example.com");
    await addButton.click();
    await expect.element(page.getByRole("alert")).toHaveTextContent(staffCopy.accounts.notPauseai);
    await expect.element(field).toHaveAttribute("aria-invalid", "true");
    await expect.element(field).toHaveValue("sam@example.com");
    await field.fill("JO@pauseai.uk");
    await addButton.click();
    await expect.element(page.getByRole("alert")).toHaveTextContent(staffCopy.accounts.alreadyThere);
    expect(save.sent).toHaveLength(0);

    // Enter adds too: an account with no permissions, and the field empty again.
    await userEvent.fill(field, " Lee@PauseAI.uk ");
    await userEvent.keyboard("{Enter}");
    await vi.waitFor(() => expect(save.sent).toHaveLength(1));
    expect(save.sent[0]).toEqual({ email: "lee@pauseai.uk" });
    await expect.element(field).toHaveValue("");
    await expect.element(page.getByRole("alert")).not.toBeInTheDocument();
    await expect.element(field).toHaveAttribute("aria-invalid", "false");
  });
});

describe("RemoveAccountForm", () => {
  it("sends whose", async () => {
    const { fn, sent } = action();
    await render(<RemoveAccountForm email="jo@pauseai.uk" remove={fn} />);
    await page.getByRole("button", { name: staffCopy.accounts.remove }).click();
    await vi.waitFor(() => expect(sent).toHaveLength(1));
    expect(sent[0]).toEqual({ email: "jo@pauseai.uk" });
  });
});

describe("AccountsNotice", () => {
  it("says why a change was refused, as an error, or nothing", async () => {
    const { rerender } = await render(<AccountsNotice notice="last-admin" />);
    const error = page.getByRole("alert");
    await expect.element(error).toHaveTextContent(staffCopy.accounts.lastAdmin);
    expect(error.element().firstElementChild!.tagName.toLowerCase()).toBe("svg");
    expect(error.element().className).toMatch(/red/);
    await rerender(<AccountsNotice notice="not-pauseai" />);
    await expect.element(page.getByRole("alert")).toHaveTextContent(staffCopy.accounts.notPauseai);
    await rerender(<AccountsNotice notice="" />);
    expect(page.getByRole("alert").all()).toHaveLength(0);
  });
});

describe("Alert", () => {
  it("is an error read out at once in red, or something waiting in amber", async () => {
    const { rerender } = await render(<Alert>Broken.</Alert>);
    await expect.element(page.getByRole("alert")).toHaveTextContent("Broken.");
    // A strip: its icon first, tinted, no border.
    expect(page.getByRole("alert").element().firstElementChild!.tagName.toLowerCase()).toBe("svg");
    expect(page.getByRole("alert").element().className).toMatch(/red/);
    expect(getComputedStyle(page.getByRole("alert").element()).borderLeftWidth).toBe("0px");
    await rerender(<Alert tone="amber">Waiting.</Alert>);
    await expect.element(page.getByRole("status")).toHaveTextContent("Waiting.");
    expect(page.getByRole("status").element().className).toMatch(/amber/);
  });
});

describe("KeepSignedIn", () => {
  it("is unticked to start, and sends remember=on once ticked", async () => {
    await render(
      <form data-testid="f">
        <KeepSignedIn />
      </form>,
    );
    const box = page.getByRole("checkbox", { name: staffCopy.login.keep });
    await expect.element(box).not.toBeChecked();
    const data = () => new FormData(page.getByTestId("f").element() as HTMLFormElement);
    expect(data().get("remember")).toBeNull();
    await box.click();
    expect(data().get("remember")).toBe("on");
  });
});

describe("Breadcrumb", () => {
  it("is the way back, as a navigation landmark", async () => {
    await render(<Breadcrumb href="/staff/supporters">Supporters</Breadcrumb>);
    const link = page.getByRole("navigation", { name: "Supporters" }).getByRole("link", { name: "Supporters" });
    await expect.element(link).toHaveAttribute("href", "/staff/supporters");
  });
});

describe("EraseLink", () => {
  it("is the red button to the erase page, with the note beside it", async () => {
    await render(<EraseLink supporterId={7} />);
    await expect
      .element(page.getByRole("link", { name: staffCopy.erase.title }))
      .toHaveAttribute("href", "/staff/supporters/7/erase");
    await expect.element(page.getByText(staffCopy.erase.note)).toBeVisible();
  });
});

describe("HouseTabs", () => {
  it("is a tab per house and All, keeping the filters but the page, the house chosen marked", async () => {
    await render(<HouseTabs search={{ ...emptyPoliticiansSearch, q: "jo", house: "lords", page: "3" }} />);
    const tabs = page.getByRole("navigation", { name: staffCopy.fields.house });
    await expect
      .element(tabs.getByRole("link", { name: staffCopy.politicians.allHouses }))
      .toHaveAttribute("href", "/staff/politicians?q=jo");
    const lords = tabs.getByRole("link", { name: staffCopy.houses.lords });
    await expect.element(lords).toHaveAttribute("aria-current", "page");
    await expect
      .element(tabs.getByRole("link", { name: staffCopy.houses.senedd }))
      .toHaveAttribute("href", "/staff/politicians?q=jo&house=senedd");
  });

  it("marks All for no house, or one it doesn't know", async () => {
    await render(<HouseTabs search={{ ...emptyPoliticiansSearch, house: "hogwarts" }} />);
    await expect
      .element(page.getByRole("link", { name: staffCopy.politicians.allHouses }))
      .toHaveAttribute("aria-current", "page");
  });
});

describe("PoliticiansList", () => {
  const copy = staffCopy.politicians;
  const search = { ...emptyPoliticiansSearch, q: "pol", page: "2" };

  it("is the count, the table and the pages, and links to those the search finds elsewhere", async () => {
    await render(
      <PoliticiansList
        list={{ ...examplePoliticiansPage, total: 150, page: 2, pages: 2, outOfOffice: 3, otherHouses: 2, tests: 1 }}
        search={search}
        asks={exampleAsks}
      />,
    );
    await expect.element(page.getByText(copy.total(150))).toBeVisible();
    await expect.element(page.getByRole("link", { name: "Polly Placeholder" })).toBeVisible();
    expect(await downloads()).toContain("/staff/politicians/download?q=pol&format=vcf");
    await expect
      .element(page.getByRole("link", { name: staffCopy.paging.previous }))
      .toHaveAttribute("href", "/staff/politicians?q=pol");
    await expect
      .element(page.getByRole("link", { name: copy.otherHouses(2) }))
      .toHaveAttribute("href", "/staff/politicians?q=pol");
    await expect
      .element(page.getByRole("link", { name: copy.outOfOffice(3) }))
      .toHaveAttribute("href", "/staff/politicians?q=pol&status=any");
    await expect
      .element(page.getByRole("link", { name: copy.tests(1) }))
      .toHaveAttribute("href", "/staff/politicians?q=pol&flag=test");
  });

  it("offers the nearest names when a search finds no one, and nothing more when there's nothing", async () => {
    const { rerender } = await render(
      <PoliticiansList
        list={{ ...examplePoliticiansPage, politicians: [], total: 0, closest: examplePoliticiansPage.politicians }}
        search={search}
        asks={exampleAsks}
      />,
    );
    await expect.element(page.getByText(copy.closest)).toBeVisible();
    await expect.element(page.getByRole("link", { name: "Polly Placeholder" })).toBeVisible();
    await rerender(
      <PoliticiansList list={{ ...examplePoliticiansPage, politicians: [], total: 0 }} search={search} asks={[]} />,
    );
    await expect.element(page.getByText(copy.none)).toBeVisible();
    expect(page.getByRole("link").all()).toHaveLength(0);
  });
});

describe("MailingsTable", () => {
  const copy = staffCopy.mailings;
  const cells = (title: string) =>
    page
      .getByRole("row")
      .filter({ hasText: title })
      .getByRole("cell")
      .all()
      .map((c) => c.element().textContent);

  it("lists each mailing: its page, its ask's politicians, where it came from, when, and its counts", async () => {
    await render(<MailingsTable mailings={exampleMailings} />);
    expect(cells("Edinburgh")).toEqual([
      "Edinburgh Conference Nov 26 Invitation",
      "Edinburgh conference",
      copy.imported,
      "1 Oct 2026",
      "2",
      "1",
      "1",
      "1",
    ]);
    expect(cells("Ben Lake")).toEqual([
      "Ben Lake October 2026 Debate",
      "–",
      copy.notRecorded,
      copy.notSent,
      "–",
      "–",
      "–",
      "–",
    ]);
    await expect
      .element(page.getByRole("link", { name: "Edinburgh Conference Nov 26 Invitation" }))
      .toHaveAttribute("href", "/staff/mailings/2");
    await expect
      .element(page.getByRole("link", { name: "Edinburgh conference" }))
      .toHaveAttribute("href", "/staff/politicians?ask=edinburgh-conference-2026");
  });

  it("says when there are none", async () => {
    await render(<MailingsTable mailings={[]} />);
    await expect.element(page.getByText(copy.none)).toBeVisible();
  });
});

describe("MailingDetails", () => {
  const copy = staffCopy.mailings;

  it("is what the mailing was, that it has no text, and each recipient's outcome, linked to them", async () => {
    const { rerender } = await render(<MailingDetails mailing={exampleMailing} />);
    await expect.element(page.getByRole("heading", { level: 1 })).toHaveTextContent(exampleMailing.title);
    await expect.element(page.getByText(copy.counts(2, 1))).toBeVisible();
    await expect.element(page.getByText(copy.noText)).toBeVisible();
    await expect.element(page.getByText(copy.imported)).toBeVisible();
    await expect
      .element(page.getByRole("link", { name: "Edinburgh conference" }))
      .toHaveAttribute("href", "/staff/politicians?ask=edinburgh-conference-2026");
    const cells = (name: string) =>
      page
        .getByRole("row")
        .filter({ hasText: name })
        .getByRole("cell")
        .all()
        .map((c) => c.element().textContent);
    expect(cells("Polly")).toEqual([
      "Polly Placeholder",
      staffCopy.letters.status.sent,
      "1 Oct 2026",
      "3 Oct 2026",
      copy.personalised,
    ]);
    expect(cells("Morag")[4]).toBe(copy.asWritten);
    expect(cells("Dora")).toEqual(["Dora Dummy", staffCopy.letters.status.not_sent, "–", "–", copy.asWritten]);
    await expect
      .element(page.getByRole("link", { name: "Morag Example" }))
      .toHaveAttribute("href", "/staff/politicians/8");
    // A status nobody knows any more, as it's stored.
    await rerender(
      <MailingDetails
        mailing={{ ...exampleMailing, recipients: [{ ...exampleMailing.recipients[0], status: "queued" }] }}
      />,
    );
    expect(cells("Polly")[1]).toBe("queued");
  });

  it("says when there's no ask, and when it isn't sent yet", async () => {
    await render(<MailingDetails mailing={{ ...exampleMailings[0], recipients: [] }} />);
    await expect.element(page.getByText(copy.noAsk)).toBeVisible();
    await expect.element(page.getByText(copy.notSent)).toBeVisible();
    await expect.element(page.getByText(copy.imported)).not.toBeInTheDocument();
  });
});

describe("DeletePolitician", () => {
  it("is the red button with its note, opening a box that asks to be sure, whose button sends their ID", async () => {
    const { fn, sent } = action();
    await render(<DeletePolitician politician={{ id: 7, name: "Polly Placeholder" }} action={fn} />);
    const copy = staffCopy.politician.delete;
    await expect.element(page.getByText(copy.note)).toBeVisible();
    await expect.element(page.getByText(copy.sure("Polly Placeholder"))).not.toBeVisible();
    await page.getByRole("button", { name: copy.button, exact: true }).click();
    await expect.element(page.getByText(copy.sure("Polly Placeholder"))).toBeVisible();
    await page.getByRole("button", { name: copy.confirm }).click();
    await expect.poll(() => sent).toEqual([{ politicianId: "7" }]);
  });

  it("is nothing for a politician who can't be deleted", async () => {
    await render(<DeletePolitician politician={{ id: 7, name: "Polly" }} deletable={false} action={vi.fn()} />);
    expect(page.getByRole("button").all()).toHaveLength(0);
  });
});

describe("SortHeading", () => {
  it("links to the sort, and marks the current one with its direction", async () => {
    await render(
      <Table>
        <thead>
          <tr>
            <SortHeading sortKey="name" current={{ key: "name", dir: "desc" }} href="/x?sort=name&dir=asc">
              Name
            </SortHeading>
            <SortHeading sortKey="party" current={{ key: "name", dir: "desc" }} href="/x?sort=party&dir=asc">
              Party
            </SortHeading>
          </tr>
        </thead>
        <tbody />
      </Table>,
    );
    const name = page.getByRole("link", { name: "Name" });
    await expect.element(name).toHaveAttribute("href", "/x?sort=name&dir=asc");
    expect(name.element().closest("th")!.getAttribute("aria-sort")).toBe("descending");
    const party = page.getByRole("link", { name: "Party" });
    await expect.element(party).toHaveAttribute("href", "/x?sort=party&dir=asc");
    expect(party.element().closest("th")!.getAttribute("aria-sort")).toBeNull();
  });
});

describe("ImportCard", () => {
  it("is a card with its title as the link to its page, its lozenges, what it does and its newest run, in a grid", async () => {
    await render(
      <ImportCards>
        <ImportCard
          title="An import"
          href="/staff/import-data/luma"
          tags={<span>Hourly</span>}
          intro={<a href="https://luma.com">Luma</a>}
        >
          <p>Not imported yet.</p>
        </ImportCard>
        <ImportCard title="Another" href="/x" tags={null} intro="More.">
          <p>Never.</p>
        </ImportCard>
      </ImportCards>,
    );
    const heading = page.getByRole("heading", { level: 3, name: "An import Hourly" });
    await expect.element(heading).toBeVisible();
    await expect
      .element(heading.getByRole("link", { name: "An import" }))
      .toHaveAttribute("href", "/staff/import-data/luma");
    await expect.element(page.getByRole("link", { name: "Luma" })).toHaveAttribute("href", "https://luma.com");
    await expect.element(page.getByText("Not imported yet.")).toBeVisible();
    // The title's link covers the card; the description's own link sits above it.
    const card = heading.element().closest("section")!;
    expect(getComputedStyle(card).position).toBe("relative");
    expect(getComputedStyle(heading.getByRole("link").element(), "::after").position).toBe("absolute");
    expect(getComputedStyle(page.getByRole("link", { name: "Luma" }).element()).zIndex).toBe("1");
    expect(getComputedStyle(card.parentElement!).display).toBe("grid");
    // The ending comes before the description, and the card's border is the ordinary one.
    expect(card.children[1].textContent).toBe("Not imported yet.");
    expect(getComputedStyle(card).borderLeftWidth).toBe("1px");
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
  it("is the form, on its own at first, with the box to stay signed in", async () => {
    await render(<LoginForm />);
    await expect.element(page.getByText(staffCopy.login.intro)).toBeVisible();
    await expect.element(page.getByRole("textbox", { name: staffCopy.login.emailLabel })).toBeVisible();
    await expect.element(page.getByRole("checkbox", { name: staffCopy.login.keep })).not.toBeChecked();
    await expect.element(page.getByText(staffCopy.login.failed)).not.toBeInTheDocument();
    await expect.element(page.getByText(staffCopy.login.elsewhere)).not.toBeInTheDocument();
    expect(document.querySelector('input[name="next"]')).toBeNull();
  });

  it("passes on the page to go to once logged in", async () => {
    await render(<LoginForm next="/staff/letters" />);
    expect(document.querySelector<HTMLInputElement>('input[name="next"]')!.value).toBe("/staff/letters");
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
  const none = {
    asks: exampleAsks,
    setStatus: vi.fn(),
    letters: { senders: false as const, letters: [] },
    history: [],
    airtableTable: "https://airtable.com/app/tbl",
  };

  it("heads the page with their name and Airtable's markers, and a card of what's known beside one of asks", async () => {
    const { rerender } = await render(
      <PoliticianDetails politician={{ ...MP, airtableId: null, email: null }} unblock={vi.fn()} {...none} />,
    );
    await expect
      .element(page.getByRole("heading", { level: 1 }))
      .toHaveTextContent(`${MP.name}${staffCopy.politician.importantTarget}`);
    // The party, status and country with their icons; the constituency is in the heading.
    const icons = [...document.querySelectorAll("small")].map((small) => small.parentElement!.textContent);
    expect(icons).toEqual([
      `${staffCopy.fields.party}${MP.party}`,
      `${staffCopy.politician.status}${staffCopy.personStatuses.in_office}`,
      `${staffCopy.politician.country}${staffCopy.countries.england}`,
    ]);
    expect(document.querySelectorAll("svg[aria-hidden]")).toHaveLength(2);
    // How to write to them, then the notes, then where they came from.
    const facts = page.getByRole("definition").all();
    expect(facts.map((d) => d.element().textContent)).toEqual([staffCopy.politicians.noEmail, MP.salutation]);
    await expect.element(page.getByRole("heading", { name: staffCopy.politician.writing })).toBeVisible();
    await expect
      .element(page.getByText(`${staffCopy.politician.source} ${staffCopy.politician.sources.staff}`))
      .toBeVisible();
    // The notes keep their lines.
    expect(getComputedStyle(page.getByText(/example fair/).element()).whiteSpace).toBe("pre-line");
    await expect.element(page.getByRole("region", { name: staffCopy.politician.statusesTitle })).toBeVisible();
    await expect.element(page.getByText(staffCopy.politician.noHistory)).toBeVisible();
    // A personal connection is a tag too; none of the rest is there for someone without them.
    await rerender(
      <PoliticianDetails
        politician={{ ...MP, importantTarget: false, personalConnection: true, country: null, notes: "" }}
        unblock={vi.fn()}
        {...none}
      />,
    );
    await expect.element(page.getByText(staffCopy.politician.personalConnection)).toBeVisible();
    await expect.element(page.getByRole("heading", { name: staffCopy.politician.notes })).not.toBeInTheDocument();
  });

  it("links their address, to write to them, and has no party, country or salutation for someone with none", async () => {
    await render(
      <PoliticianDetails
        politician={{ ...MP, party: "", country: null, status: "retired", salutation: "" }}
        unblock={vi.fn()}
        {...none}
      />,
    );
    await expect.element(page.getByRole("link", { name: MP.email! })).toHaveAttribute("href", `mailto:${MP.email}`);
    expect([...document.querySelectorAll("small")].map((small) => small.textContent)).toEqual([
      staffCopy.politician.status,
    ]);
    // No salutation, no line for it.
    expect(
      page
        .getByRole("term")
        .all()
        .map((dt) => dt.element().textContent),
    ).toEqual([staffCopy.fields.email]);
  });

  it("sends Airtable's politicians to Airtable, saying if their record has gone; each says where they came from", async () => {
    for (const [politician, source] of [
      [MP, staffCopy.politician.sources.airtable],
      [{ ...MP, airtableId: null, isTest: true, importantTarget: false }, staffCopy.politician.sources.test],
    ] as const) {
      const { unmount } = await render(<PoliticianDetails politician={politician} unblock={vi.fn()} {...none} />);
      // From Airtable: the source links to their own record there. A test MP has none, and no link.
      const record = page.getByRole("link", { name: source, exact: true });
      if (politician.airtableId) {
        await expect.element(record).toHaveAttribute("href", `https://airtable.com/app/tbl/${politician.airtableId}`);
        await expect.element(record).toHaveAttribute("target", "_blank");
        await expect.element(page.getByText(staffCopy.politician.editInAirtable, { exact: false })).toBeVisible();
      } else {
        await expect.element(record).not.toBeInTheDocument();
        await expect.element(page.getByText(`${staffCopy.politician.source} ${source}`)).toBeVisible();
        expect(page.getByRole("heading", { level: 1 }).element().textContent).toBe(
          `${MP.name}${staffCopy.politicians.flags.test}`,
        );
      }
      await unmount();
    }
    await render(
      <PoliticianDetails
        politician={{ ...MP, airtableRemovedAt: "2026-10-20T03:00:00Z" }}
        unblock={vi.fn()}
        {...none}
      />,
    );
    await expect.element(page.getByText(staffCopy.politician.airtableRemoved("20 Oct 2026"))).toBeVisible();
  });

  it("says under their name what they are: in which house, for where, and if they're no longer in office", async () => {
    const { roles, role } = staffCopy.politician;
    for (const [politician, words] of [
      [MP, role(roles.commons, MP.constituency, true)],
      [{ ...MP, house: "lords", constituency: null }, role(roles.lords, null, true)],
      [{ ...MP, status: "died" }, role(roles.commons, MP.constituency, false)],
    ] as const) {
      const { unmount } = await render(<PoliticianDetails politician={politician} unblock={vi.fn()} {...none} />);
      await expect.element(page.getByText(words, { exact: true })).toBeVisible();
      await unmount();
    }
  });

  it("tells one history of the letters to them, the replies, and what the audit log says about them, newest first", async () => {
    // A peer: no constituency, country or notes, so no line for them.
    const peer = { ...MP, constituency: null, country: null, notes: "" };
    const fromPauseai = {
      mailingId: 3,
      mailing: "Example Mailing",
      status: "sent",
      personalised: false,
    };
    await render(
      <PoliticianDetails
        {...none}
        pauseaiLetters={[
          { ...fromPauseai, id: 11, at: "2026-10-03T08:00:00Z", personalised: true },
          { ...fromPauseai, id: 12, at: "2026-09-02T08:00:00Z" },
          { ...fromPauseai, id: 13, at: "2026-06-01T08:00:00Z" },
        ]}
        politician={peer}
        unblock={vi.fn()}
        letters={{
          senders: true,
          letters: [
            { ...exampleLetter, mpName: MP.name, politicianId: MP.id },
            {
              ...exampleLetter,
              id: 2,
              mpName: MP.name,
              politicianId: MP.id,
              senderName: "Anon Writer",
              supporterId: null,
              status: "sent",
              createdAt: "2026-10-13T08:00:00Z",
              repliedAt: "2026-10-15T09:00:00Z",
            },
            // A campaign and a status nobody knows any more, shown as they're stored.
            {
              ...exampleLetter,
              id: 3,
              mpName: MP.name,
              politicianId: MP.id,
              senderName: "Old Writer",
              supporterId: null,
              campaign: "old-campaign",
              status: "queued",
              createdAt: "2026-07-01T08:00:00Z",
              repliedAt: null,
            },
          ],
        }}
        history={[
          ...examplePoliticianHistory,
          // Statuses logged by campaign, before asks, and by an ask no longer listed.
          {
            id: 8,
            at: "2026-09-01T10:00:00Z",
            actor: "jo@pauseai.uk",
            action: "set status",
            details: { politicianId: 7, campaign: "gone", status: null, note: "" },
          },
          {
            id: 7,
            at: "2026-08-15T10:00:00Z",
            actor: "jo@pauseai.uk",
            action: "set status",
            details: { politicianId: 7, campaign: pm.slug, status: "odd", note: "" },
          },
          {
            id: 10,
            at: "2026-08-12T10:00:00Z",
            actor: "airtable",
            action: "set status",
            details: { politicianId: 7, ask: "an-old-ask", status: "signed", note: "" },
          },
          {
            id: 6,
            at: "2026-08-10T10:00:00Z",
            actor: "postmark",
            action: "block address",
            details: { address: "polly@example.org", kind: "weird" },
          },
          { id: 5, at: "2026-08-01T10:00:00Z", actor: "x", action: "strange", details: {} },
          {
            id: 9,
            at: "2026-07-20T10:00:00Z",
            actor: "sync",
            action: "edit politician",
            details: { id: 7, name: "Polly Placeholder", changed: { party: ["Labour", "Labour (Co-op)"] } },
          },
          {
            id: 4,
            at: "2026-07-15T10:00:00Z",
            actor: "import",
            action: "add politician",
            details: { politicianId: 7, name: "Polly Placeholder" },
          },
        ]}
      />,
    );
    const facts = page.getByRole("definition").all();
    expect(facts.map((d) => d.element().textContent)).toEqual([MP.email, MP.salutation]);
    // The sender leads to their supporter once they're one; the letters and replies sit among the audit log's entries by time.
    await expect
      .element(page.getByRole("link", { name: exampleLetter.senderName }))
      .toHaveAttribute("href", "/staff/supporters/7");
    await expect.element(page.getByRole("link", { name: "Anon Writer" })).not.toBeInTheDocument();
    const statusLine = (words: { before: string; after: string }, name: string) =>
      `${words.before}${name}${words.after}`;
    const history = page.getByRole("list", { name: staffCopy.politician.historyTitle }).getByRole("listitem").all();
    const copy = staffCopy.politician.history;
    expect(history.map((item) => item.element().textContent)).toEqual([
      `15 Oct 2026, 09:00${copy["letter-replied"]} Anon Writer · ${pm.title}`,
      `14 Oct 2026, 09:30${copy["unblock address"]} polly.placeholder.mp@parliament.uk · Fixed in Airtable · jo@pauseai.uk`,
      `13 Oct 2026, 08:00${copy.letter} Anon Writer · ${pm.title} · ${staffCopy.letters.status.sent}`,
      `12 Oct 2026, 09:10${copy["block address"]} polly.placeholder.mp@parliament.uk · ${staffCopy.emails.kinds.hard} · postmark`,
      `12 Oct 2026, 09:00${copy.letter} ${exampleLetter.senderName} · ${pm.title} · ${staffCopy.letters.status.bounced}`,
      `3 Oct 2026, 08:00${copy["pauseai-letter"]} Example Mailing · ${staffCopy.politician.personalised}`,
      // Dated the day before it was recorded, so on that day.
      `1 Oct 2026${statusLine(staffCopy.politician.statusSet(staffCopy.statuses.signed), ask("frontier-ai-letter").title)} · Told us at the march · jo@pauseai.uk`,
      `30 Sept 2026, 10:00${copy["edit politician"]} Polly Placeholder · polly.placeholder.mp@parliament.uk · sam@pauseai.uk`,
      `2 Sept 2026, 08:00${copy["pauseai-letter"]} Example Mailing`,
      `1 Sept 2026, 10:00${statusLine(staffCopy.politician.statusCleared, "gone")} · jo@pauseai.uk`,
      `15 Aug 2026, 10:00${statusLine(staffCopy.politician.statusSet("odd"), pm.title)} · jo@pauseai.uk`,
      `12 Aug 2026, 10:00${statusLine(staffCopy.politician.statusSet(staffCopy.statuses.signed), "an-old-ask")} · airtable`,
      `10 Aug 2026, 10:00${copy["block address"]} polly@example.org · weird · postmark`,
      "1 Aug 2026, 10:00strange  · x",
      `20 Jul 2026, 10:00${copy["edit politician"]} Polly Placeholder · ${staffCopy.fields.party} Labour → Labour (Co-op) · sync`,
      `15 Jul 2026, 10:00${copy["add politician"]} Polly Placeholder · import`,
      `1 Jul 2026, 08:00${copy.letter} Old Writer · old-campaign · queued`,
      `1 Jun 2026, 08:00${copy["pauseai-letter"]} Example Mailing`,
    ]);
    // An answer leads to everyone who gave it, the ask to the letter as in the asks card, PauseAI's email to its
    // mailing, an address to its block.
    const historyList = page.getByRole("list", { name: staffCopy.politician.historyTitle });
    await expect
      .element(historyList.getByRole("link", { name: staffCopy.statuses.signed }).first())
      .toHaveAttribute("href", "/staff/politicians?ask=frontier-ai-letter&answer=signed");
    await expect
      .element(historyList.getByRole("link", { name: ask("frontier-ai-letter").title }))
      .toHaveAttribute("href", ask("frontier-ai-letter").url!);
    await expect
      .element(page.getByRole("link", { name: "Example Mailing" }).first())
      .toHaveAttribute("href", "/staff/mailings/3");
    await expect
      .element(page.getByRole("link", { name: "polly@example.org" }))
      .toHaveAttribute("href", "/staff/politicians/blocked-emails?q=polly%40example.org");
    // Each letter's status leads to it alone on the letters page.
    await expect
      .element(page.getByRole("link", { name: staffCopy.letters.status.bounced }))
      .toHaveAttribute("href", `/staff/letters/${exampleLetter.id}`);
    // Each campaign it names links to its public page; one no longer run is its slug, plain.
    const list = page.getByRole("list", { name: staffCopy.politician.historyTitle });
    const links = list.getByRole("link", { name: pm.title, exact: true }).all();
    expect(links.length).toBeGreaterThan(1);
    for (const link of links) await expect.element(link).toHaveAttribute("href", campaignPath(pm));
    await expect.element(list.getByRole("link", { name: "old-campaign" })).not.toBeInTheDocument();
    await expect.element(list.getByRole("link", { name: "gone" })).not.toBeInTheDocument();
  });

  it("without senders, lists each letter and reply by campaign and status alone, linking to no letter", async () => {
    await render(
      <PoliticianDetails
        {...none}
        politician={MP}
        unblock={vi.fn()}
        letters={{
          senders: false,
          letters: [
            {
              id: 2,
              campaign: pm.slug,
              status: "sent",
              createdAt: "2026-10-13T08:00:00Z",
              repliedAt: "2026-10-15T09:00:00Z",
            },
            { id: 1, campaign: "old-campaign", status: "queued", createdAt: "2026-07-01T08:00:00Z", repliedAt: null },
          ],
        }}
      />,
    );
    const copy = staffCopy.politician.history;
    const list = page.getByRole("list", { name: staffCopy.politician.historyTitle });
    expect(
      list
        .getByRole("listitem")
        .all()
        .map((item) => item.element().textContent),
    ).toEqual([
      `15 Oct 2026, 09:00${copy["unsigned-letter-replied"]} · ${pm.title}`,
      `13 Oct 2026, 08:00${copy.unsignedLetter} · ${pm.title} · ${staffCopy.letters.status.sent}`,
      `1 Jul 2026, 08:00${copy.unsignedLetter} · old-campaign · queued`,
    ]);
    expect(list.element().querySelector('a[href^="/staff/"]')).toBeNull();
  });

  it("gives each ask staff record, and each they've answered, a row: the answer first, the ask linked, who asked and when, who set the answer, and the form where staff record it", async () => {
    const { fn, sent } = action();
    const signed = { ...MP.statuses["frontier-ai-letter"], note: "By email" };
    await render(
      <PoliticianDetails
        {...none}
        politician={{ ...MP, statuses: { ...MP.statuses, "frontier-ai-letter": signed } }}
        setStatus={fn}
        unblock={vi.fn()}
      />,
    );
    const row = (slug: string) => page.getByRole("group", { name: ask(slug).title });
    // The ask staff record first, then the rest they've answered; an ask they haven't, staff don't record, isn't there.
    expect(
      page
        .getByRole("region", { name: staffCopy.politician.statusesTitle })
        .getByRole("group")
        .all()
        .map((g) => g.element().getAttribute("aria-label")),
    ).toEqual([ask("frontier-ai-letter").title, ask("edinburgh-conference-2026").title]);
    const letter = row("frontier-ai-letter");
    // Signed, and when, ticked in green.
    const answer = (group: typeof letter) => group.element().querySelector("[class*=answer]")!;
    expect(answer(letter).textContent).toBe(`${staffCopy.statuses.signed}1 Oct 2026${staffCopy.politician.edit}`);
    expect(answer(letter).className).toMatch(/yes/);
    // The ask's title links to the letter; who asked it and when.
    await expect
      .element(letter.getByRole("link", { name: ask("frontier-ai-letter").title }))
      .toHaveAttribute("href", ask("frontier-ai-letter").url);
    await expect
      .element(
        letter.getByText(
          staffCopy.politician.askedThem(
            `${staffCopy.asks.askedBy.supporters} and ${staffCopy.asks.askedBy.pauseai}`,
            "letter",
          ),
        ),
      )
      .toBeVisible();
    await expect
      .element(letter.getByText(`By email · ${staffCopy.politician.setBy("jo@pauseai.uk", "2 Oct 2026")}`))
      .toBeVisible();
    // Declined, from Airtable: crossed, not green, with no form, as staff don't record it.
    const event = row("edinburgh-conference-2026");
    expect(answer(event).textContent).toBe(staffCopy.statuses.declined);
    expect(answer(event).className).not.toMatch(/yes/);
    await expect.element(event.getByText(staffCopy.politician.fromImport.airtable)).toBeVisible();
    await expect
      .element(
        event.getByText(`${staffCopy.politician.askedThem(staffCopy.asks.askedBy.pauseai, "event")} · 1 Nov 2026`),
      )
      .toBeVisible();
    expect(event.getByRole("button").all()).toHaveLength(0);

    // The form, behind Edit.
    expect(letter.getByRole("button", { name: staffCopy.politicians.unmarkSigned }).query()).toBeNull();
    await letter.getByText(staffCopy.politician.edit, { exact: true }).click();
    await letter.getByLabelText(staffCopy.politician.note).fill("Their office wrote");
    await letter.getByRole("button", { name: staffCopy.politicians.unmarkSigned }).click();
    await vi.waitFor(() => expect(sent).toHaveLength(1));
    expect(sent[0]).toEqual({ politicianId: "7", ask: "frontier-ai-letter", status: "", note: "Their office wrote" });
  });

  it("shows an answer neither yes nor no plainly, and an ask with no link, asker or date by its title alone", async () => {
    const bare = { ...ask("go-to-parliament-oct-2026"), askedBy: [], date: null };
    const tentative = { ...MP.statuses["frontier-ai-letter"], status: "tentative" as const, date: null };
    await render(
      <PoliticianDetails
        {...none}
        asks={[bare]}
        politician={{ ...MP, statuses: { "go-to-parliament-oct-2026": tentative } }}
        setStatus={vi.fn()}
        unblock={vi.fn()}
      />,
    );
    const row = page.getByRole("group", { name: bare.title });
    const answer = row.element().querySelector("[class*=answer]")!;
    expect(answer.textContent).toBe(staffCopy.statuses.tentative);
    expect(answer.className).not.toMatch(/yes/);
    expect(row.getByRole("link").all()).toHaveLength(0);
    await expect.element(row.getByText(staffCopy.politician.askedThem("", "event"), { exact: true })).toBeVisible();
  });

  it("offers to mark them signed where they haven't", async () => {
    const { fn, sent } = action();
    await render(<PoliticianDetails {...none} politician={{ ...MP, statuses: {} }} setStatus={fn} unblock={vi.fn()} />);
    const letter = page.getByRole("group", { name: ask("frontier-ai-letter").title });
    await expect.element(letter.getByText(staffCopy.statuses.none)).toBeVisible();
    // Not without a note of how they know.
    await letter.getByText(staffCopy.politician.edit, { exact: true }).click();
    const mark = letter.getByRole("button", { name: staffCopy.politicians.markSigned });
    await mark.click();
    expect(sent).toHaveLength(0);
    await letter.getByLabelText(staffCopy.politician.note).fill("They emailed");
    await mark.click();
    await vi.waitFor(() => expect(sent).toHaveLength(1));
    expect(sent[0]).toEqual({ politicianId: "7", ask: "frontier-ai-letter", status: "signed", note: "They emailed" });
  });

  it("chooses an event's answer from a list, where staff record it", async () => {
    // Staff record the letter to the PM; an event made one of its asks, its answer is chosen from a list.
    const event = { ...ask("frontier-ai-letter"), kind: "event" as const, title: "Example Event" };
    const { fn, sent } = action();
    await render(
      <PoliticianDetails
        {...none}
        asks={[event]}
        politician={{ ...MP, statuses: {} }}
        setStatus={fn}
        unblock={vi.fn()}
      />,
    );
    const row = page.getByRole("group", { name: "Example Event" });
    expect(row.element().querySelector("[class*=answer]")!.textContent).toBe(
      `${staffCopy.statuses.noAnswer}${staffCopy.politician.edit}`,
    );
    await row.getByText(staffCopy.politician.edit, { exact: true }).click();
    const select = row.getByRole("combobox", { name: staffCopy.politician.status });
    await expect.element(select).toHaveValue("");
    await select.selectOptions("going");
    await row.getByLabelText(staffCopy.politician.note).fill("Their office said");
    await row.getByRole("button", { name: staffCopy.politician.save }).click();
    await vi.waitFor(() => expect(sent).toHaveLength(1));
    expect(sent[0]).toEqual({
      politicianId: "7",
      ask: "frontier-ai-letter",
      status: "going",
      note: "Their office said",
    });
    // Going: ticked in green, the list starting from their answer.
    await render(
      <PoliticianDetails
        {...none}
        asks={[event]}
        politician={{
          ...MP,
          statuses: { "frontier-ai-letter": { ...MP.statuses["frontier-ai-letter"], status: "going" } },
        }}
        setStatus={fn}
        unblock={vi.fn()}
      />,
    );
    const going = page.getByRole("group", { name: "Example Event" }).last();
    expect(going.element().querySelector("[class*=answer]")!.className).toMatch(/yes/);
    expect(going.element().querySelector("select")!.value).toBe("going");
  });

  it("says in one place that letters aren't being sent, why, what to check, and unblocks it with a note", async () => {
    const { fn, sent } = action();
    const { rerender } = await render(
      <PoliticianDetails
        politician={{ ...MP, emailBlocked: true }}
        block={{ ...exampleBlock, address: MP.email! }}
        unblock={fn}
        {...none}
      />,
    );
    const copy = staffCopy.politician.blocked;
    expect(page.getByRole("heading", { level: 1 }).element().textContent).toBe(
      `${MP.name}${staffCopy.politician.importantTarget}`,
    );
    const notice = page.getByRole("region", { name: copy.title });
    // A red strip: the warning icon at the left, the rest beside it.
    const strip = notice.element().firstElementChild!;
    expect(strip.firstElementChild!.tagName.toLowerCase()).toBe("svg");
    expect(strip.className).toMatch(/red/);
    // Its two choices side by side: the address wrong, or right.
    expect([...notice.element().querySelectorAll("h3")].map((h) => h.textContent)).toEqual([
      copy.wrong.title,
      copy.right.title,
    ]);
    expect(notice.element().querySelector("p")!.textContent).toBe(
      `${copy.why.before}${MP.email}${copy.why.after(exampleBlock.reason, "12 Oct 2026, 09:10")}`,
    );
    expect(notice.element().querySelector("p strong")!.textContent).toBe(MP.email);
    // The example's reason ends in a full stop, so the sentence doesn't add a second.
    expect(notice.element().querySelector("p")!.textContent).not.toContain("..");
    await expect.element(notice.getByRole("heading", { name: copy.wrong.title })).toBeVisible();
    await expect
      .element(notice.getByRole("link", { name: copy.wrong.link }))
      .toHaveAttribute("href", "/staff/import-data/politicians");
    // The address is in bold in the strip, and in the facts a link to write to it.
    expect(
      page
        .getByText(MP.email!, { exact: true })
        .all()
        .map((el) => el.element().tagName),
    ).toEqual(["STRONG", "A"]);
    await page.getByLabelText(staffCopy.emails.note).fill("Fixed in Airtable");
    await page.getByRole("button", { name: staffCopy.emails.unblock }).click();
    await vi.waitFor(() => expect(sent).toEqual([{ address: MP.email, note: "Fixed in Airtable" }]));

    // An MP not from Airtable: correcting the address links to the table, as they have no record in it.
    await rerender(
      <PoliticianDetails
        politician={{ ...MP, airtableId: null, emailBlocked: true }}
        block={{ ...exampleBlock, address: MP.email! }}
        unblock={fn}
        {...none}
      />,
    );
    await expect
      .element(notice.getByRole("link", { name: copy.wrong.airtable }))
      .toHaveAttribute("href", "https://airtable.com/app/tbl");

    // A complaint can't be unblocked here: no advice on fixing it, and no form.
    await rerender(
      <PoliticianDetails
        politician={{ ...MP, emailBlocked: true }}
        block={{ ...exampleBlock, address: MP.email!, canReset: false }}
        unblock={fn}
        {...none}
      />,
    );
    expect(notice.element().textContent).not.toContain(copy.wrong.before);
    await expect.element(notice.getByText(staffCopy.emails.cantReset)).toBeVisible();
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
          { ...exampleBlock, address: "unknown@example.org", letter: null, purpose: null },
        ]}
        unblock={fn}
        letterLinks
      />,
    );
    const bounced = page.getByRole("row").filter({ hasText: exampleBlock.address });
    await expect.element(bounced.getByText(staffCopy.emails.kinds.hard)).toBeVisible();
    await expect.element(bounced.getByText(exampleBlock.reason)).toBeVisible();
    // Whose it is, linked to their page; and the letter that found it out, by whom it was to, linked to it alone.
    await expect
      .element(bounced.getByRole("link", { name: "Bouncy McTestface MP", exact: true }))
      .toHaveAttribute("href", "/staff/politicians/5");
    await expect
      .element(bounced.getByRole("link", { name: `${staffCopy.emails.letterTo} Bouncy McTestface MP` }))
      .toHaveAttribute("href", "/staff/letters/17");
    await expect.element(bounced.getByRole("cell", { name: "2", exact: true })).toBeVisible();
    // A complaint can't be unblocked; two politicians share its address.
    const complained = page.getByRole("row").filter({ hasText: exampleComplaint.address });
    await expect.element(complained.getByText(staffCopy.emails.cantReset)).toBeVisible();
    await expect.element(complained.getByText("A, B")).toBeVisible();
    // What the email was: a letter, another of ours, or one the site has no record of.
    await expect.element(complained.getByText(staffCopy.emails.purposes["forwarded-reply"])).toBeVisible();
    const unknown = page.getByRole("row").filter({ hasText: "unknown@example.org" });
    await expect.element(unknown.getByText(staffCopy.emails.notRecorded)).toBeVisible();
    // Without a note the browser won't send it; with one, it does.
    const note = bounced.getByLabelText(staffCopy.emails.note);
    expect((note.element() as HTMLInputElement).required).toBe(true);
    await bounced.getByRole("button", { name: staffCopy.emails.unblock }).click();
    await expect.element(note).toHaveFocus();
    expect(sent).toEqual([]);
    await note.fill("Fixed in Airtable");
    await bounced.getByRole("button", { name: staffCopy.emails.unblock }).click();
    await vi.waitFor(() => expect(sent).toEqual([{ address: exampleBlock.address, note: "Fixed in Airtable" }]));
  });

  it("names the letter without linking to it, without letter links", async () => {
    await render(<EmailBlocksTable blocks={[exampleBlock]} unblock={vi.fn()} letterLinks={false} />);
    await expect.element(page.getByText(`${staffCopy.emails.letterTo} Bouncy McTestface MP`)).toBeVisible();
    expect(document.querySelector('a[href^="/staff/letters"]')).toBeNull();
  });

  it("says when there are none", async () => {
    await render(<EmailBlocksTable blocks={[]} unblock={vi.fn()} letterLinks />);
    await expect.element(page.getByText(staffCopy.emails.noBlocks)).toBeVisible();
  });
});

describe("EmailProblemsTable", () => {
  it("lists bounces and complaints, and what each email was", async () => {
    await render(<EmailProblemsTable problems={exampleProblems} letterLinks />);
    const [hard, soft, complaint] = exampleProblems.map((p) => page.getByRole("row").filter({ hasText: p.address }));
    await expect
      .element(hard.getByRole("link", { name: `${staffCopy.emails.letterTo} Bouncy McTestface MP` }))
      .toHaveAttribute("href", "/staff/letters/17");
    await expect.element(soft.getByText(staffCopy.emails.kinds.soft)).toBeVisible();
    await expect.element(soft.getByText(staffCopy.emails.purposes["forwarded-reply"])).toBeVisible();
    await expect.element(complaint.getByText(staffCopy.emails.kinds.complaint)).toBeVisible();
    await expect.element(complaint.getByText(staffCopy.emails.notRecorded)).toBeVisible();
  });

  it("names a letter without linking to it, without letter links", async () => {
    await render(<EmailProblemsTable problems={exampleProblems} letterLinks={false} />);
    await expect.element(page.getByText(`${staffCopy.emails.letterTo} Bouncy McTestface MP`)).toBeVisible();
    expect(document.querySelector('a[href^="/staff/letters"]')).toBeNull();
  });

  it("says when there are none", async () => {
    await render(<EmailProblemsTable problems={[]} letterLinks />);
    await expect.element(page.getByText(staffCopy.emails.noProblems)).toBeVisible();
  });
});

describe("JobActions", () => {
  it("runs the job", async () => {
    const fn = vi.fn();
    await render(<JobActions action={fn} label="Run it" />);
    await page.getByRole("button", { name: "Run it" }).click();
    await vi.waitFor(() => expect(fn).toHaveBeenCalledOnce());
    expect(page.getByRole("link").all()).toHaveLength(0);
  });
});

describe("ImportOverview", () => {
  it("is a card per job, each a link to its page, with how its newest run ended, or that it never ran", async () => {
    const newest: (AnyImportRun | undefined)[] = [
      ran("import-luma", { ...exampleLumaResult, stoppedBy: "time" }, { at: "2026-10-21T11:17:00Z" }),
      ran("import-members", exampleMembersResult, { at: "2026-10-21T11:47:00Z" }),
      exampleHeldSync,
      ran("sync-emails", exampleEmailsResult, { at: "2026-10-21T06:22:00Z" }),
      ran("check-mps", { problems: [] }, { at: "2026-10-21T01:00:00Z", status: "ok" }),
      failed("import-controlai", "No PDF linked", { at: "2026-10-21T02:00:00Z" }),
      ran("import-web-form-letters", exampleWebFormResult, { at: "2026-10-20T09:00:00Z" }),
      undefined,
    ];
    await render(<ImportOverview newest={newest} airtableTable="https://airtable.com/app/tblPoliticians" />);
    await expect.element(page.getByRole("heading", { level: 1, name: staffCopy.import.pageTitle })).toBeVisible();
    // A heading for each schedule, its jobs' cards under it.
    expect(
      page
        .getByRole("heading", { level: 2 })
        .all()
        .map((h) => h.element().textContent),
    ).toEqual([staffCopy.import.hourly, staffCopy.import.nightly, staffCopy.import.oneOff]);
    const cards = [...document.querySelectorAll("section")];
    expect(cards.map((card) => card.querySelector("h3 a")!.getAttribute("href"))).toEqual([
      "/staff/import-data/luma",
      "/staff/import-data/members",
      "/staff/import-data/politicians",
      "/staff/import-data/emails",
      "/staff/import-data/mp-check",
      "/staff/import-data/controlai",
      "/staff/import-data/web-form-letters",
      "/staff/import-data/go-to-parliament",
    ]);
    expect(cards.map((card) => card.querySelector("h3 a")!.textContent)).toEqual([
      jobTitles["import-luma"],
      jobTitles["import-members"],
      jobTitles["sync-politicians"],
      jobTitles["sync-emails"],
      jobTitles["check-mps"],
      jobTitles["import-controlai"],
      jobTitles["import-web-form-letters"],
      jobTitles["import-go-to-parliament"],
    ]);
    // Under the name, how the newest run ended, tinted to match.
    const status = (i: number) => cards[i].querySelector("h3 + div > div")!;
    expect(status(0).textContent).toBe(`${staffCopy.runs.status.incomplete}21 Oct 2026, 11:17`);
    // The Emails sync held some back, so it's amber too.
    expect([0, 1, 2, 3, 4, 5, 6].map((i) => status(i).className.match(/green|amber|red/)?.[0])).toEqual([
      "amber",
      "green",
      "amber",
      "amber",
      "green",
      "red",
      "green",
    ]);
    expect(status(7).textContent).toBe(staffCopy.goToParliament.never);
    expect(status(7).className).not.toMatch(/green|amber|red/);
    // The Airtable jobs link the table they read; the politicians' sync also says the test MPs stay.
    const link = (i: number) => cards[i].querySelector(":scope > p a")!.getAttribute("href");
    expect(link(2)).toBe("https://airtable.com/app/tblPoliticians");
    expect(cards[2].querySelector(":scope > p")!.textContent).toContain(staffCopy.syncs.testMps);
    expect([3, 6, 7].map(link)).toEqual([
      "https://airtable.com/app/tblp4nH5Jymq48rcm",
      "https://airtable.com/app/tblkzjrRHiZiqMDGR",
      "https://airtable.com/app/tblminXS1xSuBbEjz",
    ]);
    expect(cards[4].querySelector(":scope > p")!.textContent).not.toContain(staffCopy.syncs.testMps);
    // The members come from the join form.
    expect(cards[1].querySelector(":scope > p a")!.getAttribute("href")).toBe("https://pauseai.info/join");
  });

  it("shows an applied run, and one that changed nothing, in green, and one discarded plainly", async () => {
    const discarded = ran(
      "sync-politicians",
      { changes: { added: [], removed: [], changed: [] } },
      { status: "discarded" },
    );
    const unchanged = ran("import-luma", exampleLumaResult, { status: "unchanged" });
    const { rerender } = await render(
      <ImportOverview newest={[unchanged, undefined, exampleAppliedSync, undefined, undefined]} airtableTable="x" />,
    );
    const status = (i: number) => document.querySelectorAll("section")[i].querySelector("h3 + div > div")!.className;
    expect(status(0)).toMatch(/green/);
    expect(status(2)).toMatch(/green/);
    await rerender(
      <ImportOverview newest={[undefined, undefined, discarded, undefined, undefined]} airtableTable="x" />,
    );
    expect(status(2)).not.toMatch(/green|amber|red/);
  });
});

describe("ImportJobPage", () => {
  it("leads back to the overview, names the job with its lozenges, runs it, and lists every run by day", async () => {
    const run = vi.fn();
    const { fn, sent } = action();
    const runs: AnyImportRun[] = [
      exampleHeldSync,
      exampleAppliedSync,
      ran(
        "sync-politicians",
        { changes: { added: [], removed: [], changed: [] } },
        { id: 1, at: "2026-10-11T01:00:00Z", status: "unchanged" },
      ),
    ];
    const { rerender } = await render(
      <ImportJobPage
        job="sync-politicians"
        runs={runs}
        run={run}
        decide={fn}
        airtableTable="https://airtable.com/table"
      />,
    );
    await expect
      .element(page.getByRole("navigation", { name: staffCopy.import.pageTitle }).getByRole("link"))
      .toHaveAttribute("href", "/staff/import-data");
    expect(page.getByRole("heading", { level: 1 }).element().textContent).toBe(
      `${jobTitles["sync-politicians"]}${staffCopy.import.airtable}${staffCopy.import.nightly}`,
    );
    // The lozenges are plain: only a run's ending is in colour.
    const lozenges = [...page.getByRole("heading", { level: 1 }).element().querySelectorAll("span")];
    expect(lozenges.map((tag) => tag.className.match(/green|amber|red|blue/))).toEqual([null, null]);
    // No strip under the title: the newest run, in the history, carries the colour.
    expect(page.getByRole("heading", { level: 1 }).element().nextElementSibling!.tagName).toBe("P");
    expect(page.getByRole("heading", { level: 1 }).element().nextElementSibling!.className).toBe("");
    await page.getByRole("button", { name: staffCopy.syncs.syncNow }).click();
    await vi.waitFor(() => expect(run).toHaveBeenCalledOnce());
    expect(
      page
        .getByRole("heading", { level: 2 })
        .all()
        .map((h) => h.element().textContent),
    ).toEqual(["12 Oct 2026", "11 Oct 2026"]);
    await page.getByRole("button", { name: staffCopy.syncs.apply }).click();
    await vi.waitFor(() => expect(sent).toEqual([{ id: "3", decision: "apply" }]));

    await rerender(<ImportJobPage job="check-mps" runs={[]} run={run} decide={fn} airtableTable="x" />);
    await expect.element(page.getByText(staffCopy.check.never)).toBeVisible();
    await expect
      .element(page.getByRole("link", { name: staffCopy.check.intro.link }))
      .toHaveAttribute("target", "_blank");
  });
});

describe("PoliticianTable headings", () => {
  it("sort the list, the current one marked, reversing on a second click", async () => {
    await render(
      <PoliticianTable politicians={[MP]} asks={exampleAsks} search={{ q: "x", sort: "party", dir: "asc" }} />,
    );
    const party = page.getByRole("link", { name: staffCopy.fields.party });
    await expect.element(party).toHaveAttribute("href", "/staff/politicians?q=x&sort=party&dir=desc");
    expect(party.element().closest("th")!.getAttribute("aria-sort")).toBe("ascending");
    await expect
      .element(page.getByRole("link", { name: staffCopy.fields.name }))
      .toHaveAttribute("href", "/staff/politicians?q=x&sort=name&dir=asc");
  });
});

describe("AsksTable", () => {
  it("lists each ask: its kind, title linked to the letter or event, date, who asks it, and each answer's count, linked to who gave it", async () => {
    await render(<AsksTable asks={exampleAsksWithCounts} />);
    const row = (title: string) => page.getByRole("row").filter({ hasText: title });
    const cells = (title: string) =>
      row(title)
        .getByRole("cell")
        .all()
        .map((c) => c.element().textContent);
    const copy = staffCopy.asks;
    expect(cells(exampleAsks[0].title)).toEqual([
      copy.kinds.event,
      exampleAsks[0].title,
      "1 Nov 2026",
      copy.askedBy.pauseai,
      // The answers in the order the kind lists them.
      [
        copy.count(staffCopy.statuses.going, 3),
        copy.count(staffCopy.statuses.declined, 50),
        copy.count(staffCopy.statuses.passed_on, 1),
      ].join(" · "),
    ]);
    // Asked by nobody we record, with no link.
    expect(cells(exampleAsks[1].title)[3]).toBe("");
    expect(row(exampleAsks[1].title).getByRole("link", { name: exampleAsks[1].title }).query()).toBeNull();
    // No date; asked by both.
    expect(cells(exampleAsks[3].title)).toEqual([
      copy.kinds.letter,
      exampleAsks[3].title,
      "",
      `${copy.askedBy.supporters}${copy.askedBy.pauseai}`,
      copy.count(staffCopy.statuses.signed, 10),
    ]);
    expect(cells(exampleAsks[2].title).at(-1)).toBe(copy.noAnswers);
    // Another site's page opens in a new tab; ours in this one.
    const event = row(exampleAsks[0].title).getByRole("link", { name: exampleAsks[0].title });
    await expect.element(event).toHaveAttribute("href", "https://luma.com/example");
    await expect.element(event).toHaveAttribute("target", "_blank");
    const ours = row(exampleAsks[3].title).getByRole("link", { name: exampleAsks[3].title });
    await expect.element(ours).toHaveAttribute("href", "/pdfs/Frontier-AI-Open-Letter.pdf");
    await expect.element(ours).not.toHaveAttribute("target");
    await expect
      .element(page.getByRole("link", { name: copy.count(staffCopy.statuses.passed_on, 1) }))
      .toHaveAttribute("href", "/staff/politicians?ask=edinburgh-conference-2026&answer=passed_on");
  });
});

describe("PoliticianTable", () => {
  it("lists each politician with whether they're in office and their answer to each ask, and no buttons", async () => {
    const testMp = {
      ...MP,
      id: 8,
      name: "Testy McTestface MP",
      isTest: true,
      status: "retired" as const,
      emailBlocked: true,
      house: "lords" as const,
      constituency: null,
      party: "Crossbench",
      importantTarget: false,
    };
    await render(
      <PoliticianTable
        asks={exampleAsks}
        politicians={[
          MP,
          {
            ...testMp,
            statuses: {
              "controlai-letter": { ...MP.statuses["frontier-ai-letter"], updatedBy: "controlai" },
              "frontier-ai-letter": { ...MP.statuses["frontier-ai-letter"], updatedBy: "airtable" },
            },
          },
          {
            ...testMp,
            id: 9,
            name: "Nora Nothing",
            statuses: {},
            personalConnection: true,
            airtableRemovedAt: "2026-10-20T02:00:00Z",
          },
        ]}
      />,
    );
    await expect
      .element(page.getByRole("link", { name: "Polly Placeholder" }))
      .toHaveAttribute("href", "/staff/politicians/7");
    await expect.element(page.getByText(staffCopy.politicians.flags.test).first()).toBeVisible();
    await expect.element(page.getByText(staffCopy.politicians.emailBlocked).first()).toBeVisible();
    await expect.element(page.getByRole("cell", { name: staffCopy.houses.lords }).first()).toBeVisible();
    const cells = (name: string) =>
      page
        .getByRole("row")
        .filter({ hasText: name })
        .getByRole("cell")
        .all()
        .map((c) => c.element().textContent);
    // Whether they're in office, the counts of letters and replies, each heading a sort, and their answer to each
    // ask they've answered, a line each, in the asks' order, the answer in bold first.
    const flags = staffCopy.politicians.flags;
    expect(cells("Polly Placeholder").slice(4, 6)).toEqual([staffCopy.personStatuses.in_office, flags.important]);
    expect(cells("Polly Placeholder").slice(7, 9)).toEqual(["4", "1"]);
    // Airtable's markers as lozenges, and a test politician's.
    expect(cells("Nora Nothing")[5]).toBe(`${flags.connection}${flags.removed}${flags.test}`);
    expect(cells("Testy McTestface MP")[5]).toBe(flags.test);
    const answers = (name: string) =>
      page
        .getByRole("row")
        .filter({ hasText: name })
        .getByRole("listitem")
        .all()
        .map((li) => li.element().textContent);
    expect(answers("Polly Placeholder")).toEqual([
      `${staffCopy.statuses.declined} ${ask("edinburgh-conference-2026").title}`,
      `${staffCopy.statuses.signed} ${ask("frontier-ai-letter").title}`,
    ]);
    expect(
      page.getByRole("row").filter({ hasText: "Polly Placeholder" }).getByText(staffCopy.statuses.declined).element()
        .tagName,
    ).toBe("STRONG");
    expect(answers("Testy McTestface MP")).toEqual([
      `${staffCopy.statuses.signed} ${ask("controlai-letter").title}`,
      `${staffCopy.statuses.signed} ${ask("frontier-ai-letter").title}`,
    ]);
    expect(cells("Testy McTestface MP")[4]).toBe(staffCopy.personStatuses.retired);
    expect(cells("Nora Nothing")[6]).toBe(staffCopy.politicians.noAsks);
    expect(
      getComputedStyle(page.getByRole("cell", { name: staffCopy.personStatuses.retired }).first().element()).whiteSpace,
    ).toBe("nowrap");
    await expect
      .element(page.getByRole("link", { name: staffCopy.politicians.columns.replies }))
      .toHaveAttribute("href", "/staff/politicians?sort=replies&dir=desc");
    expect(page.getByRole("button").all()).toHaveLength(0);
  });

  it("says when nobody matches", async () => {
    await render(<PoliticianTable politicians={[]} asks={exampleAsks} />);
    await expect.element(page.getByText(staffCopy.politicians.none)).toBeVisible();
  });

  it("leaves out only a column the filters fix, however alike the rows are", async () => {
    const plain = { ...MP, importantTarget: false };
    const headings = () => [...document.querySelectorAll("th")].map((th) => th.textContent!.replace(/( [▲▼])+$/, ""));
    const { columns } = staffCopy.politicians;
    const after = [
      staffCopy.politicians.flag,
      columns.asks,
      columns.letters,
      columns.replies,
      columns.first,
      columns.last,
    ];
    // Rows that agree on everything still show every column, with no filter fixing one.
    const rows = [plain, { ...plain, id: 8, name: "Other" }];
    const { rerender } = await render(<PoliticianTable politicians={rows} asks={[]} search={{ status: "any" }} />);
    const { fields } = staffCopy;
    expect(headings()).toEqual([
      fields.name,
      fields.house,
      fields.constituency,
      fields.party,
      columns.status,
      ...after,
    ]);
    // A house, one party found, and one status (those in office, with none chosen) are fixed.
    await rerender(
      <PoliticianTable
        politicians={rows}
        asks={[]}
        search={{ house: "commons", party: "Labour (Co-op)", status: "" }}
      />,
    );
    expect(headings()).toEqual([fields.name, fields.constituency, ...after]);
    // Peers have no constituency. A party left out, or two found, fix nothing.
    await rerender(<PoliticianTable politicians={rows} asks={[]} search={{ house: "lords", party: "!Reform UK" }} />);
    expect(headings()).toEqual([fields.name, fields.party, columns.status, ...after]);
    await rerender(<PoliticianTable politicians={rows} asks={[]} search={{ party: ["Labour", "Green"] }} />);
    expect(headings()).toEqual([
      fields.name,
      fields.house,
      fields.constituency,
      fields.party,
      columns.status,
      ...after,
    ]);
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
      <ResultBox summary="Long" lines={OPEN_UP_TO + 1}>
        <p>Detail</p>
      </ResultBox>,
    );
    expect((page.getByRole("group").element() as HTMLDetailsElement).open).toBe(false);
    await expect.element(page.getByText("Detail")).not.toBeVisible();
  });

  it("is plain: the ordinary border and no tint", async () => {
    await render(<ResultBox summary="Plain" />);
    const box = page.getByRole("status").element().closest("section")!;
    expect(getComputedStyle(box).borderLeftWidth).toBe("1px");
    expect(getComputedStyle(box).backgroundColor).toBe("rgba(0, 0, 0, 0)");
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
      .element(page.getByText(`${staffCopy.syncs.added} 2, ${staffCopy.syncs.removed} 1`, { exact: false }))
      .toBeVisible();
    await expect.element(page.getByText("Seat 1: MP 1", { exact: true })).toBeVisible();
    await expect.element(page.getByText(`Seat 2: MP 2 (${staffCopy.politicians.noEmail})`)).toBeVisible();
    await expect.element(page.getByText(`${staffCopy.syncs.changed} (1)`).first()).toBeVisible();
    // A peer by their house, a renamed record from and to, and the statuses it set.
    await expect.element(page.getByText(`${staffCopy.houses.lords}: Lord Example`)).toBeVisible();
    await expect.element(page.getByText("MP 6 → Someone New")).toBeVisible();
    await expect
      .element(page.getByText(staffCopy.syncs.statuses({ added: 3, changed: 1, removed: 0 }), { exact: false }))
      .toBeVisible();
    await expect.element(page.getByText(staffCopy.runs.decidedBy("jo@pauseai.uk"), { exact: false })).toBeVisible();
    expect(page.getByRole("button", { name: staffCopy.syncs.apply }).all()).toHaveLength(1);

    await page.getByRole("button", { name: staffCopy.syncs.discard }).click();
    await vi.waitFor(() => expect(sent).toHaveLength(1));
    expect(sent[0]).toEqual({ id: "3", decision: "discard" });
  });

  it("starts a sync with many changes folded to its status line, with the buttons still there", async () => {
    const big: PoliticianSync = ran(
      "sync-politicians",
      { changes: { added: [1, 2, 3, 4, 5, 6].map((n) => mp(n)), removed: [], changed: [] } },
      { id: 9, status: "held" },
    );
    // The newest run starts unfolded, however long; the same run further down starts folded.
    await render(<RunList runs={[applied, big]} none="None" decide={() => {}} />);
    const folds = page.getByRole("group").all();
    expect(folds.map((fold) => (fold.element() as HTMLDetailsElement).open)).toEqual([true, false]);
    await expect.element(page.getByText("Seat 1: MP 1", { exact: true })).not.toBeVisible();
    await expect.element(page.getByRole("button", { name: staffCopy.syncs.apply })).toBeVisible();
    await page.getByText(`${staffCopy.syncs.added} 6`, { exact: false }).click();
    await expect.element(page.getByText("Seat 1: MP 1", { exact: true })).toBeVisible();
  });

  it("shows a failed or unchanged sync as one line, and a held one without buttons where nothing can be decided", async () => {
    const unchanged: PoliticianSync = ran(
      "sync-politicians",
      { changes: { added: [], removed: [], changed: [] } },
      { id: 5, status: "unchanged" },
    );
    await render(
      <RunList
        runs={[failed("sync-politicians", "Airtable request failed with status 422", { id: 6 }), unchanged, held]}
        none="None"
      />,
    );
    await expect.element(page.getByText(/status 422/)).toBeVisible();
    await expect.element(page.getByText(staffCopy.runs.status.unchanged)).toBeVisible();
    await expect.element(page.getByText(staffCopy.runs.status.held)).toBeVisible();
    await expect.element(page.getByRole("textbox")).not.toBeInTheDocument();
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
    // Six problems is more than a few lines, but it's the newest run, so it starts unfolded.
    expect((page.getByRole("group").element() as HTMLDetailsElement).open).toBe(true);
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
      `${staffCopy.runs.status.failed} ${AT} · ${staffCopy.import.nightly} · ${staffCopy.runs.error("No PDF linked")}`,
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

  it("says what each one-off import did, who ran it, or why it failed", async () => {
    const runs: AnyImportRun[] = [
      ran("import-web-form-letters", exampleWebFormResult, { id: 3, startedBy: "jo@pauseai.uk" }),
      ran("import-go-to-parliament", exampleGoToParliamentResult, { id: 2, startedBy: "jo@pauseai.uk" }),
      failed("import-go-to-parliament", "AIRTABLE_TOKEN isn't set", { id: 1, startedBy: null }),
    ];
    await render(<RunList runs={runs} none="None" />);
    for (const words of [
      staffCopy.webForm.result(exampleWebFormResult),
      staffCopy.goToParliament.result(exampleGoToParliamentResult),
      staffCopy.runs.error("AIRTABLE_TOKEN isn't set"),
    ]) {
      await expect.element(page.getByText(words, { exact: false })).toBeVisible();
    }
    expect(page.getByText(staffCopy.runs.by("jo@pauseai.uk"), { exact: false }).all()).toHaveLength(2);
  });

  it("lists the emails an Emails sync held back, with the boxes ticked, or says why it failed", async () => {
    const { rerender } = await render(
      <RunList
        runs={[
          ran("sync-emails", exampleEmailsResult, { id: 2 }),
          failed("sync-emails", "Airtable answered 503", { id: 1 }),
        ]}
        none="None"
      />,
    );
    await expect.element(page.getByText(staffCopy.runs.status.incomplete)).toBeVisible();
    await expect
      .element(page.getByText(staffCopy.pauseaiEmails.result(exampleEmailsResult), { exact: false }))
      .toBeVisible();
    await expect.element(page.getByText(`recEmail1: ${staffCopy.pauseaiEmails.noBoxes}`)).toBeVisible();
    await expect.element(page.getByText("recEmail2: CSRB Iqbal Amendment, Ben Lake October 2026 Debate")).toBeVisible();
    await expect.element(page.getByText(/Airtable answered 503/)).toBeVisible();
    // With every email placed, nothing to list, and nothing amber.
    await rerender(
      <RunList runs={[ran("sync-emails", { ...exampleEmailsResult, unplaced: [] }, { id: 3 })]} none="None" />,
    );
    await expect.element(page.getByText(/recEmail/)).not.toBeInTheDocument();
    await expect.element(page.getByText(staffCopy.runs.status.ok)).toBeVisible();
  });

  it("shows a members import's counts, or its error", async () => {
    await render(
      <RunList
        runs={[
          ran("import-members", exampleMembersResult, { id: 1 }),
          failed("import-members", "Airtable answered 503", { id: 2 }),
        ]}
        none="None"
      />,
    );
    const [first, second] = page.getByRole("status").all();
    await expect
      .element(first)
      .toHaveTextContent(
        `${staffCopy.runs.status.ok} ${AT} · ${staffCopy.import.hourly} · ${staffCopy.members.result(exampleMembersResult)}`,
      );
    await expect
      .element(second)
      .toHaveTextContent(
        `${staffCopy.runs.status.failed} ${AT} · ${staffCopy.import.hourly} · ${staffCopy.runs.error("Airtable answered 503")}`,
      );
  });

  it("says how many pages of contacts a Luma run read", async () => {
    await render(
      <RunList runs={[ran("import-luma", { ...exampleLumaResult, contactPages: 10 }, { id: 1 })]} none="None" />,
    );
    const [run] = page.getByRole("status").all();
    expect(run.element().textContent).toContain(
      `${staffCopy.luma.result(exampleLumaResult)} ${staffCopy.luma.contactPages(10)}`,
    );
    expect(run.element().textContent).toMatch(new RegExp(`^${staffCopy.runs.status.ok} `));
  });

  it("says how many postcodes and towns a Luma run looked up, and when postcodes.io failed", async () => {
    const places = { postcodes: 3, towns: 2, failed: false };
    await render(
      <RunList
        runs={[
          ran("import-luma", { ...exampleLumaResult, places }, { id: 1 }),
          ran("import-luma", { ...exampleLumaResult, places: { ...places, failed: true } }, { id: 2 }),
        ]}
        none="None"
      />,
    );
    const [found, failed] = page.getByRole("status").all();
    expect(found.element().textContent).toContain(
      `${staffCopy.luma.result(exampleLumaResult)} ${staffCopy.luma.places(places)}`,
    );
    expect(found.element().textContent).not.toContain(staffCopy.luma.placesFailed);
    expect(failed.element().textContent).toContain(`${staffCopy.luma.places(places)} ${staffCopy.luma.placesFailed}`);
    expect(failed.element().textContent).toMatch(new RegExp(`^${staffCopy.runs.status.incomplete} `));
  });

  it("shows a Luma import's counts, or its error", async () => {
    const luma = exampleLumaResult;
    await render(
      <RunList
        runs={[ran("import-luma", luma, { id: 1 }), failed("import-luma", "Luma answered 500", { id: 2 })]}
        none="None"
      />,
    );
    const [first, second] = page.getByRole("status").all();
    await expect
      .element(first)
      .toHaveTextContent(
        `${staffCopy.runs.status.ok} ${AT} · ${staffCopy.import.hourly} · ${staffCopy.luma.result(luma)}`,
      );
    expect(first.element().textContent).not.toContain(staffCopy.luma.stoppedBy.time);
    expect(first.element().textContent).not.toContain(staffCopy.runs.status.incomplete);
    await expect
      .element(second)
      .toHaveTextContent(
        `${staffCopy.runs.status.failed} ${AT} · ${staffCopy.import.hourly} · ${staffCopy.runs.error("Luma answered 500")}`,
      );
    // Only the newest run is tinted, by how it ended; an older failure is plain.
    expect(first.element().closest("section")!.parentElement!.className).toMatch(/green/);
    expect(second.element().closest("section")!.parentElement!.className).toBe("");
    expect(getComputedStyle(second.element().closest("section")!).backgroundColor).toBe("rgba(0, 0, 0, 0)");
  });

  it("says why a Luma import stopped early, as incomplete in place of done, tinted amber as the newest run", async () => {
    await render(
      <RunList runs={[ran("import-luma", { ...exampleLumaResult, stoppedBy: "rate-limit" })]} none="None" />,
    );
    const [only] = page.getByRole("status").all();
    await expect
      .element(only)
      .toHaveTextContent(
        `${staffCopy.runs.status.incomplete} ${AT} · ${staffCopy.import.hourly} · ${staffCopy.luma.result(exampleLumaResult)} ${staffCopy.luma.stoppedBy["rate-limit"]}`,
      );
    expect(only.element().closest("section")!.parentElement!.className).toMatch(/amber/);
    expect(getComputedStyle(only.element().closest("section")!).borderLeftWidth).toBe("1px");
  });

  it("heads each day's runs with its date, and says when there are none", async () => {
    const runs: AnyImportRun[] = [
      ran("check-mps", { problems: [] }, { id: 7, at: "2026-11-03T01:00:00Z" }),
      ran("check-mps", { problems: [] }, { id: 10, at: "2026-11-03T00:17:00Z" }),
      ran("check-mps", { problems: [] }, { id: 8, at: "2026-11-02T02:00:00Z" }),
    ];
    const { rerender } = await render(<RunList runs={runs} none="None" />);
    expect(
      page
        .getByRole("heading", { level: 2 })
        .all()
        .map((h) => h.element().textContent),
    ).toEqual(["3 Nov 2026", "2 Nov 2026"]);
    // The page is one job's, so no run is labelled with it.
    await expect.element(page.getByText(`${jobTitles["check-mps"]} ·`, { exact: false })).not.toBeInTheDocument();
    await rerender(<RunList runs={[]} none="Nothing here" />);
    await expect.element(page.getByText("Nothing here")).toBeVisible();
  });
});

describe("ChangesTable", () => {
  const log = (changes: typeof exampleChanges) => ({ changes, total: changes.length, pages: 1, pageSize: 100 });

  it("lists who changed what, the day in a column of its own, and every field each logged, in words, linked where there's a page", async () => {
    await render(<ChangesTable log={log(exampleChanges)} page={1} airtableTable="https://airtable.com/app/tbl" />);
    const copy = staffCopy.changes;
    const fields = staffCopy.fields;
    const labels = copy.labels;
    await expect.element(page.getByText(copy.total(exampleChanges.length))).toBeVisible();
    expect(await downloads()).toEqual([
      "/staff/audit-log/download?format=csv",
      "/staff/audit-log/download?format=json",
    ]);
    const rows = page
      .getByRole("row")
      .all()
      .filter((row) => row.element().querySelector("td"));
    expect(rows[0].element().children[0].textContent).toBe("12 Oct 2026");
    expect(rows.at(-1)!.element().children[0].textContent).toBe("11 Oct 2026");
    expect(rows[0].element().children[1].textContent).toBe("09:59");
    expect(rows[0].element().children[2].textContent).toBe("jo@pauseai.uk");
    const details = rows.map((row) => row.element().children[4].textContent);
    const signed = staffCopy.politician.statusSet(staffCopy.statuses.signed);
    const cleared = staffCopy.politician.statusCleared;
    const odd = staffCopy.politician.statusSet("odd");
    const count = (n: number, key: string) => `${n} ${copy.counts[key]}`;
    expect(details).toEqual([
      `Polly Placeholder · ${signed.before}${pm.title}${signed.after}, 1 Oct 2026 · ${labels.note} By email`,
      `${copy.gone("99")} · ${cleared.before}controlai-letter${cleared.after}`,
      `Polly Placeholder · ${labels.airtableId} recPolly · ${fields.party} Labour → Independent · ${fields.email} ${copy.empty} → polly@example.org`,
      `Polly Placeholder · ${labels.airtableId} recPolly · ${fields.house} ${staffCopy.houses.commons} · ${fields.salutation} Ms Placeholder · ${fields.constituency} Ipswich · ${fields.party} Labour`,
      "Old MP",
      `polly@example.org · ${labels.kind} ${staffCopy.emails.kinds.hard}`,
      `polly@example.org · ${labels.note} Fixed in Airtable`,
      "Jane Example",
      copy.gone("4"),
      `${copy.gone("5")} · ${labels.reference} ICO-12 · ${count(1, "lumaUsers")} · ${count(2, "formEntries")} · ${count(2, "letters")} · ${count(0, "members")}`,
      `sam@pauseai.uk · ${labels.to} ${copy.noPermissions}`,
      `sam@pauseai.uk · ${copy.noPermissions} → ${staffCopy.accounts.names.supporters}, ${staffCopy.accounts.names.admin}`,
      `sam@pauseai.uk · ${labels.permissions} ${staffCopy.accounts.names.supporters}, retired`,
      `${count(3, "added")} · ${count(40, "removed")} · ${count(2, "changed")}`,
      copy.run("12"),
      `${labels.reason} a test · Ids [1,2] · ${fields.house} atlantis · ${labels.status} ${staffCopy.statuses.signed}`,
      `odd@example.org · ${labels.kind} weird`,
      `Polly Placeholder · ${odd.before}${pm.title}${odd.after}`,
      `2 widgets · ${labels.status} maybe · ${labels.campaign} ${pm.title}`,
      `Old MP · ${fields.house} ${staffCopy.houses.commons} → ${staffCopy.houses.lords} · ${fields.party} Labour → ${copy.empty}`,
      copy.run("13"),
      copy.run("14"),
      copy.run("15"),
    ]);
    const href = (i: number) => rows[i].element().children[4].querySelector("a")?.getAttribute("href");
    expect([0, 1, 4, 7, 8, 14].map(href)).toEqual([
      "/staff/politicians/7",
      undefined,
      undefined,
      "/staff/supporters/3",
      "/staff/supporters/4",
      importPath("sync-politicians"),
    ]);
    // The Airtable ID leads to the record, in a new tab.
    const record = rows[2].getByRole("link", { name: "recPolly" });
    await expect.element(record).toHaveAttribute("href", "https://airtable.com/app/tbl/recPolly");
    await expect.element(record).toHaveAttribute("target", "_blank");
  });

  it("opens each entry's details as logged from a button at the right", async () => {
    await render(
      <ChangesTable log={log(exampleChanges.slice(4, 5))} page={1} airtableTable="https://airtable.com/app/tbl" />,
    );
    const json = page.getByText('"name": "Old MP"', { exact: false });
    await expect.element(json).not.toBeVisible();
    await page.getByRole("button", { name: staffCopy.changes.json }).click();
    await expect.element(json).toBeVisible();
    expect(json.element().textContent).toBe(JSON.stringify(exampleChanges[4].details, null, 2));
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
            imported: true,
            contactConsent: false,
            repliedAt: "2026-10-13T09:00:00Z",
            events: [{ at: letter.createdAt, status: "strange", details: {} }],
          },
        ]}
      />,
    );
    await expect.element(page.getByText("jane@example.com").first()).toBeInTheDocument();
    // One sent through pauseai.info's old form says so, by its campaign.
    expect(
      page
        .getByText(staffCopy.letters.imported)
        .all()
        .map((tag) => tag.element().closest("td")!.textContent),
    ).toEqual([`gone ${staffCopy.letters.imported}`]);
    // The campaign leads to its page on the site, the MP to their page, the sender to their supporter.
    await expect
      .element(page.getByRole("link", { name: pm.title }).first())
      .toHaveAttribute("href", `/campaigns/${pm.slug}`);
    await expect
      .element(page.getByRole("link", { name: letter.mpName }).first())
      .toHaveAttribute("href", "/staff/politicians/3");
    await expect
      .element(page.getByRole("link", { name: letter.senderName }).first())
      .toHaveAttribute("href", "/staff/supporters/7");
    await expect.element(page.getByRole("cell", { name: /^gone/ })).toBeInTheDocument();
    await expect.element(page.getByText("odd")).toBeInTheDocument();
    await expect
      .element(page.getByRole("cell", { name: staffCopy.letters.consent.yes, exact: true }))
      .toBeInTheDocument();
    await expect
      .element(page.getByRole("cell", { name: staffCopy.letters.consent.no, exact: true }))
      .toBeInTheDocument();
    await expect.element(page.getByText(/strange/)).toBeInTheDocument();
    await expect.element(page.getByText('{"type":"HardBounce"}', { exact: false })).toBeInTheDocument();
    expect(page.getByText(staffCopy.politicians.flags.test).all()).toHaveLength(1);
    await expect.element(page.getByRole("cell", { name: "13 Oct 2026, 09:00", exact: true })).toBeInTheDocument();
  });

  it("says when there are none", async () => {
    await render(<LettersTable letters={[]} />);
    await expect.element(page.getByText(staffCopy.letters.none)).toBeVisible();
  });
});

describe("SubscriptionBadges", () => {
  const copy = staffCopy.supporters.subscriptions;

  it("shows each topic we'd email them about, amber when we can't be sure, and nothing for a no", async () => {
    const { rerender } = await render(<SubscriptionBadges permissions={exampleSupporterRows[0].permissions} />);
    expect(document.body.textContent!.trim()).toBe(copy.topics.email["site-forms"]);
    await rerender(<SubscriptionBadges permissions={exampleSupporterRows[1].permissions} />);
    await expect.element(page.getByText(copy.topics.email["luma-calendar"], { exact: true })).toBeVisible();
    await expect.element(page.getByText(copy.unsure(copy.topics.email["pauseai-updates"]))).toBeVisible();
    await rerender(<SubscriptionBadges permissions={[]} />);
    expect(document.body.textContent!.trim()).toBe("");
  });

  it("takes the best answer across their addresses, leaving out a blocked one, and says blocked when every one is", async () => {
    const [jane] = exampleSupporterRows[0].permissions;
    const { rerender } = await render(
      <SubscriptionBadges
        permissions={[
          jane,
          { ...jane, address: "jane.e@example.org", send: "yes", reason: "following" },
          ...exampleBlockedPermissions,
        ]}
      />,
    );
    expect(document.body.textContent!.trim()).toBe(copy.topics.email["luma-calendar"]);
    await rerender(<SubscriptionBadges permissions={exampleBlockedPermissions} />);
    expect(document.body.textContent!.trim()).toBe(copy.blocked);
  });
});

describe("SupporterBadges", () => {
  it("shows what the supporter is to us, and nothing for someone who is nothing yet", async () => {
    const { rerender } = await render(<SupporterBadges supporter={exampleSupporter} />);
    await expect.element(page.getByText(staffCopy.supporters.badges.lumaContact)).toBeVisible();
    await expect.element(page.getByText(staffCopy.supporters.badges.registered)).toBeVisible();
    await expect.element(page.getByText(staffCopy.supporters.badges.letter)).toBeVisible();
    await rerender(<SupporterBadges supporter={{ ...exampleSupporter, lumaContact: false, events: 0, letters: 0 }} />);
    expect(document.body.textContent!.trim()).toBe("");
  });

  it("marks a march sign-up", async () => {
    await render(<SupporterBadges supporter={{ ...exampleSupporter, sources: ["march-2026-11"] }} />);
    await expect.element(page.getByText(staffCopy.supporters.badges.march)).toBeVisible();
  });

  it("marks a member, but not a member no longer", async () => {
    const badges = staffCopy.supporters.badges;
    const member = exampleMemberDetails.summary;
    const { rerender } = await render(<SupporterBadges supporter={member} />);
    expect(document.body.textContent!.trim()).toBe(badges.member);
    await rerender(<SupporterBadges supporter={{ ...member, member: false }} />);
    expect(document.body.textContent!.trim()).toBe("");
  });
});

describe("SupportersTable", () => {
  it("lists each supporter with a link to their page, their newest email and phone, badges and dates, and pages", async () => {
    const copy = staffCopy.supporters;
    const search = supportersSearch({ q: "j", page: "2" });
    await render(
      <SupportersTable
        search={search}
        page={{
          supporters: exampleSupporterRows,
          total: 120,
          pages: 3,
        }}
      />,
    );
    await expect.element(page.getByText(copy.total(120))).toBeVisible();
    // No email or phone column without the Subscriptions filter.
    expect(page.getByText(copy.columns.email, { exact: true }).all()).toHaveLength(0);
    expect(await downloads()).toEqual([
      "/staff/supporters/download?q=j&format=csv",
      "/staff/supporters/download?q=j&format=json",
      "/staff/supporters/download?q=j&format=vcf",
    ]);
    await userEvent.keyboard("{Escape}");
    await expect
      .element(page.getByRole("link", { name: "Jane Example" }))
      .toHaveAttribute("href", "/staff/supporters/7");
    await expect.element(page.getByRole("link", { name: copy.noName })).toHaveAttribute("href", "/staff/supporters/8");
    await expect.element(page.getByText(copy.subscriptions.blocked)).toBeVisible();
    await expect.element(page.getByRole("cell", { name: "1 Mar 2026" }).first()).toBeVisible();
    await expect
      .element(page.getByRole("link", { name: staffCopy.paging.previous }))
      .toHaveAttribute("href", "/staff/supporters?q=j");
    await expect
      .element(page.getByRole("link", { name: staffCopy.paging.next }))
      .toHaveAttribute("href", "/staff/supporters?q=j&page=3");
  });

  it("says where each is, faint when it's only from an event", async () => {
    const [jane, sam] = exampleSupporterRows;
    await render(
      <SupportersTable
        search={supportersSearch({})}
        page={{
          supporters: [
            { ...jane, place: { name: "Leeds", basis: "postcode", given: "LS1", country: "england" } },
            { ...sam, place: { name: "Oxford", basis: "event", given: "AI risk talk", country: null } },
          ],
          total: 2,
          pages: 1,
        }}
      />,
    );
    await expect.element(page.getByRole("cell", { name: "Leeds" })).toBeVisible();
    expect(page.getByText("Oxford").element().className).toMatch(/muted/);
  });

  it("adds how each stands at the events the Event filter finds, named when several, and when each wrote in its campaign", async () => {
    const copy = staffCopy.supporters;
    const [jane, sam] = exampleSupporterRows;
    const rows = [
      {
        ...jane,
        registrations: [
          { event: "Leeds meetup", status: "approved" },
          { event: "Oxford talk", status: "waitlist" },
        ],
        wroteAt: "2026-10-03T09:00:00Z",
      },
      sam,
    ];
    const search = supportersSearch({ event: ["evt-1", "evt-2", "!evt-3"], campaign: "support-sobel-bill" });
    await render(<SupportersTable search={search} page={{ supporters: rows, total: 2, pages: 1 }} />);
    await expect.element(page.getByText(copy.columns.registrations, { exact: true })).toBeVisible();
    await expect.element(page.getByText("Oxford talk:")).toBeVisible();
    await expect
      .element(page.getByRole("listitem").filter({ hasText: "Oxford talk:" }))
      .toHaveTextContent(`Oxford talk: ${registrationStatus("waitlist")}`);
    await expect.element(page.getByText(copy.columns.wrote, { exact: true })).toBeVisible();
    await expect.element(page.getByRole("cell", { name: "3 Oct 2026" })).toBeVisible();
    // A download has them too.
    const text = (columns: ReturnType<typeof supporterColumns>, key: string, row: (typeof rows)[number]) =>
      columns.find((c) => c.key === key)!.text!(row);
    const columns = supporterColumns(search);
    expect(text(columns, "registrations", rows[0])).toBe(
      `Leeds meetup: ${copy.detail.registered}; Oxford talk: ${registrationStatus("waitlist")}`,
    );
    expect(text(columns, "registrations", rows[1])).toBe("");
    expect(text(columns, "wrote", rows[0])).toBe("2026-10-03T09:00:00Z");
    expect(text(columns, "wrote", rows[1])).toBeNull();
    // With one event, its status alone.
    expect(text(supporterColumns(supportersSearch({ event: "evt-1" })), "registrations", rows[0])).toBe(
      `${copy.detail.registered}; ${registrationStatus("waitlist")}`,
    );
    // Neither filter, only an event left out, those who didn't write, or a campaign we don't have: neither column.
    for (const params of [
      {},
      { event: "!evt-1" },
      { campaign: "support-sobel-bill", wrote: "no" },
      { campaign: "no-such-campaign" },
    ]) {
      const keys = supporterColumns(supportersSearch(params)).map((c) => c.key);
      expect(keys).not.toContain("registrations");
      expect(keys).not.toContain("wrote");
    }
  });

  it("sorts by a heading, reversing when clicked again, and marks the current one", async () => {
    const copy = staffCopy.supporters;
    await render(
      <SupportersTable
        search={supportersSearch({ activity: "letter", sort: "events", dir: "desc" })}
        page={{ supporters: [exampleSupporterRows[0]], total: 1, pages: 1 }}
      />,
    );
    const events = page.getByRole("link", { name: copy.columns.events });
    await expect.element(events).toHaveAttribute("href", "/staff/supporters?activity=letter&sort=events&dir=asc");
    expect(events.element().closest("th")!.getAttribute("aria-sort")).toBe("descending");
    await expect
      .element(page.getByRole("link", { name: copy.columns.name }))
      .toHaveAttribute("href", "/staff/supporters?activity=letter&sort=name&dir=asc");
  });

  it("on the first of one page, has no paging, and says when nobody is found", async () => {
    const { rerender } = await render(
      <SupportersTable
        search={supportersSearch({})}
        page={{ supporters: [exampleSupporterRows[0]], total: 1, pages: 1 }}
      />,
    );
    await expect.element(page.getByRole("link", { name: "Jane Example" })).toBeVisible();
    expect(page.getByRole("link", { name: staffCopy.paging.next }).all()).toHaveLength(0);
    await rerender(
      <SupportersTable
        search={supportersSearch({ page: "2" })}
        page={{ supporters: [exampleSupporterRows[0]], total: 101, pages: 3 }}
      />,
    );
    await expect
      .element(page.getByRole("link", { name: staffCopy.paging.previous }))
      .toHaveAttribute("href", "/staff/supporters");
    await expect
      .element(page.getByRole("link", { name: staffCopy.paging.next }))
      .toHaveAttribute("href", "/staff/supporters?page=3");
    await rerender(<SupportersTable search={supportersSearch({})} page={{ supporters: [], total: 0, pages: 1 }} />);
    await expect.element(page.getByText(staffCopy.supporters.none)).toBeVisible();
  });
});

describe("SupporterDetails", () => {
  it("shows a card of what we hold, each value with where it came from, and the history with its links", async () => {
    const copy = staffCopy.supporters;
    const first = await render(<SupporterDetails supporter={exampleSupporterDetails} />);
    await expect.element(page.getByRole("heading", { level: 1, name: /Jane Example/ })).toBeVisible();
    // Each email, phone and postcode once, with its sources and the first time.
    await expect.element(page.getByText("jane@example.com", { exact: false }).first()).toBeVisible();
    await expect
      .element(page.getByText(copy.detail.from(copy.sources.luma, "1 Mar 2026"), { exact: true }))
      .toBeVisible();
    await expect.element(page.getByText("+447700900001", { exact: false }).first()).toBeVisible();
    await expect.element(page.getByText("M1 1AE", { exact: false }).first()).toBeVisible();
    // In the band over the card: where she is, from her postcode, on a map; her MP; when she was active, and
    // how she first came; and how many events and letters, each linked to its table.
    const band = page.getByText(copy.detail.theirMp).element().closest("[class^=_band_]")!;
    expect(band.querySelector("svg circle")).not.toBeNull();
    await expect.element(page.getByText("Manchester, England", { exact: true })).toBeVisible();
    await expect.element(page.getByText(copy.detail.placeFrom.postcode("M1 1AE"), { exact: true })).toBeVisible();
    expect(band.querySelector("a[href='/staff/politicians/1']")!.textContent).toBe("Polly Placeholder");
    expect(band.textContent).toContain("Manchester Central · Labour (Co-op)");
    expect(band.textContent).toContain(copy.detail.firstVia(copy.sources.luma));
    const counts = [...band.querySelectorAll("[class*=counts] a")];
    expect(counts.map((a) => [a.getAttribute("href"), a.textContent])).toEqual([
      ["#events", `1 ${copy.detail.eventsCounted(1)}`],
      ["#letters", `1 ${copy.detail.lettersCounted(1)}`],
    ]);
    // Her number, given to Luma, is one we may not use since she unsubscribed: marked, and no link.
    await expect.element(page.getByText(copy.detail.unusable)).toBeVisible();
    await expect.element(page.getByRole("link", { name: "+447700900001" })).not.toBeInTheDocument();
    // Beside the profile, her events and her letters, a table each.
    const events = page.getByRole("region", { name: copy.detail.eventsTitle, exact: false });
    await expect
      .element(events.getByRole("link", { name: "PauseAI Manchester Social" }))
      .toHaveAttribute("href", "https://luma.com/fixture-manchester-social");
    const letters = page.getByRole("region", { name: copy.detail.lettersTitle });
    await expect
      .element(letters.getByRole("link", { name: "Polly Placeholder" }))
      .toHaveAttribute("href", "/staff/politicians/1");
    await expect
      .element(letters.getByRole("link", { name: staffCopy.letters.status.sent }))
      .toHaveAttribute("href", `/staff/letters/supporter/${exampleSupporterDetails.summary.id}`);
    // Beside the facts, whether we'd contact her about each topic: by email, and by the phone she gave Luma.
    const subscriptions = page.getByRole("region", { name: copy.detail.listsTitle });
    await expect
      .element(
        subscriptions.getByText(copy.detail.permissions.reasons["luma-calendar"].unsubscribed("12 Oct 2026"), {
          exact: false,
        }),
      )
      .toHaveLength(2);
    await expect.element(page.getByText("1 Mar 2026 – 12 Oct 2026", { exact: true })).toBeVisible();
    // The history, folded until opened: what, linked, with a status only when it isn't approved.
    await page.getByText(copy.detail.showHistory(exampleSupporterDetails.activity.length)).click();
    const history = page.getByRole("list", { name: copy.detail.activityTitle });
    await expect
      .element(history.getByRole("link", { name: "PauseAI Manchester Social" }))
      .toHaveAttribute("href", "https://luma.com/fixture-manchester-social");
    expect(history.element().textContent).not.toContain("approved");
    // A letter: the MP links to their page, the campaign to its public page, and the letter's status follows.
    await expect
      .element(history.getByRole("link", { name: "Polly Placeholder" }).first())
      .toHaveAttribute("href", "/staff/politicians/1");
    await expect
      .element(history.getByRole("link", { name: campaigns[0].title }).first())
      .toHaveAttribute("href", campaignPath(campaigns[0]));
    expect(history.element().textContent).toContain(
      `${copy.detail.kinds.letter} Polly Placeholder ${copy.detail.about} ${campaigns[0].title} · ${staffCopy.letters.status.sent}`,
    );

    await expect.element(history.getByText(copy.lists["luma-calendar"], { exact: false })).toBeVisible();
    await expect.element(history.getByText(copy.detail.kinds["luma-contact"], { exact: false })).toBeVisible();

    // A letter for a campaign nobody runs any more, with no page to link: its name and status as stored.
    await first.rerender(
      <SupporterDetails
        supporter={{
          ...exampleSupporterDetails,
          activity: [
            {
              source: "email-your-mp",
              at: "2026-10-05T09:00:00Z",
              kind: "letter",
              title: "old-campaign",
              detail: "Gone MP",
              href: null,
              status: "queued",
            },
          ],
        }}
      />,
    );
    openHistory();
    const old = page.getByRole("list", { name: copy.detail.activityTitle });
    expect(old.element().textContent).toContain(
      `${copy.detail.kinds.letter} Gone MP ${copy.detail.about} old-campaign · queued`,
    );
    // Only the status links, to the supporter's letters.
    expect(
      old
        .getByRole("link")
        .all()
        .map((link) => link.element().getAttribute("href")),
    ).toEqual([`/staff/letters/supporter/${exampleSupporterDetails.summary.id}`]);

    // The same postcode typed differently is one line, in the usual form, with both sources.
    await first.unmount();
    const { unmount } = await render(
      <SupporterDetails
        supporter={{
          ...exampleSupporterDetails,
          summary: exampleSupporter,
          contacts: [
            {
              source: "email-your-mp",
              at: "2026-10-05T09:00:00Z",
              phone: null,
              postcode: "m11ae",
              latitude: null,
              longitude: null,
              city: null,
            },
            {
              source: "luma",
              at: "2026-09-20T10:00:00Z",
              phone: null,
              postcode: "M1  1AE",
              latitude: null,
              longitude: null,
              city: null,
            },
          ],
        }}
      />,
    );
    expect(page.getByText("M1 1AE", { exact: false }).all()).toHaveLength(1);
    await expect
      .element(
        page.getByText(copy.detail.from(`${copy.sources["email-your-mp"]}, ${copy.sources.luma}`, "20 Sept 2026"), {
          exact: true,
        }),
      )
      .toBeVisible();
    await unmount();
  });

  it("copes with a supporter who has no name, nothing given and no activity, and with unknown statuses, lists and campaigns", async () => {
    const copy = staffCopy.supporters;
    await render(
      <SupporterDetails
        supporter={{
          mp: null,
          summary: {
            ...exampleSupporter,
            name: null,
            lumaContact: false,
            events: 0,
            letters: 0,
            firstSeenAt: null,
            lastActiveAt: null,
          },
          identities: [{ source: "luma", email: "x@example.com", name: "", seenAt: null }],
          contacts: [],
          links: [],
          activity: [
            {
              source: "luma",
              at: "2026-01-01T00:00:00Z",
              kind: "luma-registered",
              title: "Thing",
              detail: "waitlist",
              href: null,
              status: null,
            },
            {
              source: "luma",
              at: "2026-01-01T00:00:00Z",
              kind: "luma-registered",
              title: "Other",
              detail: "session",
              href: null,
              status: null,
            },
            {
              source: "luma",
              at: "2026-01-01T00:00:00Z",
              kind: "luma-registered",
              title: "Bare",
              detail: null,
              href: null,
              status: null,
            },
            {
              source: "x",
              at: "2026-01-02T00:00:00Z",
              kind: "opted-out",
              title: "other-list",
              detail: null,
              href: null,
              status: null,
            },
            {
              source: "x",
              at: "2026-01-02T00:00:00Z",
              kind: "resubscribed",
              title: null,
              detail: "x@example.com",
              href: null,
              status: null,
            },
            {
              source: "email-your-mp",
              at: "2026-01-03T00:00:00Z",
              kind: "letter",
              title: "gone-campaign",
              detail: "An MP",
              href: null,
              status: "sent",
            },
            {
              source: "email-your-mp",
              at: "2026-01-03T00:00:00Z",
              kind: "letter",
              title: null,
              detail: "No campaign MP",
              href: null,
              status: null,
            },
            {
              source: "email-your-mp",
              at: "2026-01-04T00:00:00Z",
              kind: "letter-replied",
              title: null,
              detail: null,
              href: null,
              status: null,
            },
          ],
          permissions: [],
        }}
      />,
    );
    await expect.element(page.getByRole("heading", { level: 1, name: copy.noName })).toBeVisible();
    await expect.element(page.getByText(copy.sources.luma, { exact: true })).toBeVisible();
    openHistory();
    await expect.element(page.getByText("Thing", { exact: false }).first()).toBeVisible();
    await expect.element(page.getByText(copy.detail.statuses.waitlist, { exact: false }).first()).toBeVisible();
    await expect.element(page.getByText("other-list", { exact: false })).toBeVisible();
    await expect.element(page.getByText("gone-campaign", { exact: false }).first()).toBeVisible();
  });

  it("says where they are and what it's from, and nothing when we don't know", async () => {
    const copy = staffCopy.supporters;
    const place = (basis: "postcode" | "city" | "event", given: string) => ({
      ...exampleSupporterDetails,
      summary: { ...exampleSupporter, place: { name: "Leicester", basis, given, country: "england" } },
    });
    const { rerender } = await render(<SupporterDetails supporter={place("postcode", "LE1 1AA")} />);
    await expect.element(page.getByText("Leicester, England", { exact: true })).toBeVisible();
    await expect.element(page.getByText(copy.detail.placeFrom.postcode("LE1 1AA"), { exact: true })).toBeVisible();
    await rerender(<SupporterDetails supporter={place("event", "PauseAI Leicester meetup")} />);
    await expect
      .element(page.getByText(copy.detail.placeFrom.event("PauseAI Leicester meetup"), { exact: true }))
      .toBeVisible();
    await rerender(<SupporterDetails supporter={place("city", "Leicester")} />);
    await expect.element(page.getByText(copy.detail.placeFrom.city(""), { exact: true })).toBeVisible();
    await rerender(
      <SupporterDetails
        supporter={{
          ...exampleSupporterDetails,
          summary: { ...exampleSupporter, place: { name: null, basis: "city", given: "x", country: null } },
        }}
      />,
    );
    expect(page.getByText(copy.detail.place, { exact: true }).all()).toHaveLength(0);
  });

  it("puts the place on a map of the UK, a dot on the coast's line, when it's in the UK and we know where", async () => {
    const at = (latitude?: number | null, longitude?: number | null) => ({
      ...exampleSupporterDetails,
      summary: {
        ...exampleSupporter,
        place: { name: "Leeds", basis: "city" as const, given: "Leeds", country: "england", latitude, longitude },
      },
    });
    const map = () => document.querySelector("[class^=_band_] > svg");
    const { rerender } = await render(<SupporterDetails supporter={at(53.8, -1.55)} />);
    expect(map()!.querySelector("path")!.getAttribute("d")).toMatch(/^M/);
    const dot = map()!.querySelector("circle")!;
    // Leeds is in the north of England: below the middle of the map's height, right of its middle.
    expect(Number(dot.getAttribute("cy"))).toBeGreaterThan(50);
    expect(Number(dot.getAttribute("cx"))).toBeGreaterThan(30);
    const box = map()!.getBoundingClientRect();
    expect(box.height).toBeGreaterThan(box.width);
    for (const [latitude, longitude] of [
      [40.7, -74],
      [null, -1.55],
      [53.8, null],
      [undefined, undefined],
    ]) {
      await rerender(<SupporterDetails supporter={at(latitude, longitude)} />);
      expect(map()).toBeNull();
    }
  });

  it("leaves out of the band what it doesn't know: a nation, an MP's party, how they first came", async () => {
    const copy = staffCopy.supporters;
    await render(
      <SupporterDetails
        supporter={{
          ...exampleSupporterDetails,
          summary: { ...exampleSupporter, place: { name: "Douglas", basis: "city", given: "Douglas", country: null } },
          mp: { id: 2, name: "Ivy Independent", constituency: "Somewhere", party: "" },
          identities: [],
          activity: [],
        }}
      />,
    );
    await expect.element(page.getByText("Douglas", { exact: true })).toBeVisible();
    await expect.element(page.getByText("Somewhere", { exact: true })).toBeVisible();
    expect(document.body.textContent).not.toContain(copy.detail.firstVia(copy.sources.luma));
    // Nothing counted is a nought, so the box keeps its shape.
    await expect.element(page.getByRole("link", { name: `0 ${copy.detail.eventsCounted(0)}` })).toBeVisible();
  });

  it("says when there are no events or letters", async () => {
    await render(<SupporterDetails supporter={{ ...exampleSupporterDetails, activity: [] }} />);
    await expect.element(page.getByText(staffCopy.supporters.detail.noEvents)).toBeVisible();
    await expect.element(page.getByText(staffCopy.supporters.detail.noLetters)).toBeVisible();
  });

  it("with no history, says so", async () => {
    await render(<SupporterDetails supporter={{ ...exampleSupporterDetails, activity: [] }} />);
    await expect.element(page.getByText(staffCopy.supporters.detail.noActivity)).toBeVisible();
  });

  it("shows a value given by two sources once, from the earliest, and one with no date by its source alone", async () => {
    const copy = staffCopy.supporters;
    await render(
      <SupporterDetails
        supporter={{
          ...exampleSupporterDetails,
          identities: [
            { source: "email-your-mp", email: "jane@example.com", name: "Jane", seenAt: "2026-10-05T09:00:00Z" },
            { source: "luma", email: "jane@example.com", name: "Jane", seenAt: "2026-03-01T10:00:00Z" },
            { source: "luma", email: "jane@example.com", name: "Jane", seenAt: null },
            { source: "email-your-mp", email: "old@example.com", name: "Jane", seenAt: null },
          ],
          contacts: [],
          activity: [],
        }}
      />,
    );
    await expect
      .element(
        page.getByText(copy.detail.from(`${copy.sources["email-your-mp"]}, ${copy.sources.luma}`, "1 Mar 2026"), {
          exact: true,
        }),
      )
      .toBeVisible();
    await expect
      .element(page.getByText(`old@example.com ${copy.sources["email-your-mp"]}`, { exact: true }))
      .toBeVisible();
  });
});

describe("SupporterDetails, a march sign-up", () => {
  const copy = staffCopy.supporters;
  const entry = {
    source: "march-2026-11",
    at: "2026-10-20T10:00:00Z",
    kind: "form-entry" as const,
    title: "march-2026-11",
    detail: "nl",
    href: null,
    status: "skipped",
  };

  it("says the form in the history, the link they came by and what Luma said, where there's either", async () => {
    await render(
      <SupporterDetails
        supporter={{
          ...exampleMemberDetails,
          activity: [
            entry,
            { ...entry, detail: null },
            { ...entry, detail: null, status: null, title: "a-new-form" },
            { ...entry, detail: null, status: null, title: null },
          ],
        }}
      />,
    );
    openHistory();
    const lines = page
      .getByRole("list", { name: copy.detail.activityTitle })
      .getByRole("listitem")
      .all()
      .map((item) => item.element().textContent!.replace(/^\d+ \w+ \d{4}, \d\d:\d\d/, ""));
    const form = `${copy.detail.kinds["form-entry"]} ${copy.sources["march-2026-11"]}`;
    expect(lines).toEqual([
      `${form} · ${copy.detail.cameFrom("nl")} · ${copy.detail.luma.skipped}`,
      `${form} · ${copy.detail.luma.skipped}`,
      `${copy.detail.kinds["form-entry"]} a-new-form`,
      `${copy.detail.kinds["form-entry"]} `,
    ]);
  });
});

describe("SupporterDetails, a member", () => {
  const copy = staffCopy.supporters;
  const joined = exampleMemberDetails.activity[0];

  it("says their city, whether we'd email them about each topic, and how they joined in the history", async () => {
    await render(<SupporterDetails supporter={exampleMemberDetails} />);
    openHistory();
    await expect
      .element(page.getByText(`Cardiff ${copy.detail.from(copy.sources.member, "11 Oct 2026")}`, { exact: true }))
      .toBeVisible();
    await expect
      .element(
        page.getByText(copy.detail.permissions.reasons["pauseai-updates"].asked("11 Oct 2026"), { exact: false }),
      )
      .toBeVisible();
    const history = page.getByRole("list", { name: copy.detail.activityTitle });
    expect(history.element().textContent).toContain(
      `${copy.detail.kinds["member-joined"]} ${copy.detail.joinedOn("pauseai.uk")}, ${copy.detail.intents.Volunteer}`,
    );
  });

  it("words a join with less to say", async () => {
    await render(
      <SupporterDetails
        supporter={{
          ...exampleMemberDetails,
          activity: [
            { ...joined, detail: null },
            { ...joined, title: "None", detail: "pauseai.info/join" },
            { ...joined, title: null, detail: null },
          ],
        }}
      />,
    );
    openHistory();
    const history = page.getByRole("list", { name: copy.detail.activityTitle });
    // What they chose alone, where the form was alone, and neither.
    const lines = history
      .getByRole("listitem")
      .all()
      .map((item) => item.element().textContent);
    expect(lines.map((line) => line!.replace(/^\d+ \w+ \d{4}, \d\d:\d\d/, ""))).toEqual([
      `${copy.detail.kinds["member-joined"]} ${copy.detail.intents.Volunteer}`,
      `${copy.detail.kinds["member-joined"]} ${copy.detail.joinedOn("pauseai.info/join")}`,
      `${copy.detail.kinds["member-joined"]} `,
    ]);
  });
});

/** Opens a list's Download menu, and gives its links' addresses. */
async function downloads() {
  await page.getByRole("button", { name: staffCopy.lists.download }).click();
  const box = document.querySelector<HTMLElement>("[popover]:popover-open")!;
  return [...box.querySelectorAll("a")].map((a) => a.getAttribute("href"));
}

/** Opens every folded part of the page, such as a supporter's history. */
function openHistory() {
  for (const details of document.querySelectorAll("details")) details.open = true;
}

describe("PermissionTiles", () => {
  const copy = staffCopy.supporters.detail.permissions;
  const tiles = () => [...document.querySelectorAll("li")];
  const title = (tile: Element) => tile.querySelector("[class*=title]")!.textContent;
  const address = (tile: Element) => tile.querySelector("[class*=address]")!;

  it("is a strip a topic: its name and the answer, the address, why in a few words, and how we know behind the ?", async () => {
    await render(<PermissionTiles permissions={exampleSupporterDetails.permissions} />);
    expect(tiles().map((tile) => tile.dataset.send)).toEqual(["no", "yes", "no"]);
    expect(tiles()[0].querySelector("[class*=strip]")!.textContent).toBe(
      `${copy.topics.email["luma-calendar"]}${copy.answers.email.no}?jane@example.com${copy.reasons["luma-calendar"].unsubscribed("12 Oct 2026")}`,
    );
    expect(title(tiles()[1])).toBe(`${copy.topics.email["site-forms"]}${copy.answers.email.yes}?`);
    // The address after an envelope, a number after a phone, each named for a screen reader.
    expect(address(tiles()[0]).querySelector("svg")!.getAttribute("aria-label")).toBe(copy.email);
    expect(address(tiles()[2]).textContent).toBe("+447700900001");
    expect(address(tiles()[2]).querySelector("svg")!.getAttribute("aria-label")).toBe(copy.phone);
    // A number's answer is in the words of the ways its topic allows, and how we know in a phone's words.
    expect(title(tiles()[2])).toBe(`${copy.topics.phone["luma-calendar"]}${copy.answers.text.no}?`);
    expect(tiles()[2].textContent).toContain(copy.details.phone["luma-calendar"].about);
    // The answer on the topic's line, the address under it.
    const line = (selector: string) => tiles()[0].querySelector(selector)!.getBoundingClientRect().top;
    expect(line("[class*=answer]")).toBeLessThan(line("[class*=address]"));
    // The ? at the top right, out of the reason's way.
    const top = tiles()[0].querySelector("button")!.getBoundingClientRect().top;
    expect(top).toBeLessThan(tiles()[0].querySelector("[class*=reason]")!.getBoundingClientRect().top);
    // Green we'd email them, plain we wouldn't; an answer, so no warning icon.
    expect(tiles()[1].firstElementChild!.className).toMatch(/green/);
    expect(tiles()[0].firstElementChild!.className).not.toMatch(/green|amber|red|undefined/);
    expect(tiles()[0].querySelectorAll("svg")).toHaveLength(1);
    // How we know shows when the ? is clicked.
    const luma = copy.details.email["luma-calendar"];
    await expect.element(page.getByText(luma.about).first()).not.toBeVisible();
    await page.getByRole("button", { name: copy.why }).first().click();
    // The topic by name, what it is, then when we'd email them and when not, and what we can't see, each labelled.
    const popover = document.querySelector("[popover]")!;
    expect(popover.querySelector("strong")!.textContent).toBe(copy.topicTitle(copy.topics.email["luma-calendar"]));
    expect([...popover.querySelectorAll("dt")].map((dt) => dt.textContent)).toEqual([
      copy.when.email.yes,
      copy.when.email.no,
      copy.caveat,
    ]);
    expect([...popover.querySelectorAll("dd")].map((dd) => dd.textContent)).toEqual([luma.yes, luma.no, luma.caveat]);
    await expect.element(page.getByText(luma.about).first()).toBeVisible();
    // A topic with nothing we can't see has no third label.
    (popover as HTMLElement).hidePopover();
    await page.getByRole("button", { name: copy.why }).nth(1).click();
    expect(document.querySelectorAll("[popover]")[1].querySelectorAll("dt")).toHaveLength(2);
    // A number's labels are in the words of the ways its topic allows.
    expect(document.querySelectorAll("[popover]")[2].querySelector("dt")!.textContent).toBe(copy.when.text.yes);
  });

  it("names the form whose box answered for our forms, or the newest form for one it has no name for", async () => {
    const at = "2026-10-16T12:00:00Z";
    const forms = (source: string | null, reason: "asked" | "declined" = "asked") => ({
      topic: "site-forms" as const,
      channel: "email" as const,
      address: `${source}@example.org`,
      send: reason === "asked" ? ("yes" as const) : ("no" as const),
      reason,
      at,
      source,
    });
    await render(
      <PermissionTiles
        permissions={[
          forms("march-2026-11"),
          forms("email-your-mp", "declined"),
          forms("web-form"),
          forms("a-new-form"),
          forms(null),
        ]}
      />,
    );
    const reasons = tiles().map((tile) => tile.querySelector("[class*=reason]")!.textContent);
    expect(reasons).toEqual([
      copy.reasons["site-forms"].asked("16 Oct 2026", copy.forms["march-2026-11"]),
      copy.reasons["site-forms"].declined("16 Oct 2026", copy.forms["email-your-mp"]),
      copy.reasons["site-forms"].asked("16 Oct 2026", copy.forms["web-form"]),
      copy.reasons["site-forms"].asked("16 Oct 2026", copy.otherForm),
      copy.reasons["site-forms"].asked("16 Oct 2026", copy.otherForm),
    ]);
  });

  it("says don't know where an unsubscribe may not have reached us", async () => {
    await render(<PermissionTiles permissions={exampleMemberDetails.permissions} />);
    expect(tiles()[1].dataset.send).toBe("unsure");
    expect(title(tiles()[1])).toContain(copy.answers.email.unsure);
    expect(tiles()[1].firstElementChild!.className).toMatch(/amber/);
    // A volunteer's number, a yes; an unsure one is a don't know, as by email.
    expect(title(tiles()[2])).toBe(`${copy.topics.phone.volunteering}${copy.answers["call-or-text"].yes}?`);
    expect(address(tiles()[2]).textContent).toBe("+447700900002");
    const [, , phone] = exampleMemberDetails.permissions;
    await render(<PermissionTiles permissions={[{ ...phone, send: "unsure", reason: "gave-number" }]} />);
    expect(title(tiles().at(-1)!)).toContain(copy.answers["call-or-text"].unsure);
  });

  it("names each address, and falls back to the reason's own name", async () => {
    const [luma] = exampleSupporterDetails.permissions;
    await render(
      <PermissionTiles
        permissions={[
          { ...luma, reason: "joined", at: null },
          { ...luma, address: "other@example.com" },
        ]}
      />,
    );
    expect(address(tiles()[0]).textContent).toBe("jane@example.com");
    expect(tiles()[0].textContent).toContain("jane@example.comjoined");
    expect(address(tiles()[1]).textContent).toBe("other@example.com");
  });

  it("gives a blocked address one tile, saying why and linking to the blocked emails", async () => {
    await render(<PermissionTiles permissions={exampleBlockedPermissions} />);
    expect(tiles()).toHaveLength(1);
    expect(tiles()[0].textContent).toBe(
      `${copy.everyTopic}${copy.blocked}gus@example.com${copy.blockedBecause.complaint("5 Oct 2026")} ${copy.seeBlocked}`,
    );
    await expect
      .element(page.getByRole("link", { name: copy.seeBlocked }))
      .toHaveAttribute("href", "/staff/supporters/blocked-emails");
  });

  it("words every reason it can give, with when", async () => {
    const [luma] = exampleSupporterDetails.permissions;
    const permissions = Object.entries(copy.reasons).flatMap(([topic, reasons]) =>
      Object.keys(reasons).map((reason) => ({
        ...luma,
        // A topic only phones have is a number's.
        channel: topic === "volunteering" || topic === "march-day" ? ("phone" as const) : ("email" as const),
        topic: topic as Topic,
        reason: reason as Reason,
        at: "2026-09-12T10:00:00Z",
      })),
    );
    await render(<PermissionTiles permissions={permissions} />);
    for (const [topic, reasons] of Object.entries(copy.reasons))
      for (const words of Object.values(reasons))
        // The example's source is Luma's, a form it has no name for.
        expect(document.body.textContent, topic).toContain(words("12 Sept 2026", copy.otherForm));
  });

  it("says a bounce blocked an address, and nothing of a block it can't date", async () => {
    const [blocked] = exampleBlockedPermissions;
    const { rerender } = await render(<PermissionTiles permissions={[{ ...blocked, source: "hard" }]} />);
    expect(tiles()[0].textContent).toContain(copy.blockedBecause.hard("5 Oct 2026"));
    await rerender(<PermissionTiles permissions={[{ ...blocked, source: null }]} />);
    expect(tiles()[0].textContent).toBe(`${copy.everyTopic}${copy.blocked}gus@example.com${copy.seeBlocked}`);
  });

  it("names a blocked address among several, and leaves out a cause it has no words for", async () => {
    const [blocked] = exampleBlockedPermissions;
    await render(
      <PermissionTiles permissions={[{ ...blocked, source: "soft" }, { ...exampleSupporterDetails.permissions[1] }]} />,
    );
    expect(tiles()[0].textContent).toBe(`${copy.everyTopic}${copy.blocked}gus@example.com${copy.seeBlocked}`);
    expect(tiles()).toHaveLength(2);
  });
});

describe("the lists' paging", () => {
  it("leads the audit log and the letters through their pages, from the first when none is given", async () => {
    const { rerender } = await render(
      <ChangesTable
        log={{ changes: exampleChanges, total: 250, pages: 3, pageSize: 100 }}
        page={2}
        airtableTable="https://airtable.com/app/tbl"
      />,
    );
    await expect
      .element(page.getByRole("link", { name: staffCopy.paging.next }))
      .toHaveAttribute("href", "/staff/audit-log?page=3");
    await rerender(
      <LettersList
        letters={[exampleLetter]}
        total={150}
        pages={2}
        pageSize={100}
        search={{ status: "", q: "", answered: "", campaign: "", consent: "", page: "" }}
      />,
    );
    await expect
      .element(page.getByRole("link", { name: staffCopy.paging.next }))
      .toHaveAttribute("href", "/staff/letters?page=2");
  });
});

describe("each list's download values and contact cards", () => {
  const values = <Row,>(columns: ListColumn<Row>[], row: Row) =>
    Object.fromEntries(columns.filter((c) => c.text).map((c) => [c.key, c.text!(row)]));

  it("asks: their kind, title, date, who asks, and each answer's count", () => {
    expect(values(askColumns, exampleAsksWithCounts[0])).toMatchObject({ ask: exampleAsksWithCounts[0].title });
    for (const ask of exampleAsksWithCounts) expect(typeof values(askColumns, ask).answers).toBe("string");
  });

  it("blocked addresses: whose, and the email that found them out, or nothing", () => {
    const columns = blockColumns(false);
    expect(values(columns, exampleBlock)).toMatchObject({
      whose: "Bouncy McTestface MP",
      sent: `${staffCopy.emails.letterTo} Bouncy McTestface MP`,
    });
    expect(values(columns, exampleComplaint).sent).toBe(staffCopy.emails.purposes["forwarded-reply"]);
    expect(values(columns, { ...exampleComplaint, purpose: null }).sent).toBeNull();
  });

  it("letters: the campaign by its title, or its slug once it's gone, and the history", () => {
    const row = values(letterColumns, exampleLetter);
    expect(row.campaign).toBe(campaignBySlug(exampleLetter.campaign)?.title);
    expect(values(letterColumns, { ...exampleLetter, campaign: "gone" }).campaign).toBe("gone");
    expect(typeof row.history).toBe("string");
  });

  it("mailings: copied from Airtable, or no sender recorded", () => {
    expect(exampleMailings.map((m) => values(mailingColumns, m).sender)).toEqual([null, staffCopy.mailings.imported]);
  });

  it("politicians: every column, and as cards, with what they have", async () => {
    const rows = [
      { ...examplePolitician, firstActivityAt: "2026-09-01T00:00:00Z", lastActivityAt: "2026-10-01T00:00:00Z" },
      {
        ...examplePolitician,
        id: 8,
        constituency: null,
        house: "lords" as const,
        email: null,
        party: "",
        country: null,
        status: "retired" as const,
      },
    ];
    const columns = politicianColumns(exampleAsks, { status: "any" });
    expect(values(columns, rows[0])).toMatchObject({
      house: staffCopy.houses.commons,
      party: examplePolitician.party,
      status: staffCopy.personStatuses.in_office,
      constituency: examplePolitician.constituency,
      first: "2026-09-01T00:00:00Z",
      active: "2026-10-01T00:00:00Z",
    });
    // The markers in words, each one they have; none for one with none.
    const { flags } = staffCopy.politicians;
    const marked = {
      ...rows[0],
      importantTarget: true,
      personalConnection: true,
      airtableRemovedAt: "2026-10-20",
      isTest: true,
    };
    expect(values(columns, marked).marked).toBe(
      `${flags.important}; ${flags.connection}; ${flags.removed}; ${flags.test}`,
    );
    expect(values(columns, { ...rows[0], importantTarget: false }).marked).toBe("");
    // On the page, the days of their first and last activity; none for one without.
    await render(<PoliticianTable politicians={rows} asks={exampleAsks} search={{ status: "any" }} />);
    await expect.element(page.getByRole("cell", { name: "1 Sept 2026" })).toBeVisible();
    await expect.element(page.getByRole("cell", { name: "1 Oct 2026" })).toBeVisible();
    expect(String(values(columns, rows[0]).asks)).toContain(": ");
    const card = politicianContact(exampleAsks);
    expect(card(rows[0])).toMatchObject({ emails: [examplePolitician.email], title: examplePolitician.party });
    expect(card(rows[1])).toMatchObject({ emails: [], title: null, address: { country: null } });
  });

  it("supporters: what they are, what they get, and as cards, with what they have", () => {
    const [jane, sam, gus] = exampleSupporterRows;
    expect(
      supporterBadgeWords({
        ...sam,
        lumaContact: true,
        events: 1,
        letters: 1,
        sources: [...sam.sources, "march-2026-11"],
      }),
    ).toBe(
      Object.values({
        m: staffCopy.supporters.badges.member,
        c: staffCopy.supporters.badges.lumaContact,
        r: staffCopy.supporters.badges.registered,
        l: staffCopy.supporters.badges.letter,
        march: staffCopy.supporters.badges.march,
      }).join("; "),
    );
    expect(subscriptionWords(sam.permissions)).toContain(staffCopy.supporters.subscriptions.unsure(""));
    expect(subscriptionWords(gus.permissions)).toBe(staffCopy.supporters.subscriptions.blocked);
    const placed = {
      ...jane,
      phone: "+447700900001",
      place: { name: "Leeds", basis: "postcode" as const, given: "LS1", country: "england" },
    };
    // Without the Subscriptions filter, a card has no address or number.
    expect(supporterContact({ contact: [] })(placed)).toMatchObject({
      emails: [],
      phones: [],
      address: { locality: "Leeds", country: staffCopy.countries.england },
    });
  });
});

describe("LettersTable, a sender not yet a supporter", () => {
  it("shows the name without a link", async () => {
    await render(<LettersTable letters={[{ ...exampleLetter, supporterId: null }]} />);
    await expect.element(page.getByText(exampleLetter.senderName, { exact: false })).toBeVisible();
    expect(page.getByRole("link", { name: exampleLetter.senderName }).all()).toHaveLength(0);
  });
});

describe("EraseForm, for a supporter with no name", () => {
  it("heads the page with the stand-in", async () => {
    await render(<EraseForm supporter={{ id: 8, name: null }} action={vi.fn()} />);
    await expect
      .element(
        page.getByRole("heading", { level: 1, name: `${staffCopy.erase.title}: ${staffCopy.supporters.noName}` }),
      )
      .toBeVisible();
  });
});

describe("EraseForm", () => {
  it("sends the supporter, the reference and the confirmation, only once the box is ticked, with the way back", async () => {
    const { fn, sent } = action();
    await render(<EraseForm supporter={{ id: 7, name: "Jane Example" }} action={fn} />);
    await expect
      .element(page.getByRole("heading", { level: 1, name: `${staffCopy.erase.title}: Jane Example` }))
      .toBeVisible();
    const button = page.getByRole("button", { name: staffCopy.erase.button });
    await expect.element(button).toBeDisabled();
    await expect
      .element(page.getByRole("link", { name: staffCopy.erase.cancel }))
      .toHaveAttribute("href", "/staff/supporters/7");
    await page.getByRole("textbox", { name: staffCopy.erase.referenceLabel }).fill("ICO-123");
    await page.getByRole("checkbox", { name: staffCopy.erase.confirm }).click();
    await expect.element(button).toBeEnabled();
    await button.click();
    await vi.waitFor(() => expect(sent).toHaveLength(1));
    expect(sent[0]).toEqual({ id: "7", reference: "ICO-123", confirm: "on" });
  });
});

describe("ErasedNotice", () => {
  it("says done, or nothing", async () => {
    const { rerender } = await render(<ErasedNotice erased="1" />);
    await expect.element(page.getByRole("status")).toHaveTextContent(staffCopy.erase.done);
    await rerender(<ErasedNotice erased="" />);
    expect(page.getByRole("status").all()).toHaveLength(0);
  });
});

/** The chips of the filters on, by their words. */
const chips = () =>
  page
    .getByRole("button")
    .all()
    .map((b) => b.element().textContent)
    .filter((text) => ![staffCopy.search, staffCopy.filters.add, staffCopy.filters.except].includes(text!));

/** Opens a filter's menu, by its button, and gives its links' words and addresses. */
async function menu(button: string) {
  await userEvent.keyboard("{Escape}");
  await page.getByRole("button", { name: button }).click();
  const box = document.querySelector<HTMLElement>("[popover]:popover-open")!;
  return [...box.querySelectorAll("a")].map((a) => [a.textContent, a.getAttribute("href")]);
}

describe("EmailBlockFilters", () => {
  it("searches the addresses on its page, and filters by cause", async () => {
    await render(<EmailBlockFilters q="example.org" kind="complaint" action="/staff/politicians/blocked-emails" />);
    const { columns, kinds } = staffCopy.emails;
    await expect.element(page.getByRole("searchbox", { name: columns.address })).toHaveValue("example.org");
    expect(page.getByRole("searchbox").element().closest("form")!.getAttribute("action")).toBe(
      "/staff/politicians/blocked-emails",
    );
    expect(chips()).toEqual([`${columns.kind}: ${kinds.complaint}`]);
  });
});

describe("PoliticianFilters", () => {
  const copy = staffCopy.politicians;
  const search = {
    ...emptyPoliticiansSearch,
    q: "blake",
    house: "lords",
    status: "retired",
    party: ["Labour"],
    ask: "edinburgh-conference-2026",
    answer: "declined",
    sort: "asks",
    dir: "asc",
    page: "2",
  };

  it("has a chip for each filter on, the ask and its answer one, and Clear filters keeping the house", async () => {
    await render(<PoliticianFilters search={search} asks={exampleAsks} parties={["Green", "Labour"]} />);
    const edinburgh = ask("edinburgh-conference-2026").title;
    expect(chips()).toEqual([
      `${staffCopy.fields.party}: Labour`,
      `${copy.status}: ${staffCopy.personStatuses.retired}`,
      edinburgh,
      staffCopy.statuses.declined,
    ]);
    // Any answer, then the answers of the ask's kind, and none; another ask takes the answer away.
    expect((await menu(staffCopy.statuses.declined)).map(([text]) => text)).toEqual([
      copy.anyAnswer,
      ...ASK_STATUSES.event.map((s) => staffCopy.statuses[s]),
      copy.noAnswer,
    ]);
    const asks = await menu(edinburgh);
    expect(asks.find(([text]) => text === ask("frontier-ai-letter").title)![1]).toBe(
      "/staff/politicians?q=blake&house=lords&status=retired&party=Labour&ask=frontier-ai-letter&sort=asks&dir=asc",
    );
    // Status goes back to those in office by its blank choice.
    expect((await menu(`${copy.status}: ${staffCopy.personStatuses.retired}`))[0]).toEqual([
      staffCopy.personStatuses.in_office,
      "/staff/politicians?q=blake&house=lords&party=Labour&ask=edinburgh-conference-2026&answer=declined&sort=asks&dir=asc",
    ]);
    // The party can be chosen again, from those not chosen; the other filters not on are there too.
    const add = await menu(staffCopy.filters.add);
    expect(add.map(([text]) => text)).toEqual([
      "Green",
      ...Object.values(staffCopy.countries),
      ...Object.values(copy.emailStates),
      ...Object.values(copy.flags),
    ]);
    expect(add[0][1]).toBe(
      "/staff/politicians?q=blake&house=lords&status=retired&party=Labour&party=Green&ask=edinburgh-conference-2026&answer=declined&sort=asks&dir=asc",
    );
    await expect
      .element(page.getByRole("link", { name: staffCopy.resetFilters }))
      .toHaveAttribute("href", "/staff/politicians?house=lords");
  });

  it("offers an answer only once there's an ask", async () => {
    await render(<PoliticianFilters search={emptyPoliticiansSearch} asks={exampleAsks} parties={["Green"]} />);
    const groups = () => [...document.querySelectorAll("#filter-add details > summary")].map((p) => p.textContent);
    await page.getByRole("button", { name: staffCopy.filters.add }).click();
    expect(groups()).toEqual([
      staffCopy.fields.party,
      staffCopy.politician.country,
      copy.status,
      staffCopy.fields.email,
      copy.flag,
      copy.ask,
    ]);
    expect(page.getByRole("link", { name: staffCopy.resetFilters }).query()).toBeNull();
  });
});

describe("PoliticianFilters, chosen more than once", () => {
  it("has a chip for each party, each changing or removing only its own", async () => {
    await render(
      <PoliticianFilters
        search={{ ...emptyPoliticiansSearch, party: ["Green", "Labour"] }}
        asks={exampleAsks}
        parties={["Green", "Labour", "Reform UK"]}
      />,
    );
    const party = staffCopy.fields.party;
    expect(chips()).toEqual([`${party}: Green`, `${party}: Labour`]);
    const green = await menu(`${party}: Green`);
    expect(green.find(([text]) => text === "Reform UK")![1]).toBe("/staff/politicians?party=Labour&party=Reform+UK");
    expect(green.find(([text]) => text === staffCopy.filters.remove)![1]).toBe("/staff/politicians?party=Labour");
    // + Filter offers the party not yet chosen.
    expect((await menu(staffCopy.filters.add)).map(([text]) => text)).toContain("Reform UK");
  });

  it("removes the last of a repeated filter altogether", async () => {
    await render(
      <PoliticianFilters search={{ ...emptyPoliticiansSearch, flag: ["important"] }} asks={exampleAsks} parties={[]} />,
    );
    const chip = `${staffCopy.politicians.flag}: ${staffCopy.politicians.flags.important}`;
    expect((await menu(chip)).find(([text]) => text === staffCopy.filters.remove)![1]).toBe("/staff/politicians");
  });
});

describe("LetterFilters", () => {
  it("has a chip for each filter on, and the rest under + Filter", async () => {
    const copy = staffCopy.letters;
    const { filter, ...search } = lettersSearch({ q: "jane", status: "sent", campaign: "support-sobel-bill" });
    void filter;
    await render(<LetterFilters search={search} />);
    await expect.element(page.getByRole("searchbox", { name: copy.search })).toHaveValue("jane");
    expect(chips()).toEqual([
      `${copy.columns.campaign}: ${campaignBySlug("support-sobel-bill")!.title}`,
      `${copy.columns.status}: ${copy.status.sent}`,
    ]);
    const add = await menu(staffCopy.filters.add);
    expect(add[0]).toEqual([
      copy.consent.yes,
      "/staff/letters?status=sent&q=jane&campaign=support-sobel-bill&consent=yes",
    ]);
  });
});

describe("SupporterFilters", () => {
  const copy = staffCopy.supporters;
  const events = [
    { id: "evt-1", name: "Leeds social", startAt: "2026-10-20T18:00:00Z" },
    { id: "evt-2", name: "Oxford talk", startAt: "2026-10-12T18:00:00Z" },
  ];

  it("has a chip for each filter on, a subscription in two halves, its topic then its answer or reason", async () => {
    const { filter, ...search } = supportersSearch({
      activity: "registered",
      contact: ["email:pauseai-updates:no", "!phone:march-day", "email:blocked", "email:site-forms:asked"],
      erased: "1",
    });
    void filter;
    await render(<SupporterFilters search={search} events={events} />);
    const { topics } = copy.subscriptions;
    const answers = copy.detail.permissions.answers;
    expect(chips()).toEqual([
      `${copy.columns.badges}: ${copy.badges.registered}`,
      `${copy.columns.subscriptions}: ${topics.email["pauseai-updates"]}`,
      answers.email.no,
      staffCopy.filters.notChip(copy.columns.subscriptions, topics.phone["march-day"]),
      copy.filters.anyAnswer,
      `${copy.columns.subscriptions}: ${copy.subscriptions.blocked}`,
      // A reason, as an older link has it, is no choice offered: the chip says it as it is.
      `${copy.columns.subscriptions}: email:site-forms:asked`,
    ]);
    // The first half: each topic, choosing one for any answer, then turning it the other way and Remove; the
    // erased notice goes.
    const others = "contact=%21phone%3Amarch-day&contact=email%3Ablocked&contact=email%3Asite-forms%3Aasked";
    const first = await menu(`${copy.columns.subscriptions}: ${topics.email["pauseai-updates"]}`);
    expect(first).toContainEqual([
      topics.email["site-forms"],
      `/staff/supporters?activity=registered&${others}&contact=email%3Asite-forms`,
    ]);
    expect(first.at(-1)![0]).toBe(staffCopy.filters.remove);
    // The second: any answer, then each answer in the topic's words; no Remove.
    const second = await menu(answers.email.no);
    expect(second.map(([words]) => words)).toEqual([
      copy.filters.anyAnswer,
      answers.email.yes,
      answers.email.unsure,
      answers.email.no,
    ]);
    expect(second[1]).toEqual([
      answers.email.yes,
      `/staff/supporters?activity=registered&${others}&contact=email%3Apauseai-updates%3Ayes`,
    ]);
    // A number's answers in the words of the ways its topic allows, kept left out.
    const march = await menu(copy.filters.anyAnswer);
    expect(march[1]).toEqual([
      answers.text.yes,
      "/staff/supporters?activity=registered&contact=email%3Apauseai-updates%3Ano&contact=email%3Ablocked&contact=email%3Asite-forms%3Aasked&contact=%21phone%3Amarch-day%3Ayes",
    ]);
    // + Filter offers the topics not taken, each email beside its phone, each with its channel's icon.
    const add = await menu(staffCopy.filters.add);
    expect(add.map(([words]) => words)).toContain(topics.phone.volunteering);
    expect(add.map(([words]) => words)).not.toContain(topics.email["pauseai-updates"]);
    const volunteering = [...document.querySelectorAll("[popover]:popover-open a")].find(
      (a) => a.textContent === topics.phone.volunteering,
    )!;
    expect(volunteering.querySelector("svg")!.getAttribute("aria-hidden")).toBe("true");
  });

  it("offers every topic once in the Subscriptions filter, ours first, each email beside its phone", () => {
    expect(SUBSCRIPTION_ORDER.map(([channel, topic]) => `${channel}:${topic}`).sort()).toEqual(
      CHANNELS.flatMap((channel) => topicsOf(channel).map((topic) => `${channel}:${topic}`)).sort(),
    );
    expect(SUBSCRIPTION_ORDER[0]).toEqual(["email", "site-forms"]);
  });

  it("offers every filter in the columns' order, events by name and day", async () => {
    const { filter, ...search } = supportersSearch({});
    void filter;
    await render(<SupporterFilters search={search} events={events} />);
    await page.getByRole("button", { name: staffCopy.filters.add }).click();
    expect([...document.querySelectorAll("#filter-add details > summary")].map((p) => p.textContent)).toEqual([
      copy.columns.email,
      copy.columns.phone,
      staffCopy.politician.country,
      copy.filters.near,
      copy.columns.badges,
      copy.columns.subscriptions,
      copy.filters.event,
      copy.filters.campaign,
    ]);
    const links = await menu(staffCopy.filters.add);
    expect(links).toContainEqual([
      copy.filters.eventChoice("Oxford talk", "12 Oct 2026"),
      "/staff/supporters?event=evt-2",
    ]);
    // Except offers the filters that repeat, each choice to leave out.
    await menu(staffCopy.filters.except);
    expect([...document.querySelectorAll("#filter-except details > summary")].map((p) => p.textContent)).toEqual([
      staffCopy.politician.country,
      copy.columns.badges,
      copy.columns.subscriptions,
      copy.filters.event,
    ]);
    expect(await menu(staffCopy.filters.except)).toContainEqual([
      copy.filters.eventChoice("Oxford talk", "12 Oct 2026"),
      "/staff/supporters?event=%21evt-2",
    ]);
  });

  it("has a chip for the events they're at and one, marked, for those they're not", async () => {
    const { filter, ...search } = supportersSearch({ event: ["evt-1", "!evt-2"] });
    void filter;
    await render(<SupporterFilters search={search} events={events} />);
    const leeds = copy.filters.eventChoice("Leeds social", "20 Oct 2026");
    const oxford = copy.filters.eventChoice("Oxford talk", "12 Oct 2026");
    expect(chips()).toEqual([`${copy.filters.event}: ${leeds}`, staffCopy.filters.notChip(copy.filters.event, oxford)]);
    // A chip turns its choice the other way; a choice in a left-out chip stays left out.
    expect(await menu(`${copy.filters.event}: ${leeds}`)).toContainEqual([
      staffCopy.filters.exceptInstead,
      "/staff/supporters?event=%21evt-2&event=%21evt-1",
    ]);
    const out = await menu(staffCopy.filters.notChip(copy.filters.event, oxford));
    expect(out).toContainEqual([staffCopy.filters.onlyInstead, "/staff/supporters?event=evt-1&event=evt-2"]);
    expect(out).toContainEqual([leeds, "/staff/supporters?event=evt-1&event=%21evt-1"]);
    expect(out.at(-1)).toEqual([staffCopy.filters.remove, "/staff/supporters?event=evt-1"]);
  });

  it("says what Near found, or that it found nothing, or couldn't look", async () => {
    const near = (text: string) => {
      const { filter, ...search } = supportersSearch({ near: text, within: "25" });
      void filter;
      return search;
    };
    const { rerender } = await render(
      <SupporterFilters
        search={near("LS1")}
        events={[]}
        near={{ latitude: 53.8, longitude: -1.55, place: "Leeds", country: "england" }}
      />,
    );
    expect(chips()).toEqual([`${copy.filters.near}: Leeds, ${copy.filters.miles(25)}`]);
    await rerender(<SupporterFilters search={near("Atlantis")} events={[]} near={null} />);
    expect(chips()).toEqual([`${copy.filters.near}: ${copy.filters.notFound("Atlantis")}, ${copy.filters.miles(25)}`]);
    await rerender(<SupporterFilters search={near("Leeds")} events={[]} near="failed" />);
    expect(chips()).toEqual([`${copy.filters.near}: ${copy.filters.failed("Leeds")}, ${copy.filters.miles(25)}`]);
  });

  it("joins a campaign and whether they wrote in it", async () => {
    const { filter, ...search } = supportersSearch({ campaign: "support-sobel-bill", wrote: "no" });
    void filter;
    await render(<SupporterFilters search={search} events={[]} />);
    expect(chips()).toEqual([campaignBySlug("support-sobel-bill")!.title, copy.filters.wrote.no]);
  });
});
