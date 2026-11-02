import Link from "next/link";
import { formatPostDate, ORGANISATION_AVATAR, postAuthor, type BlogPost, type PostSection } from "@/lib/content/blog";
import { parseCssStyle } from "@/lib/storyRender";
import PageHero from "@/components/ui/PageHero";
import styles from "./PostHeader.module.css";

// A post's title, its link back to its section's index, and its byline: the author's photo and name link to their story
// when they have one; posts by the organisation show its logo.
export default function PostHeader({ post, section }: { post: BlogPost; section: PostSection }) {
  const author = postAuthor(post);
  return (
    <PageHero
      title={post.title}
      smallTitle
      before={
        <Link className={styles.backLink} href={`${section.path}/`}>
          {section.backLink}
        </Link>
      }
    >
      <div className={styles.byline}>
        {author ? (
          author.person.imageSrc && (
            <Link
              href={`/people/${author.slug}/`}
              className={styles.bylineAvatar}
              style={{
                backgroundImage: `url("${author.person.imageSrc}")`,
                ...parseCssStyle(author.person.imageStyle ?? ""),
              }}
              aria-label={`Read ${post.author}'s story`}
            />
          )
        ) : (
          <span
            className={styles.bylineAvatar}
            style={{ backgroundImage: `url("${ORGANISATION_AVATAR}")` }}
            aria-hidden="true"
          />
        )}
        <span className={styles.bylineText}>
          {author ? (
            <Link href={`/people/${author.slug}/`}>{post.author}</Link>
          ) : (
            <span className={styles.bylineName}>{post.author}</span>
          )}
          {" · "}
          <time dateTime={post.date}>{formatPostDate(post.date)}</time>
        </span>
      </div>
    </PageHero>
  );
}
