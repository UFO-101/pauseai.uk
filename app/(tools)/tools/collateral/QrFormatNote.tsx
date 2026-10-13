import type { Format } from "@/lib/collateral/formats";

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
    return <p className="collateral-hint">QR codes are left off the {format.label}, since people are already on the event page.</p>;
  }
  if (format.kind === "digital" && format.screen) {
    return (
      <>
        <label className="collateral-toggle collateral-qr-screen">
          <input type="checkbox" checked={screenQr} onChange={(e) => onScreenQr(e.target.checked)} />
          Show QR codes on the {format.label}
        </label>
        {screenQr ? (
          reason && <p className="collateral-hint">{reason}</p>
        ) : (
          <p className="collateral-hint">QR codes are left off social posts by default, since people are already on their phone.</p>
        )}
      </>
    );
  }
  return reason ? <p className="collateral-hint">{reason}</p> : null;
}
