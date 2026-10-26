import "server-only";
import { outsideFetch } from "./outside-fetch";

/** The key of the question every donate link's checkout asks, "Are you happy to be named on our wall of thanks?". */
export const WALL_OF_THANKS_FIELD = "areyouhappytobenamedonourwallofthanks";

/** A donor who said yes, as the donate page shows them. */
export type ThankedDonor = { name: string; givenAt: string };

type CheckoutSession = {
  id: string;
  created: number;
  customer_details: { name: string | null; email: string | null } | null;
  custom_fields: { key: string; dropdown?: { value: string | null } | null }[];
};

/**
 * Everyone who said yes to the wall of thanks at checkout, newest first,
 * through Stripe's API (STRIPE_WALL_OF_THANKS_KEY, a restricted key that can
 * only read Checkout Sessions). One entry per email address, from their
 * latest checkout, so someone who gives again moves to the top. Their name is
 * shown as they gave it. Staff take someone off by changing their answer to
 * No in the Stripe Dashboard.
 *
 * Without the key, or when Stripe fails, there's nobody, and the page shows
 * no wall.
 */
export async function getThankedDonors(): Promise<ThankedDonor[]> {
  const key = process.env.STRIPE_WALL_OF_THANKS_KEY;
  if (!key) return [];

  try {
    const sessions: CheckoutSession[] = [];
    let after: string | undefined;
    do {
      const params = new URLSearchParams({ status: "complete", limit: "100" });
      if (after) params.set("starting_after", after);
      const res = await outsideFetch(`https://api.stripe.com/v1/checkout/sessions?${params}`, {
        headers: { authorization: `Bearer ${key}` },
        next: { revalidate: 3600 },
      });
      if (!res.ok) return [];
      const page: { data: CheckoutSession[]; has_more: boolean } = await res.json();
      sessions.push(...page.data);
      after = page.has_more ? page.data.at(-1)?.id : undefined;
    } while (after);
    return thanked(sessions);
  } catch {
    return [];
  }
}

/**
 * Each person's latest answer decides, so someone who says no at a later
 * checkout comes off. Checkouts from before the question was asked have no
 * answer and don't count.
 */
function thanked(sessions: CheckoutSession[]): ThankedDonor[] {
  const latest = new Map<string, { created: number; yes: boolean; name: string }>();
  for (const session of sessions) {
    const answer = session.custom_fields.find((field) => field.key === WALL_OF_THANKS_FIELD)?.dropdown?.value;
    if (!answer) continue;
    const person = session.customer_details?.email?.toLowerCase() ?? session.id;
    const seen = latest.get(person);
    if (seen && seen.created > session.created) continue;
    const name = session.customer_details?.name?.trim() ?? "";
    latest.set(person, { created: session.created, yes: answer === "yes" && name !== "", name });
  }
  return [...latest.values()]
    .filter((donor) => donor.yes)
    .sort((a, b) => b.created - a.created)
    .map((donor) => ({ name: donor.name, givenAt: new Date(donor.created * 1000).toISOString() }));
}
