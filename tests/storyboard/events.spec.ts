import type { Page } from "@playwright/test";
import { staffCopy } from "@/lib/content/staff-interface";
import { addStaffAccount, importLuma, logInAsStaff, newestEmail } from "../steps";
import { BASE, emailFrame, expect, frame, test } from "./fixtures";

// The events page: our Luma events, coming up and past, and who on staff
// owns each. The Luma import gives events their owners by the rules, and
// emails them; one whose owner by the rules has no account has none, an
// error, until someone is chosen for it, who's emailed too; and an event's
// Google Doc linked.

const copy = staffCopy.events;

/** This flow's own staff address: flows run alongside each other, and share the outbox. */
const staffEmail = () => `events-${test.info().testId.replace(/\W/g, "").slice(-8)}@pauseai.uk`;

async function logIn(page: Page, database: string) {
  addStaffAccount(database, staffEmail());
  return logInAsStaff(page, BASE, staffEmail());
}

test("Events get their owners by the rules, and one with none is given one", async ({
  page,
  request,
  flowDatabase,
}) => {
  // Joseph has an account, so the import gives him every event but Oxford's; Sean, Oxford's by the rules, has none yet.
  addStaffAccount(flowDatabase, "joseph@pauseai.uk");
  await importLuma(request, BASE);
  const josephs = newestEmail((one) => one.To === "joseph@pauseai.uk")!;
  expect(josephs.TextBody).toContain("PauseAI Scotland Meeting");
  expect(josephs.TextBody).not.toContain("AI risk talk");
  await emailFrame(page, josephs, "the email telling Joseph which events the rules gave him, after the Luma import");

  addStaffAccount(flowDatabase, "sean@pauseai.uk");
  await logIn(page, flowDatabase);
  await page.goto(`${BASE}/staff/events`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(copy.title);
  await expect(page.getByRole("link", { name: copy.intro.link })).toHaveAttribute("href", "/staff/import-data/luma");
  const owner = page.getByRole("combobox", { name: copy.ownerLabel("AI risk talk") });
  await expect(owner).toHaveAttribute("aria-invalid", "true");
  await frame(page, "the events page: coming up, Joseph's but for Oxford's, with no owner in red; then those past");

  await owner.selectOption("sean@pauseai.uk");
  await expect(owner).not.toHaveAttribute("aria-invalid");
  await expect(owner).toHaveValue("sean@pauseai.uk");
  await frame(page, "Sean chosen as the Oxford talk's owner, saved at once, so no longer in red");

  const doc = page.getByRole("textbox", { name: copy.docLabel("AI risk talk") });
  await doc.fill("https://docs.google.com/document/d/oxford-talk-plan/edit");
  await page
    .getByRole("listitem")
    .filter({ hasText: "AI risk talk" })
    .getByRole("button", { name: copy.docSave })
    .click();
  await expect(
    page.getByRole("listitem").filter({ hasText: "AI risk talk" }).getByRole("link", { name: copy.doc }),
  ).toHaveAttribute("href", "https://docs.google.com/document/d/oxford-talk-plan/edit");
  await frame(page, "the talk's Google Doc pasted and saved, linked under its name");

  // Both viewports' flows email Sean: this one's names its own address.
  const seans = newestEmail((one) => one.To === "sean@pauseai.uk" && one.TextBody.includes(staffEmail()))!;
  expect(seans.TextBody).toContain("AI risk talk");
  await emailFrame(page, seans, "the email telling Sean they own it, and who chose them");
});
