/**
 * Whether this is a fixture build (DATA_FIXTURES=1): every outside service
 * faked, and with it the things only for development, such as the component
 * gallery and the dev login. Never true on the live site.
 */
export function fixturesEnabled(): boolean {
  return process.env.DATA_FIXTURES === "1";
}
