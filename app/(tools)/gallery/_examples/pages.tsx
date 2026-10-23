// The other pages' own sections: each page's _components folder under app/(site).
import DemisLetterBackground from "@/app/(site)/campaigns/dear-sir-demis-2025/_components/DemisLetterBackground";
import DemisLetterHelp from "@/app/(site)/campaigns/dear-sir-demis-2025/_components/DemisLetterHelp";
import DemisLetterHero from "@/app/(site)/campaigns/dear-sir-demis-2025/_components/DemisLetterHero";
import DemisLetterQuotes from "@/app/(site)/campaigns/dear-sir-demis-2025/_components/DemisLetterQuotes";
import DemisLetterSignatories from "@/app/(site)/campaigns/dear-sir-demis-2025/_components/DemisLetterSignatories";
import DemisLetterText from "@/app/(site)/campaigns/dear-sir-demis-2025/_components/DemisLetterText";
import EvidenceSubmission from "@/app/(site)/future-of-workforce-inquiry/_components/EvidenceSubmission";
import FootnoteTooltips from "@/app/(site)/future-of-workforce-inquiry/_components/FootnoteTooltips";
import WorkforceForeword from "@/app/(site)/future-of-workforce-inquiry/_components/Foreword";
import BoardSection from "@/app/(site)/governance/_components/BoardSection";
import DonationPolicies from "@/app/(site)/governance/_components/DonationPolicies";
import { ClosedNotice, JobRole, Salary, SkillTags } from "@/app/(site)/jobs/_components/JobRole";
import JobRoles from "@/app/(site)/jobs/_components/JobRoles";
import JobsArticle from "@/app/(site)/jobs/_components/JobsArticle";
import PersonHeader from "@/app/(site)/people/_components/PersonHeader";
import PersonStory from "@/app/(site)/people/_components/PersonStory";
import ShareYourStory from "@/app/(site)/people/_components/ShareYourStory";
import StoryGrid from "@/app/(site)/people/_components/StoryGrid";
import PressKit from "@/app/(site)/press/_components/PressKit";
import PrivacyPolicy from "@/app/(site)/privacy/_components/PrivacyPolicy";
import ChangeSteps from "@/app/(site)/theory-of-change/_components/ChangeSteps";
import ChangeForeword from "@/app/(site)/theory-of-change/_components/Foreword";
import About from "@/app/(site)/what-is-pauseai-uk/_components/About";
import { people, personSlug, type Person } from "@/lib/content/people";
import type { Group } from "../_components/types";

const WITH_PHOTO = people.find((p) => p.imageSrc)!;
const WITH_INITIALS: Person = { name: "Example Person", paragraphs: ["A one-paragraph example story."] };
const ANONYMOUS: Person = { slug: "example-anonymous", paragraphs: ["An example story, given without a name."] };

/** A job's card as the jobs page fills it, open or closed. */
function role(closed: boolean) {
  return (
    <div className="container" style={{ maxWidth: 720 }}>
      <JobRole title={closed ? "An example closed role" : "An example role"} closed={closed}>
        {closed ? (
          <ClosedNotice>
            <p>A line saying why the role has closed.</p>
          </ClosedNotice>
        ) : (
          <Salary>
            <p>
              <strong>Expected salary range: £0k - £0k</strong>
            </p>
          </Salary>
        )}
        <p>A paragraph about what the role involves.</p>
        <SkillTags label="Essential skills" skills={["One skill", "Another skill"]} />
      </JobRole>
    </div>
  );
}

export const pages: Group = {
  id: "pages",
  title: "The other pages",
  examples: [
    {
      name: "About",
      file: "app/(site)/what-is-pauseai-uk/_components/About.tsx",
      variants: [{ label: "What PauseAI UK is", render: () => <About /> }],
    },
    {
      name: "Foreword",
      file: "app/(site)/theory-of-change/_components/Foreword.tsx",
      variants: [{ label: "The theory of change's introduction", render: () => <ChangeForeword /> }],
    },
    {
      name: "ChangeSteps",
      file: "app/(site)/theory-of-change/_components/ChangeSteps.tsx",
      variants: [{ label: "Every step, goals first", render: () => <ChangeSteps /> }],
    },
    {
      name: "BoardSection",
      file: "app/(site)/governance/_components/BoardSection.tsx",
      variants: [{ label: "The board", render: () => <BoardSection /> }],
    },
    {
      name: "DonationPolicies",
      file: "app/(site)/governance/_components/DonationPolicies.tsx",
      variants: [{ label: "Every policy", render: () => <DonationPolicies /> }],
    },
    {
      name: "JobsArticle",
      file: "app/(site)/jobs/_components/JobsArticle.tsx",
      variants: [{ label: "The introduction, then the roles", render: () => <JobsArticle /> }],
    },
    {
      name: "JobRoles",
      file: "app/(site)/jobs/_components/JobRoles.tsx",
      variants: [{ label: "Every role, open ones first", render: () => <JobRoles /> }],
    },
    {
      name: "JobRole",
      file: "app/(site)/jobs/_components/JobRole.tsx",
      variants: [
        { label: "Open, with Apply", render: () => role(false) },
        { label: "Closed, saying why", render: () => role(true) },
      ],
    },
    {
      name: "SkillTags",
      file: "app/(site)/jobs/_components/JobRole.tsx",
      variants: [
        {
          label: "A label and its tags",
          render: () => (
            <div className="container">
              <SkillTags label="Desirable skills" skills={["A skill", "Another skill", "A third, longer skill"]} />
            </div>
          ),
        },
      ],
    },
    {
      name: "Salary",
      file: "app/(site)/jobs/_components/JobRole.tsx",
      variants: [
        {
          label: "Set apart",
          render: () => (
            <div className="container">
              <Salary>
                <p>
                  <strong>Expected salary range: £0k - £0k</strong>
                </p>
              </Salary>
            </div>
          ),
        },
      ],
    },
    {
      name: "ClosedNotice",
      file: "app/(site)/jobs/_components/JobRole.tsx",
      variants: [
        {
          label: "Why a role is closed",
          render: () => (
            <div className="container">
              <ClosedNotice>
                <p>A line saying why the role has closed.</p>
              </ClosedNotice>
            </div>
          ),
        },
      ],
    },
    {
      name: "StoryGrid",
      file: "app/(site)/people/_components/StoryGrid.tsx",
      variants: [{ label: "Every story, as a card", render: () => <StoryGrid /> }],
    },
    {
      name: "PersonHeader",
      file: "app/(site)/people/_components/PersonHeader.tsx",
      variants: [
        { label: "With a photo", render: () => <PersonHeader person={WITH_PHOTO} /> },
        { label: "With initials", render: () => <PersonHeader person={WITH_INITIALS} /> },
        { label: "Anonymous", render: () => <PersonHeader person={ANONYMOUS} /> },
      ],
    },
    {
      name: "PersonStory",
      file: "app/(site)/people/_components/PersonStory.tsx",
      variants: [
        {
          label: "A story of several paragraphs",
          render: () => <PersonStory person={WITH_PHOTO} slug={personSlug(WITH_PHOTO)} />,
        },
        {
          label: "A one-paragraph story",
          render: () => <PersonStory person={WITH_INITIALS} slug={personSlug(WITH_INITIALS)} />,
        },
      ],
    },
    {
      name: "ShareYourStory",
      file: "app/(site)/people/_components/ShareYourStory.tsx",
      variants: [{ label: "The form, under its invitation", render: () => <ShareYourStory id="example-share" /> }],
    },
    {
      name: "PressKit",
      file: "app/(site)/press/_components/PressKit.tsx",
      variants: [{ label: "Contacts, assets and coverage", render: () => <PressKit /> }],
    },
    {
      name: "Foreword",
      file: "app/(site)/future-of-workforce-inquiry/_components/Foreword.tsx",
      variants: [{ label: "The inquiry's introduction", render: () => <WorkforceForeword /> }],
    },
    {
      name: "EvidenceSubmission",
      file: "app/(site)/future-of-workforce-inquiry/_components/EvidenceSubmission.tsx",
      variants: [{ label: "The whole submission, with its notes", render: () => <EvidenceSubmission /> }],
    },
    {
      name: "FootnoteTooltips",
      file: "app/(site)/future-of-workforce-inquiry/_components/FootnoteTooltips.tsx",
      variants: [
        {
          label: "Renders nothing visible: footnote markers with a note on the page show it on hover",
          render: () => (
            <div className="container">
              <p>Hover a numbered marker in the submission above to see its note.</p>
              <FootnoteTooltips />
            </div>
          ),
        },
      ],
    },
    {
      name: "DemisLetterHero",
      file: "app/(site)/campaigns/dear-sir-demis-2025/_components/DemisLetterHero.tsx",
      variants: [{ label: "The title, who signed in numbers, and the date", render: () => <DemisLetterHero /> }],
    },
    {
      name: "DemisLetterQuotes",
      file: "app/(site)/campaigns/dear-sir-demis-2025/_components/DemisLetterQuotes.tsx",
      variants: [{ label: "Six signatories' quotes, with their portraits", render: () => <DemisLetterQuotes /> }],
    },
    {
      name: "DemisLetterText",
      file: "app/(site)/campaigns/dear-sir-demis-2025/_components/DemisLetterText.tsx",
      variants: [{ label: "The whole letter", render: () => <DemisLetterText /> }],
    },
    {
      name: "DemisLetterSignatories",
      file: "app/(site)/campaigns/dear-sir-demis-2025/_components/DemisLetterSignatories.tsx",
      variants: [
        { label: "Everyone who signed, and the organisations' logos", render: () => <DemisLetterSignatories /> },
        {
          label: "A signatory without a portrait, and an organisation without a logo or website",
          render: () => (
            <DemisLetterSignatories
              parliamentarians={[{ name: "Example Person MP", type: "MP" }]}
              organisations={[{ name: "An Example Organisation", website: null, logo: null }]}
            />
          ),
        },
      ],
    },
    {
      name: "DemisLetterBackground",
      file: "app/(site)/campaigns/dear-sir-demis-2025/_components/DemisLetterBackground.tsx",
      variants: [{ label: "The background PDF beside its heading", render: () => <DemisLetterBackground /> }],
    },
    {
      name: "DemisLetterHelp",
      file: "app/(site)/campaigns/dear-sir-demis-2025/_components/DemisLetterHelp.tsx",
      variants: [
        { label: "The button to the campaign running now, and who to contact", render: () => <DemisLetterHelp /> },
      ],
    },
    {
      name: "PrivacyPolicy",
      file: "app/(site)/privacy/_components/PrivacyPolicy.tsx",
      variants: [{ label: "The whole policy", render: () => <PrivacyPolicy /> }],
    },
  ],
};
