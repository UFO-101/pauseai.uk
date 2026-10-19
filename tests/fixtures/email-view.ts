// An email from the outbox (tests/fixtures/outbox.ts) as a page, for the
// storyboard to picture (emailFrame in tests/storyboard/frame.ts): its
// headers, its body as a mail app shows it, and its attachments. A plain,
// generic mail app, not Gmail or Outlook: it shows what was sent, not how
// each app will draw it. Whether the HTML works in them is checked from its
// code instead (lib/letter-format.test.ts).
import type { OutboxEmail } from "./outbox";

const escape = (text: string) =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** An attachment's size as a mail app gives it: bytes, KB or MB. */
export function attachmentSize(base64: string): string {
  const bytes = Buffer.from(base64, "base64").length;
  if (bytes < 1024) return `${bytes} bytes`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

const STYLE = `
  body { margin: 0; background: #f6f6f6; color: #202124; font: 14px/1.5 Arial, Helvetica, sans-serif; }
  .mail { max-width: 760px; margin: 0 auto; padding: 16px; }
  h1 { margin: 0 0 12px; font-size: 22px; font-weight: 400; }
  dl { display: grid; grid-template-columns: max-content 1fr; gap: 2px 12px; margin: 0 0 16px; color: #5f6368; }
  dt { font-weight: 700; }
  dd { margin: 0; overflow-wrap: anywhere; }
  .body { padding: 16px; border: 1px solid #dadce0; border-radius: 8px; background: #fff; overflow-wrap: anywhere; }
  .text { margin: 0; font: inherit; white-space: pre-wrap; }
  .attachments { display: flex; flex-wrap: wrap; gap: 8px; margin: 16px 0 0; padding: 0; list-style: none; }
  .attachments li { padding: 8px 12px; border: 1px solid #dadce0; border-radius: 8px; background: #fff; }
  .attachments small { display: block; color: #5f6368; }
`;

/** The whole page for one email. Its HTML body is ours, so it goes in as it is; everything else is escaped. */
export function emailView(email: OutboxEmail): string {
  const headers = (
    [
      ["From", email.From],
      ["To", email.To],
      ["Cc", email.Cc],
      ["Bcc", email.Bcc],
      ["Reply-To", email.ReplyTo],
      ["Date", email.Date],
    ] as [string, string | undefined][]
  )
    .filter((header): header is [string, string] => !!header[1])
    .map(([name, value]) => `<dt>${name}</dt><dd>${escape(value)}</dd>`)
    .join("");
  const body = email.HtmlBody ?? `<pre class="text">${escape(email.TextBody)}</pre>`;
  const attachments = email.Attachments.length
    ? `<ul class="attachments" aria-label="Attachments">${email.Attachments.map(
        (a) => `<li>${escape(a.Name)}<small>${escape(a.ContentType)}, ${attachmentSize(a.Content)}</small></li>`,
      ).join("")}</ul>`
    : "";
  return [
    "<!doctype html>",
    '<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width">',
    `<title>${escape(email.Subject)}</title><style>${STYLE}</style></head>`,
    `<body><article class="mail"><h1>${escape(email.Subject)}</h1><dl>${headers}</dl>`,
    `<div class="body">${body}</div>${attachments}</article></body></html>`,
  ].join("");
}
