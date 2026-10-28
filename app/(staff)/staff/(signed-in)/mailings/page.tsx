import type { Metadata } from "next";
import { staffCopy } from "@/lib/content/staff-interface";
import { listMailings } from "@/lib/server/mailings";
import { requireStaff } from "@/lib/server/staff-auth";
import MailingsTable from "../../_components/MailingsTable";

export const metadata: Metadata = { title: staffCopy.mailings.title };

export default async function MailingsPage() {
  await requireStaff();
  const mailings = await listMailings();
  return (
    <>
      <h1>{staffCopy.mailings.title}</h1>
      <p>{staffCopy.mailings.intro}</p>
      <MailingsTable mailings={mailings} />
    </>
  );
}
