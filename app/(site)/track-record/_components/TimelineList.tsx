"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { Gallery } from "./Gallery";

/** The id of the entry nearest the top of the screen. */
const ActiveEntry = createContext<string | null>(null);

/**
 * The timeline's list, and the Gallery for its photos. It highlights the
 * entry nearest the top of the screen, or the first entry until one gets
 * there.
 */
export function TimelineList({ children }: { children: ReactNode }) {
  const list = useRef<HTMLOListElement>(null);
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    const entries = Array.from(list.current!.children);
    const io = new IntersectionObserver(
      (items) => {
        const visible = items
          .filter((item) => item.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        setActive((current) => visible[0]?.target.id ?? current ?? entries[0].id);
      },
      { rootMargin: "-25% 0px -55% 0px", threshold: 0 },
    );
    entries.forEach((entry) => io.observe(entry));
    return () => io.disconnect();
  }, []);

  return (
    <ol className="timeline-list" ref={list}>
      <ActiveEntry.Provider value={active}>
        <Gallery>{children}</Gallery>
      </ActiveEntry.Provider>
    </ol>
  );
}

/** One entry's <li>, marked while it is the active one. */
export function EntryItem({ id, className, children }: { id: string; className: string; children: ReactNode }) {
  const active = useContext(ActiveEntry) === id;
  return (
    <li className={active ? `${className} is-active` : className} id={id}>
      {children}
    </li>
  );
}
