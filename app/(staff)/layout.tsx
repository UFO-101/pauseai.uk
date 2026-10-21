import type { Metadata } from "next";
import NoAnalytics from "@/components/layout/NoAnalytics";
import { staffCopy } from "@/lib/content/staff-interface";

// The staff interface (/staff): no site header or footer, no analytics,
// kept out of search. Under the root layout, so the consent banner still
// shows.
// Every page here calls requireStaff().
export const metadata: Metadata = {
  title: { default: staffCopy.metaTitle, template: `%s - ${staffCopy.metaTitle}` },
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
