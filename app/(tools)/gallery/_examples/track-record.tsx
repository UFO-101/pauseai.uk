// The track record (app/(site)/track-record/_components).
import type { ReactNode } from "react";
import { Gallery as PhotoGallery, ShotLink } from "@/app/(site)/track-record/_components/Gallery";
import { Photos, Shot } from "@/app/(site)/track-record/_components/Photos";
import Timeline from "@/app/(site)/track-record/_components/Timeline";
import { EntryList, EntryText, TimelineEntry } from "@/app/(site)/track-record/_components/TimelineEntry";
import { EntryItem, TimelineList } from "@/app/(site)/track-record/_components/TimelineList";
import type { Group } from "../_components/types";

const DIR = "/images/fundraising";
const SEPT = "/images/pausecon-london-sept-2026";
const DOWNING = "/images/downing-street-protest-sept-2026";
const SIZES = "(max-width: 768px) 100vw, 25vw";

/** A shot of one of the site's photos, by its folder and name: the thumbnail opens the full size. */
function shot(dir: string, name: string, extra: { wide?: boolean; tall?: boolean } = {}) {
  return (
    <Shot
      key={name}
      href={`${dir}/${name}.jpg`}
      src={`${dir}/${name}-thumb.jpg`}
      alt={`An example photo (${name})`}
      sizes={SIZES}
      {...extra}
    />
  );
}

/** Wrapped as on the page: a column of the timeline, with the lightbox that its shots open. */
function InGallery({ children }: { children: ReactNode }) {
  return (
    <div className="container">
      <PhotoGallery>{children}</PhotoGallery>
    </div>
  );
}

// Every count Photos lays out, so a new one is a type error until it's here.
const COUNTS: Record<1 | 3 | 4, { label: string; render: () => ReactNode }> = {
  1: {
    label: "One photo, shown whole at its size",
    render: () => (
      <Photos count={1}>
        <Shot
          href={`${DIR}/westminster-hall.jpg`}
          src={`${DIR}/westminster-hall-thumb.jpg`}
          alt="An example photo, shown whole"
          sizes="(max-width: 768px) 100vw, 640px"
          width={960}
          height={538}
          wide
        />
      </Photos>
    ),
  },
  3: {
    label: "Three photos, the last one wide",
    render: () => (
      <Photos count={3}>
        {shot(SEPT, "parliament-conference-hall")}
        {shot(SEPT, "parliament-conference-panel")}
        {shot(SEPT, "pausecon-london-group", { wide: true })}
      </Photos>
    ),
  },
  4: {
    label: "Four photos, the first one tall",
    render: () => (
      <Photos count={4}>
        {shot(DIR, "brussels-benifei-russell", { tall: true })}
        {shot(DIR, "brussels-panel")}
        {shot(DIR, "brussels-discussion")}
        {shot(DIR, "brussels-russell-interview")}
      </Photos>
    ),
  },
};

export const trackRecord: Group = {
  id: "track-record",
  title: "The track record",
  examples: [
    {
      name: "Timeline",
      file: "app/(site)/track-record/_components/Timeline.tsx",
      variants: [{ label: "The whole track record", render: () => <Timeline /> }],
    },
    {
      name: "TimelineList",
      file: "app/(site)/track-record/_components/TimelineList.tsx",
      variants: [
        {
          label: "Two entries, the first highlighted",
          render: () => (
            <div className="container">
              <TimelineList>
                <TimelineEntry id="example-entry-one" month="June" year="2026" title="An example entry">
                  <EntryText>
                    <p>A paragraph about what happened, and why it mattered.</p>
                  </EntryText>
                </TimelineEntry>
                <TimelineEntry id="example-entry-two" month="May" year="2026" title="An earlier example entry">
                  <EntryText>
                    <p>Another paragraph, for the entry before it.</p>
                  </EntryText>
                </TimelineEntry>
              </TimelineList>
            </div>
          ),
        },
      ],
    },
    {
      name: "EntryItem",
      file: "app/(site)/track-record/_components/TimelineList.tsx",
      variants: [
        {
          label: "A bare list item, marked while it's the active entry",
          render: () => (
            <div className="container">
              <ol>
                <EntryItem id="example-entry-item" className="">
                  An entry&rsquo;s list item, unstyled until given a class.
                </EntryItem>
              </ol>
            </div>
          ),
        },
      ],
    },
    {
      name: "TimelineEntry",
      file: "app/(site)/track-record/_components/TimelineEntry.tsx",
      variants: [
        {
          label: "Text, a list and photos",
          render: () => (
            <div className="container">
              <TimelineList>
                <TimelineEntry id="example-entry-photos" month="September" year="2026" title="An example entry">
                  <EntryText>
                    <p>A paragraph about the day, then what came of it:</p>
                    <EntryList>
                      <li>One outcome</li>
                      <li>Another outcome</li>
                    </EntryList>
                  </EntryText>
                  <Photos count={4}>
                    {shot(DOWNING, "downing-street-group")}
                    {shot(DOWNING, "downing-street-banner")}
                    {shot(DOWNING, "downing-street-march")}
                    {shot(DOWNING, "downing-street-burnham-sign")}
                  </Photos>
                </TimelineEntry>
              </TimelineList>
            </div>
          ),
        },
      ],
    },
    {
      name: "EntryText",
      file: "app/(site)/track-record/_components/TimelineEntry.tsx",
      variants: [
        {
          label: "Two paragraphs",
          render: () => (
            <div className="container">
              <EntryText>
                <p>
                  A paragraph of an entry, with{" "}
                  <a className="inline-link" href="/events">
                    a link
                  </a>
                  .
                </p>
                <p>A second paragraph.</p>
              </EntryText>
            </div>
          ),
        },
      ],
    },
    {
      name: "EntryList",
      file: "app/(site)/track-record/_components/TimelineEntry.tsx",
      variants: [
        {
          label: "Each item marked with a short rule",
          render: () => (
            <div className="container">
              <EntryList>
                <li>A first item</li>
                <li>A second item, long enough to wrap onto another line on a phone&rsquo;s narrow screen</li>
              </EntryList>
            </div>
          ),
        },
      ],
    },
    {
      name: "Photos",
      file: "app/(site)/track-record/_components/Photos.tsx",
      variants: (Object.keys(COUNTS) as unknown as (keyof typeof COUNTS)[]).map((count) => ({
        label: COUNTS[count].label,
        render: () => <InGallery>{COUNTS[count].render()}</InGallery>,
      })),
    },
    {
      name: "Shot",
      file: "app/(site)/track-record/_components/Photos.tsx",
      variants: [
        {
          label: "Filling its cell",
          render: () => (
            <InGallery>
              <Photos count={3}>
                {shot(DIR, "pausecon-london-discussion")}
                {shot(DIR, "pausecon-london-ella-workshop")}
              </Photos>
            </InGallery>
          ),
        },
        {
          label: "Whole, at the size it's given",
          render: () => (
            <InGallery>
              <Photos count={1}>
                <Shot
                  href="/images/fundraising/time-article.png"
                  src="/images/fundraising/time-article.png"
                  alt="An example screenshot, shown whole"
                  sizes="(max-width: 768px) 100vw, 640px"
                  width={1600}
                  height={921}
                />
              </Photos>
            </InGallery>
          ),
        },
      ],
    },
    {
      name: "Gallery",
      file: "app/(site)/track-record/_components/Gallery.tsx",
      variants: [
        {
          label: "Its photos open full size, in a lightbox",
          render: () => <InGallery>{COUNTS[3].render()}</InGallery>,
        },
      ],
    },
    {
      name: "ShotLink",
      file: "app/(site)/track-record/_components/Gallery.tsx",
      variants: [
        {
          label: "Any content, as a link that opens its photo",
          render: () => (
            <InGallery>
              <ShotLink className="inline-link" href={`${DIR}/westminster-hall.jpg`} alt="An example photo">
                See the photo
              </ShotLink>
            </InGallery>
          ),
        },
      ],
    },
  ],
};
