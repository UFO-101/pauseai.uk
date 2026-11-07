import { expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { page } from "vitest/browser";
import { staffCopy } from "@/lib/content/staff-interface";
import {
  DraftTitleExample,
  MailingStandingExample,
  MessageCopyViewExample,
  MessageForExample,
  MessageSupportersExample,
  MessageViewExample,
  MessageWriterExample,
  ChoosingMessageFrameExample,
  TemplatePickerExample,
} from "./staff-messages.client";

const copy = staffCopy.messagePages;

it("logs a draft's actions in the writer's example", async () => {
  await render(<MessageWriterExample kind="email" />);
  await page.getByLabelText(copy.subject).fill("Changed");
  await page.getByRole("button", { name: copy.sendTest }).click();
  const log = page.getByRole("list", { name: "Event log" }).getByRole("listitem");
  await expect.element(log.nth(0)).toHaveTextContent('saveMessage(3, 4, {"subject":"Changed"})');
  await expect.element(log.nth(1)).toHaveTextContent('sendMessageTestNow(3, 7, "jo@pauseai.uk")');
});

it("draws each kind of writer", async () => {
  for (const kind of ["choose", "template", "new", "rejected", "off"] as const) {
    const view = await render(<MessageWriterExample kind={kind} />);
    await expect.element(page.getByRole("heading", { name: copy.sections.write })).toBeVisible();
    await view.unmount();
  }
});

it("shows the template chosen, and new words", async () => {
  await render(<TemplatePickerExample />);
  await page.getByRole("radio", { name: /March day reminder/ }).click();
  await expect.element(page.getByText("March day reminder", { exact: true }).last()).toBeVisible();
  await page.getByRole("radio", { name: new RegExp(copy.newTemplate) }).click();
  await expect.element(page.getByText("new", { exact: true })).toBeVisible();
});

it("draws the rest", async () => {
  await render(
    <>
      <DraftTitleExample />
      <MessageSupportersExample />
      <ChoosingMessageFrameExample />
      <MessageViewExample kind="email" />
      <MessageViewExample kind="text" />
      <MessageViewExample kind="waiting" />
      <MessageForExample />
      <MessageCopyViewExample />
      <MessageCopyViewExample email />
    </>,
  );
  await expect.element(page.getByText(copy.waitingStrip)).toBeVisible();
});

it("does nothing when an action is pressed", async () => {
  await render(<MailingStandingExample />);
  await page.getByRole("button", { name: staffCopy.mailingPages.stopSending }).click();
  await expect.element(page.getByRole("button", { name: staffCopy.mailingPages.stopSending })).toBeVisible();
});
