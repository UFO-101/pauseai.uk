export interface LibraryPhoto {
  id: string;
  label: string;
  /** Full-size original, so print formats stay sharp. */
  src: string;
  /** Small version for the picker. */
  thumb: string;
}

const FULL = "/images/front-page-hero";
const THUMB = "/images/front-page-hero-optimized";

export const LIBRARY_PHOTOS: LibraryPhoto[] = [
  { id: "protest-closeup", label: "Protest close-up", src: `${FULL}/june-2025-protest-closeup.jpg`, thumb: `${THUMB}/june-2025-protest-closeup.webp` },
  { id: "london-protest", label: "London protest group", src: `${FULL}/london-june-2025-protest-group.jpg`, thumb: `${THUMB}/london-june-2025-protest-group.webp` },
  { id: "deepmind", label: "DeepMind protest", src: `${FULL}/deepmind-close-up.jpg`, thumb: `${THUMB}/deepmind-close-up.webp` },
  { id: "letter-writing", label: "Letter writing", src: `${FULL}/letter-writing.jpeg`, thumb: `${THUMB}/letter-writing.webp` },
  { id: "westminster", label: "Westminster Hall", src: `${FULL}/westminster-hall.jpg`, thumb: `${THUMB}/westminster-hall.webp` },
  { id: "pausecon", label: "PauseCon London", src: `${FULL}/pausecon-london-2025-people-talking.jpg`, thumb: `${THUMB}/pausecon-london-2025-people-talking.webp` },
];
