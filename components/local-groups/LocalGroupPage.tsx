import type { CSSProperties, ReactNode } from "react";
import LocalGroupEvents from "@/components/events/LocalGroupEvents";
import { ButtonAnchor, ButtonLink, type ButtonSize, type ButtonVariant } from "@/components/ui/Button";
import FeatureCard from "@/components/ui/FeatureCard";
import type { LocalGroupName } from "@/lib/content/local-groups";
import PageSection, { Lede, SectionHeader } from "@/components/ui/Section";
import Callout from "@/components/ui/Callout";
import { PhotoCardBody, PhotoCardImage, photoCardClass } from "@/components/ui/PhotoCard";
import styles from "./LocalGroupPage.module.css";

/** A call to action. `newTab` opens it in a new tab; `internal` uses client-side navigation. */
export type GroupAction = {
  label: string;
  href: string;
  variant: ButtonVariant;
  newTab?: boolean;
  internal?: boolean;
};

export type ActivityItem = {
  title: string;
  text: string;
  image: string;
  /** background-position for the image, where the default centre crop misses. */
  imagePosition?: string;
  /** Link to the event page. */
  href?: string;
  style?: CSSProperties;
};

/** The sections a local group page is built from, in the order given. */
export type GroupSection =
  | { kind: "features"; heading: string; lede?: string; items: { title: string; text: string }[] }
  | {
      kind: "activities";
      heading: string;
      lede?: string;
      /** A full-width tinted band instead of a plain section. */
      muted?: boolean;
      gridStyle?: CSSProperties;
      items: ActivityItem[];
    }
  | { kind: "events" }
  | {
      kind: "contact";
      heading: string;
      lede: string;
      muted?: boolean;
      /** Text beside the buttons. */
      details?: ReactNode;
      calloutStyle?: CSSProperties;
      actions: GroupAction[];
    };

export type LocalGroupPageContent = {
  name: LocalGroupName;
  hero: {
    lede: string;
    actions: GroupAction[];
    photo: string;
    /** Extra background rules for the photo (size, position) where the default crop misses. */
    photoStyle?: CSSProperties;
    badge?: string;
  };
  sections: GroupSection[];
};

const PHOTO_TINT = "linear-gradient(135deg, rgb(var(--amber-rgb) / 0.35), rgb(var(--black-rgb) / 0.65))";

function Action({ action, size }: { action: GroupAction; size?: ButtonSize }) {
  const { label, href, variant, newTab, internal } = action;
  if (internal) {
    return (
      <ButtonLink variant={variant} size={size} href={href}>
        {label}
      </ButtonLink>
    );
  }
  return (
    <ButtonAnchor
      variant={variant}
      size={size}
      href={href}
      {...(newTab ? { target: "_blank", rel: "noreferrer" } : {})}
    >
      {label}
    </ButtonAnchor>
  );
}

function GroupSectionHeader({ heading, lede }: { heading: string; lede?: string }) {
  return <SectionHeader title={heading}>{lede && <Lede>{lede}</Lede>}</SectionHeader>;
}

/** A plain section, or a full-width tinted band with the content in a container. */
function Band({ muted, children }: { muted?: boolean; children: ReactNode }) {
  return (
    <PageSection tone={muted ? "muted" : undefined}>
      <div className="container">{children}</div>
    </PageSection>
  );
}

function Section({ section, name }: { section: GroupSection; name: LocalGroupName }) {
  switch (section.kind) {
    case "features":
      return (
        <Band>
          <GroupSectionHeader heading={section.heading} lede={section.lede} />
          <div className={styles.featureGrid}>
            {section.items.map((item) => (
              <FeatureCard key={item.title}>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </FeatureCard>
            ))}
          </div>
        </Band>
      );
    case "activities":
      return (
        <Band muted={section.muted}>
          <GroupSectionHeader heading={section.heading} lede={section.lede} />
          <div className={styles.activityGrid} style={section.gridStyle}>
            {section.items.map((item) => (
              <article key={item.title} className={photoCardClass()} style={item.style}>
                <PhotoCardImage
                  style={{
                    backgroundImage: `url('${item.image}')`,
                    ...(item.imagePosition ? { backgroundPosition: item.imagePosition } : {}),
                  }}
                />
                <PhotoCardBody>
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                  {item.href && (
                    <a className="inline-link" href={item.href} target="_blank" rel="noreferrer">
                      View event page
                    </a>
                  )}
                </PhotoCardBody>
              </article>
            ))}
          </div>
        </Band>
      );
    case "events":
      return <LocalGroupEvents localGroupName={name} />;
    case "contact":
      return (
        <Band muted={section.muted}>
          <GroupSectionHeader heading={section.heading} lede={section.lede} />
          <Callout style={section.calloutStyle}>
            {section.details && <div>{section.details}</div>}
            {section.actions.length > 1 ? (
              <div className={styles.actions}>
                {section.actions.map((action) => (
                  <Action key={action.label} action={action} size="large" />
                ))}
              </div>
            ) : (
              <Action action={section.actions[0]} size="large" />
            )}
          </Callout>
        </Band>
      );
  }
}

/** A local group's page: a hero, then its sections in order. */
export default function LocalGroupPage({ content }: { content: LocalGroupPageContent }) {
  const { name, hero, sections } = content;
  return (
    <main>
      <section className={styles.hero} style={{ paddingBottom: 48 }}>
        <div className={`container ${styles.heroGrid}`}>
          <div className={styles.heroCopy}>
            <h1>PauseAI {name}</h1>
            <p className={styles.lede}>{hero.lede}</p>
            <div className={styles.actions}>
              {hero.actions.map((action) => (
                <Action key={action.label} action={action} />
              ))}
            </div>
          </div>
          <div className={styles.heroVisual}>
            <div
              className={styles.heroPhoto}
              style={{ backgroundImage: `${PHOTO_TINT}, url('${hero.photo}')`, ...hero.photoStyle }}
            ></div>
            {hero.badge && (
              <div className={styles.heroBadge} data-testid="hero-badge">
                {hero.badge}
              </div>
            )}
          </div>
        </div>
      </section>
      {sections.map((section, i) => (
        <Section key={i} section={section} name={name} />
      ))}
    </main>
  );
}
