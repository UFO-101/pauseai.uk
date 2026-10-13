import "server-only";
import type { Mp } from "@/lib/email-your-mp";
import type { SyncedMp } from "@/lib/parliament";
import synced from "@/data/mps.json";

// The MPs letters can go to, by constituency: Parliament's list, copied into
// data/mps.json by `npm run data:mps`. Recipients must be on it: the server
// looks the MP up again from the sender's postcode, and never takes an
// address from the form.

export function mpsByConstituency(list: SyncedMp[]): Map<string, Mp> {
  return new Map(
    list.map(({ name, salutation, constituency, email }) => [constituency, { name, salutation, constituency, email }]),
  );
}

const byConstituency = mpsByConstituency(synced);

export function mpForConstituency(constituency: string): Mp | undefined {
  return byConstituency.get(constituency);
}

/**
 * The test MP, found by postcode ZZ99ZZ. Their letters go to TEST_MP_EMAIL,
 * a test inbox; without it they have no email, like the 3 real MPs without one.
 */
export function testMp(): Mp {
  return {
    name: "Testy McTestface MP",
    salutation: "Mr McTestface",
    constituency: "Testshire",
    email: process.env.TEST_MP_EMAIL?.trim() || null,
  };
}
