import type { ConstituencyRow } from "@/lib/constituency-map";

// A few constituencies' counts, for the map's tests and the gallery: one
// with every count and an MP, one with only supporters, one with one of
// each letter, and one with no MP in office. The rest of the map is empty.

/** Cities of London and Westminster, where the fixture postcode SW1A 1AA is. */
export const WESTMINSTER = "E14001172";
/** Edinburgh East and Musselburgh, with one of each letter. */
export const EDINBURGH = "S14000078";

export const exampleRows: ConstituencyRow[] = [
  { code: WESTMINSTER, supporters: 42, frontier: 12, sobel: 4, mp: { name: "Wes Minster MP", party: "Labour" } },
  { code: "E14001352", supporters: 7, frontier: 0, sobel: 0, mp: { name: "Manny Central MP", party: "Green" } },
  { code: EDINBURGH, supporters: 1, frontier: 1, sobel: 1, mp: { name: "Edie Burgh MP", party: "SNP" } },
  { code: "W07000090", supporters: 12, frontier: 3, sobel: 0, mp: null },
];
