import "server-only";
import type { Mp, MpStatuses } from "@/lib/email-your-mp";
import { fetchParliamentarian } from "./airtable";

/**
 * What this MP has done for each campaign. Read from Airtable for now. If
 * Airtable can't say, the MP is treated as not having done anything: the
 * form still works, it just asks rather than thanks.
 */
export async function statusesFor(mp: Mp): Promise<MpStatuses> {
  const token = process.env.AIRTABLE_TOKEN;
  if (!token || !mp.email) return {};
  try {
    return (await fetchParliamentarian(token, mp.email))?.statuses ?? {};
  } catch (error) {
    console.error("Couldn't read the MP's status from Airtable:", error);
    return {};
  }
}
