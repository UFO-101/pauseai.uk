// The cities a supporter gave us themselves, from the contact details every
// source gives (supporter_contact), for their page. Luma's cities are its
// events', not the person's, so they're left out; where a supporter is, as
// best we know, is the supporter_place view's.
import type { SupporterContact } from "./supporters";

/** The contacts with a city they told us themselves. */
export function givenPlaces(contacts: SupporterContact[]): SupporterContact[] {
  return contacts.filter((c) => c.city !== null && c.source !== "luma");
}
