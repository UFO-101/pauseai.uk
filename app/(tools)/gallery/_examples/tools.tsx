// The volunteer tools: their index, the QR tool and the flyering trackers.
import { CardIndex } from "@/components/tools/CardIndex";
import ToolGrid from "@/app/(tools)/tools/_components/ToolGrid";
import QrGenerator from "@/app/(tools)/tools/qr/_components/QrGenerator";
import FlyeringTracker from "@/app/(tools)/trackers/_components/FlyeringTracker";
import {
  exampleCounts as counts,
  exampleRace as race,
  exampleTimes as times,
} from "@/app/(tools)/trackers/_components/FlyeringTracker.examples";
import type { Group } from "../_components/types";
import { QrScannerExample } from "./tools.client";

export const tools: Group = {
  id: "tools",
  title: "Volunteer tools: index, QR and trackers",
  examples: [
    {
      name: "ToolGrid",
      file: "app/(tools)/tools/_components/ToolGrid.tsx",
      variants: [
        {
          label: "Every tool, in the index's grid",
          render: () => (
            <CardIndex title="Example Tools" lede="A line about the tools.">
              <ToolGrid />
            </CardIndex>
          ),
        },
      ],
    },
    {
      name: "QrGenerator",
      file: "app/(tools)/tools/qr/_components/QrGenerator.tsx",
      variants: [
        {
          label: "As it opens",
          render: () => (
            <div className="container">
              <QrGenerator />
            </div>
          ),
        },
      ],
    },
    {
      name: "QrScanner",
      file: "app/(tools)/tools/qr/_components/QrScanner.tsx",
      variants: [
        {
          label: "Before the camera opens",
          render: () => (
            <div className="container">
              <QrScannerExample />
            </div>
          ),
        },
      ],
    },
    {
      name: "FlyeringTracker",
      file: "app/(tools)/trackers/_components/FlyeringTracker.tsx",
      variants: [
        {
          label: "Before the race",
          render: () => (
            <FlyeringTracker race={race} result={counts(0, 0, 0, 0)} afterResult={null} now={times.before} />
          ),
        },
        {
          label: "During the race, with medals",
          render: () => (
            <FlyeringTracker
              race={race}
              result={counts(3, 7, 3, 0, 2)}
              afterResult={counts(9, 9, 9, 9)}
              now={times.during}
            />
          ),
        },
        {
          label: "Just closed, counting the last, with counts since",
          render: () => (
            <FlyeringTracker
              race={race}
              result={counts(3, 7, 3, 0)}
              afterResult={counts(1, 0, 0, 0)}
              now={times.justClosed}
            />
          ),
        },
        {
          label: "A winner and a wooden spoon, with counts since",
          render: () => (
            <FlyeringTracker
              race={race}
              result={counts(3, 7, 3, 1)}
              afterResult={counts(2, 0, 1, 0, 4)}
              now={times.final}
            />
          ),
        },
        {
          label: "A winner, without counts since",
          render: () => (
            <FlyeringTracker race={race} result={counts(3, 7, 3, 1, 2)} afterResult={null} now={times.final} />
          ),
        },
        {
          label: "A tie",
          render: () => (
            <FlyeringTracker
              race={race}
              result={counts(5, 5, 1, 0)}
              afterResult={counts(0, 0, 0, 0)}
              now={times.final}
            />
          ),
        },
        {
          label: "No one signed up through a QR code",
          render: () => (
            <FlyeringTracker race={race} result={counts(0, 0, 0, 0, 3)} afterResult={null} now={times.final} />
          ),
        },
        {
          label: "Luma couldn't be read",
          render: () => <FlyeringTracker race={race} result={null} afterResult={null} now={times.during} />,
        },
      ],
    },
  ],
};
