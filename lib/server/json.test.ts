import { expect, it } from "vitest";
import { parseJsonIfAny, readJsonIfAny } from "./json";

it("parses JSON, and says undefined for anything else", async () => {
  expect(parseJsonIfAny('{"a":1}')).toEqual({ a: 1 });
  expect(parseJsonIfAny("null")).toBeNull();
  expect(parseJsonIfAny("")).toBeUndefined();
  expect(parseJsonIfAny("<html>")).toBeUndefined();
  expect(await readJsonIfAny(new Response('{"error":{"message":"Too many"}}'))).toEqual({
    error: { message: "Too many" },
  });
  expect(await readJsonIfAny(new Response("not json", { status: 502 }))).toBeUndefined();
  expect(await readJsonIfAny(new Request("https://pauseai.uk/x", { method: "POST", body: "[1]" }))).toEqual([1]);
});
