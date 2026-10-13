import SignatoriesList from "./SignatoriesList";
import { site } from "@/lib/content/site";

// Fallback for local/preview environments without AIRTABLE_TOKEN set — the
// original public share link, scoped to the same signatory columns.
const SIGNATORIES_EMBED = "https://airtable.com/embed/appBInVvIm6opJ1Ob/shrQ4CTHTx5VrLPnp";

// The MPs and peers who signed. Read from Airtable when the site has a\n// token (listFromAirtable); otherwise Airtable's own embed.
export default function Signatories({ listFromAirtable }: { listFromAirtable: boolean }) {
  return (
    <section id="signatories" className="campaigns-signatories">
      <div className="container">
        <h2>Parliamentary signatories</h2>
        {listFromAirtable ? (
          <SignatoriesList />
        ) : (
          <div className="embed-frame signatories-frame">
            <iframe
              src={SIGNATORIES_EMBED}
              title="Parliamentary signatories to the Frontier AI open letter"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            ></iframe>
          </div>
        )}
        <p className="signatories-press-note">
          <strong>Note for journalists:</strong> we&rsquo;re planning a public announcement about this letter at a later date. We&rsquo;d be grateful if you held off reporting on the signatories until then. For early access or interviews, contact{" "}
          <a href={`mailto:${site.pressEmail}`}>{site.pressEmail}</a>.
        </p>
      </div>
    </section>
  );
}
