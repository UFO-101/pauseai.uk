import { Muted } from "@/components/ui/Text";
import { staffCopy } from "@/lib/content/staff-interface";
import type { AllLettersFound, AnyLetter } from "@/lib/server/all-letters";
import { WINDOW_OPTIONS } from "@/lib/staff-dashboard";
import { ALL_LETTERS_PAGE_SIZE, filtersPath, pageParam, type AllLettersSearch } from "@/lib/staff-search";
import { staffTime } from "@/lib/staff-time";
import CampaignName from "./CampaignName";
import FilterBar, { type Filter } from "./ui/FilterBar";
import ListFrame, { type ListColumn } from "./ui/ListFrame";
import StaffLink from "./ui/StaffLink";

const PATH = "/staff/letters/all";
const copy = staffCopy.allLetters;
const words = staffCopy.letters;

/** Who a letter is from, whether it got a reply, and when it was sent. */
const FILTERS: Filter[] = [
  {
    name: "from",
    label: copy.from,
    options: Object.entries(copy.fromKinds).map(([value, label]) => ({ value, label })),
  },
  { name: "sent", label: copy.sent, options: WINDOW_OPTIONS },
  {
    name: "replied",
    label: copy.replied,
    options: [
      { value: "yes", label: copy.repliedChoices.yes },
      { value: "no", label: copy.repliedChoices.no },
      ...WINDOW_OPTIONS,
    ],
  },
];

/** A letter's own page: under its mailing, for one of PauseAI's. */
const letterHref = (letter: AnyLetter) =>
  letter.kind === "pauseai"
    ? `/staff/mailings/${letter.mailingId}/letters/${letter.id}`
    : `/staff/letters/${letter.id}`;

/** When something happened, or a dash for what hasn't. */
const when = (at: string | null) => (at ? staffTime(at) : <Muted>–</Muted>);

/**
 * The columns, as every list's go (docs/style-guide.md, "Lists"): its status,
 * then "Letter →", as a letter has no name; who it's from, a supporter
 * or PauseAI; who to; what it's about, a campaign or a mailing; then when it was
 * sent and first got a written reply.
 */
const COLUMNS: ListColumn<AnyLetter>[] = [
  {
    key: "status",
    label: words.columns.status,
    short: true,
    cell: (letter) => (
      <>
        {words.status[letter.status] ?? letter.status} ·{" "}
        <StaffLink href={letterHref(letter)}>{staffCopy.mailingPages.theLetter}</StaffLink>
      </>
    ),
  },
  {
    key: "from",
    label: words.columns.from,
    cell: (letter) => {
      if (letter.kind === "pauseai") return words.fromPauseai;
      return letter.supporterId === null ? (
        letter.senderName
      ) : (
        <StaffLink href={`/staff/supporters/${letter.supporterId}`}>{letter.senderName}</StaffLink>
      );
    },
  },
  {
    key: "to",
    label: words.columns.to,
    cell: (letter) => <StaffLink href={`/staff/politicians/${letter.politicianId}`}>{letter.mpName}</StaffLink>,
  },
  {
    key: "about",
    label: copy.about,
    cell: (letter) =>
      letter.kind === "pauseai" ? (
        <StaffLink href={`/staff/mailings/${letter.mailingId}`}>{letter.mailingTitle}</StaffLink>
      ) : (
        <CampaignName slug={letter.campaign} title={letter.campaignTitle} />
      ),
  },
  { key: "sent", label: words.columns.sent, short: true, cell: (letter) => when(letter.sentAt) },
  { key: "replied", label: words.columns.replied, short: true, cell: (letter) => when(letter.repliedAt) },
];

/** Every letter to a politician, filtered, under the page's title: what the dashboard's letters tiles open. */
export default function AllLetters({ found, search }: { found: AllLettersFound; search: AllLettersSearch }) {
  const { page, ...values } = search;
  return (
    <>
      <h1>{copy.title}</h1>
      <FilterBar path={PATH} values={values} search={{ name: "q", label: copy.search }} filters={FILTERS} />
      <ListFrame
        count={words.total(found.total)}
        total={found.total}
        page={Number(page) || 1}
        pages={found.pages}
        pageSize={ALL_LETTERS_PAGE_SIZE}
        href={(n) => filtersPath(PATH, values, pageParam(n))}
        columns={COLUMNS}
        rows={found.letters}
        rowKey={(letter) => letter.id}
        empty={<Muted>{copy.noneFound}</Muted>}
      />
    </>
  );
}
