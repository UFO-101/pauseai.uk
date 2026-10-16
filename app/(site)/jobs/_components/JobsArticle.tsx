import Image from "next/image";
import JobRoles from "./JobRoles";
import styles from "./JobsArticle.module.css";

// Who we are and why work with us, the roles, then what holds for every role.
export default function JobsArticle() {
  return (
    <article className={styles.introArticle}>
      <div className={`container ${styles.introInner}`}>
        <section className={`${styles.introSection} ${styles.intro}`}>
          <div className={styles.photo}>
            <Image
              src="/images/front-page-hero-optimized/pausecon-brussels-discussion.webp"
              alt="PauseCon Brussels discussion"
              width={800}
              height={534}
            />
          </div>
          <p>
            We are the UK&rsquo;s civic movement dedicated to averting the risks of superhuman AI. We help citizens
            organise to take collective actions and make their voice heard. Our volunteers engage with their MPs about
            AI safety, march in protests, join conferences about AI safety in the European and UK Parliaments and gather
            signatures for open letters.
          </p>
          <p>
            If you&rsquo;re interested in joining our mission as a paid member of staff or contractor, please apply
            below.
          </p>
        </section>
      </div>

      <JobRoles />

      <div className={`container ${styles.introInner}`}>
        <section className={styles.introSection}>
          <p>
            <strong>Important information about all roles:</strong>
          </p>
          <ul className={styles.introList}>
            <li>All salaries are open to negotiation based on skills and experience.</li>
            <li>All roles will report directly to Joseph Miller, Director of PauseAI UK.</li>
            <li>
              Applicants with the right to work in the UK and the ability to work in-person in central London are
              preferred.
            </li>
            <li>All roles will begin with a 2 week to 3 month paid work trial and/or probation period.</li>
            <li>Applications will be considered on a rolling basis, so earlier applications have an advantage.</li>
            <li>
              <strong>Using AI to write your answers is strongly discouraged in most cases.</strong>
            </li>
          </ul>
        </section>
      </div>
    </article>
  );
}
