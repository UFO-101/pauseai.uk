import { expect, it } from "vitest";
import { query } from "@/lib/server/db";
import { describeWithDatabase, useTestDatabase } from "@/tests/database";
import { normaliseAddress, recordOptOut, recordResubscribe } from "./opt-outs";

const AT = new Date("2026-10-20T10:00:00Z");
const LATER = new Date("2026-10-21T10:00:00Z");

const jane = (sourceRef = "msg_1", address = "Jane@Example.com ") => ({
  address,
  list: "luma-calendar" as const,
  source: "luma-webhook" as const,
  sourceRef,
  unsubscribedAt: AT,
});

const rows = () =>
  query<{ address: string; source_ref: string; resubscribed_at: Date | null }>(
    "SELECT address, source_ref, resubscribed_at FROM opt_outs ORDER BY id",
  );

it("trims and lowercases an address", () => {
  expect(normaliseAddress(" Jane@Example.COM ")).toBe("jane@example.com");
});

describeWithDatabase("opt-outs", () => {
  useTestDatabase();

  it("records an opt-out once per source reference, with the address lowercased", async () => {
    expect(await recordOptOut(jane())).toBe(true);
    expect(await recordOptOut(jane())).toBe(false);
    expect(await rows()).toEqual([{ address: "jane@example.com", source_ref: "msg_1", resubscribed_at: null }]);
  });

  it("keeps one open opt-out per address and list, whatever told us", async () => {
    expect(await recordOptOut(jane("msg_1"))).toBe(true);
    expect(await recordOptOut(jane("msg_2"))).toBe(false);
    expect(await rows()).toHaveLength(1);
  });

  it("closes the open opt-out when the address subscribes again, and a new opt-out opens another", async () => {
    expect(await recordResubscribe("jane@example.com", "luma-calendar", LATER)).toBe(false);
    await recordOptOut(jane("msg_1"));
    expect(await recordResubscribe("Jane@example.com", "luma-calendar", LATER)).toBe(true);
    expect(await recordResubscribe("jane@example.com", "luma-calendar", LATER)).toBe(false);
    expect(await recordOptOut(jane("msg_2"))).toBe(true);
    expect(await rows()).toEqual([
      { address: "jane@example.com", source_ref: "msg_1", resubscribed_at: LATER },
      { address: "jane@example.com", source_ref: "msg_2", resubscribed_at: null },
    ]);
  });
});
