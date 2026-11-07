import { Fragment, type ReactNode } from "react";
import { site } from "@/lib/content/site";
import { jobTitles, staffCopy } from "@/lib/content/staff-interface";
import { CONTROLAI_LETTER_PAGE } from "@/lib/controlai-letter";
import type { JobPress } from "@/lib/server/import-runs";
import {
  type AnyImportRun,
  IMPORT_JOBS,
  type OldLettersProgress,
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
import ImportIcon, { type ImportSource } from "./ImportIcon";
import JobActions from "./JobActions";
import OldLettersProgressBar from "./OldLettersProgressBar";
import type { Decide } from "./Run";
import RunList from "./RunList";
import Tag from "@/components/ui/Tag";
import Strip from "./ui/Strip";
import ExternalLink from "./ui/ExternalLink";

// Every import and check: the overview at /staff/import-data, a card each,
// and each job's own page, with its button and every run it has made.

const words = staffCopy.import;

/** PauseAI's join form, where the members come from. */
const JOIN_FORM = "https://pauseai.info/join";

/** Where each job reads from, as its icon. */
const SOURCES: Record<ImportJob, ImportSource> = {
  "import-luma": "luma",
  "sync-politicians": "airtable",
  "sync-emails": "airtable",
  "import-web-form-letters": "airtable",
  "import-go-to-parliament": "airtable",
  "check-mps": "web",
  "import-controlai": "web",
  "import-members": "airtable",
  "read-gmail": "gmail",
  "import-old-letters": "gmail",
  "send-mailings": "gmail",
  "tidy-logs": "database",
};

/** What sets a job apart, in a lozenge after its name: the check that changes nothing, the jobs that change things outside the site, sending mail to people or tagging events on Luma, the tidying that's the site's housekeeping. */
const TAGS: Partial<Record<ImportJob, string>> = {
  "check-mps": words.checkOnly,
  "send-mailings": words.takesAction,
  "read-gmail": words.takesAction,
  "import-luma": words.takesAction,
  "tidy-logs": words.siteAdmin,
};

function JobTag({ job }: { job: ImportJob }) {
  const tag = TAGS[job];
  return tag ? <Tag>{tag}</Tag> : null;
}

/** Each job's description, around a link to where it reads from, and its button and what to say before its first run. */
const ABOUT: Record<
  ImportJob,
  {
    intro: { before: string; link: string; after: string };
    /** Where it reads from: a page, or another table of the same Airtable base, by its ID; the politicians' table when left out. */
    href?: string;
    /** More of the intro, with a link of its own, for a job that works from two places. */
    then?: { link: string; after: string; href: string };
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
  "read-gmail": {
    intro: staffCopy.gmailReading.intro,
    href: "/staff/me",
    button: staffCopy.gmailReading.readNow,
    none: staffCopy.gmailReading.never,
  },
  "import-old-letters": {
    intro: staffCopy.oldLetters.intro,
    href: "/staff/one-off",
    button: staffCopy.oldLetters.importNow,
    none: staffCopy.oldLetters.never,
  },
  "send-mailings": {
    intro: staffCopy.sending.intro,
    href: "/staff/campaigns",
    then: { ...staffCopy.sending.introThen, href: "/staff/mailings" },
    button: staffCopy.sending.sendNow,
    none: staffCopy.sending.never,
  },
  "tidy-logs": {
    intro: staffCopy.tidying.intro,
    href: "/staff/audit-log",
    then: { ...staffCopy.tidying.introThen, href: "/staff/mailings" },
    button: staffCopy.tidying.tidyNow,
    none: staffCopy.tidying.never,
  },
};

/** What the job does, with its source linked. Airtable's table link is the server's, so it comes in as a prop. */
function Intro({ job, airtableTable }: { job: ImportJob; airtableTable: string }) {
  const { intro, href, then, also } = ABOUT[job];
  return (
    <>
      {intro.before}
      <ExternalLink href={href?.startsWith("tbl") ? airtableTable.replace(/[^/]*$/, href) : (href ?? airtableTable)}>
        {intro.link}
      </ExternalLink>
      {intro.after}
      {then && (
        <>
          <ExternalLink href={then.href}>{then.link}</ExternalLink>
          {then.after}
        </>
      )}
      {also && ` ${also}`}
    </>
  );
}

/** That a press of the job is running, or how its newest run ended, and when, in a strip tinted to match (ui/Strip); or that it has never run. */
function NewestRun({ job, run, press }: { job: ImportJob; run: AnyImportRun | undefined; press?: JobPress }) {
  if (press)
    return (
      <Strip tone="blue" icon={false}>
        <span className={styles.line}>
          {staffCopy.runs.status.running}
          <span className={styles.when}>{staffTime(press.startedAt)}</span>
        </span>
      </Strip>
    );
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
const SCHEDULES = ["frequent", "hourly", "nightly", "oneOff"] as const;

/** Every job, a card each, under a heading for how often it runs: every 5 minutes, hourly, nightly, then the one-off imports. */
export function ImportOverview({
  newest,
  presses,
  airtableTable,
}: {
  /** Each job's newest run, in IMPORT_JOBS order; undefined for one that has never run. */
  newest: (AnyImportRun | undefined)[];
  /** Each job's press that's still running, in the same order. */
  presses: (JobPress | undefined)[];
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
                  icon={<ImportIcon source={SOURCES[job]} />}
                  tags={<JobTag job={job} />}
                  intro={<Intro job={job} airtableTable={airtableTable} />}
                >
                  <NewestRun job={job} run={newest[i]} press={presses[i]} />
                </ImportCard>
              ) : null,
            )}
          </ImportCards>
        </Fragment>
      ))}
    </>
  );
}

/** One job's page: the way back, its icon, name, how often it runs and what sets it apart, what it does, its button, then every run it has made, newest first. */
export function ImportJobPage({
  job,
  runs,
  press,
  run,
  decide,
  airtableTable,
  people = false,
  progress,
}: {
  job: ImportJob;
  runs: AnyImportRun[];
  /** A press of it that's still running, which a second press won't add to. */
  press?: JobPress;
  /** The Server Action that runs the job now. */
  run: (form: FormData) => void | Promise<void>;
  /** Applies or discards a held politician sync. */
  decide: Decide;
  airtableTable: string;
  /** Whether they may see who mail that matched nothing is from. */
  people?: boolean;
  /** How far the import of old letters has got, on its page. */
  progress?: OldLettersProgress;
}): ReactNode {
  return (
    <>
      <Breadcrumb href="/staff/import-data">{words.pageTitle}</Breadcrumb>
      <div className={styles.head}>
        <ImportIcon source={SOURCES[job]} />
        <h1 className={styles.heading}>
          {jobTitles[job]}
          <Tag>{words[JOB_SCHEDULES[job]]}</Tag>
          <JobTag job={job} />
        </h1>
      </div>
      <p>
        <Intro job={job} airtableTable={airtableTable} />
      </p>
      {press && (
        <div className={styles.running}>
          <Strip tone="blue">
            <span>{words.running(press.startedBy, staffTime(press.startedAt))}</span>
          </Strip>
        </div>
      )}
      <JobActions action={run} label={ABOUT[job].button} />
      {progress && <OldLettersProgressBar progress={progress} />}
      <RunList runs={runs} none={ABOUT[job].none} decide={decide} people={people} press={press} />
    </>
  );
}
