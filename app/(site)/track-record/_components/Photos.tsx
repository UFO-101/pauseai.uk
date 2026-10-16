import Image from "next/image";
import type { ReactNode } from "react";
import { ShotLink } from "./Gallery";
import styles from "./Photos.module.css";

const COUNTS = { 1: styles.one, 3: styles.three, 4: styles.four };

/** An entry's photos, laid out for how many there are. */
export function Photos({ count, children }: { count: 1 | 3 | 4; children: ReactNode }) {
  return <div className={`${styles.photos} ${COUNTS[count]}`}>{children}</div>;
}

/**
 * A thumbnail that opens the full photo in the lightbox (see Gallery.tsx).
 * Without JavaScript it is a plain link to the photo. It fills its cell,
 * unless given the thumbnail's `width` and `height`, when it shows whole.
 */
export function Shot({
  href,
  src,
  alt,
  sizes,
  wide = false,
  tall = false,
  width,
  height,
}: {
  /** The full-size photo. */
  href: string;
  /** The thumbnail. */
  src: string;
  alt: string;
  sizes: string;
  /** Spans the grid's columns. */
  wide?: boolean;
  /** Spans two of the grid's rows. */
  tall?: boolean;
  width?: number;
  height?: number;
}) {
  const className = [styles.shot, wide && styles.wide, tall && styles.tall].filter(Boolean).join(" ");
  return (
    <ShotLink className={className} href={href} alt={alt}>
      {width ? (
        <Image
          width={width}
          height={height}
          sizes={sizes}
          style={{ width: "100%", height: "auto" }}
          src={src}
          alt={alt}
        />
      ) : (
        <Image fill sizes={sizes} style={{ objectFit: "cover" }} src={src} alt={alt} />
      )}
    </ShotLink>
  );
}
