import type { BlogPost } from "@/lib/content/blog";
import PostCard from "./PostCard";
import styles from "./PostList.module.css";

// Newest post is the lead story, the next two sit beneath it as a pair, and
// everything older is a compact thumbnail list. `posts` is newest first.
export default function PostList({ posts }: { posts: BlogPost[] }) {
  const [lead, ...rest] = posts;
  const secondary = rest.slice(0, 2);
  const more = rest.slice(2);

  return (
    <section className={styles.listSection}>
      <div className={`container ${styles.inner}`}>
        {lead && <PostCard post={lead} variant="lead" />}

        {secondary.length > 0 && (
          <div className={styles.gridSecondary}>
            {secondary.map((post) => (
              <PostCard key={post.slug} post={post} variant="secondary" />
            ))}
          </div>
        )}

        {more.length > 0 && (
          <section className={styles.more} aria-labelledby="blog-more-heading">
            <h2 id="blog-more-heading" className={styles.moreHeading}>
              More from the blog
            </h2>
            <ul className={styles.moreList}>
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
