import { staffCopy } from "@/lib/content/staff-interface";
import { requireStaff } from "@/lib/server/staff-auth";
import { listStaffAccounts } from "@/lib/server/staff-accounts";
import { accountsSearch } from "@/lib/staff-search";
import { removeStaffAccountNow, saveStaffAccountNow } from "../actions";
import AccountsNotice from "../_components/AccountsNotice";
import StaffAccountsTable from "../_components/StaffAccountsTable";
import StaffNav from "../_components/StaffNav";
import StaffPage from "../_components/ui/StaffPage";

/** Who may use the staff pages, and what each may do, for admins to change. */
export default async function AccountsPage({ searchParams }: { searchParams: Promise<{ notice?: string }> }) {
  const { email, permissions } = await requireStaff("admin");
  const { notice } = accountsSearch(await searchParams);
  return (
    <StaffPage nav={<StaffNav email={email} account permissions={permissions} current="accounts" />}>
      <h1>{staffCopy.accounts.title}</h1>
      <p>{staffCopy.accounts.intro}</p>
      <AccountsNotice notice={notice} />
      <StaffAccountsTable
        accounts={await listStaffAccounts()}
        save={saveStaffAccountNow}
        remove={removeStaffAccountNow}
      />
    </StaffPage>
  );
}
