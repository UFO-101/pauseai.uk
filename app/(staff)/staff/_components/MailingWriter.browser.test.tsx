import { describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";
import { page, userEvent } from "vitest/browser";
import { staffCopy } from "@/lib/content/staff-interface";
import { navigation } from "@/tests/browser/navigation";
import MailingWriter, { type MailingWriterActions } from "./MailingWriter";
import { exampleWriterData, exampleWrittenMailing } from "./MailingWriter.examples";

const copy = staffCopy.mailingPages;
const WAIT = { timeout: 3000 };

/** Server Actions that answer as a draft's would, each a mock to change. */
function fakeActions(): { [K in keyof MailingWriterActions]: ReturnType<typeof vi.fn> } & MailingWriterActions {
  let version = 1;
  return {
    start: vi.fn(async () => ({ id: 21, version: 1 })),
    save: vi.fn(async () => ({ saved: true as const, version: ++version })),
    attach: vi.fn(async () => ({
      saved: true as const,
      version: ++version,
      attachments: [{ id: 3, filename: "a.pdf", size: 1 }],
    })),
    detach: vi.fn(async () => ({ saved: true as const, version: ++version, attachments: [] })),
    sendTest: vi.fn(async () => ({ sent: true as const, id: "m" })),
    schedule: vi.fn(async () => ({ scheduled: true as const })),
    deleteDraft: vi.fn(async () => {}),
  };
}

function renderWriter(props: Partial<Parameters<typeof MailingWriter>[0]> = {}) {
  const actions = fakeActions();
  const view = render(
    <MailingWriter data={exampleWriterData} draft={null} who={<p>{"Who it's to"}</p>} actions={actions} {...props} />,
  );
  return { actions, view };
}

/** A field by its label, whose name also holds what's chosen in it. */
const field = (label: string) => page.getByLabelText(label, { exact: false });
const preview = () => page.getByRole("region", { name: copy.sections.preview });
const status = () => page.getByRole("status").first();
const subject = () => field(copy.subject);

describe("MailingWriter", () => {
  it("saves nothing until something's written, then makes a draft and names it in the address bar", async () => {
    const { actions } = renderWriter();
    await expect.element(status()).toHaveTextContent(copy.saveStates.new);
    await expect.element(page.getByText(copy.cantSend)).toBeVisible();
    await field(copy.ask).selectOptions("frontier-ai-letter");
    await new Promise((resolve) => setTimeout(resolve, 1200));
    expect(actions.start).not.toHaveBeenCalled();
    await subject().fill("Hello");
    await expect.poll(() => actions.start.mock.calls.length, WAIT).toBe(1);
    expect(actions.start.mock.calls[0][0]).toEqual(exampleWriterData.filter.params);
    expect(actions.start.mock.calls[0][1]).toMatchObject({ subject: "Hello", ask: "frontier-ai-letter" });
    await expect.element(status()).toHaveTextContent(copy.saveStates.saved);
    expect(location.pathname).toBe("/staff/mailings/21");
    history.replaceState(null, "", "/");
    await expect.element(page.getByRole("heading", { level: 1 })).toHaveTextContent("Hello");
    await expect.element(page.getByRole("button", { name: copy.deleteDraft })).toBeVisible();
    await expect
      .element(page.getByRole("link", { name: copy.changeWho }))
      .toHaveAttribute("href", "/staff/politicians?house=commons&party=%21Labour&ask=frontier-ai-letter&mailing=21");

    // Each change after, a moment later, as a save of only what changed.
    await field(copy.fromName).fill("Jo");
    await field(copy.fromLegend).selectOptions("sam@pauseai.uk");
    await expect.poll(() => actions.save.mock.calls.length, WAIT).toBe(1);
    expect(actions.save.mock.calls[0]).toEqual([21, 1, { fromName: "Jo", sentFrom: "sam@pauseai.uk" }]);
    await field(copy.fromName).fill("");
    await field(copy.fromLegend).selectOptions("");
    await field(copy.ask).selectOptions("");
    await expect.poll(() => actions.save.mock.calls.length, WAIT).toBe(2);
    expect(actions.save.mock.calls[1]).toEqual([21, 2, { fromName: null, sentFrom: null, ask: null }]);
  });

  it("makes a draft from the letter too, and saves the letter's changes", async () => {
    const { actions } = renderWriter();
    await page.getByRole("textbox", { name: copy.letter }).click();
    await userEvent.keyboard("Dear");
    await expect.poll(() => actions.start.mock.calls.length, WAIT).toBe(1);
    expect(JSON.stringify(actions.start.mock.calls[0][1])).toContain("Dear");
  });

  it("says when someone else saved it first, and saves nothing more", async () => {
    const { actions } = renderWriter({ draft: exampleWrittenMailing });
    actions.save.mockResolvedValueOnce({ saved: false, reason: "conflict" });
    await expect.element(status()).toHaveTextContent(copy.saveStates.saved);
    await subject().fill("Mine");
    await expect.element(page.getByRole("alert")).toHaveTextContent(copy.saveStates.conflict);
    await subject().fill("Mine again");
    await new Promise((resolve) => setTimeout(resolve, 1200));
    expect(actions.save).toHaveBeenCalledTimes(1);
  });

  it("says when a save fails, and tries again, with what failed, at the next change", async () => {
    const { actions } = renderWriter({ draft: exampleWrittenMailing });
    actions.save.mockRejectedValueOnce(new Error("offline"));
    await subject().fill("One");
    await expect.element(status()).toHaveTextContent(copy.saveStates.failed);
    await field(copy.fromName).fill("Jo");
    await expect.poll(() => actions.save.mock.calls.length, WAIT).toBe(2);
    expect(actions.save.mock.calls[1][2]).toEqual({ subject: "One", fromName: "Jo" });
  });

  it("waits for a save under way before the next", async () => {
    const { actions } = renderWriter({ draft: exampleWrittenMailing });
    let finish = () => {};
    actions.save.mockImplementationOnce(
      () => new Promise((resolve) => (finish = () => resolve({ saved: true, version: 4 }))),
    );
    await subject().fill("One");
    await expect.element(status()).toHaveTextContent(copy.saveStates.saving);
    await field(copy.fromName).fill("Jo");
    await new Promise((resolve) => setTimeout(resolve, 1200));
    expect(actions.save).toHaveBeenCalledTimes(1);
    finish();
    await expect.poll(() => actions.save.mock.calls.length, WAIT).toBe(2);
    expect(actions.save.mock.calls[1]).toEqual([12, 4, { fromName: "Jo" }]);
  });

  it("attaches a file, making the draft first, says when it's too big or someone saved first, and takes one off", async () => {
    const { actions } = renderWriter();
    await field(copy.addFile).upload(new File(["x"], "a.pdf", { type: "application/pdf" }));
    await expect.poll(() => actions.attach.mock.calls.length, WAIT).toBe(1);
    expect(actions.start).toHaveBeenCalledTimes(1);
    const sent = actions.attach.mock.calls[0][0] as FormData;
    expect([sent.get("id"), sent.get("version"), (sent.get("file") as File).name]).toEqual(["21", "1", "a.pdf"]);
    await expect.element(page.getByRole("button", { name: copy.removeFile("a.pdf") })).toBeVisible();

    actions.attach.mockResolvedValueOnce({ saved: false, reason: "too-big", attachments: [] });
    await field(copy.addFile).upload(new File(["x"], "big.pdf"));
    await expect.element(page.getByText(copy.tooBig)).toBeVisible();
    actions.attach.mockResolvedValueOnce(undefined);
    await field(copy.addFile).upload(new File(["x"], "odd.pdf"));
    await expect.poll(() => actions.attach.mock.calls.length, WAIT).toBe(3);
    expect(actions.start).toHaveBeenCalledTimes(1);
    actions.attach.mockResolvedValueOnce({ saved: false, reason: "conflict", attachments: [] });
    await field(copy.addFile).upload(new File(["x"], "late.pdf"));
    await expect.element(page.getByRole("alert")).toHaveTextContent(copy.saveStates.conflict);
  });

  it("takes a file off a draft", async () => {
    const { actions } = renderWriter({ draft: exampleWrittenMailing });
    await page.getByRole("button", { name: copy.removeFile("programme.pdf") }).click();
    await expect.poll(() => actions.detach.mock.calls[0], WAIT).toEqual([12, 3, 1]);
    await expect.element(page.getByRole("button", { name: copy.removeFile("programme.pdf") })).not.toBeInTheDocument();
  });

  it("ignores a file picker closed with no file", async () => {
    const { actions } = renderWriter();
    await expect.element(field(copy.addFile)).toBeInTheDocument();
    const input = field(copy.addFile).element() as HTMLInputElement;
    input.dispatchEvent(new Event("change", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(actions.attach).not.toHaveBeenCalled();
  });

  it("shows who it's to, who's left out and why, and a filter the site no longer knows", async () => {
    renderWriter({ data: { ...exampleWriterData, unknown: ["party=Gone"] } });
    await expect.element(page.getByText("Who it's to")).toBeVisible();
    await expect.element(page.getByText(copy.willGet(2))).toBeVisible();
    await expect.element(page.getByText(copy.unknownFilter("party=Gone"))).toBeVisible();
    await page.getByText(copy.seeWho).click();
    await expect
      .element(page.getByRole("link", { name: "Ned Noaddress" }))
      .toHaveAttribute("href", "/staff/politicians/9");
    await expect.element(page.getByText(copy.leftOutReasons.blocked)).toBeVisible();
    await expect
      .element(page.getByRole("link", { name: copy.changeWho }))
      .toHaveAttribute("href", "/staff/politicians?house=commons&party=%21Labour&ask=frontier-ai-letter");
  });

  it("previews each recipient's email as they'll get it, found by name or constituency", async () => {
    renderWriter({ draft: exampleWrittenMailing });
    await expect.element(page.getByText("Polly Placeholder <polly@example.org>")).toBeVisible();
    await expect.element(preview().getByText("Thank you for signing the letter.")).toBeVisible();
    const search = page.getByRole("searchbox", { name: copy.previewAs });
    await search.fill("zzz");
    await expect.element(page.getByText(copy.noMatch)).toBeVisible();
    await search.fill("example");
    await expect
      .element(page.getByRole("button", { name: /Polly Placeholder/ }))
      .toHaveAttribute("aria-pressed", "true");
    await search.fill("dora");
    await page.getByRole("button", { name: "Dora Dummy" }).click();
    await expect.element(page.getByText("Dora Dummy <dora@example.org>")).toBeVisible();
    await expect.element(page.getByText("Dear Lady Dummy,")).toBeVisible();
    await expect.element(preview().getByText("Thank you for signing the letter.")).not.toBeInTheDocument();
  });

  it("sends a test copy of a draft's email to yourself, and says if it couldn't", async () => {
    const { actions } = renderWriter({ draft: exampleWrittenMailing });
    await page.getByRole("button", { name: copy.sendTest }).click();
    await expect.element(page.getByText(copy.testSent)).toBeVisible();
    expect(actions.sendTest).toHaveBeenCalledWith(12, 7);
    actions.sendTest.mockResolvedValueOnce({ sent: false, reason: "failed" });
    await page.getByRole("button", { name: copy.sendTest }).click();
    await expect.element(page.getByText(copy.testFailed)).toBeVisible();
    actions.sendTest.mockResolvedValueOnce(undefined);
    await page.getByRole("button", { name: copy.sendTest }).click();
    await expect.element(page.getByText(copy.testFailed)).toBeVisible();
  });

  it("can't send a test before there's a draft, nor preview with no one to send to", async () => {
    const { view } = renderWriter();
    await expect.element(page.getByRole("button", { name: copy.sendTest })).toBeDisabled();
    await expect.element(page.getByText(copy.testNeedsDraft)).toBeVisible();
    (await view).rerender(
      <MailingWriter data={{ ...exampleWriterData, recipients: [] }} draft={null} who={null} actions={fakeActions()} />,
    );
    await expect.element(page.getByText(copy.noOne)).toBeVisible();
  });

  it("sets when it goes, in London's day and hour", async () => {
    const { actions } = renderWriter({ draft: { ...exampleWrittenMailing, dueAt: null } });
    await expect.element(field(copy.hour)).toBeDisabled();
    await field(copy.day).fill("2026-07-01");
    await field(copy.hour).selectOptions("14");
    await expect.poll(() => actions.save.mock.calls.length, WAIT).toBe(1);
    expect(actions.save.mock.calls[0][2]).toEqual({ dueAt: "2026-07-01T13:00:00.000Z" });
    await expect.element(page.getByText(copy.summary(2, "Jo Example", "Wednesday 1 July at 14:00"))).toBeVisible();
    await field(copy.day).fill("");
    await expect.poll(() => actions.save.mock.calls.length, WAIT).toBe(2);
    expect(actions.save.mock.calls[1][2]).toEqual({ dueAt: null });
  });

  it("can't be scheduled while anything stops it, and says what", async () => {
    renderWriter({ data: { ...exampleWriterData, fields: [] }, draft: { ...exampleWrittenMailing, fromName: null } });
    await expect.element(page.getByRole("button", { name: copy.schedule(2) })).toBeDisabled();
    await expect.element(page.getByText(copy.problems["no-name"])).toBeVisible();
    await expect.element(page.getByText(copy.problems["cannot-send"])).toBeVisible();
    await expect.element(page.getByText(copy.summary(2, "jo@pauseai.uk", "Tuesday 1 December at 09:00"))).toBeVisible();
  });

  it("schedules one that's ready, and shows it scheduled; not one someone changed first", async () => {
    const ready = { ...exampleWrittenMailing, dueAt: "2099-12-01T09:00:00Z" };
    const data = { ...exampleWriterData, sends: true, fields: [] };
    const { actions } = renderWriter({ data, draft: ready });
    await expect.element(page.getByText(copy.cantSend)).not.toBeInTheDocument();
    await page.getByRole("button", { name: copy.schedule(2) }).click();
    await expect.poll(() => navigation.refreshes, WAIT).toBe(1);
    expect(actions.schedule).toHaveBeenCalledWith(12, 3);
    actions.schedule.mockResolvedValueOnce({ scheduled: false, reason: "conflict" });
    await page.getByRole("button", { name: copy.schedule(2) }).click();
    await expect.poll(() => actions.schedule.mock.calls.length).toBe(2);
    expect(navigation.refreshes).toBe(1);
  });

  it("previews an empty letter for one it can't read, such as a part for only some in a list", async () => {
    const odd = {
      type: "doc" as const,
      content: [{ type: "bulletList", content: [{ type: "listItem", content: [{ type: "onlyFor", content: [] }] }] }],
    };
    renderWriter({ draft: { ...exampleWrittenMailing, body: odd as never } });
    await expect.element(page.getByText(copy.problems["no-letter"])).toBeVisible();
  });
});
