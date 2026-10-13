import Link from "next/link";
import { formatPostDate, ORGANISATION_AVATAR, postAuthor, type BlogPost } from "@/lib/content/blog";
import { parseCssStyle } from "@/lib/storyRender";

// A post's title and byline: the author's photo and name link to their story
// when they have one; posts by the organisation show its logo.
export default function PostHeader({ post }: { post: BlogPost }) {
  const author = postAuthor(post);
  return (
    <section className="tr-hero">
      <div className="container tr-hero-inner">
        <Link className="blog-back-link" href="/blog/">
          ← All posts
        </Link>
        <h1 className="tr-hero-title blog-post-title">{post.title}</h1>
        <div className="blog-byline">
          {author ? (
            author.person.imageSrc && (
              <Link
                href={`/people/${author.slug}/`}
                className="blog-byline-avatar"
                style={{ backgroundImage: `url("${author.person.imageSrc}")`, ...parseCssStyle(author.person.imageStyle ?? "") }}
                aria-label={`Read ${post.author}'s story`}
              />
            )
          ) : (
            <span
              className="blog-byline-avatar"
              style={{ backgroundImage: `url("${ORGANISATION_AVATAR}")` }}
              aria-hidden="true"
            />
          )}
          <span className="blog-byline-text">
            {author ? (
              <Link href={`/people/${author.slug}/`}>{post.author}</Link>
            ) : (
              <span className="blog-byline-name">{post.author}</span>
            )}
            {" · "}
            <time dateTime={post.date}>{formatPostDate(post.date)}</time>
          </span>
        </div>
      </div>
    </section>
  );
}
