// The global AI sentiment report (app/(site)/global-ai-sentiment-2026/_components).
import CountryExplorer from "@/app/(site)/global-ai-sentiment-2026/_components/CountryExplorer";
import DemographicsExplorer from "@/app/(site)/global-ai-sentiment-2026/_components/DemographicsExplorer";
import DivergingBar, { BarAxisLabels } from "@/app/(site)/global-ai-sentiment-2026/_components/DivergingBar";
import GlobalAverageBar from "@/app/(site)/global-ai-sentiment-2026/_components/GlobalAverageBar";
import HeadlineStats from "@/app/(site)/global-ai-sentiment-2026/_components/HeadlineStats";
import Methodology from "@/app/(site)/global-ai-sentiment-2026/_components/Methodology";
import { ReportLede, ReportSection, TheQuestion } from "@/app/(site)/global-ai-sentiment-2026/_components/Report";
import VerticalDivergingBar from "@/app/(site)/global-ai-sentiment-2026/_components/VerticalDivergingBar";
import WorldMap from "@/app/(site)/global-ai-sentiment-2026/_components/WorldMap";
import { COUNTRIES, REGION_AVERAGES, regionLabel } from "@/lib/content/aiSentiment2026";
import type { Group } from "../_components/types";
import { DropdownExample } from "./sentiment.client";

/** A country's row of the survey, by its name. */
function country(name: string) {
  return COUNTRIES.find((c) => c.country === name)!;
}

const UK = country("United Kingdom");
const US = country("United States");
const JAPAN = country("Japan");

export const sentiment: Group = {
  id: "sentiment",
  title: "Global AI sentiment 2026",
  examples: [
    {
      name: "HeadlineStats",
      file: "app/(site)/global-ai-sentiment-2026/_components/HeadlineStats.tsx",
      variants: [{ label: "The survey's headline numbers", render: () => <HeadlineStats /> }],
    },
    {
      name: "ReportLede",
      file: "app/(site)/global-ai-sentiment-2026/_components/Report.tsx",
      variants: [
        {
          label: "A line under the title",
          render: () => (
            <div className="container">
              <ReportLede>A sentence or two about the report, under its title.</ReportLede>
            </div>
          ),
        },
      ],
    },
    {
      name: "ReportSection",
      file: "app/(site)/global-ai-sentiment-2026/_components/Report.tsx",
      variants: [
        {
          label: "Plain, a heading and its chart",
          render: () => (
            <ReportSection title="An example section">
              <p>A chart goes here.</p>
            </ReportSection>
          ),
        },
        {
          label: "Tinted, with an intro",
          render: () => (
            <ReportSection title="An example tinted section" intro="A line introducing the chart below." muted>
              <p>A chart goes here.</p>
            </ReportSection>
          ),
        },
      ],
    },
    {
      name: "TheQuestion",
      file: "app/(site)/global-ai-sentiment-2026/_components/Report.tsx",
      variants: [{ label: "The question, the answer and the global average", render: () => <TheQuestion /> }],
    },
    {
      name: "GlobalAverageBar",
      file: "app/(site)/global-ai-sentiment-2026/_components/GlobalAverageBar.tsx",
      variants: [
        {
          label: "The global average, with its sample",
          render: () => (
            <div className="container">
              <GlobalAverageBar />
            </div>
          ),
        },
      ],
    },
    {
      name: "VerticalDivergingBar",
      file: "app/(site)/global-ai-sentiment-2026/_components/VerticalDivergingBar.tsx",
      variants: [
        {
          label: "A country, with a line under it",
          render: () => (
            <div className="container">
              <VerticalDivergingBar row={UK} meta={<span>{UK.country}</span>} />
            </div>
          ),
        },
        {
          label: "A region's average, alone",
          render: () => (
            <div className="container">
              <VerticalDivergingBar row={REGION_AVERAGES[0]} />
            </div>
          ),
        },
      ],
    },
    {
      name: "DivergingBar",
      file: "app/(site)/global-ai-sentiment-2026/_components/DivergingBar.tsx",
      variants: [
        {
          label: "Countries, ranked, with their regions",
          render: () => (
            <div className="container">
              <BarAxisLabels />
              {[UK, US, JAPAN].map((row, i) => (
                <DivergingBar
                  key={row.country}
                  label={row.country}
                  row={row}
                  rank={i + 1}
                  meta={<span>{regionLabel(row.region)}</span>}
                />
              ))}
            </div>
          ),
        },
        {
          label: "A country alone, without its rank",
          render: () => (
            <div className="container">
              <DivergingBar label={US.country} row={US} />
            </div>
          ),
        },
        {
          label: "Without “not sure”",
          render: () => (
            <div className="container">
              <DivergingBar label={JAPAN.country} row={JAPAN} showNotSure={false} />
            </div>
          ),
        },
        {
          label: "A region's average",
          render: () => (
            <div className="container">
              <DivergingBar label={REGION_AVERAGES[0].group} row={REGION_AVERAGES[0]} />
            </div>
          ),
        },
      ],
    },
    {
      name: "BarAxisLabels",
      file: "app/(site)/global-ai-sentiment-2026/_components/DivergingBar.tsx",
      variants: [
        {
          label: "Which way is which",
          render: () => (
            <div className="container">
              <BarAxisLabels />
            </div>
          ),
        },
      ],
    },
    {
      name: "Dropdown",
      file: "app/(site)/global-ai-sentiment-2026/_components/Dropdown.tsx",
      variants: [
        {
          label: "Picking a region",
          render: () => (
            <div className="container">
              <DropdownExample />
            </div>
          ),
        },
      ],
    },
    {
      name: "WorldMap",
      file: "app/(site)/global-ai-sentiment-2026/_components/WorldMap.tsx",
      variants: [
        {
          label: "The map, on its first metric, nothing selected",
          render: () => (
            <div className="container">
              <WorldMap />
            </div>
          ),
        },
      ],
    },
    {
      name: "DemographicsExplorer",
      file: "app/(site)/global-ai-sentiment-2026/_components/DemographicsExplorer.tsx",
      variants: [
        {
          label: "The first breakdown, as bars",
          render: () => (
            <div className="container">
              <DemographicsExplorer />
            </div>
          ),
        },
      ],
    },
    {
      name: "CountryExplorer",
      file: "app/(site)/global-ai-sentiment-2026/_components/CountryExplorer.tsx",
      variants: [
        {
          label: "Every country, most opposed first",
          render: () => (
            <div className="container">
              <CountryExplorer />
            </div>
          ),
        },
      ],
    },
    {
      name: "Methodology",
      file: "app/(site)/global-ai-sentiment-2026/_components/Methodology.tsx",
      variants: [{ label: "How the survey was run", render: () => <Methodology /> }],
    },
  ],
};
