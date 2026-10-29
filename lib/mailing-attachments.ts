// How big a file a mailing can attach, for the page to check before it
// uploads and the server to refuse, from the same number.

/**
 * The largest file a mailing can attach: it comes in one Server Action's
 * request, which Next.js takes up to `bodySizeLimit` (next.config.ts), and
 * Netlify up to 6MB.
 */
export const MAX_ATTACHMENT_BYTES = 4 * 1024 * 1024;
