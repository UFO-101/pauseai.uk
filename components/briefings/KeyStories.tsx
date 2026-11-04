import type { KeyStory } from "@/lib/content/briefings";

/**
 * The week's key stories, each led by its headline in bold. With `leads`,
 * the headlines alone, as on the list of briefings.
 */
export default function KeyStories({ stories, leads = false }: { stories: KeyStory[]; leads?: boolean }) {
  return (
    <ul>
      {stories.map((story) => (
        <li key={story.lead}>
          <strong>{story.lead}</strong>
          {!leads && <> {story.body}</>}
        </li>
      ))}
    </ul>
  );
}
