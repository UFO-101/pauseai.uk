import { THEMES } from "@/lib/collateral/themes";
import styles from "./StylePicker.module.css";

/** The style swatches. How strongly the colour covers a photo is picked automatically, so there is nothing else to set. */
export default function StylePicker({ themeId, onTheme }: { themeId: string; onTheme: (id: string) => void }) {
  return (
    <div className={styles.swatches} role="radiogroup" aria-label="Style">
      {THEMES.map((t) => (
        <button
          key={t.id}
          type="button"
          role="radio"
          aria-checked={t.id === themeId}
          className={styles.swatch}
          onClick={() => onTheme(t.id)}
        >
          <span className={styles.chip} style={{ background: t.bg, color: t.text }} aria-hidden="true">
            <i className={styles.accent} style={{ background: t.accent }} />
          </span>
          {t.label}
        </button>
      ))}
    </div>
  );
}
