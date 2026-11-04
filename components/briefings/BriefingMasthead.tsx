import Image from "next/image";
import Link from "next/link";
import { formatPostDate, postAuthor } from "@/lib/content/blog";
import type { Briefing } from "@/lib/content/briefings";
import WeekCalendar from "./WeekCalendar";
import styles from "./BriefingMasthead.module.css";

/**
 * A briefing's masthead: the logo and the byline beside the week's calendar,
 * then the title, over an orange rule. On its own page the title is the
 * page's heading, and the author's name links to their story; on a card in
 * the list of briefings (`card`), which is a link itself, nothing in it is.
 */
export default function BriefingMasthead({ briefing, card = false }: { briefing: Briefing; card?: boolean }) {
  const author = postAuthor(briefing);
  return (
    <header className={styles.masthead}>
      <div className={styles.brand}>
        <Image
          src="/images/logos/PauseAI-Logo-Orange-Black-Logo-Transparent.svg"
          alt="PauseAI"
          width={1124}
          height={446}
          className={styles.logo}
        />
        <p className={styles.byline}>
          By {author && !card ? <Link href={`/people/${author.slug}/`}>{briefing.author}</Link> : briefing.author}
          {" · "}
          <time dateTime={briefing.date}>{formatPostDate(briefing.date)}</time>
        </p>
      </div>
      <div className={styles.week}>
        <WeekCalendar days={briefing.week} />
      </div>
      {card ? <h2 className={styles.title}>{briefing.title}</h2> : <h1 className={styles.title}>{briefing.title}</h1>}
    </header>
  );
}
