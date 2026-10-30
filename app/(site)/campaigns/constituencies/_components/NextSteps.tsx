import Link from "next/link";
import CopyLinkButton from "@/components/ui/CopyLinkButton";
import Section, { SectionHeader } from "@/components/ui/Section";
import { constituencyMapCopy as copy } from "@/lib/content/constituency-map";
import styles from "./NextSteps.module.css";

/** Under the map: what a person can do to fill it in, each with its link, or the button to copy the map's. */
export default function NextSteps() {
  return (
    <Section tone="muted">
      <div className="container">
        <SectionHeader title={copy.next.title} />
        <ul className={styles.steps}>
          {copy.next.steps.map((step) => (
            <li key={step.title} className={styles.step}>
              <h3 className={styles.title}>{step.title}</h3>
              <p className={styles.body}>{step.body}</p>
              {step.link.share ? (
                <CopyLinkButton href={step.link.href} title={step.link.label} label={step.link.label} />
              ) : (
                <Link className="inline-link" href={step.link.href}>
                  {step.link.label}
                </Link>
              )}
            </li>
          ))}
        </ul>
      </div>
    </Section>
  );
}
