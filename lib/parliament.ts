// MPs from Parliament's Members API (https://members-api.parliament.uk/,
// no key needed), in the shape the Email your MP tool stores them.
//
// No imports, and the caller passes in how to fetch: scripts/sync-mps.mts
// runs this file in plain Node, and the server runs it through outsideFetch.

export const MEMBERS_API = "https://members-api.parliament.uk/api";

/** An MP as we store them. */
export type SyncedMp = {
  /** Parliament's member ID. */
  parliamentId: number;
  name: string;
  salutation: string;
  constituency: string;
  party: string;
  email: string | null;
};

type Member = {
  id: number;
  nameDisplayAs: string;
  nameListAs: string;
  nameAddressAs: string | null;
  gender: string | null;
  latestParty?: { name?: string } | null;
  latestHouseMembership: { membershipFrom: string };
};

type Contact = { type?: string; typeId?: number; email?: string | null };

export type GetJson = (url: string) => Promise<unknown>;

/** The Contact type Parliament uses for an MP's Westminster office. */
const PARLIAMENTARY_OFFICE = 1;

/** The API's page size limit. */
const PAGE_SIZE = 20;

// Well past 650 MPs, so a looping response can't page forever.
const MAX_PAGES = 60;

/**
 * The email to write to: the parliamentary office's if it has one, else the
 * first listed. Some addresses in the API end in a space.
 */
export function emailFrom(contacts: Contact[]): string | null {
  const withEmail = contacts.filter((contact) => contact.email?.trim());
  const office = withEmail.find((contact) => contact.typeId === PARLIAMENTARY_OFFICE);
  return (office ?? withEmail[0])?.email?.trim() ?? null;
}

/**
 * How to address the MP. Parliament gives one for most ("Ms Abbott"); for
 * the rest, build it from the name: a knight or dame by their first name
 * ("Sir Iain"), otherwise Mr or Ms and their surname, or the full name if
 * we can't tell which.
 */
export function salutationFor(member: Pick<Member, "nameAddressAs" | "nameListAs" | "nameDisplayAs" | "gender">): string {
  if (member.nameAddressAs?.trim()) return member.nameAddressAs.trim();
  const [surname, forenames = ""] = member.nameListAs.split(",").map((part) => part.trim());
  const knighted = forenames.match(/^(Sir|Dame) (\S+)/);
  if (knighted) return `${knighted[1]} ${knighted[2]}`;
  if (member.gender === "M") return `Mr ${surname}`;
  if (member.gender === "F") return `Ms ${surname}`;
  return member.nameDisplayAs;
}

export function toSyncedMp(member: Member, contacts: Contact[]): SyncedMp {
  return {
    parliamentId: member.id,
    name: member.nameDisplayAs,
    salutation: salutationFor(member),
    constituency: member.latestHouseMembership.membershipFrom,
    party: member.latestParty?.name ?? "",
    email: emailFrom(contacts),
  };
}

/** Runs `task` over `items`, `limit` at a time, keeping the order. */
async function mapLimited<T, R>(items: T[], limit: number, task: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const index = next++;
      results[index] = await task(items[index]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

/** Every sitting MP, with their email, sorted by constituency. */
export async function fetchCurrentMps(getJson: GetJson): Promise<SyncedMp[]> {
  const members: Member[] = [];
  for (let page = 0; ; page++) {
    if (page >= MAX_PAGES) throw new Error(`Members API paging went past ${MAX_PAGES} pages`);
    const params = new URLSearchParams({ House: "1", IsCurrentMember: "true", skip: String(page * PAGE_SIZE), take: String(PAGE_SIZE) });
    const data = (await getJson(`${MEMBERS_API}/Members/Search?${params}`)) as { items?: { value: Member }[]; totalResults?: number };
    if (!Array.isArray(data.items)) throw new Error("Members API response has no items");
    members.push(...data.items.map((item) => item.value));
    if (data.items.length < PAGE_SIZE || members.length >= (data.totalResults ?? 0)) break;
  }
  const mps = await mapLimited(members, 8, async (member) => {
    const data = (await getJson(`${MEMBERS_API}/Members/${member.id}/Contact`)) as { value?: Contact[] };
    return toSyncedMp(member, data.value ?? []);
  });
  return mps.sort((a, b) => a.constituency.localeCompare(b.constituency));
}

export type MpChanges = {
  added: SyncedMp[];
  removed: SyncedMp[];
  /** The MP after the change, for each one whose details changed. */
  changed: SyncedMp[];
};

/** What a sync would change, matching MPs by Parliament's ID. */
export function compareMps(before: SyncedMp[], after: SyncedMp[]): MpChanges {
  const old = new Map(before.map((mp) => [mp.parliamentId, mp]));
  const fresh = new Set(after.map((mp) => mp.parliamentId));
  return {
    added: after.filter((mp) => !old.has(mp.parliamentId)),
    removed: before.filter((mp) => !fresh.has(mp.parliamentId)),
    changed: after.filter((mp) => {
      const was = old.get(mp.parliamentId);
      return was !== undefined && JSON.stringify(was) !== JSON.stringify(mp);
    }),
  };
}

/**
 * More changes than this in one sync is held for a person to check. A
 * by-election changes one or two MPs; a general election, or a broken API
 * response, changes hundreds.
 */
export const MAX_UNCHECKED_CHANGES = 20;

export function changeCount(changes: MpChanges): number {
  return changes.added.length + changes.removed.length + changes.changed.length;
}
