"use client";

import { useRef, useState } from "react";
import type { Person } from "@/lib/data/people";
import PersonCard from "./PersonCard";

// Movement past this many pixels counts as a drag rather than a click, so a
// drag ending over a card's link/button doesn't also fire that click.
const DRAG_THRESHOLD = 5;

export default function PeopleCarousel({ people }: { people: Person[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const dragState = useRef<{ startX: number; startScrollLeft: number; moved: boolean } | null>(null);
  const [dragging, setDragging] = useState(false);

  function scrollByCard(direction: 1 | -1) {
    const track = trackRef.current;
    if (!track) return;
    const card = track.querySelector<HTMLElement>(".person-card");
    const amount = card ? card.getBoundingClientRect().width + 24 : track.clientWidth;
    track.scrollBy({ left: amount * direction, behavior: "smooth" });
  }

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (e.pointerType !== "mouse" || e.button !== 0) return;
    const track = trackRef.current;
    if (!track) return;
    e.preventDefault();
    dragState.current = { startX: e.clientX, startScrollLeft: track.scrollLeft, moved: false };
    track.setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const drag = dragState.current;
    const track = trackRef.current;
    if (!drag || !track) return;
    const delta = e.clientX - drag.startX;
    if (!drag.moved && Math.abs(delta) > DRAG_THRESHOLD) {
      drag.moved = true;
      setDragging(true);
    }
    if (drag.moved) track.scrollLeft = drag.startScrollLeft - delta;
  }

  function endDrag(e: React.PointerEvent<HTMLDivElement>) {
    const track = trackRef.current;
    if (track?.hasPointerCapture(e.pointerId)) track.releasePointerCapture(e.pointerId);
    setDragging(false);
  }

  function handleClickCapture(e: React.MouseEvent<HTMLDivElement>) {
    if (dragState.current?.moved) {
      e.preventDefault();
      e.stopPropagation();
    }
    dragState.current = null;
  }

  return (
    <div className="people-carousel">
      <div
        className={`people-carousel-track${dragging ? " dragging" : ""}`}
        ref={trackRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onPointerLeave={endDrag}
        onClickCapture={handleClickCapture}
      >
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
