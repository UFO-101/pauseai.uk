import Section from "@/components/ui/Section";
import SmallPrint from "@/components/ui/SmallPrint";
import type { ConstituencyRow } from "@/lib/constituency-map";
import { constituencyMapCopy as copy } from "@/lib/content/constituency-map";
import ConstituencyMap from "./ConstituencyMap";
import ConstituencyTable from "./ConstituencyTable";
import styles from "./MapSection.module.css";

/** The page's band of map: the map, where its numbers come from, and the table of them. */
export default function MapSection({ rows }: { rows: ConstituencyRow[] }) {
  return (
    <Section snug>
      <div className={`container ${styles.stack}`}>
        <ConstituencyMap rows={rows} />
        <SmallPrint>
          {copy.source}{" "}
          <a className="inline-link" href={copy.sourceLink}>
            {copy.sourceLink}
          </a>
        </SmallPrint>
        <ConstituencyTable rows={rows} />
      </div>
    </Section>
  );
}
