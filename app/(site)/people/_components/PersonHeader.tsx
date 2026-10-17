import Link from "next/link";
import type { Person } from "@/lib/content/people";
import PageHero from "@/components/ui/PageHero";
import Avatar from "@/components/people/Avatar";
import styles from "./PersonHeader.module.css";

// A person's photo (or initials) and name, with a link back to everyone.
export default function PersonHeader({ person }: { person: Person }) {
  return (
    <PageHero
      title={person.name || "Anonymous submission"}
      before={
        <Link className={styles.back} href="/people">
          ← Back to all people
        </Link>
      }
      figure={<Avatar person={person} large />}
    />
  );
}
