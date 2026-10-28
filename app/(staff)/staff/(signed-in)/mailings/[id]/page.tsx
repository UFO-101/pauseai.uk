import type { Metadata } from "next";
import { staffCopy } from "@/lib/content/staff-interface";
import { found } from "@/lib/found";
import { getMailing, mailingTitle } from "@/lib/server/mailings";
import { requireStaff } from "@/lib/server/staff-auth";
import { firstOf, mailingId, pageNumber, type ParamValue } from "@/lib/staff-search";
import Breadcrumb from "../../../_components/Breadcrumb";
import MailingDetails from "../../../_components/MailingDetails";

type Params = { params: Promise<{ id: string }>; searchParams: Promise<{ page?: ParamValue }> };

export async function generateMetadata({ params }: Pick<Params, "params">): Promise<Metadata> {
  await requireStaff();
  return { title: found(await mailingTitle(found(mailingId((await params).id)))) };
}

/** A mailing, with a page of its recipients. */
export default async function MailingPage({ params, searchParams }: Params) {
  await requireStaff();
  const page = pageNumber(firstOf((await searchParams).page));
  const mailing = found(await getMailing(found(mailingId((await params).id)), page));
  return (
    <>
      <Breadcrumb href="/staff/mailings">{staffCopy.nav.mailings}</Breadcrumb>
      <MailingDetails mailing={mailing} />
    </>
  );
}
