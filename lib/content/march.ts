// The March Against AI Extinction, 21 November 2026: its facts in one place,
// for its page (app/(march)/) and the march banner. The page's link preview
// shows the date, time and route: after changing them, run
// `npm run march:preview`.
import { site } from "./site";

export const march = {
  name: "March Against AI Extinction",
  /** The march's page, the sign-up. */
  path: "/protests/march-against-ai-extinction-nov-26",
  /** Redirects to `path`, keeping its tags: the link to give out, short enough for a post or a poster. */
  shortPath: "/march",
  /** The Luma event: where people register, and its slug in the calendar feed. */
  lumaUrl: "https://luma.com/pauseai-nov26",
  lumaSlug: "pauseai-nov26",
  startAt: "2026-11-21T12:00:00Z",
  endAt: "2026-11-21T15:00:00Z",
  timezone: "Europe/London",
  start: {
    name: "All Souls' Place",
    address: "All Souls' Place, London W1B 3DA",
    area: "London W1B 3DA",
    postcode: "W1B 3DA",
  },
  end: {
    name: "Downing Street",
    address: "Downing Street, London SW1A 2AA",
    area: "London SW1A 2AA",
    postcode: "SW1A 2AA",
  },
  /** The date and place as the sign-up shows them. */
  dateLong: "Saturday 21 Nov 2026",
  dateShort: "Sat 21 Nov 2026",
  /** For tight labels, such as the turnout figures. */
  dateCompact: "21 Nov 2026",
  /** For <time dateTime>. */
  dateIso: "2026-11-21",
  time: "12:00 – 15:00",
  city: "Central London",
  /** The Luma event's cover photo. */
  image: { src: "/images/march-nov-26/luma-cover.webp", width: 1016, height: 1016 },
  /**
   * The march banner shows until the day after the march
   * ends: midnight at the start of Monday 23 November, UK time (GMT then).
   */
  promoteUntil: "2026-11-23T00:00:00Z",
};

/**
 * schema.org Event data for the march's page, so search engines can show it
 * as an event (https://developers.google.com/search/docs/appearance/structured-data/event).
 */
export function marchEventJsonLd(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Event",
    name: march.name,
    startDate: march.startAt,
    endDate: march.endAt,
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    location: {
      "@type": "Place",
      name: march.start.name,
      address: {
        "@type": "PostalAddress",
        streetAddress: march.start.name,
        addressLocality: "London",
        postalCode: march.start.postcode,
        addressCountry: "GB",
      },
    },
    image: [`${site.url}${march.image.src}`],
    description:
      "Thousands of people across the UK believe that companies will soon build superintelligent AI that they cannot control.",
    organizer: { "@type": "Organization", name: "PauseAI UK", url: site.url },
    offers: {
      "@type": "Offer",
      url: march.lumaUrl,
      price: "0",
      priceCurrency: "GBP",
      availability: "https://schema.org/InStock",
    },
    url: `${site.url}${march.path}/`,
  };
}

/** Whether the march banner still points people to the march. */
export function isMarchPromoted(now: Date): boolean {
  return now < new Date(march.promoteUntil);
}
