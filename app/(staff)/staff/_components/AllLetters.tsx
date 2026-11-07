import Tag from "@/components/ui/Tag";
import { Muted } from "@/components/ui/Text";
import { staffCopy } from "@/lib/content/staff-interface";
import type { AllLettersFound, AnyLetter, EmailChoice } from "@/lib/server/all-letters";
import { WINDOW_OPTIONS } from "@/lib/staff-dashboard";
import {
  ALL_LETTERS_PAGE_SIZE,
  EMAIL_SENDERS,
  EMAIL_TYPES,
  filtersPath,
  pageParam,
  type AllLettersSearch,
} from "@/lib/staff-search";
import { staffTime } from "@/lib/staff-time";
import CampaignName from "./CampaignName";
import FilterBar, { type Filter } from "./ui/FilterBar";
import ListFrame, { type ListColumn } from "./ui/ListFrame";
import StaffLink from "./ui/StaffLink";
import Withheld from "./ui/Withheld";

const PATH = "/staff/emails";
const copy = staffCopy.allLetters;
const words = staffCopy.letters;

/** The filters, in the columns' order: who it's from and what it's about, for staff without `supporters` not supporters' or a campaign's; who it's to, searched for; when it was sent, and whether it got a reply. */
function emailFilters(supporters: boolean, people: EmailChoice[]): Filter[] {
  return [
    {
      name: "from",
      label: copy.from,
      repeat: true,
      options: EMAIL_SENDERS.filter((kind) => supporters || kind !== "supporter").map((kind) => ({
        value: kind,
        label: copy.fromKinds[kind],
      })),
    },
    {
      name: "to",
      label: words.columns.to,
      repeat: true,
      searchable: true,
      options: people.map((person) => ({
        value: String(person.id),
        label: person.constituency
          ? staffCopy.supporters.filters.mpChoice(person.name, person.constituency)
          : person.name,
      })),
    },
    {
      name: "type",
      label: copy.topic,
      repeat: true,
      options: EMAIL_TYPES.filter((type) => supporters || type !== "campaign").map((type) => ({
        value: type,
        label: copy.types[type],
      })),
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
}

/** When something happened, or a dash for what hasn't. */
const when = (at: string | null) => (at ? staffTime(at) : <Muted>–</Muted>);

/** A row's status and the way to it: a thread's kind, as it has no status; a letter's, under its mailing for one of PauseAI's. */
function Status({ letter }: { letter: AnyLetter }) {
  if (letter.kind === "one-off") {
    return (
      <>
        {copy.oneOff} · <StaffLink href={`/staff/one-off/${letter.id}`}>{copy.theThread}</StaffLink>
      </>
    );
  }
  const href =
    letter.kind === "pauseai"
      ? `/staff/mailings/${letter.mailingId}/letters/${letter.id}`
      : `/staff/letters/${letter.id}`;
  return (
    <>
      {words.status[letter.status] ?? letter.status} ·{" "}
      <StaffLink href={href}>{staffCopy.mailingPages.theLetter}</StaffLink>
    </>
  );
}

/** Who a row is from: PauseAI, the supporter, leading to their page once linked, or who started a thread, PauseAI if it was. */
function From({ letter }: { letter: AnyLetter }) {
  if (letter.kind === "pauseai") return words.fromPauseai;
  if (letter.kind === "one-off") return letter.fromUs ? words.fromPauseai : letter.senderName || letter.senderEmail;
  return letter.supporterId === null ? (
    letter.senderName
  ) : (
    <StaffLink href={`/staff/supporters/${letter.supporterId}`}>{letter.senderName}</StaffLink>
  );
}

/** Who a row is to: a letter's politician, or those on a thread's first message, PauseAI by its name; a dash with none. */
function To({ letter }: { letter: AnyLetter }) {
  if (letter.kind !== "one-off") {
    return letter.people.map((person) => (
      <div key={person.id}>
        <StaffLink href={`/staff/politicians/${person.id}`}>{person.name}</StaffLink>
      </div>
    ));
  }
  if (letter.recipients.length === 0) return <Muted>–</Muted>;
  return letter.recipients.map((person, i) => (
    <div key={i}>
      {person.pauseai ? (
        words.fromPauseai
      ) : person.politicianId === null ? (
        person.name
      ) : (
        <StaffLink href={`/staff/politicians/${person.politicianId}`}>{person.name}</StaffLink>
      )}
    </div>
  ));
}

/** What a row is about, saying which kind: a campaign or a mailing, leading to it, or a thread's subject, in words, as the first column opens it. */
function Topic({ letter }: { letter: AnyLetter }) {
  if (letter.kind === "one-off") {
    if (!letter.subject) return staffCopy.oneOff.noSubject;
    return (
      <>
        {letter.subject} <Tag>{copy.topicKinds.subject}</Tag>
      </>
    );
  }
  if (letter.kind === "pauseai") {
    return (
      <>
        <StaffLink href={`/staff/mailings/${letter.mailingId}`}>{letter.mailingTitle}</StaffLink>{" "}
        <Tag>{copy.topicKinds.mailing}</Tag>
      </>
    );
  }
  return (
    <>
      <CampaignName slug={letter.campaign} title={letter.campaignTitle} /> <Tag>{copy.topicKinds.campaign}</Tag>
    </>
  );
}

/**
 * The columns, as every list's go (docs/style-guide.md, "Lists"): how it
 * stands and the way to it; who it's from; the politicians it's with; its topic;
 * then when it was sent and first got a written reply.
 */
const COLUMNS: ListColumn<AnyLetter>[] = [
  { key: "status", label: words.columns.status, short: true, cell: (letter) => <Status letter={letter} /> },
  { key: "from", label: words.columns.from, cell: (letter) => <From letter={letter} /> },
  { key: "to", label: words.columns.to, cell: (letter) => <To letter={letter} /> },
  { key: "topic", label: copy.topic, cell: (letter) => <Topic letter={letter} /> },
  { key: "sent", label: words.columns.sent, short: true, cell: (letter) => when(letter.sentAt) },
  { key: "replied", label: words.columns.replied, short: true, cell: (letter) => when(letter.repliedAt) },
];

/**
 * Every email with a politician, filtered: what the dashboard's emails tiles
 * open. Without `supporters`, says at the top that those with supporters on
 * them aren't shown. With the one-offs chosen, says under the filters what they are.
 */
export default function AllLetters({
  found,
  people,
  search,
  supporters,
  inbox,
}: {
  found: AllLettersFound;
  /** Those the To filter offers. */
  people: EmailChoice[];
  search: AllLettersSearch;
  supporters: boolean;
  /** Where one-offs are copied to, which the introduction names. */
  inbox: string;
}) {
  const { page, ...values } = search;
  return (
    <>
      <h1>{copy.title}</h1>
      {!supporters && (
        <p>
          <Withheld>{copy.withheld}</Withheld>
        </p>
      )}
      <FilterBar
        path={PATH}
        values={values}
        search={{ name: "q", label: copy.search }}
        filters={emailFilters(supporters, people)}
      />
      {search.type.includes("one-off") && (
        <p>
          <Muted>{copy.intro(inbox)}</Muted>
        </p>
      )}
      <ListFrame
        count={copy.total(found.total)}
        total={found.total}
        page={Number(page) || 1}
        pages={found.pages}
        pageSize={ALL_LETTERS_PAGE_SIZE}
        href={(n) => filtersPath(PATH, values, pageParam(n))}
        columns={COLUMNS}
        rows={found.letters}
        rowKey={(letter) => `${letter.kind}-${letter.id}`}
        empty={<Muted>{copy.noneFound}</Muted>}
      />
    </>
  );
}
