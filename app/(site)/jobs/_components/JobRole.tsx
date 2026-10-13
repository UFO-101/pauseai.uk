import type { ReactNode } from "react";
import { ButtonAnchor } from "@/components/ui/Button";

export const APPLY_URL = "https://pauseai.fillout.com/uk_job_apply";

/** A job's card: its title, then the description, salary and skills given as children, then Apply. */
export function JobRole({ title, closed = false, children }: { title: string; closed?: boolean; children: ReactNode }) {
  return (
    <article className="jobs-role-card">
      <h2>
        {title}
        {closed && (
          <>
            {" "}
            <span className="jobs-closed-tag">[Applications Closed]</span>
          </>
        )}
      </h2>
      {children}
      {!closed && (
        <ButtonAnchor variant="primary" className="jobs-card-apply" href={APPLY_URL} target="_blank" rel="noreferrer">
          Apply now
        </ButtonAnchor>
      )}
    </article>
  );
}

/** A labelled row of skill tags, e.g. "Essential skills". */
export function SkillTags({ label, skills }: { label: string; skills: string[] }) {
  return (
    <>
      <p className="jobs-skills-label">{label}</p>
      <ul className="jobs-skill-tags">
        {skills.map((skill) => (
          <li key={skill}>{skill}</li>
        ))}
      </ul>
    </>
  );
}
