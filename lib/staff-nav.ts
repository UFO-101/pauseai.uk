// Whether the staff navigation's sidebar is folded: remembered in this
// browser, and set on <html> as data-staff-nav="folded" before the page
// draws, so a folded sidebar doesn't open and shut on each page.

/** The key in localStorage. */
export const NAV_FOLD_KEY = "staff-nav";

/** Run in the page's head, before it draws: sets <html>'s attribute from localStorage, if the browser lets us read it. */
export const NAV_FOLD_SCRIPT = `try{if(localStorage.getItem(${JSON.stringify(NAV_FOLD_KEY)})==="folded")document.documentElement.dataset.staffNav="folded"}catch(e){}`;
