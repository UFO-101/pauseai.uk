import { LOGO_COVER_TITLE_CHARS } from "@/lib/collateral/templates";
import type { DesignState } from "./designState";

/**
 * Options for a logo cover (see DigitalFormat.logoCover): whether to show the title, and, with a photo, whether to
 * tint it. Both are saved with the design.
 */
export default function LogoCoverControls({ design, update }: { design: DesignState; update: (fn: (d: DesignState) => DesignState) => void }) {
  return (
    <div className="collateral-logo-cover">
      <label className="collateral-toggle">
        <input type="checkbox" checked={design.coverTitle} onChange={(e) => update((d) => ({ ...d, coverTitle: e.target.checked }))} />
        Show the event title on the Luma cover
      </label>
      {design.coverTitle && (
        <p className="collateral-hint">Keep it to {LOGO_COVER_TITLE_CHARS} characters or fewer, so it reads at Luma&apos;s size.</p>
      )}
      {design.photo && (
        <>
          <span className="collateral-label">Photo on the Luma cover</span>
          <div className="collateral-segmented" role="radiogroup" aria-label="Photo on the Luma cover">
            <button type="button" role="radio" aria-checked={!design.photoClear} onClick={() => update((d) => ({ ...d, photoClear: false }))}>
              Tinted
            </button>
            <button type="button" role="radio" aria-checked={design.photoClear} onClick={() => update((d) => ({ ...d, photoClear: true }))}>
              Clear
            </button>
          </div>
        </>
      )}
    </div>
  );
}
