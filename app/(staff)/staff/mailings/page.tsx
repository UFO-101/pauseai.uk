import type { Metadata } from "next";
import { staffCopy } from "@/lib/content/staff-interface";
import { listMailings } from "@/lib/server/mailings";
import { requireStaff } from "@/lib/server/staff-auth";
import MailingsTable from "../_components/MailingsTable";
import StaffNav from "../_components/StaffNav";
import StaffPage from "../_components/ui/StaffPage";

export const metadata: Metadata = { title: staffCopy.mailings.title };

export default async function MailingsPage() {
  const { email, permissions, sessions } = await requireStaff();
  const mailings = await listMailings();
  return (
    <StaffPage nav={<StaffNav email={email} permissions={permissions} sessions={sessions} current="mailings" />}>
      <h1>{staffCopy.mailings.title}</h1>
      <p>{staffCopy.mailings.intro}</p>
      <MailingsTable mailings={mailings} />
    </StaffPage>
  );
}
