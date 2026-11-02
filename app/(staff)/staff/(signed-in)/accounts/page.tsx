import type { Metadata } from "next";
import { staffCopy } from "@/lib/content/staff-interface";
import { requireStaff } from "@/lib/server/staff-auth";
import { listStaffAccounts } from "@/lib/server/staff-accounts";
import { accountsSearch } from "@/lib/staff-search";
import { endStaffSessionsNow, removeStaffAccountNow, saveStaffAccountNow } from "../../actions";
import AccountsNotice from "../../_components/AccountsNotice";
import StaffAccountsTable, { AddStaff } from "../../_components/StaffAccountsTable";
import PageTitle from "../../_components/ui/PageTitle";

/** Who may use the staff pages, and what each may do, for admins to change. */
export const metadata: Metadata = { title: staffCopy.accounts.title };

export default async function AccountsPage({ searchParams }: { searchParams: Promise<{ notice?: string }> }) {
  const { email } = await requireStaff("admin");
  const { notice } = accountsSearch(await searchParams);
  const accounts = await listStaffAccounts();
  return (
    <>
      <PageTitle action={<AddStaff accounts={accounts} add={saveStaffAccountNow} />}>
        {staffCopy.accounts.title}
      </PageTitle>
      <p>{staffCopy.accounts.intro}</p>
      <AccountsNotice notice={notice} />
      <StaffAccountsTable
        accounts={accounts}
        you={email}
        save={saveStaffAccountNow}
        remove={removeStaffAccountNow}
        endSessions={endStaffSessionsNow}
      />
    </>
  );
}
