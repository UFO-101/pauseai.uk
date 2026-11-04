import type { BlogPost, PostSection } from "@/lib/content/blog";
import PostCard from "./PostCard";
import styles from "./PostList.module.css";

// Newest post is the lead story, the next two sit beneath it as a pair, and
// everything older is a compact thumbnail list. `posts` is newest first.
export default function PostList({ posts, section }: { posts: BlogPost[]; section: PostSection }) {
  const [lead, ...rest] = posts;
  const secondary = rest.slice(0, 2);
  const more = rest.slice(2);

  return (
    <section className={styles.listSection}>
      <div className={`container ${styles.inner}`}>
        {lead && <PostCard post={lead} section={section} variant="lead" />}

        {secondary.length > 0 && (
          <div className={styles.gridSecondary}>
            {secondary.map((post) => (
              <PostCard key={post.slug} post={post} section={section} variant="secondary" />
            ))}
          </div>
        )}

        {more.length > 0 && (
          <section className={styles.more} aria-labelledby="posts-more-heading">
            <h2 id="posts-more-heading" className={styles.moreHeading}>
              {section.moreHeading}
            </h2>
            <ul className={styles.moreList}>
              {more.map((post) => (
                <li key={post.slug}>
                  <PostCard post={post} section={section} variant="row" />
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </section>
  );
}
