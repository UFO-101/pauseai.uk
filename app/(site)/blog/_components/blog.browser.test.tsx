import { describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";
import { page } from "vitest/browser";
import { createElement } from "react";
import { posts, postsNewestFirst, type BlogPost } from "@/lib/content/blog";
import type { Person } from "@/lib/content/people";
import PostBody from "./PostBody";
import PostCard from "./PostCard";
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
const post = (extra: Partial<BlogPost>): BlogPost => ({
  slug: "a-post",
  title: "A post",
  date: "2026-05-01",
  author: "PauseAI UK",
  tldr: "In short.",
  content: createElement("p", null, "Body text."),
  ...extra,
});

describe("PostList", () => {
  it("leads with the newest post, then a pair, then the rest as a list", async () => {
    const sorted = postsNewestFirst();
    const { container } = await render(<PostList posts={sorted} />);
    expect(container.querySelector(".blog-card-lead .blog-card-title")?.textContent).toBe(sorted[0].title);
    expect(container.querySelectorAll(".blog-grid-secondary .blog-card")).toHaveLength(Math.min(2, sorted.length - 1));
    expect(container.querySelectorAll(".blog-more-list li")).toHaveLength(Math.max(0, sorted.length - 3));
  });

  it("leaves out the pair and the list when there are too few posts", async () => {
    const { container } = await render(<PostList posts={[post({})]} />);
    expect(container.querySelector(".blog-grid-secondary")).toBeNull();
    expect(container.querySelector(".blog-more")).toBeNull();
  });

  it("shows nothing for no posts", async () => {
    const { container } = await render(<PostList posts={[]} />);
    expect(container.querySelector(".blog-card")).toBeNull();
  });
});

describe("PostCard", () => {
  it("shows a photo filling the frame, and a diagram whole", async () => {
    const photo = post({ cover: { src: "/images/x.jpg", width: 10, height: 10 } });
    const diagram = post({ slug: "d", cover: { src: "/images/x.png", width: 10, height: 10 } });
    const { container } = await render(
      <>
        <PostCard post={photo} variant="lead" />
        <PostCard post={diagram} variant="row" />
      </>,
    );
    const media = container.querySelectorAll(".blog-card-media");
    expect(media[0].className).toBe("blog-card-media");
    expect(media[1].className).toBe("blog-card-media is-diagram");
    await expect.element(page.getByText("Latest")).toBeVisible();
    expect(container.querySelector(".blog-card-row h3")).not.toBeNull();
  });

  it("is a text-only card without an image", async () => {
    const { container } = await render(<PostCard post={post({})} variant="secondary" />);
    expect(container.querySelector(".blog-card")?.className).toContain("no-media");
    expect(container.querySelector("h2")?.textContent).toBe("A post");
  });

  it("shows the author's photo, the organisation's logo, or no avatar", async () => {
    const { container } = await render(
      <>
        <PostCard post={post({ author: named.name! })} variant="row" />
        <PostCard post={post({ slug: "b" })} variant="row" />
        <PostCard post={post({ slug: "c", author: noPhoto.name! })} variant="row" />
        <PostCard post={post({ slug: "d", author: framed.name! })} variant="row" />
      </>,
    );
    const avatars = container.querySelectorAll<HTMLElement>(".blog-card-avatar");
    expect(avatars[0].style.backgroundImage).toContain(named.imageSrc);
    expect(avatars[1].style.backgroundImage).toContain("Pause-Symbol.svg");
    expect(avatars[2].style.backgroundPosition).toBe("10% 20%");
    expect(avatars).toHaveLength(3);
  });
});

describe("PostHeader and PostBody", () => {
  it("links a person's byline to their story", async () => {
    const { container, rerender } = await render(<PostHeader post={post({ author: framed.name! })} />);
    expect(container.querySelector<HTMLElement>(".blog-byline-avatar")!.style.backgroundPosition).toBe("10% 20%");
    await rerender(<PostHeader post={post({ author: named.name! })} />);
    await expect
      .element(page.getByRole("link", { name: named.name! }))
      .toHaveAttribute("href", expect.stringContaining("/people/"));
    await expect.element(page.getByRole("link", { name: `Read ${named.name}'s story` })).toBeInTheDocument();
    await expect.element(page.getByRole("link", { name: "← All posts" })).toHaveAttribute("href", "/blog");
  });

  it("shows the organisation's logo as the byline", async () => {
    const { container } = await render(<PostHeader post={post({})} />);
    expect(container.querySelector(".blog-byline-name")?.textContent).toBe("PauseAI UK");
    expect(container.querySelector("time")?.getAttribute("datetime")).toBe("2026-05-01");
  });

  it("has no avatar for an author without a photo", async () => {
    const { container } = await render(<PostHeader post={post({ author: noPhoto.name! })} />);
    expect(container.querySelector(".blog-byline-avatar")).toBeNull();
  });

  it("shows the TL;DR when there is one", async () => {
    const { container, rerender } = await render(<PostBody post={post({ tldrContent: "Short version." })} />);
    expect(container.querySelector(".blog-tldr")?.textContent).toBe("TL;DR Short version.");
    await rerender(<PostBody post={posts[0]} />);
    expect(container.querySelector(".blog-body")).not.toBeNull();
    await rerender(<PostBody post={post({})} />);
    expect(container.querySelector(".blog-tldr")).toBeNull();
  });
});
