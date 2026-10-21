"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import EventList from "@/components/events/EventList";
import EventsSection from "@/components/events/EventsSection";
import { homeEventsCopy as copy } from "@/lib/content/home-events";
import { localGroups } from "@/lib/content/local-groups";
import { site } from "@/lib/content/site";
import { ANYWHERE, inPersonEventsFor, isOnlineEvent, type EventsWhere, type LumaEvent } from "@/lib/events";
import { EVENTS_PARAM, eventsFromQuery, withEventsQuery, type EventsShowing } from "@/lib/events-url";
import { placeUnder, type Placement } from "@/lib/popover-placement";
import EventsPlacePicker from "./EventsPlacePicker";
import styles from "./HomeEvents.module.css";

/** The switch's middle segment: an invitation to choose until there's a choice, then where. */
function nearLabel(where: EventsWhere): string {
  if (where.kind === "anywhere") return copy.chooseWhere;
  if (where.kind === "group") return copy.nearShort(where.name);
  return where.name ? copy.nearShort(where.name) : copy.nearYouShort;
}

/** The least space between the choice of where and the viewport's sides: the page's side gutter (--space-4). */
const GUTTER_PX = 16;

/** The address bar says what's shown, when it's a local group or online, so the page can be linked to showing it. */
function rememberInUrl(showing: EventsShowing) {
  const url = withEventsQuery(new URL(window.location.href), showing, localGroups);
  window.history.replaceState(window.history.state, "", url);
}

/**
 * The home page's events: every one, soonest first, until the visitor
 * chooses where to see in-person ones near, or only the online ones, which
 * anyone can join from wherever they are. A link can ask for a local
 * group's or the online ones (lib/events-url.ts).
 */
export default function HomeEvents({ events }: { events: LumaEvent[] }) {
  const [where, setWhere] = useState<EventsWhere>(ANYWHERE);
  const [onlineOnly, setOnlineOnly] = useState(false);
  const [choosing, setChoosing] = useState(false);
  const pickerId = useId();
  const chooser = useRef<HTMLDivElement>(null);
  const chooseButton = useRef<HTMLButtonElement>(null);
  const picker = useRef<HTMLDivElement>(null);
  const [placement, setPlacement] = useState<Placement>();

  // The choice of where hangs centred under its button, kept within the
  // page's side gutters: measured once open, and again if the window changes.
  useLayoutEffect(() => {
    if (!choosing) return;
    function place() {
      // Both are rendered while choosing.
      const button = chooseButton.current!.getBoundingClientRect();
      const box = picker.current!.getBoundingClientRect();
      setPlacement(
        placeUnder({
          anchorLeft: button.left,
          anchorWidth: button.width,
          width: box.width,
          viewportWidth: window.innerWidth,
          gutter: GUTTER_PX,
        }),
      );
    }
    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [choosing]);

  // What the link asked for. After the page loads, as the server renders
  // the page the same whatever the query.
  useEffect(() => {
    const asked = eventsFromQuery(window.location.search, localGroups);
    if (!asked) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- once, on load, from the link's query, which the server render doesn't see
    setWhere(asked.where);
    setOnlineOnly(asked.onlineOnly);
  }, []);

  // The choice of where closes on Escape, back to its button, or on a click
  // anywhere else on the page.
  useEffect(() => {
    if (!choosing) return;
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      setChoosing(false);
      chooseButton.current?.focus();
    }
    function onPointer(e: PointerEvent) {
      if (!chooser.current?.contains(e.target as Node)) setChoosing(false);
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [choosing]);

  function choose(next: EventsWhere) {
    setWhere(next);
    setOnlineOnly(false);
    setChoosing(false);
    rememberInUrl({ where: next, onlineOnly: false });
  }

  function chooseOnline() {
    setOnlineOnly(true);
    setChoosing(false);
    rememberInUrl({ where, onlineOnly: true });
  }

  const shown = onlineOnly
    ? events.filter(isOnlineEvent)
    : where.kind === "anywhere"
      ? events
      : inPersonEventsFor(events, where, localGroups);

  const showing = onlineOnly ? "online" : where.kind === "anywhere" ? "all" : "near";

  return (
    <EventsSection
      id={EVENTS_PARAM}
      heading={copy.heading}
      calendar={{ label: "View full calendar →", href: site.social.luma, variant: "ghost" }}
      actions={
        <div role="group" aria-label={copy.switchLabel} className={styles.switch}>
          <button
            type="button"
            className={styles.segment}
            aria-pressed={showing === "all"}
            onClick={() => choose(ANYWHERE)}
          >
            {copy.all}
          </button>
          <div ref={chooser} className={styles.chooser}>
            <button
              ref={chooseButton}
              type="button"
              className={styles.segment}
              aria-pressed={showing === "near"}
              aria-expanded={choosing}
              aria-controls={choosing ? pickerId : undefined}
              onClick={() => setChoosing(!choosing)}
            >
              <svg
                className={styles.icon}
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z" />
                <circle cx="12" cy="9.5" r="2.5" />
              </svg>
              {nearLabel(where)}
              <svg
                className={styles.chevron}
                width="14"
                height="14"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M3 5.5l5 5 5-5" />
              </svg>
            </button>
            {choosing && (
              <EventsPlacePicker
                ref={picker}
                id={pickerId}
                where={where}
                onChoose={choose}
                className={styles.popover}
                style={
                  placement &&
                  ({
                    "--popover-left": `${placement.left}px`,
                    "--popover-point": `${placement.point}px`,
                  } as CSSProperties)
                }
              />
            )}
          </div>
          <button type="button" className={styles.segment} aria-pressed={showing === "online"} onClick={chooseOnline}>
            {copy.online}
          </button>
        </div>
      }
    >
      <EventList events={shown} lumaUrl={site.social.luma} empty={showing === "near" ? copy.noneNear : undefined} />
    </EventsSection>
  );
}
