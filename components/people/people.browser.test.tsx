import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";
import { page } from "vitest/browser";
import { people, personSlug, type Person } from "@/lib/content/people";
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
const person = (extra: Partial<Person> = {}): Person => ({ name: "Jane Doe", paragraphs: ["Short story."], ...extra }) as Person;

describe("PersonCard", () => {
  it("shows the whole story, a photo and links, when not truncated", async () => {
    const real = people.find((p) => p.imageSrc && p.name)!;
    const { container } = await render(<PersonCard person={real} />);
    await expect.element(page.getByRole("link", { name: real.name! })).toHaveAttribute("href", `/people/${personSlug(real)}`);
    expect((container.querySelector(".person-avatar") as HTMLElement).style.backgroundImage).not.toBe("");
    expect(container.querySelector(".story-read-more")).toBeNull();
    expect(container.querySelector(".story-body-measure")).toBeNull();
  });

  it("shows a photo with no extra positioning", async () => {
    const { container } = await render(<PersonCard person={person({ imageSrc: "/images/x.jpg" })} />);
    expect((container.querySelector(".person-avatar") as HTMLElement).style.backgroundImage).toContain("/images/x.jpg");
  });

  it("names anonymous stories, with the pause symbol for an avatar", async () => {
    const { container } = await render(<PersonCard person={{ slug: "anon-1", paragraphs: ["Hi."] }} showLink />);
    expect(container.querySelector(".person-name em")?.textContent).toBe("Anonymous submission");
    expect(container.querySelector(".person-avatar-initials img")).not.toBeNull();
    await expect.element(page.getByRole("link", { name: "Read more →" })).toHaveAttribute("href", "/people/anon-1");
  });

  it("cuts a story to a fixed number of characters, at a word", async () => {
    const { container } = await render(<PersonCard person={person({ paragraphs: ["First <em>part</em>.", long(60)] })} truncate maxChars={40} />);
    const text = container.querySelector(".story-body")!.textContent!;
    expect(text.startsWith("First part.")).toBe(true);
    expect(text.endsWith("…")).toBe(true);
    expect(container.querySelector(".story-read-more")).not.toBeNull();
  });

  it("cuts a single unbroken word, and stops once the limit is used up exactly", async () => {
    const { container, rerender } = await render(<PersonCard person={person({ paragraphs: ["x".repeat(80)] })} truncate maxChars={10} />);
    expect(container.querySelector(".story-body")!.textContent).toBe(`${"x".repeat(10)}…`);
    await rerender(<PersonCard person={person({ paragraphs: ["12345", "67890", "more"] })} truncate maxChars={10} />);
    expect(container.querySelectorAll(".story-body p")).toHaveLength(2);
  });

  it("trims a long story to fit the card's height, measured in the browser", async () => {
    const story = person({ paragraphs: [long(150), "- a bullet", "- another", long(150)] });
    const { container } = await render(
      <div style={{ width: 320 }}>
        <PersonCard person={story} truncate />
      </div>,
    );
    const body = container.querySelector(".story-body") as HTMLElement;
    await expect.poll(() => body.textContent!.endsWith("…")).toBe(true);
    expect(body.offsetHeight).toBeLessThanOrEqual(260);
    window.dispatchEvent(new Event("resize"));
  });

  it("shows a short story whole, even when truncating", async () => {
    const { container } = await render(<PersonCard person={person({ paragraphs: ["One.", "- point"] })} truncate />);
    await expect.poll(() => container.querySelector(".story-body")!.textContent).toBe("One.point");
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

describe("StoryShareForm", () => {
  it("embeds the Tally form, and asks Tally to load it whether its script was cached or not", async () => {
    const loadEmbeds = vi.fn();
    window.Tally = { loadEmbeds };
    await render(<StoryShareForm />);
    await expect.element(page.getByTitle("Share your story")).toHaveAttribute("data-tally-src", expect.stringContaining("tally.so/embed/"));
    await expect.poll(() => loadEmbeds.mock.calls.length).toBe(2);
  });

  it("waits for Tally's script if it isn't loaded yet", async () => {
    await render(<StoryShareForm />);
    await expect.element(page.getByTitle("Share your story")).toBeInTheDocument();
  });
});
