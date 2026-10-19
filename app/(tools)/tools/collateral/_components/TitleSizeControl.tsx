import {
  clampHeadlineScale,
  HEADLINE_SCALE_MAX,
  HEADLINE_SCALE_MIN,
  HEADLINE_SCALE_STEP,
} from "@/lib/collateral/design";
import { Hint } from "@/components/ui/Field";
import LinkButton from "@/components/ui/LinkButton";
import styles from "./TitleSizeControl.module.css";

/**
 * Nudges the title size when automatic sizing gets it wrong. Kept in a closed <details> so it reads as an
 * escape hatch, and opened when the checks flag the title.
 */
export default function TitleSizeControl({
  value,
  onChange,
  flagged,
}: {
  value: number;
  onChange: (v: number) => void;
  flagged: boolean;
}) {
  const percent = Math.round(value * 100);
  return (
    <details className={styles.titleSize} open={flagged || value !== 1 || undefined}>
      <summary className={styles.summary}>Adjust title size</summary>
      <Hint>Sizing is automatic and should look right. Only adjust it if the preview looks off.</Hint>
      <div className={styles.stepper} role="group" aria-label="Title size">
        <button
          type="button"
          aria-label="Smaller title"
          className={styles.step}
          disabled={value <= HEADLINE_SCALE_MIN}
          onClick={() => onChange(clampHeadlineScale(value - HEADLINE_SCALE_STEP))}
        >
          −
        </button>
        <span className={styles.value} aria-live="polite">
          {value === 1 ? "Automatic" : `${percent}%`}
        </span>
        <button
          type="button"
          aria-label="Bigger title"
          className={styles.step}
          disabled={value >= HEADLINE_SCALE_MAX}
          onClick={() => onChange(clampHeadlineScale(value + HEADLINE_SCALE_STEP))}
        >
          +
        </button>
        {value !== 1 && <LinkButton onClick={() => onChange(1)}>Back to automatic</LinkButton>}
      </div>
    </details>
  );
}
