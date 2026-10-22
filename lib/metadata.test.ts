import { describe, expect, it } from "vitest";
import { OPEN_GRAPH_IMAGE, TWITTER_IMAGE, pageMetadata } from "./metadata";

describe("pageMetadata", () => {
  it("fills in the social title, images, URL and canonical path", () => {
    expect(pageMetadata({ title: "Governance", description: "Our board.", path: "/governance" })).toEqual({
      title: "Governance",
      description: "Our board.",
      openGraph: {
        title: "PauseAI UK | Governance",
        description: "Our board.",
        images: [OPEN_GRAPH_IMAGE],
        url: "https://pauseai.uk/governance/",
      },
      twitter: { images: [TWITTER_IMAGE] },
      alternates: { canonical: "/governance" },
    });
  });

  it("uses the bare domain for the home page", () => {
    const meta = pageMetadata({ title: "Home", description: "d", path: "/" });
    expect(meta.openGraph?.url).toBe("https://pauseai.uk/");
    expect(meta.alternates?.canonical).toBe("/");
  });

  it("can opt out of the layout's title suffix", () => {
    expect(
      pageMetadata({ title: "What is PauseAI UK?", description: "d", path: "/x", absoluteTitle: true }).title,
    ).toEqual({
      absolute: "What is PauseAI UK?",
    });
  });

  it("lets a page override any social field", () => {
    const meta = pageMetadata({
      title: "Donate",
      description: "Support us.",
      path: "/donate",
      openGraph: { title: "Donate to PauseAI UK", description: "Other words.", url: "https://pauseai.uk/donate" },
    });
    expect(meta.openGraph).toMatchObject({
      title: "Donate to PauseAI UK",
      description: "Other words.",
      url: "https://pauseai.uk/donate",
      images: [OPEN_GRAPH_IMAGE],
    });
    expect(meta.description).toBe("Support us.");
  });

  it("takes a page's own preview images", () => {
    const own = { url: "/images/x/open-graph-1200-630.jpg", width: 1200, height: 630 };
    const meta = pageMetadata({
      title: "X",
      description: "d",
      path: "/x",
      images: { openGraph: own, twitter: "/images/x/open-graph-1600-840.jpg" },
    });
    expect(meta.openGraph?.images).toEqual([own]);
    expect(meta.twitter?.images).toEqual(["/images/x/open-graph-1600-840.jpg"]);
  });
});
