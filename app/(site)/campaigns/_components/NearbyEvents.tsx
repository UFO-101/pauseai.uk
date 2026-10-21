"use client";

import { useEffect, useState } from "react";
import { eventsNear, type LumaEvent } from "@/lib/events";
import UpcomingEvents from "../../_components/UpcomingEvents";
import { readLookup } from "./draft";

/**
 * On the "sent" page: the home page's "Upcoming events", with the events
 * near the postcode from "Find my MP", or online ones when there's none
 * (lib/events.ts eventsNear). Shown whether or not a letter was just sent,
 * so the page is still of use opened from a link, and easy to try out.
 * Chosen once the page loads, as the postcode is in the browser
 * (sessionStorage).
 */
export default function NearbyEvents({ campaignSlug, events }: { campaignSlug: string; events: LumaEvent[] }) {
  const [chosen, setChosen] = useState<LumaEvent[]>([]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- once, on load, from sessionStorage, which the server render couldn't read
    setChosen(eventsNear(events, readLookup(campaignSlug)?.place));
  }, [campaignSlug, events]);

  return chosen.length > 0 ? <UpcomingEvents events={chosen} /> : null;
}
