import type { CSSProperties, ReactNode } from "react";
import styles from "./BudgetChart.module.css";

/** A chart's category, by its colour and texture, in the order they're shown. */
export type BudgetTone = "orange" | "blue" | "green";

export type BudgetItem = { name: string; amount: number; purpose: string };

/** Items that share a colour, such as "Security & safety". */
export type BudgetGroup = { name: string; tone: BudgetTone; items: BudgetItem[] };

const total = (items: BudgetItem[]) => items.reduce((sum, item) => sum + item.amount, 0);

/**
 * Money split into groups of items: a bar of the whole, divided by group and
 * labelled with each group's total, a key to the groups, then every item largest first,
 * as a table of its name, a bar of its amount and what it's for. Amounts
 * are in £ millions. On a phone, what each item is for goes under its name.
 */
export default function BudgetChart({
  groups,
  totalLabel,
  purposeHeading,
  caption,
}: {
  groups: BudgetGroup[];
  /** Beside the bar of the whole, e.g. "£695m in total". */
  totalLabel: string;
  /** The heading over what each item is for. */
  purposeHeading: string;
  caption: ReactNode;
}) {
  const grandTotal = total(groups.flatMap((group) => group.items));
  const rows = groups
    .flatMap((group) => group.items.map((item) => ({ ...item, tone: group.tone })))
    .sort((a, b) => b.amount - a.amount);
  const largest = rows[0].amount;

  return (
    <figure className={styles.chart}>
      <div className={styles.whole}>
        {groups.map((group) => (
          <span
            key={group.name}
            className={`${styles.part} ${styles[group.tone]}`}
            style={{ "--share": total(group.items) / grandTotal } as CSSProperties}
          >
            £{total(group.items)}m
          </span>
        ))}
      </div>
      <p className={styles.total}>{totalLabel}</p>
      <ul className={styles.legend}>
        {groups.map((group) => (
          <li key={group.name}>
            <span className={`${styles.swatch} ${styles[group.tone]}`} />
            {group.name}
          </li>
        ))}
      </ul>
      <table className={styles.items}>
        <thead>
          <tr>
            <td />
            <td />
            <th scope="col" className={styles.purpose}>
              {purposeHeading}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.name}>
              <th scope="row" className={styles.name}>
                {row.name}
                <span className={styles.purposeUnder}>{row.purpose}</span>
              </th>
              <td>
                <div className={styles.amount}>
                  <span
                    className={`${styles.bar} ${styles[row.tone]}`}
                    style={{ "--share": row.amount / largest } as CSSProperties}
                  />
                  {row.amount}
                </div>
              </td>
              <td className={styles.purpose}>{row.purpose}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <figcaption className={styles.caption}>{caption}</figcaption>
    </figure>
  );
}
