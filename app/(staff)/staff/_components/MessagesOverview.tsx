import { staffCopy } from "@/lib/content/staff-interface";
import type { MailingGroup } from "@/lib/mailing-groups";
import type { MessageSummary } from "@/lib/server/message-pages";
import MailingsOverview, { type OverviewLook } from "./MailingsOverview";
import { MessageChannelName, messageCounts } from "./MessageView";

const copy = staffCopy.messagePages;

const LOOK: OverviewLook<MessageSummary> = {
  base: "/staff/messages",
  counts: messageCounts,
  untitled: copy.untitled,
  none: copy.none,
  lead: (message) => <MessageChannelName channel={message.channel} />,
  scheduledWords: (message) => (message.waiting ? copy.waiting : undefined),
};

/** The list of messages, emails and texts together, as the list of mailings is, each row with its channel. */
export default function MessagesOverview({ groups, now }: { groups: MailingGroup<MessageSummary>[]; now: string }) {
  return <MailingsOverview groups={groups} now={now} look={LOOK} />;
}
