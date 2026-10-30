import Table from "@/components/ui/Table";
import { CELLS, rowsByCode, type ConstituencyRow } from "@/lib/constituency-map";
import { constituencyMapCopy as copy } from "@/lib/content/constituency-map";
import styles from "./ConstituencyTable.module.css";

/** Every constituency's numbers, by name, folded under the map: what the map shows, for reading or a screen reader. */
export default function ConstituencyTable({ rows }: { rows: ConstituencyRow[] }) {
  const byCode = rowsByCode(rows);
  return (
    <details className={styles.details}>
      <summary className={styles.summary}>{copy.table.summary}</summary>
      <Table>
        <caption className={styles.caption}>{copy.table.caption}</caption>
        <thead>
          <tr>
            <th scope="col">{copy.table.constituency}</th>
            <th scope="col">{copy.table.mp}</th>
            <th scope="col" className={styles.number}>
              {copy.table.supporters}
            </th>
            <th scope="col" className={styles.number}>
              {copy.table.frontier}
            </th>
            <th scope="col" className={styles.number}>
              {copy.table.sobel}
            </th>
          </tr>
        </thead>
        <tbody>
          {CELLS.map((cell) => {
            const row = byCode.get(cell.code)!;
            return (
              <tr key={cell.code}>
                <th scope="row">{cell.name}</th>
                <td>{row.mp?.name}</td>
                <td className={styles.number}>{row.supporters}</td>
                <td className={styles.number}>{row.frontier}</td>
                <td className={styles.number}>{row.sobel}</td>
              </tr>
            );
          })}
        </tbody>
      </Table>
    </details>
  );
}
