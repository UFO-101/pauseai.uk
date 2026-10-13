/**
 * Sends the browser to `url`, as a full page load. A module of its own so
 * component tests can replace it: a test that really navigated would take the
 * test page away with it.
 */
export function navigate(url: string): void {
  window.location.href = url;
}
