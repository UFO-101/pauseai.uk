import Table from "@/components/ui/Table";
import { reach, rowsByCode, topLetters, type ConstituencyRow } from "@/lib/constituency-map";
import { constituencyMapCopy as copy } from "@/lib/content/constituency-map";
import styles from "./ConstituencyTable.module.css";

/** How many constituencies the table lists. */
const TOP = 10;

/** The constituencies most written from, with their MPs and letters, under the total sent from all of them. */
export default function ConstituencyTable({ rows }: { rows: ConstituencyRow[] }) {
  const byCode = rowsByCode(rows);
  return (
    <section className={styles.top} aria-labelledby="top-letters">
      <header className={styles.header}>
        <h2 id="top-letters" className={styles.title}>
          {copy.table.title}
        </h2>
        <p className={styles.total}>{copy.table.total(reach(byCode.values(), "letters").total)}</p>
      </header>
      <Table>
        <thead>
          <tr>
            <th scope="col">{copy.table.constituency}</th>
            <th scope="col">{copy.table.mp}</th>
            <th scope="col" className={styles.number}>
              {copy.table.letters}
            </th>
          </tr>
        </thead>
        <tbody>
          {topLetters(byCode, TOP).map((seat) => (
            <tr key={seat.code}>
              <th scope="row">{seat.name}</th>
              <td>{seat.mp?.name}</td>
              <td className={styles.number}>{seat.letters}</td>
            </tr>
          ))}
        </tbody>
      </Table>
    </section>
  );
}
