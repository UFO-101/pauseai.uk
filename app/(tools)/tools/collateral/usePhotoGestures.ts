"use client";

import { useEffect, useRef, type PointerEvent as ReactPointerEvent, type RefObject } from "react";
import { panPhoto, zoomPhoto, type PhotoView } from "@/lib/collateral/photoTransform";
import type { Drawable } from "@/lib/collateral/templates";

/**
 * Drag to move the photo, pinch or scroll to zoom it, on a preview canvas. `setView` gets an updater, so
 * fast gestures never work from a stale view.
 */
export function usePhotoGestures(
  canvasRef: RefObject<HTMLCanvasElement | null>,
  photo: Drawable | null,
  view: PhotoView,
  setView: (update: (v: PhotoView) => PhotoView) => void,
) {
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ dist: number; zoom: number } | null>(null);
  // The wheel listener is attached once per photo, so it reads the latest setter through a ref.
  const setViewRef = useRef(setView);
  useEffect(() => {
    setViewRef.current = setView;
  });

  // Scroll wheel and trackpad pinch zoom the photo. Needs a non-passive listener to stop the page scrolling.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !photo) return;
    const img = { w: photo.width, h: photo.height };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const k = canvas.width / rect.width;
      const anchor = { x: (e.clientX - rect.left) * k, y: (e.clientY - rect.top) * k };
      const dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
      const factor = Math.exp(-dy * (e.ctrlKey ? 0.01 : 0.0015));
      setViewRef.current((v) => zoomPhoto(img, { w: canvas.width, h: canvas.height }, v, v.zoom * factor, anchor));
    };
    canvas.addEventListener("wheel", onWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", onWheel);
  }, [canvasRef, photo]);

  function onPointerDown(e: ReactPointerEvent<HTMLCanvasElement>) {
    if (!photo) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinch.current = { dist: Math.hypot(a.x - b.x, a.y - b.y) || 1, zoom: view.zoom };
    }
  }

  function onPointerMove(e: ReactPointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    const prev = pointers.current.get(e.pointerId);
    if (!photo || !canvas || !prev) return;
    const next = { x: e.clientX, y: e.clientY };
    pointers.current.set(e.pointerId, next);
    const img = { w: photo.width, h: photo.height };
    const box = { w: canvas.width, h: canvas.height };
    const rect = canvas.getBoundingClientRect();
    const k = canvas.width / rect.width;
    if (pointers.current.size === 1) {
      setView((v) => panPhoto(img, box, v, (next.x - prev.x) * k, (next.y - prev.y) * k));
    } else if (pointers.current.size === 2 && pinch.current) {
      const [a, b] = [...pointers.current.values()];
      const mid = { x: ((a.x + b.x) / 2 - rect.left) * k, y: ((a.y + b.y) / 2 - rect.top) * k };
      const zoom = (pinch.current.zoom * Math.hypot(a.x - b.x, a.y - b.y)) / pinch.current.dist;
      setView((v) => zoomPhoto(img, box, v, zoom, mid));
    }
  }

  function onPointerEnd(e: ReactPointerEvent<HTMLCanvasElement>) {
    pointers.current.delete(e.pointerId);
    pinch.current = null;
  }

  return { onPointerDown, onPointerMove, onPointerUp: onPointerEnd, onPointerCancel: onPointerEnd };
}
