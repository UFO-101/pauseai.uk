import type { Metadata } from "next";
import { buttonClass } from "@/components/ui/Button";
import { staffCopy } from "@/lib/content/staff-interface";
import { mailingsPage } from "@/lib/server/mailings";
import { requireStaff } from "@/lib/server/staff-auth";
import { NEW_MAILING } from "@/lib/staff-search";
import MailingsOverview from "../../_components/MailingsOverview";
import DownloadMenu from "../../_components/ui/DownloadMenu";
import PageTitle from "../../_components/ui/PageTitle";
import StaffLink from "../../_components/ui/StaffLink";

export const metadata: Metadata = { title: staffCopy.mailings.title };

export default async function MailingsPage() {
  await requireStaff();
  return (
    <>
      <PageTitle
        action={
          <>
            <DownloadMenu download={(format) => `/staff/mailings/download?format=${format}`} />
            <StaffLink
              className={buttonClass({ variant: "primary", fit: true })}
              href={`/staff/politicians?mailing=${NEW_MAILING}`}
            >
              {staffCopy.mailingPages.newTitle}
            </StaffLink>
          </>
        }
      >
        {staffCopy.mailings.title}
      </PageTitle>
      <MailingsOverview {...await mailingsPage()} />
    </>
  );
}
