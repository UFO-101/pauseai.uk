import Image from "next/image";
import Link from "next/link";
import { ButtonAnchor } from "@/components/ui/Button";
import { formatEventDate, formatEventTime } from "@/lib/events";
import { march } from "@/lib/content/march";

// The march, as one big card above the other upcoming events. The photo and
// title go to its page on this site; the button registers on Luma.
export default function FeaturedEvent() {
  const href = `${march.path}/`;
  return (
    <article className="featured-event">
      <Link href={href} className="featured-event-photo" tabIndex={-1} aria-hidden="true">
        <Image src={march.image.src} alt="" width={march.image.width} height={march.image.height} sizes="(max-width: 760px) 100vw, 540px" />
      </Link>
      <div className="featured-event-body">
        <p className="featured-event-when">
          {formatEventDate(march.startAt, march.timezone)} · {formatEventTime(march.startAt, march.timezone)} · London
        </p>
        <h3 className="featured-event-title">
          <Link href={href}>{march.name}</Link>
        </h3>
        <p className="featured-event-where">
          {march.start.name} → {march.end.name}
        </p>
        <ButtonAnchor variant="primary" href={march.lumaUrl} className="featured-event-cta">
          Register &rarr;
        </ButtonAnchor>
      </div>
    </article>
  );
}
