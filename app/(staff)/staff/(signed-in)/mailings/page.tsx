import type { Metadata } from "next";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { staffCopy } from "@/lib/content/staff-interface";
import { mailingsPage } from "@/lib/server/mailings";
import { requireStaff } from "@/lib/server/staff-auth";
import { newMailing } from "../../mailing-actions";
import MailingsOverview from "../../_components/MailingsOverview";
import PageTitle from "../../_components/ui/PageTitle";

export const metadata: Metadata = { title: staffCopy.mailings.title };

export default async function MailingsPage() {
  await requireStaff();
  return (
    <>
      <PageTitle
        action={
          // A new mailing is a draft from the start, with no one ticked, and the list then chooses who it's for.
          <form action={newMailing}>
            <SubmitButton variant="primary" fit>
              {staffCopy.mailingPages.newTitle}
            </SubmitButton>
          </form>
        }
      >
        {staffCopy.mailings.title}
      </PageTitle>
      <MailingsOverview {...await mailingsPage()} />
    </>
  );
}
