import type { ReactNode } from "react";
import { site } from "@/lib/content/site";
import { jobTitles, staffCopy } from "@/lib/content/staff-interface";
import { CONTROLAI_LETTER_PAGE } from "@/lib/controlai-letter";
import { type AnyImportRun, IMPORT_JOBS, type ImportJob, importPath, runTone } from "@/lib/import-runs";
import { MEMBERS_API } from "@/lib/parliament";
import { staffTime } from "@/lib/staff-time";
import Breadcrumb from "./Breadcrumb";
import styles from "./ImportJob.module.css";
import ImportCard, { ImportCards } from "./ImportCard";
import JobActions from "./JobActions";
import type { Decide } from "./Run";
import RunList from "./RunList";
import Tag from "@/components/ui/Tag";

// Every import and check: the overview at /staff/import-data, a card each,
// and each job's own page, with its button and every run it has made.

const words = staffCopy.import;

/** Each job's lozenges, all plain, so only how its runs ended is in colour: where it reads from, how often, and what kind of job it is. */
const TAGS: Record<ImportJob, string[]> = {
  "import-luma": [words.luma, words.hourly],
  "sync-mps": [words.airtable, words.nightly],
  "check-mps": [words.web, words.nightly, words.checkOnly],
  "import-controlai": [words.web, words.nightly],
  "import-signatories": [words.airtable, words.oneOff],
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
  return TAGS[job].map((text) => <Tag key={text}>{text}</Tag>);
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

/** How a job's newest run ended, and when, in a strip tinted to match; or that it has never run. */
function NewestRun({ job, run }: { job: ImportJob; run: AnyImportRun | undefined }) {
  if (!run) return <p className={styles.status}>{ABOUT[job].none}</p>;
  const tone = runTone(run);
  const stoppedShort = run.job === "import-luma" && run.status !== "failed" && run.result.stoppedBy !== undefined;
  return (
    <p className={tone ? `${styles.status} ${styles[tone]}` : styles.status}>
      <strong>{staffCopy.runs.status[run.status]}</strong>
      {stoppedShort && <strong> · {staffCopy.runs.incomplete}</strong>}
      <span className={styles.when}>{staffTime(run.at)}</span>
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

/** One job's page: the way back, its name and lozenges, what it does, its button, then every run it has made, newest first, the newest tinted by how it ended. */
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
