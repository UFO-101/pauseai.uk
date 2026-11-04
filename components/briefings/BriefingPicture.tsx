import Image from "next/image";
import styles from "./BriefingPicture.module.css";

/** A small drawing at the bottom right of a briefing's box, such as an X-ray beside the good news. */
export default function BriefingPicture({
  src,
  alt,
  width,
  height,
}: {
  src: string;
  alt: string;
  width: number;
  height: number;
}) {
  return <Image src={src} alt={alt} width={width} height={height} className={styles.picture} />;
}
