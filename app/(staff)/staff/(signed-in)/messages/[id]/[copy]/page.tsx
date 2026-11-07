import type { Metadata } from "next";
import { staffCopy } from "@/lib/content/staff-interface";
import { found } from "@/lib/found";
import { messageCopy } from "@/lib/server/message-pages";
import { requireStaff } from "@/lib/server/staff-auth";
import { mailingId } from "@/lib/staff-search";
import Breadcrumb from "../../../../_components/Breadcrumb";
import MessageCopyView from "../../../../_components/MessageCopyView";
import { replyToMessageNow } from "../../../../message-actions";

type Params = { params: Promise<{ id: string; copy: string }> };

/** The copy in the URL, or a 404. */
async function copyOf(params: Params["params"]) {
  const { id, copy } = await params;
  return found(await messageCopy(found(mailingId(id)), found(mailingId(copy))));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  await requireStaff("supporters");
  return { title: (await copyOf(params)).title };
}

/** Message and reply: one supporter's copy of a message, and every reply. */
export default async function MessageCopyPage({ params }: Params) {
  await requireStaff("supporters");
  const one = await copyOf(params);
  return (
    <>
      <Breadcrumb href={`/staff/messages/${one.messageId}`}>{staffCopy.nav.messages}</Breadcrumb>
      <MessageCopyView one={one} reply={replyToMessageNow} />
    </>
  );
}
