"use client";

import { useRef } from "react";
import type { Person } from "@/lib/data/people";
import PersonCard from "./PersonCard";

export default function PeopleCarousel({ people }: { people: Person[] }) {
  const trackRef = useRef<HTMLDivElement>(null);

  function scrollByCard(direction: 1 | -1) {
    const track = trackRef.current;
    if (!track) return;
    const card = track.querySelector<HTMLElement>(".person-card");
    const amount = card ? card.getBoundingClientRect().width + 24 : track.clientWidth;
    track.scrollBy({ left: amount * direction, behavior: "smooth" });
  }

  return (
    <div className="people-carousel">
      <div className="people-carousel-track" ref={trackRef}>
        {people.map((person, i) => (
          <PersonCard key={`${person.name}-${i}`} person={person} truncate />
        ))}
      </div>
      <button
        type="button"
        className="people-carousel-btn people-carousel-btn-prev"
        aria-label="Previous story"
        onClick={() => scrollByCard(-1)}
      >
        ‹
      </button>
      <button
        type="button"
        className="people-carousel-btn people-carousel-btn-next"
        aria-label="Next story"
        onClick={() => scrollByCard(1)}
      >
        ›
      </button>
    </div>
  );
}
