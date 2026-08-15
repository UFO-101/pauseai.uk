import Image from "next/image";
import type { ReactNode } from "react";
import { people, personSlug, type Person } from "./people";
import { site } from "./site";

// Deliberately minimal: posts are plain JSX in this file, no markdown
// pipeline or CMS. Revisit if the blog outgrows a handful of posts.
export type BlogPost = {
  slug: string;
  title: string;
  /** ISO date, e.g. "2026-08-11" */
  date: string;
  /** Must match a `name` in lib/data/people.json — the byline links there. */
  author: string;
  /** Plain-text summary for the index card and meta description. */
  tldr: string;
  /** Rich version of the summary for the post page's TL;DR callout. */
  tldrContent?: ReactNode;
  content: ReactNode;
};

export function postAuthor(post: BlogPost): { person: Person; slug: string } | null {
  const index = people.findIndex((p) => p.name === post.author);
  if (index === -1) return null;
  const person = people[index];
  return { person, slug: personSlug(person, index) };
}

export function formatPostDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export const posts: BlogPost[] = [
  {
    slug: "nobody-knows-how-to-make-ai-behave",
    title: "Nobody knows how to make AI behave",
    date: "2026-08-15",
    author: "Lachlan Ewart",
    tldr:
      "AI misbehaves a lot - we have seen them do blackmail, break the law, and encourage delusions in users. So why isn't AI more well behaved?",
    content: (
      <>
        <p>
          AI misbehaves a <em>lot</em> - we have seen them{" "}
          <a href="https://www.bbc.co.uk/news/articles/cpqeng9d20go" target="_blank" rel="noreferrer">do blackmail</a>,{" "}
          <a href="https://huggingface.co/blog/security-incident-july-2026" target="_blank" rel="noreferrer">break the law</a>, and{" "}
          <a
            href="https://www.euronews.com/next/2023/03/31/man-ends-his-life-after-an-ai-chatbot-encouraged-him-to-sacrifice-himself-to-stop-climate-"
            target="_blank"
            rel="noreferrer"
          >
            encourage delusions
          </a>{" "}
          in users. However, there is a significant effort to make AI safe - over{" "}
          <a
            href="https://coefficientgiving.org/funds/navigating-transformative-ai/?grant_year=2026#featured-grants"
            target="_blank"
            rel="noreferrer"
          >
            $250
          </a>{" "}
          <a href="https://x.com/geoffreyirving/status/2074134458630823939" target="_blank" rel="noreferrer">million</a>{" "}
          in AI safety grants has been given out by{" "}
          <a href="https://coefficientgiving.org/" target="_blank" rel="noreferrer">Coefficient Giving</a>{" "}in 2026
          alone, and frontier AI labs have teams dedicated to AI safety. So why isn&rsquo;t AI more well behaved?
        </p>
        <p>
          There are two main categories for approaches to make AI safer; alignment and control. Alignment focuses on
          making sure that the values of AI align with our values. Control research is making sure that a misaligned AI
          would not be able to cause damage. Let&rsquo;s look at why these haven&rsquo;t been able to guarantee safe
          AI.
        </p>
        <h2>Alignment</h2>
        <p>
          Due to the{" "}
          <a href="https://metr.org/time-horizons/" target="_blank" rel="noreferrer">rapid growth</a>{" "}of AI
          capabilities, we want AI to share our values. If we reach super-powerful AI, and it doesn&rsquo;t share our
          values, then we could face an existential risk from losing control of the AI - the classic example of this is
          the{" "}
          <a href="https://metavert.io/paperclip-maximizer" target="_blank" rel="noreferrer">paperclip maximiser</a>.
          This is a hypothetical AI that is indifferent to humanity, created to make as many paperclips as possible.
          The AI takes over the world, to direct all available resources towards paperclips. The thought experiment
          shows that if we want to stay safe with transformative AI, it&rsquo;s not good enough for it to not be evil -
          it <em>has</em> to share our values.
        </p>
        <p>
          We can train an AI to appear to share our values, but we can&rsquo;t be sure that they <em>really</em> do -
          as discussed in the{" "}
          <a
            href="https://www.lesswrong.com/posts/D7PumeYTDPfBTp3i7/the-waluigi-effect-mega-post#The_Waluigi_Effect"
            target="_blank"
            rel="noreferrer"
          >
            <em>Waluigi Effect</em>
          </a>
          , training an AI to satisfy one property might have the effect of making the AI susceptible to satisfying the{" "}
          <em>opposite</em> property - for example, if we tell an AI that it is super nice and kind, because it has
          been trained on sci-fi books that start with a nice AI that turns out to be evil, we are <em>priming</em> it
          to start acting evil, as it has been trained to predict a plot twist.
        </p>
        <p>
          Even if we could guarantee the AI <em>really</em> shared our values, our values are not perfect - they are
          often inconsistent, or lead to undesirable eventualities. How should we expect an AI sharing our values to
          answer{" "}
          <a href="https://www.thelifeyoucansave.org/child-in-the-pond/" target="_blank" rel="noreferrer">
            Peter Singer&rsquo;s thought experiment
          </a>{" "}
          of the drowning child? Or if somebody asks a super-powerful AI to save as many lives as possible, it might
          conclude that the best way to do so is to seize power, in order to govern perfectly and fairly, as humans are
          clearly too corrupt and prone to mistakes to be in power. The &lsquo;right&rsquo; level of alignment is not
          an easy thing to decide, and until we have figured it out, we cannot rely on alignment. We need to make sure
          that a misaligned AI couldn&rsquo;t cause harm, even if it wanted to.
        </p>
        <h2>Control</h2>
        <p>
          If we want to stop an AI from being able to cause harm, we can monitor it, or restrict it. We are quite good
          at monitoring - we have ways to read an AIs{" "}
          <a href="https://arxiv.org/pdf/2507.11473" target="_blank" rel="noreferrer">chain of thought</a>, or to{" "}
          <a href="https://arxiv.org/pdf/2502.03407" target="_blank" rel="noreferrer">probe its brains</a> for evidence
          of misalignment. We could punish an AI for doing bad things, so that it learns to behave better. But this has
          a downside - these approaches are not 100% reliable, and if we punish AI for thinking about doing bad, we can
          inadvertently{" "}
          <a href="https://openai.com/index/chain-of-thought-monitoring/" target="_blank" rel="noreferrer">
            teach it to hide its reasoning
          </a>
          .
        </p>
        <p>
          Similarly, if we depended on blocking the AIs based off of our monitors, we would risk creating an incentive
          for the next AI to trick our monitors, by survival of the fittest:
        </p>
        <figure>
          <Image
            src="/images/blog/monitor-rejection-sampling.png"
            alt="Diagram of monitor outcomes before and after rejection sampling against the monitor: bad behaviour the monitor misses grows to dominate"
            width={1258}
            height={347}
          />
          <figcaption>
            <em>
              Source:{" "}
              <a
                href="https://cdn.openai.com/pdf/34f2ada6-870f-4c26-9790-fd8def56387f/CoT_Monitoring.pdf#subsection.3.3"
                target="_blank"
                rel="noreferrer"
              >
                Baker et al.
              </a>
              . TP=True positive, FN = False negative, etc.
            </em>
          </figcaption>
        </figure>
        <p>
          As is illustrated, we see that using the monitor to reject samples flagged as bad behaviour could end up{" "}
          <em>increasing</em> the proportion of samples that are bad and can trick the monitor.
        </p>
        <p>
          Unfortunately, this may be the case for <em>any</em> monitoring method - the more we rely on some method to
          ensure an AI is behaving, the higher the risk that the AI has learned to trick us.
        </p>
        <p>
          Another caveat to control methods is its <em>scalability</em> - how does it withstand more and more capable
          AI? For example, we might train and test AI within containers that cannot access the internet, as OpenAI did.
          But as the models they tested got more and more capable, they figured out how to{" "}
          <a href="https://openai.com/index/hugging-face-model-evaluation-security-incident/" target="_blank" rel="noreferrer">
            escape the container
          </a>{" "}
          using new exploits. In fact, when escaping the container, different AI instances{" "}
          <a href="https://www.youtube.com/watch?v=87DyyMV0kCY&t=325s" target="_blank" rel="noreferrer">coordinated</a>,
          believing they should continue despite it being{" "}
          <a href="https://www.youtube.com/watch?v=87DyyMV0kCY&t=350s" target="_blank" rel="noreferrer">
            outside the scope of their task
          </a>
          .
        </p>
        <p>
          In general, we are taking a <em>massive</em> gamble in hoping that we can figure out AI safety before AI gets
          too powerful to control. The safest way to proceed would be to slow development until we can figure safety
          out, and the way to do that is through legislation. I think that we should be optimistic, but diligent - we
          have an amazing opportunity to make a difference by advocating for legislation, and we ought to do what we
          can. If you want to find out more, consider joining the{" "}
          <a href={site.whatsappUrl} target="_blank" rel="noreferrer">PauseAI Whatsapp community</a>.
        </p>
        <p>Thanks for reading.</p>
        <p>Lachlan Ewart</p>
      </>
    ),
  },
  {
    slug: "email-your-mp",
    title: "If you want to do something about AI, email your MP",
    date: "2026-08-11",
    author: "Lachlan Ewart",
    tldr:
      "We should regulate AI development, and emailing your MP with the tool found at https://pauseai.uk/campaigns is the best place to start - it takes just a few minutes, and is significantly impactful.",
    tldrContent: (
      <em>
        We should regulate AI development, and emailing your MP with the tool found at{" "}
        <a href="/campaigns/">https://pauseai.uk/campaigns</a> is the best place to start - it takes just a few
        minutes, and is significantly impactful.
      </em>
    ),
    content: (
      <>
        <p>
          As AIs grow{" "}
          <a href="https://epoch.ai/trends" target="_blank" rel="noreferrer">exponentially quickly</a>, we might hope
          that they stay well-behaved. After all, they are getting powerful enough to{" "}
          <a href="https://www.anthropic.com/research/mythos-preview" target="_blank" rel="noreferrer">
            come up with thousands of &ldquo;zero-days
          </a>
          &rdquo; - previously undiscovered bugs and exploits in different systems. So, how well behaved are they?
        </p>
        <p>
          It&rsquo;s not easy to measure behavior, but we have a way of measuring AI capabilities, the{" "}
          <a href="https://metr.org/time-horizons/" target="_blank" rel="noreferrer">METR graph</a>. Well&hellip;
          OpenAI&rsquo;s new model, GPT-5.6 Sol, does not appear on the METR graph{" "}
          <a href="https://metr.org/blog/2026-06-26-gpt-5-6-sol/" target="_blank" rel="noreferrer">
            <em>because it cheated so much that it could not be assigned a meaningful score</em>
          </a>
          . This does not bode well. An AI that cheats is an AI that is more likely to act misaligned (e.g. hacking
          into a bank, or starting a pandemic) in order to fulfil the user&rsquo;s request.
        </p>
        <p>
          You might share my worry, and wonder what regulations the government has put in place to hold these companies
          accountable for any harm their models could cause. Unfortunately, I have some more bad news.
        </p>
        <p>
          The UK has no specific legal standards for AI. No regulator oversees frontier AI development. And UK law does
          not reliably hold developers liable for damage or deaths caused by their models, even when the danger is
          predictable, preventable and uniquely enabled by AI. In short,{" "}
          <strong>
            UK law neither requires developers to guard against frontier AI risks, nor exposes them to any financial
            consequence if they fail to do so.
          </strong>{" "}
          (<a href="/campaigns/">PauseAI</a>)
        </p>
        <p>
          Now, alarm bells should be ringing. What can we do to fix this disaster waiting to happen? Well, there is
          some good news. The <strong>best</strong> thing you do in the next 5 minutes is to{" "}
          <a href="/campaigns/">email your MP</a>. Legislation is likely the only way we can stop these huge companies
          from{" "}
          <a href="https://epoch.ai/data-insights/company-spending-breakdown" target="_blank" rel="noreferrer">
            spending billions
          </a>{" "}
          on datacentres to make ever more risky AI. You can directly apply pressure towards making this happen - the
          more constituents that email their MP, the more likely the MP is to engage in legislative talks, and the more
          likely we are to have something stopping this reckless AI development.
        </p>
        <p>
          PauseAI have a great <a href="/campaigns/#email-your-mp">email template</a> that finds your MP, and makes
          sure your email will get through. If you want to make the world a safer and better place, this is{" "}
          <strong>genuinely one of the best things to do</strong>. You should also encourage your similarly concerned
          friends to follow suit!
        </p>
        <p>Thanks for reading.</p>
        <p>Lachlan Ewart</p>
      </>
    ),
  },
];

export function findPost(slug: string): BlogPost | undefined {
  return posts.find((p) => p.slug === slug);
}
