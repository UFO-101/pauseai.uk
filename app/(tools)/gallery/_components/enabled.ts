/** Only fixture builds have a gallery: its forms and examples aren't for the public. */
export function galleryEnabled(): boolean {
  return process.env.DATA_FIXTURES === "1";
}
