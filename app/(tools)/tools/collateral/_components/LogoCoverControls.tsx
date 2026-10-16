import { LOGO_COVER_TITLE_CHARS } from "@/lib/collateral/templates";
import type { DesignState } from "./designState";
import { FieldLabel, Segmented, Toggle } from "./kit/Fields";
import { Hint } from "./kit/Notes";
import styles from "./LogoCoverControls.module.css";

/**
 * Options for a logo cover (see DigitalFormat.logoCover): whether to show the title, and, with a photo, whether to
 * tint it. Both are saved with the design.
 */
export default function LogoCoverControls({
  design,
  update,
}: {
  design: DesignState;
  update: (fn: (d: DesignState) => DesignState) => void;
}) {
  return (
    <div className={styles.logoCover}>
      <Toggle checked={design.coverTitle} onChange={(coverTitle) => update((d) => ({ ...d, coverTitle }))}>
        Show the event title on the Luma cover
      </Toggle>
      {design.coverTitle && (
        <Hint>Keep it to {LOGO_COVER_TITLE_CHARS} characters or fewer, so it reads at Luma&apos;s size.</Hint>
      )}
      {design.photo && (
        <>
          <FieldLabel>Photo on the Luma cover</FieldLabel>
          <Segmented
            label="Photo on the Luma cover"
            options={[
              { value: false, label: "Tinted" },
              { value: true, label: "Clear" },
            ]}
            value={design.photoClear}
            onChange={(photoClear) => update((d) => ({ ...d, photoClear }))}
          />
        </>
      )}
    </div>
  );
}
