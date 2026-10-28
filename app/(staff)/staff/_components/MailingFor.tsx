import type { MailingPageData } from "@/lib/server/mailing-pages";
import MailingDetails from "./MailingDetails";
import { FilterPills } from "./MailingParts";
import MailingView from "./MailingView";
import MailingWriter, { type MailingWriterActions } from "./MailingWriter";

type FormAction = (form: FormData) => void | Promise<void>;

/**
 * A mailing's page, as it stands: one imported from Airtable, its
 * recipients; a draft, to go on writing; one scheduled or sent, where it's
 * got to.
 */
export default function MailingFor({
  data,
  actions,
}: {
  data: MailingPageData;
  actions: MailingWriterActions & { stop: FormAction; reschedule: FormAction };
}) {
  if (data.kind === "imported") return <MailingDetails mailing={data.mailing} />;
  const who = <FilterPills data={data} />;
  if (data.kind === "draft") return <MailingWriter data={data} draft={data.draft} who={who} actions={actions} />;
  return (
    <MailingView
      mailing={data.mailing}
      written={data.written}
      who={who}
      asks={data.asks}
      stop={actions.stop}
      reschedule={actions.reschedule}
    />
  );
}
