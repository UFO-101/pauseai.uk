// The constituency map (app/(site)/campaigns/constituencies/_components), on
// a few made-up constituencies' counts.
import ConstituencyMap from "@/app/(site)/campaigns/constituencies/_components/ConstituencyMap";
import {
  EDINBURGH,
  WESTMINSTER,
  exampleRows,
} from "@/app/(site)/campaigns/constituencies/_components/ConstituencyMap.examples";
import ConstituencyTable from "@/app/(site)/campaigns/constituencies/_components/ConstituencyTable";
import MapKey from "@/app/(site)/campaigns/constituencies/_components/MapKey";
import MapSection from "@/app/(site)/campaigns/constituencies/_components/MapSection";
import NextSteps from "@/app/(site)/campaigns/constituencies/_components/NextSteps";
import type { Group } from "../_components/types";
import { ConstituencyCardExample, HexMapExample, PostcodeFinderExample } from "./constituency-map.client";

const DIR = "app/(site)/campaigns/constituencies/_components";

export const constituencyMap: Group = {
  id: "constituency-map",
  title: "Constituency map",
  examples: [
    {
      name: "ConstituencyMap",
      file: `${DIR}/ConstituencyMap.tsx`,
      variants: [{ label: "The map and its panel", render: () => <ConstituencyMap rows={exampleRows} /> }],
    },
    {
      name: "HexMap",
      file: `${DIR}/HexMap.tsx`,
      variants: [
        { label: "Supporters, one picked and one hovered", render: () => <HexMapExample /> },
        { label: "Letters about the bill", render: () => <HexMapExample layer="sobel" /> },
      ],
    },
    {
      name: "MapKey",
      file: `${DIR}/MapKey.tsx`,
      variants: [
        { label: "Supporters", render: () => <MapKey layer="supporters" /> },
        { label: "Letters", render: () => <MapKey layer="frontier" /> },
      ],
    },
    {
      name: "ConstituencyCard",
      file: `${DIR}/ConstituencyCard.tsx`,
      variants: [
        { label: "None picked", render: () => <ConstituencyCardExample code={null} /> },
        { label: "Picked on the map", render: () => <ConstituencyCardExample code={EDINBURGH} /> },
        { label: "Found by their postcode", render: () => <ConstituencyCardExample code={WESTMINSTER} yours /> },
        { label: "No MP in office", render: () => <ConstituencyCardExample code="W07000090" /> },
      ],
    },
    {
      name: "PostcodeFinder",
      file: `${DIR}/PostcodeFinder.tsx`,
      variants: [{ label: "Empty", render: () => <PostcodeFinderExample /> }],
    },
    {
      name: "ConstituencyTable",
      file: `${DIR}/ConstituencyTable.tsx`,
      variants: [{ label: "Folded", render: () => <ConstituencyTable rows={exampleRows} /> }],
    },
    {
      name: "MapSection",
      file: `${DIR}/MapSection.tsx`,
      variants: [{ label: "The page's band", render: () => <MapSection rows={exampleRows} /> }],
    },
    {
      name: "NextSteps",
      file: `${DIR}/NextSteps.tsx`,
      variants: [{ label: "Under the map", render: () => <NextSteps /> }],
    },
  ],
};
