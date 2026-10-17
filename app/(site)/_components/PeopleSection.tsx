import { ButtonLink } from "@/components/ui/Button";
import PeopleCarousel from "./PeopleCarousel";
import { people } from "@/lib/content/people";
import Section, { Lede, SectionHeader } from "@/components/ui/Section";
import ButtonRow from "@/components/ui/ButtonRow";

// Volunteers' stories, in a carousel.
export default function PeopleSection() {
  return (
    <Section id="people" tone="white" bordered>
      <div className="container">
        <SectionHeader title="People of PauseAI">
          <Lede long>Stories from volunteers about their journey to joining PauseAI.</Lede>
        </SectionHeader>
      </div>
      <PeopleCarousel people={people} />
      <div className="container">
        <ButtonRow>
          <ButtonLink variant="primary" size="large" href="/people/">
            Read all {people.length} stories →
          </ButtonLink>
          <ButtonLink variant="ghost" size="large" href="/people/#share-your-story">
            Share your story →
          </ButtonLink>
        </ButtonRow>
      </div>
    </Section>
  );
}
