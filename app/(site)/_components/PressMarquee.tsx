import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";
import {
  newsRow1,
  newsRow2,
  newsMobileRow1,
  newsMobileRow2,
  newsMobileRow3,
  type CoverageItem,
} from "@/lib/content/press-coverage";

export function NewsRow({ items, reverse = false }: { items: CoverageItem[]; reverse?: boolean }) {
  return (
    <div className={`news-marquee-row${reverse ? " news-marquee-row--reverse" : ""}`}>
      <div className="news-marquee-track">
        {[0, 1].map((copyIdx) => (
          <div key={copyIdx} className="news-marquee-copy" {...(copyIdx > 0 ? { "aria-hidden": true } : {})}>
            {items.map((item, i) => (
              <a
                key={i}
                className="news-marquee-item"
                href={item.url}
                target="_blank"
                rel="noreferrer"
                title={item.title}
                aria-label={`${item.outlet}: ${item.title}`}
                {...(copyIdx > 0 ? { tabIndex: -1 } : {})}
              >
                <div className="news-logo-box">
                  {item.logoSrc ? (
                    <Image
                      className="news-logo"
                      src={item.logoSrc}
                      alt={item.outlet}
                      width={item.logoIntrinsicWidth ?? 100}
                      height={item.logoIntrinsicHeight ?? 44}
                      loading="lazy"
                      style={item.logoHeight ? ({ "--logo-h": item.logoHeight } as CSSProperties) : undefined}
                    />
                  ) : (
                    <span dangerouslySetInnerHTML={{ __html: item.logoHtml! }} />
                  )}
                </div>
              </a>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// Press coverage logos scrolling past: two rows on desktop, three on phones.
export default function PressMarquee() {
  return (
    <section id="news" className="section">
      <div className="news-marquee" aria-label="Press coverage of PauseAI UK">
        <div className="news-marquee-set news-marquee-set--desktop" aria-hidden={false}>
          <NewsRow items={newsRow1} />
          <NewsRow items={newsRow2} reverse />
        </div>
        <div className="news-marquee-set news-marquee-set--mobile" aria-hidden={true}>
          <NewsRow items={newsMobileRow1} />
          <NewsRow items={newsMobileRow2} reverse />
          <NewsRow items={newsMobileRow3} />
        </div>
      </div>
      <div className="container news-marquee-cta">
        <Link className="inline-link" href="/press/">
          See our press page →
        </Link>
      </div>
    </section>
  );
}
