import Tag from "@/components/ui/Tag";
import { staffCopy } from "@/lib/content/staff-interface";

/** After a politician's name: a space and a lozenge if they're one of ours for testing, or nothing. */
export default function TestTag({ isTest }: { isTest: boolean }) {
  return (
    isTest && (
      <>
        {" "}
        <Tag>{staffCopy.politicians.flags.test}</Tag>
      </>
    )
  );
}
