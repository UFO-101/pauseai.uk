import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import Footer from "@/components/Footer";
import CookieConsent from "@/components/CookieConsent";
import ScrollInit from "@/components/ScrollInit";

const fraunces = localFont({
  src: [
    { path: "../public/fonts/fraunces-latin-wght-normal.woff2", weight: "100 900", style: "normal" },
    { path: "../public/fonts/fraunces-latin-ext-wght-normal.woff2", weight: "100 900", style: "normal" },
  ],
  variable: "--font-fraunces",
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
  title: "PauseAI UK",
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
  other: {
    "apple-mobile-web-app-title": "PauseAI UK",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${inter.variable}`} suppressHydrationWarning>
      <body suppressHydrationWarning>
        {children}
        <Footer />
        <CookieConsent />
        <ScrollInit />
      </body>
    </html>
  );
}
