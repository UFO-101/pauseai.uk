"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition, type ComponentProps } from "react";

/**
 * A link in the staff pages that goes to another page or changes a list (a
 * page in the navigation, a filter's choice, a sort, a page of a list, a
 * tab). Its navigation runs as a transition, so the page stays as it is
 * until the next one arrives, and from the click until then the link is
 * marked data-pending: it shows as chosen at once (the navigation, Tabs,
 * SortHeading, a filter's choices and ListFrame's pages style it so), and if
 * it takes a while a thin line runs along the top (StaffPage). Once it's
 * hovered or focused, Next fetches its page whole, so a click a moment
 * later shows it at once. A click that opens a new tab is the browser's.
 */
export default function StaffLink({
  href,
  ...props
}: Omit<ComponentProps<typeof Link>, "onNavigate" | "prefetch"> & { href: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  // Whether someone looks about to follow it: then its page is fetched whole, not only its outline.
  const [likely, setLikely] = useState(false);
  const intend = () => setLikely(true);
  return (
    <Link
      href={href}
      prefetch={likely ? true : null}
      onMouseEnter={intend}
      onFocus={intend}
      onTouchStart={intend}
      data-pending={pending || undefined}
      onNavigate={(event) => {
        event.preventDefault();
        startTransition(() => router.push(href));
      }}
      {...props}
    />
  );
}
