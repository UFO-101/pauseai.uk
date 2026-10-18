import Image from "next/image";
import Section, { SectionHeader } from "@/components/ui/Section";
import { DEMIS_LETTER_QUOTES, type DemisLetterQuote, demisLetterDisplayName } from "@/lib/content/dear-sir-demis-2025";
import styles from "./DemisLetterQuotes.module.css";

/** What some of the signatories said, each with their portrait. */
export default function DemisLetterQuotes() {
  return (
    <Section>
      <div className="container">
        <SectionHeader
          title={
            <>
              <span className={styles.eyebrow}>Voices of Concern</span>
              What parliamentarians are saying
            </>
          }
        />
        <div className={styles.grid}>
          {DEMIS_LETTER_QUOTES.map((quote) => (
            <SignatoryQuote key={quote.name} quote={quote} />
          ))}
        </div>
      </div>
    </Section>
  );
}

function SignatoryQuote({ quote }: { quote: DemisLetterQuote }) {
  return (
    <figure className={styles.quote}>
      <Image
        className={styles.portrait}
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
