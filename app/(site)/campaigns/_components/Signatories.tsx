import SignatoriesList from "./SignatoriesList";
import { site } from "@/lib/content/site";
import styles from "./Signatories.module.css";

// The MPs, peers and others who signed, from the database. The policy team
// edits them in /staff.
export default function Signatories() {
  return (
    <section id="signatories" className={styles.signatories}>
      <div className="container">
        <h2>Parliamentary signatories</h2>
        <SignatoriesList />
        <h2 id="how-to-sign" className={styles.howToSign}>
          How to sign
        </h2>
        <p className={styles.howToSignText}>
          If you&rsquo;re an MP or a member of the House of Lords and would like to add your name to this letter, please
          send us a quick email at <a href={`mailto:${site.contactEmail}`}>{site.contactEmail}</a>.
        </p>
        <p className={styles.pressNote}>
          <strong>Note for journalists:</strong> we&rsquo;re planning a public announcement about this letter at a later
          date. We&rsquo;d be grateful if you held off reporting on the signatories until then. For early access or
          interviews, contact <a href={`mailto:${site.pressEmail}`}>{site.pressEmail}</a>.
        </p>
      </div>
    </section>
  );
}
