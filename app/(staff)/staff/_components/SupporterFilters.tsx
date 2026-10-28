import { staffCopy } from "@/lib/content/staff-interface";
import type { SupportersSearch } from "@/lib/staff-search";
import { SENDS, stateValue, waysKey, type Channel, type Topic } from "@/lib/contact-permissions";
import { campaigns } from "@/lib/content/email-your-mp";
import type { EventChoice, SupportersPage } from "@/lib/server/supporters";
import { staffDate } from "@/lib/staff-time";
import { NEAR_MILES, SUPPORTER_BADGES } from "@/lib/supporters";
import ChannelIcon from "./ChannelIcon";
import FilterBar, { type Filter } from "./ui/FilterBar";

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

/** The words in the Near chip: where it found, or that it couldn't. */
function nearWords(text: string, near: SupportersPage["near"]): string {
  const copy = staffCopy.supporters.filters;
  if (near === "failed") return copy.failed(text);
  return near ? near.place : copy.notFound(text);
}

/**
 * The supporters list's filters, each named after the column it filters
 * on, in the columns' order: their nation and how near somewhere they
 * are; their activities and subscriptions; the events they registered for,
 * from `events`; and whether they wrote in a campaign. A contact filter's
 * choices are each topic, then blocked, a topic chosen as those we can
 * contact about it and another answer in its chip's second half; one by
 * email or phone shows that column.
 * Activities, subscriptions, nations and events can each be chosen more
 * than once.
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
      name: "contact",
      label: columns.subscriptions,
      repeat: true,
      // Each topic under its channel's heading, chosen as those we can contact about it; then in its chip's second
      // half, another answer.
      options: [
        ...SUBSCRIPTION_ORDER.map(([channel, topic]) => {
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
        // Blocked, last of email's.
        {
          value: stateValue({ channel: "email", reason: "blocked" }),
          label: staffCopy.supporters.subscriptions.blocked,
          group: { label: copy.channels.email, icon: <ChannelIcon channel="email" /> },
        },
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
