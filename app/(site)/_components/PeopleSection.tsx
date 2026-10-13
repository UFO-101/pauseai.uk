import { ButtonLink } from "@/components/ui/Button";
import PeopleCarousel from "./PeopleCarousel";
import { people } from "@/lib/content/people";

// Volunteers' stories, in a carousel.
export default function PeopleSection() {
  return (

    <section id="people" className="section people">
      <div className="container">
        <div className="section-header">
          <h2>People of PauseAI</h2>
          <p className="section-lede">
            Stories from volunteers about their journey to joining PauseAI.
          </p>
        </div>
      </div>
      <PeopleCarousel people={people} />
      <div className="container">
        <div className="story-teaser-cta">
          <ButtonLink variant="primary" size="large" href="/people/">Read all {people.length} stories →</ButtonLink>
          <ButtonLink variant="ghost" size="large" href="/people/#share-your-story">Share your story →</ButtonLink>
        </div>
      </div>
    </section>
  );
}
