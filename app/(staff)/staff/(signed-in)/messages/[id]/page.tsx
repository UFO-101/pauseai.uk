import type { Metadata } from "next";
import { staffCopy } from "@/lib/content/staff-interface";
import { found } from "@/lib/found";
import { messagePageData, messageTitle } from "@/lib/server/message-pages";
import { requireStaff } from "@/lib/server/staff-auth";
import { mailingId, type ParamValue } from "@/lib/staff-search";
import Breadcrumb from "../../../_components/Breadcrumb";
import MessageFor from "../../../_components/MessageFor";
import {
  attachToMessage,
  deleteMessageDraft,
  detachFromMessage,
  rescheduleMessageNow,
  saveMessage,
  scheduleMessageNow,
  sendMessageTestNow,
  stopMessageNow,
} from "../../../message-actions";

type Params = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: ParamValue; tab?: ParamValue }>;
};

export async function generateMetadata({ params }: Pick<Params, "params">): Promise<Metadata> {
  await requireStaff("supporters");
  return { title: found(await messageTitle(found(mailingId((await params).id)))) };
}

/** A message to supporters: a draft, to write; or one scheduled or sent. */
export default async function MessagePage({ params, searchParams }: Params) {
  const { email } = await requireStaff("supporters");
  const data = found(await messagePageData(found(mailingId((await params).id)), await searchParams, email));
  return (
    <>
      <Breadcrumb href="/staff/messages">{staffCopy.nav.messages}</Breadcrumb>
      <MessageFor
        data={data}
        actions={{
          save: saveMessage,
          attach: attachToMessage,
          detach: detachFromMessage,
          sendTest: sendMessageTestNow,
          schedule: scheduleMessageNow,
          deleteDraft: deleteMessageDraft,
          stop: stopMessageNow,
          reschedule: rescheduleMessageNow,
        }}
      />
    </>
  );
}
