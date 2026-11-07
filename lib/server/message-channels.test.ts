import { afterEach, expect, it, vi } from "vitest";
import { messageBackend, textSenderNumber } from "./message-channels";

afterEach(() => vi.unstubAllEnvs());

it("has nothing to send a message by on the live site", () => {
  vi.stubEnv("DATA_FIXTURES", "");
  expect(messageBackend()).toBeUndefined();
});

it("has a fake on a fixture build", async () => {
  vi.stubEnv("DATA_FIXTURES", "1");
  await expect(
    messageBackend()!.send({ channel: "text", to: "+447700900001", subject: "Hello", text: "Hi" }),
  ).resolves.toEqual({ sent: true, id: "fake-+447700900001" });
});

it("gives the WhatsApp number, if one is set", () => {
  vi.stubEnv("WHATSAPP_NUMBER", "");
  expect(textSenderNumber()).toBeNull();
  vi.stubEnv("WHATSAPP_NUMBER", "+447700900000");
  expect(textSenderNumber()).toBe("+447700900000");
});
