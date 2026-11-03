import type { CSSProperties, ReactNode } from "react";
import { toneStyle, type BriefingTone } from "./tone";
import styles from "./BudgetChart.module.css";

export type BudgetItem = { name: string; amount: number; purpose: string };

/** Items that share a topic's colour, such as "Security & safety". */
export type BudgetGroup = { name: string; tone: BriefingTone; items: BudgetItem[] };

/** Each group's hatching, at its own angle, so the groups differ without colour too. */
const ANGLES = ["45deg", "135deg", "90deg"];

const total = (items: BudgetItem[]) => items.reduce((sum, item) => sum + item.amount, 0);

/** The step between the axis's marks: 1, 2 or 5 of a power of ten, so there are four or fewer. */
export function tickStep(largest: number): number {
  const magnitude = 10 ** Math.floor(Math.log10(largest));
  const step = [1, 2, 5, 10, 20].find((m) => largest / ((m * magnitude) / 10) <= 4) ?? 50;
  return (step * magnitude) / 10;
}

/**
 * Money split into groups of items: a bar of the whole, divided by group,
 * each part named above it and labelled with its total (the last group's
 * name goes under its part, at the right, where a narrow part has room),
 * then every item largest first, as a table of its name, a bar of its
 * amount against an axis, and what it's for. Amounts are in £ millions. On
 * a phone the groups' names are a key under the whole, and what each item
 * is for goes under its name.
 */
export default function BudgetChart({
  groups,
  totalLabel,
  purposeHeading,
  caption,
}: {
  groups: BudgetGroup[];
  /** Under the bar of the whole, e.g. "£695m in total". */
  totalLabel: string;
  /** The heading over what each item is for. */
  purposeHeading: string;
  caption: ReactNode;
}) {
  const grandTotal = total(groups.flatMap((group) => group.items));
  const toned = groups.map((group, i) => ({
    ...group,
    style: { ...toneStyle(group.tone), "--angle": ANGLES[i % ANGLES.length] } as CSSProperties,
  }));
  const rows = toned
    .flatMap((group) => group.items.map((item) => ({ ...item, style: group.style })))
    .sort((a, b) => b.amount - a.amount);
  const largest = rows[0].amount;
  const step = tickStep(largest);
  const ticks = Array.from({ length: Math.floor(largest / step) + 1 }, (_, i) => i * step);
  const scale = { "--step": step / largest } as CSSProperties;

  return (
    <figure className={styles.chart}>
      <div className={styles.whole}>
        {toned.map((group, i) => {
          const last = i === toned.length - 1;
          return (
            <div
              key={group.name}
              className={styles.part}
              style={{ ...group.style, "--share": total(group.items) / grandTotal } as CSSProperties}
            >
              <span className={styles.partName}>{!last && group.name}</span>
              <span className={styles.partBar}>
                <span className={styles.partTotal}>£{total(group.items)}m</span>
              </span>
              <span className={last ? `${styles.partName} ${styles.partNameUnder}` : styles.partUnder}>
                {last ? group.name : i === 0 && totalLabel}
              </span>
            </div>
          );
        })}
      </div>
      <ul className={styles.legend}>
        {toned.map((group) => (
          <li key={group.name} style={group.style}>
            <span className={styles.swatch} />
            {group.name}
          </li>
        ))}
      </ul>
      <p className={styles.totalUnder}>{totalLabel}</p>
      <table className={styles.items} style={scale}>
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
              <td className={styles.plot}>
                <div className={styles.amount}>
                  <span
                    className={styles.bar}
                    style={{ ...row.style, "--share": row.amount / largest } as CSSProperties}
                  />
                  {row.amount}
                  <span className={styles.leader} />
                </div>
              </td>
              <td className={styles.purpose}>{row.purpose}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td />
            <td className={styles.axis}>
              {ticks.map((tick) => (
                <span key={tick} style={{ "--at": tick / largest } as CSSProperties}>
                  £{tick}m
                </span>
              ))}
            </td>
            <td />
          </tr>
        </tfoot>
      </table>
      <figcaption className={styles.caption}>{caption}</figcaption>
    </figure>
  );
}
