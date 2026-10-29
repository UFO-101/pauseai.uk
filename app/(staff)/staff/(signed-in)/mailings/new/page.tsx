import type { Metadata } from "next";
import { staffCopy } from "@/lib/content/staff-interface";
import { newMailingData } from "@/lib/server/mailing-pages";
import { requireStaff } from "@/lib/server/staff-auth";
import type { Params } from "@/lib/staff-search";
import Breadcrumb from "../../../_components/Breadcrumb";
import { FilterPills } from "../../../_components/MailingParts";
import MailingWriter from "../../../_components/MailingWriter";
import {
  attachToMailing,
  deleteMailingDraft,
  detachFromMailing,
  saveMailing,
  scheduleMailingNow,
  sendMailingTest,
  startMailing,
} from "../../../mailing-actions";

export const metadata: Metadata = { title: staffCopy.mailingPages.newTitle };

/** A new mailing to the politicians the list's filters, in the URL, find; saved once something's written. */
export default async function NewMailingPage({ searchParams }: { searchParams: Promise<Params> }) {
  const { email } = await requireStaff();
  const data = await newMailingData(await searchParams, email);
  return (
    <>
      <Breadcrumb href="/staff/mailings">{staffCopy.nav.mailings}</Breadcrumb>
      <MailingWriter
        data={data}
        draft={null}
        who={<FilterPills data={data} />}
        actions={{
          start: startMailing,
          save: saveMailing,
          attach: attachToMailing,
          detach: detachFromMailing,
          sendTest: sendMailingTest,
          schedule: scheduleMailingNow,
          deleteDraft: deleteMailingDraft,
        }}
      />
    </>
  );
}
