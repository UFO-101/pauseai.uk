import { THEMES } from "@/lib/collateral/themes";

/** The style swatches. How strongly the colour covers a photo is picked automatically, so there is nothing else to set. */
export default function StylePicker({ themeId, onTheme }: { themeId: string; onTheme: (id: string) => void }) {
  return (
    <div className="collateral-swatches" role="radiogroup" aria-label="Style">
      {THEMES.map((t) => (
        <button key={t.id} type="button" role="radio" aria-checked={t.id === themeId} className="collateral-swatch" onClick={() => onTheme(t.id)}>
          <span className="collateral-swatch-chip" style={{ background: t.bg, color: t.text }} aria-hidden="true">
            <i style={{ background: t.accent }} />
          </span>
          {t.label}
        </button>
      ))}
    </div>
  );
}
