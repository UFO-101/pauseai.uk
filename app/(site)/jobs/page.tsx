import { pageMetadata } from "@/lib/metadata";
import Image from "next/image";
import "../track-record/track-record.css";
import JobRoles from "./_components/JobRoles";
import "./jobs.css";

export const metadata = pageMetadata({
  title: "Jobs",
  description:
    "PauseAI UK is hiring: operations, software engineering, content, community organising, design and public affairs roles.",
  path: "/jobs",
  openGraph: { title: "Jobs at PauseAI UK" },
});

export default function JobsPage() {
  return (
    <>
      <main className="track-record jobs-page">
        <section className="tr-hero">
          <div className="container tr-hero-inner">
            <h1 className="tr-hero-title">Jobs</h1>
            <p className="tr-hero-lede">Work for PauseAI UK in a paid role.</p>
          </div>
        </section>

        <article className="intro-article">
          <div className="container intro-inner">
            <section className="intro-section jobs-intro">
              <div className="jobs-photo">
                <Image
                  src="/images/front-page-hero-optimized/pausecon-brussels-discussion.webp"
                  alt="PauseCon Brussels discussion"
                  width={800}
                  height={534}
                />
              </div>
              <p>
                We are the UK&rsquo;s civic movement dedicated to averting the risks of superhuman AI. We help citizens
                organise to take collective actions and make their voice heard. Our volunteers engage with their MPs
                about AI safety, march in protests, join conferences about AI safety in the European and UK Parliaments
                and gather signatures for open letters.
              </p>
              <p>
                If you&rsquo;re interested in joining our mission as a paid member of staff or contractor, please apply
                below.
              </p>
            </section>
          </div>

          <JobRoles />

          <div className="container intro-inner">
            <section className="intro-section">
              <p>
                <strong>Important information about all roles:</strong>
              </p>
              <ul className="intro-list">
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
      </main>
    </>
  );
}
