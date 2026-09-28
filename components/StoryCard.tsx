import type { CSSProperties } from "react";
import type { Story } from "@/lib/data/stories";

function parseCssStyle(css: string): CSSProperties {
  const result: Record<string, string> = {};
  css.split(";").filter(Boolean).forEach((decl) => {
    const colonIdx = decl.indexOf(":");
    if (colonIdx === -1) return;
    const key = decl.slice(0, colonIdx).trim().replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
    result[key] = decl.slice(colonIdx + 1).trim();
  });
  return result as CSSProperties;
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default function StoryCard({ story }: { story: Story }) {
  return (
    <article className="story-card">
      <header className="story-card-header">
        {story.imageSrc ? (
          <div
            className="story-avatar"
            style={{ backgroundImage: `url("${story.imageSrc}")`, ...parseCssStyle(story.imageStyle ?? "") }}
          ></div>
        ) : (
          <div className="story-avatar story-avatar-initials" aria-hidden="true">
            {initials(story.name)}
          </div>
        )}
        <h3 className="story-name">{story.name}</h3>
      </header>
      <div className="story-body">
        {story.paragraphs.map((para, j) => (
          <p key={j} dangerouslySetInnerHTML={{ __html: para }} />
        ))}
      </div>
    </article>
  );
}
