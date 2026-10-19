import type { Format } from "@/lib/collateral/formats";
import { Checkbox } from "@/components/ui/Controls";
import { Hint } from "@/components/ui/Field";

interface Props {
  format: Format;
  screenQr: boolean;
  onScreenQr: (on: boolean) => void;
  /** Why the codes that do show are trimmed, from qrPlan. */
  reason?: string;
}

/** Whether the QR codes show on this format, and why not when they do not. */
export default function QrFormatNote({ format, screenQr, onScreenQr, reason }: Props) {
  if (format.kind === "digital" && format.onPage) {
    return <Hint>QR codes are left off the {format.label}, since people are already on the event page.</Hint>;
  }
  if (format.kind === "digital" && format.screen) {
    return (
      <>
        <Checkbox checked={screenQr} onChange={onScreenQr}>
          Show QR codes on the {format.label}
        </Checkbox>
        {screenQr ? (
          reason && <Hint>{reason}</Hint>
        ) : (
          <Hint>QR codes are left off social posts by default, since people are already on their phone.</Hint>
        )}
      </>
    );
  }
  return reason ? <Hint>{reason}</Hint> : null;
}
