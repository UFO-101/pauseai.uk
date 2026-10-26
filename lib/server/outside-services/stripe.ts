import "server-only";
import { outsideFetch } from "./outside-fetch";

/** The key of the question every donate link's checkout asks, "Are you happy to be named on our wall of thanks?". */
export const WALL_OF_THANKS_FIELD = "areyouhappytobenamedonourwallofthanks";

/** A donor who said yes, as the donate page shows them. */
export type ThankedDonor = { name: string; givenAt: string };

type CheckoutSession = {
  id: string;
  created: number;
  customer: string | null;
  customer_details: { name: string | null; email: string | null } | null;
  custom_fields: { key: string; dropdown?: { value: string | null } | null }[];
};

type PaymentIntent = {
  id: string;
  created: number;
  status: string;
  customer: string | null;
  payment_details?: { order_reference: string | null } | null;
};

/**
 * Everyone who said yes to the wall of thanks at checkout, newest gift first,
 * through Stripe's API (STRIPE_WALL_OF_THANKS_KEY, a restricted key that can
 * read Checkout Sessions and Payment Intents). One entry per email address,
 * named as they gave it at their latest checkout. Their date is their latest
 * gift: that checkout, or a later monthly payment on a gift they set up at a
 * checkout, so monthly donors stay near the top while they give. Staff take
 * someone off by changing their answer to No in the Stripe Dashboard.
 *
 * Without the key, or when Stripe fails, there's nobody, and the page shows
 * no wall. If only the payments fail, dates are the checkouts'.
 */
export async function getThankedDonors(): Promise<ThankedDonor[]> {
  const key = process.env.STRIPE_WALL_OF_THANKS_KEY;
  if (!key) return [];

  try {
    const sessions = await list<CheckoutSession>(key, "checkout/sessions", { status: "complete" });
    if (!sessions) return [];
    const payments = (await list<PaymentIntent>(key, "payment_intents", {})) ?? [];
    return thanked(sessions, monthlyPayments(payments));
  } catch {
    return [];
  }
}

/** Every page of one of Stripe's lists, or null if Stripe refuses. */
async function list<T extends { id: string }>(
  key: string,
  path: string,
  query: Record<string, string>,
): Promise<T[] | null> {
  const items: T[] = [];
  let after: string | undefined;
  do {
    const params = new URLSearchParams({ ...query, limit: "100" });
    if (after) params.set("starting_after", after);
    const res = await outsideFetch(`https://api.stripe.com/v1/${path}?${params}`, {
      headers: { authorization: `Bearer ${key}` },
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    const page: { data: T[]; has_more: boolean } = await res.json();
    items.push(...page.data);
    after = page.has_more ? page.data.at(-1)?.id : undefined;
  } while (after);
  return items;
}

/**
 * When each customer last paid a monthly gift, by customer. A monthly
 * payment is one Stripe took for an invoice (its order reference is the
 * invoice's ID); other payments, such as tickets, aren't gifts and don't
 * count.
 */
function monthlyPayments(payments: PaymentIntent[]): Map<string, number> {
  const latest = new Map<string, number>();
  for (const payment of payments) {
    const invoice = payment.payment_details?.order_reference?.startsWith("in_");
    if (payment.status !== "succeeded" || !invoice || !payment.customer) continue;
    latest.set(payment.customer, Math.max(latest.get(payment.customer) ?? 0, payment.created));
  }
  return latest;
}

/**
 * Each person's latest answer decides, so someone who says no at a later
 * checkout comes off. Checkouts from before the question was asked have no
 * answer and don't count. A person's monthly payments count towards their
 * date only through the customers their own checkouts made.
 */
function thanked(sessions: CheckoutSession[], monthly: Map<string, number>): ThankedDonor[] {
  const latest = new Map<string, { created: number; yes: boolean; name: string; customers: Set<string> }>();
  for (const session of sessions) {
    const answer = session.custom_fields.find((field) => field.key === WALL_OF_THANKS_FIELD)?.dropdown?.value;
    if (!answer) continue;
    const person = session.customer_details?.email?.toLowerCase() ?? session.id;
    const seen = latest.get(person);
    const customers = seen?.customers ?? new Set<string>();
    if (session.customer) customers.add(session.customer);
    if (seen && seen.created > session.created) continue;
    const name = session.customer_details?.name?.trim() ?? "";
    latest.set(person, { created: session.created, yes: answer === "yes" && name !== "", name, customers });
  }
  return [...latest.values()]
    .filter((donor) => donor.yes)
    .map((donor) => ({
      name: donor.name,
      given: Math.max(donor.created, ...[...donor.customers].map((customer) => monthly.get(customer) ?? 0)),
    }))
    .sort((a, b) => b.given - a.given)
    .map((donor) => ({ name: donor.name, givenAt: new Date(donor.given * 1000).toISOString() }));
}
