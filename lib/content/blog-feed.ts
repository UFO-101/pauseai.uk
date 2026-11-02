import { BLOG_FEED_PATH, postAuthor, type BlogPost } from "./blog";
import { site } from "./site";

/** Text made safe inside an XML element or a quoted attribute. */
function xml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

/** A post as an Atom entry: its title, link, date, author, and its summary. */
function entry(post: BlogPost): string {
  const url = `${site.url}/blog/${post.slug}`;
  const author = postAuthor(post);
  const date = `${post.date}T00:00:00Z`;
  return `  <entry>
    <title>${xml(post.title)}</title>
    <link href="${xml(url)}"/>
    <id>${xml(url)}</id>
    <published>${date}</published>
    <updated>${date}</updated>
    <author>
      <name>${xml(post.author)}</name>${author ? `\n      <uri>${xml(`${site.url}/people/${author.slug}`)}</uri>` : ""}
    </author>
    <summary>${xml(post.tldr)}</summary>
  </entry>`;
}

/**
 * The blog as an Atom feed (RFC 4287), its posts in the order given, each
 * with its summary and a link to the post. The feed was last updated on its
 * newest post's date.
 */
export function blogFeed(posts: BlogPost[]): string {
  const updated =
    posts
      .map((post) => post.date)
      .sort()
      .at(-1) ?? "1970-01-01";
  return `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>PauseAI UK blog</title>
  <link href="${site.url}${BLOG_FEED_PATH}" rel="self"/>
  <link href="${site.url}/blog"/>
  <id>${site.url}/blog</id>
  <updated>${updated}T00:00:00Z</updated>
${posts.map(entry).join("\n")}
</feed>
`;
}
