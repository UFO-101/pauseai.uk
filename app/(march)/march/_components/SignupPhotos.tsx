import Image from "next/image";
import { m } from "./classes";

// No frame draws more than one device pixel per image pixel. Every file is at
// least 1350 × 900: a quarter of a 5K screen is 1280 device pixels wide, half
// of an 860px-wide one at 3x is 1290. A phone shows only the third, full width,
// which is 1920 × 1280: a 620px-wide screen at 3x is 1860.
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

/** Four photos from earlier marches, full bleed; one on a phone. */
export default function SignupPhotos() {
  return (
    <section className={m("photo-strip")} aria-label="Photos from previous marches">
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
    </section>
  );
}
