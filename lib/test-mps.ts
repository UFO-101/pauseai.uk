// The test MPs. Each is found by its own made-up postcode, which
// postcodes.io doesn't know, and outside production they're the only MPs
// letters go to. Their letters go to TEST_MP_EMAIL. Listed in
// test-mps.json, so scripts/fresh-database.mjs can read them too. The
// second has signed the letter to the PM, so its page moves on. The third
// has no email, to see what the form says then. The fourth signed
// ControlAI's letter backing the Sobel bill, so the bill's letter thanks them.
import testMps from "./test-mps.json";

export type TestMp = {
  /** Normalised: no spaces, upper case. */
  postcode: string;
  name: string;
  salutation: string;
  constituency: string;
  /** Where their postcode is, for events nearby: Westminster, so testers see some. */
  place: { latitude: number; longitude: number };
  /** Added without an email, whatever TEST_MP_EMAIL is: there's no letter to write to them. */
  noEmail?: boolean;
  /** What they've done when first added, by campaign slug. Staff can change it. */
  statuses: Record<string, "signed">;
};

export const TEST_MPS = testMps as TestMp[];
