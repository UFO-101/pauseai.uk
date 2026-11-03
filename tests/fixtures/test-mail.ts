// Mail arriving at the letters inbox, for the tests and the storyboard to
// deliver (tests/fixtures/letters-inbox.ts): written as a mail server
// would hand it to Gmail, with Google's own Authentication-Results.
import { LETTERS_INBOX } from "../fixture-env.mjs";

export { LETTERS_INBOX };

/** A proxy of the test letters inbox: fixture-letters+jane.smith@pauseai.uk. */
export function testProxy(tag: string): string {
  const [local, domain] = LETTERS_INBOX.split("@");
  return `${local}+${tag}@${domain}`;
}

/** What a test message to the letters inbox says: who from and to, what it answers, and how Google found its sender. */
export type TestMail = {
  from: string;
  to: string;
  cc?: string;
  subject?: string;
  text?: string;
  messageId?: string;
  inReplyTo?: string;
  /** Google's Authentication-Results for it, after "mx.google.com;"; by default DMARC passes for the From's domain. */
  auth?: string;
  /** Others, such as Auto-Submitted, as written. */
  headers?: string[];
  date?: string;
};

let mails = 0;

/** A message as it arrives at the letters inbox, whole, its lines ending CRLF. */
export function testMail(mail: TestMail): string {
  const domain = /@([^>\s]+)/.exec(mail.from)![1];
  return [
    `Authentication-Results: mx.google.com; ${mail.auth ?? `dkim=pass header.i=@${domain}; spf=pass smtp.mailfrom=${domain}; dmarc=pass (p=REJECT) header.from=${domain}`}`,
    `Delivered-To: ${/<([^>]+)>/.exec(mail.to)?.[1] ?? mail.to}`,
    `From: ${mail.from}`,
    `To: ${mail.to}`,
    ...(mail.cc ? [`Cc: ${mail.cc}`] : []),
    `Subject: ${mail.subject ?? "Re: Request to co-sign letter on frontier AI risks"}`,
    `Date: ${mail.date ?? "Fri, 16 Oct 2026 13:00:00 +0100"}`,
    `Message-ID: <${mail.messageId ?? `test-${++mails}@parliament.example`}>`,
    ...(mail.inReplyTo ? [`In-Reply-To: <${mail.inReplyTo}>`, `References: <${mail.inReplyTo}>`] : []),
    ...(mail.headers ?? []),
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=utf-8",
    "Content-Transfer-Encoding: 8bit",
    "",
    mail.text ?? "Dear Jane,\r\n\r\nThank you for writing to me.\r\n",
  ].join("\r\n");
}
