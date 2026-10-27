import { expect, it } from "vitest";
import { partyColour } from "./party-colours";

it("is the colour of the party a name contains, the longest match first, or grey", () => {
  expect(partyColour("Labour")).toBe("#e4003b");
  expect(partyColour("Labour (Co-op)")).toBe("#e4003b");
  expect(partyColour("Welsh Labour")).toBe("#e4003b");
  // Not Labour's: the SDLP's full name has it too.
  expect(partyColour("Social Democratic and Labour Party")).toBe("#2aa82c");
  expect(partyColour("Scottish Conservative and Unionist")).toBe("#0087dc");
  expect(partyColour("Crossbench")).toBe("#8a8178");
});
