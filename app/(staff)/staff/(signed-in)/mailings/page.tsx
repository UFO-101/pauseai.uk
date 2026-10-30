import type { Metadata } from "next";
import { buttonClass } from "@/components/ui/Button";
import { staffCopy } from "@/lib/content/staff-interface";
import { mailingsOverview } from "@/lib/server/mailings";
import { requireStaff } from "@/lib/server/staff-auth";
import { NEW_MAILING } from "@/lib/staff-search";
import MailingsOverview from "../../_components/MailingsOverview";
import PageTitle from "../../_components/ui/PageTitle";
import { deleteMailingDraft, stopMailingNow } from "../../mailing-actions";
import StaffLink from "../../_components/ui/StaffLink";

export const metadata: Metadata = { title: staffCopy.mailings.title };

export default async function MailingsPage() {
  await requireStaff();
  const overview = await mailingsOverview();
  return (
    <>
      <PageTitle
        action={
          <StaffLink
            className={buttonClass({ variant: "primary", fit: true })}
            href={`/staff/politicians?mailing=${NEW_MAILING}`}
          >
            {staffCopy.mailingPages.newTitle}
          </StaffLink>
        }
      >
        {staffCopy.mailings.title}
      </PageTitle>
      <MailingsOverview {...overview} deleteDraft={deleteMailingDraft} stop={stopMailingNow} />
    </>
  );
}
