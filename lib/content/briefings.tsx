import { Fragment } from "react";
import BudgetChart from "@/components/briefings/BudgetChart";
import SignatoriesChart from "@/components/briefings/SignatoriesChart";
import WeekCalendar from "@/components/briefings/WeekCalendar";
import Tag from "@/components/ui/Tag";
import { checkPostAuthors, type BlogPost, type PostSection } from "./blog";

// The campaigns' briefings: posts like the blog's, in a section of their own,
// each a week's news, with its sources as numbered notes at the end.

export const BRIEFINGS: PostSection = {
  path: "/campaigns/briefings",
  backLink: "← All briefings",
  moreHeading: "More briefings",
  feedTitle: "PauseAI UK Weekly briefings",
};

/** Marks citing a briefing's sources by number, each linking to its note: "2,3". */
function cite(...sources: number[]) {
  return (
    <sup>
      {sources.map((source, i) => (
        <Fragment key={source}>
          {i > 0 && ","}
          <a href={`#source-${source}`} aria-label={`Source ${source}`}>
            {source}
          </a>
        </Fragment>
      ))}
    </sup>
  );
}

export const briefings: BlogPost[] = [
  {
    slug: "ai-news-weekly-briefing-23rd-30th-october",
    title: "AI News Weekly Briefing - 23rd-30th October",
    date: "2026-10-30",
    author: "Annabelle Collins",
    tldr: "Monday: Anthropic files to go public. Wednesday: Budget released. £700m for AI",
    content: (
      <>
        <WeekCalendar
          days={[
            { date: "2026-10-26", events: ["Lords: Cyber Bill", "Anthropic files S-1"] },
            { date: "2026-10-27", events: [] },
            { date: "2026-10-28", events: ["Budget day", "Nordic AI meeting"] },
            { date: "2026-10-29", events: [] },
            { date: "2026-10-30", events: [] },
          ]}
        />

        <h2>Key stories this week</h2>
        <ul>
          <li>
            <strong>Monday: Anthropic files to go public.</strong> Anthropic, one of the big two “frontier” AI
            companies, filed its IPO to list on the US stock market.{cite(1)}
            <br />
            Its prospectus warns that AI models, including its own, have shown{" "}
            <em>“self-preserving behaviors, including attempts to resist shutdown”</em>, and says it now uses its AI to
            help build the next successor model.{cite(1)}
          </li>
          <li>
            <strong>Wednesday: Budget released. £700m for AI</strong> Roughly £480m goes on AI security, including a new
            AI Biosecurity Lab and £120m more for the AI Security Institute.{cite(2, 3)}
          </li>
        </ul>

        <h2>Budget Breakdown</h2>
        <p>This week Chancellor John Healey released his first budget, committing ~£700M funding for AI.{cite(3)}</p>
        <p>
          Most of it pays for defences against AI-enabled threats such as engineered pathogens or rogue AI agents.
          {cite(2, 3)}
        </p>
        <blockquote>
          <p>
            <em>“Nowhere is the necessary role for the state clearer than in Artificial Intelligence.”</em>
            {cite(4)}
          </p>
          <p className="blog-quote-source">John Healey, Budget speech</p>
        </blockquote>
        <BudgetChart
          totalLabel="£695m in total"
          purposeHeading="What it’s for"
          groups={[
            {
              name: "Security & safety",
              tone: "orange",
              items: [
                {
                  name: "National AI Biosecurity Initiative",
                  amount: 165,
                  purpose: "£100m bio-threat lab + £65m surveillance",
                },
                {
                  name: "AI Security Institute (top-up)",
                  amount: 120,
                  purpose: "State lab testing frontier AI for dangers",
                },
                { name: "NERV vulnerability centre", amount: 70, purpose: "AI hunts weak spots in key infrastructure" },
                { name: "National Cyber Shield", amount: 60, purpose: "AI agents defending UK networks" },
                { name: "Agentic security unit ★", amount: 40, purpose: "Watches for rogue AI agents; responds" },
                { name: "Public-services cyber ★", amount: 24, purpose: "Protects hospitals, schools and councils" },
              ],
            },
            {
              name: "Sovereignty & industry",
              tone: "blue",
              items: [
                { name: "Sovereign AI Fund (top-up)", amount: 60, purpose: "Invests directly in British AI firms" },
                {
                  name: "Sovereign AI R&D procurement",
                  amount: 60,
                  purpose: "State buys UK-built AI (health, security)",
                },
                { name: "Advanced Chip Design Academy", amount: 18, purpose: "Trains British chip designers" },
              ],
            },
            {
              name: "Jobs & the public",
              tone: "green",
              items: [
                { name: "Local AI partnerships (mayors)", amount: 30, purpose: "Mayor-led AI adoption in the regions" },
                {
                  name: "AI Economics Institute (3 yrs)",
                  amount: 23,
                  purpose: "Studies AI’s effect on growth and jobs",
                },
                { name: "AI Challenge Prize", amount: 15, purpose: "Rewards AI that fixes everyday problems" },
                { name: "AI & jobs research (per year)", amount: 10, purpose: "Tracks how AI reshapes work" },
              ],
            },
          ]}
          caption={
            <>
              £ millions. ★ = first reported on Budget day (City A.M.). Model credits from OpenAI and Anthropic (up to
              £200m) not shown.{cite(2, 3)}
            </>
          }
        />

        <h2>Anthropic’s IPO filing</h2>
        <p>
          Anthropic, the company making the Claude AI models and one of the two leading &quot;frontier&quot; AI
          developers, is going public. On Monday it released it’s S1.{cite(1)}
          <br />
          This is an IPO prospectus and and the company is legally liable if it leaves out or misstates material risks.
        </p>
        <blockquote>
          <p>
            <em>
              “Our ability to maintain our position at the frontier of AI depends in part on our use of AI systems to
              accelerate our research processes, a recursive dynamic we refer to as “closing the loop,” in which
              successive versions of our models assist in building the next, with the goal of compounding capability
              gains over time.”
            </em>
            {cite(1)}
          </p>
          <p className="blog-quote-source">- Anthropic S1 filing</p>
        </blockquote>
        <blockquote>
          <p>
            <em>
              “They gave an account in here about how the company&apos;s models have exhibited what they call
              ‘unexpected, strategic, or self-preserving behaviors’, including attempts to resist shutdown, conceal or
              manipulate information, or generate outputs that could be interpreted as coercive, deceptive, or
              manipulative.”
            </em>
            {cite(9)}
          </p>
          <p className="blog-quote-source">- Casey Newton, Machine Gods 28th Oct</p>
        </blockquote>

        <h2>In Westminster this week</h2>
        <h3>Mon 26 Oct - Lords - Cyber Security and Resilience Bill, report stage</h3>
        <p>
          The government has said it will use this Bill to bring in its first protections against AI risks.{cite(5)}{" "}
          These include AI “loss of control”, where autonomous AI systems evade human oversight.{cite(5)} The report
          stage is the Lords’ last detailed chance to change the Bill.
        </p>
        <p>
          <strong>What changed on Monday? Now …</strong>
        </p>
        <ul>
          <li>
            Within a year, ministers must review whether the AI Security Institute (AISI) should get legal powers, such
            as auditing frontier AI before release.{cite(6, 7)}
          </li>
          <li>
            If an AI model causes an incident, the duty to report stays with the organisation that was hit, such as a
            hospital or utility, not the model’s developer.{cite(6, 7)}
          </li>
          <li>
            New “loss of control” powers. If an AI agent escapes human control and causes a cyber incident, regulations
            can give ministers powers to send in inspectors after that incident. Those investigators could enter
            premises, run tests, demand information held abroad and fine firms.{cite(6, 7)}
          </li>
        </ul>
        <p>
          <strong>The third reading will be on Monday 2 Nov.{cite(7)}</strong>
        </p>
        <h3>
          26th Oct - Commons - Debate on Emerging risks of advanced AI debate - <Tag tone="red">POSTPONED</Tag>
        </h3>
        <p>
          This was due to be the first Commons debate on regulating advanced AI, led by Plaid Cymru MP Ben Lake.
          {cite(8)} It was postponed for lack of time.
          <br />A new date may be announced in the Business Statement on Thursday 5 November.
        </p>

        <h2>International Cooperation</h2>
        <p>
          On Wed 28th October world leaders from 29 countries attended a virtual meeting hosted by Finnish President and
          Norwegian Prime Minister. This followed up on the “Call for Control of Frontier AI Models” from last month,
          calling for a global AI oversight body.{cite(10, 11)}
        </p>
        <p>
          Political leaders from 29 countries across the world discussed international cooperation in AI risk
          management, and their vision the path to establishing common standards.{cite(10)}
        </p>
        <p>The UK has not signed and did not attend the meeting.{cite(11)}</p>
        <SignatoriesChart
          title="Countries backing the Call"
          counts={[
            { value: 22, date: "21 Sep", note: "launch" },
            { value: 31, date: "23 Oct", note: "latest" },
          ]}
          event={{ date: "28 Oct meeting", note: "29 countries" }}
          callout="UK: NOT SIGNED"
          cite={cite(10, 11)}
        />

        <h2>Good news!</h2>
        <p>
          400 more patients a month learn of a suspected lung cancer within 24 hours thanks to AI helping NHS clinicians
          read chest X-rays.{cite(2)}
        </p>
        <p>11.5% of patients receive faster diagnosis and wait for follow-up CT scans have fallen.{cite(2)}</p>

        <h2>Next week key dates</h2>
        <WeekCalendar
          days={[
            { date: "2026-11-02", events: ["Lords 3rd reading", "Sovereign AI Summit"] },
            { date: "2026-11-03", events: ["US midterms"] },
            { date: "2026-11-04", events: ["NI consultation closes"] },
            { date: "2026-11-05", events: [] },
            { date: "2026-11-06", events: [] },
          ]}
        />
        <ul>
          <li>
            <strong>2 Nov:</strong> Lords third reading of the Cyber Security and Resilience Bill, and the UKAI
            Sovereign AI Summit.{cite(7, 12)}
          </li>
          <li>
            <strong>3 Nov:</strong> US midterms.
          </li>
          <li>
            <strong>4 Nov:</strong> Northern Ireland’s AI strategy consultation closes.{cite(13)}
          </li>
        </ul>
        <p>
          <strong>Further ahead · Fri 13 Nov</strong> Second reading of Alex Sobel MP’s Artificial Superintelligence
          Bill, a ten-minute rule bill to ban superintelligent AI.{cite(14)}
        </p>

        <h2>Sources</h2>
        <ol className="blog-footnotes">
          <li id="source-1">
            Anthropic, PBC (2026) <em>Form S-1 registration statement</em>. Filed with the US Securities and Exchange
            Commission, 26 October. ‘Risk Factors’, pp. 28 and 46. Available at:{" "}
            <a
              href="https://www.sec.gov/Archives/edgar/data/0002130357/000162828026067168/anthropicpbc-sx1.htm"
              target="_blank"
              rel="noreferrer"
            >
              https://www.sec.gov/Archives/edgar/data/0002130357/000162828026067168/anthropicpbc-sx1.htm
            </a>{" "}
            (Accessed: 30 October 2026).
          </li>
          <li id="source-2">
            HM Treasury, Jarvis, D., Healey, J. and Narayan, K. (2026){" "}
            <em>Chancellor unveils Britain’s ambitious plan for AI</em>. GOV.UK, 24 October. Available at:{" "}
            <a
              href="https://www.gov.uk/government/news/chancellor-unveils-britains-ambitious-plan-for-ai"
              target="_blank"
              rel="noreferrer"
            >
              https://www.gov.uk/government/news/chancellor-unveils-britains-ambitious-plan-for-ai
            </a>{" "}
            (Accessed: 30 October 2026).
          </li>
          <li id="source-3">
            City A.M. (2026) ‘Budget 2026: Healey bets £700m on AI to boost British tech firms’, <em>City A.M.</em>, 28
            October. Available at:{" "}
            <a
              href="https://www.cityam.com/budget-2026-healey-bets-700m-on-ai-to-boost-british-tech-firms/"
              target="_blank"
              rel="noreferrer"
            >
              https://www.cityam.com/budget-2026-healey-bets-700m-on-ai-to-boost-british-tech-firms/
            </a>{" "}
            (Accessed: 30 October 2026).
          </li>
          <li id="source-4">
            HM Treasury and Healey, J. (2026) <em>Budget 2026 speech</em>. GOV.UK, 28 October. Available at:{" "}
            <a href="https://www.gov.uk/government/speeches/budget-2026-speech" target="_blank" rel="noreferrer">
              https://www.gov.uk/government/speeches/budget-2026-speech
            </a>{" "}
            (Accessed: 30 October 2026).
          </li>
          <li id="source-5">
            Cabinet Office, AI Security Institute, National Cyber Security Centre and DCMS (2026){" "}
            <em>Britain steps up national defences against growing AI risks</em>. GOV.UK, 12 October. Available at:{" "}
            <a
              href="https://gov.uk/government/news/britain-steps-up-national-defences-against-growing-ai-risks"
              target="_blank"
              rel="noreferrer"
            >
              https://gov.uk/government/news/britain-steps-up-national-defences-against-growing-ai-risks
            </a>{" "}
            (Accessed: 30 October 2026).
          </li>
          <li id="source-6">
            Hansard (2026) <em>Cyber Security and Resilience (Network and Information Systems) Bill</em>, Report stage.
            HL Deb, 26 October. Available at:{" "}
            <a
              href="https://hansard.parliament.uk/Lords/2026-10-26/debates/B413EFAE-E7D4-4742-986D-092884E0D8D1/CyberSecurityAndResilience(NetworkAndInformationSystems)Bill"
              target="_blank"
              rel="noreferrer"
            >
              https://hansard.parliament.uk/Lords/2026-10-26/debates/B413EFAE-E7D4-4742-986D-092884E0D8D1/CyberSecurityAndResilience(NetworkAndInformationSystems)Bill
            </a>{" "}
            (Accessed: 30 October 2026).
          </li>
          <li id="source-7">
            Resultsense (2026) ‘Ministers kept AISI voluntary to protect its access. Peers voted for a review’,{" "}
            <em>Resultsense Insights</em>, 27 October. Available at:{" "}
            <a
              href="https://www.resultsense.com/insights/2026-10-27-aisi-voluntary-access-lords-review-cyber-bill/"
              target="_blank"
              rel="noreferrer"
            >
              https://www.resultsense.com/insights/2026-10-27-aisi-voluntary-access-lords-review-cyber-bill/
            </a>{" "}
            (Accessed: 30 October 2026).
          </li>
          <li id="source-8">
            Carmarthenshire News Online (2026) ‘Ben Lake MP to lead first Commons debate on regulating advanced AI’, 26
            October. Available at:{" "}
            <a
              href="https://www.carmarthenshirenewsonline.com/nationalnews/ben-lake-mp-to-lead-first-commons-debate-on-regulating-advanced-ai/"
              target="_blank"
              rel="noreferrer"
            >
              https://www.carmarthenshirenewsonline.com/nationalnews/ben-lake-mp-to-lead-first-commons-debate-on-regulating-advanced-ai/
            </a>{" "}
            (Accessed: 30 October 2026).
          </li>
          <li id="source-9">
            NPR (2026) ‘Inside Anthropic’s IPO + How AI Agents Spy on Your Messages’, <em>Machine Gods</em> [podcast
            transcript], October. Available at:{" "}
            <a href="https://www.npr.org/transcripts/nx-s1-6019724" target="_blank" rel="noreferrer">
              https://www.npr.org/transcripts/nx-s1-6019724
            </a>{" "}
            (Accessed: 30 October 2026).
          </li>
          <li id="source-10">
            Government of Norway (2026){" "}
            <em>
              Joint statement by President of the Republic of Finland Alexander Stubb and Prime Minister of Norway Jonas
              Gahr Støre on how to follow up the call for control over development of frontier AI models
            </em>
            . Regjeringen.no, October. Available at:{" "}
            <a
              href="https://www.regjeringen.no/no/whats-new/joint-statement-how-to-follow-up-the-call-for-control-over-development-of-frontier-ai-models/id3186489/"
              target="_blank"
              rel="noreferrer"
            >
              https://www.regjeringen.no/no/whats-new/joint-statement-how-to-follow-up-the-call-for-control-over-development-of-frontier-ai-models/id3186489/
            </a>{" "}
            (Accessed: 30 October 2026).
          </li>
          <li id="source-11">
            Office of the President of the Republic of Finland (2026){" "}
            <em>
              President Stubb and Prime Minister of Norway: the rapid development of AI requires international
              cooperation
            </em>
            , 21 September (signatory list updated 23 October). Available at:{" "}
            <a
              href="https://www.presidentti.fi/en/president-stubb-and-prime-minister-of-norway-the-rapid-development-of-ai-requires-international-cooperation/"
              target="_blank"
              rel="noreferrer"
            >
              https://www.presidentti.fi/en/president-stubb-and-prime-minister-of-norway-the-rapid-development-of-ai-requires-international-cooperation/
            </a>{" "}
            (Accessed: 30 October 2026).
          </li>
          <li id="source-12">
            All AI Events (2026) <em>Sovereign AI Summit</em>, 2 November, London (UKAI events calendar). Available at:{" "}
            <a href="https://allai.events/event/sovereign-ai-summit" target="_blank" rel="noreferrer">
              https://allai.events/event/sovereign-ai-summit
            </a>{" "}
            (Accessed: 30 October 2026).
          </li>
          <li id="source-13">
            The Executive Office (2026){" "}
            <em>Northern Ireland’s draft Artificial Intelligence Strategy: public consultation</em>, 12 August – 4
            November. Available at:{" "}
            <a
              href="https://www.executiveoffice-ni.gov.uk/consultations/northern-irelands-draft-artificial-intelligence-strategy"
              target="_blank"
              rel="noreferrer"
            >
              https://www.executiveoffice-ni.gov.uk/consultations/northern-irelands-draft-artificial-intelligence-strategy
            </a>{" "}
            (Accessed: 30 October 2026).
          </li>
          <li id="source-14">
            Hansard (2026) <em>Artificial Superintelligence: motion for leave to bring in a Bill</em> (Alex Sobel MP).
            HC Deb, 8 September. Bill 142, second reading set for 13 November.
          </li>
        </ol>
      </>
    ),
  },
];

checkPostAuthors(briefings);

export function findBriefing(slug: string): BlogPost | undefined {
  return briefings.find((briefing) => briefing.slug === slug);
}
