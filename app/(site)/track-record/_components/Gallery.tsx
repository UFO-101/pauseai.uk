"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Lightbox from "@/components/ui/Lightbox";

/** A full-size photo, and the words for it. */
type Photo = { href: string; alt: string };

const GalleryContext = createContext<{
  add: (photo: Photo) => () => void;
  show: (href: string) => void;
} | null>(null);

/**
 * The photo lightbox for every <ShotLink> inside it. Previous and next go
 * through the photos in page order, wrapping round at either end.
 */
export function Gallery({ children }: { children: ReactNode }) {
  // In page order: each ShotLink adds itself when it mounts.
  const photos = useRef<Photo[]>([]);
  const [shown, setShown] = useState<Photo | null>(null);

  const add = useCallback((photo: Photo) => {
    photos.current.push(photo);
    return () => {
      photos.current = photos.current.filter((p) => p !== photo);
    };
  }, []);
  const show = useCallback((href: string) => setShown(photos.current.find((p) => p.href === href)!), []);
  const step = useCallback((by: number) => {
    setShown((current) => {
      const list = photos.current;
      const i = list.findIndex((p) => p.href === current!.href);
      return list[(i + by + list.length) % list.length];
    });
  }, []);
  const previous = useCallback(() => step(-1), [step]);
  const next = useCallback(() => step(1), [step]);
  const close = useCallback(() => setShown(null), []);
  // Kept the same from render to render: a new one would have every ShotLink
  // take its photo out and add it again, at the end.
  const gallery = useMemo(() => ({ add, show }), [add, show]);

  return (
    <GalleryContext.Provider value={gallery}>
      {children}
      <Lightbox open={shown !== null} onClose={close} onPrevious={previous} onNext={next} className="lightbox">
        <button className="lb-close" aria-label="Close" onClick={close}>
          <svg viewBox="0 0 24 24" width={20} height={20} aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
        <button className="lb-prev" aria-label="Previous" onClick={previous}>
          <svg viewBox="0 0 24 24" width={22} height={22} aria-hidden="true">
            <path
              d="M15 5l-7 7 7 7"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <button className="lb-next" aria-label="Next" onClick={next}>
          <svg viewBox="0 0 24 24" width={22} height={22} aria-hidden="true">
            <path
              d="M9 5l7 7-7 7"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        {/* eslint-disable-next-line @next/next/no-img-element -- whichever full-size photo was clicked */}
        <img className="lb-image" src={shown?.href} alt={shown?.alt} />
      </Lightbox>
    </GalleryContext.Provider>
  );
}

/**
 * A gallery thumbnail: a plain link to the full photo, so it works without
 * JavaScript, which opens in the Gallery's lightbox once hydrated.
 */
export function ShotLink({
  href,
  alt,
  className,
  children,
}: {
  /** The full-size photo. */
  href: string;
  /** For the full-size photo. */
  alt: string;
  className: string;
  /** The thumbnail. */
  children: ReactNode;
}) {
  const gallery = useContext(GalleryContext)!;
  useEffect(() => gallery.add({ href, alt }), [gallery, href, alt]);
  return (
    <a
      className={className}
      href={href}
      onClick={(e) => {
        e.preventDefault();
        gallery.show(href);
      }}
    >
      {children}
    </a>
  );
}
