import type { Metadata } from "next";
import { staffCopy } from "@/lib/content/staff-interface";
import { listSessions, requireStaff } from "@/lib/server/staff-auth";
import StaffSessions from "../../_components/StaffSessions";

export const metadata: Metadata = { title: staffCopy.sessions.title };

/** Your own sessions, from the link under Log out, and the way to end them all. */
export default async function SessionsPage() {
  const { email, token } = await requireStaff();
  return (
    <>
      <h1>{staffCopy.sessions.title}</h1>
      <p>{staffCopy.sessions.intro}</p>
      <StaffSessions sessions={await listSessions(email, token)} />
    </>
  );
}
