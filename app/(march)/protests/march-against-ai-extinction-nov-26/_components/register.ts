import type { MarchRegisterResult } from "@/lib/march-registration";

/**
 * Sends the form to app/api/march/register and gives back its answer. Throws
 * when there's no answer to give: offline, or the server erred.
 */
export async function registerForMarch(input: unknown): Promise<MarchRegisterResult> {
  const res = await fetch("/api/march/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(`The march sign-up answered ${res.status}`);
  return res.json();
}
