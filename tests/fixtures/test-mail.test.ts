import { expect, it } from "vitest";
import { testMail } from "./test-mail";

it("writes a message as Gmail gets it: Google's results for its sender's domain, then its headers and text", () => {
  const raw = testMail({ from: '"Jo" <jo@example.org>', to: "letters+jane@pauseai.uk", cc: "al@example.org" });
  expect(raw).toMatch(
    /^Authentication-Results: mx\.google\.com; .*dmarc=pass \(p=REJECT\) header\.from=example\.org\r\n/,
  );
  expect(raw).toContain("\r\nDelivered-To: letters+jane@pauseai.uk\r\n");
  expect(raw).toContain("\r\nCc: al@example.org\r\n");
  const plain = testMail({ from: "jo@example.org", to: '"Jane" <letters+jane@pauseai.uk>', auth: "dmarc=fail" });
  expect(plain).toMatch(/^Authentication-Results: mx\.google\.com; dmarc=fail\r\n/);
  expect(plain).toContain("\r\nDelivered-To: letters+jane@pauseai.uk\r\n");
  expect(plain).not.toContain("Cc:");
});
