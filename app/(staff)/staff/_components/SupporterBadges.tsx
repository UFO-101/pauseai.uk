import Tag from "@/components/ui/Tag";
import { staffCopy } from "@/lib/content/staff-interface";
import type { SupporterSummary } from "@/lib/supporters";

/** What a supporter is to us, as lozenges: follows the calendar, registered for N events, wrote to their MP. */
export default function SupporterBadges({ supporter }: { supporter: SupporterSummary }) {
  const badges = staffCopy.supporters.badges;
  return (
    <>
      {supporter.lumaContact && <Tag tone="blue">{badges.lumaContact}</Tag>}
      {supporter.events > 0 && <Tag tone="green">{badges.registered(supporter.events)}</Tag>}
      {supporter.letters > 0 && <Tag tone="amber">{badges.letter}</Tag>}
    </>
  );
}
