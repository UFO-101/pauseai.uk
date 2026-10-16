"use client";

import Link from "next/link";
import { useLayoutEffect, useRef, useState } from "react";
import CopyLinkButton from "@/components/ui/CopyLinkButton";
import type { Person } from "@/lib/content/people";
import { personSlug } from "@/lib/content/people";
import { bulletText, isBulletLine, renderBody } from "@/lib/storyRender";
import Avatar from "./Avatar";
import StoryBody from "./StoryBody";
import styles from "./PersonCard.module.css";

// Server-rendered/pre-hydration fallback, so there's no giant flash of text
// before the client can measure. The real truncation point is computed in
// the browser (see below), so this only needs to be a rough approximation.
const FALLBACK_EXCERPT_LENGTH = 300;

// Target height (px) for a truncated card's body. Stories are cut to fit
// this regardless of character count, so a story broken into many short
// paragraphs/bullets (which takes up more vertical space per character than
// a dense single paragraph) still ends up the same visual size as the rest.
// Mirrored as the clamped height in StoryBody.module.css.
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

function useClampedExcerpt(person: Person, enabled: boolean) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState<string[]>(() =>
    enabled ? excerptParagraphs(person.paragraphs, FALLBACK_EXCERPT_LENGTH) : plainParagraphs(person.paragraphs),
  );

  useLayoutEffect(() => {
    if (!enabled) return;
    // Both are rendered whenever the clamp is enabled.
    const measureEl = measureRef.current!;
    const bodyEl = bodyRef.current!;

    function measure() {
      const plain = plainParagraphs(person.paragraphs);
      // Unrounded: clientWidth rounds a fractional width (85vw cards) up, and
      // a measure even half a pixel wider fits an extra word per line.
      measureEl.style.width = `${bodyEl.getBoundingClientRect().width}px`;

      const fits = (paragraphs: string[]) => {
        measureEl.replaceChildren(...buildMeasureNodes(paragraphs));
        return measureEl.offsetHeight <= TARGET_BODY_HEIGHT;
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
        if (fits(excerptParagraphs(person.paragraphs, mid))) {
          lo = mid;
        } else {
          hi = mid - 1;
        }
      }
      setShown(excerptParagraphs(person.paragraphs, lo));
    }

    measure();
    // The first pass can run on the fallback font; the web font wraps
    // differently, so cut again once it has swapped in.
    let cancelled = false;
    document.fonts?.ready.then(() => {
      if (!cancelled) measure();
    });
    window.addEventListener("resize", measure);
    return () => {
      cancelled = true;
      window.removeEventListener("resize", measure);
    };
  }, [enabled, person]);

  return { bodyRef, measureRef, shown };
}

export default function PersonCard({
  person,
  truncate = false,
  maxChars,
  showLink = truncate,
  slide = false,
}: {
  person: Person;
  truncate?: boolean;
  // Fixed character-count excerpt (e.g. capping the /people grid to the
  // length of the 3rd-longest person). When omitted, truncate falls back to
  // the JS pixel-height clamp used by the homepage carousel.
  maxChars?: number;
  // Show the "Read more" link to this person's own page even when the full
  // text is already shown (e.g. every card in the /people grid, not just
  // the truncated ones). Defaults to matching `truncate`.
  showLink?: boolean;
  // A slide in the home page's carousel: a fixed width, and the excerpt cut
  // to a fixed height (TARGET_BODY_HEIGHT).
  slide?: boolean;
}) {
  const slug = personSlug(person);
  const useJsClamp = truncate && maxChars === undefined;
  const { bodyRef, measureRef, shown } = useClampedExcerpt(person, useJsClamp);
  const staticExcerpt = truncate && maxChars !== undefined ? excerptParagraphs(person.paragraphs, maxChars) : null;

  return (
    <article className={slide ? `${styles.card} ${styles.slide}` : styles.card}>
      <header className={styles.header}>
        <Avatar person={person} />
        <div className={styles.nameWrap}>
          <h3 className={styles.name}>
            <Link href={`/people/${slug}`}>{person.name || <em>Anonymous submission</em>}</Link>
          </h3>
        </div>
        <CopyLinkButton slug={slug} />
      </header>
      {truncate ? (
        <StoryBody clamped={slide} ref={useJsClamp ? bodyRef : undefined}>
          {renderBody(useJsClamp ? shown : staticExcerpt!, false)}
        </StoryBody>
      ) : (
        <StoryBody>{renderBody(person.paragraphs, true)}</StoryBody>
      )}
      {truncate && useJsClamp && <StoryBody measure ref={measureRef} />}
      {showLink && (
        <Link className={styles.readMore} href={`/people/${slug}`}>
          Read more →
        </Link>
      )}
    </article>
  );
}
