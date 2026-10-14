import type { Metadata } from "next";
import NoAnalytics from "@/components/layout/NoAnalytics";
import { staffCopy } from "@/lib/content/staff-interface";

// The staff interface (/staff): no site header, no analytics, kept out of
// search. Under the root layout, so the footer and consent banner still show
// (plans/email-your-mp-v2.md). Every page here calls requireStaff().
export const metadata: Metadata = {
  title: staffCopy.metaTitle,
  robots: { index: false, follow: false },
};

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <NoAnalytics />
      {children}
    </>
  );
}
