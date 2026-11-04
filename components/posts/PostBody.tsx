import type { BlogPost } from "@/lib/content/blog";
import styles from "./PostBody.module.css";

// A post's TL;DR and text.
export default function PostBody({ post }: { post: BlogPost }) {
  return (
    <article className={styles.article}>
      <div className={`container ${styles.inner}`}>
        {post.tldrContent && (
          <p className={styles.tldr}>
            <strong>TL;DR</strong> {post.tldrContent}
          </p>
        )}
        <div className={styles.body}>{post.content}</div>
      </div>
    </article>
  );
}
