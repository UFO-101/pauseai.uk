// Reading and writing who an email is from and to, in the text of its headers.

/** Someone as an email names them: their name and address, or their address alone. */
export const named = (name: string | null | undefined, address: string | null) =>
  [name, name && address ? `<${address}>` : address].filter(Boolean).join(" ");

/** The addresses in some header's text, lowercased. */
export function addressesIn(line: string): string[] {
  return (line.toLowerCase().match(/[\w.+'&-]+@[\w.-]+\.\w+/g) ?? []).filter(Boolean);
}

/** The bare address in a To header, lowercased: `"Jane" <Jane@example.org>` is jane@example.org. */
export function bareAddress(to: string): string {
  return (/<([^>]*)>\s*$/.exec(to)?.[1] ?? to).trim().toLowerCase();
}

/** The people on a header's line, name and address, reading commas inside quotes as part of a name. */
export function mailboxes(line: string): { name: string; address: string }[] {
  const parts = line.match(/(?:"[^"]*"|<[^>]*>|[^,])+/g) ?? [];
  return parts
    .filter((part) => part.trim())
    .map((part) => {
      const address = addressesIn(part)[0] ?? "";
      const name = part
        .replace(/<[^>]*>/, "")
        .trim()
        .replace(/^"|"$/g, "");
      return { name: name.toLowerCase() === address ? "" : name, address };
    });
}

/** Who a message is really from: the group rewrote many Froms as "'Some MP' via PauseAI UK", with the real one elsewhere. */
export function realSender(from: string, originalFrom?: string, replyTo?: string): string {
  if (originalFrom) return originalFrom;
  return / via /i.test(from) && replyTo ? firstMailbox(replyTo) : from;
}

/** The first of the addresses on a header's line, a comma inside a quoted name not ending it. */
function firstMailbox(line: string): string {
  return /^(?:"[^"]*"|[^,"])*/.exec(line)![0].trim();
}
