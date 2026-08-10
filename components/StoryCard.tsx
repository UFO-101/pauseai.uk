"use client";

import Link from "next/link";
import { useLayoutEffect, useRef, useState } from "react";
import CopyLinkButton from "@/components/CopyLinkButton";
import type { Story } from "@/lib/data/stories";
import { storySlug } from "@/lib/data/stories";
import { avatarFallback, bulletText, isBulletLine, parseCssStyle, renderBody } from "@/lib/storyRender";

// Server-rendered/pre-hydration fallback, so there's no giant flash of text
// before the client can measure. The real truncation point is computed in
// the browser (see below), so this only needs to be a rough approximation.
const FALLBACK_EXCERPT_LENGTH = 300;

// Target height (px) for a truncated card's body. Stories are cut to fit
// this regardless of character count, so a story broken into many short
// paragraphs/bullets (which takes up more vertical space per character than
// a dense single paragraph) still ends up the same visual size as the rest.
const TARGET_BODY_HEIGHT = 220;

function plainParagraphs(paragraphs: string[]): string[] {
  return paragraphs.map((p) => p.replace(/<[^>]+>/g, ""));
}

function truncateAtWord(text: string, maxChars: number): string {
  const cut = text.slice(0, maxChars);
  const lastSpace = cut.lastIndexOf(" ");
  return `${cut.slice(0, lastSpace > 0 ? lastSpace : maxChars).trimEnd()}…`;
}

function excerptParagraphs(paragraphs: string[], maxChars: number): string[] {
  const plain = plainParagraphs(paragraphs);
  const result: string[] = [];
  let remaining = maxChars;
  for (const para of plain) {
    if (para.length <= remaining) {
      result.push(para);
      remaining -= para.length;
      if (remaining <= 0) break;
    } else {
      result.push(truncateAtWord(para, remaining));
      break;
    }
  }
  return result;
}

// Builds the same p/ul/li structure as renderBody(), but as real DOM nodes,
// so we can drop candidate excerpts into a hidden element and read its
// actual rendered height back out — measuring pixels rather than guessing
// from character counts.
function buildMeasureNodes(paragraphs: string[]): HTMLElement[] {
  const nodes: HTMLElement[] = [];
  let i = 0;
  while (i < paragraphs.length) {
    if (isBulletLine(paragraphs[i])) {
      const ul = document.createElement("ul");
      while (i < paragraphs.length && isBulletLine(paragraphs[i])) {
        const li = document.createElement("li");
        li.textContent = bulletText(paragraphs[i]);
        ul.appendChild(li);
        i++;
      }
      nodes.push(ul);
    } else {
      const p = document.createElement("p");
      p.textContent = paragraphs[i];
      nodes.push(p);
      i++;
    }
  }
  return nodes;
}

function useClampedExcerpt(story: Story, enabled: boolean) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState<string[]>(() =>
    enabled ? excerptParagraphs(story.paragraphs, FALLBACK_EXCERPT_LENGTH) : plainParagraphs(story.paragraphs)
  );

  useLayoutEffect(() => {
    if (!enabled) return;
    const measureEl = measureRef.current;
    const bodyEl = bodyRef.current;
    if (!measureEl || !bodyEl) return;

    function measure() {
      const plain = plainParagraphs(story.paragraphs);
      measureEl!.style.width = `${bodyEl!.clientWidth}px`;

      const fits = (paragraphs: string[]) => {
        measureEl!.replaceChildren(...buildMeasureNodes(paragraphs));
        return measureEl!.offsetHeight <= TARGET_BODY_HEIGHT;
      };

      if (fits(plain)) {
        setShown(plain);
        return;
      }

      const totalChars = plain.reduce((sum, p) => sum + p.length, 0);
      let lo = 0;
      let hi = totalChars;
      while (lo < hi) {
        const mid = Math.ceil((lo + hi) / 2);
        if (fits(excerptParagraphs(story.paragraphs, mid))) {
          lo = mid;
        } else {
          hi = mid - 1;
        }
      }
      setShown(excerptParagraphs(story.paragraphs, lo));
    }

    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [enabled, story]);

  return { bodyRef, measureRef, shown };
}

export default function StoryCard({
  story,
  index = 0,
  truncate = false,
  maxChars,
  showLink = truncate,
}: {
  story: Story;
  index?: number;
  truncate?: boolean;
  // Fixed character-count excerpt (e.g. capping the /stories grid to the
  // length of the 3rd-longest story). When omitted, truncate falls back to
  // the JS pixel-height clamp used by the homepage carousel.
  maxChars?: number;
  // Show the "Read more" link to this story's own page even when the full
  // text is already shown (e.g. every card in the /stories grid, not just
  // the truncated ones). Defaults to matching `truncate`.
  showLink?: boolean;
}) {
  const slug = storySlug(story, index);
  const useJsClamp = truncate && maxChars === undefined;
  const { bodyRef, measureRef, shown } = useClampedExcerpt(story, useJsClamp);
  const staticExcerpt = truncate && maxChars !== undefined ? excerptParagraphs(story.paragraphs, maxChars) : null;

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
            {avatarFallback(story.name)}
          </div>
        )}
        <div className="story-name-wrap">
          <h3 className="story-name">
            <Link href={`/stories/${slug}`}>{story.name || <em>Anonymous submission</em>}</Link>
          </h3>
        </div>
        <CopyLinkButton slug={slug} />
      </header>
      {truncate ? (
        <div className="story-body" ref={useJsClamp ? bodyRef : undefined}>
          {renderBody(useJsClamp ? shown : staticExcerpt!, false)}
        </div>
      ) : (
        <div className="story-body">{renderBody(story.paragraphs, true)}</div>
      )}
      {truncate && useJsClamp && <div className="story-body story-body-measure" ref={measureRef} aria-hidden="true" />}
      {showLink && (
        <Link className="story-read-more" href={`/stories/${slug}`}>
          Read more →
        </Link>
      )}
    </article>
  );
}
