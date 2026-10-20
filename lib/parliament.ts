// MPs from Parliament's Members API (https://members-api.parliament.uk/,
// no key needed), to check Airtable's list against. The caller passes in
// how to fetch: lib/server/outside-services/parliament.ts.

export const MEMBERS_API = "https://members-api.parliament.uk/api";

/** An MP as Parliament lists them. */
export type ParliamentMp = {
  parliamentId: number;
  name: string;
  constituency: string;
  /** Every email Parliament lists for them, trimmed: some end in a space. */
  emails: string[];
};

type Member = {
  id: number;
  nameDisplayAs: string;
  latestHouseMembership: { membershipFrom: string };
};

type Contact = { email?: string | null };

export type GetJson = (url: string) => Promise<unknown>;

/** The API's page size limit. */
const PAGE_SIZE = 20;

// Well past 650 MPs, so a looping response can't page forever.
const MAX_PAGES = 60;

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

/** Every sitting MP, with their emails. */
export async function fetchCurrentMps(getJson: GetJson): Promise<ParliamentMp[]> {
  const members: Member[] = [];
  for (let page = 0; ; page++) {
    if (page >= MAX_PAGES) throw new Error(`Members API paging went past ${MAX_PAGES} pages`);
    const params = new URLSearchParams({
      House: "1",
      IsCurrentMember: "true",
      skip: String(page * PAGE_SIZE),
      take: String(PAGE_SIZE),
    });
    const data = (await getJson(`${MEMBERS_API}/Members/Search?${params}`)) as {
      items?: { value: Member }[];
      totalResults?: number;
    };
    if (!Array.isArray(data.items)) throw new Error("Members API response has no items");
    members.push(...data.items.map((item) => item.value));
    if (data.items.length < PAGE_SIZE || members.length >= (data.totalResults ?? 0)) break;
  }
  // Ten at a time keeps the nightly check inside a Netlify scheduled
  // function's 30 seconds (about 15 seconds, 14 Oct 2026). Parliament answers
  // 429 if asked for too many at once, and the caller waits and tries again.
  return mapLimited(members, 10, async (member) => {
    const data = (await getJson(`${MEMBERS_API}/Members/${member.id}/Contact`)) as { value?: Contact[] };
    const emails = (data.value ?? []).map((contact) => contact.email?.trim() ?? "").filter(Boolean);
    return {
      parliamentId: member.id,
      name: member.nameDisplayAs,
      constituency: member.latestHouseMembership.membershipFrom,
      emails: [...new Set(emails)],
    };
  });
}
