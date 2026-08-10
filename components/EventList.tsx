"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import type { LumaEntry } from "@/lib/data/events";
import { formatEventDate, formatEventTime } from "@/lib/data/events";

function getDateStr(d: Date, tz: string): string {
  return d.toLocaleDateString("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" });
}

function EventCard({ entry, isExtra = false }: { entry: LumaEntry; isExtra?: boolean }) {
  const { event } = entry;
  const tz = event.timezone || "Europe/London";
  const eventDay = getDateStr(new Date(event.start_at), tz);
  const [badge, setBadge] = useState<{ label: string; cls: string } | null>(null);

  // Comparing against "now" is inherently non-deterministic between server
  // render and client hydration, so it's computed post-mount rather than
  // during render (avoids a hydration mismatch on the day boundary).
  useEffect(() => {
    function syncBadge() {
      const today = getDateStr(new Date(), "Europe/London");
      const tomorrow = getDateStr(new Date(Date.now() + 864e5), "Europe/London");
      if (eventDay === today) setBadge({ label: "Happening today", cls: "luma-event-badge--today" });
      else if (eventDay === tomorrow) setBadge({ label: "Happening tomorrow", cls: "luma-event-badge--tomorrow" });
      else setBadge(null);
    }
    syncBadge();
  }, [eventDay]);

  // Luma distinguishes in-person from online via the presence of
  // geo_address_info. location_type is "offline" for in-person events
  // and "meet"/"zoom"/etc. for online — never "geo".
  const location = event.geo_address_info
    ? event.geo_address_info.city || event.geo_address_info.address || "In person"
    : "Online";

  return (
    <a
      href={`https://lu.ma/${event.url}`}
      target="_blank"
      rel="noreferrer"
      className={`luma-event-card${isExtra ? " luma-event-card--extra" : ""}`}
    >
      <div className="luma-event-card-img-wrap">
        {event.cover_url ? (
          <Image
            className="luma-event-card-img"
            src={event.cover_url}
            alt=""
            fill
            sizes="(max-width: 600px) 86vw, (max-width: 900px) 50vw, 25vw"
            loading="lazy"
          />
        ) : (
          <div className="luma-event-card-img luma-event-card-img--placeholder"></div>
        )}
      </div>
      <div className="luma-event-card-body">
        {badge && <span className={`luma-event-badge ${badge.cls}`}>{badge.label}</span>}
        <p className="luma-event-card-date">
          {formatEventDate(event.start_at, event.timezone)} · {formatEventTime(event.start_at, event.timezone)}
        </p>
        <h3 className="luma-event-card-title">{event.name}</h3>
        <p className="luma-event-card-location">{location}</p>
      </div>
    </a>
  );
}

export default function EventList({ events, lumaUrl }: { events: LumaEntry[]; lumaUrl: string }) {
  const [expanded, setExpanded] = useState(false);
  const hasMore = events.length > 4;

  if (events.length === 0) {
    return (
      <p className="luma-events-empty">
        See our{" "}
        <a href={lumaUrl} target="_blank" rel="noreferrer">
          event calendar
        </a>{" "}
        for upcoming events.
      </p>
    );
  }

  return (
    <>
      <div className={`luma-events-list${expanded ? " is-expanded" : ""}`}>
        {events.map((entry, i) => (
          <EventCard key={entry.event.url} entry={entry} isExtra={i >= 4} />
        ))}
      </div>
      {hasMore && (
        <div className="luma-events-more">
          <button
            className="btn ghost small"
            onClick={() => setExpanded((e) => !e)}
          >
            <span>{expanded ? "Show fewer events" : "Show more events"}</span>
            <svg
              className="luma-show-more-icon"
              viewBox="0 0 16 16"
              width={14}
              height={14}
              aria-hidden="true"
              style={{ transform: expanded ? "rotate(180deg)" : undefined }}
            >
              <path d="M3 5.5l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      )}
    </>
  );
}
