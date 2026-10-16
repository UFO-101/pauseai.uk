import { ButtonLink } from "@/components/ui/Button";
import { staff } from "@/lib/content/staff";
import Section, { Lede, SectionHeader } from "@/components/ui/Section";

// The paid staff, and the jobs page.
export default function StaffSection() {
  return (
    <Section id="staff">
      <div className="container">
        <SectionHeader title="Meet the organisers">
          <Lede>
            PauseAI UK is volunteer-driven, supported by two paid staff. Get in touch to collaborate or{" "}
            <a
              className="inline-link"
              href="https://docs.google.com/document/d/1wVqsjGatoP3ltspkeqnyeye7I1d_V8XYRPQGaGyvitQ/edit?usp=sharing"
              target="_blank"
              rel="noreferrer"
            >
              start a new local group
            </a>
            .
          </Lede>
        </SectionHeader>
        <div className="staff-grid">
          {staff.map((person) => (
            <article key={person.name} className="staff-card">
              <div className="avatar" style={{ backgroundImage: `url("${person.imageSrc}")` }}></div>
              <div>
                <h3>{person.name}</h3>
                <p className="role">{person.role}</p>
                <p className="bio">{person.bio}</p>
              </div>
            </article>
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "center", marginTop: 36 }}>
          <ButtonLink variant="primary" size="large" href="/jobs/">
            We&rsquo;re hiring →
          </ButtonLink>
        </div>
      </div>
    </Section>
  );
}
