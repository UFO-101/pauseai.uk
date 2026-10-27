import type { Metadata } from "next";
import { staffCopy } from "@/lib/content/staff-interface";
import { found } from "@/lib/found";
import { getMailing } from "@/lib/server/mailings";
import { requireStaff } from "@/lib/server/staff-auth";
import { mailingId } from "@/lib/staff-search";
import Breadcrumb from "../../_components/Breadcrumb";
import MailingDetails from "../../_components/MailingDetails";
import StaffNav from "../../_components/StaffNav";
import StaffPage from "../../_components/ui/StaffPage";

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  await requireStaff();
  return { title: found(await getMailing(found(mailingId((await params).id)))).title };
}

export default async function MailingPage({ params }: Params) {
  const { email, permissions, sessions } = await requireStaff();
  const mailing = found(await getMailing(found(mailingId((await params).id))));
  return (
    <StaffPage nav={<StaffNav email={email} permissions={permissions} sessions={sessions} current="mailings" />}>
      <Breadcrumb href="/staff/mailings">{staffCopy.nav.mailings}</Breadcrumb>
      <MailingDetails mailing={mailing} />
    </StaffPage>
  );
}
