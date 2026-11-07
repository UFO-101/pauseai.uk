import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { page } from "vitest/browser";
import { staffCopy } from "@/lib/content/staff-interface";
import type { AnyLetter } from "@/lib/server/all-letters";
import AllLetters from "./AllLetters";

const copy = staffCopy.allLetters;

const SUPPORTER: AnyLetter = {
  id: 1,
  kind: "supporter",
  status: "sent",
  sentAt: "2026-10-20T10:00:00Z",
  repliedAt: "2026-10-21T10:00:00Z",
  people: [{ id: 4, name: "Polly Placeholder" }],
  senderName: "Jane Smith",
  senderEmail: "jane.smith@example.com",
  supporterId: 9,
  campaign: "regulate-letter-pm",
  campaignTitle: "Regulate AI",
};
const PAUSEAI: AnyLetter = {
  id: 2,
  kind: "pauseai",
  status: "other",
  sentAt: null,
  repliedAt: null,
  people: [{ id: 5, name: "Peter Placeholder" }],
  mailingId: 3,
  mailingTitle: "About the march",
};
const THREAD: AnyLetter = {
  id: 2,
  kind: "one-off",
  status: "one-off",
  sentAt: "2026-10-19T10:00:00Z",
  repliedAt: null,
  people: [
    { id: 4, name: "Polly Placeholder" },
    { id: 5, name: "Peter Placeholder" },
  ],
  senderName: "Sam Jones",
  senderEmail: "sam@example.com",
  fromUs: false,
  recipients: [
    { name: "", politicianId: null, pauseai: true },
    { name: "Polly Placeholder", politicianId: 4, pauseai: false },
    { name: "Vera Volunteer", politicianId: null, pauseai: false },
  ],
  subject: "Coffee next week?",
};
const SEARCH = { q: "", from: [], type: [], to: [], sent: "", replied: "", page: "" };
const PEOPLE = [
  { id: 4, name: "Polly Placeholder", constituency: "Testford" },
  { id: 5, name: "Lord Example", constituency: null },
];
const PROPS = { search: SEARCH, people: PEOPLE, supporters: true, inbox: "policy@example.org" };
const link = (name: string) => page.getByRole("link", { name });
const found = (letters: AnyLetter[]) => ({ letters, total: letters.length, pages: 1 });

describe("AllLetters", () => {
  it("lists a supporter's letter, PauseAI's and a thread, each leading to its own pages", async () => {
    await render(<AllLetters {...PROPS} found={found([SUPPORTER, PAUSEAI, THREAD])} />);
    await expect.element(page.getByRole("heading", { level: 1 })).toHaveTextContent(copy.title);
    expect(page.getByText(copy.intro("policy@example.org")).query()).toBeNull();
    const rows = page.getByRole("row");
    await expect
      .element(rows.nth(1).getByRole("link", { name: staffCopy.mailingPages.theLetter }))
      .toHaveAttribute("href", "/staff/letters/1");
    await expect
      .element(rows.nth(2).getByRole("link", { name: staffCopy.mailingPages.theLetter }))
      .toHaveAttribute("href", "/staff/mailings/3/letters/2");
    await expect.element(link("Jane Smith")).toHaveAttribute("href", "/staff/supporters/9");
    await expect.element(link("About the march")).toHaveAttribute("href", "/staff/mailings/3");
    await expect.element(link(copy.theThread)).toHaveAttribute("href", "/staff/one-off/2");
    // Its subject is only words: the first column opens it.
    await expect.element(link("Coffee next week?")).not.toBeInTheDocument();
    expect(rows.nth(3).element().textContent).toContain("Coffee next week?");
    // After a topic, plain, what kind it is.
    expect(rows.nth(1).element().textContent).toContain(copy.topicKinds.campaign);
    const pauseai = rows.nth(2).element().textContent;
    expect(pauseai).toContain(copy.topicKinds.mailing);
    expect(rows.nth(3).element().textContent).toContain(copy.topicKinds.subject);
    expect(link(copy.topicKinds.mailing).query()).toBeNull();
    expect(pauseai).toContain(staffCopy.letters.fromPauseai);
    // A status with no words of its own shows as stored; nothing sent or replied, a dash.
    expect(pauseai).toContain("other");
    expect(pauseai).toContain("–");
    // A thread: its kind in place of a status, who started it, and who its first message was to.
    const thread = rows.nth(3).element();
    expect(thread.textContent).toContain(copy.oneOff);
    expect(thread.textContent).toContain("Sam Jones");
    expect(thread.textContent).toContain(staffCopy.letters.fromPauseai);
    expect(thread.textContent).toContain("Vera Volunteer");
    expect(thread.querySelectorAll('a[href^="/staff/politicians/"]')).toHaveLength(1);
    expect(page.getByText(copy.withheld).query()).toBeNull();
  });

  it("names a thread PauseAI started as PauseAI's, whoever at PauseAI sent it", async () => {
    await render(<AllLetters {...PROPS} found={found([{ ...THREAD, fromUs: true }])} />);
    const row = page.getByRole("row").nth(1).element().textContent;
    expect(row).toContain(staffCopy.letters.fromPauseai);
    expect(row).not.toContain("Sam Jones");
  });

  it("names a thread's sender by address with no name, says so with no subject, and a dash with no To line", async () => {
    await render(<AllLetters {...PROPS} found={found([{ ...THREAD, senderName: "", subject: "", recipients: [] }])} />);
    await expect.element(page.getByText("sam@example.com")).toBeVisible();
    await expect.element(page.getByText(staffCopy.oneOff.noSubject)).toBeVisible();
    expect(page.getByRole("row").nth(1).element().querySelectorAll("td")[2].textContent).toBe("–");
  });

  it("names a sender with no supporter without a link, and keeps the filters across pages", async () => {
    await render(
      <AllLetters
        {...PROPS}
        found={{ letters: [{ ...SUPPORTER, supporterId: null }], total: 150, pages: 2 }}
        search={{ ...SEARCH, sent: "30", from: ["supporter", "pauseai"], page: "1" }}
      />,
    );
    await expect.element(page.getByText("Jane Smith")).toBeVisible();
    await expect.element(link("Jane Smith")).not.toBeInTheDocument();
    await expect
      .element(page.getByRole("link", { name: staffCopy.paging.next }))
      .toHaveAttribute("href", "/staff/emails?from=supporter&from=pauseai&sent=30&page=2");
  });

  it("finds who it's to by a box, an MP with their seat and a peer by name, a chip for one chosen", async () => {
    await render(<AllLetters {...PROPS} found={found([SUPPORTER])} search={{ ...SEARCH, to: ["5"] }} />);
    await expect
      .element(page.getByRole("button", { name: new RegExp(`^${staffCopy.letters.columns.to}: Lord Example`) }))
      .toBeVisible();
    await page.getByRole("button", { name: staffCopy.filters.add }).click();
    const group = [...document.querySelectorAll<HTMLElement>("#filter-add details > summary")];
    group.find((summary) => summary.textContent === staffCopy.letters.columns.to)!.click();
    await page.getByRole("searchbox").last().fill("poll");
    await expect
      .element(page.getByRole("link", { name: staffCopy.supporters.filters.mpChoice("Polly Placeholder", "Testford") }))
      .toHaveAttribute("href", "/staff/emails?to=5&to=4");
  });

  it("filters by what a row is, a chip for each chosen", async () => {
    await render(<AllLetters {...PROPS} found={found([THREAD])} search={{ ...SEARCH, type: ["one-off"] }} />);
    await expect
      .element(page.getByRole("button", { name: new RegExp(`^${copy.topic}: ${copy.types["one-off"]}`) }))
      .toBeVisible();
    // Under the filters, what one-offs are, only with them chosen.
    await expect.element(page.getByText(copy.intro("policy@example.org"))).toBeVisible();
  });

  it("says when none are found", async () => {
    await render(<AllLetters {...PROPS} found={found([])} />);
    await expect.element(page.getByText(copy.noneFound)).toBeVisible();
  });

  it("without supporters, says what's left out, and doesn't offer supporters as a choice", async () => {
    await render(<AllLetters {...PROPS} supporters={false} found={found([PAUSEAI])} />);
    await expect.element(page.getByText(copy.withheld)).toBeVisible();
    await page.getByRole("button", { name: staffCopy.filters.add }).click();
    await page.getByText(copy.from, { exact: true }).first().click();
    const add = document.querySelector("#filter-add")!;
    expect(add.textContent).toContain(copy.fromKinds.pauseai);
    expect(add.textContent).toContain(copy.fromKinds.politician);
    expect(add.textContent).toContain(copy.fromKinds.other);
    expect(add.textContent).not.toContain(copy.fromKinds.supporter);
    await page.getByText(copy.topic, { exact: true }).first().click();
    expect(add.textContent).toContain(copy.types.mailing);
    expect(add.textContent).not.toContain(copy.types.campaign);
  });
});
