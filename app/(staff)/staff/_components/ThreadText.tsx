import { mailParts, type MailPart } from "@/lib/email-parsing/mail-text";
import ExternalLink from "./ui/ExternalLink";

/** Pieces of an email's text, each link leaving the site and each bold piece bold. */
function Parts({ parts }: { parts: MailPart[] }) {
  return parts.map((part, i) => {
    if ("link" in part) {
      return (
        <ExternalLink key={i} href={part.link}>
          {part.link}
        </ExternalLink>
      );
    }
    if ("bold" in part) {
      return (
        <strong key={i}>
          <Parts parts={part.bold} />
        </strong>
      );
    }
    return part.text;
  });
}

/** An email's plain text in a thread, with its links and its bold (lib/email-parsing/mail-text.ts). The element around it keeps its lines. */
export default function ThreadText({ text }: { text: string }) {
  return <Parts parts={mailParts(text)} />;
}
