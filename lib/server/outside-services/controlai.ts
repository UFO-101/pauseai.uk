import "server-only";
import { extractText } from "unpdf";
import { CONTROLAI_LETTER_PAGE, pdfUrlIn } from "@/lib/controlai-letter";
import { outsideFetch } from "./outside-fetch";

// ControlAI's letter to the PM, read from its page on their site and the
// PDF it links to. lib/controlai-letter.ts reads the names out of it.

async function fetchOk(url: string): Promise<Response> {
  const res = await outsideFetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`${url} returned ${res.status}`);
  return res;
}

/** The letter's text, from the PDF the page links to. */
export async function fetchLetter(): Promise<{ pdfUrl: string; text: string }> {
  const html = await (await fetchOk(CONTROLAI_LETTER_PAGE)).text();
  const pdfUrl = pdfUrlIn(html);
  if (!pdfUrl) throw new Error(`No PDF linked from ${CONTROLAI_LETTER_PAGE}`);
  const pdf = new Uint8Array(await (await fetchOk(pdfUrl)).arrayBuffer());
  const { text } = await extractText(pdf, { mergePages: true });
  return { pdfUrl, text };
}
