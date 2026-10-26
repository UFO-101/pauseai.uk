import type { ThankedDonor } from "@/lib/server/outside-services/stripe";

/** Six made-up donors, newest first, for the donate page's tests and the gallery. */
export const exampleDonors: ThankedDonor[] = [
  { name: "Ada Pemberton", givenAt: "2026-10-16T12:00:00.000Z" },
  { name: "Tom Okafor", givenAt: "2026-10-13T12:00:00.000Z" },
  { name: "Priya Raman", givenAt: "2026-10-01T12:00:00.000Z" },
  { name: "Sam Whitlock", givenAt: "2026-09-16T12:00:00.000Z" },
  { name: "Chen Wei", givenAt: "2026-08-26T12:00:00.000Z" },
  { name: "Morag Fraser", givenAt: "2026-07-26T12:00:00.000Z" },
];
