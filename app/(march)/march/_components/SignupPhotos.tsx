import Image from "next/image";
import { m } from "./classes";

const PHOTOS = [
  {
    src: "/images/march-signup/protest-banner.jpg",
    alt: "A hand-painted banner reading “Listen to the experts’ warnings” held above the crowd at the February 2026 march in London.",
    caption: "London, February 2026",
  },
  {
    src: "/images/march-signup/protest-deepmind.jpg",
    alt: "Marchers carrying placards past DeepMind’s London offices, February 2026.",
    caption: "Past DeepMind’s offices",
  },
  {
    src: "/images/march-signup/protest-placards.jpg",
    alt: "Protesters of a range of ages holding hand-made placards reading “Commit to safety” and “Let’s cooperate on safety”, June 2025.",
    caption: "June 2025",
  },
];

/** Three photos from earlier marches, full bleed. */
export default function SignupPhotos() {
  return (
    <section className={m("photo-strip")} aria-label="Photos from previous marches">
      {PHOTOS.map((photo) => (
        <figure className={m("photo-item")} key={photo.src}>
          <Image src={photo.src} alt={photo.alt} width={900} height={600} sizes="(max-width: 860px) 100vw, 33vw" />
          <figcaption>{photo.caption}</figcaption>
        </figure>
      ))}
    </section>
  );
}
