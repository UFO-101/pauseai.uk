// The blog's, the donate page's and the events page's components.
import PostBody from "@/app/(site)/blog/_components/PostBody";
import PostCard, { type CardVariant } from "@/app/(site)/blog/_components/PostCard";
import { examplePost } from "@/app/(site)/blog/_components/PostCard.examples";
import PostHeader from "@/app/(site)/blog/_components/PostHeader";
import PostList from "@/app/(site)/blog/_components/PostList";
import DonateBottom from "@/app/(site)/donate/_components/DonateBottom";
import DonateForm from "@/app/(site)/donate/_components/DonateForm";
import DonateIntro from "@/app/(site)/donate/_components/DonateIntro";
import DonateThanks from "@/app/(site)/donate/_components/DonateThanks";
import { exampleDonors } from "@/app/(site)/donate/_components/DonateThanks.examples";
import FindYourGroup from "@/app/(site)/events/_components/FindYourGroup";
import { findPost, postsNewestFirst, type BlogPost } from "@/lib/content/blog";
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
  title: "Blog, donate and events",
  examples: [
    {
      name: "PostCard",
      file: "app/(site)/blog/_components/PostCard.tsx",
      variants: (Object.keys(CARDS) as CardVariant[]).map((variant) => ({
        label: `${CARDS[variant]}: a photo, an author without a photo, a diagram, no image`,
        render: () => (
          <div className="container" style={{ display: "grid", gap: 24 }}>
            {[BY_PERSON, NO_AUTHOR_PHOTO, DIAGRAM, examplePost].map((card) => (
              <PostCard key={card.slug} post={card} variant={variant} />
            ))}
          </div>
        ),
      })),
    },
    {
      name: "PostList",
      file: "app/(site)/blog/_components/PostList.tsx",
      variants: [
        { label: "Every post: a lead, a pair and the rest", render: () => <PostList posts={postsNewestFirst()} /> },
        { label: "One post", render: () => <PostList posts={[examplePost]} /> },
      ],
    },
    {
      name: "PostHeader",
      file: "app/(site)/blog/_components/PostHeader.tsx",
      variants: [
        { label: "By a person with a photo", render: () => <PostHeader post={BY_PERSON} /> },
        { label: "By a person without a photo", render: () => <PostHeader post={NO_AUTHOR_PHOTO} /> },
        { label: "By the organisation", render: () => <PostHeader post={BY_ORGANISATION} /> },
      ],
    },
    {
      name: "PostBody",
      file: "app/(site)/blog/_components/PostBody.tsx",
      variants: [
        { label: "Text alone", render: () => <PostBody post={examplePost} /> },
        {
          label: "With a TL;DR",
          render: () => <PostBody post={{ ...examplePost, tldrContent: "A short version of the post." }} />,
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
