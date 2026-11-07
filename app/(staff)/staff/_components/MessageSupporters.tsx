import type { ReactNode } from "react";
import { buttonClass } from "@/components/ui/Button";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { staffCopy } from "@/lib/content/staff-interface";
import type { ChoosingMessage } from "@/lib/server/message-pages";
import { filtersPath, storedFilter, valuesOf, type SupportersSearch } from "@/lib/staff-search";
import { messageTerms } from "@/lib/supporter-messages";
import { supporterFiltersOf } from "./SupportersTable";
import list from "./PoliticiansList.module.css";
import StaffLink from "./ui/StaffLink";
import Strip from "./ui/Strip";

const copy = staffCopy.messagePages;
const PATH = "/staff/supporters";

type FormAction = (form: FormData) => void | Promise<void>;

/** The filters that choose who, as a form's hidden fields. */
function WhoFields({ search }: { search: SupportersSearch }) {
  return Object.entries(storedFilter("supporters", supporterFiltersOf(search)).params).flatMap(([name, value]) =>
    valuesOf(value).map((one) => <input key={`${name}=${one}`} type="hidden" name={name} value={one} />),
  );
}

/**
 * Message N supporters, in the list's count row, counting everyone the
 * filters find. With a Contact filter answered yes, it makes a draft to them
 * and opens the writer. Without one it's dashed, and leads back to the list
 * saying which filter to add.
 */
export function MessageSupporters({
  search,
  total,
  action,
  choosing,
}: {
  search: SupportersSearch;
  total: number;
  action: FormAction;
  /** The draft the list is choosing for, whose way on is the bar at the foot. */
  choosing?: ChoosingMessage;
}) {
  if (choosing) return null;
  if (!messageTerms(search.contact)) {
    return (
      <StaffLink
        className={buttonClass({ variant: "ghost", size: "small", fit: true, dashed: true })}
        href={filtersPath(PATH, supporterFiltersOf(search), { why: "contact" })}
      >
        {copy.messageButton(total)}
      </StaffLink>
    );
  }
  return (
    <form action={action}>
      <WhoFields search={search} />
      <SubmitButton variant="primary" size="small" fit>
        {copy.messageButton(total)}
      </SubmitButton>
    </form>
  );
}

/** What pressing the dashed button says. */
export function NeedsContactFilter({ search }: { search: SupportersSearch }) {
  return search.why === "contact" && !messageTerms(search.contact) ? (
    <Strip tone="amber" announce>
      {copy.needsContact}
    </Strip>
  ) : null;
}

/**
 * The page, and while the list is choosing who a draft goes to, over it the
 * dark strip naming the draft, with Cancel, and at the foot the dark bar
 * with how many the filters find and the orange button back to the draft,
 * which keeps them. There are no ticks: the filters say who. Greyed with a
 * reason once they no longer say the channel and topic it was made with.
 */
export function ChoosingMessageFrame({
  choosing,
  search,
  total,
  keep,
  children,
}: {
  choosing?: ChoosingMessage;
  search: SupportersSearch;
  total: number;
  /** Keeps the form's filter for the draft (message-actions.ts). */
  keep: (id: number, form: FormData) => void | Promise<void>;
  children: ReactNode;
}) {
  if (!choosing) return children;
  const terms = messageTerms(search.contact);
  const same = terms?.channel === choosing.channel && terms.topic === choosing.topic;
  const draft = `/staff/messages/${choosing.id}`;
  return (
    <div>
      <div className={list.held}>
        <Strip
          tone="dark"
          action={
            <StaffLink className={list.cancel} href={draft}>
              {copy.choosingCancel}
            </StaffLink>
          }
        >
          <span>{copy.choosing(choosing.title)}</span>
          <span className={list.how}>{copy.choosingHow}</span>
        </Strip>
      </div>
      {children}
      <div className={list.bar} role="region" aria-label={copy.choosingLabel}>
        <div className={list.barStart}>
          <span className={list.count}>{same ? copy.choosingCount(total) : copy.keepContact}</span>
        </div>
        {same ? (
          <form action={keep.bind(null, choosing.id)}>
            <WhoFields search={search} />
            <SubmitButton variant="primary" fit>
              {copy.useThese(total)}
            </SubmitButton>
          </form>
        ) : (
          <StaffLink className={buttonClass({ variant: "primary", fit: true })} href={draft}>
            {copy.backToDraft}
          </StaffLink>
        )}
      </div>
    </div>
  );
}
