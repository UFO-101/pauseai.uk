"use client";

import { useEffect, useState } from "react";
import { eventsNear, type LumaEntry } from "@/lib/events";
import UpcomingEvents from "../../_components/UpcomingEvents";
import { readLookup, readSent } from "./draft";

/**
 * After a letter's sent: the home page's "Upcoming events", with the events
 * near the sender's postcode, or online ones (lib/events.ts eventsNear).
 * Nothing until it's known a letter was sent, as the page is read in the
 * browser (sessionStorage).
 */
export default function NearbyEvents({ campaignSlug, events }: { campaignSlug: string; events: LumaEntry[] }) {
  const [chosen, setChosen] = useState<LumaEntry[]>([]);

  useEffect(() => {
    if (!readSent(campaignSlug)) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- once, on load, from sessionStorage, which the server render couldn't read
    setChosen(eventsNear(events, readLookup(campaignSlug)?.place));
  }, [campaignSlug, events]);

  return chosen.length > 0 ? <UpcomingEvents events={chosen} /> : null;
}
