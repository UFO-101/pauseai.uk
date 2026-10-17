import { staffCopy } from "@/lib/content/staff-interface";
import StaffHeader from "../_components/StaffHeader";
import LoginCard from "../_components/LoginCard";
import LoginForm from "../_components/LoginForm";
import StaffPage from "../_components/ui/StaffPage";

// Open to anyone: it's where staff log in, so it doesn't call requireStaff().
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string; failed?: string; elsewhere?: string }>;
}) {
  return (
    <StaffPage>
      <StaffHeader />
      <LoginCard title={staffCopy.login.title}>
        <LoginForm {...await searchParams} />
      </LoginCard>
    </StaffPage>
  );
}
