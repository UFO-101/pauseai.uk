"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useTransition, type ComponentProps } from "react";

/**
 * A link that changes a staff list (a filter's choice, a sort, a page, a
 * tab): a Link whose navigation runs as a transition, so from the click
 * until the new list arrives it's marked data-pending, which dims the list
 * at once (ListFrame) rather than leaving the page still. One in a menu
 * closes it as it's clicked. A click that opens a new tab is the browser's.
 */
export default function ListLink({
  href,
  ...props
}: Omit<ComponentProps<typeof Link>, "onNavigate"> & { href: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const link = useRef<HTMLAnchorElement>(null);
  return (
    <Link
      ref={link}
      href={href}
      data-pending={pending || undefined}
      onNavigate={(event) => {
        event.preventDefault();
        link.current!.closest<HTMLElement>("[popover]")?.hidePopover();
        startTransition(() => router.push(href));
      }}
      {...props}
    />
  );
}
