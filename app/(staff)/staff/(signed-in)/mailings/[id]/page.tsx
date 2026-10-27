import type { Metadata } from "next";
import { staffCopy } from "@/lib/content/staff-interface";
import { found } from "@/lib/found";
import { getMailing } from "@/lib/server/mailings";
import { requireStaff } from "@/lib/server/staff-auth";
import { mailingId } from "@/lib/staff-search";
import Breadcrumb from "../../../_components/Breadcrumb";
import MailingDetails from "../../../_components/MailingDetails";

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  await requireStaff();
  return { title: found(await getMailing(found(mailingId((await params).id)))).title };
}

export default async function MailingPage({ params }: Params) {
  await requireStaff();
  const mailing = found(await getMailing(found(mailingId((await params).id))));
  return (
    <>
      <Breadcrumb href="/staff/mailings">{staffCopy.nav.mailings}</Breadcrumb>
      <MailingDetails mailing={mailing} />
    </>
  );
}
