// Reads the staff interface's forms. Anything that doesn't fit is refused
// (undefined) rather than guessed at.
import { trackedCampaigns } from "@/lib/email-your-mp";
import type { CampaignStatus } from "@/lib/content/email-your-mp";

const HOUSES = ["commons", "lords", "scottish-parliament", "senedd", "ni-assembly", "other"];

function text(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === "string" ? value.trim() : "";
}

/** A positive whole number, such as a row's ID. */
export function idFrom(form: FormData, name = "id"): number | undefined {
  const value = text(form, name);
  return /^\d+$/.test(value) && Number(value) > 0 ? Number(value) : undefined;
}

export type PoliticianDetailsForm = {
  house: "commons" | "lords" | "scottish-parliament" | "senedd" | "ni-assembly" | "other";
  name: string;
  salutation: string;
  constituency: string | null;
  party: string;
  email: string | null;
};

export function politicianDetailsFrom(form: FormData): PoliticianDetailsForm | undefined {
  const house = text(form, "house");
  const name = text(form, "name");
  if (!HOUSES.includes(house) || !name) return undefined;
  return {
    house: house as PoliticianDetailsForm["house"],
    name,
    salutation: text(form, "salutation"),
    constituency: text(form, "constituency") || null,
    party: text(form, "party"),
    email: text(form, "email") || null,
  };
}

export type StatusForm = {
  politicianId: number;
  campaign: string;
  change: { status: CampaignStatus | null; date: string | null; note: string };
};

export function statusFrom(form: FormData): StatusForm | undefined {
  const politicianId = idFrom(form, "politicianId");
  const campaign = text(form, "campaign");
  const status = text(form, "status");
  const date = text(form, "date");
  if (!politicianId || !trackedCampaigns.some((c) => c.slug === campaign)) return undefined;
  if (status !== "" && status !== "signed") return undefined;
  if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) return undefined;
  return { politicianId, campaign, change: { status: status || null, date: date || null, note: text(form, "note") } };
}
