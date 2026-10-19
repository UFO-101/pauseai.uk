import type { ReactNode } from "react";
import { ButtonAnchor } from "@/components/ui/Button";
import Tag from "@/components/ui/Tag";
import styles from "./JobRole.module.css";

export const APPLY_URL = "https://pauseai.fillout.com/uk_job_apply";

/** A job's card: its title, then the description, salary and skills given as children, then Apply. */
export function JobRole({ title, closed = false, children }: { title: string; closed?: boolean; children: ReactNode }) {
  return (
    <article className={styles.roleCard}>
      <h2>
        {title}
        {closed && (
          <>
            {" "}
            <span className={styles.closedTag}>[Applications Closed]</span>
          </>
        )}
      </h2>
      {children}
      {!closed && (
        <ButtonAnchor variant="primary" className={styles.cardApply} href={APPLY_URL} target="_blank" rel="noreferrer">
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
      <p className={styles.skillsLabel}>{label}</p>
      <ul className={styles.skillTags}>
        {skills.map((skill) => (
          <li key={skill}>
            <Tag>{skill}</Tag>
          </li>
        ))}
      </ul>
    </>
  );
}

/** The salary, set apart at the top of a card. */
export function Salary({ children }: { children: ReactNode }) {
  return <div className={styles.salary}>{children}</div>;
}

/** Why a closed role is closed, at the top of its card. */
export function ClosedNotice({ children }: { children: ReactNode }) {
  return <div className={styles.closedNotice}>{children}</div>;
}
