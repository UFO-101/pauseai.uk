import Image from "next/image";
import type { ReactNode } from "react";
import CopyLinkButton from "@/components/ui/CopyLinkButton";
import { ShotLink } from "./Gallery";
import { EntryItem } from "./TimelineList";

/** One dated entry on the timeline, with a link-copy button beside its title. */
export function TimelineEntry({
  id,
  month,
  year,
  title,
  finale = false,
  children,
}: {
  /** The entry's anchor, so it can be linked to as /track-record/#<id>. */
  id: string;
  month: string;
  year: string;
  title: string;
  /** The last entry, where the timeline line ends. */
  finale?: boolean;
  /** The entry's text and gallery. */
  children: ReactNode;
}) {
  return (
    <EntryItem className={finale ? "entry entry-finale" : "entry"} id={id}>
      <aside className="entry-date">
        <span className="month">{month}</span>
        <span className="year">{year}</span>
      </aside>
      <div className="entry-body">
        <div className="entry-heading">
          <h3 className="entry-title">{title}</h3>
          <CopyLinkButton href={`/track-record/#${id}`} title="Copy link to this entry" size={14} />
        </div>
        {children}
      </div>
    </EntryItem>
  );
}

/**
 * A gallery thumbnail that opens the full photo in the lightbox (see
 * Gallery.tsx). Without JavaScript it is a plain link to the photo.
 */
export function Shot({
  href,
  src,
  alt,
  sizes,
  wide = false,
}: {
  /** The full-size photo. */
  href: string;
  /** The thumbnail. */
  src: string;
  alt: string;
  sizes: string;
  /** Spans two gallery columns. */
  wide?: boolean;
}) {
  return (
    <ShotLink className={wide ? "shot shot-wide" : "shot"} href={href} alt={alt}>
      <Image fill sizes={sizes} style={{ objectFit: "cover" }} src={src} alt={alt} />
    </ShotLink>
  );
}
