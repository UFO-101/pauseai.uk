/**
 * The server's clock, for everything that renders or stores "now". A fixture
 * build (DATA_FIXTURES=1) sets FIXTURE_NOW, so every run of the storyboard
 * renders the same dates and its frames compare; otherwise the real time.
 * Browser code keeps using new Date(): Playwright fixes the page's clock to
 * the same moment (tests/storyboard/fixtures.ts).
 */
export function now(): Date {
  const fixed = process.env.FIXTURE_NOW;
  return fixed ? new Date(fixed) : new Date();
}
