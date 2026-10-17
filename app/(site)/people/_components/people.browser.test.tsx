import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";
import { page } from "vitest/browser";
import { people, personSlug, type Person } from "@/lib/content/people";
import { site } from "@/lib/content/site";
import PersonHeader from "./PersonHeader";
import PersonStory from "./PersonStory";
import ShareYourStory from "./ShareYourStory";
import StoryGrid from "./StoryGrid";

afterEach(() => vi.restoreAllMocks());

describe("people pages", () => {
  it("shows a person's photo, or initials, and their name", async () => {
    const withPhoto = people.find((p) => p.imageSrc && p.name)!;
    const { container, rerender } = await render(<PersonHeader person={withPhoto} />);
    await expect.element(page.getByRole("heading", { level: 1 })).toHaveTextContent(withPhoto.name!);
    expect((container.querySelector("[style*='background-image']") as HTMLElement).style.backgroundImage).not.toBe("");
    await rerender(<PersonHeader person={{ name: "Ada Test", paragraphs: [], imageSrc: "/x.jpg" }} />);
    expect((container.querySelector("[style*='background-image']") as HTMLElement).style.backgroundPosition).toBe("");
    await rerender(<PersonHeader person={{ name: "Jane Doe", paragraphs: [] } as Person} />);
    expect(container.querySelector('div[aria-hidden="true"]')?.textContent).toBe("JD");
    await rerender(
      <PersonHeader
        person={{ slug: "anon", paragraphs: [], imageSrc: "/x.jpg", imageStyle: "background-position: top" }}
      />,
    );
    await expect.element(page.getByRole("heading", { level: 1 })).toHaveTextContent("Anonymous submission");
    await expect.element(page.getByRole("link", { name: "← Back to all people" })).toHaveAttribute("href", "/people");
  });

  it("shows the whole story, with a button to copy its link", async () => {
    const person = people[0];
    await render(<PersonStory person={person} slug={personSlug(person)} />);
    await expect
      .element(page.getByRole("button", { name: "Copy link to this story" }))
      .toHaveTextContent("Share this story");
  });

  it("lists every story as a card", async () => {
    const { container } = await render(<StoryGrid />);
    expect(container.querySelectorAll("article")).toHaveLength(people.length);
  });

  it("invites readers to share their own story, linkable when given an id", async () => {
    const { container } = await render(<ShareYourStory id="share-your-story" />);
    expect(container.querySelector("section")?.id).toBe("share-your-story");
    await expect.element(page.getByRole("link", { name: "our community" })).toHaveAttribute("href", site.whatsappUrl);
  });
});
