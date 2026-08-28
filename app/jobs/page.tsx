import type { Metadata } from "next";
import Image from "next/image";
import Nav from "@/components/Nav";
import "../track-record/track-record.css";
import "./jobs.css";

const APPLY_URL = "https://pauseai.fillout.com/uk_job_apply";

export const metadata: Metadata = {
  title: "Jobs",
  description:
    "PauseAI UK is hiring: operations, software engineering, content, community organising, design and campaigning roles.",
  openGraph: {
    title: "Jobs at PauseAI UK",
    description:
      "PauseAI UK is hiring: operations, software engineering, content, community organising, design and campaigning roles.",
    images: [{ url: "/images/open-graph/open-graph-1200-630.jpg", width: 1200, height: 630 }],
    url: "https://pauseai.uk/jobs/",
  },
  twitter: {
    images: ["/images/open-graph/open-graph-1600-840.jpg"],
  },
  alternates: { canonical: "/jobs" },
};

export default function JobsPage() {
  return (
    <>
      <Nav />
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
                We are the UK&rsquo;s civic movement dedicated to averting the risks of superhuman AI. We help
                citizens organise to take collective actions and make their voice heard. Our volunteers engage with
                their MPs about AI safety, march in protests, join conferences about AI safety in the European and
                UK Parliaments and gather signatures for open letters.
              </p>
              <p>
                If you&rsquo;re interested in joining our mission as a paid member of staff or contractor, please
                apply below.
              </p>
            </section>
          </div>

          <div className="container">
            <div className="jobs-roles">
              <article className="jobs-role-card">
                <h2>Operations specialist</h2>
                <div className="jobs-salary">
                  <p>
                    <strong>Expected salary range: £30k - £80k</strong>
                    <br />
                    <strong>This can potentially be a part time role. But full time applicants are preferred.</strong>
                  </p>
                </div>
                <p>
                  PauseAI is a non-profit company limited by guarantee. We are not currently planning to register as a
                  charity, but we would like to be able to accept donations from a variety of donors, including US
                  donors with requirements to only give to 501(c)(3)s. We need to pay employees, pay tax, comply with
                  regulations and generally be a well-functioning organisation. The first responsibility of this role
                  is to manage all of those requirements and explain everything that you are doing clearly to the
                  Director.
                </p>
                <p>
                  We organise complex events and conferences across the UK. This requires hiring venues, arranging
                  catering, managing volunteers, printing merchandise, booking accommodation, renting buses and many
                  other logistical challenges. The second responsibility of the role is to manage these logistics.
                </p>
                <p>
                  Beyond those two pillars, the scope and responsibilities of this role will depend on your skills and
                  experience.
                </p>
                <p className="jobs-skills-label">Essential skills</p>
                <ul className="jobs-skill-tags">
                  <li>Tax and Compliance</li>
                  <li>Operations</li>
                  <li>Event management</li>
                  <li>General competence using software</li>
                </ul>
                <a className="btn primary jobs-card-apply" href={APPLY_URL} target="_blank" rel="noreferrer">
                  Apply now
                </a>
              </article>

              <article className="jobs-role-card">
                <h2>Software engineer</h2>
                <div className="jobs-salary">
                  <p>
                    <strong>Expected salary range: £50k - £100k</strong>
                  </p>
                </div>
                <p>
                  The goal of PauseAI is to help citizens organise into an effective political force in the UK. This
                  means that we need to be extremely well organised and have excellent software that helps us run all
                  of our operations.
                </p>
                <p>
                  In this role you will primarily operate as a full stack solo developer creating a complex web
                  application that wrangles data from a wide variety of inputs and provides information and tools for
                  managing our campaigns. You will need to be adept at frontend, backend, DevOps and web architecture.
                  You should be able to deliver high quality code at a rapid pace.
                </p>
                <p className="jobs-skills-label">Essential skills</p>
                <ul className="jobs-skill-tags">
                  <li>Software engineering</li>
                </ul>
                <p className="jobs-skills-label">Nice to have skills</p>
                <ul className="jobs-skill-tags">
                  <li>Web design</li>
                </ul>
                <a className="btn primary jobs-card-apply" href={APPLY_URL} target="_blank" rel="noreferrer">
                  Apply now
                </a>
              </article>

              <article className="jobs-role-card">
                <h2>Content creator</h2>
                <div className="jobs-salary">
                  <p>
                    <strong>
                      Salary depends on specific scope or role, which will depend on your skills and availability. This
                      can potentially be a part time role or a limited contract.
                    </strong>
                  </p>
                </div>
                <p>
                  We want to create compelling video and written content for our social media channels. The goal is to
                  convey the enormous impact that AI could have on our society, grow our audience and funnel people
                  into taking action, while communicating the key messages that PauseAI wants to convey.
                </p>
                <p className="jobs-skills-label">Nice to have skills</p>
                <ul className="jobs-skill-tags">
                  <li>Content writing / script writing (in at least one medium) / tweeting</li>
                  <li>Public speaking / Performance / Talent</li>
                  <li>Video creating</li>
                </ul>
                <a className="btn primary jobs-card-apply" href={APPLY_URL} target="_blank" rel="noreferrer">
                  Apply now
                </a>
              </article>

              <article className="jobs-role-card">
                <h2>Community organiser</h2>
                <div className="jobs-salary">
                  <p>
                    <strong>Expected salary range: £25k - £60k pro rata</strong>
                    <br />
                    <strong>
                      This role can potentially be a part time role or a limited contract. It can be well suited to
                      students who would like to work part time for PauseAI UK alongside their studies.
                    </strong>
                  </p>
                </div>
                <p>
                  Our volunteer community is the core of what we do. In this role, you will work with volunteers to
                  help them maximise their impact through PauseAI. This will typically involve assisting local group
                  leaders with running their groups and organising events.
                </p>
                <p className="jobs-skills-label">Essential skills</p>
                <ul className="jobs-skill-tags">
                  <li>Community organising</li>
                  <li>Personal skills</li>
                </ul>
                <p className="jobs-skills-label">Nice to have skills</p>
                <ul className="jobs-skill-tags">
                  <li>Event management</li>
                </ul>
                <a className="btn primary jobs-card-apply" href={APPLY_URL} target="_blank" rel="noreferrer">
                  Apply now
                </a>
              </article>

              <article className="jobs-role-card">
                <h2>Graphic designer / Web designer / Artist</h2>
                <p>
                  We very often need to produce graphics to advertise events or present ourselves in some public way.
                  We also want our website and other software to look great and be intuitive to use. This shapes the
                  image that PauseAI presents to the world.
                </p>
                <div className="jobs-salary">
                  <p>
                    <strong>
                      We don&rsquo;t have enough design work for this to be a full time role. But it can be a useful
                      component of some other role. Or it can be a part time or contract-based role.
                    </strong>
                    <br />
                    <strong>
                      Expected salary range will depend on the form of employment but we will probably be able to match
                      typical market rates for this type of work.
                    </strong>
                  </p>
                </div>
                <p className="jobs-skills-label">Essential skills</p>
                <ul className="jobs-skill-tags">
                  <li>Graphic design</li>
                </ul>
                <p className="jobs-skills-label">Nice to have skills</p>
                <ul className="jobs-skill-tags">
                  <li>Web design</li>
                </ul>
                <a className="btn primary jobs-card-apply" href={APPLY_URL} target="_blank" rel="noreferrer">
                  Apply now
                </a>
              </article>

              <article className="jobs-role-card">
                <h2>Lobbyist / Campaign lead</h2>
                <div className="jobs-salary">
                  <p>
                    <strong>Expected salary range: £50k - £100k</strong>
                  </p>
                </div>
                <p>
                  PauseAI is advocating for international treaties and changes in UK law. In this role you would bring
                  your expertise and connections in the UK political system to help PauseAI achieve our legislative and
                  political goals.
                </p>
                <p className="jobs-skills-label">Essential skills</p>
                <ul className="jobs-skill-tags">
                  <li>Politics and lobbying</li>
                </ul>
                <p className="jobs-skills-label">Nice to have skills</p>
                <ul className="jobs-skill-tags">
                  <li>AI or legal expertise</li>
                  <li>Marketing</li>
                </ul>
                <a className="btn primary jobs-card-apply" href={APPLY_URL} target="_blank" rel="noreferrer">
                  Apply now
                </a>
              </article>

              <article className="jobs-role-card">
                <h2>General expression of interest</h2>
                <p>
                  We also encourage general expressions of interest for people who don&rsquo;t fit neatly into any of
                  these roles.
                </p>
                <a className="btn primary jobs-card-apply" href={APPLY_URL} target="_blank" rel="noreferrer">
                  Apply now
                </a>
              </article>
            </div>
          </div>

          <div className="container intro-inner">
            <section className="intro-section">
              <p><strong>Important information about all roles:</strong></p>
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
