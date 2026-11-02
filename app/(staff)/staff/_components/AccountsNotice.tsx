"use client";

import { useState } from "react";
import { staffCopy } from "@/lib/content/staff-interface";
import Alert from "./Alert";
import Notice from "./ui/Notice";

/**
 * After a change on the accounts page that was refused: why, as an error.
 * Just after a removal: what it leaves them, in a Notice, till its ×
 * closes it. Nothing otherwise.
 */
export default function AccountsNotice({ notice }: { notice: string }) {
  const [open, setOpen] = useState(true);
  if (notice === "last-admin") return <Alert>{staffCopy.accounts.lastAdmin}</Alert>;
  if (notice === "not-pauseai") return <Alert>{staffCopy.accounts.notPauseai}</Alert>;
  return (
    <span role="status">
      {notice === "removed" && open && (
        <Notice close={staffCopy.accounts.closeRemoved} onClose={() => setOpen(false)}>
          {staffCopy.accounts.removeNote}
        </Notice>
      )}
    </span>
  );
}
