import Link from "next/link";
import { site } from "@/lib/content/site";
import { ClosedNotice, JobRole, Salary, SkillTags } from "./JobRole";
import styles from "./JobRoles.module.css";

// Linked from the Head of Public Affairs role: the September 2026 discussion in
// the UK Parliament and the PauseCon Brussels conference in the European Parliament.
const UK_PARLIAMENT_EVENT_URL = "https://x.com/PauseAI_UK/status/2097102594908803088";
const EU_PARLIAMENT_EVENT_URL = "https://pauseai.substack.com/p/eu-parliamentarians-acknowledge-the";

// Every role we are hiring for, open ones first.
export default function JobRoles() {
  return (
    <div className="container">
      <div className={styles.roles}>
        <JobRole title="Operations specialist">
          <Salary>
            <p>
              <strong>Expected salary range: £50k - £100k</strong>
              <br />
              <strong>This can potentially be a part time role. But full time applicants are preferred.</strong>
            </p>
          </Salary>
          <p>
            PauseAI is a non-profit company limited by guarantee. We are not currently planning to register as a
            charity, but we would like to be able to accept donations from a variety of donors, including US donors with
            requirements to only give to 501(c)(3)s. We need to pay employees, pay tax, comply with regulations and
            generally be a well-functioning organisation. The first responsibility of this role is to manage all of
            those requirements and explain everything that you are doing clearly to the Director.
          </p>
          <p>
            We organise complex events and conferences across the UK. This requires hiring venues, arranging catering,
            managing volunteers, printing merchandise, booking accommodation, renting buses and many other logistical
            challenges. The second responsibility of the role is to manage these logistics.
          </p>
          <p>
            Beyond those two pillars, the scope and responsibilities of this role will depend on your skills and
            experience.
          </p>
          <SkillTags
            label="Essential skills"
            skills={["Tax and Compliance", "Operations", "Event management", "General competence using software"]}
          />
        </JobRole>

        <JobRole title="Software engineer" closed>
          <ClosedNotice>
            <p>
              <strong>Applications for this position are now closed.</strong>
            </p>
            <p>
              However, software engineering skills are highly valuable for many of the other roles we are hiring for, so
              if you have those skills, consider if any of the other roles may be of interest to you.
            </p>
          </ClosedNotice>
          <Salary>
            <p>
              <strong>Expected salary range: £50k - £100k</strong>
            </p>
          </Salary>
          <p>
            The goal of PauseAI is to help citizens organise into an effective political force in the UK. This means
            that we need to be extremely well organised and have excellent software that helps us run all of our
            operations.
          </p>
          <p>
            In this role you will primarily operate as a full stack solo developer creating a complex web application
            that wrangles data from a wide variety of inputs and provides information and tools for managing our
            campaigns. You will need to be adept at frontend, backend, DevOps and web architecture. You should be able
            to deliver high quality code at a rapid pace.
          </p>
          <SkillTags label="Essential skills" skills={["Software engineering"]} />
          <SkillTags label="Nice-to-have skills" skills={["Web design"]} />
        </JobRole>

        <JobRole title="Content creator">
          <Salary>
            <p>
              <strong>
                Salary depends on specific scope or role, which will depend on your skills and availability. This can
                potentially be a part time role or a limited contract.
              </strong>
            </p>
          </Salary>
          <p>
            We want to create compelling video and written content for our social media channels. The goal is to convey
            the enormous impact that AI could have on our society, grow our audience and funnel people into taking
            action, while communicating the key messages that PauseAI wants to convey.
          </p>
          <SkillTags
            label="Nice-to-have skills"
            skills={[
              "Content writing / Script writing (in at least one medium) / Tweeting",
              "Public speaking / Performance / Talent",
              "Video creating",
            ]}
          />
        </JobRole>

        <JobRole title="Community organiser">
          <Salary>
            <p>
              <strong>Expected salary range: £25k - £60k pro rata</strong>
              <br />
              <strong>
                This role can potentially be a part time role or a limited contract. It can be well suited to students
                who would like to work part time for PauseAI UK alongside their studies.
              </strong>
            </p>
          </Salary>
          <p>
            Our volunteer community is the core of what we do. In this role, you will work with volunteers to help them
            maximise their impact through PauseAI. This will typically involve assisting local group leaders with
            running their groups and organising events.
          </p>
          <SkillTags label="Essential skills" skills={["Community organising", "Personal skills"]} />
          <SkillTags label="Nice-to-have skills" skills={["Event management"]} />
        </JobRole>

        <JobRole title="Graphic designer / Web designer / Artist">
          <p>
            We very often need to produce graphics to advertise events or present ourselves in some public way. We also
            want our website and other software to look great and be intuitive to use. This shapes the image that
            PauseAI presents to the world.
          </p>
          <Salary>
            <p>
              <strong>
                We don&rsquo;t have enough design work for this to be a full time role. But it can be a useful component
                of some other role. Or it can be a part time or contract-based role.
              </strong>
              <br />
              <strong>
                Expected salary range will depend on the form of employment but we will probably be able to match
                typical market rates for this type of work.
              </strong>
            </p>
          </Salary>
          <SkillTags label="Essential skills" skills={["Graphic design"]} />
          <SkillTags label="Nice-to-have skills" skills={["Web design"]} />
        </JobRole>

        <JobRole title="Head of Public Affairs">
          <Salary>
            <p>
              <strong>Expected salary range: £50k - £100k</strong>
            </p>
          </Salary>
          <p>
            Last year, PauseAI wrote an <Link href={site.openLetterPath}>open letter</Link> to Demis Hassabis signed by
            over 60 UK politicians. This year we have held conferences in the{" "}
            <a href={UK_PARLIAMENT_EVENT_URL} target="_blank" rel="noreferrer">
              UK Parliament
            </a>{" "}
            and the{" "}
            <a href={EU_PARLIAMENT_EVENT_URL} target="_blank" rel="noreferrer">
              European Parliament
            </a>{" "}
            with speakers including:
          </p>
          <ul className={styles.roleList}>
            <li>
              <strong>Victor Negrescu MEP</strong>, Vice-President of the European Parliament.
            </li>
            <li>
              <strong>Dame Chi Onwurah MP</strong>, Chair of the House of Commons Science, Innovation &amp; Technology
              Committee.
            </li>
            <li>
              <strong>Brando Benifei MEP</strong>, Co-rapporteur of the EU AI Act.
            </li>
          </ul>
          <p>
            We are advocating for regulation and stronger liability for frontier AI development and, ultimately, an
            international treaty to pause the race to superintelligent AI. In this role you would bring your expertise
            and connections in the UK political system to help PauseAI build our relationships in Westminster and
            determine the best legislative strategies for improving AI safety.
          </p>
          <SkillTags label="Essential skills" skills={["Politics and lobbying"]} />
          <SkillTags label="Nice-to-have skills" skills={["AI or legal expertise"]} />
        </JobRole>

        <JobRole title="General expression of interest">
          <p>
            We also encourage general expressions of interest for people who don&rsquo;t fit neatly into any of these
            roles.
          </p>
        </JobRole>
      </div>
    </div>
  );
}
