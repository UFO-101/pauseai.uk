import { describe, expect, it } from "vitest";
import { attachmentSize, emailView } from "./email-view";
import type { OutboxEmail } from "./outbox";

const email: OutboxEmail = {
  From: '"Jane <Smith>" <reply+abc@letters.pauseai.uk>',
  To: "test-mp@example.org",
  Subject: "Pause AI & <you>",
  Date: "Thu, 01 Oct 2026 09:30:00 GMT",
  TextBody: "Dear Testy,\n\n<Please> sign.",
  Attachments: [],
};

describe("emailView", () => {
  it("shows the headers it has, escaped, and the text in a mail app's font", () => {
    const html = emailView(email);
    expect(html).toContain("<title>Pause AI &amp; &lt;you&gt;</title>");
    expect(html).toContain("<dt>From</dt><dd>&quot;Jane &lt;Smith&gt;&quot; &lt;reply+abc@letters.pauseai.uk&gt;</dd>");
    expect(html).toContain("<dt>Date</dt><dd>Thu, 01 Oct 2026 09:30:00 GMT</dd>");
    expect(html).not.toContain("<dt>Cc</dt>");
    expect(html).not.toContain("<dt>Reply-To</dt>");
    expect(html).toContain('<pre class="text">Dear Testy,\n\n&lt;Please&gt; sign.</pre>');
    expect(html).not.toContain("Attachments");
  });

  it("shows the HTML body as it is, every header, and each attachment", () => {
    const html = emailView({
      ...email,
      Cc: "cc@example.org",
      Bcc: "replies@pauseai.uk",
      ReplyTo: "jane@example.com",
      HtmlBody: "<p><strong>Please</strong> sign.</p>",
      Attachments: [{ Name: "letter <1>.pdf", ContentType: "application/pdf", Content: "AAAA" }],
    });
    expect(html).toContain('<div class="body"><p><strong>Please</strong> sign.</p></div>');
    expect(html).not.toContain('<pre class="text">');
    for (const name of ["Cc", "Bcc", "Reply-To"]) expect(html).toContain(`<dt>${name}</dt>`);
    expect(html).toContain(
      'aria-label="Attachments"><li>letter &lt;1&gt;.pdf<small>application/pdf, 3 bytes</small></li>',
    );
  });
});

describe("attachmentSize", () => {
  it("gives bytes, KB or MB, as a mail app does", () => {
    const of = (bytes: number) => attachmentSize(Buffer.alloc(bytes).toString("base64"));
    expect(of(1023)).toBe("1023 bytes");
    expect(of(1024)).toBe("1 KB");
    expect(of(300 * 1024)).toBe("300 KB");
    expect(of(1024 * 1024)).toBe("1.0 MB");
    expect(of(2.5 * 1024 * 1024)).toBe("2.5 MB");
  });
});
