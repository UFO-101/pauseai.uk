// The blog's and the briefings' components, the donate page's and the events page's.
import PostBody from "@/components/posts/PostBody";
import PostCard, { type CardVariant } from "@/components/posts/PostCard";
import { examplePost } from "@/components/posts/PostCard.examples";
import PostHeader from "@/components/posts/PostHeader";
import PostList from "@/components/posts/PostList";
import BudgetChart from "@/components/briefings/BudgetChart";
import SignatoriesChart from "@/components/briefings/SignatoriesChart";
import WeekCalendar from "@/components/briefings/WeekCalendar";
import DonateBottom from "@/app/(site)/donate/_components/DonateBottom";
import DonateForm from "@/app/(site)/donate/_components/DonateForm";
import DonateIntro from "@/app/(site)/donate/_components/DonateIntro";
import DonateThanks from "@/app/(site)/donate/_components/DonateThanks";
import { exampleDonors } from "@/app/(site)/donate/_components/DonateThanks.examples";
import FindYourGroup from "@/app/(site)/events/_components/FindYourGroup";
import { BLOG, findPost, newestFirst, posts, type BlogPost } from "@/lib/content/blog";
import { BRIEFINGS, briefings } from "@/lib/content/briefings";
import type { Group } from "../_components/types";

/** A real post, by its slug. */
const post = (slug: string): BlogPost => findPost(slug)!;

// Posts of each kind: a photo by an author with a photo, a photo by an author
// without one, a diagram, and no image at all, by the organisation.
const BY_PERSON = post("the-other-alignment-problem");
const NO_AUTHOR_PHOTO = post("monopoly-on-ai-violence");
const DIAGRAM = post("you-cant-pause-ai-without-china");
const BY_ORGANISATION = post("burnham-global-ai-agreement-pause");

// Every card variant, so a new one is a type error until it's here.
const CARDS: Record<CardVariant, string> = {
  lead: "Lead",
  secondary: "Secondary",
  row: "Row",
};

export const blogDonateEvents: Group = {
  id: "blog-donate-events",
  title: "Blog, briefings, donate and events",
  examples: [
    {
      name: "PostCard",
      file: "components/posts/PostCard.tsx",
      variants: (Object.keys(CARDS) as CardVariant[]).map((variant) => ({
        label: `${CARDS[variant]}: a photo, an author without a photo, a diagram, no image`,
        render: () => (
          <div className="container" style={{ display: "grid", gap: 24 }}>
            {[BY_PERSON, NO_AUTHOR_PHOTO, DIAGRAM, examplePost].map((card) => (
              <PostCard key={card.slug} post={card} section={BLOG} variant={variant} />
            ))}
          </div>
        ),
      })),
    },
    {
      name: "PostList",
      file: "components/posts/PostList.tsx",
      variants: [
        {
          label: "Every post: a lead, a pair and the rest",
          render: () => <PostList posts={newestFirst(posts)} section={BLOG} />,
        },
        { label: "One post", render: () => <PostList posts={[examplePost]} section={BLOG} /> },
        { label: "The briefings", render: () => <PostList posts={newestFirst(briefings)} section={BRIEFINGS} /> },
      ],
    },
    {
      name: "PostHeader",
      file: "components/posts/PostHeader.tsx",
      variants: [
        { label: "By a person with a photo", render: () => <PostHeader post={BY_PERSON} section={BLOG} /> },
        { label: "By a person without a photo", render: () => <PostHeader post={NO_AUTHOR_PHOTO} section={BLOG} /> },
        { label: "By the organisation", render: () => <PostHeader post={BY_ORGANISATION} section={BLOG} /> },
        { label: "A briefing", render: () => <PostHeader post={briefings[0]} section={BRIEFINGS} /> },
      ],
    },
    {
      name: "PostBody",
      file: "components/posts/PostBody.tsx",
      variants: [
        { label: "Text alone", render: () => <PostBody post={examplePost} /> },
        {
          label: "With a TL;DR",
          render: () => <PostBody post={{ ...examplePost, tldrContent: "A short version of the post." }} />,
        },
      ],
    },
    {
      name: "BudgetChart",
      file: "components/briefings/BudgetChart.tsx",
      variants: [
        {
          label: "Groups of items, each its own colour and hatching",
          render: () => (
            <div className="container">
              <BudgetChart
                totalLabel="£300m in total"
                purposeHeading="What it’s for"
                caption="£ millions."
                groups={[
                  {
                    name: "Security",
                    tone: "orange",
                    items: [
                      { name: "A testing lab", amount: 120, purpose: "Tests frontier AI for dangers" },
                      { name: "A cyber unit ★", amount: 40, purpose: "Watches for rogue AI agents" },
                    ],
                  },
                  {
                    name: "Industry",
                    tone: "blue",
                    items: [{ name: "A sovereign fund", amount: 90, purpose: "Invests in British AI firms" }],
                  },
                  {
                    name: "Jobs",
                    tone: "green",
                    items: [{ name: "A research programme", amount: 50, purpose: "Tracks how AI reshapes work" }],
                  },
                ]}
              />
            </div>
          ),
        },
      ],
    },
    {
      name: "SignatoriesChart",
      file: "components/briefings/SignatoriesChart.tsx",
      variants: [
        {
          label: "Two counts, a meeting after them, and who hasn't signed",
          render: () => (
            <div className="container">
              <SignatoriesChart
                title="Countries backing a call"
                counts={[
                  { value: 12, date: "1 Sep", note: "launch" },
                  { value: 20, date: "1 Oct", note: "latest" },
                ]}
                event={{ date: "8 Oct meeting", note: "18 countries" }}
                callout="UK: NOT SIGNED"
                cite={<sup>1</sup>}
              />
            </div>
          ),
        },
      ],
    },
    {
      name: "WeekCalendar",
      file: "components/briefings/WeekCalendar.tsx",
      variants: [
        {
          label: "A week, some days busy",
          render: () => (
            <div className="container">
              <WeekCalendar
                days={[
                  { date: "2026-11-02", events: ["Lords 3rd reading", "A summit"] },
                  { date: "2026-11-03", events: ["An election"] },
                  { date: "2026-11-04", events: [] },
                  { date: "2026-11-05", events: ["A consultation closes"] },
                  { date: "2026-11-06", events: [] },
                ]}
              />
            </div>
          ),
        },
      ],
    },
    {
      name: "DonateIntro",
      file: "app/(site)/donate/_components/DonateIntro.tsx",
      variants: [
        {
          label: "Why to give, beside the form and the latest donors",
          render: () => <DonateIntro donors={exampleDonors} />,
        },
        { label: "Before anyone has said yes", render: () => <DonateIntro donors={[]} /> },
      ],
    },
    {
      name: "DonateForm",
      file: "app/(site)/donate/_components/DonateForm.tsx",
      variants: [
        {
          label: "Monthly, at the default amount",
          render: () => (
            <div className="container" style={{ maxWidth: 480 }}>
              <DonateForm />
            </div>
          ),
        },
      ],
    },
    {
      name: "DonateThanks",
      file: "app/(site)/donate/_components/DonateThanks.tsx",
      variants: [
        {
          label: "Six donors, more than fit, so the list rolls",
          render: () => (
            <div className="container" style={{ maxWidth: 480 }}>
              <DonateThanks donors={exampleDonors} />
            </div>
          ),
        },
        {
          label: "One donor",
          render: () => (
            <div className="container" style={{ maxWidth: 480 }}>
              <DonateThanks donors={exampleDonors.slice(0, 1)} />
            </div>
          ),
        },
      ],
    },
    {
      name: "DonateBottom",
      file: "app/(site)/donate/_components/DonateBottom.tsx",
      variants: [{ label: "Other ways to give, and questions", render: () => <DonateBottom /> }],
    },
    {
      name: "FindYourGroup",
      file: "app/(site)/events/_components/FindYourGroup.tsx",
      variants: [
        {
          label: "A line under the events",
          render: () => (
            <div className="container">
              <FindYourGroup />
            </div>
          ),
        },
      ],
    },
  ],
};
