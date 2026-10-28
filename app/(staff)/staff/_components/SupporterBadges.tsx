import Tag from "@/components/ui/Tag";
import { staffCopy } from "@/lib/content/staff-interface";
import type { SupporterSummary } from "@/lib/supporters";

/** What a supporter is to us, in words, as a download has them. */
export function supporterBadgeWords(supporter: SupporterSummary): string {
  const badges = staffCopy.supporters.badges;
  return [
    supporter.member && badges.member,
    supporter.lumaContact && badges.lumaContact,
    supporter.events > 0 && badges.registered,
    supporter.letters > 0 && badges.letter,
    supporter.sources.includes("march-2026-11") && badges.march,
  ]
    .filter(Boolean)
    .join("; ");
}

/** What a supporter is to us, as lozenges: a member, a contact of the Luma calendar, registered for events, wrote to their MP, signed up for the march. */
export default function SupporterBadges({ supporter }: { supporter: SupporterSummary }) {
  const badges = staffCopy.supporters.badges;
  return (
    <>
      {supporter.member && <Tag>{badges.member}</Tag>}
      {supporter.lumaContact && <Tag tone="blue">{badges.lumaContact}</Tag>}
      {supporter.events > 0 && <Tag tone="green">{badges.registered}</Tag>}
      {supporter.letters > 0 && <Tag tone="amber">{badges.letter}</Tag>}
      {supporter.sources.includes("march-2026-11") && <Tag>{badges.march}</Tag>}
    </>
  );
}
