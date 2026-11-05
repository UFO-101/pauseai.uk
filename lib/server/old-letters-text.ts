import "server-only";
import { parseMime } from "./mime";
import { wholeTextOf } from "./letter-threads";

/** Some HTML's text, as a message of only HTML is read. */
export function htmlAsText(html: string): string {
  return wholeTextOf(parseMime(`Content-Type: text/html; charset=utf-8\r\n\r\n${html}`));
}
