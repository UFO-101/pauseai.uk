import { describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";
import { page } from "vitest/browser";
import { BLOG, newestFirst, posts, type BlogPost, type PostSection } from "@/lib/content/blog";
import type { Person } from "@/lib/content/people";
import PostBody from "./PostBody";
import PostCard from "./PostCard";
import { examplePost } from "./PostCard.examples";
import PostHeader from "./PostHeader";
import PostList from "./PostList";

// Authors of each kind, whatever the real people happen to be.
const { named, framed, noPhoto } = vi.hoisted(() => ({
  named: { name: "Ada Test", paragraphs: [], imageSrc: "/images/people/ada.jpg" } as Person,
  framed: {
    name: "Bea Test",
    paragraphs: [],
    imageSrc: "/images/people/bea.jpg",
    imageStyle: "background-position: 10% 20%;",
  } as Person,
  noPhoto: { name: "Cy Test", paragraphs: [] } as Person,
}));
vi.mock("@/lib/content/people", async (importActual) => {
  const actual = await importActual<typeof import("@/lib/content/people")>();
  return { ...actual, people: [...actual.people, named, framed, noPhoto] };
});
const post = (extra: Partial<BlogPost>): BlogPost => ({ ...examplePost, ...extra });
const OTHER: PostSection = {
  path: "/elsewhere",
  backLink: "Back to elsewhere",
  moreHeading: "More from elsewhere",
  feedTitle: "Elsewhere",
};

describe("PostList", () => {
  it("leads with the newest post, then a pair, then the rest as a list", async () => {
    const sorted = newestFirst(posts);
    const { container } = await render(<PostList posts={sorted} section={BLOG} />);
    const lead = container.querySelector("a")!;
    expect(lead.querySelector("h2")?.textContent).toBe(sorted[0].title);
    expect(lead.textContent).toContain("Latest");
    // The pair: the framed cards after the lead, side by side in one grid.
    const pair = [...container.querySelectorAll("a:has(h2)")].slice(1);
    expect(pair).toHaveLength(Math.min(2, sorted.length - 1));
    for (const card of pair) {
      expect(card.parentElement).toBe(pair[0].parentElement);
      expect(card.parentElement).not.toBe(lead.parentElement);
    }
    const more = page.getByRole("region", { name: "More from the blog" });
    expect(more.getByRole("listitem").elements()).toHaveLength(Math.max(0, sorted.length - 3));
  });

  it("leaves out the pair and the list when there are too few posts", async () => {
    const { container } = await render(<PostList posts={[post({})]} section={BLOG} />);
    const lead = container.querySelector("a")!;
    expect(lead.parentElement!.children).toHaveLength(1);
    expect(page.getByRole("region", { name: "More from the blog" }).query()).toBeNull();
    expect(page.getByRole("list").query()).toBeNull();
  });

  it("links to its section's pages, under its heading for older posts", async () => {
    const list = Array.from({ length: 4 }, (_, i) => post({ slug: `p${i}` }));
    const { container } = await render(<PostList posts={list} section={OTHER} />);
    expect([...container.querySelectorAll("a")].map((a) => a.getAttribute("href"))).toEqual([
      "/elsewhere/p0",
      "/elsewhere/p1",
      "/elsewhere/p2",
      "/elsewhere/p3",
    ]);
    await expect.element(page.getByRole("region", { name: "More from elsewhere" })).toBeVisible();
  });

  it("shows nothing for no posts", async () => {
    const { container } = await render(<PostList posts={[]} section={BLOG} />);
    expect(container.querySelector("a")).toBeNull();
  });
});

describe("PostCard", () => {
  it("shows a photo filling the frame, and a diagram whole", async () => {
    const photo = post({ cover: { src: "/images/x.jpg", width: 10, height: 10 } });
    const diagram = post({ slug: "d", cover: { src: "/images/x.png", width: 10, height: 10 } });
    const { container } = await render(
      <>
        <PostCard post={photo} section={BLOG} variant="lead" />
        <PostCard post={diagram} section={BLOG} variant="row" />
      </>,
    );
    const images = container.querySelectorAll("img");
    expect(images).toHaveLength(2);
    expect(getComputedStyle(images[0]).objectFit).toBe("cover");
    expect(getComputedStyle(images[1]).objectFit).toBe("contain");
    await expect.element(page.getByText("Latest")).toBeVisible();
    expect(container.querySelectorAll("a")[1].querySelector("h3")).not.toBeNull();
  });

  it("is a text-only card without an image", async () => {
    const { container } = await render(<PostCard post={post({})} section={BLOG} variant="secondary" />);
    expect(container.querySelector("a img")).toBeNull();
    expect(container.querySelector("h2")?.textContent).toBe("A post");
  });

  it("shows the author's photo, the organisation's logo, or no avatar", async () => {
    const { container } = await render(
      <>
        <PostCard post={post({ author: named.name! })} section={BLOG} variant="row" />
        <PostCard post={post({ slug: "b" })} section={BLOG} variant="row" />
        <PostCard post={post({ slug: "c", author: noPhoto.name! })} section={BLOG} variant="row" />
        <PostCard post={post({ slug: "d", author: framed.name! })} section={BLOG} variant="row" />
      </>,
    );
    const avatars = container.querySelectorAll<HTMLElement>('span[aria-hidden="true"]');
    expect(avatars[0].style.backgroundImage).toContain(named.imageSrc);
    expect(avatars[1].style.backgroundImage).toContain("Pause-Symbol.svg");
    expect(avatars[2].style.backgroundPosition).toBe("10% 20%");
    expect(avatars).toHaveLength(3);
  });
});

describe("PostHeader and PostBody", () => {
  it("links a person's byline to their story", async () => {
    const { rerender } = await render(<PostHeader post={post({ author: framed.name! })} section={BLOG} />);
    const avatar = page.getByRole("link", { name: `Read ${framed.name}'s story` }).element() as HTMLElement;
    expect(avatar.style.backgroundPosition).toBe("10% 20%");
    await rerender(<PostHeader post={post({ author: named.name! })} section={BLOG} />);
    await expect
      .element(page.getByRole("link", { name: named.name! }))
      .toHaveAttribute("href", expect.stringContaining("/people/"));
    await expect.element(page.getByRole("link", { name: `Read ${named.name}'s story` })).toBeInTheDocument();
    await expect.element(page.getByRole("link", { name: "← All posts" })).toHaveAttribute("href", "/blog");
  });

  it("shows the organisation's logo as the byline", async () => {
    const { container } = await render(<PostHeader post={post({})} section={BLOG} />);
    await expect.element(page.getByText("PauseAI UK", { exact: true })).toBeVisible();
    expect(page.getByRole("link", { name: "PauseAI UK" }).query()).toBeNull();
    expect(container.querySelector<HTMLElement>('span[aria-hidden="true"]')?.style.backgroundImage).toContain(
      "Pause-Symbol.svg",
    );
    expect(container.querySelector("time")?.getAttribute("datetime")).toBe("2026-05-01");
  });

  it("links back to its section's index", async () => {
    await render(<PostHeader post={post({})} section={OTHER} />);
    await expect.element(page.getByRole("link", { name: "Back to elsewhere" })).toHaveAttribute("href", "/elsewhere");
  });

  it("has no avatar for an author without a photo", async () => {
    const { container } = await render(<PostHeader post={post({ author: noPhoto.name! })} section={BLOG} />);
    expect(page.getByRole("link", { name: `Read ${noPhoto.name}'s story` }).query()).toBeNull();
    expect(container.querySelector('span[aria-hidden="true"]')).toBeNull();
  });

  it("shows the TL;DR when there is one", async () => {
    const { container, rerender } = await render(<PostBody post={post({ tldrContent: "Short version." })} />);
    expect(page.getByText("TL;DR").element().parentElement?.textContent).toBe("TL;DR Short version.");
    await rerender(<PostBody post={posts[0]} />);
    expect(container.querySelector("article p")).not.toBeNull();
    await rerender(<PostBody post={post({})} />);
    expect(page.getByText("TL;DR").query()).toBeNull();
    await expect.element(page.getByText("Body text.")).toBeVisible();
  });
});
