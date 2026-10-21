// Every word of the home page's events band (app/(site)/_components/HomeEvents.tsx):
// choosing where to see in-person events near, or only the online ones.

export const homeEventsCopy = {
  heading: "Upcoming events",
  /** The button that opens the choice of where. */
  chooseWhere: "Choose location",
  online: "Online",
  /** The switch of what's shown: everything, near a place (opening the choice of where), or online. */
  switchLabel: "Which events to show",
  all: "All",
  nearShort: (where: string) => `Near ${where}`,
  nearYouShort: "Near you",
  pickerLabel: "Where you're looking for events",
  useLocation: "Use my location",
  locating: "Finding you…",
  locationFailed: "We couldn't find your location. Try a postcode.",
  postcodeLabel: "Or a postcode",
  postcodeButton: "Find",
  postcodeRequired: "Please enter a postcode.",
  postcodeNotFound: "Postcode not found.",
  postcodeFailed: "Something went wrong. Please try again.",
  groupsLabel: "Or a local group",
  noneNear: "Nothing near there just now. See the online events.",
};
