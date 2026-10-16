import Link from "next/link";
import type { Person } from "@/lib/content/people";
import { avatarFallback, parseCssStyle } from "@/lib/storyRender";
import PageHero from "@/components/ui/PageHero";

// A person's photo (or initials) and name, with a link back to everyone.
export default function PersonHeader({ person }: { person: Person }) {
  return (
    <PageHero
      title={person.name || "Anonymous submission"}
      before={
        <Link className="story-back-link" href="/people">
          ← Back to all people
        </Link>
      }
      figure={
        person.imageSrc ? (
          <div
            className="person-detail-avatar"
            style={{ backgroundImage: `url("${person.imageSrc}")`, ...parseCssStyle(person.imageStyle ?? "") }}
          ></div>
        ) : (
          <div className="person-detail-avatar person-avatar-initials" aria-hidden="true">
            {avatarFallback(person.name)}
          </div>
        )
      }
    />
  );
}
