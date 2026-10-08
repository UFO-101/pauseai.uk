// Hosts Luma serves event cover images from. Luma's own uploads come from
// its CDN; its cover picker also offers Unsplash photos, which keep their
// Unsplash URL.
//
// One list for both sides: next.config.ts allows these for next/image (and
// in the CSP's img-src), and EventList shows a placeholder for a cover from
// anywhere else, since next/image throws on an unconfigured host and takes
// the whole page down with it.
export const EVENT_IMAGE_HOSTS = ["images.lumacdn.com", "images.unsplash.com"];

export function isAllowedEventImage(url: string): boolean {
  try {
    const { protocol, hostname } = new URL(url);
    return protocol === "https:" && EVENT_IMAGE_HOSTS.includes(hostname);
  } catch {
    return false;
  }
}
