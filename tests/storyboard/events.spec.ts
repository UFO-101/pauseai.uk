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
  const talk = page.getByRole("listitem").filter({ hasText: "AI risk talk" });
  await expect(talk.getByText(copy.noOwner)).toBeVisible();
  await frame(
    page,
    "the events page: coming up, Joseph's but for Oxford's, with no owner in red, and none with a doc; then those past",
  );

  await talk.getByRole("button", { name: copy.editLabel("AI risk talk") }).click();
  const form = page.getByRole("form", { name: copy.editLabel("AI risk talk") });
  await form.getByLabel(copy.owner).selectOption("sean@pauseai.uk");
  await form.getByLabel(copy.docField).fill("https://docs.google.com/document/d/oxford-talk-plan/edit");
  await frame(page, "the Oxford talk opened to edit: Sean chosen as its owner, and its Google Doc pasted");

  await form.getByRole("button", { name: copy.save }).click();
  await expect(form).not.toBeVisible();
  await expect(talk.getByText("sean@pauseai.uk", { exact: true })).toBeVisible();
  await expect(talk.getByRole("link", { name: copy.doc })).toHaveAttribute(
    "href",
    "https://docs.google.com/document/d/oxford-talk-plan/edit",
  );
  await frame(page, "saved: Sean owns it, and its Google Doc is linked, so neither is in red");

  // Both viewports' flows email Sean: this one's names its own address.
  const seans = newestEmail((one) => one.To === "sean@pauseai.uk" && one.TextBody.includes(staffEmail()))!;
  expect(seans.TextBody).toContain("AI risk talk");
  await emailFrame(page, seans, "the email telling Sean they own it, and who chose them");
});
