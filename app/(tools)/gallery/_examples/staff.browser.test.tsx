import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { page } from "vitest/browser";
import { campaigns } from "@/lib/content/email-your-mp";
import { staffCopy } from "@/lib/content/staff-interface";
import {
  HeldSyncExample,
  PoliticianFormExample,
  PoliticianTableEmptyExample,
  PoliticianTableExample,
} from "./staff.client";

const [pm] = campaigns;

// The staff examples' Server Actions are logged, not sent: pressing each adds its line to the event log.
const log = () => page.getByRole("list", { name: "Event log" }).getByRole("listitem");

describe("the staff examples", () => {
  it("logs a held sync's apply and discard", async () => {
    await render(<HeldSyncExample />);
    await page.getByRole("button", { name: staffCopy.syncs.apply }).click();
    await expect.element(log().nth(0)).toHaveTextContent('decide({"id":"3","decision":"apply"})');
    await page.getByRole("button", { name: staffCopy.syncs.discard }).click();
    await expect.element(log().nth(1)).toHaveTextContent('decide({"id":"3","decision":"discard"})');
  });

  it("logs the politician form's save", async () => {
    await render(<PoliticianFormExample />);
    await page.getByRole("button", { name: staffCopy.politician.save }).click();
    await expect
      .element(log().nth(0))
      .toHaveTextContent(
        'action({"id":"9","house":"lords","name":"Lord Example","salutation":"Lord Example","constituency":"","party":"Crossbench","email":""})',
      );
  });

  it("logs marking a politician signed, and undoing it", async () => {
    await render(<PoliticianTableExample />);
    await page.getByRole("button", { name: staffCopy.politicians.unmarkSigned }).click();
    await expect
      .element(log().nth(0))
      .toHaveTextContent(`markSigned({"politicianId":"7","campaign":"${pm.slug}","signed":""})`);
    await page.getByRole("button", { name: staffCopy.politicians.markSigned }).click();
    await expect
      .element(log().nth(1))
      .toHaveTextContent(`markSigned({"politicianId":"8","campaign":"${pm.slug}","signed":"1"})`);
  });

  it("says when no politician matches", async () => {
    await render(<PoliticianTableEmptyExample />);
    await expect.element(page.getByText(staffCopy.politicians.none)).toBeVisible();
  });
});
