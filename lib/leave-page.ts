/**
 * Goes to another page, in the browser, outside Next's router: for a link
 * that first finishes something, such as saving, before it's followed.
 * Its own module so component tests can stand in for it.
 */
export function leavePage(href: string): void {
  window.location.assign(href);
}
