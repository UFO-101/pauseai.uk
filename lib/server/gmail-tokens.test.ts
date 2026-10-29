import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { decryptToken, encryptToken } from "./gmail-tokens";

const KEY = Buffer.alloc(32, 7).toString("base64");

beforeEach(() => vi.stubEnv("GMAIL_TOKEN_KEY", KEY));
afterEach(() => vi.unstubAllEnvs());

describe("Gmail tokens", () => {
  it("encrypts a token differently each time, and decrypts it", () => {
    const one = encryptToken("refresh-token");
    expect(one.toString("utf8")).not.toContain("refresh-token");
    expect(one.equals(encryptToken("refresh-token"))).toBe(false);
    expect(decryptToken(one)).toBe("refresh-token");
  });

  it("refuses a token that was changed, or one encrypted with another key", () => {
    const sealed = encryptToken("refresh-token");
    const changed = Buffer.from(sealed);
    changed[14] ^= 1;
    expect(() => decryptToken(changed)).toThrow();
    vi.stubEnv("GMAIL_TOKEN_KEY", Buffer.alloc(32, 8).toString("base64"));
    expect(() => decryptToken(sealed)).toThrow();
  });

  it("needs a key of 32 bytes", () => {
    vi.stubEnv("GMAIL_TOKEN_KEY", "c2hvcnQ=");
    expect(() => encryptToken("x")).toThrow("GMAIL_TOKEN_KEY must be 32 bytes");
    vi.stubEnv("GMAIL_TOKEN_KEY", undefined);
    expect(() => encryptToken("x")).toThrow("GMAIL_TOKEN_KEY must be 32 bytes");
  });
});
