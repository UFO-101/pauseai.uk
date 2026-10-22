import type { Metadata } from "next";
import { staffCopy } from "@/lib/content/staff-interface";
import { devLoginAccounts } from "@/lib/server/dev-login";
import DevLogin from "../_components/DevLogin";
import LoginCard from "../_components/LoginCard";
import LoginForm from "../_components/LoginForm";
import StaffNav from "../_components/StaffNav";
import StaffPage from "../_components/ui/StaffPage";

// Open to anyone: it's where staff log in, so it doesn't call requireStaff().
// In a fixture build, the dev login sits under the card.
export const metadata: Metadata = { title: staffCopy.login.title };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string; failed?: string; elsewhere?: string }>;
}) {
  return (
    <StaffPage>
      <StaffNav />
      <LoginCard title={staffCopy.login.title}>
        <LoginForm {...await searchParams} />
      </LoginCard>
      <DevLogin accounts={await devLoginAccounts()} />
    </StaffPage>
  );
}
