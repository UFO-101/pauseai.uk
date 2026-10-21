import type { CSSProperties, PointerEventHandler, ReactNode, RefObject } from "react";
import { Button } from "@/components/ui/Button";
import styles from "./Studio.module.css";

/**
 * A studio: the preview column, then the controls column. On wide screens the preview sits pinned beside the
 * form; on phones its parts join the page's one column, with the preview pinned above the form. The QR tool's
 * preview isn't pinned (`pinned={false}`).
 */
export function Studio({ pinned = true, children }: { pinned?: boolean; children: ReactNode }) {
  return <div className={pinned ? `${styles.studio} ${styles.pinned}` : styles.studio}>{children}</div>;
}

/** The preview column. `pack` is the campaign pack's, which holds a grid as well and scrolls on its own. */
export function PreviewColumn({ pack, children }: { pack?: boolean; children: ReactNode }) {
  return <div className={pack ? `${styles.preview} ${styles.pack}` : styles.preview}>{children}</div>;
}

/** The form column, its sections spaced apart. */
export function ControlsColumn({ children }: { children: ReactNode }) {
  return <div className={styles.controls}>{children}</div>;
}

/** One section of the form, with its heading when it has one. */
export function ControlsSection({ heading, children }: { heading?: ReactNode; children: ReactNode }) {
  return (
    <section>
      {heading && <h2 className={styles.heading}>{heading}</h2>}
      {children}
    </section>
  );
}

/** On phones, pins the preview together with what sits under it (the gallery's filmstrip). */
export function PreviewPin({ children }: { children: ReactNode }) {
  return <div className={styles.pin}>{children}</div>;
}

interface PreviewCanvasProps {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  /** The canvas's accessible name, e.g. "Preview of Instagram post". */
  label: string;
  /** Whether the logo and fonts have loaded. Until then it says it's loading. */
  ready: boolean;
  /** With a photo, which can be dragged to move it. */
  draggable: boolean;
  style?: CSSProperties;
  /** Handlers from usePhotoGestures. */
  gestures: {
    onPointerDown: PointerEventHandler<HTMLCanvasElement>;
    onPointerMove: PointerEventHandler<HTMLCanvasElement>;
    onPointerUp: PointerEventHandler<HTMLCanvasElement>;
    onPointerCancel: PointerEventHandler<HTMLCanvasElement>;
  };
}

/** The large preview: a canvas the studio draws into, kept within the screen. */
export function PreviewCanvas({ canvasRef, label, ready, draggable, style, gestures }: PreviewCanvasProps) {
  return (
    <div className={styles.frame}>
      <canvas
        ref={canvasRef}
        role="img"
        aria-label={label}
        hidden={!ready}
        style={style}
        className={draggable ? `${styles.canvas} ${styles.draggable}` : styles.canvas}
        {...gestures}
      />
      {!ready && <Loading>Loading…</Loading>}
    </div>
  );
}

/** Stands in for the preview while there isn't one. */
export function Loading({ children }: { children: ReactNode }) {
  return <p className={styles.loading}>{children}</p>;
}

/** A line under the preview: what it shows, at what size. Hidden on phones while the preview is pinned. */
export function PreviewMeta({ children }: { children: ReactNode }) {
  return <p className={styles.meta}>{children}</p>;
}

/** The checks and Download buttons under the preview. On phones they move to the end of the form. */
export function PreviewActions({ children }: { children: ReactNode }) {
  return <div className={styles.actions}>{children}</div>;
}

/** A Download button in the preview's actions. On phones it fills the row beside the ⋯ menu. */
export function DownloadButton({
  onClick,
  disabled,
  children,
}: {
  onClick: () => void;
  disabled: boolean;
  children: ReactNode;
}) {
  return (
    <Button
      type="button"
      variant="primary"
      size="large"
      fit
      className={styles.download}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </Button>
  );
}
