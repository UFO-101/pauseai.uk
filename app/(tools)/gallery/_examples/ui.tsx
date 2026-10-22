// The site's ui kit (components/ui/).
import Link from "next/link";
import { Button, ButtonAnchor, ButtonLink, type ButtonSize, type ButtonVariant } from "@/components/ui/Button";
import ButtonRow from "@/components/ui/ButtonRow";
import Callout from "@/components/ui/Callout";
import Closing from "@/components/ui/Closing";
import CopyLinkButton from "@/components/ui/CopyLinkButton";
import FeatureCard from "@/components/ui/FeatureCard";
import Foreword from "@/components/ui/Foreword";
import IconButton, { type IconButtonLook } from "@/components/ui/IconButton";
import PageHero from "@/components/ui/PageHero";
import { PhotoCardBody, PhotoCardImage, photoCardClass } from "@/components/ui/PhotoCard";
import ProsePage, { ProseMeta } from "@/components/ui/ProsePage";
import Section, { Lede, SectionHeader } from "@/components/ui/Section";
import SmallPrint from "@/components/ui/SmallPrint";
import type { Group } from "../_components/types";
import { LightboxExample, SubmitButtonExample } from "./ui.client";

// Every value of a look's union, so a new one is a type error until it's here.
const VARIANTS: Record<ButtonVariant, string> = {
  primary: "Primary",
  ghost: "Ghost",
  light: "Light",
  danger: "Danger",
};
const SIZES: Record<ButtonSize | "medium", ButtonSize | undefined> = {
  small: "small",
  medium: undefined,
  large: "large",
};
const LOOKS: Record<IconButtonLook, string> = { outline: "Outline", raised: "Raised", dark: "Dark" };
const TONES: Record<"plain" | "muted" | "white", "muted" | "white" | undefined> = {
  plain: undefined,
  muted: "muted",
  white: "white",
};

const PHOTO = "/images/fundraising/brussels-panel-thumb.jpg";

export const ui: Group = {
  id: "ui",
  title: "UI kit",
  examples: [
    {
      name: "Button",
      file: "components/ui/Button.tsx",
      variants: [
        ...(Object.keys(VARIANTS) as ButtonVariant[]).map((variant) => ({
          label: `${VARIANTS[variant]}, in each size`,
          render: () => (
            <div className="container">
              <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
                {Object.entries(SIZES).map(([name, size]) => (
                  <Button key={name} variant={variant} size={size} fit>
                    {VARIANTS[variant]} {name}
                  </Button>
                ))}
              </div>
            </div>
          ),
        })),
        {
          label: "Pending and disabled",
          render: () => (
            <div className="container" style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
              <Button variant="primary" pending fit>
                Sending
              </Button>
              <Button variant="primary" disabled fit>
                Disabled
              </Button>
              <Button variant="ghost" disabled fit>
                Disabled
              </Button>
            </div>
          ),
        },
        {
          label: "Full width on a phone, unless it fits",
          render: () => (
            <div className="container" style={{ display: "grid", gap: 12 }}>
              <Button variant="primary">Fills a phone</Button>
              <Button variant="primary" fit>
                Fits its text
              </Button>
            </div>
          ),
        },
      ],
    },
    {
      name: "ButtonAnchor",
      file: "components/ui/Button.tsx",
      variants: [
        {
          label: "A link to another site",
          render: () => (
            <div className="container">
              <ButtonAnchor variant="primary" href="https://example.org/" fit>
                Somewhere else
              </ButtonAnchor>
            </div>
          ),
        },
      ],
    },
    {
      name: "ButtonLink",
      file: "components/ui/Button.tsx",
      variants: [
        {
          label: "A link to a page here",
          render: () => (
            <div className="container">
              <ButtonLink variant="ghost" href="/events" fit>
                Upcoming events
              </ButtonLink>
            </div>
          ),
        },
      ],
    },
    {
      name: "SubmitButton",
      file: "components/ui/SubmitButton.tsx",
      variants: [
        {
          label: "Pending while its form's action runs",
          render: () => (
            <div className="container">
              <SubmitButtonExample />
            </div>
          ),
        },
      ],
    },
    {
      name: "IconButton",
      file: "components/ui/IconButton.tsx",
      variants: (Object.keys(LOOKS) as IconButtonLook[]).map((look) => ({
        label: LOOKS[look],
        render: () => (
          <div className="container">
            <div
              style={{
                display: "flex",
                gap: 12,
                padding: 12,
                background: look === "dark" ? "var(--text)" : undefined,
              }}
            >
              <IconButton look={look} aria-label="Previous">
                ‹
              </IconButton>
              <IconButton look={look} size={44} aria-label="Next">
                ›
              </IconButton>
            </div>
          </div>
        ),
      })),
    },
    {
      name: "CopyLinkButton",
      file: "components/ui/CopyLinkButton.tsx",
      variants: [
        {
          label: "A circle, and a small one",
          render: () => (
            <div className="container" style={{ display: "flex", gap: 12 }}>
              <CopyLinkButton href="/people" title="Copy link to the people page" />
              <CopyLinkButton href="/track-record" title="Copy link to the track record" small />
            </div>
          ),
        },
        {
          label: "Labelled",
          render: () => (
            <div className="container">
              <CopyLinkButton href="/people" label="Share this story" />
            </div>
          ),
        },
      ],
    },
    {
      name: "PageHero",
      file: "components/ui/PageHero.tsx",
      variants: [
        {
          label: "A title and a lede",
          render: () => (
            <PageHero title="Example Page" lede="A sentence or two about the page, held to a short measure." />
          ),
        },
        { label: "With the swirl", render: () => <PageHero title="Example Record" swirl /> },
        {
          label: "Wide, tight, a long lede",
          render: () => (
            <PageHero
              title="Example Index"
              width="wide"
              tight
              longLede
              lede="A longer lede, which runs the full width of the page as the text below it does, rather than stopping at a short measure."
            />
          ),
        },
        {
          label: "A small title, a link above, a figure and a byline",
          render: () => (
            <PageHero
              title="An example post with a title long enough to wrap onto a second line"
              smallTitle
              before={<Link href="/blog">← All posts</Link>}
              figure={
                <span
                  style={{
                    display: "block",
                    width: 64,
                    height: 64,
                    borderRadius: "50%",
                    background: "var(--accent-light)",
                  }}
                />
              }
            >
              <p>By Example Author · 1 January 2026</p>
            </PageHero>
          ),
        },
      ],
    },
    {
      name: "Section",
      file: "components/ui/Section.tsx",
      variants: (Object.keys(TONES) as (keyof typeof TONES)[])
        .flatMap((tone) =>
          [false, true].map((bordered) => ({
            label: `${tone}${bordered ? ", bordered" : ""}`,
            render: () => (
              <Section tone={TONES[tone]} bordered={bordered}>
                <div className="container">
                  <SectionHeader title="An example section">
                    <Lede>A short lede for the section, held to its measure.</Lede>
                  </SectionHeader>
                </div>
              </Section>
            ),
          })),
        )
        .concat([
          {
            label: "Snug on a phone",
            render: () => (
              <Section snug>
                <div className="container">
                  <p>Less room above and below on a phone.</p>
                </div>
              </Section>
            ),
          },
        ]),
    },
    {
      name: "SectionHeader",
      file: "components/ui/Section.tsx",
      variants: [
        {
          label: "A heading alone",
          render: () => (
            <div className="container">
              <SectionHeader title="A heading" />
            </div>
          ),
        },
      ],
    },
    {
      name: "Lede",
      file: "components/ui/Section.tsx",
      variants: [
        {
          label: "Short and long",
          render: () => (
            <div className="container">
              <Lede>A lede held to a short measure, so its lines stay easy to read however wide the page is.</Lede>
              <Lede long>
                A long lede runs the full width of its column, as the text it introduces does, for a band where the
                measure is already set.
              </Lede>
            </div>
          ),
        },
      ],
    },
    {
      name: "Foreword",
      file: "components/ui/Foreword.tsx",
      variants: [
        {
          label: "Paragraphs and a list",
          render: () => (
            <Foreword>
              <p>An introduction, a paragraph or two of plain text under the page&rsquo;s hero.</p>
              <ul>
                <li>A point in a list</li>
                <li>Another point</li>
              </ul>
            </Foreword>
          ),
        },
        {
          label: "A title, a drop cap, the page's width",
          render: () => (
            <Foreword title="About this example" dropCap pageWidth>
              <p>
                This example paragraph opens with a large first letter, which sits beside its first few lines rather
                than above them. It runs on long enough to wrap several times, so the way the letter drops into the
                text, and how the lines after it close up beneath, shows as it does on a real page. The band lines up
                with the page&rsquo;s reading column, not a little wider.
              </p>
              <p>A second paragraph follows in plain type, as an introduction&rsquo;s later paragraphs do.</p>
            </Foreword>
          ),
        },
      ],
    },
    {
      name: "Closing",
      file: "components/ui/Closing.tsx",
      variants: [
        { label: "Buttons alone", render: () => <Closing /> },
        { label: "With a line", render: () => <Closing line="An example line above the buttons." /> },
      ],
    },
    {
      name: "Callout",
      file: "components/ui/Callout.tsx",
      variants: [
        {
          label: "Words beside a button",
          render: () => (
            <div className="container">
              <Callout>
                <div>
                  <h2>An example callout</h2>
                  <Lede>A sentence about what the button does.</Lede>
                </div>
                <ButtonLink variant="primary" size="large" href="/events">
                  Do the thing →
                </ButtonLink>
              </Callout>
            </div>
          ),
        },
      ],
    },
    {
      name: "ButtonRow",
      file: "components/ui/ButtonRow.tsx",
      variants: [
        {
          label: "Two buttons, centred",
          render: () => (
            <div className="container">
              <ButtonRow>
                <ButtonLink variant="primary" href="/people">
                  One →
                </ButtonLink>
                <ButtonLink variant="ghost" href="/people">
                  Two →
                </ButtonLink>
              </ButtonRow>
            </div>
          ),
        },
      ],
    },
    {
      name: "PhotoCardImage",
      file: "components/ui/PhotoCard.tsx",
      variants: [
        {
          label: "A card, and a card that is a link",
          render: () => (
            <div
              className="container"
              style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 24 }}
            >
              <article className={photoCardClass()}>
                <PhotoCardImage style={{ backgroundImage: `url("${PHOTO}")` }} />
                <PhotoCardBody>
                  <h3>An example card</h3>
                  <p>A line or two about it.</p>
                </PhotoCardBody>
              </article>
              <Link className={photoCardClass({ link: true })} href="/london">
                <PhotoCardImage style={{ backgroundImage: `url("${PHOTO}")` }} />
                <PhotoCardBody>
                  <h3>A card that links</h3>
                  <p>It lifts on hover.</p>
                </PhotoCardBody>
              </Link>
            </div>
          ),
        },
      ],
    },
    {
      name: "PhotoCardBody",
      file: "components/ui/PhotoCard.tsx",
      variants: [
        {
          label: "Words alone",
          render: () => (
            <div className="container">
              <article className={photoCardClass()} style={{ maxWidth: 320 }}>
                <PhotoCardBody>
                  <h3>No photo</h3>
                  <p>Just the words.</p>
                </PhotoCardBody>
              </article>
            </div>
          ),
        },
      ],
    },
    {
      name: "FeatureCard",
      file: "components/ui/FeatureCard.tsx",
      variants: [
        {
          label: "A heading and a line",
          render: () => (
            <div className="container" style={{ maxWidth: 420 }}>
              <FeatureCard>
                <h3>An example feature</h3>
                <p>A line or two of text under its heading.</p>
              </FeatureCard>
            </div>
          ),
        },
      ],
    },
    {
      name: "Lightbox",
      file: "components/ui/Lightbox.tsx",
      variants: [
        {
          label: "Shut, behind a button that opens it on a photo",
          render: () => (
            <div className="container">
              <LightboxExample />
            </div>
          ),
        },
      ],
    },
    {
      name: "ProsePage",
      file: "components/ui/ProsePage.tsx",
      variants: [
        {
          label: "A title, a date and prose",
          render: () => (
            <ProsePage>
              <h1>An Example Policy</h1>
              <ProseMeta>Last updated: 1 January 2026</ProseMeta>
              <p>
                A paragraph of plain prose, with <strong>something strong</strong> and{" "}
                <Link className="inline-link" href="/privacy">
                  a link
                </Link>
                .
              </p>
              <h2>A heading</h2>
              <ul>
                <li>A point</li>
                <li>Another point</li>
              </ul>
            </ProsePage>
          ),
        },
      ],
    },
    {
      name: "ProseMeta",
      file: "components/ui/ProsePage.tsx",
      variants: [
        {
          label: "A line under a title",
          render: () => (
            <div className="container">
              <ProseMeta>Last updated: 1 January 2026</ProseMeta>
            </div>
          ),
        },
      ],
    },
    {
      name: "SmallPrint",
      file: "components/ui/SmallPrint.tsx",
      variants: [
        {
          label: "Under a rule",
          render: () => (
            <div className="container">
              <SmallPrint>
                <p>
                  <strong>Example Organisation Ltd</strong> is a company registered in England and Wales, number{" "}
                  <strong>00000000</strong>.
                </p>
              </SmallPrint>
            </div>
          ),
        },
      ],
    },
  ],
};
