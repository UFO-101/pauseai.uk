import Image from "next/image";
import {
  type DemisLetterOrganisation,
  type DemisLetterSignatory,
  demisLetterDisplayName,
  demisLetterDisplayType,
  demisLetterOrganisations,
  demisLetterParliamentarians,
  demisLetterPortraitPath,
} from "@/lib/content/dear-sir-demis-2025";
import Section from "@/components/ui/Section";
import styles from "./DemisLetterSignatories.module.css";

/**
 * Everyone who signed: the parliamentarians, each with their portrait, then
 * the organisations' logos. Takes the lists, for tests; the page leaves them
 * to default.
 */
export default function DemisLetterSignatories({
  parliamentarians = demisLetterParliamentarians(),
  organisations = demisLetterOrganisations(),
}: {
  parliamentarians?: DemisLetterSignatory[];
  organisations?: DemisLetterOrganisation[];
}) {
  return (
    <Section>
      <div className={`container ${styles.signatories}`}>
        <h2 className={styles.title}>
          <span className={styles.count}>{parliamentarians.length}</span> Signatories
        </h2>
        <p className={styles.lede}>United in calling for AI safety transparency</p>

        <ul className={styles.grid}>
          {parliamentarians.map((signatory) => (
            <SignatoryCard key={signatory.name} signatory={signatory} />
          ))}
        </ul>

        {organisations.length > 0 && (
          <ul className={styles.organisations}>
            {organisations.map((organisation) => (
              <OrganisationCard key={organisation.name} organisation={organisation} />
            ))}
          </ul>
        )}
      </div>
    </Section>
  );
}

function SignatoryCard({ signatory }: { signatory: DemisLetterSignatory }) {
  const portrait = demisLetterPortraitPath(signatory);
  const name = demisLetterDisplayName(signatory);
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2);

  return (
    <li className={styles.signatory}>
      {portrait ? (
        <Image
          className={styles.portrait}
          src={portrait}
          alt={`Portrait of ${name}`}
          width={400}
          height={400}
          sizes="(max-width: 600px) 88px, 128px"
          loading="lazy"
        />
      ) : (
        <span className={styles.initials} aria-hidden="true">
          {initials}
        </span>
      )}
      <span className={styles.name}>{name}</span>
      <span className={styles.type}>{demisLetterDisplayType(signatory.type)}</span>
    </li>
  );
}

function OrganisationCard({ organisation: { name, website, logo } }: { organisation: DemisLetterOrganisation }) {
  const content = logo ? (
    <Image src={logo.src} alt={`${name} logo`} width={logo.width} height={logo.height} sizes="200px" loading="lazy" />
  ) : (
    name
  );

  return (
    <li className={styles.organisation}>
      {website ? (
        <a href={website} target="_blank" rel="noopener noreferrer">
          {content}
        </a>
      ) : (
        <span>{content}</span>
      )}
    </li>
  );
}
