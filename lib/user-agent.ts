// The browser and operating system a User-Agent header names, for the page
// of a staff member's sessions: names alone, no versions. Checked in an
// order that matters, as most browsers name others too (Edge says Chrome
// and Safari; Chrome says Safari; iPhones say Mac OS X).

const BROWSERS: [RegExp, string][] = [
  [/\bEdg(e|A|iOS)?\//, "Edge"],
  [/\b(OPR|Opera)\//, "Opera"],
  [/\bSamsungBrowser\//, "Samsung Internet"],
  [/\b(Firefox|FxiOS)\//, "Firefox"],
  [/\b(Chrome|CriOS|HeadlessChrome)\//, "Chrome"],
  [/\bVersion\/[\d.]+.*\bSafari\//, "Safari"],
];

const SYSTEMS: [RegExp, string][] = [
  [/\biPhone\b/, "iOS"],
  [/\biPad\b/, "iPadOS"],
  [/\bAndroid\b/, "Android"],
  [/\bCrOS\b/, "ChromeOS"],
  [/\bWindows\b/, "Windows"],
  [/\b(Macintosh|Mac OS X)\b/, "macOS"],
  [/\bLinux\b/, "Linux"],
];

const first = (list: [RegExp, string][], userAgent: string | null) =>
  userAgent ? list.find(([pattern]) => pattern.test(userAgent))?.[1] : undefined;

/** The browser a User-Agent names ("Firefox"), if it's one we know. */
export function browserOf(userAgent: string | null): string | undefined {
  return first(BROWSERS, userAgent);
}

/** The operating system a User-Agent names ("macOS"), if it's one we know. */
export function systemOf(userAgent: string | null): string | undefined {
  return first(SYSTEMS, userAgent);
}
