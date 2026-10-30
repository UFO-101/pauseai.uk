import SmallPrint from "@/components/ui/SmallPrint";
import type { ConstituencyRow } from "@/lib/constituency-map";
import { constituencyMapCopy as copy } from "@/lib/content/constituency-map";
import ConstituencyMap from "./ConstituencyMap";
import ConstituencyTable from "./ConstituencyTable";
import styles from "./MapSection.module.css";

/** The page's band of map: the map, the table of its numbers, and where they come from. */
export default function MapSection({ rows }: { rows: ConstituencyRow[] }) {
  return (
    <section className={styles.band}>
      <div className={`container ${styles.stack}`}>
        <ConstituencyMap rows={rows} />
        <ConstituencyTable rows={rows} />
        <SmallPrint>
          {copy.source}{" "}
          <a className="inline-link" href={copy.sourceLink}>
            {copy.sourceLink}
          </a>
        </SmallPrint>
      </div>
    </section>
  );
}
