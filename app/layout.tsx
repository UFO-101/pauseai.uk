import type { Metadata } from "next";
import localFont from "next/font/local";
import { Lato } from "next/font/google";
import "./globals.css";
import Footer from "@/components/Footer";
import CookieConsent from "@/components/CookieConsent";
import ScrollInit from "@/components/ScrollInit";
import JsonLd from "@/components/JsonLd";
import { site } from "@/lib/data/site";

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "PauseAI UK",
  url: site.url,
  logo: `${site.url}/favicon/web-app-manifest-512x512.png`,
  email: site.contactEmail,
  sameAs: [site.social.instagram, site.social.tiktok, site.social.x, site.social.facebook, site.social.youtube],
};

const lato = Lato({
  subsets: ["latin"],
  weight: ["700", "900"],
  variable: "--font-display",
  display: "swap",
});

const inter = localFont({
  src: [
    { path: "../public/fonts/inter-latin-wght-normal.woff2", weight: "100 900", style: "normal" },
    { path: "../public/fonts/inter-latin-ext-wght-normal.woff2", weight: "100 900", style: "normal" },
  ],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://pauseai.uk"),
  title: {
    template: "%s | PauseAI UK",
    default: "PauseAI UK",
  },
  description: "Community-led action for safe and accountable AI across the UK.",
  openGraph: {
    title: "PauseAI UK",
    description: "Community-led action for safe and accountable AI across the UK.",
    images: [{ url: "/images/open-graph/open-graph-1200-630.jpg", width: 1200, height: 630 }],
    type: "website",
    url: "https://pauseai.uk/",
  },
  twitter: {
    card: "summary_large_image",
    title: "PauseAI UK",
    description: "Community-led action for safe and accountable AI across the UK.",
    images: ["/images/open-graph/open-graph-1600-840.jpg"],
  },
  icons: {
    icon: [
      { url: "/favicon/favicon-96x96.png", sizes: "96x96", type: "image/png" },
      { url: "/favicon/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon/favicon.ico" },
    ],
    apple: { url: "/favicon/apple-touch-icon.png", sizes: "180x180" },
  },
  manifest: "/favicon/site.webmanifest",
  verification: {
    // Google search console - with Harry's pauseai.uk email address
    // TODO: link to google analytics
    google: "TceK59CQQ__dVDNJqOhnEuYi7WHOdIQx6MClmzJSRT8",
    other: {
      // Bing Webmaster Tools - with Harry's pauseai.uk email address
      "msvalidate.01": "801F2DA452AC275FC856A5215057FA55",
    },
  },
  other: {
    "apple-mobile-web-app-title": "PauseAI UK",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${lato.variable} ${inter.variable}`} suppressHydrationWarning>
      <body suppressHydrationWarning>
        <JsonLd data={organizationJsonLd} />
        {children}
        <Footer />
        <CookieConsent />
        <ScrollInit />
      </body>
    </html>
  );
}
