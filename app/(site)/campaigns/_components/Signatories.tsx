import SignatoriesList from "./SignatoriesList";
import { site } from "@/lib/content/site";

// The MPs, peers and others who signed, from the database. The policy team
// edits them in /staff.
export default function Signatories() {
  return (
    <section id="signatories" className="campaigns-signatories">
      <div className="container">
        <h2>Parliamentary signatories</h2>
        <SignatoriesList />
        <p className="signatories-press-note">
          <strong>Note for journalists:</strong> we&rsquo;re planning a public announcement about this letter at a later
          date. We&rsquo;d be grateful if you held off reporting on the signatories until then. For early access or
          interviews, contact <a href={`mailto:${site.pressEmail}`}>{site.pressEmail}</a>.
        </p>
      </div>
    </section>
  );
}
