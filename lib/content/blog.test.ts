import Image from "next/image";
import { createElement, Fragment } from "react";
import { describe, expect, it } from "vitest";
import {
  checkPostAuthors,
  findPost,
  firstPostImage,
  formatPostDate,
  postAuthor,
  postImage,
  postJsonLd,
  postMetadata,
  posts,
  postsNewestFirst,
  type BlogPost,
} from "./blog";

const base: Omit<BlogPost, "content"> = {
  slug: "test",
  title: "Test",
  date: "2026-01-01",
  author: "PauseAI UK",
  tldr: "",
};

describe("firstPostImage", () => {
  it("is null for a post with no images", () => {
    const content = createElement(Fragment, null, createElement("p", null, "hello"), createElement("p", null, "world"));
    expect(firstPostImage({ ...base, content })).toBeNull();
  });

  it("finds the first next/image nested in fragments and figures, with its dimensions and alt", () => {
    const content = createElement(
      Fragment,
      null,
      createElement("p", null, "intro"),
      createElement("figure", null, createElement(Image, { src: "/a.jpg", alt: "First", width: 1280, height: 853 })),
      createElement("figure", null, createElement(Image, { src: "/b.jpg", alt: "Second", width: 10, height: 10 })),
    );
    expect(firstPostImage({ ...base, content })).toEqual({ src: "/a.jpg", width: 1280, height: 853, alt: "First" });
  });

  it("accepts a plain img and string dimensions", () => {
    const content = createElement(
      "div",
      null,
      createElement("img", { src: "/c.png", alt: "C", width: "600", height: "300" }),
    );
    expect(firstPostImage({ ...base, content })).toEqual({ src: "/c.png", width: 600, height: 300, alt: "C" });
  });

  it("uses the audience photo for the Parliament post", () => {
    const post = findPost("parliament-experts-agree-government-must-act-on-ai-risk");
    expect(post).toBeDefined();
    expect(firstPostImage(post!)?.src).toBe("/images/parliament-conference-sep-2026/audience.jpg");
  });

  it("only ever returns site-relative image paths with dimensions", () => {
    for (const post of posts) {
      const image = firstPostImage(post);
      if (!image) continue;
      expect(image.src, post.slug).toMatch(/^\/images\//);
      expect(image.width, post.slug).toBeGreaterThan(0);
      expect(image.height, post.slug).toBeGreaterThan(0);
    }
  });
});

describe("postImage", () => {
  it("prefers an explicit cover over the first content image, and falls back to it", () => {
    const content = createElement(
      "figure",
      null,
      createElement(Image, { src: "/a.jpg", alt: "A", width: 10, height: 5 }),
    );
    const cover = { src: "/cover.jpg", width: 800, height: 450, alt: "Cover" };
    expect(postImage({ ...base, content, cover })).toEqual(cover);
    expect(postImage({ ...base, content })).toEqual({ src: "/a.jpg", width: 10, height: 5, alt: "A" });
    expect(postImage({ ...base, content: createElement("p", null, "text") })).toBeNull();
  });

  it("every cover points at a site-relative image with dimensions", () => {
    for (const post of posts) {
      if (!post.cover) continue;
      expect(post.cover.src, post.slug).toMatch(/^\/images\//);
      expect(post.cover.width, post.slug).toBeGreaterThan(0);
      expect(post.cover.height, post.slug).toBeGreaterThan(0);
    }
  });
});

describe("firstPostImage edge cases", () => {
  it("searches arrays of children in order, skipping ones without images", () => {
    const content = [createElement("p", { key: 1 }, "x"), [createElement("img", { key: 2, src: "/in-array.png" })]];
    expect(firstPostImage({ ...base, content })).toEqual({
      src: "/in-array.png",
      width: undefined,
      height: undefined,
      alt: undefined,
    });
  });

  it("is null for an array with no images", () => {
    expect(firstPostImage({ ...base, content: [createElement("p", { key: 1 }, "x"), "text"] })).toBeNull();
  });

  it("reads a statically imported image's own dimensions", () => {
    const photo = { src: "/_next/static/media/photo.123.jpg", width: 640, height: 480 };
    const content = createElement(Image, { src: photo, alt: "Static" });
    expect(firstPostImage({ ...base, content })).toEqual({ src: photo.src, width: 640, height: 480, alt: "Static" });
  });

  it("ignores objects that aren't React elements", () => {
    expect(firstPostImage({ ...base, content: { not: "an element" } as never })).toBeNull();
  });

  it("gives up on an image whose src isn't a string or static import", () => {
    expect(firstPostImage({ ...base, content: createElement("img", { alt: "no src" }) })).toBeNull();
  });

  it("ignores dimensions that aren't numbers", () => {
    const content = createElement("img", { src: "/x.png", width: "wide", height: Number.NaN });
    expect(firstPostImage({ ...base, content })).toMatchObject({ width: undefined, height: undefined });
  });
});

describe("post helpers", () => {
  const byPerson = posts.find((post) => post.author !== "PauseAI UK")!;
  const byOrganisation = posts.find((post) => post.author === "PauseAI UK")!;

  it("finds a person author's story, and none for the organisation", () => {
    expect(postAuthor(byPerson)?.person.name).toBe(byPerson.author);
    expect(postAuthor(byPerson)?.slug).toMatch(/^[a-z0-9-]+$/);
    expect(postAuthor(byOrganisation)).toBeNull();
  });

  it("formats dates in UK style", () => {
    expect(formatPostDate("2026-09-03")).toBe("3 September 2026");
  });

  it("lists posts newest first", () => {
    const dates = postsNewestFirst().map((post) => post.date);
    expect(dates).toEqual([...dates].sort().reverse());
    expect(dates).toHaveLength(posts.length);
  });

  it("finds a post by slug, or nothing", () => {
    expect(findPost(posts[0].slug)).toBe(posts[0]);
    expect(findPost("no-such-post")).toBeUndefined();
  });

  it("rejects a post by an author who isn't in people.ts", () => {
    expect(() => checkPostAuthors([{ ...base, author: "Nobody Known", content: null }])).toThrow(/Nobody Known/);
    expect(() => checkPostAuthors([{ ...base, author: "PauseAI UK", content: null }])).not.toThrow();
    expect(() => checkPostAuthors(posts)).not.toThrow();
  });
});

describe("postMetadata", () => {
  it("uses the post's image for social previews", () => {
    const cover = { src: "/images/c.jpg", width: 800, height: 450, alt: "C" };
    const meta = postMetadata({ ...base, slug: "my-post", title: "My post", tldr: "Short.", content: null, cover });
    expect(meta).toEqual({
      title: "My post",
      description: "Short.",
      openGraph: {
        title: "My post",
        description: "Short.",
        images: [{ url: "/images/c.jpg", width: 800, height: 450, alt: "C" }],
        url: "https://pauseai.uk/blog/my-post/",
        type: "article",
      },
      twitter: { images: ["/images/c.jpg"] },
      alternates: { canonical: "/blog/my-post" },
    });
  });

  it("falls back to the site's cards without an image", () => {
    const meta = postMetadata({ ...base, content: null });
    expect(meta.openGraph?.images).toEqual([
      { url: "/images/open-graph/open-graph-1200-630.jpg", width: 1200, height: 630 },
    ]);
    expect(meta.twitter?.images).toEqual(["/images/open-graph/open-graph-1600-840.jpg"]);
  });
});

describe("postJsonLd", () => {
  it("credits a person author with a link to their story", () => {
    const post = posts.find((p) => p.author !== "PauseAI UK")!;
    const data = postJsonLd(post);
    expect(data.author).toEqual({
      "@type": "Person",
      name: post.author,
      url: `https://pauseai.uk/people/${postAuthor(post)!.slug}`,
    });
    expect(data.url).toBe(`https://pauseai.uk/blog/${post.slug}`);
  });

  it("credits the organisation, with the default image when the post has none", () => {
    const data = postJsonLd({ ...base, content: null });
    expect(data.author).toEqual({ "@type": "Organization", name: "PauseAI UK" });
    expect(data.image).toBe("https://pauseai.uk/images/open-graph/open-graph-1200-630.jpg");
  });
});
