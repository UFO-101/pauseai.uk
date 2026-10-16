import { campaigns } from "@/lib/content/email-your-mp";
import type { Draft, Lookup } from "./draft";

const [letterToPm] = campaigns;

/** An MP, made up, for the tests and the gallery. */
export const exampleMp = {
  name: "Polly Placeholder",
  salutation: "Ms Placeholder",
  constituency: "Cities of London and Westminster",
  email: "polly.placeholder.mp@parliament.uk",
};

/** "Find my MP" done for the letter to the PM: who's writing, and to whom. */
export const exampleLookup: Lookup = {
  campaign: letterToPm.slug,
  name: "Jane Smith",
  address: "1 High St",
  postcode: "SW1A 1AA",
  mp: exampleMp,
  statuses: {},
};

/** A letter to the PM's campaign, written and ready to preview. */
export const exampleDraft: Draft = {
  campaign: letterToPm.slug,
  name: "Jane Smith",
  postcode: "sw1a 1aa",
  mp: exampleMp,
  statuses: {},
  email: "jane@example.com",
  address: "1 High St\nLondon",
  subject: "My subject",
  letter: {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [
          { type: "text", text: "My " },
          { type: "text", text: "letter", marks: [{ type: "bold" }] },
        ],
      },
    ],
  },
  nickname: "",
};
