import PersonCard from "@/components/people/PersonCard";
import { LONG_STORY_CHAR_THRESHOLD, isLongStory, people } from "@/lib/content/people";

// Every person's story as a card. Long ones are cut short, with a link to the
// full story.
export default function StoryGrid() {
  return (
    <section className="people-page-grid">
      <div className="container">
        <div className="people-grid">
          {people.map((person, i) => (
            <PersonCard
              key={`${person.name}-${i}`}
              person={person}
              truncate={isLongStory(person)}
              maxChars={LONG_STORY_CHAR_THRESHOLD}
              showLink
            />
          ))}
        </div>
      </div>
    </section>
  );
}
