import "server-only";
import { fixturesEnabled } from "@/lib/fixtures-enabled";
import type { MessageChannel } from "@/lib/supporter-messages";
import type { ChannelResult } from "./mailing-channels";

// What sends a message to a supporter once it's written: a real backend for
// each channel is still to come, so on the live site nothing does, and the
// pages say so. A fixture build has a fake, so its flows can be driven whole.

/** One message or reply to one supporter, as a backend sends it. */
export type SupporterMessage = { channel: MessageChannel; to: string; subject: string; text: string };

export type MessageBackend = { send(message: SupporterMessage): Promise<ChannelResult> };

const fakeBackend: MessageBackend = { send: async ({ to }) => ({ sent: true, id: `fake-${to}` }) };

/** What sends messages to supporters, if anything does yet. */
export function messageBackend(): MessageBackend | undefined {
  return fixturesEnabled() ? fakeBackend : undefined;
}

/** The WhatsApp business account's number, as texts appear from it, if one is set. */
export function textSenderNumber(): string | null {
  return process.env.WHATSAPP_NUMBER || null;
}
