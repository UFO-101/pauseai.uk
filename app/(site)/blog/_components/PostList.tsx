import type { BlogPost } from "@/lib/content/blog";
import PostCard from "./PostCard";

// Newest post is the lead story, the next two sit beneath it as a pair, and
// everything older is a compact thumbnail list. `posts` is newest first.
export default function PostList({ posts }: { posts: BlogPost[] }) {
  const [lead, ...rest] = posts;
  const secondary = rest.slice(0, 2);
  const more = rest.slice(2);

  return (
    <section className="blog-list-section">
      <div className="container blog-inner">
        {lead && <PostCard post={lead} variant="lead" />}

        {secondary.length > 0 && (
          <div className="blog-grid-secondary">
            {secondary.map((post) => (
              <PostCard key={post.slug} post={post} variant="secondary" />
            ))}
          </div>
        )}

        {more.length > 0 && (
          <section className="blog-more" aria-labelledby="blog-more-heading">
            <h2 id="blog-more-heading" className="blog-more-heading">
              More from the blog
            </h2>
            <ul className="blog-more-list">
              {more.map((post) => (
                <li key={post.slug}>
                  <PostCard post={post} variant="row" />
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </section>
  );
}
