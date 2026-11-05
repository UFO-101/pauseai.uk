import { Muted } from "@/components/ui/Text";
import Tag from "@/components/ui/Tag";
import { staffCopy } from "@/lib/content/staff-interface";
import type { CampaignSummary, CampaignVersion, OwnWordsBands } from "@/lib/server/campaigns";
import type { LetterSummary } from "@/lib/server/letters";
import { filtersPath, pageParam, type LettersSearch } from "@/lib/staff-search";
import { staffDate } from "@/lib/staff-time";
import CampaignLetter from "./CampaignLetter";
import { CampaignAsk, campaignCounts } from "./CampaignsOverview";
import LetterFilters from "./LetterFilters";
import Band, { BandFact } from "./ui/Band";
import Counts from "./ui/Counts";
import Grid, { Card } from "./ui/Grid";
import ListFrame, { type ListColumn } from "./ui/ListFrame";
import Progress from "./ui/Progress";
import StaffLink from "./ui/StaffLink";
import Tabs from "./ui/Tabs";
import styles from "./MailingView.module.css";

const copy = staffCopy.campaigns;
const words = staffCopy.letters;

/** How a letter went, as a tag: its politician answered the ask, in green; failed, in red; else its status. */
function Outcome({ letter }: { letter: LetterSummary }) {
  if (letter.answer) return <Tag tone="green">{staffCopy.mailings.columns.answered}</Tag>;
  if (letter.status === "bounced" || letter.status === "not_sent") {
    return <Tag tone="red">{words.status[letter.status]}</Tag>;
  }
  return (
    <Tag>{letter.repliedAt ? staffCopy.mailingPages.tabs.replied : (words.status[letter.status] ?? letter.status)}</Tag>
  );
}

/** A campaign's letters' columns: the politician, with their seat, party and answer; who wrote it and when; how much was their own; how it went, leading to it. */
const campaignLetterColumns: ListColumn<LetterSummary>[] = [
  {
    key: "politician",
    label: copy.columns.politician,
    cell: (l) => (
      <span className={styles.who}>
        <StaffLink href={`/staff/politicians/${l.politicianId}`}>{l.mpName}</StaffLink>
        <Muted>{[l.constituency, l.party].filter(Boolean).join(" · ")}</Muted>
        {l.answer && <span className={styles.answer}>✓ {staffCopy.statuses[l.answer]}</span>}
      </span>
    ),
  },
  {
    key: "from",
    label: copy.columns.from,
    cell: (l) => (
      <span className={styles.who}>
        {l.supporterId === null ? (
          l.senderName
        ) : (
          <StaffLink href={`/staff/supporters/${l.supporterId}`}>{l.senderName}</StaffLink>
        )}
        <Muted>{staffDate(l.createdAt)}</Muted>
      </span>
    ),
  },
  {
    key: "ownWords",
    label: copy.columns.ownWords,
    short: true,
    cell: (l) => (l.ownWords === null ? <Muted>–</Muted> : words.ownWords(l.ownWords)),
  },
  {
    key: "status",
    label: copy.columns.status,
    short: true,
    cell: (l) => (
      <span className={styles.who}>
        <Outcome letter={l} />
        {!l.repliedAt && l.autoRepliedAt && <Muted>{words.status.auto_reply}</Muted>}
        <StaffLink href={`/staff/letters/${l.id}`}>{staffCopy.mailingPages.theLetter}</StaffLink>
      </span>
    ),
  },
];

/** What a campaign's page shows. */
export type CampaignPageProps = {
  campaign: CampaignSummary;
  versions: CampaignVersion[];
  bands: OwnWordsBands;
  letters: { letters: LetterSummary[]; total: number; pages: number; pageSize: number };
  search: LettersSearch;
  tabCounts: { all: number; changed: number; replied: number; failed: number };
};

/**
 * A campaign's page, in a mailing's shape: its band of who it's from and to,
 * with its counts; how many answered its ask; then "The letter" beside
 * "Letters", as "The email" is beside "Recipients".
 */
export default function CampaignView({ campaign, versions, bands, letters, search, tabCounts }: CampaignPageProps) {
  const path = `/staff/campaigns/${campaign.slug}`;
  const { page, ...filters } = search;
  void page;
  const tabHref = (tab: string) => filtersPath(path, { ...filters, tab });
  return (
    <div className={styles.page}>
      <Band title={campaign.title} aside={<Counts counts={campaignCounts(campaign)} />}>
        <BandFact label={copy.from}>{copy.supporters(campaign.supporters)}</BandFact>
        <BandFact label={copy.last}>{campaign.lastAt && staffDate(campaign.lastAt)}</BandFact>
        <BandFact label={copy.started}>{campaign.firstAt && staffDate(campaign.firstAt)}</BandFact>
        <BandFact label={campaign.ask ? staffCopy.asks.askTo[campaign.askKind!] : staffCopy.mailings.fields.ask}>
          {campaign.ask ? (
            <StaffLink href={`/staff/asks/${campaign.ask}`}>{campaign.askTitle}</StaffLink>
          ) : (
            <CampaignAsk campaign={campaign} />
          )}
        </BandFact>
        <BandFact label={copy.to}>{copy.politicians(campaign.politicians)}</BandFact>
      </Band>
      {campaign.ask && (
        <Grid>
          <Card span={6} as="div">
            <Progress
              value={campaign.answered}
              max={campaign.politicians}
              tone="green"
              label={staffCopy.mailingPages.counts.answered}
              big
            >
              {copy.answeredBar(campaign.answered, campaign.politicians)}
            </Progress>
          </Card>
        </Grid>
      )}
      <Grid>
        <Card span={3} look="aside" title={copy.theLetter} id="campaign-letter">
          <CampaignLetter versions={versions} bands={bands} />
        </Card>
        <Card span={3} as="div">
          <div className={styles.recipientsHead}>
            <h2>{copy.lettersTitle}</h2>
          </div>
          <LetterFilters path={path} search={search} campaigns={[]} />
          <Tabs
            label={copy.tabsLabel}
            current={search.tab || "all"}
            tabs={[
              { key: "all", label: copy.tabs.all(tabCounts.all), href: tabHref("") },
              { key: "changed", label: copy.tabs.changed(tabCounts.changed), href: tabHref("changed") },
              { key: "replied", label: copy.tabs.replied(tabCounts.replied), href: tabHref("replied") },
              { key: "failed", label: copy.tabs.failed(tabCounts.failed), href: tabHref("failed") },
            ]}
          />
          <ListFrame
            count={staffCopy.letters.total(letters.total)}
            total={letters.total}
            page={Number(search.page) || 1}
            pages={letters.pages}
            pageSize={letters.pageSize}
            href={(n) => filtersPath(path, { ...filters, page: "" }, pageParam(n))}
            download={(format) => filtersPath(`${path}/download`, { ...filters, page: "" }, { format })}
            columns={campaignLetterColumns}
            rows={letters.letters}
            rowKey={(l) => l.id}
            empty={words.none}
          />
        </Card>
      </Grid>
    </div>
  );
}
