import { site } from "@/lib/content/site";
import { ButtonAnchor, ButtonLink } from "@/components/ui/Button";
import styles from "./Closing.module.css";

/**
 * The call to action at the bottom of a page: join the WhatsApp community,
 * or find more ways to get involved, under an optional line.
 */
export default function Closing({ line }: { line?: string }) {
  return (
    <section className={styles.closing}>
      <div className="container">
        {line && <p className={styles.line}>{line}</p>}
        <div className={styles.actions}>
          <ButtonAnchor variant="primary" href={site.whatsappUrl} target="_blank" rel="noreferrer">
            Join the WhatsApp community
          </ButtonAnchor>
          <ButtonLink variant="ghost" href="/#join">
            More ways to get involved
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
