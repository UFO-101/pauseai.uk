// The staff interface's letters to MPs: the list and its filters, a letter's
// page, thread and history, and the blocked addresses, on fake letters.
// Their links go to /staff pages, which send anyone without a session to the
// login page.
import EmailBlockFilters from "@/app/(staff)/staff/_components/EmailBlockFilters";
import { exampleProblems } from "@/app/(staff)/staff/_components/EmailBlocksTable.examples";
import EmailProblemsTable from "@/app/(staff)/staff/_components/EmailProblemsTable";
import CampaignName from "@/app/(staff)/staff/_components/CampaignName";
import LetterLink from "@/app/(staff)/staff/_components/LetterLink";
import LettersTable from "@/app/(staff)/staff/_components/LettersTable";
import MailEmail from "@/app/(staff)/staff/_components/MailEmail";
import CampaignLetter from "@/app/(staff)/staff/_components/CampaignLetter";
import CampaignsOverview, { CampaignAsk } from "@/app/(staff)/staff/_components/CampaignsOverview";
import CampaignView from "@/app/(staff)/staff/_components/CampaignView";
import OneOffList, { OneOffTable } from "@/app/(staff)/staff/_components/OneOffList";
import OneOffThreadView from "@/app/(staff)/staff/_components/OneOffThreadView";
import {
  exampleChanged,
  exampleCampaign,
  exampleCampaignEmpty,
  exampleCampaignNoAsk,
  exampleHiddenOneOff,
  exampleOneOffs,
  exampleOneOffThread,
  exampleVersions,
} from "@/app/(staff)/staff/_components/CampaignPages.examples";
import {
  emptyLettersSearch,
  exampleAutoRepliedLetterDetails,
  exampleLetter,
  examplePauseaiLetterDetails,
  exampleOlderRepliedLetterDetails,
  exampleProxiedLetterDetails,
  exampleRepliedLetterDetails,
  exampleSupporterLetterDetails,
} from "@/app/(staff)/staff/_components/LettersTable.examples";
import { historyOf, LetterHistory } from "@/app/(staff)/staff/_components/LetterHistory";
import FindInGmail from "@/app/(staff)/staff/_components/FindInGmail";
import StaffPage from "@/app/(staff)/staff/_components/ui/StaffPage";
import { campaigns } from "@/lib/content/email-your-mp";
import BounceReason from "@/app/(staff)/staff/_components/BounceReason";
import LetterChanges, { FoldedAutoReply } from "@/app/(staff)/staff/_components/LetterChanges";
import { MessageText } from "@/app/(staff)/staff/_components/LetterThread";
import ThreadEmail from "@/app/(staff)/staff/_components/ThreadEmail";
import LetterThread, { SupporterLetterThread } from "@/app/(staff)/staff/_components/LetterThread";
import { exampleImportedThread, exampleThread } from "@/app/(staff)/staff/_components/LetterThread.examples";
import type { Group } from "../_components/types";
import {
  EmailBlocksTableExample,
  MailingLetterViewExample,
  SupporterLetterViewExample,
  UnblockFormExample,
} from "./staff.client";

const [pm] = campaigns;

/** Who a letter in the examples is from and to, when, and its subject. */
const EXAMPLE_EMAIL = {
  from: "Jane Smith <jane@example.com>",
  to: "Testy McTestface MP <testy.mctestface.mp@parliament.uk>",
  at: "2026-10-12T09:05:00Z",
  subject: "Please back a pause on frontier AI",
};

export const staffLetters: Group = {
  id: "staff-letters",
  title: "The staff interface: letters",
  examples: [
    {
      name: "LetterThread",
      file: "app/(staff)/staff/_components/LetterThread.tsx",
      variants: [
        {
          label: "Sent from Jo's Gmail: Polly's answer, and Jo's that can't be read",
          render: () => (
            <StaffPage as="div">
              <LetterThread thread={exampleThread} />
            </StaffPage>
          ),
        },
        {
          label: "Imported from Airtable, never sent: no text, no replies",
          render: () => (
            <StaffPage as="div">
              <LetterThread thread={exampleImportedThread} />
            </StaffPage>
          ),
        },
      ],
    },
    {
      name: "SupporterLetterThread",
      file: "app/(staff)/staff/_components/LetterThread.tsx",
      variants: [
        {
          label:
            "A supporter's letter, from them, leading to their supporter page: no text, which is in the policy inbox",
          render: () => (
            <StaffPage as="div">
              <SupporterLetterThread letter={exampleSupporterLetterDetails} />
            </StaffPage>
          ),
        },
        {
          label:
            "A letter from the letters inbox: its changes to the draft, then the office's reply and the supporter's answer",
          render: () => (
            <StaffPage as="div">
              <SupporterLetterThread letter={exampleProxiedLetterDetails} />
            </StaffPage>
          ),
        },
        {
          label:
            "Only automatic replies: the office's folded to its first paragraph, the supporter's one paragraph whole",
          render: () => (
            <StaffPage as="div">
              <SupporterLetterThread letter={exampleAutoRepliedLetterDetails} />
            </StaffPage>
          ),
        },
      ],
    },
    {
      name: "MessageText",
      file: "app/(staff)/staff/_components/LetterThread.tsx",
      variants: [
        {
          label: "A reply, the mail it quotes folded under it",
          render: () => (
            <StaffPage as="div">
              <MessageText
                text={"Dear Jo,\n\nYes, I'd be glad to meet."}
                quoted={"On 5 Jun 2026, Jo wrote:\n> Will you?"}
              />
            </StaffPage>
          ),
        },
      ],
    },
    {
      name: "ThreadEmail",
      file: "app/(staff)/staff/_components/ThreadEmail.tsx",
      variants: [
        {
          label: "A message of a thread: who from and to, when, its subject with an action at its right, over its text",
          render: () => (
            <StaffPage as="div">
              <ThreadEmail {...EXAMPLE_EMAIL} action={<a href="#">An action</a>}>
                Dear Mr McTestface, thank you.
              </ThreadEmail>
            </StaffPage>
          ),
        },
        {
          label: "One whose text isn't kept: no date, and a tinted body for the note in its place",
          render: () => (
            <StaffPage as="div">
              <ThreadEmail {...EXAMPLE_EMAIL} at={null} missing>
                {"The letter's text isn't kept."}
              </ThreadEmail>
            </StaffPage>
          ),
        },
      ],
    },
    {
      name: "LetterChanges",
      file: "app/(staff)/staff/_components/LetterChanges.tsx",
      variants: [
        {
          label:
            "Only what the supporter changed in a long letter, the paragraphs they left alone folded; Show as sent above",
          render: () => (
            <StaffPage as="div">
              <LetterChanges
                {...EXAMPLE_EMAIL}
                sent={exampleProxiedLetterDetails.sent!.text}
                draft={exampleProxiedLetterDetails.sent!.draft}
              />
            </StaffPage>
          ),
        },
        {
          label: "No draft kept: the letter alone",
          render: () => (
            <StaffPage as="div">
              <LetterChanges {...EXAMPLE_EMAIL} sent={exampleProxiedLetterDetails.sent!.text} draft={null} />
            </StaffPage>
          ),
        },
      ],
    },
    {
      name: "FoldedAutoReply",
      file: "app/(staff)/staff/_components/LetterChanges.tsx",
      variants: [
        {
          label: "An automatic reply of four paragraphs, folded to its first; Show as sent above",
          render: () => {
            const reply = exampleAutoRepliedLetterDetails.sent!.messages[0];
            return (
              <StaffPage as="div">
                <FoldedAutoReply
                  from={reply.fromName}
                  to="Jane Smith <jane@example.com>"
                  cc={null}
                  at={reply.at}
                  subject={reply.subject}
                  text={reply.text!}
                />
              </StaffPage>
            );
          },
        },
      ],
    },
    {
      name: "BounceReason",
      file: "app/(staff)/staff/_components/BounceReason.tsx",
      variants: [
        {
          label: "Postmark's, and one found in someone's Gmail",
          render: () => (
            <StaffPage as="div">
              <p>
                <BounceReason reason="Unknown user" foundInGmail={false} />
              </p>
              <p>
                <BounceReason
                  reason="550 5.1.1 The email account that you tried to reach does not exist."
                  foundInGmail
                />
              </p>
            </StaffPage>
          ),
        },
      ],
    },
    {
      name: "EmailBlocksTable",
      file: "app/(staff)/staff/_components/EmailBlocksTable.tsx",
      variants: [
        {
          label: "An MP's address that bounced, and one that complained",
          render: () => (
            <StaffPage as="div">
              <EmailBlocksTableExample />
            </StaffPage>
          ),
        },
        {
          label: "Without the supporters permission: the letter named, not linked",
          render: () => (
            <StaffPage as="div">
              <EmailBlocksTableExample letterLinks={false} />
            </StaffPage>
          ),
        },
        {
          label: "None",
          render: () => (
            <StaffPage as="div">
              <EmailBlocksTableExample blocks={[]} />
            </StaffPage>
          ),
        },
      ],
    },
    {
      name: "UnblockForm",
      file: "app/(staff)/staff/_components/UnblockForm.tsx",
      variants: [
        {
          label: "For a bounce, and for a complaint, which can't be unblocked",
          render: () => (
            <StaffPage as="div">
              <UnblockFormExample />
            </StaffPage>
          ),
        },
      ],
    },
    {
      name: "EmailBlockFilters",
      file: "app/(staff)/staff/_components/EmailBlockFilters.tsx",
      variants: [
        {
          label: "All, and complaints to a search",
          render: () => (
            <StaffPage as="div">
              <EmailBlockFilters q="" kind="" action="/staff/politicians/blocked-emails" />
              <EmailBlockFilters q="example.org" kind="complaint" action="/staff/politicians/blocked-emails" />
            </StaffPage>
          ),
        },
      ],
    },
    {
      name: "EmailProblemsTable",
      file: "app/(staff)/staff/_components/EmailProblemsTable.tsx",
      variants: [
        {
          label: "A letter's hard bounce, a forwarded reply's soft one, and a complaint about an email we didn't log",
          render: () => (
            <StaffPage as="div">
              <EmailProblemsTable problems={exampleProblems} letterLinks />
            </StaffPage>
          ),
        },
        {
          label: "Without the supporters permission: the letter named, not linked",
          render: () => (
            <StaffPage as="div">
              <EmailProblemsTable problems={exampleProblems} letterLinks={false} />
            </StaffPage>
          ),
        },
        {
          label: "None",
          render: () => (
            <StaffPage as="div">
              <EmailProblemsTable problems={[]} letterLinks />
            </StaffPage>
          ),
        },
      ],
    },
    {
      name: "CampaignsOverview",
      file: "app/(staff)/staff/_components/CampaignsOverview.tsx",
      variants: [
        {
          label: "Campaigns under the months of their last letters, with and without an ask",
          render: () => (
            <StaffPage as="div">
              <CampaignsOverview
                campaigns={[exampleCampaign, exampleCampaignNoAsk, exampleCampaignEmpty]}
                now="2026-11-05T09:00:00Z"
              />
            </StaffPage>
          ),
        },
        {
          label: "With none",
          render: () => (
            <StaffPage as="div">
              <CampaignsOverview campaigns={[]} now="2026-11-05T09:00:00Z" />
            </StaffPage>
          ),
        },
      ],
    },
    {
      name: "CampaignAsk",
      file: "app/(staff)/staff/_components/CampaignsOverview.tsx",
      variants: [
        {
          label: "With an ask, and with none",
          render: () => (
            <StaffPage as="div">
              <p>
                <CampaignAsk campaign={exampleCampaign} />
              </p>
              <p>
                <CampaignAsk campaign={exampleCampaignNoAsk} />
              </p>
            </StaffPage>
          ),
        },
      ],
    },
    {
      name: "MailEmail",
      file: "app/(staff)/staff/_components/MailEmail.tsx",
      variants: [
        {
          label: "From and to, and a subject alone",
          render: () => (
            <StaffPage as="div">
              <MailEmail from="jo@pauseai.uk" to="Each politician" subject="A subject">
                <p>The letter.</p>
              </MailEmail>
              <MailEmail subject="Only a subject">
                <p>The letter.</p>
              </MailEmail>
            </StaffPage>
          ),
        },
      ],
    },
    {
      name: "CampaignLetter",
      file: "app/(staff)/staff/_components/CampaignLetter.tsx",
      variants: [
        {
          label: "Several versions, and how much people changed them",
          render: () => (
            <StaffPage as="div">
              <CampaignLetter changedHref="#changed" versions={exampleVersions} changed={exampleChanged} />
            </StaffPage>
          ),
        },
        {
          label: "One version, nothing changed",
          render: () => (
            <StaffPage as="div">
              <CampaignLetter changedHref="#changed" versions={exampleVersions.slice(0, 1)} changed={0} />
            </StaffPage>
          ),
        },
        {
          label: "No text",
          render: () => (
            <StaffPage as="div">
              <CampaignLetter changedHref="#changed" versions={[]} changed={0} />
            </StaffPage>
          ),
        },
      ],
    },
    {
      name: "CampaignView",
      file: "app/(staff)/staff/_components/CampaignView.tsx",
      variants: [
        {
          label: "With an ask",
          render: () => (
            <StaffPage as="div">
              <CampaignView
                campaign={exampleCampaign}
                versions={exampleVersions}
                changed={exampleChanged}
                letters={{
                  letters: [exampleLetter, { ...exampleLetter, id: 2, status: "sent", answer: "signed" }],
                  total: 150,
                  pages: 2,
                  pageSize: 100,
                }}
                search={emptyLettersSearch}
              />
            </StaffPage>
          ),
        },
        {
          label: "With no ask",
          render: () => (
            <StaffPage as="div">
              <CampaignView
                campaign={exampleCampaignNoAsk}
                versions={[]}
                changed={exampleChanged}
                letters={{ letters: [], total: 0, pages: 1, pageSize: 100 }}
                search={emptyLettersSearch}
              />
            </StaffPage>
          ),
        },
      ],
    },
    {
      name: "OneOffList",
      file: "app/(staff)/staff/_components/OneOffList.tsx",
      variants: [
        {
          label: "A thread with PauseAI, one with someone else, and one hidden",
          render: () => (
            <StaffPage as="div">
              <OneOffList
                threads={[...exampleOneOffs, exampleHiddenOneOff]}
                total={3}
                page={1}
                pages={1}
                pageSize={100}
              />
            </StaffPage>
          ),
        },
      ],
    },
    {
      name: "OneOffTable",
      file: "app/(staff)/staff/_components/OneOffList.tsx",
      variants: [
        {
          label: "On a person's page",
          render: () => (
            <StaffPage as="div">
              <OneOffTable threads={exampleOneOffs} />
            </StaffPage>
          ),
        },
      ],
    },
    {
      name: "OneOffThreadView",
      file: "app/(staff)/staff/_components/OneOffThreadView.tsx",
      variants: [
        {
          label: "A thread of two, one unreadable",
          render: () => (
            <StaffPage as="div">
              <OneOffThreadView thread={exampleOneOffThread} />
            </StaffPage>
          ),
        },
        {
          label: "Hidden from staff without supporters",
          render: () => (
            <StaffPage as="div">
              <OneOffThreadView thread={{ ...exampleHiddenOneOff, messages_: null }} />
            </StaffPage>
          ),
        },
      ],
    },
    {
      name: "LettersTable",
      file: "app/(staff)/staff/_components/LettersTable.tsx",
      variants: [
        {
          label:
            "A bounced letter to a test MP, a replied one, one with only an automatic reply, and one not sent as the MP's address was blocked",
          render: () => (
            <StaffPage as="div">
              <LettersTable
                letters={[
                  exampleLetter,
                  {
                    ...exampleLetter,
                    id: 2,
                    status: "sent",
                    senderName: "Example Sender",
                    senderEmail: "sender@example.org",
                    mpName: "Polly Placeholder",
                    isTest: false,
                    repliedAt: "2026-10-13T09:00:00Z",
                    events: [
                      { at: "2026-10-12T09:00:00Z", status: "sending", details: {} },
                      { at: "2026-10-12T09:05:00Z", status: "sent", details: {} },
                    ],
                  },
                  {
                    ...exampleLetter,
                    id: 4,
                    status: "sent",
                    senderName: "Sam Jones",
                    senderEmail: "sam@example.org",
                    mpName: "Polly Placeholder",
                    isTest: false,
                    autoRepliedAt: "2026-10-12T09:06:00Z",
                    events: [
                      { at: "2026-10-12T09:06:00Z", status: "auto_reply", details: {} },
                      { at: "2026-10-12T09:05:00Z", status: "sent", details: {} },
                      { at: "2026-10-12T09:00:00Z", status: "sending", details: {} },
                    ],
                  },
                  {
                    ...exampleLetter,
                    id: 3,
                    status: "not_sent",
                    mpName: "Bouncy McTestface MP",
                    backend: null,
                    sentAt: null,
                    events: [
                      { at: "2026-10-12T09:00:00Z", status: "sending", details: {} },
                      { at: "2026-10-12T09:00:00Z", status: "not_sent", details: {} },
                    ],
                  },
                ]}
              />
            </StaffPage>
          ),
        },
        {
          label: "None",
          render: () => (
            <StaffPage as="div">
              <LettersTable letters={[]} />
            </StaffPage>
          ),
        },
      ],
    },
    {
      name: "LetterView",
      file: "app/(staff)/staff/_components/LetterView.tsx",
      variants: [
        {
          label: "A mailing's letter and its reply, beside the ask, as a politician's page has it, and its history",
          render: () => (
            <StaffPage as="div">
              <MailingLetterViewExample />
            </StaffPage>
          ),
        },
        {
          label: "A supporter's letter to a test MP that bounced, beside its campaign's ask, not yet answered",
          render: () => (
            <StaffPage as="div">
              <SupporterLetterViewExample ask />
            </StaffPage>
          ),
        },
        {
          label: "One whose campaign makes no ask: the campaign alone",
          render: () => (
            <StaffPage as="div">
              <SupporterLetterViewExample ask={false} />
            </StaffPage>
          ),
        },
      ],
    },
    {
      name: "LetterHistory",
      file: "app/(staff)/staff/_components/LetterHistory.tsx",
      variants: [
        {
          label: "Nothing recorded yet",
          render: () => (
            <StaffPage as="div">
              <LetterHistory events={[]} />
            </StaffPage>
          ),
        },
        {
          label: "A supporter's letter copied from Airtable: when it was written, and sent, through Airtable",
          render: () => (
            <StaffPage as="div">
              <LetterHistory
                events={historyOf({
                  ...exampleSupporterLetterDetails,
                  backend: "airtable",
                  createdAt: "2026-09-30T18:00:00Z",
                  sentAt: "2026-09-30T18:02:00Z",
                  events: [],
                })}
              />
            </StaffPage>
          ),
        },
        {
          label:
            "Replies: who each was to, and what was done with it; an automatic reply to the bounce address, and the sender's follow-up",
          render: () => (
            <StaffPage as="div">
              <LetterHistory events={historyOf(exampleRepliedLetterDetails)} />
            </StaffPage>
          ),
        },
        {
          label: "Replies recorded before what was done with them was: the forwards logged, one refused",
          render: () => (
            <StaffPage as="div">
              <LetterHistory events={historyOf(exampleOlderRepliedLetterDetails)} />
            </StaffPage>
          ),
        },
      ],
    },
    {
      name: "FindInGmail",
      file: "app/(staff)/staff/_components/FindInGmail.tsx",
      variants: [
        {
          label: "A letter sent from policy@: copies the search for it, then says to paste it where policy@'s mail is",
          render: () => (
            <StaffPage as="div">
              <FindInGmail find={{ mailbox: "policy@pauseai.uk", search: "rfc822msgid:4f1c@pauseai.uk" }} />
            </StaffPage>
          ),
        },
        {
          label: "A supporter's letter sent while policy@ was a Google Group: paste it where its members' mail is",
          render: () => (
            <StaffPage as="div">
              <FindInGmail find={exampleSupporterLetterDetails.gmail} />
            </StaffPage>
          ),
        },
        {
          label: "One copied from Airtable, from a mailbox we don't know",
          render: () => (
            <StaffPage as="div">
              <FindInGmail find={examplePauseaiLetterDetails.gmail} />
            </StaffPage>
          ),
        },
      ],
    },
    {
      name: "CampaignName",
      file: "app/(staff)/staff/_components/CampaignName.tsx",
      variants: [
        {
          label: "Leading to its page, by its name or its slug; and plain, for staff who can't open it",
          render: () => (
            <StaffPage as="div">
              <p>
                <CampaignName slug={pm.slug} /> · <CampaignName slug="old-campaign" /> ·{" "}
                <CampaignName slug={pm.slug} linked={false} />
              </p>
            </StaffPage>
          ),
        },
      ],
    },
    {
      name: "LetterLink",
      file: "app/(staff)/staff/_components/LetterLink.tsx",
      variants: [
        {
          label: "A letter, by whom it was to",
          render: () => (
            <StaffPage as="div">
              <LetterLink letter={{ id: 17, to: "Bouncy McTestface MP" }} linked />
            </StaffPage>
          ),
        },
        {
          label: "Not linked, for staff without the supporters permission",
          render: () => (
            <StaffPage as="div">
              <LetterLink letter={{ id: 17, to: "Bouncy McTestface MP" }} linked={false} />
            </StaffPage>
          ),
        },
      ],
    },
  ],
};
