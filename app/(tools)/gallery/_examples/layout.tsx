// The site's header, footer and banners (components/layout/).
import Brand from "@/components/layout/Brand";
import CookieConsent, { CookieSettingsLink } from "@/components/layout/CookieConsent";
import Footer from "@/components/layout/Footer";
import FooterQr from "@/components/layout/FooterQr";
import FooterYear from "@/components/layout/FooterYear";
import JsonLd from "@/components/layout/JsonLd";
import TagManagerNoscript from "@/components/layout/TagManagerNoscript";
import MarchBanner from "@/components/layout/MarchBanner";
import Nav from "@/components/layout/Nav";
import NoAnalytics from "@/components/layout/NoAnalytics";
import { localGroups } from "@/lib/content/local-groups";
import type { Group } from "../_components/types";
import styles from "../_components/Gallery.module.css";

// A local group with its own logo, and one without.
const WITH_LOGO = localGroups.find((group) => group.logo)!;
const WITHOUT_LOGO = localGroups.find((group) => !group.logo)!;

export const layout: Group = {
  id: "layout",
  title: "The header, footer and banners",
  examples: [
    {
      name: "Nav",
      file: "components/layout/Nav.tsx",
      variants: [{ label: "The site's header", render: () => <Nav /> }],
    },
    {
      name: "Brand",
      file: "components/layout/Brand.tsx",
      variants: [
        {
          label: "The logo, as a link home",
          render: () => (
            <div className="container">
              <Brand home />
            </div>
          ),
        },
        {
          label: "The logo, plain, as in the footer",
          render: () => (
            <div className="container">
              <Brand />
            </div>
          ),
        },
        {
          label: "A local group's own logo",
          render: () => (
            <div className="container">
              <Brand home localGroup={WITH_LOGO} />
            </div>
          ),
        },
        {
          label: "A local group without a logo: the pause symbol and its name",
          render: () => (
            <div className="container">
              <Brand home localGroup={WITHOUT_LOGO} />
            </div>
          ),
        },
      ],
    },
    {
      name: "MarchBanner",
      file: "components/layout/MarchBanner.tsx",
      variants: [{ label: "The strip under the header until the march", render: () => <MarchBanner /> }],
    },
    {
      name: "Footer",
      file: "components/layout/Footer.tsx",
      variants: [
        {
          label: "The site's footer",
          render: () => (
            <CookieConsent analytics={false}>
              <Footer />
            </CookieConsent>
          ),
        },
      ],
    },
    {
      name: "FooterQr",
      file: "components/layout/FooterQr.tsx",
      variants: [
        {
          label: "The footer's QR code button",
          render: () => (
            <div className="container">
              <FooterQr />
            </div>
          ),
        },
      ],
    },
    {
      name: "FooterYear",
      file: "components/layout/FooterYear.tsx",
      variants: [
        {
          label: "Renders nothing visible: fills in the footer's year",
          render: () => (
            <>
              <FooterYear />
              <p className={styles.note}>Writes this year into the footer&rsquo;s copyright line.</p>
            </>
          ),
        },
      ],
    },
    {
      name: "CookieConsent",
      file: "components/layout/CookieConsent.tsx",
      variants: [
        {
          label: "Renders nothing visible of its own: around the cookie settings link",
          render: () => (
            <div className="container">
              <CookieConsent analytics={false}>
                <CookieSettingsLink />
              </CookieConsent>
              <p className={styles.note}>
                The link opens the consent banner only where the page has analytics, which the gallery doesn&rsquo;t.
              </p>
            </div>
          ),
        },
      ],
    },
    {
      name: "CookieSettingsLink",
      file: "components/layout/CookieConsent.tsx",
      variants: [
        {
          label: "The footer's link to the cookie banner",
          render: () => (
            <div className="container">
              <CookieConsent analytics={false}>
                <CookieSettingsLink />
              </CookieConsent>
            </div>
          ),
        },
      ],
    },
    {
      name: "NoAnalytics",
      file: "components/layout/NoAnalytics.tsx",
      variants: [
        {
          label: "Renders nothing visible: turns analytics off for the page",
          render: () => (
            <>
              <NoAnalytics />
              <p className={styles.note}>Marks the page as having no analytics, so none load.</p>
            </>
          ),
        },
      ],
    },
    {
      name: "TagManagerNoscript",
      file: "components/layout/TagManagerNoscript.tsx",
      variants: [
        {
          label: "Renders nothing visible: Tag Manager's frame for browsers without JavaScript",
          render: () => (
            <>
              <TagManagerNoscript analytics />
              <p className={styles.note}>
                On the live site only, inside a noscript, so a browser running scripts ignores it.
              </p>
            </>
          ),
        },
      ],
    },
    {
      name: "JsonLd",
      file: "components/layout/JsonLd.tsx",
      variants: [
        {
          label: "Renders nothing visible: adds an event's JSON-LD",
          render: () => (
            <>
              <JsonLd data={{ "@context": "https://schema.org", "@type": "Event", name: "An example event" }} />
              <p className={styles.note}>Adds structured data for search engines to the page.</p>
            </>
          ),
        },
      ],
    },
  ],
};
