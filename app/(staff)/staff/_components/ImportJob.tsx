import type { ReactNode } from "react";
import { site } from "@/lib/content/site";
import { jobTitles, staffCopy } from "@/lib/content/staff-interface";
import { CONTROLAI_LETTER_PAGE } from "@/lib/controlai-letter";
import { type AnyImportRun, IMPORT_JOBS, type ImportJob, importPath } from "@/lib/import-runs";
import { MEMBERS_API } from "@/lib/parliament";
import { staffTime } from "@/lib/staff-time";
import Breadcrumb from "./Breadcrumb";
import ImportCard, { ImportCards } from "./ImportCard";
import JobActions from "./JobActions";
import type { Decide } from "./Run";
import RunList from "./RunList";
import Tag, { type TagTone } from "@/components/ui/Tag";
import { Muted } from "@/components/ui/Text";

// Every import and check: the overview at /staff/import-data, a card each,
// and each job's own page, with its button and every run it has made.

const words = staffCopy.import;

/** Each job's lozenges: where it reads from, how often, and what kind of job it is. */
const TAGS: Record<ImportJob, { tone?: TagTone; text: string }[]> = {
  "import-luma": [
    { tone: "amber", text: words.luma },
    { tone: "blue", text: words.hourly },
  ],
  "sync-mps": [
    { tone: "amber", text: words.airtable },
    { tone: "blue", text: words.nightly },
  ],
  "check-mps": [{ tone: "green", text: words.web }, { tone: "blue", text: words.nightly }, { text: words.checkOnly }],
  "import-controlai": [
    { tone: "green", text: words.web },
    { tone: "blue", text: words.nightly },
  ],
  "import-signatories": [{ tone: "amber", text: words.airtable }, { text: words.oneOff }],
};

/** Each job's description, around a link to where it reads from, and its button and what to say before its first run. */
const ABOUT: Record<
  ImportJob,
  {
    intro: { before: string; link: string; after: string };
    /** Where it reads from; Airtable's table when left out. */
    href?: string;
    also?: string;
    button: string;
    none: string;
  }
> = {
  "import-luma": {
    intro: staffCopy.luma.intro,
    href: site.social.luma,
    button: staffCopy.luma.importNow,
    none: staffCopy.luma.never,
  },
  "sync-mps": {
    intro: staffCopy.syncs.intro,
    also: staffCopy.syncs.testMps,
    button: staffCopy.syncs.syncNow,
    none: staffCopy.syncs.none,
  },
  "check-mps": {
    intro: staffCopy.check.intro,
    href: MEMBERS_API,
    button: staffCopy.check.checkNow,
    none: staffCopy.check.never,
  },
  "import-controlai": {
    intro: staffCopy.controlAi.intro,
    href: CONTROLAI_LETTER_PAGE,
    button: staffCopy.controlAi.importNow,
    none: staffCopy.controlAi.never,
  },
  "import-signatories": { intro: words.intro, button: words.button, none: words.none },
};

function Tags({ job }: { job: ImportJob }) {
  return TAGS[job].map(({ tone, text }) => (
    <Tag key={text} tone={tone}>
      {text}
    </Tag>
  ));
}

/** What the job does, with its source linked. Airtable's table link is the server's, so it comes in as a prop. */
function Intro({ job, airtableTable }: { job: ImportJob; airtableTable: string }) {
  const { intro, href, also } = ABOUT[job];
  return (
    <>
      {intro.before}
      <a href={href ?? airtableTable} target="_blank" rel="noreferrer">
        {intro.link}
      </a>
      {intro.after}
      {also && ` ${also}`}
    </>
  );
}

/** How a job's newest run ended, and when: a tag, red for failed and amber for held or stopped short; or that it has never run. */
function NewestRun({ job, run }: { job: ImportJob; run: AnyImportRun | undefined }) {
  if (!run) return <Muted>{ABOUT[job].none}</Muted>;
  const tone: TagTone | undefined =
    run.status === "failed"
      ? "red"
      : run.status === "held"
        ? "amber"
        : run.status === "ok" || run.status === "applied"
          ? "green"
          : undefined;
  const stoppedShort = run.job === "import-luma" && run.status !== "failed" && run.result.stoppedBy !== undefined;
  return (
    <p>
      <Tag tone={tone}>{staffCopy.runs.status[run.status]}</Tag>
      {stoppedShort && <Tag tone="amber">{staffCopy.runs.incomplete}</Tag>} <Muted>{staffTime(run.at)}</Muted>
    </p>
  );
}

/** /staff/import-data: a card per job, each a link to its page, with how its newest run ended. */
export function ImportOverview({
  newest,
  airtableTable,
}: {
  /** Each job's newest run, in IMPORT_JOBS order; undefined for one that has never run. */
  newest: (AnyImportRun | undefined)[];
  airtableTable: string;
}) {
  return (
    <>
      <h1>{words.pageTitle}</h1>
      <ImportCards>
        {IMPORT_JOBS.map((job, i) => (
          <ImportCard
            key={job}
            title={jobTitles[job]}
            href={importPath(job)}
            tags={<Tags job={job} />}
            intro={<Intro job={job} airtableTable={airtableTable} />}
          >
            <NewestRun job={job} run={newest[i]} />
          </ImportCard>
        ))}
      </ImportCards>
    </>
  );
}

/** One job's page: the way back, its name and lozenges, what it does, its button, then every run it has made, newest first. */
export function ImportJobPage({
  job,
  runs,
  run,
  decide,
  airtableTable,
}: {
  job: ImportJob;
  runs: AnyImportRun[];
  /** The Server Action that runs the job now. */
  run: () => void | Promise<void>;
  /** Applies or discards a held MP sync. */
  decide: Decide;
  airtableTable: string;
}): ReactNode {
  return (
    <>
      <Breadcrumb href="/staff/import-data">{words.pageTitle}</Breadcrumb>
      <h1>
        {jobTitles[job]}
        <Tags job={job} />
      </h1>
      <p>
        <Intro job={job} airtableTable={airtableTable} />
      </p>
      <JobActions action={run} label={ABOUT[job].button} />
      <RunList runs={runs} none={ABOUT[job].none} decide={decide} />
    </>
  );
}
