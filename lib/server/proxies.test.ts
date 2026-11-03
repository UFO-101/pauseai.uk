import { afterEach, describe, expect, it, vi } from "vitest";
import { addTestPolitician, describeWithDatabase, useTestDatabase } from "@/tests/database";
import { LETTERS_INBOX } from "@/tests/gmail-sends";
import { query } from "./db";
import { mailboxName, mpName, politicianProxy, proxyLine, supporterProxy } from "./proxies";

afterEach(() => vi.unstubAllEnvs());

describe("mailboxName", () => {
  it("spells the sender's name in lowercase ASCII words joined by dots", () => {
    expect(mailboxName("Jane Smith")).toBe("jane.smith");
    expect(mailboxName("  Zoë O’Brien-Smith ")).toBe("zoe.obrien.smith");
    expect(mailboxName("Dr. J. R. Hartley 3rd")).toBe("dr.j.r.hartley.3rd");
    expect(mailboxName("Jürgen Strauß")).toBe("jurgen.strauss");
    expect(mailboxName("Søren Łukasz")).toBe("soren.lukasz");
    expect(mailboxName("Æthelred Œuvre")).toBe("aethelred.oeuvre");
    expect(mailboxName("Đorđe Þór Iğdır")).toBe("dorde.thor.igdir");
    expect(mailboxName('Jane "<script>" Smith@evil.com')).toBe("jane.script.smith.evil.com");
  });

  it("stops at 30 characters, never on a dot", () => {
    expect(mailboxName("Alexandra Montgomery-Fitzwilliam")).toBe("alexandra.montgomery.fitzwilli");
    expect(mailboxName("Abcdefghijklmnopqrstuvwxyz ABCD Efg")).toBe("abcdefghijklmnopqrstuvwxyz.abc");
    expect(mailboxName("Abcdefghijklmnopqrstuvwxyzabc D")).toBe("abcdefghijklmnopqrstuvwxyzabc");
  });

  it("is 'letter' when none of the name is Latin script", () => {
    expect(mailboxName("王小明")).toBe("letter");
    expect(mailboxName("🙂")).toBe("letter");
    expect(mailboxName("")).toBe("letter");
  });
});

describe("mpName", () => {
  it("names the MP, with MP after their name once", () => {
    expect(mpName("Ms Dora Dummy")).toBe("Ms Dora Dummy MP");
    expect(mpName(" Testy McTestface MP ")).toBe("Testy McTestface MP");
    expect(mpName('Rt Hon "Sir" Bob <Smith>')).toBe("Rt Hon Sir Bob Smith MP");
    expect(mpName("Amp")).toBe("Amp MP");
  });
});

describe("proxyLine", () => {
  it("names a proxy as one of ours, at the letters inbox", () => {
    expect(proxyLine('Jane "J" Smith', "jane.smith")).toBe(
      `"Jane J Smith (via PauseAI)" <${LETTERS_INBOX.replace("@", "+jane.smith@")}>`,
    );
  });
});

describeWithDatabase("proxies", () => {
  useTestDatabase();

  it("keys a supporter's by their address, trimmed and lowercased, named from their first name", async () => {
    const first = await supporterProxy(" Jane@Example.com ", "Jane Smith");
    expect(first.tag).toBe("jane.smith");
    expect(await supporterProxy("jane@example.com", "Janet Smythe")).toEqual(first);
    expect((await supporterProxy("other@example.com", "Jane Smith")).tag).toBe("jane.smith.2");
    expect((await supporterProxy("third@example.com", "Jane Smith")).tag).toBe("jane.smith.3");
  });

  it("keys a politician's by them, named as an MP and kept when their name changes", async () => {
    const id = await addTestPolitician({ name: "Meg Hillier" });
    const proxy = await politicianProxy({ id, name: "Meg Hillier" });
    expect(proxy.tag).toBe("meg.hillier.mp");
    expect(await politicianProxy({ id, name: "Dame Meg Hillier" })).toEqual(proxy);
    expect(await query("SELECT count(*)::int AS n FROM proxies")).toEqual([{ n: 1 }]);
  });
});
