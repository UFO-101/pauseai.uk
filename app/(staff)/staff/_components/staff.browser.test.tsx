import { describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";
import { page, userEvent } from "vitest/browser";
import { campaigns } from "@/lib/content/email-your-mp";
import { campaignPath } from "@/lib/email-your-mp";
import { importPath } from "@/lib/import-runs";
import { staffDate } from "@/lib/staff-time";
import { jobTitles, staffCopy } from "@/lib/content/staff-interface";
import type { AnyImportRun, ControlAiImport, MpCheck, MpSync, SignatoryImport } from "@/lib/import-runs";
import type { StaffAccount } from "@/lib/server/staff-accounts";
import ChangesTable from "./ChangesTable";
import EmailBlockFilters from "./EmailBlockFilters";
import EmailBlocksTable from "./EmailBlocksTable";
import { exampleBlock, exampleComplaint, exampleProblems } from "./EmailBlocksTable.examples";
import EmailProblemsTable from "./EmailProblemsTable";
import { exampleChanges } from "./ChangesTable.examples";
import LettersTable from "./LettersTable";
import { exampleLetter } from "./LettersTable.examples";
import JobActions from "./JobActions";
import LoginCard from "./LoginCard";
import LoginForm from "./LoginForm";
import PoliticianDetails from "./PoliticianDetails";
import PoliticianFilters from "./PoliticianFilters";
import PoliticianForm from "./PoliticianForm";
import PoliticianTable from "./PoliticianTable";
import { examplePolitician, examplePoliticianHistory } from "./PoliticianTable.examples";
import ResultBox, { OPEN_UP_TO } from "./ResultBox";
import { ImportJobPage, ImportOverview } from "./ImportJob";
import RunList from "./RunList";
import {
  exampleAppliedSync,
  exampleControlAiResult,
  exampleFailedRun,
  exampleHeldSync,
  exampleLumaResult,
  exampleMembersResult,
  exampleRun,
  exampleSyncedMp,
} from "./RunList.examples";
import StaffNav from "./StaffNav";
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
import ImportCard, { ImportCards } from "./ImportCard";
import DevLogin from "./DevLogin";
import KeepSignedIn from "./KeepSignedIn";
import RemoveAccountForm from "./RemoveAccountForm";
import SortHeading from "./SortHeading";
import StaffAccountsTable from "./StaffAccountsTable";
import EraseForm from "./EraseForm";
import ErasedNotice from "./ErasedNotice";
import SubscriptionBadges from "./SubscriptionBadges";
import SupporterBadges from "./SupporterBadges";
import SupporterDetails from "./SupporterDetails";
import SupporterFilters from "./SupporterFilters";
import LetterFilters from "./LetterFilters";
import SupportersTable from "./SupportersTable";
import {
  exampleBlockedPermissions,
  exampleMemberDetails,
  exampleSupporter,
  exampleSupporterRows,
  exampleSupporterDetails,
} from "./SupportersTable.examples";
import EmailPermissionTiles from "./EmailPermissionTiles";
import type { EmailReason, EmailTopic } from "@/lib/email-permissions";
import { lettersSearch, supportersSearch } from "@/lib/staff-search";
import Table from "@/components/ui/Table";

const [pm, bill] = campaigns;

const MP = examplePolitician;
const ran = exampleRun;
const failed = exampleFailedRun;
const AT = "2026-10-15 02:00";

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
    await expect.element(page.getByRole("button")).not.toBeInTheDocument();
  });

  it("groups the pages by permission, marks the current one but keeps it a link, says who's logged in, and logs out with a POST", async () => {
    await render(<StaffNav email="jo@pauseai.uk" permissions={["admin"]} current="politicians" />);
    // The title is the way home, except at home.
    await expect.element(page.getByRole("link", { name: staffCopy.nav.title })).toHaveAttribute("href", "/staff");
    // The sidebar is for wider screens than the test's, so it's read from the DOM.
    const nav = document.querySelector("nav")!;
    expect(nav.querySelector("span[class*=who]")!.textContent).toBe("jo@pauseai.uk");
    // Home leads the list, a link like the rest.
    expect(nav.querySelector('a[href="/staff"]:not([class])')!.textContent).toBe(staffCopy.nav.home);
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
      `FirefoxLinux2026-10-22 09:002026-10-23 09:00${copy.kept.no}${copy.thisBrowser}${staffCopy.nav.logout}`,
      `${copy.unknown}${copy.unknown}2026-10-20 08:002026-11-21 08:00${copy.kept.yes}${staffCopy.nav.logout}`,
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
      `${copy.actions.failedImport(jobTitles["import-controlai"])}${copy.actions.failedImportDetail("No PDF linked", "2026-10-21 02:00")}${copy.actions.seeRun}`,
    ]);
    await expect
      .element(page.getByRole("link", { name: copy.actions.decide }))
      .toHaveAttribute("href", "/staff/import-data/mps");
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
    expect(tileLink(copy.metrics.mpsSigned(5))?.getAttribute("href")).toBe("/staff/politicians");

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
    await render(<Sparkline values={values} labels={labels} name="Registrations" />);
    const chart = page.getByRole("img", { name: "Registrations" });
    await expect.element(chart).toBeVisible();
    const circles = chart.element().querySelectorAll("circle");
    expect(circles).toHaveLength(8);
    expect([...circles].filter((circle) => /marked/.test(circle.getAttribute("class") ?? ""))).toHaveLength(1);
    expect(circles[7].getAttribute("class")).toMatch(/marked/);
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
    const { rerender } = await render(<Sparkline values={[5]} labels={["Only: 5"]} name="One" />);
    const points = () => page.getByRole("img").element().querySelector("polyline")!.getAttribute("points")!;
    expect(points()).not.toMatch(/NaN/);
    await rerender(<Sparkline values={[2, 2, 2]} labels={["a", "b", "c"]} name="Flat" />);
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
    const { rerender } = await render(<Sparkline values={[50, 100]} labels={["a", "b"]} name="High" />);
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
    await rerender(<Sparkline values={[0, 0]} labels={["a", "b"]} name="None" />);
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
      `2026-10-20 09:00 ${copy.addedBy("admin@pauseai.uk")}`,
      copy.never,
      copy.never,
      "0",
    ]);
    expect(row("sam@pauseai.uk").slice(2, 6)).toEqual([
      `2026-10-21 10:30 ${copy.addedByLogin}`,
      "2026-10-21 10:30",
      "2026-10-21 11:00",
      "1",
    ]);
  });

  it("ends an account's sessions from its row, only where it has some, warning on your own row that it ends yours", async () => {
    const { end } = await renderTable();
    const form = (email: string) => page.getByRole("form", { name: `${staffCopy.accounts.endSessions}: ${email}` });
    await expect.element(form("jo@pauseai.uk")).not.toBeInTheDocument();
    await expect.element(form("admin@pauseai.uk").getByText(staffCopy.accounts.endsYours)).toBeVisible();
    await expect.element(form("sam@pauseai.uk").getByText(staffCopy.accounts.endsYours)).not.toBeInTheDocument();
    await form("sam@pauseai.uk").getByRole("button").click();
    await vi.waitFor(() => expect(end.sent).toEqual([{ email: "sam@pauseai.uk" }]));
  });

  it("lists every account, centred in its row, with its boxes, a Remove at the right, and a key to the permissions", async () => {
    const { remove } = await renderTable();
    const cell = page.getByRole("cell", { name: "2026-10-22 08:00", exact: true });
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
    const heading = page.getByRole("heading", { level: 2, name: "An import Hourly" });
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
    markSigned: vi.fn(),
    letters: { senders: false as const, letters: [] },
    history: [],
    airtableTable: "https://airtable.com/app/tbl",
  };

  it("heads the page with their name, a card of what's known beside one of campaigns, and edits a signer the team added", async () => {
    const { fn } = action();
    await render(
      <PoliticianDetails
        politician={{ ...MP, airtableId: null, email: null }}
        action={fn}
        unblock={vi.fn()}
        {...none}
      />,
    );
    await expect.element(page.getByRole("heading", { level: 1, name: MP.name })).toBeVisible();
    const facts = page.getByRole("definition").all();
    expect(facts.map((d) => d.element().textContent)).toEqual([
      MP.constituency,
      MP.party,
      staffCopy.politicians.noEmail,
      staffCopy.politician.sources.staff,
    ]);
    await expect.element(page.getByRole("region", { name: staffCopy.politician.statusesTitle })).toBeVisible();
    await expect.element(page.getByText(staffCopy.politician.noHistory)).toBeVisible();
    await expect.element(page.getByRole("button", { name: staffCopy.politician.save })).toBeVisible();
  });

  it("sends Airtable's MPs to Airtable, and lets no one edit a test MP; each says where they came from", async () => {
    const { fn } = action();
    for (const [politician, source] of [
      [MP, staffCopy.politician.sources.airtable],
      [{ ...MP, airtableId: null, isTest: true }, staffCopy.politician.sources.test],
    ] as const) {
      const { unmount } = await render(
        <PoliticianDetails politician={politician} action={fn} unblock={vi.fn()} {...none} />,
      );
      // An MP from Airtable: the source links to their own record there. A test MP has none, and no link.
      const record = page.getByRole("link", { name: source, exact: true });
      if (politician.airtableId) {
        await expect.element(record).toHaveAttribute("href", `https://airtable.com/app/tbl/${politician.airtableId}`);
        await expect.element(record).toHaveAttribute("target", "_blank");
        await expect
          .element(page.getByRole("definition").filter({ hasText: staffCopy.politician.editInAirtable }))
          .toBeVisible();
      } else {
        await expect.element(record).not.toBeInTheDocument();
        await expect.element(page.getByText(source)).toBeVisible();
      }
      await expect
        .element(page.getByRole("heading", { name: staffCopy.politician.detailsTitle }))
        .not.toBeInTheDocument();
      await expect.element(page.getByRole("button", { name: staffCopy.politician.save })).not.toBeInTheDocument();
      expect(page.getByRole("heading", { level: 1 }).element().textContent).toBe(
        politician.isTest ? `${MP.name}${staffCopy.politicians.testMp}` : MP.name,
      );
      await unmount();
    }
  });

  it("says under their name what they are: in which house, for where, and if they no longer sit", async () => {
    const { roles, role } = staffCopy.politician;
    for (const [politician, words] of [
      [MP, role(roles.commons, MP.constituency, true)],
      [{ ...MP, house: "lords", constituency: null }, role(roles.lords, null, true)],
      [{ ...MP, sitting: false }, role(roles.commons, MP.constituency, false)],
    ] as const) {
      const { unmount } = await render(
        <PoliticianDetails politician={politician} action={vi.fn()} unblock={vi.fn()} {...none} />,
      );
      await expect.element(page.getByText(words, { exact: true })).toBeVisible();
      await unmount();
    }
  });

  it("tells one history of the letters to them, the replies, and what the audit log says about them, newest first", async () => {
    // A peer: no constituency, so no line for it; a status with a note, and one for a campaign and status nobody knows.
    const peer = {
      ...MP,
      constituency: null,
      statuses: {
        ...MP.statuses,
        [MP.statuses[pm.slug] ? pm.slug : "never"]: { ...MP.statuses[pm.slug], note: "Told us at the march" },
        gone: { status: "odd", date: null, note: "", updatedAt: "2026-10-02T10:00:00Z", updatedBy: "jo@pauseai.uk" },
      },
    } as unknown as typeof MP;
    await render(
      <PoliticianDetails
        airtableTable="https://airtable.com/app/tbl"
        politician={peer}
        action={vi.fn()}
        markSigned={vi.fn()}
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
          { id: 6, at: "2026-08-10T10:00:00Z", actor: "postmark", action: "block address", details: { kind: "weird" } },
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
    expect(facts.map((d) => d.element().textContent)).toEqual([
      MP.party,
      MP.email,
      `${staffCopy.politician.sources.airtable}${staffCopy.politician.editInAirtable}`,
    ]);
    // Each status is in the campaigns card, a campaign no longer run by its slug.
    expect(page.getByRole("group", { name: "gone" }).element().textContent).toContain("odd");
    // The sender leads to their supporter once they're one; the letters and replies sit among the audit log's entries by time.
    await expect
      .element(page.getByRole("link", { name: exampleLetter.senderName }))
      .toHaveAttribute("href", "/staff/supporters/7");
    await expect.element(page.getByRole("link", { name: "Anon Writer" })).not.toBeInTheDocument();
    const statusLine = (words: { before: string; after: string }, campaign: string) =>
      `${words.before}${campaign}${words.after}`;
    const history = page.getByRole("list", { name: staffCopy.politician.historyTitle }).getByRole("listitem").all();
    const copy = staffCopy.politician.history;
    expect(history.map((item) => item.element().textContent)).toEqual([
      `2026-10-15 09:00${copy["letter-replied"]} Anon Writer · ${pm.title}`,
      `2026-10-14 09:30${copy["unblock address"]} Fixed in Airtable · jo@pauseai.uk`,
      `2026-10-13 08:00${copy.letter} Anon Writer · ${pm.title} · ${staffCopy.letters.status.sent}`,
      `2026-10-12 09:10${copy["block address"]} ${staffCopy.emails.kinds.hard} · postmark`,
      `2026-10-12 09:00${copy.letter} ${exampleLetter.senderName} · ${pm.title} · ${staffCopy.letters.status.bounced}`,
      `2026-10-02 10:00${statusLine(staffCopy.politician.statusSet(staffCopy.statuses.signed), pm.title)}, 2026-10-01 · Told us at the march · jo@pauseai.uk`,
      `2026-09-30 10:00${copy["edit politician"]} Polly Placeholder · polly.placeholder.mp@parliament.uk · sam@pauseai.uk`,
      `2026-09-01 10:00${statusLine(staffCopy.politician.statusCleared, "gone")} · jo@pauseai.uk`,
      `2026-08-15 10:00${statusLine(staffCopy.politician.statusSet("odd"), pm.title)} · jo@pauseai.uk`,
      `2026-08-10 10:00${copy["block address"]} weird · postmark`,
      "2026-08-01 10:00strange  · x",
      `2026-07-20 10:00${copy["edit politician"]} Polly Placeholder · ${staffCopy.fields.party} Labour → Labour (Co-op) · sync`,
      `2026-07-15 10:00${copy["add politician"]} Polly Placeholder · import`,
      `2026-07-01 08:00${copy.letter} Old Writer · old-campaign · queued`,
    ]);
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
        action={vi.fn()}
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
      `2026-10-15 09:00${copy["unsigned-letter-replied"]} · ${pm.title}`,
      `2026-10-13 08:00${copy.unsignedLetter} · ${pm.title} · ${staffCopy.letters.status.sent}`,
      `2026-07-01 08:00${copy.unsignedLetter} · old-campaign · queued`,
    ]);
    expect(list.element().querySelector('a[href^="/staff/"]')).toBeNull();
  });

  it("gives each campaign a row in the campaigns card: its status as a strip, who set it, and the button where staff record it", async () => {
    const { fn, sent } = action();
    await render(
      <PoliticianDetails
        {...none}
        politician={{
          ...MP,
          statuses: {
            ...MP.statuses,
            "old-campaign": { ...MP.statuses[pm.slug], date: null, note: "Kept" },
          },
        }}
        markSigned={fn}
        action={vi.fn()}
        unblock={vi.fn()}
      />,
    );
    const row = (title: string) => page.getByRole("group", { name: title });
    const pmRow = row(pm.title);
    expect(pmRow.element().textContent).toContain(`${staffCopy.statuses.signed}, 1 Oct 2026`);
    await expect
      .element(pmRow.getByText(staffCopy.politician.setBy("jo@pauseai.uk", "2 Oct 2026"), { exact: false }))
      .toBeVisible();
    await expect
      .element(pmRow.getByRole("link", { name: staffCopy.politician.campaignPage }))
      .toHaveAttribute("href", campaignPath(pm));
    // Signed: a green strip.
    expect(pmRow.element().querySelector("[class*=green]")).not.toBeNull();
    // The bill's status isn't set by hand: no button, and its strip says why; not signed, a plain strip.
    const billRow = row(bill.title);
    await expect.element(billRow.getByText(staffCopy.statuses.none)).toBeVisible();
    await expect.element(billRow.getByText(staffCopy.politician.fromControlAi)).toBeVisible();
    expect(billRow.getByRole("button").all()).toHaveLength(0);
    expect(billRow.element().querySelector("[class*=green]")).toBeNull();
    // A campaign no longer run: its status, by its slug, with no button and no link.
    const old = row("old-campaign");
    expect(old.element().textContent).toContain(`${staffCopy.statuses.signed}Kept · `);
    expect(old.getByRole("button").all()).toHaveLength(0);
    expect(old.getByRole("link").all()).toHaveLength(0);

    await pmRow.getByRole("button", { name: staffCopy.politicians.unmarkSigned }).click();
    await vi.waitFor(() => expect(sent).toHaveLength(1));
    expect(sent[0]).toEqual({ politicianId: "7", campaign: pm.slug, signed: "" });
  });

  it("offers to mark them signed where they haven't", async () => {
    const { fn, sent } = action();
    await render(
      <PoliticianDetails
        {...none}
        politician={{ ...MP, statuses: {} }}
        markSigned={fn}
        action={vi.fn()}
        unblock={vi.fn()}
      />,
    );
    await page
      .getByRole("group", { name: pm.title })
      .getByRole("button", { name: staffCopy.politicians.markSigned })
      .click();
    await vi.waitFor(() => expect(sent).toHaveLength(1));
    expect(sent[0]).toEqual({ politicianId: "7", campaign: pm.slug, signed: "1" });
  });

  it("says in one place that letters aren't being sent, why, what to check, and unblocks it with a note", async () => {
    const { fn, sent } = action();
    const { rerender } = await render(
      <PoliticianDetails
        politician={{ ...MP, emailBlocked: true }}
        action={vi.fn()}
        block={{ ...exampleBlock, address: MP.email! }}
        unblock={fn}
        {...none}
      />,
    );
    const copy = staffCopy.politician.blocked;
    expect(page.getByRole("heading", { level: 1 }).element().textContent).toBe(MP.name);
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
      `${copy.why.before}${MP.email}${copy.why.after(exampleBlock.reason, "2026-10-12 09:10")}`,
    );
    expect(notice.element().querySelector("p strong")!.textContent).toBe(MP.email);
    // The example's reason ends in a full stop, so the sentence doesn't add a second.
    expect(notice.element().querySelector("p")!.textContent).not.toContain("..");
    await expect.element(notice.getByRole("heading", { name: copy.wrong.title })).toBeVisible();
    await expect
      .element(notice.getByRole("link", { name: copy.wrong.link }))
      .toHaveAttribute("href", "/staff/import-data/mps");
    // The address is in bold in the strip, and in the facts it's just the address.
    expect(
      page
        .getByText(MP.email!, { exact: true })
        .all()
        .map((el) => el.element().tagName),
    ).toEqual(["STRONG", "DD"]);
    await page.getByLabelText(staffCopy.emails.note).fill("Fixed in Airtable");
    await page.getByRole("button", { name: staffCopy.emails.unblock }).click();
    await vi.waitFor(() => expect(sent).toEqual([{ address: MP.email, note: "Fixed in Airtable" }]));

    // An MP not from Airtable: correcting the address links to the table, as they have no record in it.
    await rerender(
      <PoliticianDetails
        politician={{ ...MP, airtableId: null, emailBlocked: true }}
        action={vi.fn()}
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
        action={vi.fn()}
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
    expect(complaint.getByRole("cell").last().element().textContent).toBe("");
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

describe("EmailBlockFilters", () => {
  it("is a GET form to its page, filled in with the current filter", async () => {
    await render(<EmailBlockFilters kind="complaint" action="/staff/politicians/blocked-emails" />);
    await expect.element(page.getByRole("combobox")).toHaveValue("complaint");
    const form = page.getByRole("combobox").element().closest("form")!;
    expect(form.getAttribute("method")).toBe("get");
    expect(form.getAttribute("action")).toBe("/staff/politicians/blocked-emails");
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
      ran("check-mps", { problems: [] }, { at: "2026-10-21T01:00:00Z", status: "ok" }),
      failed("import-controlai", "No PDF linked", { at: "2026-10-21T02:00:00Z" }),
      undefined,
    ];
    await render(<ImportOverview newest={newest} airtableTable="https://airtable.com/table" />);
    await expect.element(page.getByRole("heading", { level: 1, name: staffCopy.import.pageTitle })).toBeVisible();
    const cards = [...document.querySelectorAll("section")];
    expect(cards.map((card) => card.querySelector("h2 a")!.getAttribute("href"))).toEqual([
      "/staff/import-data/luma",
      "/staff/import-data/members",
      "/staff/import-data/mps",
      "/staff/import-data/mp-check",
      "/staff/import-data/controlai",
      "/staff/import-data/signatories",
    ]);
    expect(cards.map((card) => card.querySelector("h2 a")!.textContent)).toEqual([
      jobTitles["import-luma"],
      jobTitles["import-members"],
      jobTitles["sync-mps"],
      jobTitles["check-mps"],
      jobTitles["import-controlai"],
      jobTitles["import-signatories"],
    ]);
    // Under the name, how the newest run ended, tinted to match.
    const status = (i: number) => cards[i].querySelector("h2 + div > div")!;
    expect(status(0).textContent).toBe(`${staffCopy.runs.status.incomplete}2026-10-21 11:17`);
    expect([0, 1, 2, 3, 4].map((i) => status(i).className.match(/green|amber|red/)?.[0])).toEqual([
      "amber",
      "green",
      "amber",
      "green",
      "red",
    ]);
    expect(status(5).textContent).toBe(staffCopy.import.none);
    expect(status(5).className).not.toMatch(/green|amber|red/);
    // The Airtable jobs link the table they read; the MP import also says the test MPs stay.
    expect(cards[2].querySelector(":scope > p a")!.getAttribute("href")).toBe("https://airtable.com/table");
    expect(cards[2].querySelector(":scope > p")!.textContent).toContain(staffCopy.syncs.testMps);
    expect(cards[5].querySelector(":scope > p a")!.getAttribute("href")).toBe("https://airtable.com/table");
    expect(cards[3].querySelector(":scope > p")!.textContent).not.toContain(staffCopy.syncs.testMps);
    // The members come from the join form.
    expect(cards[1].querySelector(":scope > p a")!.getAttribute("href")).toBe("https://pauseai.info/join");
  });

  it("shows an applied run in green, and one that changed nothing or was discarded plainly", async () => {
    const discarded = ran("sync-mps", { changes: { added: [], removed: [], changed: [] } }, { status: "discarded" });
    const unchanged = ran("import-luma", exampleLumaResult, { status: "unchanged" });
    const { rerender } = await render(
      <ImportOverview newest={[unchanged, undefined, exampleAppliedSync, undefined, undefined]} airtableTable="x" />,
    );
    const status = (i: number) => document.querySelectorAll("section")[i].querySelector("h2 + div > div")!.className;
    expect(status(0)).not.toMatch(/green|amber|red/);
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
        "sync-mps",
        { changes: { added: [], removed: [], changed: [] } },
        { id: 1, at: "2026-10-11T01:00:00Z", status: "unchanged" },
      ),
    ];
    const { rerender } = await render(
      <ImportJobPage job="sync-mps" runs={runs} run={run} decide={fn} airtableTable="https://airtable.com/table" />,
    );
    await expect
      .element(page.getByRole("navigation", { name: staffCopy.import.pageTitle }).getByRole("link"))
      .toHaveAttribute("href", "/staff/import-data");
    expect(page.getByRole("heading", { level: 1 }).element().textContent).toBe(
      `${jobTitles["sync-mps"]}${staffCopy.import.airtable}${staffCopy.import.nightly}`,
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

describe("PoliticianTable headings", () => {
  it("sort the list, the current one marked, reversing on a second click", async () => {
    await render(
      <PoliticianTable
        politicians={[MP]}
        search={{ q: "x", house: "", campaign: "", email: "", sort: "party", dir: "asc" }}
      />,
    );
    const party = page.getByRole("link", { name: staffCopy.fields.party });
    await expect.element(party).toHaveAttribute("href", "/staff/politicians?q=x&sort=party&dir=desc");
    expect(party.element().closest("th")!.getAttribute("aria-sort")).toBe("ascending");
    await expect
      .element(page.getByRole("link", { name: staffCopy.fields.name }))
      .toHaveAttribute("href", "/staff/politicians?q=x&sort=name&dir=asc");
  });
});

describe("PoliticianTable", () => {
  it("lists each politician with their status for each campaign, and no buttons", async () => {
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
    // The counts of letters and replies, each heading a sort.
    const pollyRow = page.getByRole("row").filter({ hasText: "Polly Placeholder" });
    expect(
      pollyRow
        .getByRole("cell")
        .all()
        .map((c) => c.element().textContent)
        .slice(4, 6),
    ).toEqual(["4", "1"]);
    await expect
      .element(page.getByRole("link", { name: staffCopy.politicians.columns.replies }))
      .toHaveAttribute("href", "/staff/politicians?sort=replies&dir=desc");

    // Polly has signed the letter to the PM, with the date; the test MP hasn't. Each is changed on their page.
    const pmColumn = 6;
    const cell = (name: string) =>
      page.getByRole("row").filter({ hasText: name }).getByRole("cell").all()[pmColumn].element();
    expect(cell("Polly Placeholder").textContent).toBe(`${staffCopy.statuses.signed} 2026-10-01`);
    expect(getComputedStyle(cell("Polly Placeholder")).whiteSpace).toBe("nowrap");
    expect(cell("Testy McTestface MP").textContent).toBe(staffCopy.statuses.none);

    // The bill's column says who signed ControlAI's letter.
    await expect.element(page.getByText(staffCopy.politicians.signedControlAi)).toBeVisible();
    expect(page.getByRole("button").all()).toHaveLength(0);
  });

  it("says when nobody matches", async () => {
    await render(<PoliticianTable politicians={[]} />);
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
    await expect
      .element(second)
      .toHaveTextContent(`${staffCopy.runs.status.failed} ${AT} · ${staffCopy.runs.error("AIRTABLE_TOKEN isn't set")}`);
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
        `${staffCopy.runs.status.ok} ${AT} · ${staffCopy.import.nightly} · ${staffCopy.members.result(exampleMembersResult)}`,
      );
    await expect
      .element(second)
      .toHaveTextContent(
        `${staffCopy.runs.status.failed} ${AT} · ${staffCopy.import.nightly} · ${staffCopy.runs.error("Airtable answered 503")}`,
      );
  });

  it("says how many pages of contacts a Luma run read, and that the contacts are still being read", async () => {
    await render(
      <RunList
        runs={[ran("import-luma", { ...exampleLumaResult, contactPages: 10, contactsPassGoing: true }, { id: 1 })]}
        none="None"
      />,
    );
    const [run] = page.getByRole("status").all();
    expect(run.element().textContent).toContain(
      `${staffCopy.luma.result(exampleLumaResult)} ${staffCopy.luma.contactPages(10)} ${staffCopy.luma.contactsPassGoing}`,
    );
    expect(run.element().textContent).toMatch(new RegExp(`^${staffCopy.runs.status.incomplete} `));
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
        `${staffCopy.runs.status.ok} ${AT} · ${staffCopy.import.nightly} · ${staffCopy.luma.result(luma)}`,
      );
    expect(first.element().textContent).not.toContain(staffCopy.luma.stoppedBy.time);
    expect(first.element().textContent).not.toContain(staffCopy.runs.status.incomplete);
    await expect
      .element(second)
      .toHaveTextContent(
        `${staffCopy.runs.status.failed} ${AT} · ${staffCopy.import.nightly} · ${staffCopy.runs.error("Luma answered 500")}`,
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
        `${staffCopy.runs.status.incomplete} ${AT} · ${staffCopy.import.nightly} · ${staffCopy.luma.result(exampleLumaResult)} ${staffCopy.luma.stoppedBy["rate-limit"]}`,
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
  it("lists who changed what, when on one line, and every field each logged, in words, linked where there's a page", async () => {
    await render(<ChangesTable changes={exampleChanges} airtableTable="https://airtable.com/app/tbl" />);
    const copy = staffCopy.changes;
    const fields = staffCopy.fields;
    const labels = copy.labels;
    const rows = page.getByRole("row").all().slice(1);
    expect(getComputedStyle(rows[0].element().querySelector("td")!).whiteSpace).toBe("nowrap");
    expect(rows[0].element().children[1].textContent).toBe("jo@pauseai.uk");
    const details = rows.map((row) => row.element().children[3].textContent);
    const signed = staffCopy.politician.statusSet(staffCopy.statuses.signed);
    const cleared = staffCopy.politician.statusCleared;
    const odd = staffCopy.politician.statusSet("odd");
    const count = (n: number, key: string) => `${n} ${copy.counts[key]}`;
    expect(details).toEqual([
      `Polly Placeholder · ${signed.before}${pm.title}${signed.after}, 2026-10-01 · ${labels.note} By email`,
      `${copy.gone("99")} · ${cleared.before}gone-campaign${cleared.after}`,
      `Polly Placeholder · ${labels.airtableId} recPolly · ${fields.party} Labour → Independent · ${fields.email} ${copy.empty} → polly@example.org`,
      `Polly Placeholder · ${labels.airtableId} recPolly · ${fields.house} ${staffCopy.houses.commons} · ${fields.salutation} Ms Placeholder · ${fields.constituency} Ipswich · ${fields.party} Labour`,
      "Old MP",
      `polly@example.org · ${labels.kind} ${staffCopy.emails.kinds.hard}`,
      `polly@example.org · ${labels.note} Fixed in Airtable`,
      "Jane Example",
      copy.gone("4"),
      `${copy.gone("5")} · ${labels.reference} ICO-12 · ${count(1, "lumaUsers")} · ${count(2, "letters")} · ${count(0, "members")}`,
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
    ]);
    const href = (i: number) => rows[i].element().children[3].querySelector("a")?.getAttribute("href");
    expect([0, 1, 4, 7, 8, 14].map(href)).toEqual([
      "/staff/politicians/7",
      undefined,
      undefined,
      "/staff/supporters/3",
      "/staff/supporters/4",
      importPath("sync-mps"),
    ]);
    // The Airtable ID leads to the record, in a new tab.
    const record = rows[2].getByRole("link", { name: "recPolly" });
    await expect.element(record).toHaveAttribute("href", "https://airtable.com/app/tbl/recPolly");
    await expect.element(record).toHaveAttribute("target", "_blank");
  });

  it("opens each entry's details as logged from a button at the right", async () => {
    await render(<ChangesTable changes={exampleChanges.slice(4, 5)} airtableTable="https://airtable.com/app/tbl" />);
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
            contactConsent: false,
            repliedAt: "2026-10-13T09:00:00Z",
            events: [{ at: letter.createdAt, status: "strange", details: {} }],
          },
        ]}
      />,
    );
    await expect.element(page.getByText("jane@example.com").first()).toBeInTheDocument();
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

describe("LetterFilters", () => {
  const copy = staffCopy.letters;

  it("is a GET form to the letters, with each filter as typed", async () => {
    const { filter, ...search } = lettersSearch({ q: "jane", status: "sent", answered: "no" });
    void filter;
    await render(<LetterFilters search={search} />);
    const box = page.getByRole("searchbox", { name: copy.search });
    await expect.element(box).toHaveValue("jane");
    const form = box.element().closest("form")!;
    expect(form.getAttribute("method")).toBe("get");
    expect(form.getAttribute("action")).toBe("/staff/letters");
    await expect.element(page.getByRole("combobox", { name: copy.columns.status })).toHaveValue("sent");
    await expect.element(page.getByRole("combobox", { name: copy.columns.replied })).toHaveValue("no");
  });
});

describe("SupporterFilters", () => {
  it("sends no sort when the list has its default one", async () => {
    await render(<SupporterFilters search={supportersSearch({})} />);
    const form = page.getByRole("searchbox", { name: staffCopy.supporters.filters.search }).element().closest("form")!;
    expect(new FormData(form).has("sort")).toBe(false);
    expect(new FormData(form).has("dir")).toBe(false);
  });

  it("is a GET form to the list, with each filter as typed", async () => {
    await render(
      <SupporterFilters
        search={supportersSearch({
          q: "jane",
          source: "luma",
          active: "90",
          registered: "1",
          sort: "name",
          dir: "desc",
        })}
      />,
    );
    const copy = staffCopy.supporters.filters;
    const search = page.getByRole("searchbox", { name: copy.search });
    await expect.element(search).toHaveValue("jane");
    const form = search.element().closest("form")!;
    expect(form.getAttribute("method")).toBe("get");
    expect(form.getAttribute("action")).toBe("/staff/supporters");
    await expect.element(page.getByRole("combobox", { name: copy.source })).toHaveValue("luma");
    await expect.element(page.getByRole("combobox", { name: copy.active })).toHaveValue("90");
    // The headings sort; filtering keeps their sort.
    expect(new FormData(form).get("sort")).toBe("name");
    expect(new FormData(form).get("dir")).toBe("desc");
    await expect.element(page.getByRole("combobox", { name: copy.events })).toHaveValue("1");
    await expect.element(page.getByRole("combobox", { name: copy.lists })).toHaveValue("");
  });
});

describe("SubscriptionBadges", () => {
  const copy = staffCopy.supporters.subscriptions;

  it("shows each topic we'd email them about, amber when we can't be sure, and nothing for a no", async () => {
    const { rerender } = await render(<SubscriptionBadges permissions={exampleSupporterRows[0].permissions} />);
    expect(document.body.textContent!.trim()).toBe(copy.topics["events-and-ways-to-help"]);
    await rerender(<SubscriptionBadges permissions={exampleSupporterRows[1].permissions} />);
    await expect.element(page.getByText(copy.unsure(copy.topics["luma-calendar"]))).toBeVisible();
    await expect.element(page.getByText(copy.unsure(copy.topics["pauseai-updates"]))).toBeVisible();
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
    expect(document.body.textContent!.trim()).toBe(copy.topics["luma-calendar"]);
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
  it("lists each supporter with a link to their page, their emails, badges and dates, and pages", async () => {
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
    await expect.element(page.getByText(copy.count(120, 2, 3))).toBeVisible();
    await expect
      .element(page.getByRole("link", { name: "Jane Example" }))
      .toHaveAttribute("href", "/staff/supporters/7");
    await expect.element(page.getByRole("link", { name: copy.noName })).toHaveAttribute("href", "/staff/supporters/8");
    await expect.element(page.getByText(copy.moreEmails(1))).toBeVisible();
    await expect.element(page.getByText(copy.subscriptions.blocked)).toBeVisible();
    await expect.element(page.getByRole("cell", { name: "1 Mar 2026" }).first()).toBeVisible();
    await expect
      .element(page.getByRole("link", { name: staffCopy.paging.previous }))
      .toHaveAttribute("href", "/staff/supporters?q=j");
    await expect
      .element(page.getByRole("link", { name: staffCopy.paging.next }))
      .toHaveAttribute("href", "/staff/supporters?q=j&page=3");
  });

  it("sorts by a heading, reversing when clicked again, and marks the current one", async () => {
    const copy = staffCopy.supporters;
    await render(
      <SupportersTable
        search={supportersSearch({ source: "luma", sort: "events", dir: "desc" })}
        page={{ supporters: [exampleSupporterRows[0]], total: 1, pages: 1 }}
      />,
    );
    const events = page.getByRole("link", { name: copy.columns.events });
    await expect.element(events).toHaveAttribute("href", "/staff/supporters?source=luma&sort=events&dir=asc");
    expect(events.element().closest("th")!.getAttribute("aria-sort")).toBe("descending");
    await expect
      .element(page.getByRole("link", { name: copy.columns.name }))
      .toHaveAttribute("href", "/staff/supporters?source=luma&sort=name&dir=asc");
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
      .element(page.getByText(`(${copy.detail.from(copy.sources.luma, "1 Mar 2026")})`, { exact: false }))
      .toBeVisible();
    await expect.element(page.getByText("+447700900001", { exact: false })).toBeVisible();
    await expect.element(page.getByText("M1 1AE", { exact: false })).toBeVisible();
    expect(page.getByRole("table").all()).toHaveLength(0);
    // Beside the facts, whether we'd email her about each topic.
    const subscriptions = page.getByRole("region", { name: copy.detail.listsTitle });
    await expect
      .element(
        subscriptions.getByText(copy.detail.permissions.reasons["luma-calendar"].unsubscribed("12 Oct 2026"), {
          exact: false,
        }),
      )
      .toBeVisible();
    await expect.element(page.getByText("1 Mar 2026", { exact: true })).toBeVisible();
    // The history: what, linked, with a status only when it isn't approved.
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
              source: "letter",
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
          contacts: [
            {
              source: "letter",
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
        page.getByText(`(${copy.detail.from(`${copy.sources.letter}, ${copy.sources.luma}`, "20 Sept 2026")})`, {
          exact: false,
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
              source: "letter",
              at: "2026-01-03T00:00:00Z",
              kind: "letter",
              title: "gone-campaign",
              detail: "An MP",
              href: null,
              status: "sent",
            },
            {
              source: "letter",
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
    await expect.element(page.getByText(`(${copy.sources.luma})`, { exact: false })).toBeVisible();
    await expect.element(page.getByText("Thing", { exact: false })).toBeVisible();
    await expect.element(page.getByText(copy.detail.statuses.waitlist, { exact: false })).toBeVisible();
    await expect.element(page.getByText("other-list", { exact: false })).toBeVisible();
    await expect.element(page.getByText("gone-campaign", { exact: false })).toBeVisible();
  });

  it("shows the city of their newest event only when they gave none, and none from an event without one", async () => {
    const copy = staffCopy.supporters;
    // Jane gave no city; her newest event was in Manchester.
    const { rerender } = await render(<SupporterDetails supporter={exampleSupporterDetails} />);
    await expect
      .element(page.getByText(`Manchester (${copy.detail.fromEvent("20 Sept 2026")})`, { exact: true }))
      .toBeVisible();
    const [letter, luma] = exampleSupporterDetails.contacts;
    await rerender(
      <SupporterDetails supporter={{ ...exampleSupporterDetails, contacts: [letter, { ...luma, city: null }] }} />,
    );
    expect(page.getByText(copy.detail.city, { exact: true }).all()).toHaveLength(0);
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
            { source: "letter", email: "jane@example.com", name: "Jane", seenAt: "2026-10-05T09:00:00Z" },
            { source: "luma", email: "jane@example.com", name: "Jane", seenAt: "2026-03-01T10:00:00Z" },
            { source: "luma", email: "jane@example.com", name: "Jane", seenAt: null },
            { source: "letter", email: "old@example.com", name: "Jane", seenAt: null },
          ],
          contacts: [],
          activity: [],
        }}
      />,
    );
    await expect
      .element(
        page.getByText(`(${copy.detail.from(`${copy.sources.letter}, ${copy.sources.luma}`, "1 Mar 2026")})`, {
          exact: false,
        }),
      )
      .toBeVisible();
    await expect.element(page.getByText(`old@example.com (${copy.sources.letter})`, { exact: false })).toBeVisible();
  });
});

describe("SupporterDetails, a member", () => {
  const copy = staffCopy.supporters;
  const joined = exampleMemberDetails.activity[0];

  it("says their city, whether we'd email them about each topic, and how they joined in the history", async () => {
    await render(<SupporterDetails supporter={exampleMemberDetails} />);
    await expect
      .element(page.getByText(`Cardiff (${copy.detail.from(copy.sources.member, "11 Oct 2026")})`))
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
    const history = page.getByRole("list", { name: copy.detail.activityTitle });
    // What they chose alone, where the form was alone, and neither.
    const lines = history
      .getByRole("listitem")
      .all()
      .map((item) => item.element().textContent);
    expect(lines.map((line) => line!.slice(16))).toEqual([
      `${copy.detail.kinds["member-joined"]} ${copy.detail.intents.Volunteer}`,
      `${copy.detail.kinds["member-joined"]} ${copy.detail.joinedOn("pauseai.info/join")}`,
      `${copy.detail.kinds["member-joined"]} `,
    ]);
  });
});

describe("EmailPermissionTiles", () => {
  const copy = staffCopy.supporters.detail.permissions;
  const tiles = () => [...document.querySelectorAll("li")];

  it("is a strip a topic: its name and the answer, why in a few words, and how we know behind the ?", async () => {
    await render(<EmailPermissionTiles permissions={exampleSupporterDetails.permissions} />);
    expect(tiles().map((tile) => tile.dataset.send)).toEqual(["no", "yes"]);
    expect(tiles()[0].textContent).toBe(
      `${copy.topics["luma-calendar"]}: ${copy.no}${copy.reasons["luma-calendar"].unsubscribed("12 Oct 2026")}?${copy.details["luma-calendar"]}`,
    );
    expect(tiles()[1].querySelector("span")!.textContent).toBe(
      `${copy.topics["events-and-ways-to-help"]}: ${copy.yes}`,
    );
    // Green we'd email them, plain we wouldn't; an answer, so no warning icon.
    expect(tiles()[1].firstElementChild!.className).toMatch(/green/);
    expect(tiles()[0].firstElementChild!.className).not.toMatch(/green|amber|red|undefined/);
    expect(tiles()[0].querySelector("svg")).toBeNull();
    // How we know shows when the ? is clicked.
    await expect.element(page.getByText(copy.details["luma-calendar"])).not.toBeVisible();
    await page.getByRole("button", { name: copy.why }).first().click();
    await expect.element(page.getByText(copy.details["luma-calendar"])).toBeVisible();
  });

  it("says don't know where an unsubscribe may not have reached us", async () => {
    await render(<EmailPermissionTiles permissions={exampleMemberDetails.permissions} />);
    expect(tiles()[1].dataset.send).toBe("unsure");
    expect(tiles()[1].querySelector("span")!.textContent).toContain(copy.unsure);
    expect(tiles()[1].firstElementChild!.className).toMatch(/amber/);
  });

  it("names the address when there's more than one, and falls back to the reason's own name", async () => {
    const [luma] = exampleSupporterDetails.permissions;
    await render(
      <EmailPermissionTiles
        permissions={[
          { ...luma, reason: "joined", at: null },
          { ...luma, address: "other@example.com" },
        ]}
      />,
    );
    expect(tiles()[0].textContent).toContain(`${copy.topics["luma-calendar"]} · jane@example.com`);
    expect(tiles()[0].textContent).toContain(`${copy.no}joined`);
    expect(tiles()[1].textContent).toContain("other@example.com");
  });

  it("gives a blocked address one tile, saying why and linking to the blocked emails", async () => {
    await render(<EmailPermissionTiles permissions={exampleBlockedPermissions} />);
    expect(tiles()).toHaveLength(1);
    expect(tiles()[0].textContent).toBe(
      `${copy.blocked}${copy.blockedBecause.complaint("5 Oct 2026")} ${copy.seeBlocked}`,
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
        topic: topic as EmailTopic,
        reason: reason as EmailReason,
        at: "2026-09-12T10:00:00Z",
      })),
    );
    await render(<EmailPermissionTiles permissions={permissions} />);
    for (const [topic, reasons] of Object.entries(copy.reasons))
      for (const words of Object.values(reasons))
        expect(document.body.textContent, topic).toContain(words("12 Sept 2026"));
  });

  it("says a bounce blocked an address, and nothing of a block it can't date", async () => {
    const [blocked] = exampleBlockedPermissions;
    const { rerender } = await render(<EmailPermissionTiles permissions={[{ ...blocked, source: "hard" }]} />);
    expect(tiles()[0].textContent).toContain(copy.blockedBecause.hard("5 Oct 2026"));
    await rerender(<EmailPermissionTiles permissions={[{ ...blocked, source: null }]} />);
    expect(tiles()[0].textContent).toBe(`${copy.blocked}${copy.seeBlocked}`);
  });

  it("names a blocked address among several, and leaves out a cause it has no words for", async () => {
    const [blocked] = exampleBlockedPermissions;
    await render(
      <EmailPermissionTiles
        permissions={[{ ...blocked, source: "soft" }, { ...exampleSupporterDetails.permissions[1] }]}
      />,
    );
    expect(tiles()[0].textContent).toBe(`gus@example.com: ${copy.blocked}${copy.seeBlocked}`);
    expect(tiles()).toHaveLength(2);
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
