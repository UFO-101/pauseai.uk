import { staffCopy } from "@/lib/content/staff-interface";
import type { SupportersSearch } from "@/lib/staff-search";
import { CHANNELS, TOPIC_REASONS, stateValue, topicsOf, type Reason } from "@/lib/contact-permissions";
import { campaigns } from "@/lib/content/email-your-mp";
import type { EventChoice, SupportersPage } from "@/lib/server/supporters";
import { staffDate } from "@/lib/staff-time";
import { NEAR_MILES, SUPPORTER_BADGES } from "@/lib/supporters";
import FilterBar, { type Filter } from "./ui/FilterBar";

/** The words in the Near chip: where it found, or that it couldn't. */
function nearWords(text: string, near: SupportersPage["near"]): string {
  const copy = staffCopy.supporters.filters;
  if (near === "failed") return copy.failed(text);
  return near ? near.place : copy.notFound(text);
}

/**
 * The supporters list's filters, each named after the column it filters
 * on, in the columns' order: whether we have their email and phone; their
 * nation and how near somewhere they are; their activities and
 * subscriptions; the events they registered for, from `events`; and
 * whether they wrote in a campaign. A subscription's choices are each
 * topic's reasons, then blocked. Activities, subscriptions, nations and
 * events can each be chosen more than once.
 */
export function supporterFilters(
  search: Pick<SupportersSearch, "near">,
  events: EventChoice[] = [],
  near?: SupportersPage["near"],
): Filter[] {
  const copy = staffCopy.supporters.filters;
  const { columns } = staffCopy.supporters;
  return [
    {
      name: "email",
      label: columns.email,
      options: [
        { value: "yes", label: copy.email.yes },
        { value: "no", label: copy.email.no },
      ],
    },
    {
      name: "phone",
      label: columns.phone,
      options: [
        { value: "yes", label: copy.phone.yes },
        { value: "no", label: copy.phone.no },
      ],
    },
    {
      name: "country",
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
      name: "activity",
      label: columns.badges,
      repeat: true,
      options: SUPPORTER_BADGES.map((badge) => ({ value: badge, label: staffCopy.supporters.badges[badge] })),
    },
    {
      name: "subscription",
      label: columns.subscriptions,
      repeat: true,
      options: [
        ...CHANNELS.flatMap((channel) =>
          topicsOf(channel).flatMap((topic) =>
            (TOPIC_REASONS[channel] as Record<string, readonly Reason[]>)[topic].map((reason) => ({
              value: stateValue({ channel, topic, reason }),
              label: (channel === "email" ? copy.states : copy.phoneStates)[topic][reason],
            })),
          ),
        ),
        { value: "blocked", label: staffCopy.supporters.subscriptions.blocked },
      ],
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
  ];
}

/** Search and filter the supporters list. The erased notice goes with any change. */
export default function SupporterFilters({
  search,
  events,
  near,
}: {
  search: SupportersSearch;
  events: EventChoice[];
  near?: SupportersPage["near"];
}) {
  return (
    <FilterBar
      path="/staff/supporters"
      values={{ ...search, erased: "" }}
      search={{ name: "q", label: staffCopy.supporters.filters.search }}
      filters={supporterFilters(search, events, near)}
    />
  );
}
