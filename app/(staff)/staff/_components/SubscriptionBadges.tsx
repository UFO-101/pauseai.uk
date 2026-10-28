import Tag from "@/components/ui/Tag";
import { staffCopy } from "@/lib/content/staff-interface";
import { CHANNELS, topicsOf, type Channel, type ContactPermission, type Topic } from "@/lib/contact-permissions";

/** How much a send says we'd contact them, most first. */
const RANK = { yes: 0, unsure: 1, no: 2 } as const;

type Gets = { channel: Channel; topic: Topic; sure: boolean };

/**
 * What a supporter gets: each topic we'd email them about at any of their
 * addresses, then each we'd contact them about at any of their numbers,
 * sure or not; or "blocked" when every address is and no number gets
 * anything. An address that's blocked gets nothing.
 */
function subscriptions(permissions: ContactPermission[]): "blocked" | Gets[] {
  const blocked = new Set(permissions.filter((p) => p.reason === "blocked").map((p) => p.address));
  const open = permissions.filter((p) => !(p.channel === "email" && blocked.has(p.address)));
  const gets = CHANNELS.flatMap((channel) =>
    topicsOf(channel).flatMap((topic) => {
      const best = open
        .filter((p) => p.channel === channel && p.topic === topic)
        .map((p) => p.send)
        .sort((a, b) => RANK[a] - RANK[b])[0];
      return best === "yes" || best === "unsure" ? [{ channel, topic, sure: best === "yes" }] : [];
    }),
  );
  const emails = open.filter((p) => p.channel === "email");
  return blocked.size > 0 && emails.length === 0 && gets.length === 0 ? "blocked" : gets;
}

/** A topic's name in the list, by its channel. */
function name({ channel, topic, sure }: Gets): string {
  const copy = staffCopy.supporters.subscriptions;
  const named = channel === "email" ? copy.topics[topic] : copy.phoneTopics[topic];
  return sure ? named : copy.unsure(named);
}

/** What a supporter gets, in words, as a download has it. */
export function subscriptionWords(permissions: ContactPermission[]): string {
  const gets = subscriptions(permissions);
  return gets === "blocked" ? staffCopy.supporters.subscriptions.blocked : gets.map(name).join("; ");
}

/**
 * What a supporter gets, as lozenges: a topic we'd contact them about,
 * green, or amber when we can't be sure; or, when every address is
 * blocked and no number gets anything, one red lozenge saying so.
 */
export default function SubscriptionBadges({ permissions }: { permissions: ContactPermission[] }) {
  const gets = subscriptions(permissions);
  if (gets === "blocked") return <Tag tone="red">{staffCopy.supporters.subscriptions.blocked}</Tag>;
  return gets.map((one) => (
    <Tag key={`${one.channel}-${one.topic}`} tone={one.sure ? "green" : "amber"}>
      {name(one)}
    </Tag>
  ));
}
