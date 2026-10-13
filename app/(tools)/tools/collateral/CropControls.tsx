import { MAX_ZOOM, type PhotoView } from "@/lib/collateral/photoTransform";
import Slider from "./Slider";

/**
 * Zoom and position sliders, closed by default. Dragging, scrolling and pinching the preview do the same; these
 * keep the crop adjustable from a keyboard.
 */
export default function CropControls({ view, onChange }: { view: PhotoView; onChange: (patch: Partial<PhotoView>) => void }) {
  return (
    <details className="collateral-crop">
      <summary>Fine-tune the crop</summary>
      <Slider label="Zoom" min={1} max={MAX_ZOOM} step={0.05} value={view.zoom} onChange={(zoom) => onChange({ zoom })} />
      <Slider label="Left / right" min={0} max={1} step={0.01} value={view.focalX} onChange={(focalX) => onChange({ focalX })} />
      <Slider label="Up / down" min={0} max={1} step={0.01} value={view.focalY} onChange={(focalY) => onChange({ focalY })} />
    </details>
  );
}
