// What components see from next/navigation in browser tests. Outside Next
// there is no router, so vitest.setup.browser.tsx mocks the module and reads
// this: a test sets `navigation.pathname` before rendering, and finds where
// router.push() went in `navigation.pushed`.
export const navigation = { pathname: "/", pushed: [] as string[] };
