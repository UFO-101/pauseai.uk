import "server-only";
import type { Mp } from "@/lib/email-your-mp";
import records from "@/data/uk-mps.json";

// The MPs letters can go to, by constituency. Recipients must be on this
// list: the server looks the MP up again from the sender's postcode, and
// never takes an address from the form.

type MpRecord = {
  Email: string;
  "Full name or Title": string;
  Salutation: string;
  Constituency: string;
};

export function mpsFromRecords(list: MpRecord[]): Map<string, Mp> {
  return new Map(
    list.map((record) => [
      record.Constituency,
      {
        name: record["Full name or Title"],
        salutation: record.Salutation,
        constituency: record.Constituency,
        email: record.Email.trim() || null,
      },
    ]),
  );
}

const byConstituency = mpsFromRecords(records);

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
