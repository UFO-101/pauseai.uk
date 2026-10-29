import type { Metadata } from "next";
import { staffCopy } from "@/lib/content/staff-interface";
import { mailingsOverview } from "@/lib/server/mailings";
import { requireStaff } from "@/lib/server/staff-auth";
import MailingsOverview from "../../_components/MailingsOverview";
import { deleteMailingDraft, stopMailingNow } from "../../mailing-actions";

export const metadata: Metadata = { title: staffCopy.mailings.title };

export default async function MailingsPage() {
  await requireStaff();
  const overview = await mailingsOverview();
  return (
    <>
      <h1>{staffCopy.mailings.title}</h1>
      <MailingsOverview {...overview} deleteDraft={deleteMailingDraft} stop={stopMailingNow} />
    </>
  );
}
