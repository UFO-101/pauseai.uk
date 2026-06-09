// Watchdog types — kept under a `watchdog` namespace to avoid clashing with
// anything pauseai.uk might add later.

export type Severity = "low" | "medium" | "high";

export interface CompanyRef {
  _id: string;
  name: string;
  slug: string;
  swatch?: string;
}

export interface CategoryRef {
  _id: string;
  name: string;
  slug: string;
}

export interface Source {
  title: string;
  url: string;
  publisher?: string;
}

export interface PullQuote {
  text: string;
  attribution?: string;
  imageUrl?: string;
}

export interface Incident {
  _id: string;
  title: string;
  slug: string;
  date: string;
  summary: string;
  severity: Severity;
  pullQuote?: PullQuote;
  featured?: boolean;
  companies: CompanyRef[];
  categories: CategoryRef[];
  sources: Source[];
}

export interface CompanyWithCount extends CompanyRef {
  count: number;
}

export interface CategoryWithCount extends CategoryRef {
  count: number;
}
