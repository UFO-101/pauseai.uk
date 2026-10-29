import type { Metadata } from "next";
import { staffCopy } from "@/lib/content/staff-interface";
import { found } from "@/lib/found";
import { mailingPageData } from "@/lib/server/mailing-pages";
import { mailingTitle } from "@/lib/server/mailings";
import { requireStaff } from "@/lib/server/staff-auth";
import { mailingId, type ParamValue } from "@/lib/staff-search";
import Breadcrumb from "../../../_components/Breadcrumb";
import MailingFor from "../../../_components/MailingFor";
import {
  attachToMailing,
  deleteMailingDraft,
  detachFromMailing,
  rescheduleMailingNow,
  saveMailing,
  scheduleMailingNow,
  sendMailingTest,
  startMailing,
  stopMailingNow,
} from "../../../mailing-actions";

type Params = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: ParamValue; tab?: ParamValue }>;
};

export async function generateMetadata({ params }: Pick<Params, "params">): Promise<Metadata> {
  await requireStaff();
  return { title: found(await mailingTitle(found(mailingId((await params).id)))) };
}

/** A mailing: one imported, with a page of its recipients; a draft, to write; or one scheduled or sent. */
export default async function MailingPage({ params, searchParams }: Params) {
  const { email } = await requireStaff();
  const data = found(await mailingPageData(found(mailingId((await params).id)), await searchParams, email));
  return (
    <>
      <Breadcrumb href="/staff/mailings">{staffCopy.nav.mailings}</Breadcrumb>
      <MailingFor
        data={data}
        actions={{
          start: startMailing,
          save: saveMailing,
          attach: attachToMailing,
          detach: detachFromMailing,
          sendTest: sendMailingTest,
          schedule: scheduleMailingNow,
          deleteDraft: deleteMailingDraft,
          stop: stopMailingNow,
          reschedule: rescheduleMailingNow,
        }}
      />
    </>
  );
}
