import type { BlogPost } from "@/lib/content/blog";

// A post's TL;DR and text.
export default function PostBody({ post }: { post: BlogPost }) {
  return (
    <article className="blog-article">
      <div className="container blog-inner">
        {post.tldrContent && (
          <p className="blog-tldr">
            <strong>TL;DR</strong> {post.tldrContent}
          </p>
        )}
        <div className="blog-body">{post.content}</div>
      </div>
    </article>
  );
}
