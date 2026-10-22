// Where a supporter is, as best we know, from the contact details every
// source gives (supporter_contact). A place they told us themselves (a
// member's city) beats one we inferred: the event they last registered
// for, which is where Luma's places come from. For the supporter's page,
// and for finding people near somewhere.
import type { SupporterContact } from "./supporters";

/** Told us themselves, or the place of an event they registered for. */
export type PlaceBasis = "given" | "event";

export type SupporterPlace = {
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  source: SupporterContact["source"];
  at: string;
  basis: PlaceBasis;
};

/** Luma's places are its events', not the person's. */
function basis(contact: SupporterContact): PlaceBasis {
  return contact.source === "luma" ? "event" : "given";
}

/** Whether a contact says anything about where they are. */
function hasPlace(contact: SupporterContact): boolean {
  return contact.city !== null || contact.latitude !== null;
}

/** Their best-known place: the newest they told us, or else the newest event's; null if we know of none. */
export function supporterPlace(contacts: SupporterContact[]): SupporterPlace | null {
  const newest = (wanted: PlaceBasis) =>
    contacts
      .filter((c) => hasPlace(c) && basis(c) === wanted)
      .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())[0];
  const contact = newest("given") ?? newest("event");
  if (!contact) return null;
  return {
    city: contact.city,
    latitude: contact.latitude,
    longitude: contact.longitude,
    source: contact.source,
    at: contact.at,
    basis: basis(contact),
  };
}

/** The contacts with a place they told us themselves. */
export function givenPlaces(contacts: SupporterContact[]): SupporterContact[] {
  return contacts.filter((c) => hasPlace(c) && basis(c) === "given");
}
