import type { ReactNode } from "react";
import { people, personSlug, type Person } from "./people";

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
