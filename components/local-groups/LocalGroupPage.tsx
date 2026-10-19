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
  /** What the group does, as cards without photos. */
  features?: { lede: string; items: { title: string; text: string }[] };
  /** Photos of events the group has held. */
  activities?: { gridStyle?: CSSProperties; items: ActivityItem[] };
  contact: {
    lede: string;
    /** Text beside the buttons. */
    details?: ReactNode;
    calloutStyle?: CSSProperties;
    actions: GroupAction[];
  };
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

/** A full-width band, cream unless given a tone, with the content in a container. */
function Band({ tone, children }: { tone?: "muted" | "white"; children: ReactNode }) {
  return (
    <PageSection tone={tone}>
      <div className="container">{children}</div>
    </PageSection>
  );
}

/**
 * A local group's page. Every group's page has the same sections in the same
 * order, with the same headings: the hero, its events, what it does, what it
 * has done, and how to get in touch.
 *
 * No two neighbouring bands share a colour: the cream hero, upcoming events
 * on white, past events on cream (every group has some), then white and
 * cream in turn for whichever of the next two the group has, and the
 * contact last on beige.
 */
export default function LocalGroupPage({ content }: { content: LocalGroupPageContent }) {
  const { name, hero, features, activities, contact } = content;
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
      <LocalGroupEvents localGroupName={name} />
      {features && (
        <Band tone="white">
          <GroupSectionHeader heading={`What we're doing in ${name}`} lede={features.lede} />
          <div className={styles.featureGrid}>
            {features.items.map((item) => (
              <FeatureCard key={item.title}>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </FeatureCard>
            ))}
          </div>
        </Band>
      )}
      {activities && (
        <Band tone={features ? undefined : "white"}>
          <GroupSectionHeader heading="What we've done" />
          <div className={styles.activityGrid} style={activities.gridStyle}>
            {activities.items.map((item) => (
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
      )}
      <Band tone="muted">
        <GroupSectionHeader heading="Link up with the group" lede={contact.lede} />
        <Callout style={contact.calloutStyle}>
          {contact.details && <div>{contact.details}</div>}
          {contact.actions.length > 1 ? (
            <div className={styles.actions}>
              {contact.actions.map((action) => (
                <Action key={action.label} action={action} size="large" />
              ))}
            </div>
          ) : (
            <Action action={contact.actions[0]} size="large" />
          )}
        </Callout>
      </Band>
    </main>
  );
}
