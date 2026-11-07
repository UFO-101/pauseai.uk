import { staffCopy } from "@/lib/content/staff-interface";
import { supportersSearch, type SupportersSearch } from "@/lib/staff-search";
import type { SavedFiltersState } from "@/lib/server/saved-filters";
import { CHANNELS, SENDS, stateValue, waysKey, type Channel, type Topic } from "@/lib/contact-permissions";
import { campaigns } from "@/lib/content/email-your-mp";
import type { SupporterChoices, SupportersPage } from "@/lib/server/supporters";
import { WINDOW_OPTIONS } from "@/lib/staff-dashboard";
import { staffDate } from "@/lib/staff-time";
import { NEAR_MILES, SUPPORTER_BADGES } from "@/lib/supporters";
import ChannelIcon from "./ChannelIcon";
import { supporterFiltersOf } from "./SupportersTable";
import FilterBar, { filteredName, filterWords, type Filter } from "./ui/FilterBar";
import { savedFiltersProps, type SavedFilterActions } from "./ui/SavedFilters";

/**
 * The Subscriptions filter's topics, in its order: email's, then phone's,
 * each ours first, then Luma's, then the rest, so the same one sits on the
 * same row under each heading.
 */
export const SUBSCRIPTION_ORDER: [Channel, Topic][] = [
  ["email", "site-forms"],
  ["email", "luma-calendar"],
  ["email", "pauseai-updates"],
  ["phone", "site-forms"],
  ["phone", "luma-calendar"],
  ["phone", "volunteering"],
  ["phone", "march-day"],
];

/** The words in the Near chip: where it found, or that it couldn't; as typed, when it wasn't looked up. */
function nearWords(text: string, near: SupportersPage["near"]): string {
  const copy = staffCopy.supporters.filters;
  if (near === undefined) return text;
  if (near === "failed") return copy.failed(text);
  return near ? near.place : copy.notFound(text);
}

/**
 * The supporters list's filters, each named after the column it filters
 * on, in the columns' order: their nation and how near somewhere they
 * are, and their MP; their activities and subscriptions; the events they
 * registered for; and whether they wrote in a campaign; the events and MPs
 * from `choices`. A contact filter's
 * choices are each topic, then blocked, a topic chosen as those we can
 * contact about it and another answer in its chip's second half; one by
 * email or phone shows that column; and when they were first seen, last
 * registered for an event or unsubscribed, the lists the dashboard's tiles open,
 * the last two only from those tiles.
 * Activities, subscriptions, nations, MPs and events can each be chosen
 * more than once.
 */
function supporterFilters(
  search: Pick<SupportersSearch, "near">,
  { events, mps }: SupporterChoices = { events: [], mps: [] },
  near?: SupportersPage["near"],
): Filter[] {
  const copy = staffCopy.supporters.filters;
  const { columns } = staffCopy.supporters;
  return [
    {
      name: "nation",
      label: staffCopy.politician.country,
      repeat: true,
      options: Object.entries(staffCopy.countries).map(([value, label]) => ({ value, label })),
    },
    {
      name: "near",
      label: copy.near,
      options: search.near ? [{ value: search.near, label: nearWords(search.near, near) }] : [],
      place: {
        within: "within",
        placeholder: copy.nearPlaceholder,
        distances: NEAR_MILES.map((n) => ({ value: String(n), label: copy.miles(n) })),
      },
    },
    {
      name: "mp",
      label: staffCopy.politician.roles.commons,
      repeat: true,
      searchable: true,
      options: mps.map((mp) => ({ value: String(mp.id), label: copy.mpChoice(mp.name, mp.constituency) })),
    },
    {
      name: "activity",
      label: columns.badges,
      repeat: true,
      options: SUPPORTER_BADGES.map((badge) => ({ value: badge, label: staffCopy.supporters.badges[badge] })),
    },
    {
      name: "contact",
      label: columns.subscriptions,
      repeat: true,
      // Each topic under its channel's heading, chosen as those we can contact about it; then in its chip's second
      // half, another answer. Blocked is last of email's.
      options: CHANNELS.flatMap((channel) => [
        ...SUBSCRIPTION_ORDER.filter(([c]) => c === channel).map(([, topic]) => {
          const ways = waysKey(channel, topic);
          const answers = staffCopy.supporters.detail.permissions.answers[ways];
          return {
            value: stateValue({ channel, topic, send: "yes" }),
            label: copy.topics[topic],
            group: { label: copy.channels[channel], icon: <ChannelIcon channel={channel} /> },
            detail: copy.ways[ways],
            seconds: SENDS.map((send) => ({ value: stateValue({ channel, topic, send }), label: answers[send] })),
          };
        }),
        ...(channel === "email"
          ? [
              {
                value: stateValue({ channel, reason: "blocked" }),
                label: staffCopy.supporters.subscriptions.blocked,
                group: { label: copy.channels.email, icon: <ChannelIcon channel="email" /> },
              },
            ]
          : []),
      ]),
    },
    {
      name: "event",
      label: copy.event,
      repeat: true,
      searchable: true,
      options: events.map((event) => ({
        value: event.id,
        label: copy.eventChoice(event.name, staffDate(event.startAt)),
      })),
    },
    {
      name: "campaign",
      label: copy.campaign,
      options: campaigns.map((campaign) => ({ value: campaign.slug, label: campaign.title })),
    },
    {
      name: "wrote",
      label: copy.campaign,
      after: "campaign",
      options: Object.entries(copy.wrote).map(([value, label]) => ({ value, label })),
    },
    { name: "first", label: copy.first, options: WINDOW_OPTIONS },
    { name: "registered", label: copy.registered, options: WINDOW_OPTIONS, linkedOnly: true },
    { name: "unsubscribed", label: copy.unsubscribed, options: WINDOW_OPTIONS, linkedOnly: true },
  ];
}

/** The supporters list's search and filters that are on, in words, as their chips say them. */
export function supporterWords(
  search: SupportersSearch,
  choices: SupporterChoices,
  near?: SupportersPage["near"],
): string[] {
  return filterWords(supporterFilters(search, choices, near), supporterFiltersOf(search), "q");
}

/** Search and filter the supporters list, with its `saved` filters. The erased notice goes with any change. */
export default function SupporterFilters({
  search,
  choices,
  near,
  saved,
}: {
  search: SupportersSearch;
  choices: SupporterChoices;
  near?: SupportersPage["near"];
  saved?: { state: SavedFiltersState; actions: SavedFilterActions };
}) {
  return (
    <FilterBar
      path="/staff/supporters"
      values={{ ...search, erased: "" }}
      search={{ name: "q", label: staffCopy.supporters.filters.search }}
      filters={supporterFilters(search, choices, near)}
      saved={
        saved &&
        savedFiltersProps({
          ...saved,
          list: "supporters",
          values: { ...search, erased: "" },
          path: "/staff/supporters",
          name: filteredName(staffCopy.supporters.title, supporterWords(search, choices, near)),
          summary: (params) => supporterWords(supportersSearch(params), choices),
        })
      }
    />
  );
}
