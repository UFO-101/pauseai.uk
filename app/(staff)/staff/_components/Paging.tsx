import Actions from "@/components/ui/Actions";
import { ButtonLink } from "@/components/ui/Button";
import { staffCopy } from "@/lib/content/staff-interface";
import styles from "./Paging.module.css";

/** Under a list of more than one page: the way to the pages before and after this one. Nothing for one page. */
export default function Paging({ page, pages, href }: { page: number; pages: number; href: (page: number) => string }) {
  if (pages <= 1) return null;
  return (
    <div className={styles.paging}>
      <Actions>
        {page > 1 && (
          <ButtonLink variant="ghost" size="small" href={href(page - 1)}>
            {staffCopy.paging.previous}
          </ButtonLink>
        )}
        {page < pages && (
          <ButtonLink variant="ghost" size="small" href={href(page + 1)}>
            {staffCopy.paging.next}
          </ButtonLink>
        )}
      </Actions>
    </div>
  );
}
