import { LOGO_COVER_TITLE_CHARS } from "@/lib/collateral/templates";
import type { DesignState } from "./designState";
import { Checkbox, Segmented } from "@/components/ui/Controls";
import { Hint, Label } from "@/components/ui/Field";
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
      <Checkbox checked={design.coverTitle} onChange={(coverTitle) => update((d) => ({ ...d, coverTitle }))}>
        Show the event title on the Luma cover
      </Checkbox>
      {design.coverTitle && (
        <Hint>Keep it to {LOGO_COVER_TITLE_CHARS} characters or fewer, so it reads at Luma&apos;s size.</Hint>
      )}
      {design.photo && (
        <>
          <Label>Photo on the Luma cover</Label>
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
