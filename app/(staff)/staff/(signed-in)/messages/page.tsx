import type { Metadata } from "next";
import { staffCopy } from "@/lib/content/staff-interface";
import { messagesPage } from "@/lib/server/message-pages";
import { requireStaff } from "@/lib/server/staff-auth";
import MessagesOverview from "../../_components/MessagesOverview";

export const metadata: Metadata = { title: staffCopy.messagePages.title };

/** Emails and texts to supporters together. A new one starts from the supporters list. */
export default async function MessagesPage() {
  await requireStaff("supporters");
  return (
    <>
      <h1>{staffCopy.messagePages.title}</h1>
      <MessagesOverview {...await messagesPage()} />
    </>
  );
}
