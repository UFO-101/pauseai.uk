import { describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";
import { page } from "vitest/browser";
import { campaigns } from "@/lib/content/email-your-mp";
import { jobTitles, staffCopy } from "@/lib/content/staff-interface";
import { MAX_UNCHECKED_CHANGES } from "@/lib/mps";
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
import { examplePolitician, examplePoliticianHistory } from "./PoliticianTable.examples";
import ResultBox, { OPEN_UP_TO } from "./ResultBox";
import RunFilters from "./RunFilters";
import RunList from "./RunList";
import {
  exampleAppliedSync,
  exampleControlAiResult,
  exampleFailedRun,
  exampleHeldSync,
  exampleLumaResult,
  exampleRun,
  exampleSyncedMp,
} from "./RunList.examples";
import StaffNav from "./StaffNav";
import StaffDashboard from "./StaffDashboard";
import { exampleDashboard, exampleQuietDashboard } from "./StaffDashboard.examples";
import Sparkline from "./Sparkline";
import StaffHome from "./StaffHome";
import AccountsNotice from "./AccountsNotice";
import Breadcrumb from "./Breadcrumb";
import EraseLink from "./EraseLink";
import ImportCard, { ImportCards } from "./ImportCard";
import DevLogin from "./DevLogin";
import KeepSignedIn from "./KeepSignedIn";
import RemoveAccountForm from "./RemoveAccountForm";
import SortHeading from "./SortHeading";
import StaffAccountForm from "./StaffAccountForm";
import StaffAccountsTable from "./StaffAccountsTable";
import EraseForm from "./EraseForm";
import ErasedNotice from "./ErasedNotice";
import SupporterBadges from "./SupporterBadges";
import SupporterDetails from "./SupporterDetails";
import SupporterFilters from "./SupporterFilters";
import SupportersTable from "./SupportersTable";
import { exampleSupporter, exampleSupporterDetails } from "./SupportersTable.examples";
import { supportersSearch } from "@/lib/staff-search";
import Table from "@/components/ui/Table";

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

describe("StaffNav", () => {
  it("is just the title on the login page", async () => {
    await render(<StaffNav />);
    await expect.element(page.getByText(staffCopy.nav.title)).toBeVisible();
    await expect.element(page.getByRole("navigation")).not.toBeInTheDocument();
    await expect.element(page.getByRole("button")).not.toBeInTheDocument();
  });

  it("groups the pages by permission, marks the current one but keeps it a link, says who's logged in, and logs out with a POST", async () => {
    await render(<StaffNav email="jo@pauseai.uk" account permissions={["admin"]} current="politicians" />);
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
    expect(nav.querySelector('a[href="/staff/letters"]')!.textContent).toBe(staffCopy.nav.letters);
    expect([...nav.querySelectorAll("h2")].map((h) => h.textContent).slice(0, 4)).toEqual(
      ["politicians", "email", "data", "admin"].map((id) => staffCopy.nav.sections[id]),
    );
    expect(nav.querySelector('a[href="/staff/supporters"]')).toBeNull();
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

  it("shows no admin group to someone without the permission, and at home the title isn't a link", async () => {
    await render(<StaffNav email="jo@pauseai.uk" account permissions={[]} current="home" />);
    await expect.element(page.getByRole("link", { name: staffCopy.nav.title })).not.toBeInTheDocument();
    const nav = document.querySelector("nav")!;
    expect(nav.querySelector('a[href="/staff/accounts"]')).toBeNull();
    expect(nav.querySelector('a[href="/staff/audit-log"]')).toBeNull();
    expect(nav.querySelector('a[href="/staff/letters"]')).not.toBeNull();
    expect(nav.querySelector("summary")!.textContent).toBe(staffCopy.nav.home);
  });

  it("shows no groups at all to someone without an account, only who they are and the way out", async () => {
    await render(<StaffNav email="jo@pauseai.uk" current="home" />);
    const nav = document.querySelector("nav")!;
    expect(nav.querySelectorAll("a[href^='/staff/']")).toHaveLength(0);
    await expect.element(page.getByText("jo@pauseai.uk").first()).toBeInTheDocument();
    expect(document.querySelectorAll('form[action="/staff/api/logout"]')).toHaveLength(2);
  });
});

describe("StaffHome", () => {
  it("shows the dashboard to someone with an account, and nothing about permissions when they have some", async () => {
    await render(
      <StaffHome
        account
        permissions={["admin", "supporters"]}
        admins={["admin@pauseai.uk"]}
        dashboard={exampleDashboard}
      />,
    );
    // The title is for screen readers only: the dashboard is the page.
    const title = page.getByRole("heading", { level: 1, name: staffCopy.home.title });
    await expect.element(title).toBeInTheDocument();
    expect(title.element().getBoundingClientRect().width).toBeLessThanOrEqual(1);
    await expect
      .element(page.getByRole("heading", { level: 2, name: staffCopy.home.dashboard.sections.mps }))
      .toBeVisible();
    await expect.element(page.getByText(staffCopy.home.none, { exact: false })).not.toBeInTheDocument();
  });

  it("without an account, says so and whom to ask, and shows nothing else", async () => {
    await render(<StaffHome account={false} permissions={[]} admins={["admin@pauseai.uk"]} />);
    await expect.element(page.getByText(staffCopy.home.noAccount, { exact: false })).toBeVisible();
    await expect.element(page.getByText(staffCopy.home.ask("admin@pauseai.uk"), { exact: false })).toBeVisible();
    expect(page.getByRole("link").all()).toHaveLength(0);
  });

  it("without permissions, says so and whom to ask, over the dashboard", async () => {
    await render(
      <StaffHome
        account
        permissions={[]}
        admins={["admin@pauseai.uk", "jo@pauseai.uk"]}
        dashboard={exampleDashboard}
      />,
    );
    await expect.element(page.getByText(staffCopy.home.none, { exact: false })).toBeVisible();
    await expect
      .element(page.getByText(staffCopy.home.ask("admin@pauseai.uk, jo@pauseai.uk"), { exact: false }))
      .toBeVisible();
    await expect
      .element(page.getByRole("heading", { level: 2, name: staffCopy.home.dashboard.sections.supporters }))
      .toBeVisible();
  });
});

describe("StaffDashboard", () => {
  const copy = staffCopy.home.dashboard;

  it("lists what needs a person in a box of its own, a dot and a button each, or shows nothing", async () => {
    const { rerender } = await render(<StaffDashboard dashboard={exampleDashboard} permissions={[]} />);
    const items = page.getByRole("list", { name: copy.actionsTitle }).getByRole("listitem").all();
    expect(items.map((item) => item.element().textContent)).toEqual([
      `${copy.actions.heldSync}${copy.actions.heldSyncDetail(24, MAX_UNCHECKED_CHANGES, 0, 21, 3, "2026-10-21 00:00")}${copy.actions.decide}`,
      `${copy.actions.blockedMp("Bouncy McTestface MP")}${copy.actions.blockedMpDetail("The address does not exist", "19 Oct 2026")}${copy.actions.openMp}`,
      `${copy.actions.failedImport(jobTitles["import-controlai"])}${copy.actions.failedImportDetail("No PDF linked", "2026-10-21 02:00")}${copy.actions.seeRun}`,
    ]);
    const dot = (i: number) => items[i].element().querySelector("span")!.className;
    expect(dot(0)).toMatch(/amber/);
    expect(dot(1)).toMatch(/red/);
    expect(dot(2)).toMatch(/red/);
    await expect
      .element(page.getByRole("link", { name: copy.actions.decide }))
      .toHaveAttribute("href", "/staff/import-data");
    await expect
      .element(page.getByRole("link", { name: copy.actions.openMp }))
      .toHaveAttribute("href", "/staff/politicians/7");
    await expect
      .element(page.getByRole("link", { name: copy.actions.seeRun }))
      .toHaveAttribute("href", "/staff/import-data");
    // The heading is inside the box. Red while something in it is broken; amber when it's only waiting.
    const box = page.getByRole("region", { name: copy.actionsTitle });
    expect(box.getByRole("heading", { level: 2 }).element().textContent).toBe(copy.actionsTitle);
    const panel = () => box.element().className;
    expect(panel()).toMatch(/urgent/);
    await rerender(
      <StaffDashboard
        dashboard={{ ...exampleDashboard, actions: exampleDashboard.actions.slice(0, 1) }}
        permissions={[]}
      />,
    );
    expect(panel()).not.toMatch(/urgent/);

    await rerender(<StaffDashboard dashboard={exampleQuietDashboard} permissions={[]} />);
    await expect.element(page.getByText(copy.actionsTitle)).not.toBeInTheDocument();
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
        `12${copy.testLetters(2)}${copy.metrics.lettersSent(12)}${pm.title} · 9${bill.title} · 3${copy.change.up(4, 7)}`,
      );
    await expect.element(mps[1]).toHaveTextContent(`3${copy.metrics.lettersReplied(3)}${copy.change.down(2, 7)}`);
    await expect
      .element(mps[2])
      .toHaveTextContent(`5${copy.metrics.mpsSigned(5)}${pm.title} · 3${bill.title} · 2${copy.change.up(2, 7)}`);
    await expect.element(events[1]).toHaveTextContent(`9${copy.metrics.eventsHeld(9)}${copy.change.up(3, 7)}`);
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
    const sparkline = (label: string) => page.getByRole("img", { name: copy.series(label) });
    await expect.element(sparkline(copy.metrics.eventRegistrations(277))).toBeVisible();
    await expect.element(sparkline(copy.metrics.supportersAdded(176))).toBeVisible();
    expect(page.getByRole("img").all()).toHaveLength(2 + 5);
    // The whole tile is the link; a tile with no page isn't one.
    const tileLink = (text: string) => page.getByText(text).element().closest("a");
    expect(tileLink(copy.metrics.lettersReplied(3))?.getAttribute("href")).toBe("/staff/letters?status=replied");
    expect(tileLink(copy.metrics.supportersAdded(176))?.getAttribute("href")).toBe("/staff/supporters");
    expect(tileLink(copy.metrics.eventsHeld(9))).toBeNull();

    await rerender(<StaffDashboard dashboard={exampleDashboard} permissions={[]} />);
    expect(tileLink(copy.metrics.supportersAdded(176))).toBeNull();
    await expect.element(page.getByText(copy.metrics.supportersAdded(176))).toBeVisible();
    expect(tileLink(copy.metrics.lettersSent(12))?.getAttribute("href")).toBe("/staff/letters?status=sent");

    // A quiet month: nothing reads "None", with no test letters and no bar; the change is over 30 days.
    await rerender(<StaffDashboard dashboard={exampleQuietDashboard} permissions={[]} />);
    const quiet = group("mps");
    await expect
      .element(quiet[0])
      .toHaveTextContent(`${copy.none}${copy.metrics.lettersSent(0)}${copy.change.same(30)}`);
    await expect
      .element(quiet[1])
      .toHaveTextContent(`${copy.none}${copy.metrics.lettersReplied(0)}${copy.change.down(1, 30)}`);
    expect(quiet[0].element().querySelectorAll("[data-campaign]")).toHaveLength(0);
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
    pointAt("pointerleave", 0);
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
  it("lists every account with a form to change it and a Remove at the right, and a form for someone new", async () => {
    const save = action();
    const remove = action();
    await render(
      <StaffAccountsTable
        save={save.fn}
        remove={remove.fn}
        accounts={[
          { email: "admin@pauseai.uk", permissions: ["admin"], addedBy: "migration", addedAt: "2026-10-16T12:00:00Z" },
          {
            email: "jo@pauseai.uk",
            permissions: ["supporters"],
            addedBy: "admin@pauseai.uk",
            addedAt: "2026-10-20T09:00:00Z",
          },
        ]}
      />,
    );
    await expect.element(page.getByRole("cell", { name: "2026-10-20 09:00" })).toBeVisible();
    expect(getComputedStyle(page.getByRole("cell", { name: "2026-10-20 09:00" }).element()).verticalAlign).toBe(
      "middle",
    );
    const jo = page.getByRole("form", { name: "jo@pauseai.uk" });
    expect(
      jo
        .getByRole("checkbox")
        .all()
        .map((box) => box.element().getAttribute("name")),
    ).toEqual(["permission:supporters", "permission:admin"]);
    await expect.element(page.getByText(staffCopy.accounts.opens.supporters, { exact: false })).toBeVisible();
    await expect.element(jo.getByRole("checkbox", { name: staffCopy.accounts.names.supporters })).toBeChecked();
    await jo.getByRole("checkbox", { name: staffCopy.accounts.names.admin }).click();
    await jo.getByRole("button", { name: staffCopy.accounts.save }).click();
    await vi.waitFor(() => expect(save.sent).toHaveLength(1));
    expect(save.sent[0]).toEqual({ email: "jo@pauseai.uk", "permission:admin": "on", "permission:supporters": "on" });

    await page
      .getByRole("form", { name: `${staffCopy.accounts.remove}: jo@pauseai.uk` })
      .getByRole("button")
      .click();
    await vi.waitFor(() => expect(remove.sent).toHaveLength(1));
    expect(remove.sent[0]).toEqual({ email: "jo@pauseai.uk" });

    // Someone new has no boxes: an account alone opens the ordinary pages, and their row sets more.
    const add = page.getByRole("form", { name: staffCopy.accounts.addTitle });
    expect(add.getByRole("checkbox").all()).toHaveLength(0);
    await add.getByRole("textbox", { name: staffCopy.accounts.emailLabel }).fill("sam@pauseai.uk");
    await add.getByRole("button", { name: staffCopy.accounts.add }).click();
    await vi.waitFor(() => expect(save.sent).toHaveLength(2));
    expect(save.sent[1]).toEqual({ email: "sam@pauseai.uk" });
  });
});

describe("StaffAccountForm", () => {
  it("for an account, sends its address and each ticked box", async () => {
    const { fn, sent } = action();
    await render(<StaffAccountForm email="jo@pauseai.uk" permissions={["admin"]} save={fn} />);
    await expect.element(page.getByRole("checkbox", { name: staffCopy.accounts.names.admin })).toBeChecked();
    await page.getByRole("checkbox", { name: staffCopy.accounts.names.admin }).click();
    await page.getByRole("checkbox", { name: staffCopy.accounts.names.supporters }).click();
    await page.getByRole("button", { name: staffCopy.accounts.save }).click();
    await vi.waitFor(() => expect(sent).toHaveLength(1));
    expect(sent[0]).toEqual({ email: "jo@pauseai.uk", "permission:supporters": "on" });
  });

  it("for someone new, sends the typed address alone", async () => {
    const { fn, sent } = action();
    await render(<StaffAccountForm permissions={[]} save={fn} />);
    await page.getByRole("textbox", { name: staffCopy.accounts.emailLabel }).fill("new@pauseai.uk");
    expect(page.getByRole("checkbox").all()).toHaveLength(0);
    await page.getByRole("button", { name: staffCopy.accounts.add }).click();
    await vi.waitFor(() => expect(sent).toHaveLength(1));
    expect(sent[0]).toEqual({ email: "new@pauseai.uk" });
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
  it("says why a change was refused, or nothing", async () => {
    const { rerender } = await render(<AccountsNotice notice="last-admin" />);
    await expect.element(page.getByRole("status")).toHaveTextContent(staffCopy.accounts.lastAdmin);
    await rerender(<AccountsNotice notice="" />);
    expect(page.getByRole("status").all()).toHaveLength(0);
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
  it("is a card with its title, what it does, its actions and its runs, in a grid", async () => {
    await render(
      <ImportCards>
        <ImportCard title="An import" intro="What it copies." actions={<button type="button">Go</button>}>
          <p>Not imported yet.</p>
        </ImportCard>
        <ImportCard title="Another" intro="More." actions={<button type="button">Go too</button>}>
          <p>Never.</p>
        </ImportCard>
      </ImportCards>,
    );
    await expect.element(page.getByRole("heading", { level: 2, name: "An import" })).toBeVisible();
    await expect.element(page.getByText("What it copies.")).toBeVisible();
    await expect.element(page.getByRole("button", { name: "Go" })).toBeVisible();
    await expect.element(page.getByText("Not imported yet.")).toBeVisible();
    const grid = page.getByRole("heading", { level: 2, name: "Another" }).element().closest("section")!.parentElement!;
    expect(getComputedStyle(grid).display).toBe("grid");
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
  const none = { letters: [], history: [] };

  it("heads the page with their name, boxes what's known with each campaign's status, and edits a signer the team added", async () => {
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
      staffCopy.houses[MP.house],
      MP.constituency,
      MP.party,
      staffCopy.politicians.noEmail,
      staffCopy.politician.sources.staff,
      `${staffCopy.statuses.signed}, 1 Oct 2026${staffCopy.politician.setBy("jo@pauseai.uk", "2 Oct 2026")}`,
    ]);
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
      await expect.element(page.getByText(staffCopy.politician.fromAirtable)).toBeVisible();
      await expect.element(page.getByText(source)).toBeVisible();
      await expect.element(page.getByRole("button", { name: staffCopy.politician.save })).not.toBeInTheDocument();
      expect(page.getByRole("heading", { level: 1 }).element().textContent).toBe(
        politician.isTest ? `${MP.name}${staffCopy.politicians.testMp}` : MP.name,
      );
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
        politician={peer}
        action={vi.fn()}
        unblock={vi.fn()}
        letters={[
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
        ]}
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
        ]}
      />,
    );
    const facts = page.getByRole("definition").all();
    expect(facts.map((d) => d.element().textContent)).toEqual([
      staffCopy.houses[MP.house],
      MP.party,
      MP.email,
      staffCopy.politician.sources.airtable,
      `${staffCopy.statuses.signed}, 1 Oct 2026 · Told us at the march${staffCopy.politician.setBy("jo@pauseai.uk", "2 Oct 2026")}`,
      `odd${staffCopy.politician.setBy("jo@pauseai.uk", "2 Oct 2026")}`,
    ]);
    expect(
      page
        .getByRole("term")
        .all()
        .map((d) => d.element().textContent),
    ).toContain("gone");
    // The sender leads to their supporter once they're one; the letters and replies sit among the audit log's entries by time.
    await expect
      .element(page.getByRole("link", { name: exampleLetter.senderName }))
      .toHaveAttribute("href", "/staff/supporters/7");
    await expect.element(page.getByRole("link", { name: "Anon Writer" })).not.toBeInTheDocument();
    const history = page.getByRole("list", { name: staffCopy.politician.historyTitle }).getByRole("listitem").all();
    const copy = staffCopy.politician.history;
    expect(history.map((item) => item.element().textContent)).toEqual([
      `2026-10-15 09:00${copy["letter-replied"]} Anon Writer · ${pm.title}`,
      `2026-10-14 09:30${copy["unblock address"]} Fixed in Airtable · jo@pauseai.uk`,
      `2026-10-13 08:00${copy.letter} Anon Writer · ${pm.title} · ${staffCopy.letters.status.sent}`,
      `2026-10-12 09:10${copy["block address"]} ${staffCopy.emails.kinds.hard} · postmark`,
      `2026-10-12 09:00${copy.letter} ${exampleLetter.senderName} · ${pm.title} · ${staffCopy.letters.status.bounced}`,
      `2026-10-02 10:00${copy["set status"]} ${pm.title}: ${staffCopy.statuses.signed}, 2026-10-01 · Told us at the march · jo@pauseai.uk`,
      `2026-09-30 10:00${copy["edit politician"]} Polly Placeholder · polly.placeholder.mp@parliament.uk · sam@pauseai.uk`,
      `2026-09-01 10:00${copy["set status"]} gone: ${staffCopy.statuses.none} · jo@pauseai.uk`,
      `2026-08-15 10:00${copy["set status"]} ${pm.title}: odd · jo@pauseai.uk`,
      `2026-08-10 10:00${copy["block address"]} weird · postmark`,
      "2026-08-01 10:00strange  · x",
    ]);
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
    await expect.element(notice).toHaveTextContent(copy.why(MP.email!, exampleBlock.reason, "2026-10-12 09:10"));
    await expect.element(notice).toHaveTextContent(copy.fix);
    await expect.element(notice.getByRole("link", { name: copy.all })).toHaveAttribute("href", "/staff/blocked-emails");
    // The address in the facts is just the address.
    expect(page.getByText(MP.email!, { exact: true }).element().tagName).toBe("DD");
    await page.getByLabelText(staffCopy.emails.note).fill("Fixed in Airtable");
    await page.getByRole("button", { name: staffCopy.emails.unblock }).click();
    await vi.waitFor(() => expect(sent).toEqual([{ address: MP.email, note: "Fixed in Airtable" }]));

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
    await expect.element(notice).not.toHaveTextContent(copy.fix);
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
  it("is a GET form to /staff/blocked-emails, filled in with the current filter", async () => {
    await render(<EmailBlockFilters kind="complaint" />);
    await expect.element(page.getByRole("combobox")).toHaveValue("complaint");
    const form = page.getByRole("combobox").element().closest("form")!;
    expect(form.getAttribute("method")).toBe("get");
    expect(form.getAttribute("action")).toBe("/staff/blocked-emails");
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

describe("PoliticianTable headings", () => {
  it("sort the list, the current one marked, reversing on a second click", async () => {
    await render(
      <PoliticianTable
        politicians={[MP]}
        markSigned={vi.fn()}
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
      <ResultBox summary="Long" lines={OPEN_UP_TO + 1} tone="failed">
        <p>Detail</p>
      </ResultBox>,
    );
    expect((page.getByRole("group").element() as HTMLDetailsElement).open).toBe(false);
    await expect.element(page.getByText("Detail")).not.toBeVisible();
  });

  it("is coloured by its tone: red when failed, amber when incomplete, plain otherwise", async () => {
    const { rerender } = await render(<ResultBox summary="Plain" />);
    const box = () => page.getByRole("status").element().closest("section")!;
    expect(box().className).not.toMatch(/failed|incomplete/);
    await rerender(<ResultBox summary="Failed" tone="failed" />);
    expect(box().className).toMatch(/failed/);
    expect(getComputedStyle(box()).borderLeftWidth).toBe("6px");
    await rerender(<ResultBox summary="Stopped" tone="incomplete" />);
    expect(box().className).toMatch(/incomplete/);
    expect(getComputedStyle(box()).borderLeftWidth).toBe("6px");
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
    expect(first.element().textContent).not.toContain(staffCopy.runs.incomplete);
    expect(first.element().closest("section")!.className).not.toMatch(/failed|incomplete/);
    await expect
      .element(second)
      .toHaveTextContent(`${staffCopy.runs.status.failed} ${AT} · ${staffCopy.import.nightly} · Luma answered 500`);
    expect(second.element().closest("section")!.className).toMatch(/failed/);
  });

  it("says why a Luma import stopped early, tagged incomplete in an amber box", async () => {
    await render(
      <RunList runs={[ran("import-luma", { ...exampleLumaResult, stoppedBy: "rate-limit" })]} none="None" />,
    );
    const [only] = page.getByRole("status").all();
    await expect
      .element(only)
      .toHaveTextContent(
        `${staffCopy.runs.status.ok} ${staffCopy.runs.incomplete} ${AT} · ${staffCopy.import.nightly} · ${staffCopy.luma.result(exampleLumaResult)} ${staffCopy.luma.stoppedBy["rate-limit"]}`,
      );
    expect(only.element().closest("section")!.className).toMatch(/incomplete/);
  });

  it("on the history page, names each run's job and heads each day's runs with its date; says when there are none", async () => {
    const runs: AnyImportRun[] = [
      ran("check-mps", { problems: [] }, { id: 7, at: "2026-11-03T01:00:00Z" }),
      ran("import-luma", exampleLumaResult, { id: 10, at: "2026-11-03T00:17:00Z" }),
      ran("import-controlai", controlAi, { id: 8, at: "2026-11-02T02:00:00Z" }),
      ran("import-signatories", { matched: 1, added: 0, alreadySet: 0 }, { id: 9, at: "2026-11-02T00:30:00Z" }),
      applied,
    ];
    const { rerender } = await render(<RunList runs={runs} none="None" history />);
    for (const job of ["sync-mps", "check-mps", "import-controlai", "import-signatories", "import-luma"] as const) {
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

describe("SupporterFilters", () => {
  it("is a GET form to the list, with each filter as typed", async () => {
    await render(
      <SupporterFilters
        search={supportersSearch({ q: "jane", source: "luma", active: "90", registered: "1", sort: "name" })}
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
    await expect.element(page.getByRole("combobox", { name: copy.sort })).toHaveValue("name");
    await expect.element(page.getByRole("combobox", { name: copy.events })).toHaveValue("1");
    await expect.element(page.getByRole("combobox", { name: copy.lists })).toHaveValue("");
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
});

describe("SupportersTable", () => {
  it("lists each supporter with a link to their page, their emails, badges, dates and opt-outs, and pages", async () => {
    const copy = staffCopy.supporters;
    const search = supportersSearch({ q: "j", page: "2" });
    await render(
      <SupportersTable
        search={search}
        page={{
          supporters: [
            exampleSupporter,
            { ...exampleSupporter, id: 8, name: null, emails: ["sam@example.com"], optedOut: [] },
          ],
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
    await expect.element(page.getByRole("cell", { name: copy.lists["luma-calendar"] })).toBeVisible();
    await expect.element(page.getByRole("cell", { name: "1 Mar 2026" }).first()).toBeVisible();
    await expect
      .element(page.getByRole("link", { name: copy.previous }))
      .toHaveAttribute("href", "/staff/supporters?q=j");
    await expect
      .element(page.getByRole("link", { name: copy.next }))
      .toHaveAttribute("href", "/staff/supporters?q=j&page=3");
  });

  it("sorts by a heading, reversing when clicked again, and marks the current one", async () => {
    const copy = staffCopy.supporters;
    await render(
      <SupportersTable
        search={supportersSearch({ source: "luma", sort: "events", dir: "desc" })}
        page={{ supporters: [exampleSupporter], total: 1, pages: 1 }}
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
      <SupportersTable search={supportersSearch({})} page={{ supporters: [exampleSupporter], total: 1, pages: 1 }} />,
    );
    await expect.element(page.getByRole("link", { name: "Jane Example" })).toBeVisible();
    expect(page.getByRole("link", { name: staffCopy.supporters.next }).all()).toHaveLength(0);
    await rerender(
      <SupportersTable
        search={supportersSearch({ page: "2" })}
        page={{ supporters: [exampleSupporter], total: 101, pages: 3 }}
      />,
    );
    await expect
      .element(page.getByRole("link", { name: staffCopy.supporters.previous }))
      .toHaveAttribute("href", "/staff/supporters");
    await expect
      .element(page.getByRole("link", { name: staffCopy.supporters.next }))
      .toHaveAttribute("href", "/staff/supporters?page=3");
    await rerender(<SupportersTable search={supportersSearch({})} page={{ supporters: [], total: 0, pages: 1 }} />);
    await expect.element(page.getByText(staffCopy.supporters.none)).toBeVisible();
  });
});

describe("SupporterDetails", () => {
  it("shows one box of what we hold, each value with where it came from, and the history with its links", async () => {
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
    // The one list, per address: opted out on one, subscribed on the other.
    await expect.element(page.getByText(copy.detail.optedOut("12 Oct 2026"), { exact: false })).toBeVisible();
    await expect.element(page.getByText(/^subscribed/)).toBeVisible();
    await expect.element(page.getByText("1 Mar 2026", { exact: true })).toBeVisible();
    // The history: what, linked, with a status only when it isn't approved.
    const history = page.getByRole("list", { name: copy.detail.activityTitle });
    await expect
      .element(history.getByRole("link", { name: "PauseAI Manchester Social" }))
      .toHaveAttribute("href", "https://luma.com/fixture-manchester-social");
    expect(history.element().textContent).not.toContain("approved");
    await expect
      .element(history.getByRole("link", { name: campaigns[0].title }).first())
      .toHaveAttribute("href", "/staff/politicians/1");
    await expect.element(history.getByText("Polly Placeholder", { exact: false }).first()).toBeVisible();
    await expect.element(history.getByText(copy.lists["luma-calendar"], { exact: false })).toBeVisible();
    await expect.element(history.getByText(copy.detail.kinds["luma-contact"], { exact: false })).toBeVisible();

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
            },
            {
              source: "luma",
              at: "2026-09-20T10:00:00Z",
              phone: null,
              postcode: "M1  1AE",
              latitude: null,
              longitude: null,
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
            optedOut: [],
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
            },
            {
              source: "luma",
              at: "2026-01-01T00:00:00Z",
              kind: "luma-registered",
              title: "Other",
              detail: "session",
              href: null,
            },
            {
              source: "luma",
              at: "2026-01-01T00:00:00Z",
              kind: "luma-registered",
              title: "Bare",
              detail: null,
              href: null,
            },
            {
              source: "x",
              at: "2026-01-02T00:00:00Z",
              kind: "opted-out",
              title: "other-list",
              detail: null,
              href: null,
            },
            {
              source: "x",
              at: "2026-01-02T00:00:00Z",
              kind: "resubscribed",
              title: null,
              detail: "x@example.com",
              href: null,
            },
            {
              source: "letter",
              at: "2026-01-03T00:00:00Z",
              kind: "letter",
              title: "gone-campaign",
              detail: "An MP · sent",
              href: null,
            },
            {
              source: "letter",
              at: "2026-01-04T00:00:00Z",
              kind: "letter-replied",
              title: null,
              detail: null,
              href: null,
            },
          ],
          optOuts: [],
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
