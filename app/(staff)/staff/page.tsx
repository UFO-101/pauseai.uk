import { redirect } from "next/navigation";
import { requireStaff } from "@/lib/server/staff-auth";

// The staff interface opens on the politicians list, for now.
export default async function StaffHome() {
  await requireStaff();
  redirect("/staff/politicians");
}
