import type { Metadata } from "next";
import { staffCopy } from "@/lib/content/staff-interface";
import { asksWithCounts } from "@/lib/server/asks";
import { requireStaff } from "@/lib/server/staff-auth";
import AsksTable from "../_components/AsksTable";
import StaffNav from "../_components/StaffNav";
import StaffPage from "../_components/ui/StaffPage";

export const metadata: Metadata = { title: staffCopy.asks.title };

export default async function AsksPage() {
  const { email, permissions, sessions } = await requireStaff();
  const asks = await asksWithCounts();
  return (
    <StaffPage nav={<StaffNav email={email} permissions={permissions} sessions={sessions} current="asks" />}>
      <h1>{staffCopy.asks.title}</h1>
      <p>{staffCopy.asks.intro}</p>
      <AsksTable asks={asks} />
    </StaffPage>
  );
}
