import { staffCopy } from "@/lib/content/staff-interface";
import type { MessagePageData } from "@/lib/server/message-pages";
import type { SupporterChoices } from "@/lib/server/supporters";
import { supportersSearch, type Params } from "@/lib/staff-search";
import type { MessageChannel } from "@/lib/supporter-messages";
import MessageView from "./MessageView";
import MessageWriter, { type MessageWriterActions } from "./MessageWriter";
import { supporterWords } from "./SupporterFilters";
import parts from "./MailingParts.module.css";

type FormAction = (form: FormData) => void | Promise<void>;

/** Who a message is to, as pills that can't be changed here: its channel first, as that's fixed, then the list's filter's words. */
export function MessageWho({
  channel,
  params,
  choices,
}: {
  channel: MessageChannel;
  params: Params;
  choices: SupporterChoices;
}) {
  const words = [staffCopy.messagePages.channels[channel], ...supporterWords(supportersSearch(params), choices)];
  return (
    <ul className={parts.pills} aria-label={staffCopy.messagePages.facts.who}>
      {words.map((word) => (
        <li key={word}>{word}</li>
      ))}
    </ul>
  );
}

/** A message's page, as it stands: a draft, to go on writing; one scheduled, sending or sent, where it's got to. */
export default function MessageFor({
  data,
  actions,
}: {
  data: MessagePageData;
  actions: MessageWriterActions & { stop: FormAction; reschedule: FormAction };
}) {
  if (data.kind === "draft") {
    const who = <MessageWho channel={data.draft.channel} params={data.filter.params} choices={data.choices} />;
    return <MessageWriter data={data} draft={data.draft} who={who} actions={actions} />;
  }
  const who = <MessageWho channel={data.written.channel} params={data.written.filter.params} choices={data.choices} />;
  return <MessageView data={data} who={who} stop={actions.stop} reschedule={actions.reschedule} />;
}
