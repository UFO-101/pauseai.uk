import { afterEach, expect, it, vi } from "vitest";
import { isLettersInboxAddress, lettersInbox, proxyAddress, proxyTag } from "./letters-inbox";

afterEach(() => vi.unstubAllEnvs());

it("builds each proxy from LETTERS_INBOX, and knows its own addresses in any case", () => {
  vi.stubEnv("LETTERS_INBOX", " Letters@Example.org ");
  expect(lettersInbox()).toBe("letters@example.org");
  expect(proxyAddress("jane.smith")).toBe("letters+jane.smith@example.org");
  expect(isLettersInboxAddress("letters@example.org")).toBe(true);
  expect(isLettersInboxAddress(" LETTERS+Jane.Smith@example.org")).toBe(true);
  expect(isLettersInboxAddress("letters@example.com")).toBe(false);
  expect(isLettersInboxAddress("other+letters@example.org")).toBe(false);
  expect(isLettersInboxAddress("not an address")).toBe(false);
  expect(proxyTag("Letters+Jane.Smith@Example.org")).toBe("jane.smith");
  expect(proxyTag("letters@example.org")).toBeUndefined();
  expect(proxyTag("other+jane@example.org")).toBeUndefined();
  expect(proxyTag("letters+jane@example.com")).toBeUndefined();
});

it("has no addresses where LETTERS_INBOX isn't set, and makes no proxy", () => {
  vi.stubEnv("LETTERS_INBOX", "");
  expect(lettersInbox()).toBeUndefined();
  expect(isLettersInboxAddress("letters@example.org")).toBe(false);
  expect(proxyTag("letters+jane@example.org")).toBeUndefined();
  expect(() => proxyAddress("jane")).toThrow("LETTERS_INBOX isn't set");
});
