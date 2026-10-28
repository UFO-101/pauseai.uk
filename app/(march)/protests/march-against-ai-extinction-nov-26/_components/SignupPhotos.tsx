"use client";

import Image from "next/image";
import { useState, type UIEvent } from "react";
import { m } from "./classes";

// The files are 1920 wide, enough for a full-width photo on a phone at 3x;
// the placards' is 1350, a little soft on the widest phones.
const PHOTOS = [
  {
    src: "/images/march-signup/protest-pauseai-banner.jpg",
    alt: "Marchers behind an orange PauseAI banner, holding placards reading “Extinction = bad” and “Say no to AI”, at the February 2026 march in London.",
  },
  {
    src: "/images/march-signup/protest-september.jpg",
    alt: "Protesters in orange holding placards reading “No-one wins the race to AI” and “Don’t build what you can’t control”, September 2026.",
  },
  {
    src: "/images/march-signup/protest-crowd.jpg",
    alt: "A crowd of marchers with PauseAI placards filling a street of office blocks, February 2026.",
  },
  {
    src: "/images/march-signup/protest-placards.jpg",
    alt: "Protesters of a range of ages holding hand-made placards reading “Commit to safety” and “Let’s cooperate on safety”, June 2025.",
  },
];

/**
 * Four photos from earlier marches, full bleed. On a phone they're a carousel,
 * one full-width photo at a time, snapping from one to the next, with a dot
 * for each over their foot and the one in view filled. The dots only show
 * where you are, so they're hidden from screen readers, which have the
 * photos themselves.
 */
export default function SignupPhotos() {
  const [shown, setShown] = useState(0);

  // The track only scrolls on a phone, where it's one photo wide, so how far
  // along it is says which photo is in view.
  const onScroll = (e: UIEvent<HTMLDivElement>) => {
    const track = e.currentTarget;
    const along = track.scrollLeft / (track.scrollWidth - track.clientWidth);
    setShown(Math.round(along * (PHOTOS.length - 1)));
  };

  return (
    <section className={m("photo-strip")} aria-label="Photos from previous marches">
      <div className={m("photo-track")} onScroll={onScroll}>
        {PHOTOS.map((photo) => (
          <figure className={m("photo-item")} key={photo.src}>
            <Image
              src={photo.src}
              alt={photo.alt}
              width={900}
              height={600}
              sizes="(max-width: 620px) 100vw, (max-width: 860px) 50vw, 25vw"
            />
          </figure>
        ))}
      </div>
      <div className={m("photo-dots")} aria-hidden="true">
        {PHOTOS.map((photo, i) => (
          <span className={m(i === shown ? "photo-dot photo-dot-shown" : "photo-dot")} key={photo.src} />
        ))}
      </div>
    </section>
  );
}
