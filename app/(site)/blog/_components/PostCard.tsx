import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";
import { formatPostDate, ORGANISATION_AVATAR, postAuthor, postImage, type BlogPost } from "@/lib/content/blog";
import { parseCssStyle } from "@/lib/storyRender";

/** "lead" for the newest post, "secondary" for the pair beneath it, "row" for the rest. */
export type CardVariant = "lead" | "secondary" | "row";

const MEDIA_SIZES: Record<CardVariant, string> = {
  lead: "(max-width: 860px) 100vw, 600px",
  secondary: "(max-width: 860px) 100vw, 530px",
  row: "(max-width: 600px) 112px, 200px",
};

function avatarStyle(post: BlogPost): CSSProperties | null {
  const author = postAuthor(post);
  if (!author) return { backgroundImage: `url("${ORGANISATION_AVATAR}")` };
  if (!author.person.imageSrc) return null;
  return { backgroundImage: `url("${author.person.imageSrc}")`, ...parseCssStyle(author.person.imageStyle ?? "") };
}

export default function PostCard({ post, variant }: { post: BlogPost; variant: CardVariant }) {
  const image = postImage(post);
  // Diagrams (the PNG figures) are shown whole on white; photos fill the frame.
  const isDiagram = image?.src.endsWith(".png") ?? false;
  const avatar = avatarStyle(post);
  const Title = variant === "row" ? "h3" : "h2";
  return (
    <Link href={`/blog/${post.slug}/`} className={`blog-card blog-card-${variant}${image ? "" : " no-media"}`}>
      {image && (
        <div className={`blog-card-media${isDiagram ? " is-diagram" : ""}`}>
          {/* Decorative here: the card's text already says what the post is. */}
          <Image src={image.src} alt="" fill sizes={MEDIA_SIZES[variant]} priority={variant === "lead"} />
        </div>
      )}
      <div className="blog-card-body">
        {variant === "lead" && <p className="blog-card-kicker">Latest</p>}
        <Title className="blog-card-title">{post.title}</Title>
        <p className="blog-card-tldr">{post.tldr}</p>
        <p className="blog-card-meta">
          {avatar && <span className="blog-card-avatar" style={avatar} aria-hidden="true" />}
          {post.author} · {formatPostDate(post.date)}
        </p>
      </div>
    </Link>
  );
}
