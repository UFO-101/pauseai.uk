import Tag from "@/components/ui/Tag";
import { staffCopy } from "@/lib/content/staff-interface";
import { EMAIL_TOPICS, type EmailPermission } from "@/lib/email-permissions";

/** How much a send says we'd email them, most first. */
const RANK = { yes: 0, unsure: 1, no: 2 } as const;

/**
 * What a supporter gets, as lozenges: a topic we'd email them about at any
 * of their addresses, green, or amber when we can't be sure. An address
 * that's blocked gets nothing; when every one is, one red lozenge says so.
 */
export default function SubscriptionBadges({ permissions }: { permissions: EmailPermission[] }) {
  const copy = staffCopy.supporters.subscriptions;
  const blocked = new Set(permissions.filter((p) => p.reason === "blocked").map((p) => p.address));
  const open = permissions.filter((p) => !blocked.has(p.address));
  if (blocked.size > 0 && open.length === 0) return <Tag tone="red">{copy.blocked}</Tag>;
  return (
    <>
      {EMAIL_TOPICS.map((topic) => {
        const best = open
          .filter((p) => p.topic === topic)
          .map((p) => p.send)
          .sort((a, b) => RANK[a] - RANK[b])[0];
        if (best === "yes")
          return (
            <Tag key={topic} tone="green">
              {copy.topics[topic]}
            </Tag>
          );
        if (best === "unsure")
          return (
            <Tag key={topic} tone="amber">
              {copy.unsure(copy.topics[topic])}
            </Tag>
          );
        return null;
      })}
    </>
  );
}
