import { Fragment, type ReactNode } from "react";
import { site } from "@/lib/content/site";
import { jobTitles, staffCopy } from "@/lib/content/staff-interface";
import { CONTROLAI_LETTER_PAGE } from "@/lib/controlai-letter";
import {
  type AnyImportRun,
  IMPORT_JOBS,
  JOB_SCHEDULES,
  type ImportJob,
  importPath,
  runStatus,
  runTone,
} from "@/lib/import-runs";
import { MEMBERS_API } from "@/lib/parliament";
import { staffTime } from "@/lib/staff-time";
import Breadcrumb from "./Breadcrumb";
import styles from "./ImportJob.module.css";
import ImportCard, { ImportCards } from "./ImportCard";
import JobActions from "./JobActions";
import type { Decide } from "./Run";
import RunList from "./RunList";
import Tag from "@/components/ui/Tag";
import Strip from "./ui/Strip";

// Every import and check: the overview at /staff/import-data, a card each,
// and each job's own page, with its button and every run it has made.

const words = staffCopy.import;

/** PauseAI's join form, where the members come from. */
const JOIN_FORM = "https://pauseai.info/join";

/** Each job's lozenges, all plain, so only how its runs ended is in colour: where it reads from, how often, and what kind of job it is. */
const TAGS: Record<ImportJob, string[]> = {
  "import-luma": [words.luma, words[JOB_SCHEDULES["import-luma"]]],
  "sync-politicians": [words.airtable, words[JOB_SCHEDULES["sync-politicians"]]],
  "sync-emails": [words.airtable, words[JOB_SCHEDULES["sync-emails"]]],
  "import-web-form-letters": [words.airtable, words[JOB_SCHEDULES["import-web-form-letters"]]],
  "import-go-to-parliament": [words.airtable, words[JOB_SCHEDULES["import-go-to-parliament"]]],
  "check-mps": [words.web, words[JOB_SCHEDULES["check-mps"]], words.checkOnly],
  "import-controlai": [words.web, words[JOB_SCHEDULES["import-controlai"]]],
  "import-members": [words.airtable, words[JOB_SCHEDULES["import-members"]]],
};

/** Each job's description, around a link to where it reads from, and its button and what to say before its first run. */
const ABOUT: Record<
  ImportJob,
  {
    intro: { before: string; link: string; after: string };
    /** Where it reads from: a page, or another table of the same Airtable base, by its ID; the politicians' table when left out. */
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
  "sync-politicians": {
    intro: staffCopy.syncs.intro,
    also: staffCopy.syncs.testMps,
    button: staffCopy.syncs.syncNow,
    none: staffCopy.syncs.none,
  },
  "sync-emails": {
    intro: staffCopy.pauseaiEmails.intro,
    href: "tblp4nH5Jymq48rcm",
    button: staffCopy.pauseaiEmails.importNow,
    none: staffCopy.pauseaiEmails.never,
  },
  "import-web-form-letters": {
    intro: staffCopy.webForm.intro,
    href: "tblkzjrRHiZiqMDGR",
    button: staffCopy.webForm.importNow,
    none: staffCopy.webForm.never,
  },
  "import-go-to-parliament": {
    intro: staffCopy.goToParliament.intro,
    href: "tblminXS1xSuBbEjz",
    button: staffCopy.goToParliament.importNow,
    none: staffCopy.goToParliament.never,
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
  "import-members": {
    intro: staffCopy.members.intro,
    href: JOIN_FORM,
    button: staffCopy.members.importNow,
    none: staffCopy.members.never,
  },
};

/** A job's lozenges; on the overview, whose headings say how often each runs, without that one. */
function Tags({ job, schedule = true }: { job: ImportJob; schedule?: boolean }) {
  const often = words[JOB_SCHEDULES[job]];
  return TAGS[job].filter((text) => schedule || text !== often).map((text) => <Tag key={text}>{text}</Tag>);
}

/** What the job does, with its source linked. Airtable's table link is the server's, so it comes in as a prop. */
function Intro({ job, airtableTable }: { job: ImportJob; airtableTable: string }) {
  const { intro, href, also } = ABOUT[job];
  return (
    <>
      {intro.before}
      <a
        href={href?.startsWith("tbl") ? airtableTable.replace(/[^/]*$/, href) : (href ?? airtableTable)}
        target="_blank"
        rel="noreferrer"
      >
        {intro.link}
      </a>
      {intro.after}
      {also && ` ${also}`}
    </>
  );
}

/** How a job's newest run ended, and when, in a strip tinted to match (ui/Strip); or that it has never run. */
function NewestRun({ job, run }: { job: ImportJob; run: AnyImportRun | undefined }) {
  if (!run)
    return (
      // A job that has never run: said plainly, not as a status in bold.
      <Strip>{ABOUT[job].none}</Strip>
    );
  return (
    <Strip tone={runTone(run) ?? "plain"} icon={false}>
      <span className={styles.line}>
        {staffCopy.runs.status[runStatus(run)]}
        <span className={styles.when}>{staffTime(run.at)}</span>
      </span>
    </Strip>
  );
}

/** /staff/import-data: a card per job, each a link to its page, with how its newest run ended. */
/** The overview's sections, each the jobs that run that often, in this order. */
const SCHEDULES = ["hourly", "nightly", "oneOff"] as const;

/** Every job, a card each, under a heading for how often it runs: hourly, nightly, then the one-off imports. */
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
      {SCHEDULES.map((schedule) => (
        <Fragment key={schedule}>
          <h2>{words[schedule]}</h2>
          <ImportCards>
            {IMPORT_JOBS.map((job, i) =>
              JOB_SCHEDULES[job] === schedule ? (
                <ImportCard
                  key={job}
                  title={jobTitles[job]}
                  href={importPath(job)}
                  tags={<Tags job={job} schedule={false} />}
                  intro={<Intro job={job} airtableTable={airtableTable} />}
                >
                  <NewestRun job={job} run={newest[i]} />
                </ImportCard>
              ) : null,
            )}
          </ImportCards>
        </Fragment>
      ))}
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
  /** Applies or discards a held politician sync. */
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
