import PersonCard from "@/components/people/PersonCard";
import { LONG_STORY_CHAR_THRESHOLD, isLongStory, people } from "@/lib/content/people";
import styles from "./StoryGrid.module.css";

// Every person's story as a card. Long ones are cut short, with a link to the
// full story.
export default function StoryGrid() {
  return (
    <section className={styles.band}>
      <div className="container">
        <div className={styles.grid}>
          {people.map((person, i) => (
            <div key={`${person.name}-${i}`} className={styles.item}>
              <PersonCard
                person={person}
                truncate={isLongStory(person)}
                maxChars={LONG_STORY_CHAR_THRESHOLD}
                showLink
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
