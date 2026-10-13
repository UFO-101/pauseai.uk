import type { CSSProperties, ReactNode } from "react";
import LocalGroupEvents from "@/components/events/LocalGroupEvents";
import { ButtonAnchor, ButtonLink, type ButtonSize, type ButtonVariant } from "@/components/ui/Button";
import FeatureCard from "@/components/ui/FeatureCard";
import type { LocalGroupName } from "@/lib/content/local-groups";

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

const PHOTO_TINT = "linear-gradient(135deg, rgba(255, 148, 22, 0.35), rgba(0,0,0,0.65))";

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
    <ButtonAnchor variant={variant} size={size} href={href} {...(newTab ? { target: "_blank", rel: "noreferrer" } : {})}>
      {label}
    </ButtonAnchor>
  );
}

function SectionHeader({ heading, lede }: { heading: string; lede?: string }) {
  return (
    <div className="section-header">
      <h2>{heading}</h2>
      {lede && <p className="section-lede">{lede}</p>}
    </div>
  );
}

/** A plain section, or a full-width tinted band with the content in a container. */
function Band({ muted, children }: { muted?: boolean; children: ReactNode }) {
  if (muted) {
    return (
      <section className="section muted">
        <div className="container">{children}</div>
      </section>
    );
  }
  return <section className="section container">{children}</section>;
}

function Section({ section, name }: { section: GroupSection; name: LocalGroupName }) {
  switch (section.kind) {
    case "features":
      return (
        <Band>
          <SectionHeader heading={section.heading} lede={section.lede} />
          <div className="feature-grid">
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
          <SectionHeader heading={section.heading} lede={section.lede} />
          <div className="activity-grid" style={section.gridStyle}>
            {section.items.map((item) => (
              <article key={item.title} className="activity-card" style={item.style}>
                <div
                  className="image-frame"
                  style={{ backgroundImage: `url('${item.image}')`, ...(item.imagePosition ? { backgroundPosition: item.imagePosition } : {}) }}
                ></div>
                <div className="card-copy">
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                  {item.href && (
                    <a className="inline-link" href={item.href} target="_blank" rel="noreferrer">
                      View event page
                    </a>
                  )}
                </div>
              </article>
            ))}
          </div>
        </Band>
      );
    case "events":
      return <LocalGroupEvents localGroupName={name} />;
    case "contact":
      return (
        <section className={section.muted ? "section muted" : "section"}>
          <div className="container">
            <SectionHeader heading={section.heading} lede={section.lede} />
            <div className="callout-inner" style={section.calloutStyle}>
              {section.details && <div>{section.details}</div>}
              {section.actions.length > 1 ? (
                <div className="actions">
                  {section.actions.map((action) => (
                    <Action key={action.label} action={action} size="large" />
                  ))}
                </div>
              ) : (
                <Action action={section.actions[0]} size="large" />
              )}
            </div>
          </div>
        </section>
      );
  }
}

/** A local group's page: a hero, then its sections in order. */
export default function LocalGroupPage({ content }: { content: LocalGroupPageContent }) {
  const { name, hero, sections } = content;
  return (
    <main>
      <section className="hero" style={{ paddingBottom: 48 }}>
        <div className="container hero-grid">
          <div className="hero-copy">
            <h1>PauseAI {name}</h1>
            <p className="lede">{hero.lede}</p>
            <div className="actions">
              {hero.actions.map((action) => (
                <Action key={action.label} action={action} />
              ))}
            </div>
          </div>
          <div className="hero-visual">
            <div
              className="hero-photo"
              style={{ backgroundImage: `${PHOTO_TINT}, url('${hero.photo}')`, ...hero.photoStyle }}
            ></div>
            {hero.badge && <div className="hero-badge">{hero.badge}</div>}
          </div>
        </div>
      </section>
      {sections.map((section, i) => (
        <Section key={i} section={section} name={name} />
      ))}
    </main>
  );
}
