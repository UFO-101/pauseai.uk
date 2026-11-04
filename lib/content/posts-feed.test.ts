import { describe, expect, it } from "vitest";
import { BLOG, type BlogPost } from "./blog";
import { postsFeed } from "./posts-feed";

const post: BlogPost = {
  slug: "a-post",
  title: "Pause & think <now>",
  date: "2026-03-04",
  author: "PauseAI UK",
  tldr: `Why we say "pause", and what's next.`,
  content: null,
};

describe("postsFeed", () => {
  it("is an Atom feed of the posts, each with its link, date, author and summary, escaped", () => {
    const feed = postsFeed([post], BLOG);
    expect(feed).toMatch(/^<\?xml version="1.0" encoding="utf-8"\?>\n<feed xmlns="http:\/\/www.w3.org\/2005\/Atom">/);
    expect(feed).toContain("  <title>PauseAI UK blog</title>\n");
    expect(feed).toContain('<link href="https://pauseai.uk/blog/feed.xml" rel="self"/>');
    expect(feed).toContain("<updated>2026-03-04T00:00:00Z</updated>");
    expect(feed).toContain(`  <entry>
    <title>Pause &amp; think &lt;now&gt;</title>
    <link href="https://pauseai.uk/blog/a-post"/>
    <id>https://pauseai.uk/blog/a-post</id>
    <published>2026-03-04T00:00:00Z</published>
    <updated>2026-03-04T00:00:00Z</updated>
    <author>
      <name>PauseAI UK</name>
    </author>
    <summary>Why we say &quot;pause&quot;, and what&apos;s next.</summary>
  </entry>`);
  });

  it("links a person's byline to their story, and is updated on the newest post's date", () => {
    const feed = postsFeed(
      [
        { ...post, date: "2026-01-01" },
        { ...post, slug: "b", author: "Harry Turnbull", date: "2026-05-06" },
      ],
      BLOG,
    );
    expect(feed).toContain(
      "      <name>Harry Turnbull</name>\n      <uri>https://pauseai.uk/people/harry-turnbull</uri>\n",
    );
    expect(feed.match(/<updated>[^<]*<\/updated>/)![0]).toBe("<updated>2026-05-06T00:00:00Z</updated>");
  });

  it("is a valid feed with no posts", () => {
    expect(postsFeed([], BLOG)).toContain("<updated>1970-01-01T00:00:00Z</updated>\n\n</feed>\n");
  });

  it("is another section's feed, at its path, under its title", () => {
    const section = { path: "/campaigns/news", backLink: "Back", moreHeading: "More", feedTitle: "News & views" };
    const feed = postsFeed([post], section);
    expect(feed).toContain("  <title>News &amp; views</title>\n");
    expect(feed).toContain('<link href="https://pauseai.uk/campaigns/news/feed.xml" rel="self"/>');
    expect(feed).toContain(
      '<link href="https://pauseai.uk/campaigns/news"/>\n  <id>https://pauseai.uk/campaigns/news</id>',
    );
    expect(feed).toContain('<link href="https://pauseai.uk/campaigns/news/a-post"/>');
  });
});
