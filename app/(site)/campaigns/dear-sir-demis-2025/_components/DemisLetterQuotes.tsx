import Image from "next/image";
import { DEMIS_LETTER_QUOTES, type DemisLetterQuote, demisLetterDisplayName } from "@/lib/content/dear-sir-demis-2025";
import styles from "./dear-sir-demis.module.css";

/** What some of the signatories said, each with their portrait. */
export default function DemisLetterQuotes() {
  return (
    <section className={styles.quotes}>
      <div className="container">
        <h2 className={styles.sectionTitle}>
          <span className={styles.eyebrow}>Voices of Concern</span>
          What parliamentarians are saying
        </h2>
        <div className={styles.quotesGrid}>
          {DEMIS_LETTER_QUOTES.map((quote) => (
            <SignatoryQuote key={quote.name} quote={quote} />
          ))}
        </div>
      </div>
    </section>
  );
}

function SignatoryQuote({ quote }: { quote: DemisLetterQuote }) {
  return (
    <figure className={styles.quote}>
      <Image
        className={styles.quotePortrait}
        src={quote.portrait}
        alt={`Portrait of ${demisLetterDisplayName(quote)}`}
        width={400}
        height={400}
        sizes="88px"
        loading="lazy"
      />
      <div>
        <blockquote>{quote.quote}</blockquote>
        <figcaption>{quote.name}</figcaption>
      </div>
    </figure>
  );
}
