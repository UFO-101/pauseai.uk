// Carries a lookup from one campaign's page to the next, when the MP has
// already done the first: the next page opens with the same name, postcode
// and MP, and says why it's there. In sessionStorage, as the move is a full
// page load (lib/navigate.ts).
import type { Mp, MpStatuses } from "@/lib/email-your-mp";

const KEY = "email-your-mp-handoff";

export type Handoff = {
  /** The slug of the campaign the MP had already done. */
  from: string;
  /** The slug of the campaign whose page this is for. */
  to: string;
  name: string;
  postcode: string;
  mp: Mp;
  statuses: MpStatuses;
};

/** False if the browser won't store it, in which case the page stays put. */
export function leaveHandoff(handoff: Handoff): boolean {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(handoff));
    return true;
  } catch {
    return false;
  }
}

/** The handoff left for this campaign's page, if any. Read once, so a reload starts afresh. */
export function takeHandoff(to: string): Handoff | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    sessionStorage.removeItem(KEY);
    const handoff: Handoff | null = raw ? JSON.parse(raw) : null;
    return handoff?.to === to ? handoff : null;
  } catch {
    return null;
  }
}
