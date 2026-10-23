import { describe, expect, it } from "vitest";
import { browserOf, systemOf } from "./user-agent";

// Real User-Agent headers, as each browser sends them.
const AGENTS: [string, string, string][] = [
  [
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15",
    "Safari",
    "macOS",
  ],
  [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
    "Chrome",
    "Windows",
  ],
  [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Edg/130.0.0.0",
    "Edge",
    "Windows",
  ],
  ["Mozilla/5.0 (X11; Linux x86_64; rv:131.0) Gecko/20100101 Firefox/131.0", "Firefox", "Linux"],
  [
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1",
    "Safari",
    "iOS",
  ],
  [
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/130.0.6723.90 Mobile/15E148 Safari/604.1",
    "Chrome",
    "iOS",
  ],
  [
    "Mozilla/5.0 (iPad; CPU OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/131.0 Mobile/15E148 Safari/605.1.15",
    "Firefox",
    "iPadOS",
  ],
  [
    "Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/26.0 Chrome/122.0.0.0 Mobile Safari/537.36",
    "Samsung Internet",
    "Android",
  ],
  [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 OPR/115.0.0.0",
    "Opera",
    "Windows",
  ],
  [
    "Mozilla/5.0 (X11; CrOS x86_64 14541.0.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
    "Chrome",
    "ChromeOS",
  ],
];

describe("browserOf and systemOf", () => {
  it("name the browser and system of each, not the others they mention", () => {
    for (const [agent, browser, system] of AGENTS) {
      expect([browserOf(agent), systemOf(agent)], agent).toEqual([browser, system]);
    }
  });

  it("name nothing they don't know, or no header", () => {
    expect(browserOf("curl/8.5.0")).toBeUndefined();
    expect(systemOf("curl/8.5.0")).toBeUndefined();
    expect(browserOf(null)).toBeUndefined();
    expect(systemOf(null)).toBeUndefined();
  });
});
