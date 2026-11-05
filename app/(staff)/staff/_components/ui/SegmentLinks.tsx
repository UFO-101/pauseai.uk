import controls from "@/components/ui/Controls.module.css";
import StaffLink from "./StaffLink";
import styles from "./SegmentLinks.module.css";

/** A link in the row: its words, where it leads, whether it's the one chosen, and `quiet` for a choice of nothing. */
export type SegmentLink = {
  key: string;
  words: string;
  href: string;
  current?: boolean;
  quiet?: boolean;
  title?: string;
};

/** The look of Segmented, a row of pills with one chosen, as links that choose what a list under them shows. */
export default function SegmentLinks({ label, links }: { label: string; links: SegmentLink[] }) {
  return (
    <nav aria-label={label} className={`${controls.segmented} ${styles.links}`}>
      {links.map((link) => (
        <StaffLink
          key={link.key}
          href={link.href}
          aria-current={link.current ? "true" : undefined}
          title={link.title}
          className={link.quiet ? `${controls.segment} ${controls.quiet}` : controls.segment}
        >
          {link.words}
        </StaffLink>
      ))}
    </nav>
  );
}
