import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";
import { chooseDay } from "@/tests/browser/date-picker";
import { page, userEvent } from "vitest/browser";
import { staffCopy } from "@/lib/content/staff-interface";
import { DEFAULT_SENDER } from "@/lib/gmail-connect";
import { MAX_ATTACHMENT_BYTES } from "@/lib/mailing-attachments";
import { navigation } from "@/tests/browser/navigation";
import MailingWriter, { type MailingWriterActions } from "./MailingWriter";
import { exampleWriterData, exampleWrittenMailing } from "./MailingWriter.examples";

// Following a link that saves first leaves the page, which would take the test with it.
const { leavePage } = vi.hoisted(() => ({ leavePage: vi.fn() }));
vi.mock("@/lib/leave-page", () => ({ leavePage }));
afterEach(() => leavePage.mockClear());

const copy = staffCopy.mailingPages;
const WAIT = { timeout: 3000 };
const FILE = { id: 3, filename: "a.pdf", contentType: "application/pdf", size: 1 };

/** Server Actions that answer as a draft's would, each a mock to change. */
/** A Server Action's stand-in, taking anything, answering as `answer` does. */
const action = (answer: () => unknown) => vi.fn<(...args: unknown[]) => Promise<unknown>>(async () => answer());

function fakeActions() {
  let version = 1;
  return {
    start: action(() => ({ id: 21, version: 1 })),
    save: action(() => ({ saved: true, version: ++version })),
    attach: action(() => ({ saved: true, version: ++version, attachments: [FILE] })),
    detach: action(() => ({ saved: true, version: ++version, attachments: [] })),
    sendTest: action(() => ({ sent: true, id: "m", to: "jo@pauseai.uk" })),
    schedule: action(() => ({ scheduled: true })),
    deleteDraft: vi.fn(async () => {}),
  };
}

async function renderWriter(props: Partial<Parameters<typeof MailingWriter>[0]> = {}) {
  const actions = fakeActions();
  const view = await render(
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
    const { actions } = await renderWriter();
    await expect.element(letter()).toHaveTextContent("Dear salutation,");
    await expect.poll(() => status().element().textContent).toBe("");
    await field(copy.ask).selectOptions("frontier-ai-letter");
    await pause(1200);
    expect(actions.start).not.toHaveBeenCalled();
    await subject().fill("Hello");
    await expect.poll(() => actions.start.mock.calls.length, WAIT).toBe(1);
    expect(actions.start.mock.calls[0][0]).toEqual(exampleWriterData.filter.params);
    // From the first connected Gmail, to start with.
    expect(actions.start.mock.calls[0][1]).toMatchObject({
      subject: "Hello",
      ask: "frontier-ai-letter",
      sentFrom: "al@pauseai.uk",
    });
    await expect.element(status()).toHaveTextContent(copy.savePill.saved);
    expect(location.pathname).toBe("/staff/mailings/21");
    history.replaceState(null, "", "/");
    await expect.element(page.getByRole("heading", { level: 1 })).toHaveTextContent("Hello");
    await expect.element(page.getByRole("button", { name: copy.deleteDraft })).toBeVisible();
    await expect
      .element(page.getByRole("link", { name: copy.changeWho }))
      .toHaveAttribute("href", "/staff/politicians?house=commons&party=%21Labour&ask=frontier-ai-letter&mailing=21");

    // Each change after, a moment later, as a save of only what changed.
    await field(copy.fromLegend).selectOptions("samuel.whitlock@pauseai.uk");
    await field(copy.ask).selectOptions("");
    await expect.poll(() => actions.save.mock.calls.length, WAIT).toBe(1);
    expect(actions.save.mock.calls[0]).toEqual([21, 1, { sentFrom: "samuel.whitlock@pauseai.uk", ask: null }]);
    await field(copy.fromLegend).selectOptions("al@pauseai.uk");
    await expect.poll(() => actions.save.mock.calls.length, WAIT).toBe(2);
    expect(actions.save.mock.calls[1]).toEqual([21, 2, { sentFrom: "al@pauseai.uk" }]);
  });

  it("greets by name when not everyone has a salutation, and with no field when neither is had by all", async () => {
    const lacking = (ids: string[]) =>
      exampleWriterData.fields.map((f) => ({ ...f, lacking: ids.includes(f.id) ? 1 : 0 }));
    const { view } = await renderWriter({ data: { ...exampleWriterData, fields: lacking(["salutation"]) } });
    await expect.element(letter()).toHaveTextContent("Dear name,");
    await view.unmount();
    await renderWriter({ data: { ...exampleWriterData, fields: lacking(["salutation", "name"]) } });
    await expect.element(letter()).toHaveTextContent("Dear,");
  });

  it("makes a draft once the letter has more than its greeting, and saves the letter's changes", async () => {
    const here = location.href;
    const { actions } = await renderWriter();
    await write("Come along.");
    // Made once; typing slower than the save's wait makes it partway through, the rest coming in the next save.
    const newest = () =>
      JSON.stringify(
        [...actions.start.mock.calls.map((call) => call[1]), ...actions.save.mock.calls.map((call) => call[2])].at(-1),
      );
    await expect.poll(newest, WAIT).toContain("Come along.");
    expect(actions.start).toHaveBeenCalledTimes(1);
    // The address is the draft's, so a reload opens it; the tests' page goes back to its own.
    await expect.poll(() => location.pathname, WAIT).toBe("/staff/mailings/21");
    history.replaceState(null, "", here);
  });

  it("says when someone else saved it first, and saves nothing more", async () => {
    const { actions } = await renderWriter({ draft: exampleWrittenMailing });
    actions.save.mockResolvedValueOnce({ saved: false, reason: "conflict" });
    await expect.element(status()).toHaveTextContent(copy.savePill.saved);
    await subject().fill("Mine");
    await expect.element(page.getByRole("alert")).toHaveTextContent(copy.saveStates.conflict);
    await subject().fill("Mine again");
    await pause(1200);
    expect(actions.save).toHaveBeenCalledTimes(1);
  });

  it("says when a save fails, and tries again, with what failed, at the next change", async () => {
    const { actions } = await renderWriter({ draft: exampleWrittenMailing });
    actions.save.mockRejectedValueOnce(new Error("offline"));
    await subject().fill("One");
    await expect.element(status()).toHaveTextContent(copy.savePill.failed);
    await field(copy.fromLegend).selectOptions("samuel.whitlock@pauseai.uk");
    await expect.poll(() => actions.save.mock.calls.length, WAIT).toBe(2);
    expect(actions.save.mock.calls[1][2]).toEqual({
      subject: "One",
      sentFrom: "samuel.whitlock@pauseai.uk",
    });
  });

  it("waits for a save under way before the next", async () => {
    const { actions } = await renderWriter({ draft: exampleWrittenMailing });
    let finish = () => {};
    actions.save.mockImplementationOnce(
      () => new Promise((resolve) => (finish = () => resolve({ saved: true, version: 4 }))),
    );
    await subject().fill("One");
    await expect.element(status()).toHaveTextContent(copy.savePill.saving);
    await field(copy.fromLegend).selectOptions("samuel.whitlock@pauseai.uk");
    await pause(1200);
    expect(actions.save).toHaveBeenCalledTimes(1);
    finish();
    await expect.poll(() => actions.save.mock.calls.length, WAIT).toBe(2);
    expect(actions.save.mock.calls[1]).toEqual([12, 4, { sentFrom: "samuel.whitlock@pauseai.uk" }]);
  });

  it("attaches files dropped or picked, making the draft first, and stops at one too big or saved by someone else", async () => {
    const { actions } = await renderWriter();
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

  it("says a file is too big without sending it, and that one failed to send", async () => {
    const { actions } = await renderWriter({ draft: exampleWrittenMailing });
    const picker = page.elementLocator(document.querySelector<HTMLInputElement>('input[type="file"]')!);
    const big = new File([new Uint8Array(MAX_ATTACHMENT_BYTES + 1)], "big.pdf");
    await picker.upload([big, new File(["x"], "next.pdf")]);
    await expect.element(page.getByText(copy.tooBig)).toBeVisible();
    expect(actions.attach).not.toHaveBeenCalled();

    actions.attach.mockRejectedValueOnce(new Error("Body exceeded 5mb limit"));
    await picker.upload([new File(["x"], "a.pdf"), new File(["x"], "b.pdf")]);
    await expect.element(page.getByText(copy.attachFailed)).toBeVisible();
    expect(actions.attach).toHaveBeenCalledTimes(1);
  });

  it("takes a file off a draft", async () => {
    const { actions } = await renderWriter({ draft: exampleWrittenMailing });
    await page.getByRole("button", { name: copy.removeFile("programme.pdf") }).click();
    await expect.poll(() => actions.detach.mock.calls[0], WAIT).toEqual([12, 3, 1]);
    await expect.element(page.getByRole("button", { name: copy.removeFile("programme.pdf") })).not.toBeInTheDocument();
  });

  it("shows who it's to, who's left out and why, and a filter the site no longer knows", async () => {
    await renderWriter({ data: { ...exampleWriterData, unknown: ["party=Gone"] } });
    await expect.element(page.getByText("Who it's to")).toBeVisible();
    await expect.element(page.getByText(copy.willGet(2))).toBeVisible();
    await expect.element(page.getByText(copy.unknownFilter("party=Gone"))).toBeVisible();
    // The left out, opened by their summary's arrow.
    await page.getByText(/the filter found/).click();
    await expect
      .element(page.getByRole("link", { name: "Ned Noaddress" }))
      .toHaveAttribute("href", "/staff/politicians/9");
    await expect.element(page.getByText(copy.leftOutReasons.blocked)).toBeVisible();
    await expect
      .element(page.getByRole("link", { name: copy.changeWho }))
      .toHaveAttribute("href", "/staff/politicians?house=commons&party=%21Labour&ask=frontier-ai-letter&mailing=new");
  });

  it("explains the ask behind its ?", async () => {
    await renderWriter();
    await page.getByRole("button", { name: copy.askHelpLabel }).click();
    await expect.element(page.getByText(copy.askHelp)).toBeVisible();
  });

  it("previews as for those who meet each part's condition, or don't, at a press, and who among them", async () => {
    await renderWriter({ draft: exampleWrittenMailing });
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

  it("says when no one gave the answers chosen, and shows no email", async () => {
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
    await renderWriter({ draft: two });
    const going = preview().getByRole("button", { name: /going/ });
    await expect.element(going).toHaveAttribute("aria-pressed", "false");
    await going.click();
    await expect.element(preview().getByText(copy.noOneMix)).toBeVisible();
    // No email at all, rather than one made up.
    await expect.element(preview().getByText("frontier-ai-letter:signed")).not.toBeInTheDocument();
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
    await renderWriter({ draft: plain });
    await preview()
      .getByRole("combobox", { name: new RegExp(`^${copy.chooseRecipient}`) })
      .selectOptions("8");
    await expect.element(preview().getByText("Dora Dummy <dora@example.org>")).toBeVisible();
    await expect.element(preview().getByText("Lady Dummy")).toBeVisible();
  });

  it("shows the first recipient once the one chosen is no longer among them", async () => {
    const plain = {
      ...exampleWrittenMailing,
      body: {
        type: "doc" as const,
        content: [{ type: "paragraph" as const, content: [{ type: "field" as const, attrs: { field: "name" } }] }],
      },
    };
    const { view, actions } = await renderWriter({ draft: plain });
    await expect.element(preview().getByText("Polly Placeholder <polly@example.org>")).toBeVisible();
    await view.rerender(
      <MailingWriter
        data={{ ...exampleWriterData, recipients: exampleWriterData.recipients.slice(1) }}
        draft={plain}
        who={<p>{"Who it's to"}</p>}
        actions={actions as unknown as MailingWriterActions}
      />,
    );
    await expect.element(preview().getByText("Dora Dummy <dora@example.org>")).toBeVisible();
  });

  it("names a part for an answer no ask has any more by its ID, to find who it's for", async () => {
    const gone = {
      ...exampleWrittenMailing,
      body: {
        type: "doc" as const,
        content: [
          {
            type: "onlyFor" as const,
            attrs: { condition: "old-event:going" },
            content: [{ type: "paragraph" as const, content: [{ type: "text" as const, text: "See you." }] }],
          },
        ],
      },
    };
    await renderWriter({ draft: gone });
    await expect.element(preview().getByRole("button", { name: "old-event:going" })).toBeVisible();
  });

  it("sends a test copy, to you unless you give another address, once there's a letter, saving the draft first, and says where, or that it couldn't", async () => {
    const { actions } = await renderWriter();
    const test = preview().getByRole("button", { name: copy.sendTest });
    const to = preview().getByLabelText(copy.sendTestTo);
    await expect.element(to).toHaveValue("jo@pauseai.uk");
    await expect.element(test).toBeDisabled();
    await expect.element(preview().getByText(copy.testNeedsDraft)).toBeVisible();
    // It goes from the Gmail chosen, which is connected.
    await expect.element(preview().getByText(copy.testVia("al@pauseai.uk"))).toBeVisible();
    await write("Come along.");
    await test.click();
    await expect.element(preview().getByText(copy.testSent("jo@pauseai.uk"))).toBeVisible();
    expect(actions.start).toHaveBeenCalledTimes(1);
    expect(actions.sendTest).toHaveBeenCalledWith(21, 7, "jo@pauseai.uk");
    // Another address; one that isn't one can't be sent to.
    await to.fill("not an address");
    await expect.element(test).toBeDisabled();
    await to.fill(" sam@example.org ");
    await test.click();
    await expect.poll(() => actions.sendTest.mock.calls.at(-1)).toEqual([21, 7, "sam@example.org"]);
    actions.sendTest.mockResolvedValueOnce({ sent: false, reason: "failed" });
    await test.click();
    await expect.element(preview().getByText(copy.testFailed)).toBeVisible();
    actions.sendTest.mockResolvedValueOnce(undefined);
    await test.click();
    await expect.element(preview().getByText(copy.testFailed)).toBeVisible();
  });

  it("has nothing to preview with no one to send to", async () => {
    await renderWriter({ data: { ...exampleWriterData, recipients: [] } });
    await expect.element(page.getByText(copy.noOne)).toBeVisible();
  });

  it("sets when it goes, in London's day and hour, starting today with no hour, never too soon", async () => {
    vi.useFakeTimers({ now: new Date("2026-07-01T10:30:00Z"), toFake: ["Date"] });
    try {
      const { actions } = await renderWriter({ draft: { ...exampleWrittenMailing, dueAt: null } });
      const when = region(copy.sections.when);
      const day = when.getByRole("button", { name: copy.day });
      const hour = when.getByRole("combobox");
      await expect.element(day).toHaveTextContent("Wed 1 Jul 2026");
      await expect.element(hour).toHaveValue("");
      // It's 11:30 in London: noon is the first hour it can go at.
      const option = (h: number) => when.getByRole("option", { name: `${String(h).padStart(2, "0")}:18` });
      await expect.element(option(11)).toBeDisabled();
      await expect.element(option(12)).not.toBeDisabled();
      // Another day, still with no hour, saves nothing.
      await chooseDay(day, "2026-07-03");
      await pause(1200);
      expect(actions.save).not.toHaveBeenCalled();
      await hour.selectOptions("14");
      await expect.poll(() => actions.save.mock.calls.length, WAIT).toBe(1);
      expect(actions.save.mock.calls[0][2]).toEqual({ dueAt: "2026-07-03T13:00:00.000Z" });
      await expect.element(page.getByText(copy.summary(2, "jo@pauseai.uk", "Friday 3 July at 14:18"))).toBeVisible();
      // Back to today, an hour too soon moves on to the first it can go at; another keeps it.
      await hour.selectOptions("9");
      await expect.poll(() => actions.save.mock.calls.length, WAIT).toBe(2);
      expect(actions.save.mock.calls[1][2]).toEqual({ dueAt: "2026-07-03T08:00:00.000Z" });
      await chooseDay(day, "2026-07-01");
      await expect.poll(() => actions.save.mock.calls.length, WAIT).toBe(3);
      expect(actions.save.mock.calls[2][2]).toEqual({ dueAt: "2026-07-01T11:00:00.000Z" });
    } finally {
      vi.useRealTimers();
    }
  });

  it("opens a draft whose time has gone at the next hour, and saves that", async () => {
    vi.useFakeTimers({ now: new Date("2026-07-01T10:30:00Z"), toFake: ["Date"] });
    try {
      const { actions } = await renderWriter({ draft: { ...exampleWrittenMailing, dueAt: "2026-06-01T09:00:00Z" } });
      await expect.poll(() => actions.save.mock.calls.length, WAIT).toBe(1);
      expect(actions.save.mock.calls[0][2]).toEqual({ dueAt: "2026-07-01T11:00:00.000Z" });
    } finally {
      vi.useRealTimers();
    }
  });

  it("can't be scheduled while anything stops it, and says what", async () => {
    await renderWriter({
      draft: { ...exampleWrittenMailing, sentFrom: null },
      data: { ...exampleWriterData, sends: false },
    });
    const send = region(copy.sections.send);
    await expect.element(send.getByRole("button", { name: copy.schedule(2) })).toBeDisabled();
    await expect.element(send.getByText(copy.problems["no-sender"])).toBeVisible();
    await expect.element(field(copy.fromLegend)).toHaveValue("");
    await expect.element(page.getByRole("option", { name: copy.choose }).first()).toBeDisabled();
    await expect.element(send.getByText(copy.problems["field-lacking"])).toBeVisible();
    await expect.element(send.getByText(copy.cantSend)).toBeVisible();
    await expect.element(send.getByText(copy.problems["cannot-send"])).not.toBeInTheDocument();
  });

  it("counts a letter of only its greeting as no letter", async () => {
    await renderWriter();
    await expect.element(region(copy.sections.send).getByText(copy.problems["no-letter"])).toBeVisible();
  });

  it("schedules one that's ready, and shows it scheduled from the page's top; not one someone changed first", async () => {
    const ready = {
      ...exampleWrittenMailing,
      sentFrom: "samuel.whitlock@pauseai.uk",
      dueAt: "2099-12-01T09:00:00Z",
    };
    const data = { ...exampleWriterData, fields: [] };
    const { actions } = await renderWriter({ data, draft: ready });
    await expect.element(page.getByText(copy.cantSend)).not.toBeInTheDocument();
    const schedule = page.getByRole("button", { name: copy.schedule(2) });
    // Refused, it's pressed again.
    actions.schedule.mockResolvedValueOnce({ scheduled: false, reason: "conflict" });
    await schedule.click();
    await expect.poll(() => actions.schedule.mock.calls.length, WAIT).toBe(1);
    await expect.element(schedule).toBeEnabled();
    expect(navigation.refreshes).toBe(0);
    await schedule.click();
    await expect.poll(() => navigation.refreshes, WAIT).toBe(1);
    expect(window.scrollY).toBe(0);
    expect(actions.schedule).toHaveBeenLastCalledWith(12, 3);
    // Pending still, till the scheduled mailing's page comes.
    await expect.element(schedule).toHaveAttribute("aria-busy", "true");
  });

  it("is sent from a connected Gmail, the first to start with, saying what each has left today; and the way to connect yours", async () => {
    await renderWriter();
    const from = region(copy.sections.from);
    expect(
      from
        .getByRole("option")
        .all()
        .map((option) => option.element().textContent),
    ).toEqual(["al@pauseai.uk", "samuel.whitlock@pauseai.uk"]);
    await expect.element(field(copy.fromLegend)).toHaveValue("al@pauseai.uk");
    await expect.element(from.getByRole("link", { name: copy.connectOne })).toHaveAttribute("href", "/staff/me#gmail");
    // The preview's From: the name the Gmail sends as, or with none, its address alone.
    const preview = region(copy.sections.preview);
    await expect.element(preview.getByText("Al Example <al@pauseai.uk>")).toBeVisible();
    await field(copy.fromLegend).selectOptions("samuel.whitlock@pauseai.uk");
    await expect.element(from.getByText(staffCopy.gmail.sentToday(120, "1,800"))).toBeVisible();
    await expect.element(preview.getByText("samuel.whitlock@pauseai.uk", { exact: true })).toBeVisible();
  });

  it("hides the way to connect yours once it's connected", async () => {
    await renderWriter({ data: { ...exampleWriterData, me: "al@pauseai.uk" } });
    await expect.element(field(copy.fromLegend)).toHaveValue("al@pauseai.uk");
    expect(region(copy.sections.from).getByRole("link").query()).toBeNull();
  });

  it("is from the Gmail's own name, filled in to edit, until another's given", async () => {
    const { actions } = await renderWriter({
      draft: { ...exampleWrittenMailing, sentFrom: "al@pauseai.uk", fromName: "" },
    });
    const name = field(copy.fromNameLabel);
    await expect.element(name).toHaveValue("Al Example");
    // Until it's edited, it follows the Gmail chosen; one with no name of its own leaves it empty.
    await field(copy.fromLegend).selectOptions("samuel.whitlock@pauseai.uk");
    await expect.element(name).toHaveValue("");
    await field(copy.fromLegend).selectOptions("al@pauseai.uk");
    await name.fill("Al for PauseAI UK");
    await expect.poll(() => actions.save.mock.calls.length, WAIT).toBe(1);
    expect(actions.save.mock.calls[0][2]).toEqual({ sentFrom: "al@pauseai.uk", fromName: "Al for PauseAI UK" });
    await expect.element(preview().getByText("Al for PauseAI UK <al@pauseai.uk>")).toBeVisible();
    // Another Gmail keeps the name given.
    await field(copy.fromLegend).selectOptions("samuel.whitlock@pauseai.uk");
    await expect.element(name).toHaveValue("Al for PauseAI UK");
    await expect.element(preview().getByText("Al for PauseAI UK <samuel.whitlock@pauseai.uk>")).toBeVisible();
    // Emptied, it's the Gmail's own name again once you leave it.
    await name.clear();
    await expect.element(name).toHaveValue("");
    await expect.element(preview().getByText("samuel.whitlock@pauseai.uk", { exact: true })).toBeVisible();
    await userEvent.tab();
    await field(copy.fromLegend).selectOptions("al@pauseai.uk");
    await expect.element(name).toHaveValue("Al Example");
  });

  it("starts from the policy team's Gmail when it's connected, first in the list", async () => {
    const policy = {
      email: DEFAULT_SENDER,
      name: "PauseAI Policy Team",
      connectedAt: "2026-10-03T09:00:00Z",
      sentToday: 0,
      remaining: 1800,
    };
    await renderWriter({ data: { ...exampleWriterData, senders: [...exampleWriterData.senders, policy] } });
    await expect.element(field(copy.fromLegend)).toHaveValue(DEFAULT_SENDER);
    expect(
      region(copy.sections.from)
        .getByRole("option")
        .all()
        .map((option) => option.element().textContent),
    ).toEqual([DEFAULT_SENDER, "al@pauseai.uk", "samuel.whitlock@pauseai.uk"]);
  });

  it("with no Gmail connected, says so in place of the choice, and links to where one is connected", async () => {
    await renderWriter({ data: { ...exampleWriterData, senders: [] } });
    const from = region(copy.sections.from);
    await expect.element(from.getByText(copy.noSenders)).toBeVisible();
    expect(from.getByRole("combobox").query()).toBeNull();
    await expect.element(from.getByRole("link", { name: copy.connectOne })).toBeVisible();
  });

  it("says only its owner can connect someone else's Gmail, chosen before it was disconnected", async () => {
    await renderWriter({ draft: { ...exampleWrittenMailing, sentFrom: "kim@pauseai.uk", fromName: null } });
    const from = region(copy.sections.from);
    await expect.element(from.getByText(copy.notConnected)).toBeVisible();
    await expect.element(field(copy.fromLegend)).toHaveValue("kim@pauseai.uk");
    // With no Gmail to take its name from, the name's empty.
    await expect.element(field(copy.fromNameLabel)).toHaveValue("");
    await expect.element(region(copy.sections.send).getByText(copy.problems["not-connected"])).toBeVisible();
  });

  it("saves a draft's change before Change who goes to the list", async () => {
    const { actions } = await renderWriter({ draft: exampleWrittenMailing });
    await field(copy.subject).fill("Changed at once");
    await page.getByRole("link", { name: copy.changeWho }).click();
    await expect.poll(() => leavePage.mock.calls.length, WAIT).toBe(1);
    expect(actions.save).toHaveBeenCalledTimes(1);
    expect(actions.save.mock.calls[0][2]).toEqual({ subject: "Changed at once" });
    expect(leavePage.mock.calls[0][0]).toMatch(/[?&]mailing=12$/);
  });

  it("shows Change who pending from its click, while the draft's saved and the list comes", async () => {
    const { actions } = await renderWriter({ draft: exampleWrittenMailing });
    let finish = () => {};
    actions.save.mockImplementation(async () => {
      await new Promise<void>((resolve) => (finish = resolve));
      return { saved: true, version: 2 };
    });
    await field(copy.subject).fill("Changed at once");
    const link = page.getByRole("link", { name: copy.changeWho });
    await link.click();
    await expect.element(link).toHaveAttribute("aria-busy", "true");
    finish();
    await expect.poll(() => leavePage.mock.calls.length, WAIT).toBe(1);
    // Still pending until the list's page replaces this one.
    await expect.element(link).toHaveAttribute("aria-busy", "true");
  });

  it("makes a new mailing a draft before Change who, so the list chooses for it", async () => {
    const { actions } = await renderWriter();
    await field(copy.subject).fill("Kept");
    await page.getByRole("link", { name: copy.changeWho }).click();
    await expect.poll(() => leavePage.mock.calls.length, WAIT).toBe(1);
    expect(actions.start).toHaveBeenCalledTimes(1);
    expect(leavePage.mock.calls[0][0]).toMatch(/[?&]mailing=21$/);
  });

  it("keeps a new mailing with nothing worth keeping new, through Change who", async () => {
    const { actions } = await renderWriter();
    await page.getByRole("link", { name: copy.changeWho }).click();
    await expect.poll(() => leavePage.mock.calls.length, WAIT).toBe(1);
    expect(actions.start).not.toHaveBeenCalled();
    expect(leavePage.mock.calls[0][0]).toMatch(/[?&]mailing=new$/);
  });

  it("adds an ask from a new mailing with nothing worth keeping, coming back to the new mailing", async () => {
    const { actions } = await renderWriter();
    await page.getByRole("link", { name: copy.newAsk.link }).click();
    await expect.poll(() => leavePage.mock.calls.length, WAIT).toBe(1);
    expect(actions.start).not.toHaveBeenCalled();
    expect(leavePage.mock.calls[0][0]).toMatch(/\/staff\/asks\/new\?back=%2Fstaff%2Fmailings%2Fnew/);
  });

  it("adds an ask on the asks page, saving first, and coming back to the draft", async () => {
    await renderWriter({ draft: exampleWrittenMailing });
    const link = page.getByRole("link", { name: copy.newAsk.link });
    await link.click();
    await expect.poll(() => leavePage.mock.calls.length, WAIT).toBe(1);
    // Marked for the line along the top, till the asks page comes.
    await expect.element(link).toHaveAttribute("data-pending", "true");
    expect(leavePage.mock.calls[0][0]).toMatch(/\/staff\/asks\/new\?back=%2Fstaff%2Fmailings%2F12$/);
  });

  it("previews an empty letter for one it can't read, such as a part for only some in a list", async () => {
    const odd = {
      type: "doc" as const,
      content: [{ type: "bulletList", content: [{ type: "listItem", content: [{ type: "onlyFor", content: [] }] }] }],
    };
    await renderWriter({ draft: { ...exampleWrittenMailing, body: odd as never } });
    await expect.element(page.getByText(copy.problems["no-letter"])).toBeVisible();
  });
});
