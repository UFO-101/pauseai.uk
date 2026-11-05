// The fake Gmail's joseph@ and policy@ (outside-services.ts): a made-up mailbox
// with one of every kind of mail the import of old letters meets. The letters
// are those of airtable-emails.json and airtable-web-form.json, to the
// politicians of airtable-politicians.json, at the same moments.

/** A message: the mailbox it's in, its Gmail IDs, labels and whole text. */
export type OldMail = { account: string; id: string; threadId: string; labels: string[]; at: string; raw: string };

export const JOSEPH_MAILBOX = "joseph@pauseai.uk";
export const POLICY_MAILBOX = "policy@pauseai.uk";

const POLLY = "polly.placeholder.mp@parliament.uk";
const DORA = "mp90001.office@parliament.uk";
const MO = "mp90003.office@parliament.uk";
const MORAG = "morag.example.msp@parliament.example";

/** One message, its lines ending CRLF. */
function mail(
  account: string,
  id: string,
  threadId: string,
  labels: string[],
  at: string,
  headers: Record<string, string>,
  text: string,
): OldMail {
  const lines = Object.entries(headers).map(([name, value]) => `${name}: ${value}`);
  return {
    account,
    id,
    threadId,
    labels,
    at,
    raw: [
      ...lines,
      `Date: ${new Date(at).toUTCString()}`,
      "MIME-Version: 1.0",
      "Content-Type: text/plain; charset=utf-8",
      "",
      text.replace(/\n/g, "\r\n"),
    ].join("\r\n"),
  };
}

/** A sent email. */
const sent = (
  id: string,
  thread: string,
  at: string,
  from: string,
  to: string,
  subject: string,
  text: string,
  more = {},
) =>
  mail(
    JOSEPH_MAILBOX,
    id,
    thread,
    ["SENT"],
    at,
    { From: from, To: to, Subject: subject, "Message-ID": `<${id}@mail.gmail.com>`, ...more },
    text,
  );

/** An email that arrived. */
const got = (id: string, thread: string, at: string, from: string, subject: string, text: string, more = {}) =>
  mail(
    JOSEPH_MAILBOX,
    id,
    thread,
    ["INBOX"],
    at,
    { From: from, To: "joseph@pauseai.uk", Subject: subject, "Message-ID": `<${id}@parliament.example>`, ...more },
    text,
  );

const DEEPMIND = "Request to co-sign letter on Google's breach of AI safety pledges";
const FRONTIER = "Please sign the letter on frontier AI";

const deepmindText = (name: string, own: string) =>
  `Dear ${name},\n\nGoogle broke its promise. Please join 25 of your colleagues.\n\n${own}\n\nThank you for your consideration,\n\nJoseph Example`;

/** Everything in the two mailboxes, oldest first in each. */
export const OLD_MAIL: readonly OldMail[] = [
  // A DeepMind letter, with a paragraph of its own, and another of the same send, the same text.
  sent(
    "0a01",
    "t-deepmind",
    "2025-07-09T10:59:30.000Z",
    "Joseph Example <joseph@pauseai.info>",
    POLLY,
    DEEPMIND,
    deepmindText("Ms Placeholder", "You spoke well on the Bill."),
  ),
  // Joseph's own letter of a send, which production has no record of: one of the same text.
  sent(
    "0a02",
    "t-deepmind-2",
    "2025-07-09T12:00:00.000Z",
    "Joseph Example <joseph@pauseai.info>",
    MO,
    DEEPMIND,
    deepmindText("Mx Example", ""),
  ),
  // A reply from a person in the letter's Gmail thread.
  got(
    "0a03",
    "t-deepmind",
    "2025-07-10T09:00:00.000Z",
    `Polly Placeholder <${POLLY}>`,
    `Re: ${DEEPMIND}`,
    "Thank you, I'll think about it.",
  ),
  // Our answer to it.
  sent(
    "0a04",
    "t-deepmind",
    "2025-07-10T10:00:00.000Z",
    "Joseph Example <joseph@pauseai.info>",
    POLLY,
    `Re: ${DEEPMIND}`,
    "Thank you.",
    { "In-Reply-To": "<0a03@parliament.example>" },
  ),
  // An automatic reply that names the letter's Message-ID, in another thread.
  got(
    "0a05",
    "t-auto",
    "2026-06-10T09:01:00.000Z",
    `Dora Dummy <${DORA}>`,
    "Automatic reply: Cyber Security and Resilience Bill",
    "I'm away.",
    { "In-Reply-To": "<0a06@mail.gmail.com>", "Auto-Submitted": "auto-replied" },
  ),
  // A template of one, for the CSRB send.
  sent(
    "0a06",
    "t-csrb",
    "2026-06-10T08:59:00.000Z",
    "Joseph Example <joseph@pauseai.uk>",
    DORA,
    "Cyber Security and Resilience Bill, Report stage",
    "Dear Ms Dummy,\n\nPlease support the amendment.\n\nJoseph",
  ),
  // A form letter's email, Cc'ing its sender, in Joseph's Sent.
  sent(
    "0a07",
    "t-frontier",
    "2026-09-25T09:01:00.000Z",
    "Joseph Example <joseph@pauseai.uk>",
    POLLY,
    FRONTIER,
    "Dear Ms Placeholder,\n\nPlease sign.\n\nWendy Webform",
    { Cc: "Wendy.Webform@example.com" },
  ),
  // Its reply, with its subject, not in its thread.
  got(
    "0a08",
    "t-frontier-reply",
    "2026-09-26T09:01:00.000Z",
    `Polly Placeholder <${POLLY}>`,
    `Re: ${FRONTIER}`,
    "Thank you Wendy. I have signed.",
  ),
  // An Edinburgh invitation, and an automatic reply placed by its time alone, with a subject of its own.
  sent(
    "0a09",
    "t-edinburgh",
    "2026-10-01T10:05:00.000Z",
    "Joseph Example <joseph@pauseai.uk>",
    MORAG,
    "Invitation to speak at conference on frontier AI risks",
    "Dear Ms Example,\n\nPlease come to Edinburgh.\n\nJoseph",
  ),
  got(
    "0a10",
    "t-morag",
    "2026-10-01T11:00:00.000Z",
    `Morag Example <${MORAG}>`,
    "Thank you for contacting my office",
    "We'll answer soon.",
  ),
  // A debate's speech text, from policy@, with Joseph's Sent mail for the alias.
  sent(
    "0a11",
    "t-debate",
    "2026-10-15T08:30:00.000Z",
    `PauseAI UK <${POLICY_MAILBOX}>`,
    DORA,
    "Today's debate on emerging risks of advanced AI",
    "Dear Ms Dummy,\n\nHere's the briefing.\n\nJoseph",
  ),
  // A letter to no letter in production: an invitation, added to its mailing.
  sent(
    "0a12",
    "t-russell",
    "2026-07-01T09:00:00.000Z",
    "Joseph Example <joseph@pauseai.info>",
    MO,
    "Invitation to speak on panel with Professor Stuart Russell",
    "Dear Mx Example,\n\nWould you speak?\n\nJoseph",
  ),
  // Joseph's own email to a politician: a one-off, the politician's answer on another subject one too.
  sent(
    "0a13",
    "t-coffee",
    "2026-08-01T09:00:00.000Z",
    "Joseph Example <joseph@pauseai.uk>",
    POLLY,
    "Coffee next week?",
    "Dear Polly,\n\nCould we have a coffee?",
  ),
  got(
    "0a14",
    "t-coffee",
    "2026-08-02T09:00:00.000Z",
    `Polly Placeholder <${POLLY}>`,
    "Re: Coffee next week?",
    "Thursday works.",
    { "In-Reply-To": "<0a13@mail.gmail.com>", References: "<0a13@mail.gmail.com>" },
  ),
  // A staff address on Parliament's domain, about no politician we know.
  got(
    "0a15",
    "t-room",
    "2026-08-03T09:00:00.000Z",
    "Sam Office <sam.office@parliament.uk>",
    "Room booking request",
    "Your room is booked.",
  ),
  // The group's copy, its From rewritten, of a person's reply quoting a form letter.
  mail(
    JOSEPH_MAILBOX,
    "0a16",
    "t-group",
    ["INBOX"],
    "2026-10-02T09:00:00.000Z",
    {
      From: `'Mo Example' via PauseAI UK <${POLICY_MAILBOX}>`,
      "X-Original-From": `Mo Example <${MO}>`,
      To: "PauseAI UK <policy@pauseai.uk>",
      Subject: "Your letter to me",
      "List-Id": "<policy.pauseai.uk>",
      "Message-ID": "<0a16@parliament.example>",
    },
    "Thank you for writing to me.",
  ),
  // A volunteer forwarding a politician's email to the group: someone else, by what it quotes.
  mail(
    JOSEPH_MAILBOX,
    "0a17",
    "t-forward",
    ["INBOX"],
    "2026-10-03T09:00:00.000Z",
    {
      From: "Vera Volunteer <vera.volunteer@example.com>",
      To: "PauseAI UK <policy@pauseai.uk>",
      Subject: "Fwd: My MP's answer",
      "List-Id": "<policy.pauseai.uk>",
      "Message-ID": "<0a17@example.com>",
    },
    `Look at this.\n\nFrom: Polly Placeholder <${POLLY}>\nSent: 2 October 2026 09:00\nTo: Vera Volunteer <vera.volunteer@example.com>\nSubject: Your email\n\nThank you for writing.`,
  ),
  // Mail in the group's archive about nothing to do with a politician.
  mail(
    JOSEPH_MAILBOX,
    "0a18",
    "t-other",
    ["INBOX"],
    "2026-10-04T09:00:00.000Z",
    {
      From: "Neil Nobody <neil.nobody@example.com>",
      To: "PauseAI UK <policy@pauseai.uk>",
      Subject: "Volunteering",
      "List-Id": "<policy.pauseai.uk>",
      "Message-ID": "<0a18@example.com>",
    },
    "How can I help?",
  ),
  // In policy@'s own mail: a volunteer copying policy@ into an email to their MP, and a stray.
  mail(
    POLICY_MAILBOX,
    "0b01",
    "t-copy",
    ["INBOX"],
    "2026-10-30T09:00:00.000Z",
    {
      From: "Vera Volunteer <vera.volunteer@example.com>",
      To: `Mo Example <${MO}>`,
      Cc: POLICY_MAILBOX,
      Subject: "Please back the bill",
      "Message-ID": "<0b01@example.com>",
    },
    "Dear Mo,\n\nPlease back the bill.",
  ),
  mail(
    POLICY_MAILBOX,
    "0b02",
    "t-stray",
    ["INBOX"],
    "2026-10-31T09:00:00.000Z",
    {
      From: "Sue Stranger <sue.stranger@example.com>",
      To: POLICY_MAILBOX,
      Subject: "Are you hiring?",
      "Message-ID": "<0b02@example.com>",
    },
    "Are you?",
  ),
];

/** What a search of a mailbox finds, as the import's searches ask. */
function search(account: string, q: string): OldMail[] {
  const mine = OLD_MAIL.filter((m) => m.account === account);
  if (account === POLICY_MAILBOX) return mine;
  if (q.startsWith("list:")) return mine.filter((m) => /^List-Id:/im.test(m.raw));
  if (q.startsWith("in:sent"))
    return q.includes("to:parliament.uk") ? mine.filter((m) => m.labels.includes("SENT")) : [];
  if (q.startsWith("-in:sent")) {
    return q.includes("from:parliament.uk")
      ? mine.filter((m) => !m.labels.includes("SENT") && !/^List-Id:/im.test(m.raw))
      : [];
  }
  return [];
}

function json(body: unknown): Response {
  return new Response(JSON.stringify(body), { headers: { "Content-Type": "application/json" } });
}

/** A message's headers, by name as written, unfolded. */
function headersOf(raw: string): { name: string; value: string }[] {
  return raw
    .slice(0, raw.indexOf("\r\n\r\n"))
    .split("\r\n")
    .map((line) => ({ name: line.slice(0, line.indexOf(":")), value: line.slice(line.indexOf(":") + 1).trim() }));
}

/**
 * The Gmail API for these two mailboxes: searches, a message by its format,
 * and a thread. Undefined for what it doesn't answer, as the fake for every
 * account does, such as an account's profile.
 */
export function oldMailResponse(account: string, path: string, params: URLSearchParams): Response | undefined {
  if (account !== JOSEPH_MAILBOX && account !== POLICY_MAILBOX) return undefined;
  if (path === "/messages") {
    const found = search(account, params.get("q") ?? "");
    return json({ messages: [...found].reverse().map(({ id, threadId }) => ({ id, threadId })) });
  }
  const thread = /^\/threads\/([\w-]+)$/.exec(path)?.[1];
  if (thread)
    return json({
      messages: OLD_MAIL.filter((m) => m.account === account && m.threadId === thread).map(({ id }) => ({ id })),
    });
  const id = /^\/messages\/(\w+)$/.exec(path)?.[1];
  const message = OLD_MAIL.find((m) => m.account === account && m.id === id);
  if (!message) return undefined;
  const base = {
    id: message.id,
    threadId: message.threadId,
    labelIds: message.labels,
    internalDate: String(Date.parse(message.at)),
  };
  if (params.get("format") === "raw") return json({ ...base, raw: Buffer.from(message.raw).toString("base64url") });
  const headers = headersOf(message.raw);
  if (params.get("format") === "full") {
    const text = message.raw.slice(message.raw.indexOf("\r\n\r\n") + 4);
    return json({
      ...base,
      payload: { headers, mimeType: "text/plain", body: { data: Buffer.from(text).toString("base64url") } },
    });
  }
  const wanted = params.getAll("metadataHeaders").map((name) => name.toLowerCase());
  return json({ ...base, payload: { headers: headers.filter((h) => wanted.includes(h.name.toLowerCase())) } });
}
