// What components see from next/navigation in browser tests. Outside Next
// there is no router, so tests/vitest.setup.browser.tsx mocks the module and reads
// this: a test sets `navigation.pathname` before rendering, finds where
// router.push() went in `navigation.pushed`, and how often router.refresh()
// was called in `navigation.refreshes`.
export const navigation = { pathname: "/", pushed: [] as string[], refreshes: 0 };
