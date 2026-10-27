import Tag from "@/components/ui/Tag";
import { staffCopy } from "@/lib/content/staff-interface";
import { EMAIL_TOPICS, type EmailPermission, type EmailTopic } from "@/lib/email-permissions";

/** How much a send says we'd email them, most first. */
const RANK = { yes: 0, unsure: 1, no: 2 } as const;

/**
 * What a supporter gets: each topic we'd email them about at any of their
 * addresses, sure or not; or "blocked" when every address is. An address
 * that's blocked gets nothing.
 */
function subscriptions(permissions: EmailPermission[]): "blocked" | { topic: EmailTopic; sure: boolean }[] {
  const blocked = new Set(permissions.filter((p) => p.reason === "blocked").map((p) => p.address));
  const open = permissions.filter((p) => !blocked.has(p.address));
  if (blocked.size > 0 && open.length === 0) return "blocked";
  return EMAIL_TOPICS.flatMap((topic) => {
    const best = open
      .filter((p) => p.topic === topic)
      .map((p) => p.send)
      .sort((a, b) => RANK[a] - RANK[b])[0];
    return best === "yes" || best === "unsure" ? [{ topic, sure: best === "yes" }] : [];
  });
}

/** What a supporter gets, in words, as a download has it. */
export function subscriptionWords(permissions: EmailPermission[]): string {
  const copy = staffCopy.supporters.subscriptions;
  const gets = subscriptions(permissions);
  if (gets === "blocked") return copy.blocked;
  return gets.map(({ topic, sure }) => (sure ? copy.topics[topic] : copy.unsure(copy.topics[topic]))).join("; ");
}

/**
 * What a supporter gets, as lozenges: a topic we'd email them about,
 * green, or amber when we can't be sure; or, when every address is
 * blocked, one red lozenge saying so.
 */
export default function SubscriptionBadges({ permissions }: { permissions: EmailPermission[] }) {
  const copy = staffCopy.supporters.subscriptions;
  const gets = subscriptions(permissions);
  if (gets === "blocked") return <Tag tone="red">{copy.blocked}</Tag>;
  return gets.map(({ topic, sure }) => (
    <Tag key={topic} tone={sure ? "green" : "amber"}>
      {sure ? copy.topics[topic] : copy.unsure(copy.topics[topic])}
    </Tag>
  ));
}
