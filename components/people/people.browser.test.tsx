import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";
import { page } from "vitest/browser";
import { people, personSlug, type Person } from "@/lib/content/people";
import Avatar from "./Avatar";
import PersonCard from "./PersonCard";
import StoryShareForm from "./StoryShareForm";

// next/script would load Tally's real embed script; this stand-in reports
// it as loaded straight away instead.
vi.mock("next/script", () => ({
  __esModule: true,
  default: ({ onLoad }: { onLoad?: () => void }) => {
    queueMicrotask(() => onLoad?.());
    return null;
  },
}));

afterEach(() => {
  vi.restoreAllMocks();
  delete window.Tally;
});

const long = (n: number) => Array.from({ length: n }, (_, i) => `word${i}`).join(" ");
const person = (extra: Partial<Person> = {}): Person =>
  ({ name: "Jane Doe", paragraphs: ["Short story."], ...extra }) as Person;

// The card's markup: the avatar is the header's first element, the story
// text a div straight under the <article>, and the off-screen measuring
// copy a second such div, hidden from assistive tech.
const avatar = (container: Element) => container.querySelector("article > header > div") as HTMLElement;
const storyBody = (container: Element) => container.querySelector("article > div:not([aria-hidden])") as HTMLElement;
const measureCopy = (container: Element) => container.querySelector("article > div[aria-hidden='true']");
const readMore = () => page.getByRole("link", { name: "Read more →" });

describe("PersonCard", () => {
  it("shows the whole story, a photo and links, when not truncated", async () => {
    const real = people.find((p) => p.imageSrc && p.name)!;
    const { container } = await render(<PersonCard person={real} />);
    await expect
      .element(page.getByRole("link", { name: real.name! }))
      .toHaveAttribute("href", `/people/${personSlug(real)}`);
    expect(avatar(container).style.backgroundImage).not.toBe("");
    expect(readMore().query()).toBeNull();
    expect(measureCopy(container)).toBeNull();
  });

  it("shows a photo with no extra positioning", async () => {
    const { container } = await render(<PersonCard person={person({ imageSrc: "/images/x.jpg" })} />);
    expect(avatar(container).style.backgroundImage).toContain("/images/x.jpg");
  });

  it("names anonymous stories, with the pause symbol for an avatar", async () => {
    const { container } = await render(<PersonCard person={{ slug: "anon-1", paragraphs: ["Hi."] }} showLink />);
    expect(page.getByRole("heading", { level: 3 }).element().querySelector("em")?.textContent).toBe(
      "Anonymous submission",
    );
    expect(avatar(container).getAttribute("aria-hidden")).toBe("true");
    expect(avatar(container).querySelector("img")).not.toBeNull();
    await expect.element(page.getByRole("link", { name: "Read more →" })).toHaveAttribute("href", "/people/anon-1");
  });

  it("cuts a story to a fixed number of characters, at a word", async () => {
    const { container } = await render(
      <PersonCard person={person({ paragraphs: ["First <em>part</em>.", long(60)] })} truncate maxChars={40} />,
    );
    const text = storyBody(container).textContent!;
    expect(text.startsWith("First part.")).toBe(true);
    expect(text.endsWith("…")).toBe(true);
    await expect.element(readMore()).toBeInTheDocument();
    expect(measureCopy(container)).toBeNull();
  });

  it("cuts a single unbroken word, and stops once the limit is used up exactly", async () => {
    const { container, rerender } = await render(
      <PersonCard person={person({ paragraphs: ["x".repeat(80)] })} truncate maxChars={10} />,
    );
    expect(storyBody(container).textContent).toBe(`${"x".repeat(10)}…`);
    await rerender(<PersonCard person={person({ paragraphs: ["12345", "67890", "more"] })} truncate maxChars={10} />);
    expect(storyBody(container).querySelectorAll("p")).toHaveLength(2);
  });

  it("trims a long story to fit the card's height, measured in the browser", async () => {
    const story = person({ paragraphs: [long(150), "- a bullet", "- another", long(150)] });
    const { container } = await render(
      <div style={{ width: 320 }}>
        <PersonCard person={story} truncate />
      </div>,
    );
    const body = storyBody(container);
    await expect.poll(() => body.textContent!.endsWith("…")).toBe(true);
    expect(body.offsetHeight).toBeLessThanOrEqual(260);
    expect(getComputedStyle(body).overflow).not.toBe("hidden");
    // The measuring copy is there, off screen and hidden from assistive tech.
    const measure = measureCopy(container) as HTMLElement;
    expect(getComputedStyle(measure).position).toBe("fixed");
    expect(getComputedStyle(measure).visibility).toBe("hidden");
    window.dispatchEvent(new Event("resize"));
  });

  it("holds a carousel slide's story to the card's fixed height", async () => {
    const story = person({ paragraphs: [long(150), long(150)] });
    const { container } = await render(
      <div style={{ width: 320 }}>
        <PersonCard person={story} truncate slide />
      </div>,
    );
    const body = storyBody(container);
    await expect.poll(() => body.textContent!.endsWith("…")).toBe(true);
    expect(getComputedStyle(body).height).toBe("220px");
    expect(getComputedStyle(body).overflow).toBe("hidden");
    await expect.element(readMore()).toBeInTheDocument();
  });

  it("shows a short story whole, even when truncating", async () => {
    const { container } = await render(<PersonCard person={person({ paragraphs: ["One.", "- point"] })} truncate />);
    await expect.poll(() => storyBody(container).textContent).toBe("One.point");
  });

  it("measures without waiting for fonts where the browser can't say, and stops when gone", async () => {
    const fonts = Object.getOwnPropertyDescriptor(Document.prototype, "fonts")!;
    Object.defineProperty(document, "fonts", { configurable: true, value: undefined });
    try {
      const { unmount } = await render(<PersonCard person={person()} truncate />);
      await unmount();
    } finally {
      Object.defineProperty(document, "fonts", fonts);
      delete (document as unknown as Record<string, unknown>).fonts;
    }
    let ready: () => void = () => {};
    const promise = new Promise<void>((r) => (ready = r));
    vi.spyOn(document, "fonts", "get").mockReturnValue({ ready: promise } as unknown as FontFaceSet);
    const { unmount } = await render(<PersonCard person={person()} truncate />);
    await unmount();
    ready();
  });
});

describe("Avatar", () => {
  it("is larger at the top of a person's own page, with a photo or without", async () => {
    const withPhoto = person({ imageSrc: "/images/x.jpg" });
    const { container } = await render(
      <>
        <Avatar person={withPhoto} />
        <Avatar person={withPhoto} large />
        <Avatar person={person()} />
        <Avatar person={person()} large />
      </>,
    );
    const [small, large, smallInitials, largeInitials] = Array.from(container.querySelectorAll("div > div")).map(
      (el) => el as HTMLElement,
    );
    expect(small.style.backgroundImage).toContain("/images/x.jpg");
    expect(large.style.backgroundImage).toContain("/images/x.jpg");
    expect(smallInitials.textContent).toBe("JD");
    expect(largeInitials.getAttribute("aria-hidden")).toBe("true");
    expect(large.offsetWidth).toBeGreaterThan(small.offsetWidth);
    expect(largeInitials.offsetWidth).toBeGreaterThan(smallInitials.offsetWidth);
  });
});

describe("StoryShareForm", () => {
  it("embeds the Tally form, and asks Tally to load it whether its script was cached or not", async () => {
    const loadEmbeds = vi.fn();
    window.Tally = { loadEmbeds };
    await render(<StoryShareForm />);
    await expect
      .element(page.getByTitle("Share your story"))
      .toHaveAttribute("data-tally-src", expect.stringContaining("tally.so/embed/"));
    await expect.poll(() => loadEmbeds.mock.calls.length).toBe(2);
  });

  it("waits for Tally's script if it isn't loaded yet", async () => {
    await render(<StoryShareForm />);
    await expect.element(page.getByTitle("Share your story")).toBeInTheDocument();
  });
});
