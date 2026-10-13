import Link from "next/link";
import type { Person } from "@/lib/content/people";
import { avatarFallback, parseCssStyle } from "@/lib/storyRender";

// A person's photo (or initials) and name, with a link back to everyone.
export default function PersonHeader({ person }: { person: Person }) {
  return (
    <section className="tr-hero">
      <div className="container tr-hero-inner">
        <Link className="story-back-link" href="/people">
          ← Back to all people
        </Link>
        <div className="person-detail-heading">
          {person.imageSrc ? (
            <div
              className="person-detail-avatar"
              style={{ backgroundImage: `url("${person.imageSrc}")`, ...parseCssStyle(person.imageStyle ?? "") }}
            ></div>
          ) : (
            <div className="person-detail-avatar person-avatar-initials" aria-hidden="true">
              {avatarFallback(person.name)}
            </div>
          )}
          <div className="person-detail-title-wrap">
            <h1 className="tr-hero-title">{person.name || "Anonymous submission"}</h1>
          </div>
        </div>
      </div>
    </section>
  );
}
