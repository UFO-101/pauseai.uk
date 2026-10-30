import { useId } from "react";
import { buttonClass } from "@/components/ui/Button";
import { staffCopy } from "@/lib/content/staff-interface";
import type { DownloadFormat } from "@/lib/staff-list";
import Menu from "./Menu";
import styles from "./DownloadMenu.module.css";

const copy = staffCopy.lists;

/**
 * Download, a small button whose menu has a link to each format of every
 * row a list's filters find (docs/style-guide.md, "Lists"): over a list's
 * table in ListFrame, or by the title of a page whose list isn't a table.
 */
export default function DownloadMenu({
  download,
  formats = ["csv", "json"],
}: {
  /** The URL of every row, in a format. */
  download: (format: DownloadFormat) => string;
  /** The formats it offers: a spreadsheet's and JSON, and vCards for a list of people. */
  formats?: DownloadFormat[];
}) {
  const menuId = useId();
  return (
    <Menu
      id={`download-${menuId}`}
      trigger={buttonClass({ variant: "ghost", size: "small", fit: true, className: styles.download })}
      label={
        <>
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="M12 4v12M6 11l6 6 6-6M5 20h14" />
          </svg>
          {copy.download}
        </>
      }
    >
      <ul className={styles.formats}>
        {formats.map((format) => (
          <li key={format}>
            <a href={download(format)} download>
              {copy.formats[format]}
            </a>
          </li>
        ))}
      </ul>
    </Menu>
  );
}
