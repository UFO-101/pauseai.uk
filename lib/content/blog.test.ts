import Image from "next/image";
import { createElement, Fragment } from "react";
import { describe, expect, it } from "vitest";
import { findPost, firstPostImage, postImage, posts, type BlogPost } from "./blog";

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
    const content = createElement("div", null, createElement("img", { src: "/c.png", alt: "C", width: "600", height: "300" }));
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
    const content = createElement("figure", null, createElement(Image, { src: "/a.jpg", alt: "A", width: 10, height: 5 }));
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
