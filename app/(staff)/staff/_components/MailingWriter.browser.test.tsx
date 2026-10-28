import { describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";
import { page, userEvent } from "vitest/browser";
import { staffCopy } from "@/lib/content/staff-interface";
import { navigation } from "@/tests/browser/navigation";
import MailingWriter, { type MailingWriterActions } from "./MailingWriter";
import { exampleWriterData, exampleWrittenMailing } from "./MailingWriter.examples";

const copy = staffCopy.mailingPages;
const WAIT = { timeout: 3000 };
const FILE = { id: 3, filename: "a.pdf", contentType: "application/pdf", size: 1 };

/** Server Actions that answer as a draft's would, each a mock to change. */
function fakeActions() {
  let version = 1;
  return {
    start: vi.fn(async (..._: unknown[]) => ({ id: 21, version: 1 })),
    save: vi.fn(async (..._: unknown[]): Promise<unknown> => ({ saved: true, version: ++version })),
    attach: vi.fn(async (..._: unknown[]): Promise<unknown> => ({
      saved: true,
      version: ++version,
      attachments: [FILE],
    })),
    detach: vi.fn(async (..._: unknown[]) => ({ saved: true as const, version: ++version, attachments: [] })),
    sendTest: vi.fn(async (..._: unknown[]): Promise<unknown> => ({ sent: true, id: "m", to: "jo@pauseai.uk" })),
    schedule: vi.fn(async (..._: unknown[]): Promise<unknown> => ({ scheduled: true })),
    deleteDraft: vi.fn(async () => {}),
  };
}

function renderWriter(props: Partial<Parameters<typeof MailingWriter>[0]> = {}) {
  const actions = fakeActions();
  const view = render(
    <MailingWriter
      data={exampleWriterData}
      draft={null}
      who={<p>{"Who it's to"}</p>}
      actions={actions as unknown as MailingWriterActions}
      {...props}
    />,
  );
  return { actions, view };
}

/** A field by the start of its label: its name also holds what's in it. */
const field = (label: string) => page.getByLabelText(new RegExp(`^${label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
const region = (name: string) => page.getByRole("region", { name });
const preview = () => region(copy.sections.preview);
const status = () => page.getByRole("status").first();
const subject = () => field(copy.subject);
const letter = () => page.getByRole("textbox", { name: copy.letter });
const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Types at the end of the letter. */
async function write(text: string) {
  await letter().click();
  await userEvent.keyboard("{Control>}{End}{/Control}");
  await userEvent.keyboard(text);
}

describe("MailingWriter", () => {
  it("starts with a greeting by the salutation, and saves nothing until something's written", async () => {
    const { actions } = renderWriter();
    await expect.element(letter()).toHaveTextContent("Dear salutation,");
    await expect.element(status()).toHaveTextContent(copy.saveStates.new);
    await field(copy.ask).selectOptions("frontier-ai-letter");
    await pause(1200);
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
    await field(copy.fromLegend).selectOptions("sam@pauseai.uk");
    await field(copy.ask).selectOptions("");
    await expect.poll(() => actions.save.mock.calls.length, WAIT).toBe(1);
    expect(actions.save.mock.calls[0]).toEqual([21, 1, { sentFrom: "sam@pauseai.uk", ask: null }]);
    await field(copy.fromLegend).selectOptions("");
    await expect.poll(() => actions.save.mock.calls.length, WAIT).toBe(2);
    expect(actions.save.mock.calls[1]).toEqual([21, 2, { sentFrom: null }]);
  });

  it("greets by name when not everyone has a salutation, and with no field when neither is had by all", async () => {
    const lacking = (ids: string[]) =>
      exampleWriterData.fields.map((f) => ({ ...f, lacking: ids.includes(f.id) ? 1 : 0 }));
    const { view } = renderWriter({ data: { ...exampleWriterData, fields: lacking(["salutation"]) } });
    await expect.element(letter()).toHaveTextContent("Dear name,");
    (await view).unmount();
    renderWriter({ data: { ...exampleWriterData, fields: lacking(["salutation", "name"]) } });
    await expect.element(letter()).toHaveTextContent("Dear,");
  });

  it("makes a draft once the letter has more than its greeting, and saves the letter's changes", async () => {
    const { actions } = renderWriter();
    await write("Come along.");
    await expect.poll(() => actions.start.mock.calls.length, WAIT).toBe(1);
    expect(JSON.stringify(actions.start.mock.calls[0][1])).toContain("Come along.");
  });

  it("says when someone else saved it first, and saves nothing more", async () => {
    const { actions } = renderWriter({ draft: exampleWrittenMailing });
    actions.save.mockResolvedValueOnce({ saved: false, reason: "conflict" });
    await expect.element(status()).toHaveTextContent(copy.saveStates.saved);
    await subject().fill("Mine");
    await expect.element(page.getByRole("alert")).toHaveTextContent(copy.saveStates.conflict);
    await subject().fill("Mine again");
    await pause(1200);
    expect(actions.save).toHaveBeenCalledTimes(1);
  });

  it("says when a save fails, and tries again, with what failed, at the next change", async () => {
    const { actions } = renderWriter({ draft: exampleWrittenMailing });
    actions.save.mockRejectedValueOnce(new Error("offline"));
    await subject().fill("One");
    await expect.element(status()).toHaveTextContent(copy.saveStates.failed);
    await field(copy.fromLegend).selectOptions("sam@pauseai.uk");
    await expect.poll(() => actions.save.mock.calls.length, WAIT).toBe(2);
    expect(actions.save.mock.calls[1][2]).toEqual({ subject: "One", sentFrom: "sam@pauseai.uk" });
  });

  it("waits for a save under way before the next", async () => {
    const { actions } = renderWriter({ draft: exampleWrittenMailing });
    let finish = () => {};
    actions.save.mockImplementationOnce(
      () => new Promise((resolve) => (finish = () => resolve({ saved: true, version: 4 }))),
    );
    await subject().fill("One");
    await expect.element(status()).toHaveTextContent(copy.saveStates.saving);
    await field(copy.fromLegend).selectOptions("sam@pauseai.uk");
    await pause(1200);
    expect(actions.save).toHaveBeenCalledTimes(1);
    finish();
    await expect.poll(() => actions.save.mock.calls.length, WAIT).toBe(2);
    expect(actions.save.mock.calls[1]).toEqual([12, 4, { sentFrom: "sam@pauseai.uk" }]);
  });

  it("attaches files dropped or picked, making the draft first, and stops at one too big or saved by someone else", async () => {
    const { actions } = renderWriter();
    const drop = new DataTransfer();
    drop.items.add(new File(["x"], "a.pdf", { type: "application/pdf" }));
    drop.items.add(new File(["y"], "b.pdf", { type: "application/pdf" }));
    await expect.element(page.getByText(copy.dropFiles)).toBeVisible();
    const box = page.getByText(copy.dropFiles).element().parentElement!;
    box.dispatchEvent(new DragEvent("dragover", { dataTransfer: drop, bubbles: true, cancelable: true }));
    box.dispatchEvent(new DragEvent("dragleave", { bubbles: true }));
    box.dispatchEvent(new DragEvent("drop", { dataTransfer: drop, bubbles: true, cancelable: true }));
    await expect.poll(() => actions.attach.mock.calls.length, WAIT).toBe(2);
    expect(actions.start).toHaveBeenCalledTimes(1);
    const sent = actions.attach.mock.calls.map(([form]) => {
      const data = form as FormData;
      return [data.get("id"), data.get("version"), (data.get("file") as File).name];
    });
    expect(sent).toEqual([
      ["21", "1", "a.pdf"],
      ["21", "2", "b.pdf"],
    ]);
    await expect.element(page.getByRole("button", { name: copy.removeFile("a.pdf") })).toBeVisible();

    actions.attach.mockResolvedValueOnce({ saved: false, reason: "too-big", attachments: [FILE] });
    const picker = page.elementLocator(box.querySelector("input")!);
    await picker.upload([new File(["x"], "big.pdf"), new File(["x"], "next.pdf")]);
    await expect.element(page.getByText(copy.tooBig)).toBeVisible();
    expect(actions.attach).toHaveBeenCalledTimes(3);
    actions.attach.mockResolvedValueOnce(undefined);
    await picker.upload(new File(["x"], "odd.pdf"));
    await expect.poll(() => actions.attach.mock.calls.length, WAIT).toBe(4);
    actions.attach.mockResolvedValueOnce({ saved: false, reason: "conflict", attachments: [FILE] });
    await picker.upload(new File(["x"], "late.pdf"));
    await expect.element(page.getByRole("alert")).toHaveTextContent(copy.saveStates.conflict);
  });

  it("takes a file off a draft", async () => {
    const { actions } = renderWriter({ draft: exampleWrittenMailing });
    await page.getByRole("button", { name: copy.removeFile("programme.pdf") }).click();
    await expect.poll(() => actions.detach.mock.calls[0], WAIT).toEqual([12, 3, 1]);
    await expect.element(page.getByRole("button", { name: copy.removeFile("programme.pdf") })).not.toBeInTheDocument();
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

  it("explains the ask behind its ?", async () => {
    renderWriter();
    await page.getByRole("button", { name: copy.askHelpLabel }).click();
    await expect.element(page.getByText(copy.askHelp)).toBeVisible();
  });

  it("previews as for those who meet each part's condition, or don't, at a press, and who among them", async () => {
    renderWriter({ draft: exampleWrittenMailing });
    const signed = preview().getByRole("button", { name: /signed/ });
    // Polly, the first, signed.
    await expect.element(signed).toHaveAttribute("aria-pressed", "true");
    await expect.element(preview().getByText("Polly Placeholder <polly@example.org>")).toBeVisible();
    await expect.element(preview().getByText("Thank you for signing the letter.")).toBeVisible();
    await signed.click();
    await expect.element(signed).toHaveAttribute("aria-pressed", "false");
    await expect.element(preview().getByText("Dora Dummy <dora@example.org>")).toBeVisible();
    await expect.element(preview().getByText("Thank you for signing the letter.")).not.toBeInTheDocument();
    await expect.element(preview().getByText("Dear Lady Dummy,")).toBeVisible();
  });

  it("says when no one gave the answers chosen, and shows the email they'd get", async () => {
    const part = (condition: string) => ({
      type: "onlyFor" as const,
      attrs: { condition },
      content: [{ type: "paragraph" as const, content: [{ type: "text" as const, text: condition }] }],
    });
    const two = {
      ...exampleWrittenMailing,
      body: {
        type: "doc" as const,
        content: [part("frontier-ai-letter:signed"), part("!edinburgh-conference-2026:going")],
      },
    };
    renderWriter({ draft: two });
    const going = preview().getByRole("button", { name: /going/ });
    await expect.element(going).toHaveAttribute("aria-pressed", "false");
    await going.click();
    await expect.element(preview().getByText(copy.noOneMix)).toBeVisible();
    await expect.element(preview().getByText("frontier-ai-letter:signed")).toBeVisible();
    await expect.element(preview().getByRole("button", { name: copy.sendTest })).toBeDisabled();
  });

  it("shows anyone the choice picks", async () => {
    const plain = {
      ...exampleWrittenMailing,
      body: {
        type: "doc" as const,
        content: [
          { type: "paragraph" as const, content: [{ type: "field" as const, attrs: { field: "salutation" } }] },
        ],
      },
    };
    renderWriter({ draft: plain });
    await preview().getByRole("combobox", { name: copy.previewAs }).selectOptions("8");
    await expect.element(preview().getByText("Dora Dummy <dora@example.org>")).toBeVisible();
    await expect.element(preview().getByText("Lady Dummy")).toBeVisible();
  });

  it("sends a test copy to yourself once there's a letter, saving the draft first, and says where, or that it couldn't", async () => {
    const { actions } = renderWriter();
    const test = preview().getByRole("button", { name: copy.sendTest });
    await expect.element(test).toBeDisabled();
    await expect.element(preview().getByText(copy.testNeedsDraft)).toBeVisible();
    await write("Come along.");
    await test.click();
    await expect.element(preview().getByText(copy.testSent("jo@pauseai.uk"))).toBeVisible();
    expect(actions.start).toHaveBeenCalledTimes(1);
    expect(actions.sendTest).toHaveBeenCalledWith(21, 7);
    actions.sendTest.mockResolvedValueOnce({ sent: false, reason: "failed" });
    await test.click();
    await expect.element(preview().getByText(copy.testFailed)).toBeVisible();
    actions.sendTest.mockResolvedValueOnce(undefined);
    await test.click();
    await expect.element(preview().getByText(copy.testFailed)).toBeVisible();
  });

  it("has nothing to preview with no one to send to", async () => {
    renderWriter({ data: { ...exampleWriterData, recipients: [] } });
    await expect.element(page.getByText(copy.noOne)).toBeVisible();
  });

  it("sets when it goes, in London's day and hour, never before now, moving an hour gone to the next", async () => {
    vi.useFakeTimers({ now: new Date("2026-07-01T10:30:00Z"), toFake: ["Date"] });
    try {
      const { actions } = renderWriter({ draft: { ...exampleWrittenMailing, dueAt: null } });
      const when = region(copy.sections.when);
      const day = when.getByLabelText(new RegExp(`^${copy.day}`));
      const hour = when.getByRole("combobox");
      await expect.element(hour).toBeDisabled();
      await expect.element(day).toHaveAttribute("min", "2026-07-01");
      // It's 11:30 in London: nine o'clock has gone, so today it moves to noon.
      await day.fill("2026-07-01");
      await expect.poll(() => actions.save.mock.calls.length, WAIT).toBe(1);
      expect(actions.save.mock.calls[0][2]).toEqual({ dueAt: "2026-07-01T11:00:00.000Z" });
      const option = (h: number) => when.getByRole("option", { name: `${String(h).padStart(2, "0")}:00` });
      await expect.element(option(11)).toBeDisabled();
      await expect.element(option(12)).not.toBeDisabled();
      await hour.selectOptions("14");
      await expect.poll(() => actions.save.mock.calls.length, WAIT).toBe(2);
      expect(actions.save.mock.calls[1][2]).toEqual({ dueAt: "2026-07-01T13:00:00.000Z" });
      await expect.element(page.getByText(copy.summary(2, "jo@pauseai.uk", "Wednesday 1 July at 14:00"))).toBeVisible();
      // Another day keeps the hour.
      await day.fill("2026-07-03");
      await expect.poll(() => actions.save.mock.calls.length, WAIT).toBe(3);
      expect(actions.save.mock.calls[2][2]).toEqual({ dueAt: "2026-07-03T13:00:00.000Z" });
      await day.fill("");
      await expect.poll(() => actions.save.mock.calls.length, WAIT).toBe(4);
      expect(actions.save.mock.calls[3][2]).toEqual({ dueAt: null });
    } finally {
      vi.useRealTimers();
    }
  });

  it("opens a draft whose time has gone at the next hour, and saves that", async () => {
    vi.useFakeTimers({ now: new Date("2026-07-01T10:30:00Z"), toFake: ["Date"] });
    try {
      const { actions } = renderWriter({ draft: { ...exampleWrittenMailing, dueAt: "2026-06-01T09:00:00Z" } });
      await expect.poll(() => actions.save.mock.calls.length, WAIT).toBe(1);
      expect(actions.save.mock.calls[0][2]).toEqual({ dueAt: "2026-07-01T11:00:00.000Z" });
    } finally {
      vi.useRealTimers();
    }
  });

  it("can't be scheduled while anything stops it, says what, and that sending isn't built under Send", async () => {
    renderWriter({ draft: { ...exampleWrittenMailing, sentFrom: null } });
    const send = region(copy.sections.send);
    await expect.element(send.getByRole("button", { name: copy.schedule(2) })).toBeDisabled();
    await expect.element(send.getByText(copy.problems["no-sender"])).toBeVisible();
    await expect.element(send.getByText(copy.problems["field-lacking"])).toBeVisible();
    await expect.element(send.getByText(copy.cantSend)).toBeVisible();
    await expect.element(send.getByText(copy.problems["cannot-send"])).not.toBeInTheDocument();
  });

  it("counts a letter of only its greeting as no letter", async () => {
    renderWriter();
    await expect.element(region(copy.sections.send).getByText(copy.problems["no-letter"])).toBeVisible();
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
