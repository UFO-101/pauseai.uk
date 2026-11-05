import "server-only";
import { siteUrl } from "@/lib/site-url";
import { outsideFetch } from "./outside-fetch";

// The site's own background functions on Netlify, which a Server Action starts:
// they answer 202 at once, and call the site back with CRON_SECRET.

/** Starts background function `name`, with `body`. */
export async function startBackgroundFunction(name: string, body: object): Promise<void> {
  const res = await outsideFetch(siteUrl(`/.netlify/functions/${name}`, undefined).toString(), {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.CRON_SECRET}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (res.status !== 202) throw new Error(`${name} returned ${res.status}`);
}
