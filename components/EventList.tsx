"use client";

import { useEffect, useRef, useState } from "react";
import type { LumaEntry } from "@/lib/data/events";
import { formatEventDate, formatEventTime } from "@/lib/data/events";

function getDateStr(d: Date, tz: string): string {
  return d.toLocaleDateString("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" });
}

function EventCard({ entry }: { entry: LumaEntry }) {
  const { event } = entry;
  const tz = event.timezone || "Europe/London";
  const today = getDateStr(new Date(), "Europe/London");
  const tomorrow = getDateStr(new Date(Date.now() + 864e5), "Europe/London");
  const eventDay = getDateStr(new Date(event.start_at), tz);
  let badge: { label: string; cls: string } | null = null;
  if (eventDay === today) badge = { label: "Happening today", cls: "luma-event-badge--today" };
  else if (eventDay === tomorrow) badge = { label: "Happening tomorrow", cls: "luma-event-badge--tomorrow" };

  const location =
    event.location_type === "geo" && event.geo_address_info
      ? event.geo_address_info.city || event.geo_address_info.full_address || "In person"
      : "Online";

  return (
    <a
      href={`https://lu.ma/${event.url}`}
      target="_blank"
      rel="noreferrer"
      className="luma-event-card"
    >
      {event.cover_url ? (
        <img className="luma-event-card-img" src={event.cover_url} alt="" loading="lazy" />
      ) : (
        <div className="luma-event-card-img luma-event-card-img--placeholder"></div>
      )}
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
  const first4 = events.slice(0, 4);
  const rest = events.slice(4);
  const hasMore = rest.length > 0;

  const [expanded, setExpanded] = useState(false);
  const extraRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = extraRef.current;
    if (!el) return;
    if (expanded) {
      el.querySelectorAll<HTMLElement>(".luma-event-card").forEach((card, i) => {
        card.style.animationDelay = `${i * 60}ms`;
      });
      el.classList.remove("overflow-visible");
      el.style.maxHeight = el.scrollHeight + "px";
      el.classList.add("is-expanded");
      const onEnd = (e: TransitionEvent) => {
        if (e.propertyName !== "max-height") return;
        el.style.maxHeight = "";
        el.classList.add("overflow-visible");
      };
      el.addEventListener("transitionend", onEnd, { once: true });
    } else {
      el.classList.remove("overflow-visible");
      el.style.maxHeight = el.scrollHeight + "px";
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          el.style.maxHeight = "0";
          el.classList.remove("is-expanded");
        })
      );
      const onEnd = (e: TransitionEvent) => {
        if (e.propertyName !== "max-height") return;
        el.style.maxHeight = "";
      };
      el.addEventListener("transitionend", onEnd, { once: true });
      el.querySelectorAll<HTMLElement>(".luma-event-card").forEach((card) => {
        card.style.animationDelay = "";
      });
    }
  }, [expanded]);

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
      <div className="luma-events-scroll">
        {first4.map((entry) => (
          <EventCard key={entry.event.url} entry={entry} />
        ))}
      </div>
      {hasMore && (
        <div className="luma-events-extra" ref={extraRef}>
          <div className="luma-events-extra-inner">
            {rest.map((entry) => (
              <EventCard key={entry.event.url} entry={entry} />
            ))}
          </div>
        </div>
      )}
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
