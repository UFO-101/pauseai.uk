import { page, type Locator } from "vitest/browser";
import { longDay } from "@/lib/calendar-days";
import { DATE_PICKER_WORDS } from "@/lib/content/date-picker";

/** Chooses `day` with the date picker `button` opens, moving on a few weeks at a time until it's in view. */
export async function chooseDay(button: Locator, day: string) {
  await button.click();
  const calendar = page.getByRole("dialog");
  const target = calendar.getByRole("button", { name: new RegExp(`^${longDay(day)}`) });
  while (!target.query()) await calendar.getByRole("button", { name: DATE_PICKER_WORDS.later }).click();
  await target.click();
}
