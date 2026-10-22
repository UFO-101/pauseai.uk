import Tag from "@/components/ui/Tag";
import { staffCopy } from "@/lib/content/staff-interface";
import type { SupporterSummary } from "@/lib/supporters";

/** What a supporter is to us, as lozenges: a member, and whether to volunteer or lead; follows the calendar, registered for events, wrote to their MP. */
export default function SupporterBadges({ supporter }: { supporter: SupporterSummary }) {
  const badges = staffCopy.supporters.badges;
  const intent = supporter.member && badges.intents[supporter.intent ?? ""];
  return (
    <>
      {supporter.member && <Tag>{badges.member}</Tag>}
      {intent && <Tag>{intent}</Tag>}
      {supporter.lumaContact && <Tag tone="blue">{badges.lumaContact}</Tag>}
      {supporter.events > 0 && <Tag tone="green">{badges.registered}</Tag>}
      {supporter.letters > 0 && <Tag tone="amber">{badges.letter}</Tag>}
    </>
  );
}
